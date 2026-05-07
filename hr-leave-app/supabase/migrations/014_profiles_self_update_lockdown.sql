-- ============================================================
-- 014 – Lock down profile self-update (privilege-escalation fix)
-- ============================================================
--
-- Problem: the original `profiles_update_own` policy permits a user to
-- update ANY column on their own row, including `role`, `supervisor_id`,
-- `manager_id`, `department`. That lets any logged-in user promote
-- themselves to HR Director by issuing a single PATCH.
--
-- Fix: replace the policy with one that only allows updating the
-- self-service fields. Privileged columns (role / supervisor /
-- manager / department / registration_status / must_change_password /
-- invited_by / is_active / workday_hours / email) require HR.
--
-- Email is excluded from self-update because the canonical email lives
-- in `auth.users` and must be changed via `auth.updateUser({ email })`
-- to trigger the Supabase confirmation flow. Migration 015 syncs
-- `profiles.email` automatically afterwards.

-- 1. Drop the over-permissive existing policy
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- 2. Replace with a narrowly-scoped policy that only allows safe fields
--    to change. We compare each privileged column NEW vs OLD row and
--    reject the update if any of them was modified.
CREATE POLICY "profiles_update_own_safe_fields"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Privileged columns must remain unchanged on a self-update.
    -- HR uses the separate profiles_update_hr policy for these.
    AND role                 = (SELECT role                 FROM profiles WHERE id = auth.uid())
    AND supervisor_id        IS NOT DISTINCT FROM (SELECT supervisor_id        FROM profiles WHERE id = auth.uid())
    AND manager_id           IS NOT DISTINCT FROM (SELECT manager_id           FROM profiles WHERE id = auth.uid())
    AND department           IS NOT DISTINCT FROM (SELECT department           FROM profiles WHERE id = auth.uid())
    AND registration_status  = (SELECT registration_status  FROM profiles WHERE id = auth.uid())
    AND must_change_password = (SELECT must_change_password FROM profiles WHERE id = auth.uid())
    AND invited_by           IS NOT DISTINCT FROM (SELECT invited_by           FROM profiles WHERE id = auth.uid())
    AND is_active            = (SELECT is_active            FROM profiles WHERE id = auth.uid())
    AND workday_hours        = (SELECT workday_hours        FROM profiles WHERE id = auth.uid())
    AND email                = (SELECT email                FROM profiles WHERE id = auth.uid())
  );

-- 3. The existing profiles_update_hr policy stays — HR/HR Director
--    keep full write access to any profile, including the locked
--    columns above. (Re-stating here for clarity; not redefined.)
--
--    CREATE POLICY "profiles_update_hr" ON profiles FOR UPDATE USING (
--      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
--    );

-- 4. The auth-state machinery (must_change_password flag flip after
--    forced first login, registration_status transitions) runs through
--    Edge Functions / SECURITY DEFINER paths, NOT the user's own JWT,
--    so the lockdown above does not break those flows.
