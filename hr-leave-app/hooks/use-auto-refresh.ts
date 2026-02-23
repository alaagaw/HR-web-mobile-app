import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, type AppStateStatus } from 'react-native';

const REFRESH_INTERVAL = 30_000; // 30 seconds

/**
 * Auto-refresh hook: calls the provided fetch function every 30s,
 * but only when the screen is focused AND the app is in the foreground.
 *
 * Includes a staleness check — if data was fetched less than 30s ago,
 * re-focusing the screen will NOT trigger an extra fetch.
 *
 * Returns an `invalidate()` function you can call after mutations
 * to force an immediate refetch.
 *
 * Usage:
 *   const { invalidate } = useAutoRefresh(() => {
 *     fetchData();
 *   }, [dep1, dep2]);
 *
 *   // After a mutation:
 *   await updateSomething();
 *   invalidate();
 */
export function useAutoRefresh(
  fetchFn: () => void,
  deps: any[] = []
): { invalidate: () => void } {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(false);
  const lastFetchedAtRef = useRef(0);

  const fetchWithTimestamp = useCallback(() => {
    fetchFn();
    lastFetchedAtRef.current = Date.now();
  }, [fetchFn]);

  const isStale = useCallback(() => {
    return Date.now() - lastFetchedAtRef.current > REFRESH_INTERVAL;
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    if (isFocusedRef.current) {
      intervalRef.current = setInterval(() => {
        if (AppState.currentState === 'active') {
          fetchWithTimestamp();
        }
      }, REFRESH_INTERVAL);
    }
  }, [fetchWithTimestamp, stopPolling]);

  // Focus/blur management
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      // Only fetch if data is stale (>30s old or never fetched)
      if (isStale()) {
        fetchWithTimestamp();
      }
      startPolling();

      return () => {
        isFocusedRef.current = false;
        stopPolling();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  );

  // App state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && isFocusedRef.current) {
        // Only fetch if data is stale
        if (isStale()) {
          fetchWithTimestamp();
        }
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      subscription.remove();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Invalidate: clear staleness and force immediate refetch
  const invalidate = useCallback(() => {
    lastFetchedAtRef.current = 0;
    if (isFocusedRef.current) {
      fetchWithTimestamp();
      startPolling(); // Reset the 30s timer
    }
  }, [fetchWithTimestamp, startPolling]);

  return { invalidate };
}
