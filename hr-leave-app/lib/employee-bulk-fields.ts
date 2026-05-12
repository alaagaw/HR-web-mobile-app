/**
 * Single source of truth for the HR bulk export/upload (Balances page).
 *
 * Adding a new column to bulk-edit is one entry in this array + the
 * matching column on `profiles` (or wherever the field lives). Export
 * AND import both iterate this list, so HR doesn't need a code change
 * beyond a one-liner here when the schema grows.
 *
 * The `read` and `write` hooks let a column source/sink from a joined
 * table (e.g. emp_code lives in employee_documents, balance lives in
 * leave_balances) without leaking those table names into the import
 * code. Each hook gets a `ctx` with the data the bulk operation
 * already loaded.
 */
import type { Profile } from '@/types/models';

export interface EmployeeBulkContext {
  /** Profile row from `profiles`. */
  profile: Profile;
  /** emp_code resolved from v_emp_codes (always present for active employees). */
  emp_code: string | null;
  /** Current-year PTO balance in hours (joined from leave_balances). */
  pto_balance_hours: number | null;
  /** Current-year PTO used in hours. */
  pto_used_hours: number | null;
}

/**
 * What to write back on import for a single employee. The bulk-upsert
 * code translates this into the right table.write() calls.
 */
export interface EmployeeBulkWriteSet {
  profile?: Record<string, unknown>;
  /** Direct balance override — interpreted as "set balance_hours to X for current year". */
  pto_balance_hours?: number;
}

export interface EmployeeBulkField {
  /** Stable key. Used in error messages; not shown to HR. */
  key: string;
  /** Excel header. Shown to HR. */
  label: string;
  /** Whether this column is a match key. Exactly one field should have isKey=true. */
  isKey?: boolean;
  /** When true, import ignores this column on upload (export only). */
  readOnly?: boolean;
  /** Cell-type hint for export + import normalisation. */
  type: 'string' | 'number' | 'date';
  /** Optional column-width hint for export. */
  width?: number;
  /** Read value from the loaded ctx for export. */
  read: (ctx: EmployeeBulkContext) => string | number | null;
  /** Translate a parsed Excel cell value into an entry in EmployeeBulkWriteSet. */
  write?: (value: string | number | null, set: EmployeeBulkWriteSet) => void;
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

const dateStr = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  // ISO yyyy-mm-dd already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try Date parse for excel string formats
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/**
 * The canonical bulk-edit column set. Order in this array = column
 * order in the Excel sheet.
 */
export const EMPLOYEE_BULK_FIELDS: EmployeeBulkField[] = [
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
    key: 'email',
    label: 'Email',
    readOnly: true,
    type: 'string',
    width: 30,
    read: (c) => c.profile.email,
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
    key: 'start_date',
    label: 'DOJ',
    type: 'date',
    width: 12,
    read: (c) => c.profile.start_date ?? '',
    write: (v, set) => { set.profile ??= {}; set.profile.start_date = dateStr(v); },
  },
  {
    key: 'workday_hours',
    label: 'Workday Hours',
    type: 'number',
    width: 14,
    read: (c) => c.profile.workday_hours ?? 8,
    write: (v, set) => {
      const n = num(v);
      if (n === null) return;
      set.profile ??= {};
      set.profile.workday_hours = n;
    },
  },
  {
    key: 'annual_leave_entitlement_days',
    label: 'Entitled / YEAR',
    type: 'number',
    width: 14,
    read: (c) => c.profile.annual_leave_entitlement_days ?? null,
    write: (v, set) => {
      const n = num(v);
      if (n === null) return;
      set.profile ??= {};
      set.profile.annual_leave_entitlement_days = n;
    },
  },
  {
    key: 'pto_balance_hours',
    label: 'PTO Balance (hours)',
    type: 'number',
    width: 16,
    read: (c) => c.pto_balance_hours ?? 0,
    write: (v, set) => {
      const n = num(v);
      if (n === null) return;
      set.pto_balance_hours = n;
    },
  },
  {
    key: 'pto_used_hours',
    label: 'PTO Used (hours)',
    readOnly: true,
    type: 'number',
    width: 14,
    read: (c) => c.pto_used_hours ?? 0,
  },
];

export function findFieldByLabel(label: string): EmployeeBulkField | null {
  const norm = label.trim().toLowerCase();
  return EMPLOYEE_BULK_FIELDS.find((f) => f.label.toLowerCase() === norm) ?? null;
}

export function getKeyField(): EmployeeBulkField {
  const k = EMPLOYEE_BULK_FIELDS.find((f) => f.isKey);
  if (!k) throw new Error('No isKey field defined in EMPLOYEE_BULK_FIELDS');
  return k;
}
