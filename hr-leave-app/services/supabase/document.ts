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

    // Validate and prepare rows
    const validRows = rows.filter((row) => {
      if (!row.emp_code) {
        errors.push('Row missing emp_code — skipped');
        return false;
      }
      return true;
    });

    if (!validRows.length) {
      return { success: 0, errors };
    }

    const payload = validRows.map((row) => ({
      emp_code: row.emp_code,
      passport_number: row.passport_number || null,
      passport_expiry: row.passport_expiry || null,
      iqama_number: row.iqama_number || null,
      iqama_expiry: row.iqama_expiry || null,
      insurance_number: row.insurance_number || null,
      insurance_expiry: row.insurance_expiry || null,
      occupation: row.occupation || null,
      birth_date: row.birth_date || null,
      updated_at: new Date().toISOString(),
    }));

    // Single batch upsert — matches on emp_code (UNIQUE), updates on conflict
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
