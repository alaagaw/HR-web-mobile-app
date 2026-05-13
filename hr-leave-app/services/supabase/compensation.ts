/**
 * Compensation service — backed by the effective-dated
 * `employee_compensation` table (migration 033).
 *
 * Always insert a new row when HR changes a salary, never UPDATE an
 * existing row in place. Past rows are the audit trail. Current pay
 * is read via the `v_current_compensation` view.
 */
import { supabase } from './client';
import type { EmployeeCompensation, LeavePayoutRow } from '@/types/models';

export const compensationService = {
  /**
   * Latest-effective compensation row for one employee. Null if no
   * row has ever been entered (treat as 0 across the board).
   */
  async getCurrent(employeeId: string): Promise<EmployeeCompensation | null> {
    const { data, error } = await supabase
      .from('v_current_compensation')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as EmployeeCompensation | null;
  },

  /**
   * Latest-effective row for every employee. Used by the
   * /admin/compensation list page so we only do one round-trip.
   */
  async listCurrentForAll(): Promise<EmployeeCompensation[]> {
    const { data, error } = await supabase
      .from('v_current_compensation')
      .select('*');
    if (error) throw new Error(error.message);
    return (data ?? []) as EmployeeCompensation[];
  },

  /**
   * Full effective-dated history for one employee, most recent first.
   */
  async getHistory(employeeId: string): Promise<EmployeeCompensation[]> {
    const { data, error } = await supabase
      .from('employee_compensation')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_from', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as EmployeeCompensation[];
  },

  /**
   * Insert a new effective-dated row. Caller should pass the values
   * AFTER the change (not deltas). `effective_from` defaults to today
   * if omitted. If a row already exists with the same employee + date,
   * Postgres rejects (PK violation) — HR has to pick a different
   * effective_from in that case.
   */
  async addNewRow(input: {
    employee_id: string;
    effective_from?: string;
    basic_salary: number;
    hra: number;
    transportation: number;
    other_allowances?: number;
    currency?: string;
    notes?: string;
    created_by?: string;
  }): Promise<EmployeeCompensation> {
    const effective = input.effective_from || new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('employee_compensation')
      .insert({
        employee_id: input.employee_id,
        effective_from: effective,
        basic_salary: input.basic_salary,
        hra: input.hra,
        transportation: input.transportation,
        other_allowances: input.other_allowances ?? 0,
        currency: input.currency ?? 'SAR',
        notes: input.notes ?? null,
        created_by: input.created_by ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as EmployeeCompensation;
  },

  /**
   * Point-in-time compensation lookup for a specific date.
   */
  async getAtDate(employeeId: string, date: string): Promise<EmployeeCompensation | null> {
    const { data, error } = await supabase.rpc('get_compensation_at_date', {
      p_employee_id: employeeId,
      p_date: date,
    });
    if (error) throw new Error(error.message);
    return (data ?? null) as EmployeeCompensation | null;
  },

  /**
   * The single read backing /admin/leave-payouts. One row per active
   * employee with the precomputed payable amounts for the target
   * (year, month, optional department).
   */
  async computeLeavePayouts(
    year: number,
    month: number,
    department?: string,
  ): Promise<LeavePayoutRow[]> {
    const { data, error } = await supabase.rpc('compute_leave_payouts', {
      p_year: year,
      p_month: month,
      p_department: department ?? null,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LeavePayoutRow[];
  },
};
