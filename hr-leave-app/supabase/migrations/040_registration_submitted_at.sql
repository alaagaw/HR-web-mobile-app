-- =============================================================
-- 040 — Track the real registration-form submission time
--
-- The HR Pending Registrations list (dashboard ACTION REQUIRED,
-- the admin Registrations grid, and the Review dialog) showed a
-- "Submitted <date>" label sourced from profiles.created_at. That
-- column is set when the profile row is first created — i.e. when
-- HR creates/invites the employee (or auth signup for a self-
-- registered user) — NOT when the employee actually submitted the
-- registration form. It also never moves on a resubmission after
-- HR sends the registration back (info_rejected).
--
-- This migration:
--   1. Adds profiles.registration_submitted_at.
--   2. Replaces submit_my_registration (last touched in 029) with
--      the SAME body, additionally stamping registration_submitted_at
--      = now() on every submit AND resubmit.
--   3. Backfills currently-pending rows from the best available
--      proxy: employee_documents.updated_at (set by
--      submitRegistration on every form submit), falling back to
--      profiles.created_at when no document row exists.
--
-- Backfill caveat: employee_documents.updated_at can also move when
-- HR edits a pending profile's documents, so backfilled values are
-- best-effort for historical rows. Going forward the RPC stamps the
-- exact submit time, which is authoritative.
-- =============================================================

-- 1. New column ------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS registration_submitted_at timestamptz;

-- 2. RPC: stamp registration_submitted_at on submit/resubmit ----
CREATE OR REPLACE FUNCTION submit_my_registration(
  p_email       TEXT,
  p_full_name   TEXT,
  p_phone       TEXT,
  p_nationality TEXT
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
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_current
    FROM profiles
   WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- info_rejected added (migration 027). returned_for_revision kept
  -- for back-compat with an earlier design that never shipped — left
  -- in the set in case any historical row uses it.
  IF v_current.registration_status NOT IN (
    'pending_info',
    'email_unverified',
    'info_rejected',
    'returned_for_revision'
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

  UPDATE profiles SET
    email                     = trim(lower(p_email)),
    full_name                 = trim(p_full_name),
    phone                     = trim(p_phone),
    nationality               = trim(p_nationality),
    registration_status       = 'pending_approval',
    -- Clear the rejection note now that the employee has acted on it.
    -- HR's next rejection (if any) will set a fresh comment.
    registration_note         = NULL,
    -- Authoritative form submission time (also bumped on resubmit).
    registration_submitted_at = now(),
    updated_at                = now()
  WHERE id = v_caller_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_my_registration(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 3. Backfill currently-pending rows ---------------------------
-- 3a. Rows that have a document row → use its updated_at (set by
--     submitRegistration on every form submit).
UPDATE profiles p
   SET registration_submitted_at = ed.updated_at
  FROM employee_documents ed
 WHERE ed.employee_id = p.id
   AND p.registration_submitted_at IS NULL
   AND p.registration_status IN ('pending_approval', 'pending_info');

-- 3b. Any remaining pending rows with no document row → fall back
--     to created_at (no better signal exists for these).
UPDATE profiles p
   SET registration_submitted_at = p.created_at
 WHERE p.registration_submitted_at IS NULL
   AND p.registration_status IN ('pending_approval', 'pending_info');
