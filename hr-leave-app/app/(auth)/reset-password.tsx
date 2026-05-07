import { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/services/supabase/client';
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validators';

/**
 * Landing page for Supabase's password-recovery email link.
 *
 * Supabase appends a recovery token to the URL hash and creates a session
 * automatically. We then call updateUser({ password }) and route home.
 *
 * Recovery tokens are SINGLE-USE. If the user clicks the same link twice,
 * the second click arrives without a session — we detect that on mount
 * and show a clear "link already used / expired" message with a button
 * to request a fresh link, instead of letting the user fill out the form
 * and then hit the cryptic "Auth session missing!" error on submit.
 */
type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { changePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [linkErrorReason, setLinkErrorReason] = useState<string>('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // On mount, exchange the recovery tokens in the URL hash for a session.
  //
  // The global supabase client is configured with detectSessionInUrl: false
  // (in services/supabase/client.ts) to avoid Web Lock race errors during
  // normal app navigation. That means the recovery token in the URL hash
  // does NOT auto-establish a session — we have to call setSession()
  // explicitly here using the access_token + refresh_token from the hash.
  //
  // Three possible URL shapes coming in:
  //   #access_token=...&refresh_token=...&type=recovery   → valid recovery
  //   #error=access_denied&error_code=otp_expired&...      → already used / expired
  //   (empty / no tokens)                                  → user landed here directly
  useEffect(() => {
    let cancelled = false;

    if (typeof window === 'undefined') return;

    const log = (...args: any[]) => {
      // Diagnostic logging — visible in browser DevTools console.
      // Remove once the recovery flow is confirmed stable.
      // eslint-disable-next-line no-console
      console.log('[reset-password]', ...args);
    };

    const rawHash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(rawHash);

    log('hash params seen:', {
      has_access_token: !!params.get('access_token'),
      has_refresh_token: !!params.get('refresh_token'),
      type: params.get('type'),
      error_code: params.get('error_code'),
      raw_keys: Array.from(params.keys()),
    });

    // Path 1 — explicit error from Supabase
    const errorCode = params.get('error_code');
    if (errorCode) {
      const errorDescription = params.get('error_description');
      const friendly =
        errorCode === 'otp_expired'
          ? 'This reset link has already been used or has expired.'
          : (errorDescription?.replace(/\+/g, ' ') || 'This reset link is no longer valid.');
      log('path 1 — explicit error', errorCode);
      setLinkErrorReason(friendly);
      setLinkState('invalid');
      return;
    }

    // Hard fallback: if we're still 'checking' after 6 seconds, surface a
    // diagnostic message so the user isn't stuck staring at the spinner.
    const hardFallback = setTimeout(() => {
      if (cancelled) return;
      log('hard fallback fired — setSession never resolved');
      setLinkErrorReason(
        'Reset link verification took too long. Please request a new link, or open the browser console for details.'
      );
      setLinkState('invalid');
    }, 6000);

    // Path 2 — recovery tokens present, exchange them for a session
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      log('path 2 — calling setSession with both tokens');
      (async () => {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          log('setSession resolved', { hasSession: !!data?.session, error: error?.message });
          if (cancelled) return;
          clearTimeout(hardFallback);
          if (error) {
            setLinkErrorReason(error.message || 'Could not verify the reset link.');
            setLinkState('invalid');
          } else {
            setLinkState('valid');
            // Clean the tokens out of the URL so a back-button doesn't replay them.
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch {}
          }
        } catch (e: any) {
          log('setSession threw', e?.message);
          if (cancelled) return;
          clearTimeout(hardFallback);
          setLinkErrorReason(e?.message || 'Could not verify the reset link.');
          setLinkState('invalid');
        }
      })();

      return () => {
        cancelled = true;
        clearTimeout(hardFallback);
      };
    }

    // Path 2b — only access_token (no refresh_token). Try a different
    // approach: write minimal session info to storage and ask Supabase
    // to refresh from it. As a last resort, try setSession with empty
    // refresh_token (some flows allow this).
    if (accessToken && !refreshToken) {
      log('path 2b — access_token only, attempting setSession without refresh_token');
      (async () => {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
          } as any);
          log('setSession (no refresh) resolved', { hasSession: !!data?.session, error: error?.message });
          if (cancelled) return;
          clearTimeout(hardFallback);
          if (error || !data?.session) {
            setLinkErrorReason(
              error?.message ||
                'Reset link is missing the refresh token. Please request a new link.'
            );
            setLinkState('invalid');
          } else {
            setLinkState('valid');
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch {}
          }
        } catch (e: any) {
          log('setSession (no refresh) threw', e?.message);
          if (cancelled) return;
          clearTimeout(hardFallback);
          setLinkErrorReason(e?.message || 'Could not verify the reset link.');
          setLinkState('invalid');
        }
      })();

      return () => {
        cancelled = true;
        clearTimeout(hardFallback);
      };
    }

    // Path 3 — no tokens at all in the hash
    log('path 3 — no tokens in URL hash, checking existing session');
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        log('getSession resolved', { hasSession: !!session });
        if (cancelled) return;
        clearTimeout(hardFallback);
        if (session) {
          setLinkState('valid');
        } else {
          setLinkErrorReason('No reset link detected. Request a new link to continue.');
          setLinkState('invalid');
        }
      } catch (e: any) {
        log('getSession threw', e?.message);
        if (cancelled) return;
        clearTimeout(hardFallback);
        setLinkErrorReason('Could not verify the reset link.');
        setLinkState('invalid');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(hardFallback);
    };
  }, []);

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setLoading(true);
    try {
      await changePassword(data.newPassword);
      setDone(true);
      // Auth guard will route to dashboard once the session is fully active.
      setTimeout(() => router.replace('/(app)/(tabs)/dashboard' as any), 800);
    } catch (err: any) {
      const msg = err.message || '';
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
