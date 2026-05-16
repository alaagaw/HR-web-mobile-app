-- ============================================================
-- 044 – User activity tracking
--
-- Why this exists:
--   auth.users.last_sign_in_at only updates on an EXPLICIT credential
--   entry (password / OTP). It is NOT touched when the app silently
--   refreshes the session token in the background. Because this app
--   keeps users logged in with persistent sessions, last_sign_in_at
--   badly understates active use: someone who logged in once in
--   February but opens the app daily still shows February.
--
--   So we add our own heartbeat — profiles.last_seen_at — written
--   whenever the client has a live authenticated session (app open or
--   token refresh). That, combined with auth.users.last_sign_in_at
--   (still useful: NULL = never logged in at all), is what the HR
--   "User Activity" report reads.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_seen_at IS
  'Last time this user had a live authenticated session (app open or '
  'token refresh). Written by touch_last_seen(). Distinct from '
  'auth.users.last_sign_in_at, which only updates on explicit credential '
  'entry and so understates active use under persistent sessions.';

-- ── Heartbeat ───────────────────────────────────────────────
-- Any signed-in user may stamp ONLY their own row, ONLY this column,
-- ONLY to now(). SECURITY DEFINER so it sails past the profiles
-- self-update lockdown (migration 014) without widening that policy.
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.profiles
     SET last_seen_at = now()
   WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- ── HR-only activity report ─────────────────────────────────
-- SECURITY DEFINER so it can read auth.users (last_sign_in_at lives
-- there and is intentionally NOT exposed to the client) and
-- employee_documents (strict RLS, for emp_code). The caller-role
-- gate mirrors the chokepoint pattern in migration 042 — this never
-- goes to a non-HR caller even though EXECUTE is granted broadly.
CREATE OR REPLACE FUNCTION public.get_user_activity()
RETURNS TABLE (
  id                  UUID,
  full_name           TEXT,
  email               TEXT,
  emp_code            TEXT,
  role                TEXT,
  department          TEXT,
  is_active           BOOLEAN,
  registration_status TEXT,
  account_created_at  TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ,
  last_sign_in_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT p.role INTO v_caller_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('hr', 'hr_director') THEN
    RAISE EXCEPTION 'Only HR can view user activity';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    ed.emp_code,
    p.role,
    p.department,
    p.is_active,
    p.registration_status,
    p.created_at,
    p.last_seen_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN public.employee_documents ed ON ed.employee_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_activity() TO authenticated;
