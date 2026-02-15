import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services';

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

  const signOut = useCallback(async () => {
    await authService.signOut();
    clear();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
  };
}
