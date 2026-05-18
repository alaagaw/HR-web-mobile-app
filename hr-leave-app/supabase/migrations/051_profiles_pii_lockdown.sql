-- ============================================================
-- 051 – Gap #1, step 2/2: lock the sensitive PII columns on
--       profiles so a raw `select=*` by any authenticated user
--       can no longer read everyone's personal data.
--
-- ⚠️ DO NOT APPLY until the step-1 rerouted code (commits
--    3484651 + the updateProfile fix) is DEPLOYED and
--    LIVE-VERIFIED. Applying this before the new code is live
--    WILL break login (auth.fetchProfile), profile edit,
--    Manage Employees, registrations, and bulk import.
--
-- Mechanism: a table-wide GRANT lets a role read every column,
-- so column-level REVOKE alone is a no-op. The correct pattern
-- is REVOKE the table-wide SELECT, then GRANT SELECT on only
-- the safe columns. RLS (profiles_select USING(true)) still
-- decides WHICH ROWS; this decides WHICH COLUMNS. The 5
-- sensitive columns become reachable ONLY through the
-- SECURITY DEFINER accessors from migration 050
-- (get_profile_secure / list_employees_secure), which run as
-- the function owner and therefore bypass this grant for
-- authorised callers (self / HR).
--
-- service_role is untouched (edge functions keep full access).
-- anon is intentionally out of scope (RLS already needs
-- auth.uid(); changing anon risks pre-auth flows).
--
-- Sensitive (NOT granted): phone, nationality, start_date,
--                          registration_note, hr_original_values
--
-- Reversible:
--   GRANT SELECT ON public.profiles TO authenticated;
-- ============================================================

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, full_name, email, photo_url, role,
  supervisor_id, manager_id, department,
  workday_hours, is_active, created_at, updated_at,
  registration_status, must_change_password, invited_by,
  job_title, annual_leave_entitlement_days,
  warn_on_uncompleted_form, registration_submitted_at,
  form_request_sent_at, last_seen_at
) ON public.profiles TO authenticated;

-- ── VERIFICATION (run after applying) ────────────────────────
-- 1. authenticated must NOT have column privilege on the 5:
--    SELECT column_name FROM information_schema.column_privileges
--     WHERE table_name='profiles' AND grantee='authenticated'
--       AND column_name IN ('phone','nationality','start_date',
--           'registration_note','hr_original_values');
--    -> expect ZERO rows
-- 2. Impersonated non-HR raw read is now blocked:
--    BEGIN;
--    SELECT set_config('request.jwt.claims',
--      '{"sub":"<non-hr-uuid>","role":"authenticated"}', true);
--    SET LOCAL ROLE authenticated;
--    SELECT phone FROM profiles LIMIT 1;   -- expect: permission denied
--    SELECT id,full_name,role FROM profiles LIMIT 1;  -- still works
--    SELECT phone FROM get_profile_secure('<their own uuid>'); -- works (self)
--    ROLLBACK;
