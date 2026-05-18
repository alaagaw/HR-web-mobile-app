-- ============================================================
-- 057 – General Manager capability = full authority over EVERY
--       Timesheet Management table (see + create + edit +
--       approve), equivalent to HR there.
--
-- Context: an `is_general_manager` capability holder (HR sets it
-- in Edit Employee → Capabilities; today: the 2 Operations
-- Project Managers) could already see/approve
-- project_hours_change_requests (migration 019), but the OTHER
-- Timesheet Management surfaces were still HR-only for writes —
-- notably Month Closures (close/reopen), and timesheet
-- entries/submissions (managers could only read). This makes the
-- GM capability the single switch for "full Timesheet Management
-- authority", matching how the page-level nav:timesheet-
-- management policy gates *visibility*.
--
-- Purely ADDITIVE: one extra PERMISSIVE `FOR ALL` policy per
-- table, OR-ed with the existing HR/manager/keeper policies — it
-- only widens access for GM, removes nothing. Idempotent
-- (drop-then-create). Reversible: drop the *_gm_all policies.
-- Enforcement is RLS; the pages' client-side action gating
-- (e.g. project-hours canApprove) already includes the GM
-- capability or is updated alongside this.
-- ============================================================

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'projects',
    'suppliers',
    'timesheet_assignments',
    'timesheet_entries',
    'timesheet_submissions',
    'timesheet_compliance_flags',
    'monthly_hour_settings',
    'month_closures',
    'project_managers'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_gm_all', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL
        USING (EXISTS (SELECT 1 FROM public.profile_capabilities
                        WHERE profile_id = auth.uid()
                          AND is_general_manager = true))
        WITH CHECK (EXISTS (SELECT 1 FROM public.profile_capabilities
                             WHERE profile_id = auth.uid()
                               AND is_general_manager = true))
    $f$, t || '_gm_all', t);
  END LOOP;
END $$;
