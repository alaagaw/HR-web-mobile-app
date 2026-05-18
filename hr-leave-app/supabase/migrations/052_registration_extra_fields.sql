-- ============================================================
-- 052 – Registration extra fields (Phase B of the forms revamp)
--
--   profiles += national_address, qualification, specialization,
--               declaration_accepted_at, declaration_version
--   new lookup_specializations (mirrors lookup_designations)
--   supersede submit_my_registration  (employee submit path)
--   supersede hr_update_pending_profile (HR review-edit path)
--
-- Both RPCs are SECURITY DEFINER chokepoints from the migration-042
-- registration lifecycle. Their EXISTING bodies are preserved
-- verbatim; only the new-field handling is added. The declaration
-- is enforced **server-side** (the RPC raises if not accepted) so
-- R2e holds even if the client is bypassed.
--
-- Specialization is free-form & creatable: a typed value the
-- employee enters is auto-registered into lookup_specializations
-- with is_active = false ("pending HR review") INSIDE the definer
-- RPC, so there's no client lookup-write or FK-ordering problem.
-- HR curates spelling / activates via lookup management.
--
-- Idempotent. DEPLOY: apply via `supabase db query --linked
-- --file`, then SMOKE-TEST one real registration submit + one HR
-- review-edit before trusting (registration is prod-critical).
-- Rollback: re-apply the migration-040 / 026 function bodies.
-- ============================================================

-- 1. profiles columns -----------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS national_address        TEXT,
  ADD COLUMN IF NOT EXISTS qualification           TEXT,
  ADD COLUMN IF NOT EXISTS specialization          TEXT,
  ADD COLUMN IF NOT EXISTS declaration_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declaration_version     TEXT;

-- 2. lookup_specializations (mirrors lookup_designations) ------
CREATE TABLE IF NOT EXISTS public.lookup_specializations (
  name        TEXT PRIMARY KEY,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.lookup_specializations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lookup_specializations_select_all ON public.lookup_specializations;
CREATE POLICY lookup_specializations_select_all ON public.lookup_specializations
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS lookup_specializations_write_hr ON public.lookup_specializations;
CREATE POLICY lookup_specializations_write_hr ON public.lookup_specializations
  FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr','hr_director')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr','hr_director')));

-- FK from profiles.specialization. NULLs are unconstrained, so the
-- new (all-NULL) column needs no backfill. ON UPDATE CASCADE so an
-- HR spelling fix on the lookup propagates to the profile.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_specialization_fk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_specialization_fk
      FOREIGN KEY (specialization)
      REFERENCES public.lookup_specializations(name)
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. submit_my_registration — supersede (add the new fields) ---
-- Adding params changes the signature, so drop the old 4-arg
-- function first, then recreate. Only registration.ts calls it.
DROP FUNCTION IF EXISTS public.submit_my_registration(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_my_registration(
  p_email                TEXT,
  p_full_name            TEXT,
  p_phone                TEXT,
  p_nationality          TEXT,
  p_national_address     TEXT    DEFAULT NULL,
  p_qualification        TEXT    DEFAULT NULL,
  p_specialization       TEXT    DEFAULT NULL,
  p_declaration_accepted BOOLEAN DEFAULT FALSE,
  p_declaration_version  TEXT    DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  UUID := auth.uid();
  v_current    profiles;
  v_updated    profiles;
  v_spec       TEXT := NULLIF(trim(regexp_replace(coalesce(p_specialization,''), '\s+', ' ', 'g')), '');
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_current FROM profiles WHERE id = v_caller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_current.registration_status NOT IN (
    'pending_info', 'email_unverified', 'info_rejected', 'returned_for_revision'
  ) THEN
    RAISE EXCEPTION
      'Cannot submit registration from status "%"', v_current.registration_status;
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) < 5 OR position('@' IN p_email) = 0 THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF p_phone IS NULL OR length(trim(p_phone)) < 5 THEN
    RAISE EXCEPTION 'Phone is required';
  END IF;
  IF p_nationality IS NULL OR length(trim(p_nationality)) < 2 THEN
    RAISE EXCEPTION 'Nationality is required';
  END IF;
  -- R2e: declaration is mandatory, enforced server-side.
  IF p_declaration_accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'The declaration must be accepted before submitting';
  END IF;

  -- Auto-register a typed specialization (definer-privileged so no
  -- client write / FK-ordering issue). is_active=false flags it for
  -- HR spelling review; the FK is satisfied for the UPDATE below.
  IF v_spec IS NOT NULL THEN
    INSERT INTO lookup_specializations (name, is_active, created_by)
    VALUES (v_spec, false, v_caller_id)
    ON CONFLICT (name) DO NOTHING;
  END IF;

  UPDATE profiles SET
    email                     = trim(lower(p_email)),
    full_name                 = trim(p_full_name),
    phone                     = trim(p_phone),
    nationality               = trim(p_nationality),
    national_address          = NULLIF(trim(coalesce(p_national_address,'')), ''),
    qualification             = NULLIF(trim(coalesce(p_qualification,'')), ''),
    specialization            = v_spec,
    declaration_accepted_at   = now(),
    declaration_version       = COALESCE(p_declaration_version, declaration_version),
    registration_status       = 'pending_approval',
    registration_note         = NULL,
    registration_submitted_at = now(),
    updated_at                = now()
  WHERE id = v_caller_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_my_registration(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT
) TO authenticated;

-- 4. hr_update_pending_profile — supersede (add new profile     -
--    fields + audit rows + specialization auto-register).       -
DROP FUNCTION IF EXISTS public.hr_update_pending_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, DATE, TEXT
);

CREATE OR REPLACE FUNCTION public.hr_update_pending_profile(
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
  p_id_document_url      TEXT DEFAULT NULL,
  p_national_address     TEXT DEFAULT NULL,
  p_qualification        TEXT DEFAULT NULL,
  p_specialization       TEXT DEFAULT NULL
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
  v_spec         TEXT := NULLIF(trim(regexp_replace(coalesce(p_specialization,''), '\s+', ' ', 'g')), '');
BEGIN
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

  IF p_national_address IS NOT NULL AND p_national_address IS DISTINCT FROM v_old_profile.national_address THEN
    UPDATE profiles SET national_address = p_national_address, updated_at = now() WHERE id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'profiles', 'national_address', v_old_profile.national_address, p_national_address, auth.uid(), 'registration_review');
  END IF;

  IF p_qualification IS NOT NULL AND p_qualification IS DISTINCT FROM v_old_profile.qualification THEN
    UPDATE profiles SET qualification = p_qualification, updated_at = now() WHERE id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'profiles', 'qualification', v_old_profile.qualification, p_qualification, auth.uid(), 'registration_review');
  END IF;

  IF v_spec IS NOT NULL AND v_spec IS DISTINCT FROM v_old_profile.specialization THEN
    INSERT INTO lookup_specializations (name, is_active, created_by)
    VALUES (v_spec, false, auth.uid())
    ON CONFLICT (name) DO NOTHING;
    UPDATE profiles SET specialization = v_spec, updated_at = now() WHERE id = p_user_id;
    INSERT INTO profile_audit_log (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES (p_user_id, 'profiles', 'specialization', v_old_profile.specialization, v_spec, auth.uid(), 'registration_review');
  END IF;

  -- ── employee_documents fields ───────────────────────────────────
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

GRANT EXECUTE ON FUNCTION public.hr_update_pending_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, DATE, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
