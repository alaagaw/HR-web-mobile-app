import { useEffect, useCallback } from 'react';
import { useAccessStore } from '@/stores/access-store';
import { useAuth } from '@/hooks/use-auth';
import { accessPolicyService } from '@/services';
import { evaluateAccess } from '@/lib/access/evaluate';
import { ACCESS_RESOURCE_BY_KEY } from '@/lib/access/resources';

/**
 * Resolves HR-configurable access for navbar items and pages.
 *
 * The policy set is small and changes rarely, so it's fetched
 * once per session into a shared store; every `useAccess()`
 * caller reads from there. Until it loads (or if it fails),
 * `canAccess` falls back to each resource's registry
 * `legacyDefault`, i.e. today's hardcoded behavior — so the app
 * never blanks out or leaks while policies are in flight.
 *
 * HR / HR_Director always pass (failsafe lives in evaluateAccess)
 * so a bad policy can never lock HR out of the config screen.
 */
export function useAccess() {
  const { user } = useAuth();
  const { policies, loaded, loading, setPolicies, setLoading } = useAccessStore();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await accessPolicyService.listAll();
      setPolicies(list);
    } catch {
      // Network/RLS failure → stay on legacyDefault, don't crash nav.
      setLoading(false);
    }
  }, [setPolicies, setLoading]);

  useEffect(() => {
    if (user?.id && !loaded && !loading) {
      void reload();
    }
  }, [user?.id, loaded, loading, reload]);

  const canAccess = useCallback(
    (resourceKey: string): boolean => {
      const resource = ACCESS_RESOURCE_BY_KEY[resourceKey];
      const legacyDefault = resource ? resource.legacyDefault(user ?? {}) : false;
      return evaluateAccess(policies[resourceKey], user, legacyDefault);
    },
    [policies, user],
  );

  return { canAccess, loaded, loading, reload };
}
