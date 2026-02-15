import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { CASE_NUMBER_PREFIX, MIN_ADVANCE_NOTICE_DAYS } from './constants';
import { Role } from '@/types/enums';

/**
 * Format a date string for display: "Feb 12, 2026"
 */
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

/**
 * Format a date range: "Feb 12 – Feb 14, 2026"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (startDate === endDate) {
    return format(start, 'MMM d, yyyy');
  }

  // Same month+year
  if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  }

  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

/**
 * Format "pending since" as a human-readable duration: "2 days ago", "5 hours ago"
 */
export function formatPendingSince(dateStr: string | null): string {
  if (!dateStr) return '';
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

/**
 * Format hours for display: "40.00h"
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}h`;
}

/**
 * Format total hours as "Xd Yh", e.g. 154 hours → "19d 2h", 8 → "1d", 2.5 → "2.5h"
 */
export function formatDaysHours(totalHours: number, workdayHours: number): string {
  const abs = Math.abs(totalHours);
  const days = Math.floor(abs / workdayHours);
  const remaining = Math.round((abs % workdayHours) * 100) / 100;
  const sign = totalHours < 0 ? '−' : '';

  if (days === 0 && remaining === 0) return '0h';
  if (days === 0) return `${sign}${remaining}h`;
  if (remaining === 0) return `${sign}${days}d`;
  return `${sign}${days}d ${remaining}h`;
}

/**
 * Format hours with days: "40.00h (5d)"
 */
export function formatHoursWithDays(hours: number, workdayHours: number): string {
  return `${hours.toFixed(2)}h (${formatDaysHours(hours, workdayHours)})`;
}

/**
 * Check if a request meets the minimum advance notice requirement.
 */
export function meetsAdvanceNotice(startDate: string): boolean {
  const start = parseISO(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(start, today) >= MIN_ADVANCE_NOTICE_DAYS;
}

/**
 * Generate a case number: "LR-2026-000123"
 */
export function generateCaseNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const paddedSeq = String(sequenceNumber).padStart(6, '0');
  return `${CASE_NUMBER_PREFIX}-${year}-${paddedSeq}`;
}

/**
 * Get role display label.
 */
export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    [Role.Employee]: 'Employee',
    [Role.Supervisor]: 'Supervisor',
    [Role.Manager]: 'Manager',
    [Role.HR]: 'HR',
    [Role.HRDirector]: 'HR Director',
  };
  return labels[role];
}

/**
 * Format file size for display: "2.5 MB", "500 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get initials from a full name: "John Doe" → "JD"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
