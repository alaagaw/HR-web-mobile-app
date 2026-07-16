-- ============================================================
-- 059 – Seed the access policy for the new "Saudization & HRDF
--       Simulator" HR Admin page (workforce planning what-if
--       tool for HR Director / GM review).
--
-- Resource key `page:admin/saudization-simulator` is registered
-- in lib/access/resources.ts (so it auto-appears in the HR
-- Access Control screen). Default is HR DIRECTOR ONLY — stricter
-- than the usual hr+hr_director admin pages because the tool
-- carries salary/planning assumptions. The HR Director can widen
-- it (e.g. to the GM's job title or to HR) from Access Control.
--
-- Idempotent: ON CONFLICT DO NOTHING never clobbers an HR edit.
-- Apply via `supabase db query --linked --file`.
-- ============================================================

INSERT INTO public.access_policies (resource_key, label, category, visible_to_all, rules)
VALUES (
  'page:admin/saudization-simulator',
  'Saudization & HRDF Simulator',
  'page',
  false,
  '[{"roles":["hr_director"]}]'::jsonb
)
ON CONFLICT (resource_key) DO NOTHING;
