-- ============================================================
-- 016 – Employee profile extras + 'not_invited' status
-- ============================================================
--
-- Two changes required by the new "create now, invite later" workflow:
--
--   1. New profile columns:
--        - job_title   TEXT
--        - start_date  DATE
--      Both are required at invite-form time but stored as nullable
--      to keep existing rows valid; application validates on input.
--
--   2. New value 'not_invited' on registration_status — denotes a
--      profile created by HR via create-employee but not yet sent an
--      invite email (no auth.users row yet).

-- 1. Add columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_title  TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE;

-- 2. Extend registration_status check constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_registration_status_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_registration_status_check
  CHECK (registration_status IN (
    'not_invited',
    'email_unverified',
    'pending_info',
    'pending_approval',
    'active',
    'rejected'
  ));

-- 3. Index on start_date for "starting soon" queries (HR dashboards)
CREATE INDEX IF NOT EXISTS idx_profiles_start_date ON profiles(start_date);
