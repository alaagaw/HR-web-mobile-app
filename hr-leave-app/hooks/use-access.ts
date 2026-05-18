import { useEffect, useCallback } from 'react';
import { useAccessStore } from '@/stores/access-store';
import { useAuth } from '@/hooks/use-auth';
import { accessPolicyService, profileCapabilitiesService } from '@/services';
import { evaluateAccess } from '@/lib/access/evaluate';
import { ACCESS_RESOURCE_BY_KEY } from '@/lib/access/resources';

/**
 * Resolves HR-configurable access for navbar items and pages.
 *
 * The policy set is small and changes rarely, so it's fetched
 * once per session into a shared store (along with the current
 * user's is_superuser flag); every `useAccess()` caller reads
 * from there. Until it loads (or if it fails), `canAccess` falls
 * back to each resource's registry `legacyDefault`, i.e. today's
 * hardcoded behavior — so the app never blanks out or leaks
 * while policies are in flight.
 *
 * A superuser bypasses every rule; otherwise HR / HR_Director
 * only have the minimal lockout floor (Access Control screen +
 * HR Admin menu) — both enforced inside evaluateAccess.
 */
export function useAccess() {
  const { user } = useAuth();
  const { policies, isSuperuser, loaded, loading, setPolicies, setLoading } =
    useAccessStore();

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [list, caps] = await Promise.all([
        accessPolicyService.listAll(),
        profileCapabilitiesService.getForProfile(user.id).catch(() => null),
      ]);
      setPolicies(list, caps?.is_superuser ?? false);
    } catch {
      // Network/RLS failure → stay on legacyDefault, don't crash nav.
      setLoading(false);
    }
  }, [user?.id, setPolicies, setLoading]);

  useEffect(() => {
    if (user?.id && !loaded && !loading) {
      void reload();
    }
  }, [user?.id, loaded, loading, reload]);

  const canAccess = useCallback(
    (resourceKey: string): boolean => {
      const resource = ACCESS_RESOURCE_BY_KEY[resourceKey];
      const legacyDefault = resource ? resource.legacyDefault(user ?? {}) : false;
      return evaluateAccess(policies[resourceKey], user, legacyDefault, {
        resourceKey,
        isSuperuser,
      });
    },
    [policies, isSuperuser, user],
  );

  return { canAccess, loaded, loading, reload };
}
