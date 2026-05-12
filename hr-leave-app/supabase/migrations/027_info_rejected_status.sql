-- =============================================================
-- 027 — info_rejected registration status
--
-- Why:
--   The old "Reject Registration" action set registration_status =
--   'rejected' AND is_active = false. That was wrong on two counts:
--     1. is_active is HR-only territory (Edit Employee dialog). The
--        review action should not auto-deactivate someone.
--     2. The status implied a terminal outcome and bounced the employee
--        to a dead-end "your registration was not approved" page, with
--        no path to fix the issue and resubmit.
--
--   The new model treats HR's review-rejection as "send back for
--   changes": the employee is asked to update their info and submit
--   again. Status `info_rejected` is the round-trip state between
--   `pending_approval` (HR is reviewing) and the employee's next
--   submit, which puts them back to `pending_approval`.
--
-- This migration:
--   1. Drops + recreates the CHECK constraint on
--      profiles.registration_status to include 'info_rejected'.
--   2. Migrates any existing `rejected` rows to `info_rejected`. Where
--      such rows were also `is_active = false`, reactivate them — the
--      deactivation was a bug, not an HR decision (HR sets inactivity
--      only via Edit Employee).
--   3. Keeps the legacy `rejected` value in the allowed set in case
--      anything still writes it; nothing in the app does after this
--      migration.
-- =============================================================

-- 1. Constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_registration_status_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_registration_status_check
  CHECK (registration_status IN (
    'not_invited',
    'email_unverified',
    'pending_info',
    'pending_approval',
    'info_rejected',
    'active',
    'rejected'
  ));

-- 2. Backfill: migrate existing rejected rows and unwind the
--    auto-deactivation that came with them.
UPDATE profiles
SET
  registration_status = 'info_rejected',
  is_active = CASE WHEN is_active = false THEN true ELSE is_active END,
  updated_at = now()
WHERE registration_status = 'rejected';

COMMENT ON CONSTRAINT profiles_registration_status_check ON profiles IS
  'Allowed registration_status values. info_rejected = HR asked the employee to revise and resubmit their registration info. rejected is legacy (kept for compatibility, no longer written).';
