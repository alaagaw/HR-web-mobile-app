-- ============================================================
-- 054 – Employment status (richer than the is_active boolean)
--
--   profiles.employment_status ∈ active | inactive | retired |
--                                resigned | fired | on_hold
--
-- DESIGN: employment_status is the SINGLE SOURCE OF TRUTH;
-- is_active is now fully DERIVED (= status == 'active') by a
-- BEFORE INSERT/UPDATE trigger. Only 'active' permits sign-in —
-- every other status blocks login exactly like the old
-- is_active=false did (auth.ts blockIfInactive + mid-session
-- check are unchanged; they still read is_active). So this is
-- behaviour-preserving for auth while giving HR a descriptive
-- lifecycle. 'on_hold' surfaces in the UI as "Suspended (Salary
-- Hold)" — access blocked & payroll instructed to withhold,
-- reversible (HR sets back to Active). Retired/Resigned/Fired
-- are the terminal variants (also access-blocked).
--
-- Backfill maps current state 1:1 (is_active → active/inactive)
-- so no employee's access changes on apply.
--
-- IMPORTANT: list_employees_secure (migration 050/053) projects
-- profiles columns explicitly, so adding a column breaks it —
-- this migration re-syncs it in the same file (the lesson from
-- 052→053).
--
-- Idempotent. Apply via `supabase db query --linked --file`.
-- ============================================================

-- 1. Column + allowed values --------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_employment_status_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_employment_status_chk
  CHECK (employment_status IN
    ('active','inactive','retired','resigned','fired','on_hold'));

-- 2. Backfill from the existing is_active flag (1:1, no access
--    change). Only touch rows still on the default so re-runs
--    don't clobber HR-set statuses.
UPDATE public.profiles
   SET employment_status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
 WHERE employment_status = 'active'
   AND is_active = false;

-- 3. is_active is now derived from employment_status. -------
CREATE OR REPLACE FUNCTION public.tg_profiles_derive_is_active()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_active := (NEW.employment_status = 'active');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_derive_is_active ON public.profiles;
CREATE TRIGGER trg_profiles_derive_is_active
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_derive_is_active();

-- One-time: make existing rows consistent with the new rule.
UPDATE public.profiles
   SET is_active = (employment_status = 'active')
 WHERE is_active IS DISTINCT FROM (employment_status = 'active');

-- 4. Re-sync list_employees_secure projection (append the new
--    column; not PII → not redacted).
CREATE OR REPLACE FUNCTION public.list_employees_secure(
  p_search       text       DEFAULT NULL,
  p_role         text       DEFAULT NULL,
  p_department   text       DEFAULT NULL,
  p_is_active    boolean    DEFAULT NULL,
  p_reg_statuses text[]     DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_priv boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_priv := EXISTS (SELECT 1 FROM profiles
                     WHERE id = v_uid AND role IN ('hr','hr_director'));

  RETURN QUERY
  SELECT
    p.id, p.full_name, p.email,
    CASE WHEN v_priv OR p.id = v_uid THEN p.phone END,
    p.photo_url, p.role, p.supervisor_id, p.manager_id, p.department,
    p.workday_hours, p.is_active, p.created_at, p.updated_at,
    p.registration_status, p.must_change_password, p.invited_by,
    CASE WHEN v_priv OR p.id = v_uid THEN p.registration_note END,
    p.job_title,
    CASE WHEN v_priv OR p.id = v_uid THEN p.start_date END,
    CASE WHEN v_priv OR p.id = v_uid THEN p.nationality END,
    CASE WHEN v_priv OR p.id = v_uid THEN p.hr_original_values END,
    p.annual_leave_entitlement_days, p.warn_on_uncompleted_form,
    p.registration_submitted_at, p.form_request_sent_at, p.last_seen_at,
    CASE WHEN v_priv OR p.id = v_uid THEN p.national_address END,
    p.qualification,
    p.specialization,
    p.declaration_accepted_at,
    p.declaration_version,
    p.employment_status
  FROM profiles p
  WHERE (p_role         IS NULL OR p.role = p_role)
    AND (p_department   IS NULL OR p.department = p_department)
    AND (p_is_active    IS NULL OR p.is_active = p_is_active)
    AND (p_reg_statuses IS NULL OR p.registration_status = ANY(p_reg_statuses))
    AND (
      p_search IS NULL OR p_search = '' OR
      p.full_name  ILIKE '%'||p_search||'%' OR
      p.email      ILIKE '%'||p_search||'%' OR
      p.department ILIKE '%'||p_search||'%' OR
      p.role       ILIKE '%'||p_search||'%'
    )
  ORDER BY p.full_name ASC;
END;
$$;
