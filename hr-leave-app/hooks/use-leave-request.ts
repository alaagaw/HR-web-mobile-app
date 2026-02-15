import { useState, useCallback } from 'react';
import { leaveService } from '@/services';
import type { LeaveRequest, LeaveRequestDraft, RequestFilters } from '@/types/models';

export function useLeaveRequest() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyRequests = useCallback(async (employeeId: string, filters?: RequestFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await leaveService.getMyRequests(employeeId, filters);
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllRequests = useCallback(async (filters?: RequestFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await leaveService.getAllRequests(filters);
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequestById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await leaveService.getRequestById(id);
      setCurrentRequest(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAndSubmit = useCallback(async (employeeId: string, draft: LeaveRequestDraft) => {
    setLoading(true);
    setError(null);
    try {
      const created = await leaveService.createDraft(employeeId, draft);
      const submitted = await leaveService.submitRequest(created.id);
      return submitted;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelRequest = useCallback(async (id: string, reason: string) => {
    setLoading(true);
    try {
      await leaveService.cancelRequest(id, reason);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requests,
    currentRequest,
    loading,
    error,
    fetchMyRequests,
    fetchAllRequests,
    fetchRequestById,
    createAndSubmit,
    cancelRequest,
  };
}
