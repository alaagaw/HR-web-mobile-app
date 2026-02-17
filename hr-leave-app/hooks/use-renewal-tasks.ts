import { useState, useCallback } from 'react';
import { renewalTaskService } from '@/services';
import type { RenewalTask } from '@/types/models';

export function useRenewalTasks() {
  const [myTasks, setMyTasks] = useState<RenewalTask[]>([]);
  const [allTasks, setAllTasks] = useState<RenewalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyTasks = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await renewalTaskService.getMyPendingTasks(userId);
      setMyTasks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await renewalTaskService.getAllTasks();
      setAllTasks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const startTask = useCallback(async (taskId: string, userId: string) => {
    try {
      await renewalTaskService.startTask(taskId, userId);
      setMyTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'in_progress' as any, started_at: new Date().toISOString() } : t))
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const completeTask = useCallback(async (taskId: string, userId: string, newExpiryDate: string, comment?: string) => {
    try {
      await renewalTaskService.completeTask(taskId, userId, newExpiryDate, comment);
      setMyTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const cancelTask = useCallback(async (taskId: string, userId: string, reason: string) => {
    try {
      await renewalTaskService.cancelTask(taskId, userId, reason);
      setMyTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    myTasks,
    allTasks,
    loading,
    error,
    fetchMyTasks,
    fetchAllTasks,
    startTask,
    completeTask,
    cancelTask,
  };
}
