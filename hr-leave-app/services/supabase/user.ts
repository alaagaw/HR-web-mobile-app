import { supabase } from './client';
import type { UserService, RemapEmpCodeInput, RemapEmpCodeResult } from '../types';
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

  async remapEmpCodes(remaps) {
    // Pre-resolve every current emp_code → employee_id so we can
    // validate the whole batch (does the old code exist? is the new
    // code already taken by a DIFFERENT employee?) before applying.
    // The audit row written per success uses profile_audit_log with
    // table_name='employee_documents' (the CHECK constraint already
    // allows both values).
    const results: RemapEmpCodeResult[] = [];

    // Snapshot of everyone's current emp_code (RLS-gated view).
    const { data: codes, error: codesErr } = await supabase
      .from('v_emp_codes')
      .select('employee_id, emp_code');
    if (codesErr) throw new Error(`Failed to read emp_codes: ${codesErr.message}`);

    const idByCode = new Map<string, string>();
    for (const row of codes ?? []) {
      idByCode.set(String((row as any).emp_code), (row as any).employee_id);
    }

    // Need full_name for friendlier UI summaries. One round trip.
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name');
    const nameById = new Map<string, string>();
    for (const p of profiles ?? []) nameById.set((p as any).id, (p as any).full_name);

    // Caller id for the audit log. RLS will reject the update anyway
    // if it's not HR, so this is just bookkeeping.
    const { data: { user } } = await supabase.auth.getUser();
    const callerId = user?.id ?? null;

    // Detect intra-batch duplicates upfront so we don't half-apply
    // a conflicting pair (e.g. swap A↔B which is genuinely two ops
    // and can't be done with the simple-UPDATE strategy below).
    const newCodeCounts = new Map<string, number>();
    for (const r of remaps) {
      const code = String(r.new_code).trim();
      newCodeCounts.set(code, (newCodeCounts.get(code) ?? 0) + 1);
    }

    for (const r of remaps) {
      const oldCode = String(r.old_code).trim();
      const newCode = String(r.new_code).trim();

      try {
        if (!oldCode || !newCode) throw new Error('Both old and new codes are required');
        if (oldCode === newCode) throw new Error('Old and new codes are identical');

        const empId = idByCode.get(oldCode);
        if (!empId) throw new Error(`No employee currently has emp_code "${oldCode}"`);

        // Is the new code already taken by a different employee?
        const collidesWith = idByCode.get(newCode);
        if (collidesWith && collidesWith !== empId) {
          throw new Error(`emp_code "${newCode}" is already used by another employee`);
        }

        // Intra-batch duplicate target?
        if ((newCodeCounts.get(newCode) ?? 0) > 1) {
          throw new Error(`emp_code "${newCode}" appears more than once in this batch`);
        }

        // Apply the rename.
        const { error: upErr } = await supabase
          .from('employee_documents')
          .update({ emp_code: newCode, updated_at: new Date().toISOString() })
          .eq('employee_id', empId);
        if (upErr) throw new Error(upErr.message);

        // Audit row (best-effort; failure here doesn't roll back the
        // rename — the rename itself is the data of record).
        try {
          await supabase.from('profile_audit_log').insert({
            profile_id: empId,
            table_name: 'employee_documents',
            field_name: 'emp_code',
            old_value: oldCode,
            new_value: newCode,
            changed_by: callerId,
            context: 'bulk_remap',
          });
        } catch { /* swallowed */ }

        // Keep the in-memory map consistent so the next iteration
        // sees the new code as the "current" one.
        idByCode.delete(oldCode);
        idByCode.set(newCode, empId);

        results.push({
          old_code: oldCode,
          new_code: newCode,
          success: true,
          employee_id: empId,
          full_name: nameById.get(empId),
        });
      } catch (err: any) {
        results.push({
          old_code: oldCode,
          new_code: newCode,
          success: false,
          error: err.message || 'Unknown error',
        });
      }
    }

    return results;
  },
};
