-- ============================================================
-- 025 – Update submit_my_registration RPC to support email
-- ============================================================
--
-- The registration form now allows employees to edit their email address.
-- Update the RPC to accept p_email and validate/update it.
-- Also removed insurance_number and insurance_expiry from the form
-- (those fields are now managed separately if needed).
-- ============================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS submit_my_registration(TEXT, TEXT, TEXT);

-- Recreate with email parameter
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
    updated_at          = now()
  WHERE id = v_caller_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

-- Grant execute permission with the new signature
GRANT EXECUTE ON FUNCTION submit_my_registration(TEXT, TEXT, TEXT, TEXT) TO authenticated;
