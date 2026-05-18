-- ============================================================
-- 046 – RLS hardening (gaps #2 and #3 from the access-control
--       audit). These close real holes where any authenticated
--       user could act on / read data that the UI only hid.
--
--   #2  leave_requests UPDATE was `USING (true)` — ANY signed-in
--       user could approve/reject/modify ANYONE's leave request
--       via the API. Approval integrity was app-code only.
--   #3  leave_attachments SELECT was `USING (true)` — ANY
--       signed-in user could read EVERY leave attachment
--       (sick notes, medical certificates, …).
--
-- Design: both new policies exactly MIRROR the existing
-- leave_requests SELECT visibility set (own / assignee / HR /
-- the employee's supervisor / the employee's manager — see
-- migration 001). So every legitimate app flow that can already
-- see or act on a request keeps working unchanged; only the
-- "any authenticated user → any row" hole is removed. This is
-- intentionally a behaviour-preserving tightening, not a
-- redesign.
--
-- NOT INCLUDED — gap #1 (profiles SELECT = USING(true)):
--   The app reads other users' profiles pervasively — role-based
--   assignee lookups (.eq('role','hr_director')), supervisor/
--   manager chains, registration & renewal name lookups, org
--   chart, and every name label rendered via a profiles join.
--   A restrictive row policy would break leave approvals,
--   registrations, renewal tasks, team, calendar and name
--   display in production. Closing #1 correctly means a
--   column-projection design (move sensitive PII to a strict
--   side table like employee_compensation already does for
--   salary, or expose a column-limited view + REVOKE direct
--   SELECT) and auditing every `select('*')` on profiles. That
--   is a separate, scoped piece of work — deliberately not
--   rushed into this migration.
--
-- DEPLOY NOTE: per the project's deploy model this is applied
-- manually via `supabase db query --linked`. Do NOT apply blind
-- to prod — run the verification queries at the bottom on a
-- copy / during a quiet window and smoke-test the leave
-- approval + attachment flows first.
-- ============================================================

-- ── #2  leave_requests: scope UPDATE to who may already see it ──
DROP POLICY IF EXISTS "requests_update_all" ON leave_requests;

DROP POLICY IF EXISTS "requests_update_own" ON leave_requests;
CREATE POLICY "requests_update_own" ON leave_requests FOR UPDATE
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "requests_update_assignee" ON leave_requests;
CREATE POLICY "requests_update_assignee" ON leave_requests FOR UPDATE
  USING (current_assignee_id = auth.uid());

DROP POLICY IF EXISTS "requests_update_hr" ON leave_requests;
CREATE POLICY "requests_update_hr" ON leave_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles
             WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  );

DROP POLICY IF EXISTS "requests_update_supervisor" ON leave_requests;
CREATE POLICY "requests_update_supervisor" ON leave_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles
             WHERE id = employee_id AND supervisor_id = auth.uid())
  );

DROP POLICY IF EXISTS "requests_update_manager" ON leave_requests;
CREATE POLICY "requests_update_manager" ON leave_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles
             WHERE id = employee_id AND manager_id = auth.uid())
  );

-- ── #3  leave_attachments: visible only if the parent request
--        is visible to you (mirror the request SELECT set) ──────
DROP POLICY IF EXISTS "attachments_select" ON leave_attachments;
CREATE POLICY "attachments_select" ON leave_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leave_requests lr
      WHERE lr.id = leave_attachments.request_id
        AND (
          lr.employee_id = auth.uid()
          OR lr.current_assignee_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles
                      WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
          OR EXISTS (SELECT 1 FROM profiles
                      WHERE id = lr.employee_id AND supervisor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM profiles
                      WHERE id = lr.employee_id AND manager_id = auth.uid())
        )
    )
  );

-- attachments_insert / attachments_delete_own are intentionally
-- left as-is: the data-leak was the open SELECT; tightening
-- INSERT risks breaking request creation / HR uploads for no
-- security gain here.

-- ── VERIFICATION (run after applying) ────────────────────────
-- Expect: 5 UPDATE policies on leave_requests, no "requests_update_all".
--   SELECT polname, polcmd FROM pg_policy
--    WHERE polrelid='leave_requests'::regclass AND polcmd='*' OR polcmd='w'
--    ORDER BY polname;
-- Expect: one scoped attachments_select.
--   SELECT polname, pg_get_expr(polqual, polrelid)
--     FROM pg_policy WHERE polrelid='leave_attachments'::regclass;
-- Smoke test BEFORE trusting prod:
--   • employee submits a request + attachment
--   • supervisor/manager/HR can see & act on it (approve/reject)
--   • a SECOND unrelated employee CANNOT select that request
--     row or its attachment via the API
