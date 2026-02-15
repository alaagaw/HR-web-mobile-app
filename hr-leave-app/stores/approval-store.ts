import { create } from 'zustand';

interface ApprovalState {
  pendingCount: number;
  setPendingCount: (count: number) => void;
}

export const useApprovalStore = create<ApprovalState>()((set) => ({
  pendingCount: 0,
  setPendingCount: (count) => set({ pendingCount: count }),
}));
