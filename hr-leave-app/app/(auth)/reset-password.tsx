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

  // On mount, figure out whether the recovery token is good or already used.
  // Two signals tell us this is valid:
  //   1. The Supabase client fires a PASSWORD_RECOVERY (or SIGNED_IN with a
  //      session) event after it parses the URL hash. We listen for that.
  //   2. getSession() returns a session.
  // Two signals tell us it's NOT valid:
  //   - The URL hash already contains an explicit Supabase error
  //     (error_code=otp_expired etc.)
  //   - 3 seconds pass with no session and no error → fallback to invalid.
  useEffect(() => {
    let cancelled = false;

    // Check URL hash for an explicit error from Supabase.
    if (typeof window !== 'undefined' && window.location?.hash) {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');
      if (errorCode) {
        const friendly =
          errorCode === 'otp_expired'
            ? 'This reset link has already been used or has expired.'
            : (errorDescription?.replace(/\+/g, ' ') || 'This reset link is no longer valid.');
        setLinkErrorReason(friendly);
        setLinkState('invalid');
        return;
      }
    }

    // Subscribe to Supabase auth events. PASSWORD_RECOVERY fires once the
    // recovery token in the URL hash has been validated and a session built.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session) || (event === 'INITIAL_SESSION' && session)) {
        setLinkState('valid');
      }
    });

    // Belt-and-braces: also poll once after 600ms — covers the case where
    // the auth event already fired before this listener was attached.
    const earlyCheck = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && session) setLinkState('valid');
    }, 600);

    // Fallback: 3 seconds with no event and no session → declare invalid.
    const fallback = setTimeout(async () => {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setLinkErrorReason('This reset link has already been used or has expired.');
        setLinkState('invalid');
      }
    }, 3000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(earlyCheck);
      clearTimeout(fallback);
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
