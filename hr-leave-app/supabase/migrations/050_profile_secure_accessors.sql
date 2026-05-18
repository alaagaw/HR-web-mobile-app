-- ============================================================
-- 050 – Gap #1, step 1 (ADDITIVE / SAFE): SECURITY DEFINER
--       accessors that return profile rows with the sensitive
--       PII columns redacted unless the caller is the row owner
--       or HR / HR_Director.
--
-- Sensitive PII set (the real exposure — narrowed from the
-- earlier draft to genuine personal data; operational flags
-- like must_change_password are not disclosures):
--     phone, nationality, start_date,
--     registration_note, hr_original_values
--
-- This migration ONLY creates functions. It changes nothing on
-- its own. Step 2 reroutes the 8 select('*') call sites to
-- these RPCs (behaviour-preserving: self/HR get the full row,
-- exactly as today). Step 3 — a SEPARATE migration applied
-- ONLY after the rerouted code is verified live — does the
-- irreversible `REVOKE SELECT (sensitive cols) ... FROM
-- authenticated` that actually closes the hole.
--
-- Audit basis: no cross-user code path selects these columns;
-- they are read only self (auth.fetchProfile, registration
-- self-returns) or HR (registrations admin, employees admin,
-- bulk export). userService.getEmployees is dual-use (HR needs
-- full PII for Manage Employees; non-HR keepers need only safe
-- cols) → list_employees_secure redacts per-row accordingly.
-- userService.getProfile has zero callers (dead) but is
-- rerouted for completeness.
-- ============================================================

-- ── Single full profile: self or HR only ─────────────────────
CREATE OR REPLACE FUNCTION public.get_profile_secure(p_id uuid)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF v_uid = p_id
     OR EXISTS (SELECT 1 FROM profiles
                 WHERE id = v_uid AND role IN ('hr','hr_director')) THEN
    RETURN QUERY SELECT * FROM profiles WHERE id = p_id;
  END IF;
  -- otherwise: return nothing (no caller legitimately needs
  -- another user's FULL row; cross-user reads use narrow joins)
  RETURN;
END;
$$;

-- ── Filtered list with per-row PII redaction ─────────────────
-- Returns SETOF profiles. For each row, the 5 sensitive columns
-- are NULLed unless the caller is HR/HR_Director or it is the
-- caller's own row. Non-sensitive columns always pass through
-- (pickers/search/org-chart keep working untouched).
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
    p.registration_submitted_at, p.form_request_sent_at, p.last_seen_at
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

GRANT EXECUTE ON FUNCTION public.get_profile_secure(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_employees_secure(text,text,text,boolean,text[]) TO authenticated;
