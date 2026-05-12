import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/use-auth';
import { useThemeStore } from '@/stores/theme-store';
import { RegistrationStatus } from '@/types/enums';
import 'react-native-reanimated';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Auth pages that must remain reachable regardless of auth state.
// reset-password handles Supabase's recovery flow — the user IS authenticated
// (via a recovery token), but the entire purpose of the page is to let them
// set a new password before any other routing kicks in. forgot-password is
// exempt for the rare case a signed-in user hits "Forgot password?" anyway.
const AUTH_EXEMPT_ROUTES = ['(auth)/reset-password', '(auth)/forgot-password'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');
    const isExemptRoute = AUTH_EXEMPT_ROUTES.includes(currentPath);

    // Not authenticated → go to sign-in (unless already on an auth page)
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in' as any);
      return;
    }

    // Exempt auth routes always render, even for authenticated users.
    if (isExemptRoute) return;

    if (isAuthenticated && user) {
      // 1. Must change password (HR-invited users)
      if (user.must_change_password) {
        if (currentPath !== '(auth)/change-password') {
          router.replace('/(auth)/change-password' as any);
        }
        return;
      }

      // 2. Route based on registration status
      switch (user.registration_status) {
        case RegistrationStatus.EmailUnverified:
        case RegistrationStatus.PendingInfo:
          if (currentPath !== '(auth)/registration-form') {
            router.replace('/(auth)/registration-form' as any);
          }
          return;

        case RegistrationStatus.PendingApproval:
        case RegistrationStatus.Rejected:
          if (currentPath !== '(auth)/pending-approval') {
            router.replace('/(auth)/pending-approval' as any);
          }
          return;

        case RegistrationStatus.InfoRejected:
          // HR asked the employee to fix and resubmit. They land on
          // /registration-form on sign-in (see app/index.tsx) but are
          // free to navigate anywhere afterwards — same nav freedom as
          // an Active user, except they CAN still sit on the form to
          // edit it, so we don't bounce them off the auth group.
          return;

        case RegistrationStatus.Active:
          if (inAuthGroup) {
            router.replace('/(app)/(tabs)/dashboard' as any);
          }
          return;
      }
    }
  }, [isAuthenticated, isLoading, segments, user?.registration_status, user?.must_change_password]);

  return <>{children}</>;
}

export default function RootLayout() {
  const { isLoading } = useAuth();
  const { setColorScheme } = useColorScheme();
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    setColorScheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <AuthGuard>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthGuard>
  );
}
