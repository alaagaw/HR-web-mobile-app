import {
  eachDayOfInterval,
  parseISO,
  isWeekend,
  differenceInMinutes,
  parse,
} from 'date-fns';
import type { HoursComputeParams, HoursResult, BalanceImpact } from '@/types/models';

/**
 * Count working days between two dates (inclusive).
 * If includeWeekends is true, counts all calendar days.
 */
export function countWorkingDays(
  startDate: string,
  endDate: string,
  includeWeekends: boolean
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (start > end) return 0;

  const allDays = eachDayOfInterval({ start, end });

  if (includeWeekends) {
    return allDays.length;
  }

  return allDays.filter((day) => !isWeekend(day)).length;
}

/**
 * Parse a time string "HH:MM" into total minutes from midnight.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Compute requested hours for a leave request.
 */
export function computeRequestedHours(params: HoursComputeParams): HoursResult {
  const {
    start_date,
    end_date,
    start_time,
    end_time,
    include_weekends,
    is_full_day,
    workday_hours,
  } = params;

  // Partial day: compute hours from time range
  if (!is_full_day && start_time && end_time) {
    const startMinutes = parseTimeToMinutes(start_time);
    const endMinutes = parseTimeToMinutes(end_time);
    const diffHours = Math.max(0, (endMinutes - startMinutes) / 60);

    return {
      requested_hours: Math.round(diffHours * 100) / 100,
      requested_days: Math.round((diffHours / workday_hours) * 100) / 100,
      working_days: diffHours > 0 ? 1 : 0,
    };
  }

  // Full days
  const workingDays = countWorkingDays(start_date, end_date, include_weekends);
  const requestedHours = workingDays * workday_hours;

  return {
    requested_hours: requestedHours,
    requested_days: workingDays,
    working_days: workingDays,
  };
}

/**
 * Compute the balance impact of a leave request.
 * Shows available, requested, remaining, excess — all in hours and days.
 */
export function computeBalanceImpact(
  availableHours: number,
  requestedHours: number,
  workdayHours: number
): BalanceImpact {
  const paidHours = Math.min(availableHours, requestedHours);
  const excessHours = Math.max(0, requestedHours - availableHours);
  const remainingHours = availableHours - paidHours;

  return {
    available_hours: availableHours,
    available_days: Math.round((availableHours / workdayHours) * 100) / 100,
    requested_hours: requestedHours,
    requested_days: Math.round((requestedHours / workdayHours) * 100) / 100,
    remaining_hours: remainingHours,
    remaining_days: Math.round((remainingHours / workdayHours) * 100) / 100,
    paid_hours: paidHours,
    excess_hours: excessHours,
    excess_days: Math.round((excessHours / workdayHours) * 100) / 100,
    has_excess: excessHours > 0,
  };
}

/**
 * Format hours as a display string: "40.00h (5.0 days)"
 */
export function formatHoursDisplay(hours: number, workdayHours: number): string {
  const days = hours / workdayHours;
  return `${hours.toFixed(2)}h (${days.toFixed(1)} ${days === 1 ? 'day' : 'days'})`;
}
