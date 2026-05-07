-- ============================================================
-- 017 – Employee registration completion flow
-- ============================================================
--
-- Adds the columns + sequence + RLS + storage bucket required to:
--
--   1. Force HR-invited employees through a registration form on first
--      login (status flow: not_invited → pending_info → pending_approval
--      → active). HR sees a diff of what the employee changed during
--      review.
--
--   2. Capture identity documents (nationality, primary ID type +
--      number + uploaded scan) that HR can't fill in for the employee.
--
--   3. Auto-generate employee codes via a Postgres SEQUENCE so two
--      simultaneous "Create Employee" clicks can never collide. HR can
--      still override (e.g. when importing existing employees with
--      legacy codes).
--
--   4. Lock down emp_code from employee self-update (HR-only field).
-- ============================================================


-- ============================================================
-- 1. New columns
-- ============================================================

-- Profile-level identity
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  -- JSONB snapshot of the values HR entered when creating the employee.
  -- Used by the HR review screen to highlight (in yellow) any field the
  -- employee changed during their registration form submission.
  ADD COLUMN IF NOT EXISTS hr_original_values JSONB;

-- Document-level fields
ALTER TABLE employee_documents
  -- The "primary ID" the employee chose to upload — Saudi national ID,
  -- iqama, or passport. We keep the existing iqama_*/passport_* columns
  -- as separate document tracking; this just flags which one (or which
  -- new national_id) is the employee's main identification.
  ADD COLUMN IF NOT EXISTS id_type TEXT
    CHECK (id_type IN ('national_id', 'iqama', 'passport')),

  -- Saudi national ID — no existing column, add it here. National IDs
  -- typically don't expire so no expiry date.
  ADD COLUMN IF NOT EXISTS national_id_number TEXT,

  -- Storage URL of the uploaded scan/photo of the primary ID document.
  ADD COLUMN IF NOT EXISTS id_document_url TEXT;


-- ============================================================
-- 2. Auto-generate employee codes via sequence
-- ============================================================
--
-- Race-free way to allocate the next emp_code. Postgres sequences are
-- atomic so two concurrent calls always get distinct values. The UNIQUE
-- constraint on employee_documents.emp_code (already in migration 003)
-- is the database-level backstop.
--
-- Start the sequence ABOVE the current MAX so existing employees keep
-- their codes (preserves continuity with payroll / government records).
--
-- DO block computes the start value from current data, then creates the
-- sequence with that start.

DO $$
DECLARE
  v_max_code INTEGER;
  v_start    INTEGER;
BEGIN
  -- Look at numeric emp_codes only (skip codes like "EMP-001" or
  -- imported strings that don't parse as integers).
  SELECT COALESCE(MAX(NULLIF(regexp_replace(emp_code, '[^0-9]', '', 'g'), '')::INTEGER), 70000)
    INTO v_max_code
    FROM employee_documents
   WHERE emp_code ~ '[0-9]';

  v_start := v_max_code + 1;

  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS emp_code_seq START WITH %s INCREMENT BY 1', v_start);
END $$;


-- Public function to fetch the next code. SECURITY DEFINER so it works
-- from RLS-restricted contexts (e.g. an Edge Function calling it via
-- service_role; or a future admin RPC).
CREATE OR REPLACE FUNCTION generate_next_emp_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  v_next := nextval('emp_code_seq');
  RETURN v_next::TEXT;
END;
$$;


-- ============================================================
-- 3. RLS — lock down emp_code from employee self-update
-- ============================================================
--
-- Migration 003 created `employee_update_own_documents` which lets the
-- employee UPDATE every column on their own row. We need to prevent
-- them from changing emp_code (HR-controlled field).
--
-- Same WITH CHECK pattern as migration 014 used for profiles.

DROP POLICY IF EXISTS "employee_update_own_documents" ON employee_documents;

CREATE POLICY "employee_update_own_documents_safe_fields"
  ON employee_documents
  FOR UPDATE
  USING (employee_id = auth.uid())
  WITH CHECK (
    employee_id = auth.uid()
    -- emp_code must remain unchanged on a self-update.
    AND emp_code = (SELECT emp_code FROM employee_documents WHERE employee_id = auth.uid())
    -- Verification fields are HR-only too.
    AND is_verified = (SELECT is_verified FROM employee_documents WHERE employee_id = auth.uid())
    AND verified_by IS NOT DISTINCT FROM (SELECT verified_by FROM employee_documents WHERE employee_id = auth.uid())
    AND verified_at IS NOT DISTINCT FROM (SELECT verified_at FROM employee_documents WHERE employee_id = auth.uid())
  );

-- The existing hr_full_access_documents policy from migration 003
-- still grants HR full UPDATE access including emp_code — no change.


-- ============================================================
-- 4. Storage bucket for uploaded ID documents
-- ============================================================
--
-- Private bucket — files are not publicly accessible. The app fetches
-- via signed URLs (Supabase Storage signedUrl API).
--
-- Convention for object keys: <employee_id>/<filename>
-- This makes the RLS policies clean (key starts with the user's UUID).

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-id-documents', 'employee-id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Employee can upload to their own folder.
CREATE POLICY "employee_upload_own_id_doc"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Employee can read their own.
CREATE POLICY "employee_read_own_id_doc"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'employee-id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Employee can delete their own (e.g. replace).
CREATE POLICY "employee_delete_own_id_doc"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'employee-id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- HR can read any.
CREATE POLICY "hr_read_any_id_doc"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'employee-id-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );


-- ============================================================
-- 5. Index on hr_original_values for efficient diff queries
-- ============================================================
-- (Optional — JSONB queries on a single profile are fast already, but
--  this helps if HR ever filters/searches by what was changed.)

CREATE INDEX IF NOT EXISTS idx_profiles_hr_original_values
  ON profiles USING gin (hr_original_values);
