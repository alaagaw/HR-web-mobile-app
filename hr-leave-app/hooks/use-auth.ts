import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services';
import { RegistrationStatus } from '@/types/enums';

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading, clear } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    // Subscribe to auth state changes first — this also fires an
    // INITIAL_SESSION event, so we don't need a separate getSession() call
    // that would race against the subscription and trigger the
    // "signal is aborted without reason" Web Locks error.
    const unsubscribe = authService.onAuthStateChange((profile) => {
      if (mounted) setUser(profile);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const profile = await authService.signIn(email, password);
      setUser(profile);
      return profile;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signUp(email, password);
      if (!result.needsEmailVerification) {
        setUser(result.user);
      } else {
        setLoading(false);
      }
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    await authService.changePassword(newPassword);
    // Re-fetch profile to get updated must_change_password = false
    const updatedProfile = await authService.getSession();
    setUser(updatedProfile);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    clear();
  }, []);

  // Derived state for routing decisions
  const registrationStatus = user?.registration_status ?? null;
  const mustChangePassword = user?.must_change_password ?? false;

  return {
    user,
    isLoading,
    isAuthenticated,
    registrationStatus,
    mustChangePassword,
    signIn,
    signUp,
    signOut,
    changePassword,
  };
}
