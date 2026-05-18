import { create } from 'zustand';
import type { AccessPolicy } from '@/types/models';

interface AccessState {
  /** resource_key → policy row. Empty until first load. */
  policies: Record<string, AccessPolicy>;
  /** Current user's is_superuser flag (bypasses all rules). */
  isSuperuser: boolean;
  loaded: boolean;
  loading: boolean;
  setPolicies: (list: AccessPolicy[], isSuperuser: boolean) => void;
  setLoading: (v: boolean) => void;
  clear: () => void;
}

export const useAccessStore = create<AccessState>()((set) => ({
  policies: {},
  isSuperuser: false,
  loaded: false,
  loading: false,
  setPolicies: (list, isSuperuser) =>
    set({
      policies: Object.fromEntries(list.map((p) => [p.resource_key, p])),
      isSuperuser,
      loaded: true,
      loading: false,
    }),
  setLoading: (v) => set({ loading: v }),
  clear: () =>
    set({ policies: {}, isSuperuser: false, loaded: false, loading: false }),
}));
