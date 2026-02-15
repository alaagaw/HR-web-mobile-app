import { useState, useCallback } from 'react';
import { userService } from '@/services';
import { Profile, EmployeeFilters } from '@/types/models';

export function useEmployees() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async (filters?: EmployeeFilters) => {
    setLoading(true);
    try {
      const data = await userService.getEmployees(filters);
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEmployeeOrg = useCallback(async (
    employeeId: string,
    supervisorId: string,
    managerId: string
  ) => {
    await userService.updateEmployeeOrg(employeeId, supervisorId, managerId);
    // Refresh list after update
    await fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    fetchEmployees,
    updateEmployeeOrg,
  };
}
