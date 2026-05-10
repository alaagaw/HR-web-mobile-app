import { format, addDays, startOfWeek, endOfWeek, getDaysInMonth as fnsGetDaysInMonth, isFriday as fnsIsFriday, isSaturday, startOfDay } from 'date-fns';
import type { TimesheetEntry, ConsolidatedMonthEntry } from '@/types/models';

// ============================================================
// DAY LOCKING — past days lock after this many WORKING days
// (Saudi working week: Sun–Thu; Fri/Sat are weekends and don't count)
// ============================================================

/**
 * How many prior WORKING days remain editable in addition to today.
 * 2 means: today + 2 prior working days are editable; the 3rd prior
 * working day (and earlier) is locked.
 */
export const TIMESHEET_EDIT_WINDOW_WORKING_DAYS = 2;

function isSaudiWeekendDate(date: Date): boolean {
  const day = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
  return day === 5 || day === 6;
}

/**
 * Check if a specific date is locked (beyond the working-day edit window).
 * Today and future days are never locked regardless of whether today itself
 * is a working day. For past days, we count working days while walking
 * BACKWARD from today; if the entry sits on the (window+1)th working day
 * back or earlier, it is locked.
 *
 * Examples (window=2):
 *   today=Wed → editable: Wed, Tue, Mon. Sun is the 3rd working day back → locked.
 *   today=Sun → editable: Sun, Thu, Wed (Fri/Sat skipped). Tue locked.
 *   today=Fri → editable: Fri (today, non-working), Thu, Wed. Tue locked.
 */
export function isDayLocked(
  dateStr: string,
  editWindowWorkingDays: number = TIMESHEET_EDIT_WINDOW_WORKING_DAYS,
): boolean {
  const today = startOfDay(new Date());
  const entryDate = startOfDay(new Date(dateStr + 'T00:00:00'));
  if (entryDate.getTime() >= today.getTime()) return false;

  let workingDaysBack = 0;
  let cursor = today;
  while (cursor.getTime() > entryDate.getTime()) {
    cursor = addDays(cursor, -1);
    if (!isSaudiWeekendDate(cursor)) workingDaysBack++;
  }
  return workingDaysBack > editWindowWorkingDays;
}

// ============================================================
// WEEK HELPERS
// ============================================================

/** Get Sunday..Saturday range for a given date */
export function getWeekRange(date: Date): { weekStart: Date; weekEnd: Date } {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 });     // Saturday
  return { weekStart, weekEnd };
}

/** Get array of 7 day objects for a week starting on the given Sunday */
export function getWeekDays(weekStart: Date): { date: Date; dateStr: string; dayName: string; dayShort: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEEE'),
      dayShort: format(date, 'EEE'),
    };
  });
}

/** Format week range for display: "Apr 22 – Apr 28, 2024" */
export function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
  }
  return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
}

// ============================================================
// MONTH HELPERS
// ============================================================

/** Get number of days in a given month */
export function getDaysInMonth(month: number, year: number): number {
  return fnsGetDaysInMonth(new Date(year, month - 1));
}

/** Check if a specific day in a month is a Friday */
export function isDayFriday(day: number, month: number, year: number): boolean {
  return fnsIsFriday(new Date(year, month - 1, day));
}

/** Check if a specific day is a weekend (Friday or Saturday for Saudi Arabia) */
export function isWeekend(day: number, month: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  return fnsIsFriday(date) || isSaturday(date);
}

// ============================================================
// ROW & COLUMN TOTAL COMPUTATIONS
// ============================================================

/** Compute total standard + overtime hours for one employee across a set of entries */
export function computeRowTotal(entries: TimesheetEntry[]): {
  standardTotal: number;
  overtimeTotal: number;
  grandTotal: number;
} {
  let standardTotal = 0;
  let overtimeTotal = 0;
  for (const entry of entries) {
    standardTotal += Number(entry.standard_hours) || 0;
    overtimeTotal += Number(entry.overtime_hours) || 0;
  }
  return {
    standardTotal,
    overtimeTotal,
    grandTotal: standardTotal + overtimeTotal,
  };
}

/** Compute column totals: sum of all employees' hours for each day in a week */
export function computeColumnTotals(
  entries: TimesheetEntry[],
  weekDays: { dateStr: string }[]
): { date: string; standardTotal: number; overtimeTotal: number; grandTotal: number }[] {
  return weekDays.map(({ dateStr }) => {
    let standardTotal = 0;
    let overtimeTotal = 0;
    for (const entry of entries) {
      if (entry.entry_date === dateStr) {
        standardTotal += Number(entry.standard_hours) || 0;
        overtimeTotal += Number(entry.overtime_hours) || 0;
      }
    }
    return {
      date: dateStr,
      standardTotal,
      overtimeTotal,
      grandTotal: standardTotal + overtimeTotal,
    };
  });
}

/** Compute monthly column totals: sum per day across all employees */
export function computeMonthlyColumnTotals(
  entries: TimesheetEntry[],
  month: number,
  year: number
): { day: number; standardTotal: number; overtimeTotal: number }[] {
  const daysInMonth = getDaysInMonth(month, year);
  const totals: { day: number; standardTotal: number; overtimeTotal: number }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let st = 0;
    let ot = 0;
    for (const entry of entries) {
      if (entry.entry_date === dateStr) {
        st += Number(entry.standard_hours) || 0;
        ot += Number(entry.overtime_hours) || 0;
      }
    }
    totals.push({ day: d, standardTotal: st, overtimeTotal: ot });
  }

  return totals;
}

// ============================================================
// REGULAR / OVERTIME SPLIT (for consolidated monthly view)
// ============================================================

/** Split total hours into regular and overtime based on a configurable limit */
export function splitRegularOvertime(
  totalHours: number,
  regularLimit: number = 8
): { regular: number; overtime: number } {
  if (totalHours <= 0) return { regular: 0, overtime: 0 };
  const regular = Math.min(totalHours, regularLimit);
  const overtime = Math.max(0, totalHours - regularLimit);
  return { regular, overtime };
}

/** Build consolidated monthly grid rows from ConsolidatedMonthEntry[] */
export interface ConsolidatedGridRow {
  employee_key: string;
  employee_name: string;
  employee_number: string | null;
  designation: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  /** Total hours per day keyed by dateStr (yyyy-MM-dd) */
  dailyHours: Record<string, number>;
}

export function buildConsolidatedGridRows(
  entries: ConsolidatedMonthEntry[]
): ConsolidatedGridRow[] {
  const map = new Map<string, ConsolidatedGridRow>();

  for (const entry of entries) {
    let row = map.get(entry.employee_key);
    if (!row) {
      row = {
        employee_key: entry.employee_key,
        employee_name: entry.employee_name,
        employee_number: entry.employee_number,
        designation: entry.designation,
        supplier_id: entry.supplier_id,
        supplier_name: entry.supplier_name,
        dailyHours: {},
      };
      map.set(entry.employee_key, row);
    }
    // Sum hours for this day (entries are already aggregated per employee+day but just in case)
    row.dailyHours[entry.entry_date] = (row.dailyHours[entry.entry_date] || 0) + entry.total_hours;
  }

  return Array.from(map.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

// ============================================================
// EMPLOYEE GROUPING
// ============================================================

/** Group entries by employee for weekly grid display */
export function groupEntriesByEmployee(
  entries: TimesheetEntry[]
): Map<string, { employee: Pick<TimesheetEntry, 'employee_id' | 'employee_name' | 'employee_number' | 'designation' | 'supplier_id'>; entries: TimesheetEntry[] }> {
  const grouped = new Map<string, { employee: Pick<TimesheetEntry, 'employee_id' | 'employee_name' | 'employee_number' | 'designation' | 'supplier_id'>; entries: TimesheetEntry[] }>();

  for (const entry of entries) {
    // Use employee_id if available, otherwise use employee_name as key
    const key = entry.employee_id || entry.employee_name;
    if (!grouped.has(key)) {
      grouped.set(key, {
        employee: {
          employee_id: entry.employee_id,
          employee_name: entry.employee_name,
          employee_number: entry.employee_number,
          designation: entry.designation,
          supplier_id: entry.supplier_id,
        },
        entries: [],
      });
    }
    grouped.get(key)!.entries.push(entry);
  }

  return grouped;
}
