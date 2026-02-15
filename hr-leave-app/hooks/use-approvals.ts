import { useState, useCallback } from 'react';
import { approvalService } from '@/services';
import type { LeaveRequest } from '@/types/models';
import type { ExcessDetermination } from '@/types/enums';

export function useApprovals() {
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [chainRequests, setChainRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [chainLoading, setChainLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingApprovals = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await approvalService.getMyPendingApprovals(userId);
      setPendingApprovals(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChainRequests = useCallback(async (userId: string, role: string) => {
    setChainLoading(true);
    setError(null);
    try {
      const data = await approvalService.getChainRequests(userId, role);
      setChainRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChainLoading(false);
    }
  }, []);

  const approve = useCallback(async (requestId: string, userId: string, comment?: string) => {
    setLoading(true);
    try {
      await approvalService.approveRequest(requestId, userId, comment);
      setPendingApprovals((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reject = useCallback(async (requestId: string, userId: string, comment: string) => {
    setLoading(true);
    try {
      await approvalService.rejectRequest(requestId, userId, comment);
      setPendingApprovals((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const determineExcess = useCallback(
    async (requestId: string, userId: string, determination: ExcessDetermination, comment?: string) => {
      setLoading(true);
      try {
        await approvalService.determineExcess(requestId, userId, determination, comment);
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    pendingApprovals,
    chainRequests,
    loading,
    chainLoading,
    error,
    fetchPendingApprovals,
    fetchChainRequests,
    approve,
    reject,
    determineExcess,
  };
}
