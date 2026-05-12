-- =============================================================
-- 028 — Drop dead mark_profile_inactive_on_auth_delete trigger
--
-- Migration 015 added a BEFORE DELETE trigger on auth.users that set
-- profiles.is_active = false on the matching profile row, intending to
-- "soft-delete" the profile while keeping it around for history. That
-- intent was contradicted by the FK on profiles, which is:
--
--   profiles_id_fkey FOREIGN KEY (id)
--     REFERENCES auth.users(id) ON DELETE CASCADE
--
-- So when an auth.users row is deleted, the trigger flips is_active to
-- false for a microsecond, then the CASCADE deletes the profile row
-- entirely. The "soft-delete" never sticks. The trigger is dead code.
--
-- We're tightening the contract that profiles.is_active is HR-controlled
-- only (via Edit Employee). Removing this trigger removes the last
-- automatic write-path to that column from the database side.
--
-- If we ever want true soft-delete (keep profile, just deactivate), we
-- need to change the FK to ON DELETE SET NULL or NO ACTION first; this
-- migration intentionally does not do that, to keep the cleanup small.
-- =============================================================

DROP TRIGGER IF EXISTS on_auth_user_deleted_mark_profile ON auth.users;
DROP FUNCTION IF EXISTS public.mark_profile_inactive_on_auth_delete();
