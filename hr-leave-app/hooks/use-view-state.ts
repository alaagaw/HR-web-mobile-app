import { useCallback, useRef } from 'react';
import { useViewStateStore } from '@/stores/view-state-store';

type Setter<T> = (next: T | ((prev: T) => T)) => void;

/**
 * Drop-in replacement for useState that persists across refreshes via AsyncStorage.
 * Pass a unique `key` per view + slot (e.g. `'admin/request-history.filters'`).
 *
 * Hydration is async; on first paint after a cold start the default is used until
 * the persisted value loads (typically 1 frame). Acceptable for filter UI.
 */
export function useViewState<T>(key: string, defaultValue: T): [T, Setter<T>] {
  const defaultRef = useRef(defaultValue);
  defaultRef.current = defaultValue;

  const stored = useViewStateStore((s) => s.states[key]) as T | undefined;
  const value = stored !== undefined ? stored : defaultRef.current;

  const setValue = useCallback<Setter<T>>(
    (next) => {
      const store = useViewStateStore.getState();
      const current =
        store.states[key] !== undefined ? (store.states[key] as T) : defaultRef.current;
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
      store.setState(key, resolved);
    },
    [key]
  );

  return [value, setValue];
}
