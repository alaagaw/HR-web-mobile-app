import { supabase } from './client';
import type { UserService } from '../types';
import type { Profile, EmployeeFilters } from '@/types/models';

export const userService: UserService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return data as Profile;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Profile;
  },

  async getEmployees(filters) {
    // Two parallel queries:
    //   1) profiles (RLS-open SELECT)
    //   2) v_emp_codes (migration 021) — a minimal view that surfaces only
    //      employee_id + emp_code from employee_documents, bypassing the
    //      strict RLS on the underlying table without exposing PII fields.
    //
    // The emp_code is then merged onto the Profile rows client-side so
    // callers can read profile.emp_code regardless of who is signed in —
    // a timesheet keeper picking an existing employee from the search
    // dropdown gets the same staff number that HR would.
    let profilesQuery = supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (filters?.role) profilesQuery = profilesQuery.eq('role', filters.role);
    if (filters?.department) profilesQuery = profilesQuery.eq('department', filters.department);
    if (filters?.is_active !== undefined) profilesQuery = profilesQuery.eq('is_active', filters.is_active);
    if (filters?.search) {
      const term = `%${filters.search}%`;
      profilesQuery = profilesQuery.or(`full_name.ilike.${term},email.ilike.${term},department.ilike.${term},role.ilike.${term}`);
    }

    const [profilesRes, codesRes] = await Promise.all([
      profilesQuery,
      supabase.from('v_emp_codes').select('employee_id, emp_code'),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const codeByEmployeeId = new Map<string, string>();
    for (const row of codesRes.data ?? []) {
      codeByEmployeeId.set((row as any).employee_id, (row as any).emp_code);
    }

    return (profilesRes.data ?? []).map((p: any) => ({
      ...p,
      emp_code: codeByEmployeeId.get(p.id) ?? null,
    })) as Profile[];
  },

  async updateEmployeeOrg(employeeId, supervisorId, managerId) {
    const { error } = await supabase
      .from('profiles')
      .update({
        supervisor_id: supervisorId,
        manager_id: managerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (error) throw new Error(error.message);
  },
};
