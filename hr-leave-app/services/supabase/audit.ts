import { supabase } from './client';
import type { AuditService } from '../types';
import type { HistoryEntry } from '@/types/models';

export const auditService: AuditService = {
  async getRequestHistory(requestId) {
    const { data, error } = await supabase
      .from('leave_request_history')
      .select('*, performer:profiles!performed_by(id, full_name, role)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as HistoryEntry[];
  },
};
