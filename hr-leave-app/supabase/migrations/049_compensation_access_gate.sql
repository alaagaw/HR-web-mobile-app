-- ============================================================
-- 049 – Phase 2 rollout (table #1): wire fn_can_access() into
--       employee_compensation as an AS RESTRICTIVE SELECT gate.
--
-- This is the proof-of-pattern for "HR-configurable gate AND-ed
-- with engineer-written row-scoping" (the agreed Phase 2 model).
--
-- Postgres policy algebra:
--   final = (OR of PERMISSIVE) AND (AND of RESTRICTIVE)
-- Existing PERMISSIVE SELECT policies stay untouched and keep
-- defining WHICH rows:
--   emp_comp_self_read : employee_id = auth.uid()   (own salary)
--   emp_comp_hr_read   : caller is hr/hr_director    (all)
-- We add ONE restrictive gate. The `OR employee_id = auth.uid()`
-- guarantees an employee can ALWAYS read their own compensation
-- even if HR later restricts the Compensation page entirely —
-- self-service must never break.
--
-- Behaviour today (seed: page:admin/compensation = roles
-- [hr,hr_director]) is UNCHANGED:
--   • employee → own row only (self permissive ∧ self gate)   ✓
--   • HR/HR_Dir → all rows (hr permissive ∧ gate passes)       ✓
--   • other employee → another's row: no permissive passes —
--     still denied, gate irrelevant                            ✓
-- What it ADDS: HR can now *tighten* who sees salary via the
-- Access Control screen (e.g. hr_director-only). It can NOT
-- over-grant — a restrictive gate only subtracts; no permissive
-- policy grants non-HR access to others' rows, so HR cannot
-- accidentally expose salaries by editing the page policy.
--
-- Fully reversible:  DROP POLICY emp_comp_access_gate ON employee_compensation;
-- ============================================================

DROP POLICY IF EXISTS emp_comp_access_gate ON public.employee_compensation;

CREATE POLICY emp_comp_access_gate
  ON public.employee_compensation
  AS RESTRICTIVE
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR public.fn_can_access('page:admin/compensation')
  );
