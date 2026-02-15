import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LeaveRequestDraft } from '@/types/models';

interface DraftState {
  draft: LeaveRequestDraft | null;
  setDraft: (draft: LeaveRequestDraft | null) => void;
  clearDraft: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
    }),
    {
      name: 'draft-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
