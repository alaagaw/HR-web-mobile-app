import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { ensureFreshSession } from '@/services/supabase/session';

const REFRESH_INTERVAL = 30_000; // 30 seconds
const isWeb = Platform.OS === 'web';

/**
 * Auto-refresh hook: calls the provided fetch function every 30s, but
 * only while the screen is focused AND the surface is in the foreground.
 *
 *  - Native: foreground is tracked via React Native `AppState`.
 *  - Web: foreground is tracked via the browser tab itself
 *    (`visibilitychange` / `focus` / `blur` / `online`). RN `AppState`
 *    is a stub on web, which is why polling/refresh didn't behave
 *    correctly there before. Lose tab focus → polling stops entirely
 *    (no wasted work). Regain focus → one immediate refresh if data is
 *    stale, then the 30s cadence resumes.
 *
 * Every refresh first calls `ensureFreshSession()` so an expired access
 * token is silently renewed BEFORE the fetch — this removes the
 * "idle a while → navigate → blank page → hard refresh" problem.
 *
 * Includes a staleness check — if data was fetched < 30s ago, regaining
 * focus does NOT trigger an extra fetch.
 *
 * Returns an `invalidate()` you can call after mutations to force an
 * immediate refetch.
 */
export function useAutoRefresh(
  fetchFn: () => void,
  deps: any[] = []
): { invalidate: () => void } {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(false);
  const lastFetchedAtRef = useRef(0);

  // Refresh the token first, then fetch. If the session is genuinely
  // unrecoverable, skip the fetch (don't hammer doomed 401s) and let
  // supabase-js's SIGNED_OUT path handle teardown, exactly as before.
  const doRefresh = useCallback(() => {
    ensureFreshSession().then((ok) => {
      if (!ok) return;
      fetchFn();
      lastFetchedAtRef.current = Date.now();
    });
  }, [fetchFn]);

  const isStale = useCallback(
    () => Date.now() - lastFetchedAtRef.current > REFRESH_INTERVAL,
    []
  );

  const tabVisible = useCallback(
    () =>
      !isWeb ||
      typeof document === 'undefined' ||
      document.visibilityState === 'visible',
    []
  );

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    if (isFocusedRef.current && tabVisible()) {
      intervalRef.current = setInterval(() => {
        // Web: the visibility listener already stops the interval when
        // hidden, so just refresh. Native: still gate on AppState.
        if (isWeb || AppState.currentState === 'active') {
          doRefresh();
        }
      }, REFRESH_INTERVAL);
    }
  }, [doRefresh, stopPolling, tabVisible]);

  // Screen focus/blur (in-app navigation). Covers the exact reported
  // case: idle on a screen, then navigate — focus fires, the token is
  // refreshed, data reloads, no hard refresh needed.
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      if (tabVisible() && isStale()) {
        doRefresh();
      }
      startPolling();

      return () => {
        isFocusedRef.current = false;
        stopPolling();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  );

  // Web: tie polling to the browser tab. Lose focus → stop everything.
  // Regain focus (or network back) → one refresh if stale, then resume.
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const onHidden = () => stopPolling();
    const onVisible = () => {
      if (!isFocusedRef.current) return;
      if (isStale()) doRefresh();
      startPolling();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onVisible();
      else onHidden();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisible);
    window.addEventListener('blur', onHidden);
    window.addEventListener('online', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('blur', onHidden);
      window.removeEventListener('online', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Native: AppState background/foreground. (Web uses the listener above
  // instead — RN AppState doesn't track browser tab visibility.)
  useEffect(() => {
    if (isWeb) return;

    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active' && isFocusedRef.current) {
          if (isStale()) doRefresh();
          startPolling();
        } else {
          stopPolling();
        }
      }
    );

    return () => {
      subscription.remove();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Invalidate: clear staleness and force an immediate refetch.
  const invalidate = useCallback(() => {
    lastFetchedAtRef.current = 0;
    if (isFocusedRef.current && tabVisible()) {
      doRefresh();
      startPolling(); // reset the 30s timer
    }
  }, [doRefresh, startPolling, tabVisible]);

  return { invalidate };
}
