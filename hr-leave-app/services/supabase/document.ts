import { supabase } from './client';
import type { DocumentService } from '../types';
import type { EmployeeDocument } from '@/types/models';

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

    // 2. Resolve emp_code → employee_id. employee_documents is the ONLY
    //    place emp_code exists (it is not on profiles), so an unmatched
    //    code cannot be assigned to a profile and must be skipped — the
    //    employee_documents row is created at employee creation, not here.
    //    employee_id is NOT NULL with no default: Postgres validates it on
    //    the candidate insert tuple *before* resolving the emp_code
    //    conflict, so it must be supplied even for pure updates.
    const codes = [...byCode.keys()];
    const empIdByCode = new Map<string, string>();
    const LOOKUP_CHUNK = 200; // keep the .in() filter out of URL-length limits
    for (let i = 0; i < codes.length; i += LOOKUP_CHUNK) {
      const slice = codes.slice(i, i + LOOKUP_CHUNK);
      const { data, error } = await supabase
        .from('employee_documents')
        .select('emp_code, employee_id')
        .in('emp_code', slice);
      if (error) {
        errors.push(`Lookup failed: ${error.message}`);
        return { success: 0, errors };
      }
      for (const r of data ?? []) empIdByCode.set(r.emp_code, r.employee_id);
    }

    // 3. Build the payload only for codes that resolved to an employee.
    const payload: Array<Record<string, any>> = [];
    const updatedAt = new Date().toISOString();
    for (const [code, row] of byCode) {
      const employeeId = empIdByCode.get(code);
      if (!employeeId) {
        errors.push(`emp_code "${code}" has no employee record — skipped`);
        continue;
      }
      payload.push({
        employee_id: employeeId,
        emp_code: code,
        passport_number: row.passport_number || null,
        passport_expiry: row.passport_expiry || null,
        iqama_number: row.iqama_number || null,
        iqama_expiry: row.iqama_expiry || null,
        insurance_number: row.insurance_number || null,
        insurance_expiry: row.insurance_expiry || null,
        occupation: row.occupation || null,
        birth_date: row.birth_date || null,
        updated_at: updatedAt,
      });
    }
    if (payload.length === 0) return { success: 0, errors };

    // 4. Single batch upsert — every row now carries employee_id, so the
    //    NOT NULL check passes and onConflict(emp_code) performs the update.
    const { data, error } = await supabase
      .from('employee_documents')
      .upsert(payload as any, { onConflict: 'emp_code', ignoreDuplicates: false })
      .select('emp_code');

    if (error) {
      errors.push(error.message);
      return { success: 0, errors };
    }

    return { success: data?.length ?? 0, errors };
  },
};
