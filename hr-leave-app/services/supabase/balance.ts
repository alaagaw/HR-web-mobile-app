import { supabase } from './client';
import type { BalanceService } from '../types';
import type { LeaveBalance, LeaveLedgerEntry } from '@/types/models';
import { EMERGENCY_WINDOW_DAYS } from '@/lib/constants';
import { LeaveStatus } from '@/types/enums';

export const balanceService: BalanceService = {
  async getEmployeeBalance(employeeId) {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year);

    if (error) throw new Error(error.message);
    return (data ?? []) as LeaveBalance[];
  },

  async getEmergencyCount(employeeId) {
    const windowStart = new Date(
      Date.now() - EMERGENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count, error } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('is_emergency', true)
      .not('status', 'in', `(${LeaveStatus.Rejected},${LeaveStatus.Cancelled})`)
      .gte('submitted_at', windowStart);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async adjustBalance(employeeId, leaveType, hours, reason, performedBy) {
    const year = new Date().getFullYear();

    // Upsert balance
    const { data: existing } = await supabase
      .from('leave_balances')
      .select('id, balance_hours')
      .eq('employee_id', employeeId)
      .eq('leave_type', leaveType)
      .eq('year', year)
      .single();

    if (existing) {
      const update: Record<string, any> = {
        balance_hours: existing.balance_hours + hours,
        updated_at: new Date().toISOString(),
      };

      // Deductions (negative hours) also increase used_hours
      if (hours < 0) {
        const { data: full } = await supabase
          .from('leave_balances')
          .select('used_hours')
          .eq('id', existing.id)
          .single();
        update.used_hours = (full?.used_hours ?? 0) + Math.abs(hours);
      }

      await supabase
        .from('leave_balances')
        .update(update)
        .eq('id', existing.id);
    } else {
      await supabase.from('leave_balances').insert({
        employee_id: employeeId,
        leave_type: leaveType,
        balance_hours: hours,
        used_hours: 0,
        year,
      });
    }

    // Write to ledger
    await supabase.from('leave_ledger').insert({
      employee_id: employeeId,
      leave_type: leaveType,
      change_hours: hours,
      reason,
      performed_by: performedBy,
    });
  },

  async getLedger(employeeId) {
    const { data, error } = await supabase
      .from('leave_ledger')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as LeaveLedgerEntry[];
  },

  async getAllLedgerEntries() {
    const { data, error } = await supabase
      .from('leave_ledger')
      .select('*, employee:profiles!employee_id(full_name, department), performer:profiles!performed_by(full_name)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((entry: any) => ({
      ...entry,
      employee_name: entry.employee?.full_name ?? 'Unknown',
      employee_department: entry.employee?.department ?? null,
      performer_name: entry.performer?.full_name ?? null,
      employee: undefined,
      performer: undefined,
    })) as (LeaveLedgerEntry & { employee_name: string; employee_department: string | null; performer_name: string | null })[];
  },
};
