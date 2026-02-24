import { supabase } from './client';
import type { TimeTrackingService } from '../types';
import type { TimeEntry } from '@/types/models';
import { TimeEntryType, TimeEntryStatus } from '@/types/enums';

const ENTRY_SELECT =
  '*, employee:profiles!employee_id(id, full_name, role, department)';

export const timeTrackingService: TimeTrackingService = {
  async clockIn(employeeId, notes) {
    // Guard against double clock-in
    const { data: existing } = await supabase
      .from('time_entries')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('status', TimeEntryStatus.Active)
      .maybeSingle();

    if (existing) {
      throw new Error('You are already clocked in. Please clock out first.');
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employeeId,
        clock_in: new Date().toISOString(),
        notes: notes || null,
        entry_type: TimeEntryType.Regular,
        status: TimeEntryStatus.Active,
      })
      .select(ENTRY_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as TimeEntry;
  },

  async clockOut(entryId, notes) {
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('time_entries')
      .select('status')
      .eq('id', entryId)
      .single();

    if (!existing || existing.status !== TimeEntryStatus.Active) {
      throw new Error('This entry is not currently active.');
    }

    const updateData: Record<string, unknown> = {
      clock_out: now,
      status: TimeEntryStatus.Completed,
      updated_at: now,
    };
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', entryId)
      .select(ENTRY_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as TimeEntry;
  },

  async getActiveEntry(employeeId) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(ENTRY_SELECT)
      .eq('employee_id', employeeId)
      .eq('status', TimeEntryStatus.Active)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as TimeEntry) ?? null;
  },

  async getEntriesByDate(employeeId, date) {
    // date is YYYY-MM-DD — query entries where clock_in falls on that day
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from('time_entries')
      .select(ENTRY_SELECT)
      .eq('employee_id', employeeId)
      .in('status', [TimeEntryStatus.Active, TimeEntryStatus.Completed])
      .gte('clock_in', dayStart)
      .lte('clock_in', dayEnd)
      .order('clock_in', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as TimeEntry[];
  },

  async getHistory(employeeId, dateFrom, dateTo) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(ENTRY_SELECT)
      .eq('employee_id', employeeId)
      .in('status', [TimeEntryStatus.Active, TimeEntryStatus.Completed])
      .gte('clock_in', `${dateFrom}T00:00:00.000Z`)
      .lte('clock_in', `${dateTo}T23:59:59.999Z`)
      .order('clock_in', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as TimeEntry[];
  },

  async createManualEntry(employeeId, clockIn, clockOut, notes) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employeeId,
        clock_in: clockIn,
        clock_out: clockOut,
        notes: notes || null,
        entry_type: TimeEntryType.Manual,
        status: TimeEntryStatus.Completed,
      })
      .select(ENTRY_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as TimeEntry;
  },

  async getWeeklySummary(employeeId, weekStart) {
    // weekStart is YYYY-MM-DD (Monday)
    const days: { date: string; totalMinutes: number; entries: TimeEntry[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const entries = await this.getEntriesByDate(employeeId, dateStr);

      let totalMinutes = 0;
      for (const entry of entries) {
        if (entry.clock_out) {
          const diff =
            new Date(entry.clock_out).getTime() -
            new Date(entry.clock_in).getTime();
          totalMinutes += Math.round(diff / 60000);
        }
      }

      days.push({ date: dateStr, totalMinutes, entries });
    }

    return days;
  },
};
