import { useState, useCallback } from 'react';
import { balanceService } from '@/services';
import type { LeaveBalance } from '@/types/models';
import { computeBalanceImpact, computeRequestedHours } from '@/lib/hours-calculator';
import type { HoursComputeParams, BalanceImpact } from '@/types/models';

export function useBalance() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async (employeeId: string) => {
    setLoading(true);
    try {
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
