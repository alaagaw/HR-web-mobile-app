import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { registrationService } from '@/services';
import { RegistrationStatus } from '@/types/enums';

export default function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRejected = user?.registration_status === RegistrationStatus.Rejected;

  const refreshStatus = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const status = await registrationService.getRegistrationStatus(user.id);
      if (status !== user.registration_status) {
        // Re-fetch full profile so AuthGuard has updated data
        const { authService } = await import('@/services/supabase/auth');
        const profile = await authService.getSession();
        setUser(profile);
      }
    } catch {
      // Silently fail on poll
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-poll every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(refreshStatus, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="px-6"
      >
        <View className="items-center mb-8">
          <View
            className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${
              isRejected ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            }`}
          >
            <Text className="text-4xl">{isRejected ? '!' : '...'}</Text>
          </View>

          <Text className="text-2xl font-bold text-text-primary dark:text-white text-center">
            {isRejected ? 'Registration Not Approved' : 'Registration Pending'}
          </Text>

          <Text className="text-sm text-text-muted dark:text-slate-400 mt-3 text-center px-4">
            {isRejected
              ? 'Your registration was not approved. Please contact HR for more information.'
              : 'Your information is being reviewed by HR. You will be notified once your registration is approved.'}
          </Text>
        </View>

        {isRejected && user?.registration_note && (
          <Banner variant="error" className="mb-6">
            Reason: {user.registration_note}
          </Banner>
        )}

        {!isRejected && (
          <Banner variant="info" className="mb-6">
            This page refreshes automatically. You can also tap the button below to check your status.
          </Banner>
        )}

        <View className="gap-3">
          {!isRejected && (
            <Button onPress={refreshStatus} loading={refreshing} fullWidth>
              Refresh Status
            </Button>
          )}

          <Button onPress={signOut} variant="ghost" fullWidth>
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
