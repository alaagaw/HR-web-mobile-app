-- ============================================================
-- 015 – auth.users ↔ profiles synchronisation
-- ============================================================
--
-- Source-of-truth rules established by this migration:
--
--   * auth.users.email              = source of truth.
--     profiles.email                = denormalised cache; kept in sync
--                                     by Trigger A below.
--
--   * auth.users.encrypted_password = source of truth (never mirrored).
--
--   * All other employee fields    (full_name, phone, role, department,
--     supervisor_id, manager_id, etc.) live ONLY in profiles.
--
-- Application code therefore writes to ONE place per logical operation:
--
--   – Email change       → auth.updateUser({ email })   (trigger syncs profiles)
--   – Password change    → auth.updateUser({ password })
--   – Profile data edit  → UPDATE profiles ... (RLS-gated)
--   – New employee       → auth.admin.createUser(...)   (trigger from migration 005 creates profile)
--
-- ============================================================
-- Trigger A — sync profiles.email when auth.users.email changes
-- ============================================================

CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
       SET email = NEW.email,
           updated_at = now()
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();

-- ============================================================
-- Trigger B — soft-delete propagation
-- ============================================================
--
-- When an auth user is deleted, mark their profile inactive instead
-- of relying solely on the FK cascade (which would lose the row and
-- any historical references to it). The CASCADE on the FK still wins
-- ultimately if the cascade is configured that way; this trigger is
-- a belt-and-braces marker that the row is no longer authenticatable.

CREATE OR REPLACE FUNCTION mark_profile_inactive_on_auth_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET is_active = false,
         updated_at = now()
   WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted_mark_profile ON auth.users;
CREATE TRIGGER on_auth_user_deleted_mark_profile
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION mark_profile_inactive_on_auth_delete();

-- ============================================================
-- One-time backfill — fix any drift that already exists
-- ============================================================

UPDATE public.profiles p
   SET email = u.email,
       updated_at = now()
  FROM auth.users u
 WHERE p.id = u.id
   AND p.email IS DISTINCT FROM u.email;
