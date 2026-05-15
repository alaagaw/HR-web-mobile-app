import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, AppState, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services';
import { RegistrationStatus } from '@/types/enums';

const POLL_INTERVAL = 15_000;

export default function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const [refreshing, setRefreshing] = useState(false);

  const isRejected = user?.registration_status === RegistrationStatus.Rejected;

  // Re-sync the profile. If HR has approved (or sent the form back),
  // registration_status / must_change_password will differ from what's
  // in the store — pushing the fresh profile in lets the root AuthGuard
  // route the user off this screen automatically.
  //
  // Compares against the LIVE store value (not a captured closure) so
  // repeated polls keep working, and only writes when something actually
  // changed so a static pending screen doesn't re-render every 30s.
  // A null result (transient fetch error) is ignored so a network blip
  // can't wedge the store into an unauthenticated state on this route.
  const checkStatus = useCallback(async () => {
    const profile = await authService.getSession();
    if (!profile) return;
    const current = useAuthStore.getState().user;
    if (
      profile.registration_status !== current?.registration_status ||
      profile.must_change_password !== current?.must_change_password
    ) {
      setUser(profile);
    }
  }, [setUser]);

  // Self-contained polling for this screen's lifetime. It is only ever
  // mounted while the user is still pending (the AuthGuard unmounts it
  // the moment status flips), so an unconditional interval is bounded
  // and safe — no focus gating needed. We deliberately do NOT use the
  // shared useAutoRefresh hook here: that hook only polls while
  // useFocusEffect/AppState report the screen focused, which is
  // unreliable for an auth screen mounted via router.replace on web,
  // and was the reason approval wasn't picked up automatically.
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL);

    // Browsers freeze timers in backgrounded tabs. Force an immediate
    // re-check whenever the user returns to the tab/app so they don't
    // sit on a stale "pending" screen after HR has approved.
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkStatus();
    });

    let onVisible: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisible = () => {
        if (document.visibilityState === 'visible') checkStatus();
      };
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', onVisible);
    }

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      if (onVisible) {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', onVisible);
      }
    };
  }, [checkStatus]);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      await checkStatus();
    } catch {
      // Silently fail on manual poll
    } finally {
      setRefreshing(false);
    }
  };

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
