import { create } from 'zustand';

interface TaskState {
  pendingCount: number;
  renewalTaskCount: number;
  setPendingCount: (count: number) => void;
  setRenewalTaskCount: (count: number) => void;
}

export const useTaskStore = create<TaskState>()((set) => ({
  pendingCount: 0,
  renewalTaskCount: 0,
  setPendingCount: (count) => set({ pendingCount: count }),
  setRenewalTaskCount: (count) => set({ renewalTaskCount: count }),
}));
