import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ViewStateStore {
  states: Record<string, unknown>;
  setState: (key: string, value: unknown) => void;
  clearKey: (key: string) => void;
  clearAll: () => void;
}

export const useViewStateStore = create<ViewStateStore>()(
  persist(
    (set) => ({
      states: {},
      setState: (key, value) =>
        set((s) => ({ states: { ...s.states, [key]: value } })),
      clearKey: (key) =>
        set((s) => {
          const next = { ...s.states };
          delete next[key];
          return { states: next };
        }),
      clearAll: () => set({ states: {} }),
    }),
    {
      name: 'view-state-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
