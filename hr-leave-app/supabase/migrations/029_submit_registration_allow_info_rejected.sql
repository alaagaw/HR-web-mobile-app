-- =============================================================
-- 029 — Allow info_rejected as a source status for resubmission
--
-- The submit_my_registration RPC (last touched in migration 025) gates
-- the in-flight source statuses to:
--   pending_info | email_unverified | returned_for_revision
--
-- Migration 027 introduced info_rejected as the new "HR sent it back
-- for changes" status, replacing the terminal-reject flow. Employees
-- in info_rejected MUST be able to resubmit through this same RPC —
-- it's the only path back to pending_approval — but the status guard
-- still rejects them. That's why the form shows
-- "Cannot submit registration from status info_rejected".
--
-- This migration replaces the function with the same body but adds
-- info_rejected to the allowed set. No other behavior changes.
-- =============================================================

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
    email               = trim(lower(p_email)),
    full_name           = trim(p_full_name),
    phone               = trim(p_phone),
    nationality         = trim(p_nationality),
    registration_status = 'pending_approval',
    -- Clear the rejection note now that the employee has acted on it.
    -- HR's next rejection (if any) will set a fresh comment.
    registration_note   = NULL,
    updated_at          = now()
  WHERE id = v_caller_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_my_registration(TEXT, TEXT, TEXT, TEXT) TO authenticated;
