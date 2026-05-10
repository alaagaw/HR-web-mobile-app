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
    // employee_documents has two FKs to profiles (employee_id and verified_by),
    // so PostgREST can't infer the relationship from `employee_documents(...)`
    // alone. The `!employee_id` hint disambiguates explicitly — without it,
    // the query throws and the silent catch upstream produces "no results".
    let query = supabase
      .from('profiles')
      .select('*, employee_documents!employee_id(emp_code)')
      .order('full_name', { ascending: true });

    if (filters?.role) query = query.eq('role', filters.role);
    if (filters?.department) query = query.eq('department', filters.department);
    if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term},department.ilike.${term},role.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Flatten the joined employee_documents.emp_code onto the Profile so callers
    // (e.g. the timesheet Add Employee dialog) can read selectedProfile.emp_code
    // directly instead of having to fetch the employee_documents row separately.
    return (data ?? []).map((row: any) => {
      const docs = Array.isArray(row.employee_documents) ? row.employee_documents[0] : row.employee_documents;
      const { employee_documents: _ed, ...rest } = row;
      return { ...rest, emp_code: docs?.emp_code ?? null } as Profile;
    });
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
