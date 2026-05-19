import { supabase } from './client';
import type { DocumentService } from '../types';
import type { EmployeeDocument } from '@/types/models';

// ── Bulk-import merge policy ──────────────────────────────────────
// Single source of truth for the document fields the Excel/CSV import
// may write. Add a column here and the lookup, merge and payload all
// pick it up automatically (open/closed — no other edits needed).
const DOC_FIELDS = [
  'passport_number',
  'passport_expiry',
  'iqama_number',
  'iqama_expiry',
  'insurance_number',
  'insurance_expiry',
  'occupation',
  'birth_date',
] as const;

type DocField = (typeof DOC_FIELDS)[number];

// A cell is "provided" only if it carries a real value. Blank /
// whitespace / null means "leave the stored value untouched" — never
// "erase it". Clearing a field is an explicit per-row action
// (updateDocument), never a side effect of an empty spreadsheet cell.
// This makes re-uploading a stale or partial export non-destructive.
function isProvided(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

// Pure, side-effect-free merge: stored row + one incoming file row →
// the final value set and whether anything actually changed. Provided
// cells overwrite; blank cells fall back to the stored value. The
// `changed` flag lets the caller skip no-op writes (fewer rows on the
// wire, no trigger churn, honest updated_at).
function mergeDocFields(
  existing: Record<string, any>,
  incoming: Record<string, any>
): { merged: Record<DocField, any>; changed: boolean } {
  const merged = {} as Record<DocField, any>;
  let changed = false;
  for (const f of DOC_FIELDS) {
    const current = existing[f] ?? null;
    const next = isProvided(incoming[f]) ? String(incoming[f]).trim() : current;
    merged[f] = next;
    if (next !== current) changed = true;
  }
  return { merged, changed };
}

export const documentService: DocumentService = {
  // ── Employee self-service ────────────────────────────────────

  async getMyDocument(employeeId) {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as EmployeeDocument | null;
  },

  async upsertMyDocument(employeeId, draft) {
    // Check if a row already exists
    const existing = await this.getMyDocument(employeeId);

    if (existing) {
      const { data, error } = await supabase
        .from('employee_documents')
        .update({
          ...draft,
          is_verified: false, // reset verification on employee edit
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as EmployeeDocument;
    }

    // Insert new row — emp_code will need to be assigned by HR,
    // so we generate a placeholder that HR can overwrite
    const { data, error } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId,
        emp_code: `EMP-${Date.now()}`,
        ...draft,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as EmployeeDocument;
  },

  // ── HR admin ─────────────────────────────────────────────────

  async getDocumentByEmployee(employeeId) {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*, employee:profiles!employee_id(id, full_name, role, department)')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as EmployeeDocument | null;
  },

  async getAllDocuments() {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*, employee:profiles!employee_id(id, full_name, role, department)')
      .order('emp_code', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as EmployeeDocument[];
  },

  async getExpiringDocuments(withinDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from('employee_documents')
      .select('*, employee:profiles!employee_id(id, full_name, role, department)')
      .or(
        `passport_expiry.lte.${cutoffStr},iqama_expiry.lte.${cutoffStr},insurance_expiry.lte.${cutoffStr}`
      )
      .order('iqama_expiry', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as EmployeeDocument[];
  },

  async verifyDocument(documentId, verifiedBy) {
    const { data, error } = await supabase
      .from('employee_documents')
      .update({
        is_verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as EmployeeDocument;
  },

  async updateDocument(documentId, updates) {
    const { id, employee_id, created_at, employee, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('employee_documents')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as EmployeeDocument;
  },

  async bulkUpsert(rows) {
    const errors: string[] = [];

    // 1. Normalize + dedupe by emp_code (last row wins). Dedupe is required:
    //    Postgres rejects an ON CONFLICT upsert that targets the same
    //    conflict key twice in one statement.
    const byCode = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const code = String(row.emp_code ?? '').trim();
      if (!code) {
        errors.push('Row missing emp_code — skipped');
        continue;
      }
      byCode.set(code, row);
    }
    if (byCode.size === 0) return { success: 0, errors };

    // 2. Resolve emp_code → the stored row (employee_id + current doc
    //    values) in chunked .in() reads — fixed round-trips, no N+1.
    //    employee_documents is the ONLY place emp_code exists (not on
    //    profiles), so an unmatched code cannot be mapped to a profile
    //    and is skipped — that row is created at employee onboarding,
    //    not here. employee_id is NOT NULL with no default: Postgres
    //    validates it on the candidate insert tuple *before* resolving
    //    the emp_code conflict, so it must be supplied even for updates.
    //    We also pull the current doc fields so blank cells can fall
    //    back to the stored value instead of nulling it.
    const codes = [...byCode.keys()];
    const existingByCode = new Map<string, Record<string, any>>();
    const SELECT_COLS = `emp_code, employee_id, ${DOC_FIELDS.join(', ')}`;
    const LOOKUP_CHUNK = 200; // keep the .in() filter out of URL-length limits
    for (let i = 0; i < codes.length; i += LOOKUP_CHUNK) {
      const slice = codes.slice(i, i + LOOKUP_CHUNK);
      const { data, error } = await supabase
        .from('employee_documents')
        .select(SELECT_COLS)
        .in('emp_code', slice);
      if (error) {
        errors.push(`Lookup failed: ${error.message}`);
        return { success: 0, errors };
      }
      for (const r of (data ?? []) as Record<string, any>[]) {
        existingByCode.set(r.emp_code, r);
      }
    }

    // 3. Merge each resolved row. Provided cells overwrite, blank cells
    //    keep the stored value; no-op rows are skipped entirely so they
    //    never hit the wire or bump updated_at.
    const payload: Array<Record<string, any>> = [];
    let unchanged = 0;
    const updatedAt = new Date().toISOString();
    for (const [code, row] of byCode) {
      const existing = existingByCode.get(code);
      if (!existing) {
        errors.push(`emp_code "${code}" has no employee record — skipped`);
        continue;
      }
      const { merged, changed } = mergeDocFields(existing, row);
      if (!changed) {
        unchanged++; // already in sync with the file — nothing to write
        continue;
      }
      payload.push({
        employee_id: existing.employee_id,
        emp_code: code,
        ...merged,
        updated_at: updatedAt,
      });
    }
    if (payload.length === 0) return { success: unchanged, errors };

    // 4. Single atomic batch upsert. Every row carries employee_id (NOT
    //    NULL satisfied) and a complete, intentional value set, so
    //    onConflict(emp_code) updates exactly what changed.
    const { data, error } = await supabase
      .from('employee_documents')
      .upsert(payload as any, { onConflict: 'emp_code', ignoreDuplicates: false })
      .select('emp_code');

    if (error) {
      errors.push(error.message);
      return { success: 0, errors };
    }

    // Unchanged rows are reconciled too — report them as successful so a
    // re-uploaded clean file reads "238", not "0".
    return { success: (data?.length ?? 0) + unchanged, errors };
  },
};
