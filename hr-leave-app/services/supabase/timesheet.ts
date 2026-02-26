import { supabase } from './client';
import type { TimesheetService } from '../types';
import type {
  TimesheetEntry,
  TimesheetSubmission,
  TimesheetAssignment,
  ComplianceFlag,
  TimesheetHistory,
  ConsolidatedMonthEntry,
  MonthlyHourSetting,
} from '@/types/models';

// ── Select patterns for joined relations ──────────────────────

const ENTRY_SELECT = '*, employee:profiles!employee_id(id, full_name, role, department), supplier:suppliers!supplier_id(id, name, code)';

const SUBMISSION_SELECT = '*, project:projects!project_id(*), submitted_by_profile:profiles!submitted_by(id, full_name, role, department), approved_by_profile:profiles!approved_by(id, full_name, role, department)';

const ASSIGNMENT_SELECT = '*, project:projects!project_id(*), assigned_to:profiles!assigned_to_id(id, full_name, role, department), assigned_by:profiles!assigned_by_id(id, full_name, role, department)';

export const timesheetService: TimesheetService = {
  // ── Entries ──────────────────────────────────────────────────

  async getEntriesForWeek(projectId, weekStart, weekEnd) {
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select(ENTRY_SELECT)
      .eq('project_id', projectId)
      .gte('entry_date', weekStart)
      .lte('entry_date', weekEnd)
      .order('employee_name', { ascending: true })
      .order('entry_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as TimesheetEntry[];
  },

  async getEntriesForMonth(projectId, month, year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('timesheet_entries')
      .select(ENTRY_SELECT)
      .eq('project_id', projectId)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('employee_name', { ascending: true })
      .order('entry_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as TimesheetEntry[];
  },

  async upsertEntry(entry, enteredBy) {
    const payload = {
      project_id: entry.project_id,
      employee_id: entry.employee_id || null,
      employee_name: entry.employee_name,
      employee_number: entry.employee_number || null,
      designation: entry.designation || null,
      supplier_id: entry.supplier_id || null,
      entry_date: entry.entry_date,
      standard_hours: entry.standard_hours ?? 0,
      overtime_hours: entry.overtime_hours ?? 0,
      st_shift: entry.st_shift || 'D',
      ot_shift: entry.ot_shift || 'D',
      notes: entry.notes || null,
      entered_by: enteredBy,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('timesheet_entries')
      .upsert(payload, {
        onConflict: 'project_id,employee_key,entry_date',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as TimesheetEntry;
  },

  async upsertEntries(entries, enteredBy) {
    const payload = entries.map((entry) => ({
      project_id: entry.project_id,
      employee_id: entry.employee_id || null,
      employee_name: entry.employee_name,
      employee_number: entry.employee_number || null,
      designation: entry.designation || null,
      supplier_id: entry.supplier_id || null,
      entry_date: entry.entry_date,
      standard_hours: entry.standard_hours ?? 0,
      overtime_hours: entry.overtime_hours ?? 0,
      st_shift: entry.st_shift || 'D',
      ot_shift: entry.ot_shift || 'D',
      notes: entry.notes || null,
      entered_by: enteredBy,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('timesheet_entries')
      .upsert(payload, {
        onConflict: 'project_id,employee_key,entry_date',
        ignoreDuplicates: false,
      })
      .select();

    if (error) throw new Error(error.message);
    return (data ?? []) as TimesheetEntry[];
  },

  async deleteEntry(entryId) {
    const { error } = await supabase
      .from('timesheet_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw new Error(error.message);
  },

  // ── Submissions ─────────────────────────────────────────────

  async getSubmissions(filters) {
    let query = supabase
      .from('timesheet_submissions')
      .select(SUBMISSION_SELECT)
      .order('week_start', { ascending: false });

    if (filters?.project_id) query = query.eq('project_id', filters.project_id);
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters?.week_start) query = query.gte('week_start', filters.week_start);
    if (filters?.week_end) query = query.lte('week_end', filters.week_end);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as TimesheetSubmission[];
  },

  async getSubmissionForWeek(projectId, weekStart) {
    const { data, error } = await supabase
      .from('timesheet_submissions')
      .select(SUBMISSION_SELECT)
      .eq('project_id', projectId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as TimesheetSubmission | null;
  },

  async submitForApproval(projectId, weekStart, weekEnd, userId, userRole) {
    // Upsert the submission record
    const { data, error } = await supabase
      .from('timesheet_submissions')
      .upsert(
        {
          project_id: projectId,
          week_start: weekStart,
          week_end: weekEnd,
          status: 'submitted',
          submitted_by: userId,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,week_start', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Log history
    await supabase.from('timesheet_history').insert({
      submission_id: data.id,
      action: 'submitted',
      performed_by: userId,
      performer_role: userRole,
      from_status: 'draft',
      to_status: 'submitted',
    });

    return data as TimesheetSubmission;
  },

  async approve(submissionId, userId, userRole, comment) {
    const { data: current, error: fetchErr } = await supabase
      .from('timesheet_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);
    if (current.status !== 'submitted') {
      throw new Error('Only submitted timesheets can be approved');
    }

    const { data, error } = await supabase
      .from('timesheet_submissions')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase.from('timesheet_history').insert({
      submission_id: submissionId,
      action: 'approved',
      performed_by: userId,
      performer_role: userRole,
      comment: comment || null,
      from_status: 'submitted',
      to_status: 'approved',
    });

    return data as TimesheetSubmission;
  },

  async reject(submissionId, userId, userRole, reason) {
    const { data: current, error: fetchErr } = await supabase
      .from('timesheet_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);
    if (current.status !== 'submitted') {
      throw new Error('Only submitted timesheets can be rejected');
    }

    const { data, error } = await supabase
      .from('timesheet_submissions')
      .update({
        status: 'rejected',
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase.from('timesheet_history').insert({
      submission_id: submissionId,
      action: 'rejected',
      performed_by: userId,
      performer_role: userRole,
      comment: reason,
      from_status: 'submitted',
      to_status: 'rejected',
    });

    return data as TimesheetSubmission;
  },

  // ── Assignments ─────────────────────────────────────────────

  async getAssignments(projectId) {
    let query = supabase
      .from('timesheet_assignments')
      .select(ASSIGNMENT_SELECT)
      .order('created_at', { ascending: false });

    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as TimesheetAssignment[];
  },

  async getMyAssignments(userId) {
    const { data, error } = await supabase
      .from('timesheet_assignments')
      .select(ASSIGNMENT_SELECT)
      .eq('assigned_to_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as TimesheetAssignment[];
  },

  async assignKeeper(projectId, assignedToId, assignedById) {
    const { data, error } = await supabase
      .from('timesheet_assignments')
      .upsert(
        {
          project_id: projectId,
          assigned_to_id: assignedToId,
          assigned_by_id: assignedById,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,assigned_to_id', ignoreDuplicates: false }
      )
      .select(ASSIGNMENT_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as TimesheetAssignment;
  },

  async removeAssignment(assignmentId) {
    const { error } = await supabase
      .from('timesheet_assignments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', assignmentId);

    if (error) throw new Error(error.message);
  },

  // ── Compliance ──────────────────────────────────────────────

  async getComplianceFlags(projectId) {
    let query = supabase
      .from('timesheet_compliance_flags')
      .select('*, project:projects!project_id(*), keeper:profiles!keeper_id(id, full_name, role, department)')
      .is('resolved_at', null)
      .order('flag_date', { ascending: false });

    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as ComplianceFlag[];
  },

  async resolveFlag(flagId, userId, note) {
    const { error } = await supabase
      .from('timesheet_compliance_flags')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolution_note: note || null,
      })
      .eq('id', flagId);

    if (error) throw new Error(error.message);
  },

  // ── History ─────────────────────────────────────────────────

  async getHistory(submissionId) {
    const { data, error } = await supabase
      .from('timesheet_history')
      .select('*, performer:profiles!performed_by(id, full_name, role, department)')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as TimesheetHistory[];
  },

  // ── Monthly Consolidated (cross-project aggregation) ─────────

  async getConsolidatedMonth(month, year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch all entries for the month across ALL projects, with supplier join
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('employee_id, employee_name, employee_number, designation, supplier_id, entry_date, standard_hours, overtime_hours, supplier:suppliers!supplier_id(id, name)')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('employee_name', { ascending: true })
      .order('entry_date', { ascending: true });

    if (error) throw new Error(error.message);

    // Aggregate: group by (employee_key, entry_date) summing hours across projects
    const map = new Map<string, ConsolidatedMonthEntry>();
    for (const row of (data ?? []) as any[]) {
      const empKey = row.employee_id || row.employee_name;
      const mapKey = `${empKey}::${row.entry_date}`;
      const existing = map.get(mapKey);
      const hours = (Number(row.standard_hours) || 0) + (Number(row.overtime_hours) || 0);

      if (existing) {
        existing.total_hours += hours;
      } else {
        map.set(mapKey, {
          employee_key: empKey,
          employee_name: row.employee_name,
          employee_number: row.employee_number || null,
          designation: row.designation || null,
          supplier_id: row.supplier_id || null,
          supplier_name: row.supplier?.name || null,
          entry_date: row.entry_date,
          total_hours: hours,
        });
      }
    }

    return Array.from(map.values());
  },

  // ── Monthly Hour Settings ────────────────────────────────────

  async getMonthlyHourSetting(month, year) {
    const { data, error } = await supabase
      .from('monthly_hour_settings')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as MonthlyHourSetting | null;
  },

  async upsertMonthlyHourSetting(month, year, regularHoursLimit, setBy) {
    const { data, error } = await supabase
      .from('monthly_hour_settings')
      .upsert(
        {
          month,
          year,
          regular_hours_limit: regularHoursLimit,
          set_by: setBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'month,year', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MonthlyHourSetting;
  },
};
