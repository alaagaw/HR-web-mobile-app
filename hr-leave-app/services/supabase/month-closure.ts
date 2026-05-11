import { supabase } from './client';
import type { MonthClosure } from '@/types/models';

/**
 * CRUD for month_closures (migration 019).
 *
 * A month is considered CLOSED when a row exists for (year, month) and
 * reopened_at IS NULL. Closing is HR's explicit signal that payroll for
 * the month is in motion: no more retroactive corrections, the
 * projectHoursChangeService rejects any new retroactive_week request
 * whose week_start falls in a closed month.
 *
 * Reopen is supported (writes reopened_at + reopened_by) but should be
 * exceptional. Both events are visible to anyone who reads the row.
 */
export const monthClosureService = {
  async listRecent(monthsBack: number = 12): Promise<MonthClosure[]> {
    const { data, error } = await supabase
      .from('month_closures')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(monthsBack);
    if (error) throw new Error(error.message);
    return (data ?? []) as MonthClosure[];
  },

  async getStatus(year: number, month: number): Promise<MonthClosure | null> {
    const { data, error } = await supabase
      .from('month_closures')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as MonthClosure | null;
  },

  /**
   * True when the (year, month) has a closure row with reopened_at IS NULL.
   * Used by the approval pipeline to reject retroactive_week requests
   * targeting closed months.
   */
  async isClosed(year: number, month: number): Promise<boolean> {
    const row = await this.getStatus(year, month);
    return !!row && row.reopened_at === null;
  },

  async close(year: number, month: number, closedBy: string, notes?: string): Promise<MonthClosure> {
    // Upsert handles re-close after a reopen: same (year, month) row gets
    // closed_at refreshed and reopened_* cleared.
    const { data, error } = await supabase
      .from('month_closures')
      .upsert(
        {
          year,
          month,
          closed_by: closedBy,
          closed_at: new Date().toISOString(),
          reopened_by: null,
          reopened_at: null,
          notes: notes ?? null,
        },
        { onConflict: 'year,month' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as MonthClosure;
  },

  async reopen(year: number, month: number, reopenedBy: string, notes?: string): Promise<MonthClosure> {
    const { data, error } = await supabase
      .from('month_closures')
      .update({
        reopened_by: reopenedBy,
        reopened_at: new Date().toISOString(),
        notes: notes ?? null,
      })
      .eq('year', year)
      .eq('month', month)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as MonthClosure;
  },
};
