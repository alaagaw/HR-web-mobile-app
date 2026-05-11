import { supabase } from './client';
import type { EmployeeOvertimeCurrentMonth } from '@/types/models';

/**
 * Reads from v_employee_overtime_current_month (migration 019).
 *
 * The view filters timesheet_entries to the current calendar month
 * (date_trunc('month', CURRENT_DATE)) and sums overtime_hours per
 * employee. It "resets" automatically on the 1st of each month
 * because the filter expression is re-evaluated on every read —
 * no cron, no scheduled job needed.
 */
export const overtimeService = {
  async getForEmployee(employeeId: string): Promise<EmployeeOvertimeCurrentMonth | null> {
    const { data, error } = await supabase
      .from('v_employee_overtime_current_month')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as EmployeeOvertimeCurrentMonth | null;
  },

  /**
   * Per-employee + per-project breakdown for a given month. Drives the
   * drill-down report. One row per (employee, project) with the full
   * R/OT/Grand split for the month, joined with the human-readable
   * project + profile names.
   */
  async getEmployeeProjectBreakdown(
    year: number,
    month: number,
  ): Promise<{
    employee_id: string | null;
    employee_name: string;
    employee_number: string | null;
    project_id: string;
    project_number: string;
    project_name: string;
    standard_hours: number;
    overtime_hours: number;
    total_hours: number;
  }[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('employee_id, employee_name, employee_number, project_id, standard_hours, overtime_hours, project:projects!project_id(project_number,name)')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);
    if (error) throw new Error(error.message);

    // Aggregate client-side: group by (employee_id || employee_name, project_id).
    const map = new Map<string, any>();
    for (const r of data ?? []) {
      const empKey = (r as any).employee_id ?? `name:${(r as any).employee_name}`;
      const key = `${empKey}::${(r as any).project_id}`;
      const std = Number((r as any).standard_hours) || 0;
      const ot = Number((r as any).overtime_hours) || 0;
      if (!map.has(key)) {
        const proj: any = (r as any).project ?? {};
        map.set(key, {
          employee_id: (r as any).employee_id,
          employee_name: (r as any).employee_name,
          employee_number: (r as any).employee_number,
          project_id: (r as any).project_id,
          project_number: proj.project_number ?? '',
          project_name: proj.name ?? '',
          standard_hours: 0,
          overtime_hours: 0,
          total_hours: 0,
        });
      }
      const row = map.get(key);
      row.standard_hours += std;
      row.overtime_hours += ot;
      row.total_hours += std + ot;
    }
    return [...map.values()].sort((a, b) =>
      a.employee_name.localeCompare(b.employee_name) ||
      a.project_number.localeCompare(b.project_number),
    );
  },
};
