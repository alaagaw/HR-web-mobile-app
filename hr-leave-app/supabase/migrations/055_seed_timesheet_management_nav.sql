-- ============================================================
-- 055 – Seed the access policy for the new "Timesheet Management"
--       sidebar entry (moved out of the HR Admin landing into its
--       own nav item so access can be granted independently).
--
-- Resource key `nav:timesheet-management` is registered in
-- lib/access/resources.ts (so it auto-appears in the HR Access
-- Control screen). This seed gives it a governed default that
-- reproduces today's behaviour: HR / HR_Director only (it lived
-- under the HR-Admin-only tab). HR can then widen it — e.g. to
-- Operations Project Managers — from Access Control.
--
-- Idempotent: ON CONFLICT DO NOTHING never clobbers an HR edit.
-- ============================================================

INSERT INTO public.access_policies (resource_key, label, category, visible_to_all, rules)
VALUES (
  'nav:timesheet-management',
  'Timesheet Management (nav)',
  'nav',
  false,
  '[{"roles":["hr","hr_director"]}]'::jsonb
)
ON CONFLICT (resource_key) DO NOTHING;
