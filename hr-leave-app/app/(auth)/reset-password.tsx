import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validators';

/**
 * Landing page for Supabase's password-recovery email link.
 *
 * Supabase appends a recovery token to the URL and creates a session
 * automatically; we just call updateUser({ password }) and route home.
 *
 * If the link is expired or already used, updateUser will fail and we
 * surface the error so the user can request a fresh link.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { changePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setLoading(true);
    try {
      await changePassword(data.newPassword);
      setDone(true);
      // Auth guard will route to dashboard once must_change_password is cleared.
      setTimeout(() => router.replace('/(app)/(tabs)/dashboard' as any), 800);
    } catch (err: any) {
      setError(
        err.message?.includes('expired') || err.message?.includes('invalid')
          ? 'This reset link has expired or is invalid. Please request a new one.'
          : err.message || 'Failed to reset password'
      );
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
              Set a new password
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
            <Button onPress={handleSubmit(onSubmit)} loading={loading} disabled={done} fullWidth>
              Update Password
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
