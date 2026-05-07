import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { View, ActivityIndicator } from 'react-native';
import { RegistrationStatus } from '@/types/enums';

/**
 * Root route. Mirrors the AuthGuard's status-based routing so we go
 * DIRECTLY to the right place — never briefly mount the dashboard for
 * a `pending_info` user only to bounce them off it (which causes
 * cosmetic errors from dashboard hooks loading data the user doesn't
 * have yet).
 *
 * Keep this in sync with the routing in app/_layout.tsx AuthGuard.
 */
export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Forced password-change flow (HR-invited employees in temp_password mode)
  if (user.must_change_password) {
    return <Redirect href="/(auth)/change-password" />;
  }

  // Status-based routing
  switch (user.registration_status) {
    case RegistrationStatus.EmailUnverified:
    case RegistrationStatus.PendingInfo:
      return <Redirect href="/(auth)/registration-form" />;

    case RegistrationStatus.PendingApproval:
    case RegistrationStatus.Rejected:
      return <Redirect href="/(auth)/pending-approval" />;

    case RegistrationStatus.NotInvited:
      // Edge case: the auth user exists but they were marked NotInvited
      // (shouldn't normally happen for a signed-in user). Treat as
      // pending_info — they need to complete the registration form.
      return <Redirect href="/(auth)/registration-form" />;

    case RegistrationStatus.Active:
    default:
      return <Redirect href="/(app)/(tabs)/dashboard" />;
  }
}
