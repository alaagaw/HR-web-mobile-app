-- ============================================================
-- 045 – Access policies: HR-configurable, attribute-based gate
--       for navbar items and pages.
--
-- Why this exists:
--   Until now "who sees what" was hardcoded in the app
--   (NAV_ITEMS `hrOnly`/`approverOnly` flags). HR wants to
--   decide, at runtime, which nav items / pages each class of
--   employee can reach — by Role, Department, and/or job_title,
--   in any combination — without a code change. Because the
--   rules key on profile attributes (never on a person), moving
--   an employee's department/title/role in Edit Employee
--   re-grants access automatically.
--
-- Design choices:
--   1. One row per guardable resource. `resource_key` is the
--      stable contract shared with the client registry:
--        'nav:<tab-name>'   e.g. 'nav:admin'
--        'page:<route>'     e.g. 'page:admin/projects'
--   2. `visible_to_all` is the "default for everyone" switch.
--      When true, every signed-in employee passes and `rules`
--      is ignored.
--   3. `rules` is the OR-of-ANDs engine, evaluated client-side
--      in Phase 1 and by fn_can_access() in Phase 2:
--        rules: [{ roles:[], departments:[], job_titles:[] }, ...]
--        - access granted if ANY rule object passes (OR)
--        - within a rule, every NON-EMPTY dimension must match (AND)
--        - within a dimension, the user's value ∈ the list (IN)
--        - an empty [] for a dimension means "don't constrain on it"
--      So {} (all dims empty) is a rule nobody needs — use
--      visible_to_all instead; an empty rules array +
--      visible_to_all=false ⇒ only the HR failsafe passes.
--   4. SECURITY MODEL — read this before Phase 2:
--      This table protects ITSELF with hardcoded role checks,
--      never with its own rows (no bootstrap hole). HR /
--      HR_Director are an unconditional failsafe everywhere so
--      they can never lock themselves out of the config screen.
--      In Phase 1 this gate is navigation/UX only; real data
--      security stays in each table's own RLS. Phase 2 adds
--      fn_can_access() as an ADDITIONAL gate alongside the
--      existing engineer-written row-scoping — it never
--      replaces it.
--   5. Seed reproduces today's exact behavior (see NAV_ITEMS
--      and the HR-only admin tab) so deploying this migration
--      changes nothing until HR edits a policy. ON CONFLICT
--      DO NOTHING keeps re-runs idempotent and never clobbers
--      an HR edit.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.access_policies (
  resource_key   TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'page'
                   CHECK (category IN ('nav', 'page')),
  visible_to_all BOOLEAN NOT NULL DEFAULT false,
  rules          JSONB   NOT NULL DEFAULT '[]'::jsonb,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  updated_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- rules must always be a JSON array (the client maps over it).
ALTER TABLE public.access_policies
  DROP CONSTRAINT IF EXISTS access_policies_rules_is_array;
ALTER TABLE public.access_policies
  ADD CONSTRAINT access_policies_rules_is_array
  CHECK (jsonb_typeof(rules) = 'array');

-- ── RLS ──────────────────────────────────────────────────────
-- Everyone signed in may READ (the client needs the policy set
-- to render the navbar; the rules themselves are not secret —
-- they only say "Operations can see Timesheets"). Only
-- HR / HR_Director may WRITE. These checks are hardcoded on
-- purpose: the policy table must not govern its own access.

ALTER TABLE public.access_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_policies_select_all ON public.access_policies;
CREATE POLICY access_policies_select_all ON public.access_policies
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS access_policies_write_hr ON public.access_policies;
CREATE POLICY access_policies_write_hr ON public.access_policies
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles
             WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
             WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  );

-- Keep updated_at honest.
CREATE OR REPLACE FUNCTION public.tg_access_policies_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_access_policies_touch ON public.access_policies;
CREATE TRIGGER trg_access_policies_touch
  BEFORE UPDATE ON public.access_policies
  FOR EACH ROW EXECUTE FUNCTION public.tg_access_policies_touch();

-- ── SEED — reproduce current behavior exactly ────────────────
-- approver roles = supervisor + manager + hr + hr_director
--   (mirrors NAV_ITEMS `approverOnly`)
-- hr roles       = hr + hr_director (mirrors the HR-only tab)
-- visible_to_all = today's `hrOnly:false, approverOnly:false`

INSERT INTO public.access_policies (resource_key, label, category, visible_to_all, rules) VALUES
  -- Navbar (NAV_ITEMS)
  ('nav:dashboard',             'Dashboard (nav)',                'nav', true,  '[]'::jsonb),
  ('nav:requests',              'My Requests (nav)',              'nav', true,  '[]'::jsonb),
  ('nav:tasks',                 'Tasks (nav)',                    'nav', false, '[{"roles":["supervisor","manager","hr","hr_director"]}]'::jsonb),
  ('nav:team',                  'Team (nav)',                     'nav', false, '[{"roles":["supervisor","manager","hr","hr_director"]}]'::jsonb),
  ('nav:timeclock',             'Clock In/Out (nav)',             'nav', true,  '[]'::jsonb),
  ('nav:timesheet-entry',       'Timesheet (nav)',                'nav', true,  '[]'::jsonb),
  ('nav:calendar',              'Calendar (nav)',                 'nav', true,  '[]'::jsonb),
  ('nav:notifications',         'Notifications (nav)',            'nav', true,  '[]'::jsonb),
  ('nav:hr-policies-documents', 'HR Policies & Documents (nav)',  'nav', true,  '[]'::jsonb),
  ('nav:admin',                 'HR Admin (nav)',                 'nav', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('nav:profile',               'Profile (nav)',                  'nav', true,  '[]'::jsonb),

  -- HR Admin pages (today reachable only via the HR-only admin tab)
  ('page:admin/document-expiry',            'Document Expiry',              'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/registrations',              'Pending Registrations',        'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/employees',                  'Manage Employees',             'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/balances',                   'Manage Balances',              'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/compensation',               'Compensation',                 'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/leave-payouts',              'Leave Payouts',                'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/request-history',            'Leave Request History',        'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/renewal-history',            'Document Renewal History',     'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/balance-ledger',             'Balance Ledger',               'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/user-activity',              'User Activity',                'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/projects',                   'Projects',                     'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/suppliers',                  'Suppliers',                    'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/timesheets',                 'Monthly Consolidated',         'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/timesheet-assignments',      'Timesheet Assignments',        'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/project-hours-requests',     'Hours Change Requests',        'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/month-closures',             'Month Closures',               'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/employee-project-breakdown', 'Employee × Project Breakdown', 'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb),
  ('page:admin/access-control',             'Access Control (this screen)', 'page', false, '[{"roles":["hr","hr_director"]}]'::jsonb)
ON CONFLICT (resource_key) DO NOTHING;
