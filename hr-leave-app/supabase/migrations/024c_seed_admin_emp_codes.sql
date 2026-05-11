-- ============================================================
-- 024c – Backfill emp_codes + names + job titles for the 9 admin /
--       HR / Finance seed accounts that were created without an
--       employee_documents row, and harmonise their full_name and
--       job_title with HR's source-of-truth records.
--
-- Matches profiles by EMAIL (not full_name) because at least two
-- seed accounts have been edited in the live DB:
--   - amani@polytech.com.sa was renamed to "Shahad Alrashidi"
--   - shahad.hr@polytech.com.sa has an empty full_name
-- so name-based matching would miss or mis-route them.
--
-- Idempotent: each section uses ON CONFLICT DO UPDATE so re-runs
-- replace the same fields rather than erroring on UNIQUE.
-- ============================================================

BEGIN;

-- ── 1. Seed lookup_designations + lookup_departments ─────────
-- The FKs on profiles.job_title / profiles.department reject an
-- UPDATE that names a value not present in the lookup tables, so
-- we add them first.

INSERT INTO public.lookup_designations (name) VALUES
  ('HR & Admin Director'),
  ('Sr. HR Generalist'),
  ('HR / Admin Officer'),
  ('BD Admin Officer'),
  ('Accountant')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.lookup_departments (name) VALUES
  ('MARKETING')
ON CONFLICT (name) DO NOTHING;


-- ── 2. Update profile names + job_titles + departments ───────
-- Departments are kept as HUMAN RESOURCES for the HR staff (your
-- list said "HR" which is the shorthand for the canonical
-- HUMAN RESOURCES department already in lookup_departments).

-- Aqeel A Gaw  - rename only the title
UPDATE public.profiles
SET job_title = 'HR & Admin Director'
WHERE email = 'aqeel@polytech.com.sa';

-- Venod -> Vinod Pillai Karunakaran (full name correction, job title set)
UPDATE public.profiles
SET full_name = 'Vinod Pillai Karunakaran',
    job_title = 'Administrator'
WHERE email = 'projectadmin@polytech.com.sa';

-- Pylee K Iype
UPDATE public.profiles
SET job_title = 'Sr. HR Generalist'
WHERE email = 'pylee@polytech.com.sa';

-- Amani Thiyab (restore name from the rogue rename in the DB)
UPDATE public.profiles
SET full_name = 'Amani Thiyab',
    job_title = 'HR / Admin Officer'
WHERE email = 'amani@polytech.com.sa';

-- Maram Al Muammar
UPDATE public.profiles
SET job_title = 'HR / Admin Officer'
WHERE email = 'maram@polytech.com.sa';

-- Nouf Al Mutairi  - moves to MARKETING + BD Admin Officer
UPDATE public.profiles
SET job_title = 'BD Admin Officer',
    department = 'MARKETING'
WHERE email = 'nouf@polytech.com.sa';

-- Shahad Nasser AlShehri  - Accountant in Finance
UPDATE public.profiles
SET job_title = 'Accountant',
    department = 'FINANCE'
WHERE email = 'shahad@polytech.com.sa';

-- shahad.hr@polytech.com.sa  - empty full_name, needs renaming
UPDATE public.profiles
SET full_name = 'Shahad HR',
    job_title = 'HR / Admin Officer'
WHERE email = 'shahad.hr@polytech.com.sa';

-- Fatima Hassan  - matched by name because her email is non-standard
UPDATE public.profiles
SET job_title = 'HR / Admin Officer'
WHERE full_name = 'Fatima Hassan';


-- ── 3. Upsert emp_codes ──────────────────────────────────────

INSERT INTO public.employee_documents (employee_id, emp_code)
SELECT p.id, v.emp_code
FROM (VALUES
  ('aqeel@polytech.com.sa',          '70575'),
  ('projectadmin@polytech.com.sa',   '70259'),
  ('pylee@polytech.com.sa',          '70610'),
  ('amani@polytech.com.sa',          '70790'),
  ('maram@polytech.com.sa',          '70791'),
  ('nouf@polytech.com.sa',           '70711'),
  ('shahad@polytech.com.sa',         '70785'),
  ('shahad.hr@polytech.com.sa',      '00500'),
  ('hr@aqeel.com',                   '00400')  -- Fatima Hassan
) AS v(email, emp_code)
JOIN public.profiles p ON p.email = v.email
ON CONFLICT (employee_id) DO UPDATE
SET emp_code = EXCLUDED.emp_code,
    updated_at = now();


-- ── 4. Report so we can verify ───────────────────────────────

SELECT p.full_name, p.email, p.job_title, p.department, ed.emp_code
FROM public.profiles p
LEFT JOIN public.employee_documents ed ON ed.employee_id = p.id
WHERE p.email IN (
  'aqeel@polytech.com.sa','projectadmin@polytech.com.sa','pylee@polytech.com.sa',
  'amani@polytech.com.sa','maram@polytech.com.sa','nouf@polytech.com.sa',
  'shahad@polytech.com.sa','shahad.hr@polytech.com.sa','hr@aqeel.com'
)
ORDER BY ed.emp_code;

COMMIT;
