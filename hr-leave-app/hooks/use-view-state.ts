import { useCallback, useRef } from 'react';
import { useViewStateStore } from '@/stores/view-state-store';

type Setter<T> = (next: T | ((prev: T) => T)) => void;

/**
 * Drop-in replacement for useState that persists across refreshes via AsyncStorage.
 * Pass a unique `key` per view + slot (e.g. `'admin/request-history.filters'`).
 *
 * Hydration is async; on first paint after a cold start the default is used until
 * the persisted value loads (typically 1 frame). Acceptable for filter UI.
 *
 * The default is captured ONCE, on mount — `useState` semantics, where the
 * initial value is read on the first render and ignored afterwards.
 *
 * This is load-bearing: callers pass inline literals (`{ page: 0, pageSize: 25 }`,
 * `[]`, `{ name: '', ... }`). Re-reading `defaultValue` every render and returning
 * it for any not-yet-persisted slot would hand back a NEW reference on every
 * render, silently defeating every `useMemo` / `React.memo` / effect keyed on the
 * returned value. Most visibly it changes a DataGrid's `rows` identity every
 * render, tripping MUI X's "rows changed → reset to page 0" safeguard, so
 * pagination snaps back to the first page on every click. Do NOT reassign
 * `defaultRef.current` on subsequent renders.
 */
export function useViewState<T>(key: string, defaultValue: T): [T, Setter<T>] {
  const defaultRef = useRef(defaultValue);

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
