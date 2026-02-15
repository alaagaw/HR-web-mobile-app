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
    let query = supabase
      .from('profiles')
      .select('*')
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
    return (data ?? []) as Profile[];
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
