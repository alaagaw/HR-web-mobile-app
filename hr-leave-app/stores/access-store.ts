import { create } from 'zustand';
import type { AccessPolicy } from '@/types/models';

interface AccessState {
  /** resource_key → policy row. Empty until first load. */
  policies: Record<string, AccessPolicy>;
  loaded: boolean;
  loading: boolean;
  setPolicies: (list: AccessPolicy[]) => void;
  setLoading: (v: boolean) => void;
  clear: () => void;
}

export const useAccessStore = create<AccessState>()((set) => ({
  policies: {},
  loaded: false,
  loading: false,
  setPolicies: (list) =>
    set({
      policies: Object.fromEntries(list.map((p) => [p.resource_key, p])),
      loaded: true,
      loading: false,
    }),
  setLoading: (v) => set({ loading: v }),
  clear: () => set({ policies: {}, loaded: false, loading: false }),
}));
