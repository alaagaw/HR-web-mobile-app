/**
 * Compensation bulk export/upload — metadata-array driven.
 *
 * Export: dumps current pay for every active employee to xlsx.
 * Import: reads the file, matches rows by emp_code, and for each row
 * where any of basic/HRA/transport/other changed inserts ONE new
 * effective-dated row (employee_compensation insert) with the
 * caller-supplied effective_from. Unchanged rows are no-ops.
 *
 * PK on the target is (employee_id, effective_from). If HR tries to
 * upload twice with the same effective_from and the second upload
 * has different values, the second hits a PK violation per row.
 * That's reported in the result summary; HR picks a different date
 * or fixes the data.
 */
import { supabase } from '@/services/supabase/client';
import { compensationService } from '@/services';
import { userService } from '@/services';
import {
  COMPENSATION_BULK_FIELDS,
  findCompensationFieldByLabel,
  getCompensationKeyField,
  type CompensationBulkContext,
  type CompensationBulkWriteSet,
} from './compensation-bulk-fields';
import type { Profile } from '@/types/models';
import { todayDateOnly } from '@/lib/date-only';

export interface CompensationBulkRowResult {
  emp_code: string;
  name?: string;
  success: boolean;
  skipped?: boolean;
  changed: string[];
  error?: string;
}

export interface CompensationBulkImportSummary {
  total: number;
  inserted: number;
  skipped: number;
  failed: number;
  effective_from: string;
  results: CompensationBulkRowResult[];
}

/**
 * Build the (active employees, current compensation rows, emp_codes)
 * context list used by the exporter and as the "before" baseline
 * for the importer.
 */
async function loadBulkContexts(opts?: { is_active?: boolean }): Promise<CompensationBulkContext[]> {
  const [emps, comps] = await Promise.all([
    userService.getEmployees({ is_active: opts?.is_active ?? true }),
    compensationService.listCurrentForAll(),
  ]);
  const compByEmp = new Map<string, NonNullable<CompensationBulkContext['current']>>();
  for (const c of comps) compByEmp.set(c.employee_id, c);

  return emps.map((p) => ({
    profile: p as Profile,
    emp_code: p.emp_code ?? null,
    current: compByEmp.get(p.id) ?? null,
  }));
}

function buildExportRows(contexts: CompensationBulkContext[]): Record<string, unknown>[] {
  return contexts.map((ctx) => {
    const row: Record<string, unknown> = {};
    for (const f of COMPENSATION_BULK_FIELDS) {
      row[f.label] = f.read(ctx);
    }
    return row;
  });
}

/**
 * Trigger an xlsx download with one row per active employee + the
 * current effective compensation values.
 */
export async function exportCompensationXlsx(opts?: { is_active?: boolean }): Promise<{ count: number; filename: string }> {
  const ctxs = await loadBulkContexts(opts);
  const rows = buildExportRows(ctxs);
  if (rows.length === 0) throw new Error('No employees to export');

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = COMPENSATION_BULK_FIELDS.map((f) => ({ wch: f.width ?? Math.max(f.label.length + 2, 12) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Compensation');

  const filename = `compensation_${todayDateOnly()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { count: rows.length, filename };
}

/**
 * Parse an uploaded xlsx and INSERT a new effective-dated comp row
 * for every employee whose values differ from the current row.
 *
 * @param file               The xlsx file picked by HR.
 * @param effectiveFrom      ISO date (yyyy-mm-dd). Applies to every
 *                           inserted row in this batch.
 * @param performedBy        Current user id, written into the new
 *                           rows' created_by.
 */
export async function importCompensationXlsx(
  file: File,
  effectiveFrom: string,
  performedBy: string,
): Promise<CompensationBulkImportSummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    throw new Error('Effective From must be a yyyy-mm-dd date');
  }

  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Workbook has no sheets');

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: '' });
  if (raw.length === 0) {
    return { total: 0, inserted: 0, skipped: 0, failed: 0, effective_from: effectiveFrom, results: [] };
  }

  const headers = Object.keys(raw[0]);
  const headerMap = headers.map((h) => ({ excelHeader: h, field: findCompensationFieldByLabel(h) }));
  const keyField = getCompensationKeyField();
  if (!headerMap.some((h) => h.field?.isKey)) {
    throw new Error(`Excel is missing the "${keyField.label}" column. Aborting; nothing imported.`);
  }

  // Build emp_code → profile id map AND emp_code → current row for diff.
  const ctxs = await loadBulkContexts({ is_active: true });
  const ctxByCode = new Map<string, CompensationBulkContext>();
  for (const c of ctxs) {
    if (c.emp_code) ctxByCode.set(c.emp_code, c);
  }

  const results: CompensationBulkRowResult[] = [];

  for (const rawRow of raw) {
    const empCode = String(rawRow[keyField.label] ?? '').trim();
    if (!empCode) {
      results.push({ emp_code: '(blank)', success: false, changed: [], error: 'Missing emp_code in row' });
      continue;
    }
    const ctx = ctxByCode.get(empCode);
    if (!ctx) {
      results.push({ emp_code: empCode, success: false, changed: [], error: 'No active employee found with this emp_code' });
      continue;
    }

    // Translate cells → write set.
    const writes: CompensationBulkWriteSet = {};
    const changed: string[] = [];
    for (const { excelHeader, field } of headerMap) {
      if (!field || field.readOnly || !field.write) continue;
      field.write(rawRow[excelHeader] as any, writes);
      // Diff against current
      const before = (() => {
        switch (field.key) {
          case 'basic_salary':      return Number(ctx.current?.basic_salary ?? 0);
          case 'hra':               return Number(ctx.current?.hra ?? 0);
          case 'transportation':    return Number(ctx.current?.transportation ?? 0);
          case 'other_allowances':  return Number(ctx.current?.other_allowances ?? 0);
          case 'notes':             return ctx.current?.notes ?? '';
          default:                  return undefined;
        }
      })();
      const after = (writes as any)[field.key];
      if (after !== undefined && String(after) !== String(before ?? '')) {
        changed.push(field.label);
      }
    }

    // Determine final values — anything not in `writes` carries the
    // previous value forward (since employee_compensation rows are
    // full snapshots, not deltas).
    const final = {
      basic_salary:     writes.basic_salary     ?? Number(ctx.current?.basic_salary ?? 0),
      hra:              writes.hra              ?? Number(ctx.current?.hra ?? 0),
      transportation:   writes.transportation   ?? Number(ctx.current?.transportation ?? 0),
      other_allowances: writes.other_allowances ?? Number(ctx.current?.other_allowances ?? 0),
      notes:            writes.notes            ?? ctx.current?.notes ?? undefined,
    };

    // Skip if nothing changed.
    if (changed.length === 0) {
      results.push({
        emp_code: empCode,
        name: String(rawRow['Name'] ?? '') || undefined,
        success: true,
        skipped: true,
        changed: [],
      });
      continue;
    }

    try {
      await compensationService.addNewRow({
        employee_id: ctx.profile.id,
        effective_from: effectiveFrom,
        basic_salary: final.basic_salary,
        hra: final.hra,
        transportation: final.transportation,
        other_allowances: final.other_allowances,
        notes: final.notes,
        created_by: performedBy,
      });
      results.push({
        emp_code: empCode,
        name: String(rawRow['Name'] ?? '') || undefined,
        success: true,
        changed,
      });
    } catch (err: any) {
      // Common case: PK violation when (employee_id, effective_from)
      // already exists. Tell HR explicitly so they know to pick a
      // different date or open the dialog and edit by hand.
      const msg = err.message?.includes('duplicate key')
        ? `A row already exists with effective_from = ${effectiveFrom}. Pick a different date or edit by hand.`
        : (err.message || 'Insert failed');
      results.push({
        emp_code: empCode,
        name: String(rawRow['Name'] ?? '') || undefined,
        success: false,
        changed,
        error: msg,
      });
    }
  }

  return {
    total: results.length,
    inserted: results.filter((r) => r.success && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.success).length,
    effective_from: effectiveFrom,
    results,
  };
}
