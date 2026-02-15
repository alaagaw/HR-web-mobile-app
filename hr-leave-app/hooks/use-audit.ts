import { useState, useCallback } from 'react';
import { auditService } from '@/services';
import { HistoryEntry } from '@/types/models';

export function useAudit() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequestHistory = useCallback(async (requestId: string) => {
    setLoading(true);
    try {
      const data = await auditService.getRequestHistory(requestId);
      setHistory(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    history,
    loading,
    fetchRequestHistory,
  };
}
