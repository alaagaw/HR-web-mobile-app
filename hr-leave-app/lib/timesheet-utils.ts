import { format, addDays, startOfWeek, endOfWeek, getDaysInMonth as fnsGetDaysInMonth, isFriday as fnsIsFriday, isSaturday } from 'date-fns';
import type { TimesheetEntry } from '@/types/models';

// ============================================================
// WEEK HELPERS
// ============================================================

/** Get Monday..Sunday range for a given date */
export function getWeekRange(date: Date): { weekStart: Date; weekEnd: Date } {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });     // Sunday
  return { weekStart, weekEnd };
}

/** Get array of 7 day objects for a week starting on the given Monday */
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
