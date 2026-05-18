-- ============================================================
-- 053 – Re-sync list_employees_secure() with the profiles
--       rowtype after migration 052 added 5 columns.
--
-- list_employees_secure RETURNS SETOF profiles via an EXPLICIT
-- column projection (migration 050). Adding columns to profiles
-- (052) makes that 26-col projection no longer match the now
-- 31-col rowtype → "structure of query does not match function
-- result type". This recreates it with the 5 new columns
-- appended in physical order. national_address is treated as
-- sensitive PII (redacted unless caller is HR or own row), like
-- phone/nationality; qualification/specialization/declaration_*
-- are not redacted (job-data / process metadata).
--
-- get_profile_secure is unaffected (it does SELECT * so it
-- adapts to the new rowtype automatically).
-- ============================================================

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
    -- ── migration 052 additions (physical column order) ──
    CASE WHEN v_priv OR p.id = v_uid THEN p.national_address END,
    p.qualification,
    p.specialization,
    p.declaration_accepted_at,
    p.declaration_version
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
