/**
 * HR bulk export/upload — metadata-array driven.
 *
 * Both directions iterate EMPLOYEE_BULK_FIELDS so adding a new column
 * is a single edit in [employee-bulk-fields.ts] plus the migration.
 *
 * The matching key is emp_code (the field flagged isKey:true). Rows
 * without an emp_code are reported as errors and not written.
 *
 * Imports are sequenced row-by-row so partial failures don't leave the
 * UI guessing — every row gets an explicit success / error in the
 * returned summary. Balance overrides go through balanceService so
 * the leave_ledger audit row is written too.
 */
import { supabase } from '@/services/supabase/client';
import {
  EMPLOYEE_BULK_FIELDS,
  type EmployeeBulkContext,
  type EmployeeBulkWriteSet,
  findFieldByLabel,
  getKeyField,
} from './employee-bulk-fields';
import type { Profile } from '@/types/models';

export interface BulkRowResult {
  emp_code: string;
  name?: string;
  success: boolean;
  changed: string[];
  error?: string;
}

export interface BulkImportSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkRowResult[];
}

/**
 * Fetch the data needed to render an export: profile + emp_code + this
 * year's PTO balance. Returns one EmployeeBulkContext per employee
 * matching the optional filter.
 */
export async function loadBulkContexts(opts?: {
  is_active?: boolean;
}): Promise<EmployeeBulkContext[]> {
  let q = supabase.from('profiles').select('*').order('full_name', { ascending: true });
  if (opts?.is_active !== undefined) q = q.eq('is_active', opts.is_active);

  const [{ data: profiles, error: profErr }, codesRes, balancesRes] = await Promise.all([
    q,
    supabase.from('v_emp_codes').select('employee_id, emp_code'),
    supabase
      .from('leave_balances')
      .select('employee_id, balance_hours, used_hours, year, leave_type')
      .eq('leave_type', 'pto')
      .eq('year', new Date().getFullYear()),
  ]);
  if (profErr) throw new Error(profErr.message);

  const codeByEmp = new Map<string, string>();
  for (const r of codesRes.data ?? []) codeByEmp.set((r as any).employee_id, (r as any).emp_code);

  const balByEmp = new Map<string, { balance_hours: number; used_hours: number }>();
  for (const r of balancesRes.data ?? []) {
    balByEmp.set((r as any).employee_id, {
      balance_hours: Number((r as any).balance_hours) || 0,
      used_hours: Number((r as any).used_hours) || 0,
    });
  }

  return (profiles ?? []).map((p: any) => ({
    profile: p as Profile,
    emp_code: codeByEmp.get(p.id) ?? null,
    pto_balance_hours: balByEmp.get(p.id)?.balance_hours ?? null,
    pto_used_hours: balByEmp.get(p.id)?.used_hours ?? null,
  }));
}

/**
 * Build the Excel sheet from the bulk fields metadata + loaded
 * contexts. Returns a json blob suitable for xlsx.utils.json_to_sheet.
 */
export function buildExportRows(contexts: EmployeeBulkContext[]): Record<string, unknown>[] {
  return contexts.map((ctx) => {
    const row: Record<string, unknown> = {};
    for (const f of EMPLOYEE_BULK_FIELDS) {
      row[f.label] = f.read(ctx);
    }
    return row;
  });
}

/**
 * Trigger an xlsx download. Imports xlsx lazily so the chunk only
 * loads when HR clicks Export.
 */
export async function exportEmployeesXlsx(opts?: { is_active?: boolean }): Promise<{ count: number; filename: string }> {
  const ctxs = await loadBulkContexts(opts);
  const rows = buildExportRows(ctxs);
  if (rows.length === 0) throw new Error('No employees to export');

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);

  // Width hints from the metadata array
  ws['!cols'] = EMPLOYEE_BULK_FIELDS.map((f) => ({ wch: f.width ?? Math.max(f.label.length + 2, 12) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  const today = new Date().toISOString().slice(0, 10);
  const filename = `employees_bulk_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { count: rows.length, filename };
}

/**
 * Parse + apply an uploaded xlsx. Returns a per-row summary so the UI
 * can show partial-success cleanly.
 *
 * @param performedBy  current user id, used for ledger rows when balance is overridden.
 */
export async function importEmployeesXlsx(
  file: File,
  performedBy: string,
): Promise<BulkImportSummary> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Workbook has no sheets');

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: '' });
  if (raw.length === 0) return { total: 0, succeeded: 0, failed: 0, results: [] };

  // Resolve Excel headers → bulk fields once
  const headers = Object.keys(raw[0]);
  const headerMap: Array<{ excelHeader: string; field: ReturnType<typeof findFieldByLabel> }> = headers.map(
    (h) => ({ excelHeader: h, field: findFieldByLabel(h) }),
  );
  const keyField = getKeyField();
  if (!headerMap.some((h) => h.field?.isKey)) {
    throw new Error(`Excel is missing the "${keyField.label}" column. Aborting; nothing imported.`);
  }

  // Resolve emp_code → profile id once
  const { data: codes } = await supabase.from('v_emp_codes').select('employee_id, emp_code');
  const idByCode = new Map<string, string>();
  for (const r of codes ?? []) idByCode.set(String((r as any).emp_code), (r as any).employee_id);

  const results: BulkRowResult[] = [];

  for (const rawRow of raw) {
    const empCode = String(rawRow[keyField.label] ?? '').trim();
    if (!empCode) {
      results.push({ emp_code: '(blank)', success: false, changed: [], error: 'Missing emp_code in row' });
      continue;
    }
    const profileId = idByCode.get(empCode);
    if (!profileId) {
      results.push({ emp_code: empCode, success: false, changed: [], error: 'No employee found with this emp_code' });
      continue;
    }

    // Build a WriteSet by letting each field's write() decide how to
    // map its cell value. Skip readOnly columns and columns with no
    // matching field (i.e. extra columns HR added that we don't know
    // about — we tolerate them).
    const writes: EmployeeBulkWriteSet = {};
    const changed: string[] = [];
    for (const { excelHeader, field } of headerMap) {
      if (!field || field.readOnly || !field.write) continue;
      const cell = rawRow[excelHeader];
      const before = JSON.stringify(writes);
      field.write(cell as any, writes);
      if (JSON.stringify(writes) !== before) changed.push(field.label);
    }

    try {
      // Persist profile changes (if any)
      if (writes.profile && Object.keys(writes.profile).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update({ ...writes.profile, updated_at: new Date().toISOString() })
          .eq('id', profileId);
        if (error) throw new Error(error.message);
      }

      // Persist balance override (if any). Compute delta vs current
      // and write via leave_ledger so HR's manual override has an
      // audit row alongside the in-place balance bump.
      if (typeof writes.pto_balance_hours === 'number') {
        const year = new Date().getFullYear();
        const { data: existing } = await supabase
          .from('leave_balances')
          .select('id, balance_hours, used_hours')
          .eq('employee_id', profileId)
          .eq('leave_type', 'pto')
          .eq('year', year)
          .maybeSingle();

        if (existing) {
          const current = Number(existing.balance_hours) || 0;
          const target = writes.pto_balance_hours;
          const delta = +(target - current).toFixed(2);
          if (delta !== 0) {
            const { error: updErr } = await supabase
              .from('leave_balances')
              .update({ balance_hours: target, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (updErr) throw new Error(updErr.message);

            await supabase.from('leave_ledger').insert({
              employee_id: profileId,
              leave_type: 'pto',
              change_hours: delta,
              reason: delta > 0 ? 'manual_adjustment' : 'manual_adjustment',
              performed_by: performedBy,
            });
          }
        } else {
          const target = writes.pto_balance_hours;
          await supabase.from('leave_balances').insert({
            employee_id: profileId,
            leave_type: 'pto',
            balance_hours: target,
            used_hours: 0,
            year,
            updated_at: new Date().toISOString(),
          });
          await supabase.from('leave_ledger').insert({
            employee_id: profileId,
            leave_type: 'pto',
            change_hours: target,
            reason: 'manual_adjustment',
            performed_by: performedBy,
          });
        }
      }

      results.push({
        emp_code: empCode,
        name: String(rawRow['Name'] ?? '') || undefined,
        success: true,
        changed,
      });
    } catch (err: any) {
      results.push({
        emp_code: empCode,
        name: String(rawRow['Name'] ?? '') || undefined,
        success: false,
        changed,
        error: err.message || 'Unknown error',
      });
    }
  }

  return {
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}
