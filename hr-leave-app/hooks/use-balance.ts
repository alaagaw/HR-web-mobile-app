import { useState, useCallback } from 'react';
import { balanceService } from '@/services';
import { supabase } from '@/services/supabase/client';
import type { LeaveBalance } from '@/types/models';
import { computeBalanceImpact, computeRequestedHours } from '@/lib/hours-calculator';
import type { HoursComputeParams, BalanceImpact } from '@/types/models';

/**
 * Lazy-fallback for the monthly PTO accrual: if pg_cron missed (or
 * isn't enabled) we still want the employee's balance to be correct
 * when they look at it. Calling apply_current_month_accrual_for_user
 * is idempotent — the UNIQUE on leave_accruals catches re-runs, so
 * doing this on every balance read is cheap. We swallow errors so a
 * misconfigured RPC never blocks the view itself.
 *
 * Best-effort: fire it once per (mount, employeeId) — repeated reads
 * during the same session reuse the result.
 */
const accrualTriggered = new Set<string>();
async function ensureCurrentMonthAccrual(employeeId: string): Promise<void> {
  if (accrualTriggered.has(employeeId)) return;
  accrualTriggered.add(employeeId);
  try {
    await supabase.rpc('apply_current_month_accrual_for_user', { p_employee_id: employeeId });
  } catch {
    // Non-fatal. Cron + manual button still cover correctness.
    accrualTriggered.delete(employeeId); // allow retry on next mount
  }
}

export function useBalance() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async (employeeId: string) => {
    setLoading(true);
    try {
      // Trigger the lazy accrual first so the balance read picks up
      // this month's credit if pg_cron missed it.
      await ensureCurrentMonthAccrual(employeeId);
      const data = await balanceService.getEmployeeBalance(employeeId);
      setBalances(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmergencyCount = useCallback(async (employeeId: string) => {
    try {
      const count = await balanceService.getEmergencyCount(employeeId);
      setEmergencyCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  const computeImpact = useCallback(
    (leaveType: string, params: HoursComputeParams): BalanceImpact | null => {
      const balance = balances.find((b) => b.leave_type === leaveType);
      if (!balance) return null;

      const hours = computeRequestedHours(params);
      return computeBalanceImpact(balance.balance_hours, hours.requested_hours, params.workday_hours);
    },
    [balances]
  );

  return {
    balances,
    emergencyCount,
    loading,
    fetchBalance,
    fetchEmergencyCount,
    computeImpact,
  };
}
