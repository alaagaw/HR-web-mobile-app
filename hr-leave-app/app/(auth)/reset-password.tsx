import { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Reset Password — 3-field OTP form.
 *
 * Why a form instead of a magic-link page:
 *   Corporate email scanners (Microsoft Defender Safe Links, Mimecast,
 *   Proofpoint, etc.) follow links in inbound mail for safety previews.
 *   Supabase's {{ .ConfirmationURL }} consumes its single-use token on
 *   the first GET, so by the time the user clicks the link in their
 *   inbox the token is already burned and they see "Token has expired
 *   or is invalid."
 *
 *   The 6-digit code in `{{ .Token }}` cannot be consumed by a GET —
 *   only by a typed entry in this form's onSubmit. Scanners are
 *   harmless. This is the workaround Supabase's own troubleshooting
 *   docs recommend.
 *
 * Flow:
 *   1. User opens /forgot-password, types email, clicks Send. We call
 *      supabase.auth.resetPasswordForEmail and navigate them here with
 *      ?email= pre-filled.
 *   2. They open their email, see the 6-digit code (template uses
 *      {{ .Token }} prominently), come back here, type the code plus
 *      a new password.
 *   3. We call verifyOtp({ email, token, type: 'recovery' }) to
 *      exchange the code for a recovery session, then updateUser
 *      ({ password }) to set the new password, then hard-reload to
 *      pick up the new session.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState<string>(params.email || '');
  const [code, setCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  // Pick up the email from a URL ?email= param the first time it arrives
  // (it can race with the initial state seeding on web).
  useEffect(() => {
    if (params.email && !email) setEmail(String(params.email));
  }, [params.email]);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Enter the email you used to request the code.');
      return;
    }
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('The code is a 6-digit number sent to your inbox.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two password fields do not match.');
      return;
    }

    setLoading(true);
    try {
      // Exchange the typed OTP for a recovery session. This is the
      // single-use step; if the user typed an old or already-used
      // code, GoTrue rejects it here.
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: trimmedCode,
        type: 'recovery',
      });
      if (verifyErr) {
        const msg = verifyErr.message?.toLowerCase() ?? '';
        if (msg.includes('expired') || msg.includes('invalid')) {
          throw new Error('Code is invalid or has expired. Request a new code below.');
        }
        throw verifyErr;
      }

      // Now signed in via the recovery session — set the new password.
      const { error: pwErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (pwErr) throw pwErr;

      setDone(true);

      // Wipe the persisted Zustand user (it may hold a stale snapshot
      // from before the password change) and hard-reload so the global
      // auth listener picks up the fresh session and the layout guard
      // routes correctly.
      try {
        useAuthStore.getState().clear();
      } catch { /* non-fatal */ }

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.replace('/');
        } else {
          router.replace('/(app)/(tabs)/dashboard' as any);
        }
      }, 600);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Enter the email you want the code sent to.');
      return;
    }
    setResending(true);
    try {
      await resetPasswordForEmail(email.trim());
      setInfo('A new code has been sent. Check your inbox (and spam folder).');
    } catch {
      // Same as forgot-password — never disclose account existence.
      setInfo('A new code has been sent. Check your inbox (and spam folder).');
    } finally {
      setResending(false);
    }
  };

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
            <Text className="text-sm text-text-muted dark:text-slate-400 mt-2 text-center">
              Enter the 6-digit code we emailed you, then your new password.
            </Text>
          </View>

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

          {info && !error && (
            <Banner variant="info" className="mb-4">
              {info}
            </Banner>
          )}

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <Input
            label="6-digit code"
            placeholder="123456"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
          />

          <Input
            label="New password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <Input
            label="Confirm new password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          <View className="mt-2">
            <Button onPress={onSubmit} loading={loading} disabled={done} fullWidth>
              Update password
            </Button>
          </View>

          <View className="mt-4 items-center">
            <Pressable onPress={handleResend} disabled={resending}>
              <Text className="text-sm font-semibold text-primary">
                {resending ? 'Sending…' : "Didn't get a code? Send it again"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 items-center">
            <Pressable onPress={() => router.replace('/(auth)/sign-in' as any)}>
              <Text className="text-sm font-semibold text-text-muted dark:text-slate-400">
                ← Back to sign in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
