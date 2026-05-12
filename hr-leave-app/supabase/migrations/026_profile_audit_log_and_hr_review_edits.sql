-- =============================================================
-- 026 — profile audit log + HR review-edit RPC + storage RLS
--
-- Why:
--   HR needs to fix typos and fill missing fields on pending
--   registrations BEFORE approving them (e.g. Alaa's row was
--   submitted by an older form revision that didn't capture
--   id_type/national_id_number/id_document_url, so the data is
--   simply NULL in the DB). The Review Registration dialog
--   currently renders all employee-supplied fields as disabled.
--
-- What this migration adds:
--   1. profile_audit_log — a first audit table; per-field rows
--      capturing old → new value, who changed it, and a context
--      string (e.g. 'registration_review'). Profile owner can
--      read their own; HR can read all.
--   2. hr_update_pending_profile RPC — SECURITY DEFINER, HR-only,
--      single-call transactional update across profiles +
--      employee_documents with one audit row per changed field.
--      NULL parameter means "no change" so callers can pass only
--      the fields they want to update.
--   3. Storage RLS — HR-role can INSERT/UPDATE/DELETE objects in
--      the employee-id-documents bucket for any employee folder
--      (migration 017's policy only allowed the row owner).
--
-- What this migration does NOT touch:
--   - Email changes. Those go through the existing edge function
--     `update-employee-email` (which calls auth.admin.updateUserById
--     and relies on the migration 015 trigger to mirror to
--     profiles). Keep that flow; this RPC only writes profile +
--     document columns.
--   - approveRegistration. The dialog will continue to call the
--     existing approve flow AFTER hr_update_pending_profile.
--
-- Re-runnable: every CREATE is IF NOT EXISTS / CREATE OR REPLACE
-- and policies are dropped before re-create.
-- =============================================================


-- 1. Audit log ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS profile_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_name  TEXT NOT NULL CHECK (table_name IN ('profiles', 'employee_documents')),
  field_name  TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  UUID NOT NULL REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  context     TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_audit_log_profile
  ON profile_audit_log (profile_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_audit_log_changed_by
  ON profile_audit_log (changed_by, changed_at DESC);

ALTER TABLE profile_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_audit_log_hr_read   ON profile_audit_log;
DROP POLICY IF EXISTS profile_audit_log_self_read ON profile_audit_log;

CREATE POLICY profile_audit_log_hr_read
  ON profile_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );

CREATE POLICY profile_audit_log_self_read
  ON profile_audit_log
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- No INSERT policy: writes happen only through SECURITY DEFINER functions.


-- 2. HR review-edit RPC ------------------------------------------------

CREATE OR REPLACE FUNCTION hr_update_pending_profile(
  p_user_id              UUID,
  p_full_name            TEXT DEFAULT NULL,
  p_phone                TEXT DEFAULT NULL,
  p_nationality          TEXT DEFAULT NULL,
  p_id_type              TEXT DEFAULT NULL,
  p_national_id_number   TEXT DEFAULT NULL,
  p_iqama_number         TEXT DEFAULT NULL,
  p_iqama_expiry         DATE DEFAULT NULL,
  p_passport_number      TEXT DEFAULT NULL,
  p_passport_expiry      DATE DEFAULT NULL,
  p_id_document_url      TEXT DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  TEXT;
  v_old_profile  profiles%ROWTYPE;
  v_new_profile  profiles%ROWTYPE;
  v_old_doc      employee_documents%ROWTYPE;
BEGIN
  -- AuthZ
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('hr', 'hr_director') THEN
    RAISE EXCEPTION 'Only HR can update employee profile fields';
  END IF;

  SELECT * INTO v_old_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_user_id;
  END IF;

  SELECT * INTO v_old_doc FROM employee_documents WHERE employee_id = p_user_id;

  -- ── profiles fields ──────────────────────────────────────────────
  IF p_full_name IS NOT NULL AND p_full_name IS DISTINCT FROM v_old_profile.full_name THEN
    UPDATE profiles SET full_name = p_full_name, updated_at = now() WHERE id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'profiles', 'full_name', v_old_profile.full_name, p_full_name, auth.uid(), 'registration_review');
  END IF;

  IF p_phone IS NOT NULL AND p_phone IS DISTINCT FROM v_old_profile.phone THEN
    UPDATE profiles SET phone = p_phone, updated_at = now() WHERE id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'profiles', 'phone', v_old_profile.phone, p_phone, auth.uid(), 'registration_review');
  END IF;

  IF p_nationality IS NOT NULL AND p_nationality IS DISTINCT FROM v_old_profile.nationality THEN
    UPDATE profiles SET nationality = p_nationality, updated_at = now() WHERE id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'profiles', 'nationality', v_old_profile.nationality, p_nationality, auth.uid(), 'registration_review');
  END IF;

  -- ── employee_documents fields ───────────────────────────────────
  -- Stale rows may not have a documents row yet — create a placeholder
  -- so the UPDATEs below have something to write to. emp_code stays a
  -- PENDING-* placeholder until HR sets it during approveRegistration.
  IF v_old_doc.employee_id IS NULL THEN
    INSERT INTO employee_documents (employee_id, emp_code, created_at, updated_at)
    VALUES (p_user_id, 'PENDING-' || EXTRACT(EPOCH FROM now())::BIGINT::TEXT, now(), now());
    SELECT * INTO v_old_doc FROM employee_documents WHERE employee_id = p_user_id;
  END IF;

  IF p_id_type IS NOT NULL AND p_id_type IS DISTINCT FROM v_old_doc.id_type THEN
    UPDATE employee_documents SET id_type = p_id_type, updated_at = now() WHERE employee_id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'employee_documents', 'id_type', v_old_doc.id_type, p_id_type, auth.uid(), 'registration_review');
  END IF;

  IF p_national_id_number IS NOT NULL AND p_national_id_number IS DISTINCT FROM v_old_doc.national_id_number THEN
    UPDATE employee_documents SET national_id_number = p_national_id_number, updated_at = now() WHERE employee_id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'employee_documents', 'national_id_number', v_old_doc.national_id_number, p_national_id_number, auth.uid(), 'registration_review');
  END IF;

  IF p_iqama_number IS NOT NULL AND p_iqama_number IS DISTINCT FROM v_old_doc.iqama_number THEN
    UPDATE employee_documents SET iqama_number = p_iqama_number, updated_at = now() WHERE employee_id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'employee_documents', 'iqama_number', v_old_doc.iqama_number, p_iqama_number, auth.uid(), 'registration_review');
  END IF;

  IF p_iqama_expiry IS NOT NULL AND p_iqama_expiry IS DISTINCT FROM v_old_doc.iqama_expiry THEN
    UPDATE employee_documents SET iqama_expiry = p_iqama_expiry, updated_at = now() WHERE employee_id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'employee_documents', 'iqama_expiry', v_old_doc.iqama_expiry::TEXT, p_iqama_expiry::TEXT, auth.uid(), 'registration_review');
  END IF;

  IF p_passport_number IS NOT NULL AND p_passport_number IS DISTINCT FROM v_old_doc.passport_number THEN
    UPDATE employee_documents SET passport_number = p_passport_number, updated_at = now() WHERE employee_id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'employee_documents', 'passport_number', v_old_doc.passport_number, p_passport_number, auth.uid(), 'registration_review');
  END IF;

  IF p_passport_expiry IS NOT NULL AND p_passport_expiry IS DISTINCT FROM v_old_doc.passport_expiry THEN
    UPDATE employee_documents SET passport_expiry = p_passport_expiry, updated_at = now() WHERE employee_id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'employee_documents', 'passport_expiry', v_old_doc.passport_expiry::TEXT, p_passport_expiry::TEXT, auth.uid(), 'registration_review');
  END IF;

  IF p_id_document_url IS NOT NULL AND p_id_document_url IS DISTINCT FROM v_old_doc.id_document_url THEN
    UPDATE employee_documents SET id_document_url = p_id_document_url, updated_at = now() WHERE employee_id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'employee_documents', 'id_document_url', v_old_doc.id_document_url, p_id_document_url, auth.uid(), 'registration_review');
  END IF;

  SELECT * INTO v_new_profile FROM profiles WHERE id = p_user_id;
  RETURN v_new_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION hr_update_pending_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, DATE, TEXT
) TO authenticated;


-- 3. Storage RLS — HR can write to any employee folder ------------------

DROP POLICY IF EXISTS "hr_upload_any_id_doc" ON storage.objects;
DROP POLICY IF EXISTS "hr_update_any_id_doc" ON storage.objects;
DROP POLICY IF EXISTS "hr_delete_any_id_doc" ON storage.objects;

CREATE POLICY "hr_upload_any_id_doc"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-id-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );

CREATE POLICY "hr_update_any_id_doc"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'employee-id-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );

CREATE POLICY "hr_delete_any_id_doc"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'employee-id-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );


COMMENT ON TABLE profile_audit_log IS
  'Per-field audit trail for HR-driven changes on profiles + employee_documents. Currently written by hr_update_pending_profile only; intended to grow as the canonical audit log for profile-related tables.';

COMMENT ON FUNCTION hr_update_pending_profile IS
  'HR-only RPC for the Review Registration dialog. Pass each field you want to update; NULL means "no change". All changes are logged into profile_audit_log with context=registration_review. Email is NOT handled here — use the update-employee-email edge function.';
