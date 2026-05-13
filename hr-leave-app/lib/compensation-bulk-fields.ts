/**
 * Single source of truth for the Compensation bulk export/upload.
 *
 * Adding a new pay component (e.g. phone allowance) is one entry here
 * + the matching column on `employee_compensation` + a migration to
 * extend the table. Export AND import both iterate this list.
 *
 * Different in spirit from `employee-bulk-fields.ts` (which writes to
 * profiles + leave_balances) — compensation is INSERT-only (one new
 * effective-dated row per change). The bulk importer below uses a
 * single effective_from chosen by HR in the import dialog, applied
 * to every row that actually changed.
 */
import type { Profile, EmployeeCompensation } from '@/types/models';

export interface CompensationBulkContext {
  profile: Profile;
  emp_code: string | null;
  /** Current (latest effective) compensation row. Null if none yet. */
  current: EmployeeCompensation | null;
}

/**
 * Subset of fields the importer applies. We send a single
 * effective_from for the whole batch — HR picks it in the dialog
 * before the upload runs.
 */
export interface CompensationBulkWriteSet {
  basic_salary?: number;
  hra?: number;
  transportation?: number;
  other_allowances?: number;
  notes?: string;
}

export interface CompensationBulkField {
  /** Stable key, used in error messages. */
  key: string;
  /** Excel header label. */
  label: string;
  isKey?: boolean;
  readOnly?: boolean;
  type: 'string' | 'number' | 'date';
  width?: number;
  read: (ctx: CompensationBulkContext) => string | number | null;
  write?: (value: string | number | null, set: CompensationBulkWriteSet) => void;
}

const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string | null => {
  if (v === '' || v === null || v === undefined) return null;
  return String(v).trim() || null;
};

/**
 * Canonical compensation column set. Order = column order in the
 * Excel sheet.
 */
export const COMPENSATION_BULK_FIELDS: CompensationBulkField[] = [
  {
    key: 'emp_code',
    label: 'Emp Code',
    isKey: true,
    type: 'string',
    width: 12,
    read: (c) => c.emp_code ?? '',
  },
  {
    key: 'full_name',
    label: 'Name',
    readOnly: true,
    type: 'string',
    width: 28,
    read: (c) => c.profile.full_name,
  },
  {
    key: 'department',
    label: 'Department',
    readOnly: true,
    type: 'string',
    width: 18,
    read: (c) => c.profile.department ?? '',
  },
  {
    key: 'current_effective_from',
    label: 'Current Effective From',
    readOnly: true,
    type: 'date',
    width: 16,
    read: (c) => c.current?.effective_from ?? '',
  },
  {
    key: 'basic_salary',
    label: 'Basic Salary',
    type: 'number',
    width: 14,
    read: (c) => c.current?.basic_salary ?? 0,
    write: (v, set) => {
      const n = num(v);
      if (n === null) return;
      set.basic_salary = n;
    },
  },
  {
    key: 'hra',
    label: 'HRA',
    type: 'number',
    width: 12,
    read: (c) => c.current?.hra ?? 0,
    write: (v, set) => {
      const n = num(v);
      if (n === null) return;
      set.hra = n;
    },
  },
  {
    key: 'transportation',
    label: 'Transportation',
    type: 'number',
    width: 14,
    read: (c) => c.current?.transportation ?? 0,
    write: (v, set) => {
      const n = num(v);
      if (n === null) return;
      set.transportation = n;
    },
  },
  {
    key: 'other_allowances',
    label: 'Other Allowances',
    type: 'number',
    width: 14,
    read: (c) => c.current?.other_allowances ?? 0,
    write: (v, set) => {
      const n = num(v);
      if (n === null) return;
      set.other_allowances = n;
    },
  },
  {
    key: 'notes',
    label: 'Notes',
    type: 'string',
    width: 30,
    read: (c) => c.current?.notes ?? '',
    write: (v, set) => {
      const s = str(v);
      if (s === null) return;
      set.notes = s;
    },
  },
];

export function findCompensationFieldByLabel(label: string): CompensationBulkField | null {
  const norm = label.trim().toLowerCase();
  return COMPENSATION_BULK_FIELDS.find((f) => f.label.toLowerCase() === norm) ?? null;
}

export function getCompensationKeyField(): CompensationBulkField {
  const k = COMPENSATION_BULK_FIELDS.find((f) => f.isKey);
  if (!k) throw new Error('No isKey field defined in COMPENSATION_BULK_FIELDS');
  return k;
}
