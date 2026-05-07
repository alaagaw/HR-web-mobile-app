import { useEffect, useMemo, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuthStore } from '@/stores/auth-store';
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validators';

/**
 * Landing page for Supabase's password-recovery email link.
 *
 * Uses a dedicated `recoveryClient` instead of the global supabase client
 * because the global one has detectSessionInUrl: false + a no-op lock
 * (set in services/supabase/client.ts to avoid bugs elsewhere) — those
 * overrides hang setSession() forever during recovery. The dedicated
 * client uses SDK defaults; both clients share the same localStorage
 * key so the session set here is visible to the global client too.
 *
 * Recovery tokens are SINGLE-USE. The page detects already-used / expired
 * links via the URL hash and shows a "request a new link" screen instead
 * of letting the user submit and hit a cryptic auth error.
 */
type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [linkErrorReason, setLinkErrorReason] = useState<string>('');

  // Dedicated Supabase client for the recovery flow.
  //
  // Why a separate client? The global one (in services/supabase/client.ts)
  // is configured with detectSessionInUrl: false AND a no-op lock — both
  // chosen to avoid bugs during normal app navigation. Those overrides
  // break setSession() during recovery (it hangs forever; verified with
  // diagnostic logs on commit 6fe8c05).
  //
  // This client uses the SDK defaults (Web Lock + URL hash detection)
  // ONLY for this page. The two clients share the same localStorage key
  // (sb-<ref>-auth-token), so once recovery sets a session here, the
  // global client picks it up too.
  const recoveryClient = useMemo(
    () =>
      createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL || '',
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }
      ),
    []
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // On mount: detect whether the URL hash carries a fresh recovery session,
  // an explicit error, or nothing.
  //
  // The dedicated recoveryClient was created with detectSessionInUrl=true,
  // so on construction it parses the hash and fires PASSWORD_RECOVERY /
  // SIGNED_IN events. We listen for those to mark the link valid.
  //
  // Three URL shapes:
  //   #access_token=...&refresh_token=...&type=recovery  → valid
  //   #error=...&error_code=otp_expired                   → invalid
  //   (empty)                                             → invalid (no link)
  useEffect(() => {
    let cancelled = false;

    if (typeof window === 'undefined') return;

    const rawHash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(rawHash);

    // Explicit error in URL — surface a friendly message.
    const errorCode = params.get('error_code');
    if (errorCode) {
      const errorDescription = params.get('error_description');
      const friendly =
        errorCode === 'otp_expired'
          ? 'This reset link has already been used or has expired.'
          : (errorDescription?.replace(/\+/g, ' ') || 'This reset link is no longer valid.');
      setLinkErrorReason(friendly);
      setLinkState('invalid');
      return;
    }

    // Hard fallback — never let the user stare at "Verifying" forever.
    const hardFallback = setTimeout(() => {
      if (cancelled) return;
      setLinkErrorReason(
        'Reset link verification took too long. Please request a new link.'
      );
      setLinkState('invalid');
    }, 6000);

    // Listen for the recoveryClient to surface a session.
    const { data: { subscription } } = recoveryClient.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return;
        if (
          (event === 'PASSWORD_RECOVERY') ||
          (event === 'SIGNED_IN' && session) ||
          (event === 'INITIAL_SESSION' && session)
        ) {
          clearTimeout(hardFallback);
          setLinkState('valid');
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch {}
        }
      }
    );

    // Belt-and-braces: also poll once after 800ms in case the event fired
    // before the listener attached.
    const earlyCheck = setTimeout(async () => {
      try {
        const { data: { session } } = await recoveryClient.auth.getSession();
        if (!cancelled && session) {
          clearTimeout(hardFallback);
          setLinkState('valid');
        }
      } catch {
        /* swallow — the hard fallback will handle it */
      }
    }, 800);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(hardFallback);
      clearTimeout(earlyCheck);
    };
  }, [recoveryClient]);

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setLoading(true);
    try {
      // Use the recoveryClient (which holds the recovery session) to update
      // the password. The global supabase client shares the same storage
      // key and will pick up the new session when the page reloads.
      const { error: updateErr } = await recoveryClient.auth.updateUser({
        password: data.newPassword,
      });
      if (updateErr) throw updateErr;
      setDone(true);

      // Wipe the persisted Zustand auth store BEFORE the hard navigation.
      //
      // Why: the store persists `user` to AsyncStorage. After window.location
      // reloads the page, Zustand restores that cached user — which may be
      // STALE (e.g. for a user who just bulk-demoted themselves to
      // `pending_info`, the cached value still says `active`). Index.tsx
      // would route based on the stale status, briefly mounting the dashboard
      // and triggering errors before fresh auth re-validates.
      //
      // Clearing the store forces Index.tsx to wait for the auth listener
      // to fire with a fresh profile fetch, then route correctly.
      try {
        useAuthStore.getState().clear();
      } catch {
        /* non-fatal — worst case we get the brief dashboard flash again */
      }

      // Force a hard navigation so the global client re-reads the session
      // from localStorage and the auth guard sees the user as signed in.
      // window.location.replace doesn't add a history entry, which is the
      // right behaviour for a one-time recovery flow.
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.replace('/');
        } else {
          router.replace('/(app)/(tabs)/dashboard' as any);
        }
      }, 600);
    } catch (err: any) {
      const msg = err?.message || '';
      setError(
        msg.toLowerCase().includes('session')
          ? 'Your reset link has expired. Please request a new one.'
          : msg || 'Failed to reset password'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Invalid / used link state ──────────────────────────────────
  if (linkState === 'invalid') {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
        >
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-white">HR</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary dark:text-white">
              Reset link unavailable
            </Text>
          </View>

          <Banner variant="error" className="mb-6">
            {linkErrorReason}
          </Banner>

          <Text className="text-sm text-text-muted dark:text-slate-400 mb-5 text-center">
            Reset and invite links can only be used once. If you need to set or change your password, request a new link.
          </Text>

          <Button onPress={() => router.replace('/(auth)/forgot-password' as any)} fullWidth>
            Request a new link
          </Button>

          <View className="mt-4 items-center">
            <Pressable onPress={() => router.replace('/(auth)/sign-in' as any)}>
              <Text className="text-sm font-semibold text-primary">
                ← Back to sign in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Loading / valid-link form ──────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-white">HR</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary dark:text-white">
              Set a new password
            </Text>
          </View>

          {linkState === 'checking' && (
            <Banner variant="info" className="mb-4">
              Verifying your reset link…
            </Banner>
          )}

          {done && (
            <Banner variant="success" className="mb-6">
              Password updated. Redirecting…
            </Banner>
          )}

          {error && (
            <Banner variant="error" className="mb-4">
              {error}
            </Banner>
          )}

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="New Password"
                placeholder="At least 8 characters"
                value={value}
                onChangeText={onChange}
                error={errors.newPassword?.message}
                secureTextEntry
                autoComplete="new-password"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <View className="mt-2">
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={done || linkState !== 'valid'}
              fullWidth
            >
              Update Password
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
