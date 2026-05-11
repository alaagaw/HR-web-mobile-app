-- ============================================================
-- 024f – Round-out lookup_departments + fix the Estmation typo
--
-- Adds five departments missing from prior seeding so the dropdown
-- in Add/Edit Employee covers the full PolyTech roster:
--   ADMIN, IT, LOGISTICS, SAFETY DEPARTMENT, HR
--
-- Also renames the designation 'Manager- Estmation & PMO' to
-- 'Manager- Estimation & PMO'. The FK on profiles.job_title is
-- ON UPDATE CASCADE so any employee referencing the old typo
-- follows automatically — no orphans.
--
-- Note about HR vs HUMAN RESOURCES: both exist after this
-- migration. HR-staff profiles currently sit on HUMAN RESOURCES;
-- consolidation is intentionally not done here so the choice
-- (rename or keep both) stays explicit and reviewable.
-- ============================================================

INSERT INTO public.lookup_departments (name) VALUES
  ('ADMIN'),
  ('FINANCE'),       -- idempotent
  ('IT'),
  ('LOGISTICS'),
  ('MARKETING'),     -- idempotent
  ('OPERATIONS'),    -- idempotent
  ('SAFETY DEPARTMENT'),
  ('HR')
ON CONFLICT (name) DO NOTHING;

UPDATE public.lookup_designations
SET name = 'Manager- Estimation & PMO'
WHERE name = 'Manager- Estmation & PMO';
