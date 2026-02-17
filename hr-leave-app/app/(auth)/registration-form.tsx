import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { registrationService } from '@/services';
import { registrationFormSchema, type RegistrationFormSchemaData } from '@/lib/validators';

export default function RegistrationFormScreen() {
  const { user, signOut } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormSchemaData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: '',
      iqama_number: '',
      iqama_expiry: '',
      passport_number: '',
      passport_expiry: '',
      insurance_number: '',
      insurance_expiry: '',
      occupation: '',
      birth_date: '',
    },
  });

  const onSubmit = async (data: RegistrationFormSchemaData) => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const updatedProfile = await registrationService.submitRegistration(user.id, data);
      setUser(updatedProfile);
      // AuthGuard will detect pending_approval and route to pending screen
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration');
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
          className="px-6"
          contentContainerStyle={{ paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-white">HR</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary dark:text-white">
              Complete Your Registration
            </Text>
            <Text className="text-sm text-text-muted dark:text-slate-400 mt-1 text-center">
              Please fill in all required information
            </Text>
          </View>

          {error && (
            <Banner variant="error" className="mb-4">
              {error}
            </Banner>
          )}

          {/* Personal Information */}
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-3 mt-2">
            Personal Information
          </Text>

          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={value}
                onChangeText={onChange}
                error={errors.full_name?.message}
                autoCapitalize="words"
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Phone Number"
                placeholder="+966 5XX XXX XXXX"
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
                keyboardType="phone-pad"
              />
            )}
          />

          <Controller
            control={control}
            name="birth_date"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                label="Date of Birth"
                value={value}
                onChange={onChange}
                error={errors.birth_date?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="occupation"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Occupation"
                placeholder="e.g. Manufacturing Officer"
                value={value}
                onChangeText={onChange}
                error={errors.occupation?.message}
              />
            )}
          />

          {/* Document Information */}
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-3 mt-6">
            Document Information
          </Text>

          <Controller
            control={control}
            name="iqama_number"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Iqama Number"
                placeholder="Enter your Iqama number"
                value={value}
                onChangeText={onChange}
                error={errors.iqama_number?.message}
                keyboardType="number-pad"
              />
            )}
          />

          <Controller
            control={control}
            name="iqama_expiry"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                label="Iqama Expiry Date"
                value={value}
                onChange={onChange}
                error={errors.iqama_expiry?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="passport_number"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Passport Number"
                placeholder="Enter your passport number"
                value={value}
                onChangeText={onChange}
                error={errors.passport_number?.message}
                autoCapitalize="characters"
              />
            )}
          />

          <Controller
            control={control}
            name="passport_expiry"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                label="Passport Expiry Date"
                value={value}
                onChange={onChange}
                error={errors.passport_expiry?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="insurance_number"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Insurance Number"
                placeholder="Enter your insurance number"
                value={value}
                onChangeText={onChange}
                error={errors.insurance_number?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="insurance_expiry"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                label="Insurance Expiry Date"
                value={value}
                onChange={onChange}
                error={errors.insurance_expiry?.message}
              />
            )}
          />

          <View className="mt-6 mb-4">
            <Button onPress={handleSubmit(onSubmit)} loading={loading} fullWidth>
              Submit Registration
            </Button>
          </View>

          <Button onPress={signOut} variant="ghost" fullWidth>
            Sign Out
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
