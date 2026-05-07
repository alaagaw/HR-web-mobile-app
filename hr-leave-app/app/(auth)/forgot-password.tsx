import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setEmailError('');
    setError(null);

    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordForEmail(email.trim());
      // Always show the same message regardless of whether the email exists,
      // so attackers can't enumerate accounts.
      setSubmitted(true);
    } catch (err: any) {
      // Treat as success at the UI level too — don't disclose existence.
      setSubmitted(true);
    } finally {
      setLoading(false);
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
              Forgot your password?
            </Text>
            <Text className="text-sm text-text-muted dark:text-slate-400 mt-2 text-center">
              Enter your email and we'll send you a link to reset it.
            </Text>
          </View>

          {submitted ? (
            <Banner variant="success" className="mb-4">
              If an account exists for that email, a reset link has been sent.
              Check your inbox (and spam folder).
            </Banner>
          ) : (
            <>
              {error && (
                <Banner variant="error" className="mb-4">
                  {error}
                </Banner>
              )}
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              <View className="mt-2">
                <Button onPress={handleSubmit} loading={loading} fullWidth>
                  Send reset link
                </Button>
              </View>
            </>
          )}

          <View className="mt-6 items-center">
            <Pressable onPress={() => router.replace('/sign-in' as any)}>
              <Text className="text-sm font-semibold text-primary">
                ← Back to sign in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
