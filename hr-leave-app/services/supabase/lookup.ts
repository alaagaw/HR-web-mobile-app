import { supabase } from './client';

/**
 * CRUD for the three reference tables seeded by migration 023:
 *   - lookup_departments     UPPERCASE
 *   - lookup_nationalities   TitleCase (first letter upper, rest lower)
 *   - lookup_designations    free-form (trim + collapse only)
 *
 * The database enforces the casing rules via CHECK constraints; the
 * `canonicalise*` helpers exported here apply the same normalisation
 * client-side so the form sends a value the DB will accept on the
 * first try (no round-trip to discover a constraint violation).
 *
 * Each lookup row has `name` as PRIMARY KEY — no surrogate id, so the
 * key string IS the value referenced by FK from profiles.{department,
 * nationality, job_title}. When adding a new entry, callers should
 * canonicalise first and then call `add*`.
 */

export interface LookupItem {
  name: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

// ── Canonicalisers (mirror the SQL CHECK rules) ─────────────────

export function canonicaliseDepartment(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function canonicaliseNationality(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (cleaned.length === 0) return cleaned;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function canonicaliseDesignation(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

// Specialization: free-form like designation — trim + collapse only.
// HR curates spelling / activates (new values land is_active=false).
export function canonicaliseSpecialization(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

// ── Read ────────────────────────────────────────────────────────

async function getActive(table: 'lookup_departments' | 'lookup_nationalities' | 'lookup_designations' | 'lookup_specializations'): Promise<LookupItem[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LookupItem[];
}

// ── Write ───────────────────────────────────────────────────────

async function addItem(
  table: 'lookup_departments' | 'lookup_nationalities' | 'lookup_designations' | 'lookup_specializations',
  name: string,
  createdBy: string | null,
): Promise<LookupItem> {
  // ON CONFLICT DO UPDATE so re-activating a previously-deactivated
  // value just flips is_active back to true rather than erroring.
  const { data, error } = await supabase
    .from(table)
    .upsert(
      { name, is_active: true, created_by: createdBy },
      { onConflict: 'name', ignoreDuplicates: false },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LookupItem;
}

export const lookupService = {
  getDepartments: () => getActive('lookup_departments'),
  getNationalities: () => getActive('lookup_nationalities'),
  getDesignations: () => getActive('lookup_designations'),
  getSpecializations: () => getActive('lookup_specializations'),

  addDepartment: (raw: string, createdBy: string | null) =>
    addItem('lookup_departments', canonicaliseDepartment(raw), createdBy),
  addNationality: (raw: string, createdBy: string | null) =>
    addItem('lookup_nationalities', canonicaliseNationality(raw), createdBy),
  addDesignation: (raw: string, createdBy: string | null) =>
    addItem('lookup_designations', canonicaliseDesignation(raw), createdBy),
  addSpecialization: (raw: string, createdBy: string | null) =>
    addItem('lookup_specializations', canonicaliseSpecialization(raw), createdBy),

  // HR endorses an employee-typed specialization (set is_active=true
  // so it joins the shared autocomplete). Migration 056; HR-only RLS.
  async activateSpecialization(name: string): Promise<void> {
    const { error } = await supabase.rpc('hr_activate_specialization', {
      p_name: canonicaliseSpecialization(name),
    });
    if (error) throw new Error(error.message);
  },
};
