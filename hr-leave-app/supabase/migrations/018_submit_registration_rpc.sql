-- ============================================================
-- 018 – RPC: submit_my_registration
-- ============================================================
--
-- Phase B exposed a gap: the employee submitting the registration form
-- needs to UPDATE their own `nationality` and flip `registration_status`
-- from pending_info → pending_approval. Both are blocked by migration
-- 014's RLS lockdown (which only allows full_name + phone for self-update).
--
-- Fix: add a SECURITY DEFINER RPC that performs the transition with its
-- own server-side validation:
--   - Caller must be the profile owner (auth.uid() = the profile's id)
--   - Current status must be pending_info, email_unverified, or
--     returned_for_revision (the latter is a future Feature 2 status)
--   - Status flips to pending_approval
--
-- The lockdown on direct profile updates stays — this RPC is the ONLY
-- path through which an employee can change nationality / status on
-- their own row.
-- ============================================================

CREATE OR REPLACE FUNCTION submit_my_registration(
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

  -- Load the caller's current profile.
  SELECT * INTO v_current
    FROM profiles
   WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Only allow submission from the in-flight registration statuses.
  IF v_current.registration_status NOT IN (
    'pending_info', 'email_unverified', 'returned_for_revision'
  ) THEN
    RAISE EXCEPTION
      'Cannot submit registration from status "%"', v_current.registration_status;
  END IF;

  -- Sanity check on inputs.
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
    full_name           = trim(p_full_name),
    phone               = trim(p_phone),
    nationality         = trim(p_nationality),
    registration_status = 'pending_approval',
    updated_at          = now()
  WHERE id = v_caller_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

-- Allow authenticated users to call this RPC. The function itself
-- enforces "you can only submit your own registration" via auth.uid().
GRANT EXECUTE ON FUNCTION submit_my_registration(TEXT, TEXT, TEXT) TO authenticated;
