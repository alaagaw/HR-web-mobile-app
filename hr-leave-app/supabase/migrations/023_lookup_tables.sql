-- ============================================================
-- 023 – Reference / lookup tables for departments, nationalities,
--       and designations (job titles)
--
-- Why this exists:
--   The profiles.department, profiles.nationality, and
--   profiles.job_title columns are free text. The audit of the
--   PolyTech employee list found ~280 rows with double internal
--   spaces, 17 "ADMIN " vs "ADMIN" mismatches, "Logistics" in
--   TitleCase while every other department is UPPERCASE, etc.
--   Without a canonical reference the same logical value gets
--   stored as many distinct strings and breaks every filter,
--   group-by, and report downstream.
--
-- Design choices:
--   1. Three small lookup tables, one per concept. Each has a
--      single canonical TEXT key (`name`) that is UNIQUE NOT NULL.
--      No surrogate ID — the name IS the key. That keeps existing
--      profile columns (`department`, `nationality`, `job_title`)
--      typed as TEXT and lets us add a foreign-key reference
--      without restructuring application code.
--
--   2. Casing conventions, enforced via CHECK + a normalisation
--      pass on existing data:
--        - department    UPPERCASE     ("OPERATIONS", "ADMIN")
--        - nationality   TitleCase     ("Indian", "Saudi")
--        - designation   Title Case    ("Project Manager")
--      The CHECK constraint stops anyone (form, edge function,
--      raw SQL) from inserting wrong-cased values.
--
--   3. is_active flag rather than DELETE — once a department has
--      been used on a profile, removing it from the lookup would
--      break the FK. Soft-delete via is_active = false keeps
--      historical references intact and hides the row in pickers.
--
--   4. Sanitisation runs BEFORE the seed + FK so the constraint
--      doesn't fail on existing dirty data. Specifically:
--        - trim leading/trailing whitespace
--        - collapse runs of internal whitespace to single space
--        - apply the casing convention
--      Same logic the seed-from-excel.js script will be updated
--      to use, so the import path stays in sync.
-- ============================================================


-- ── 1. Create the lookup tables ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.lookup_departments (
  name        TEXT PRIMARY KEY
              CHECK (
                name = upper(name)
                AND length(trim(name)) > 0
                AND name = trim(regexp_replace(name, '\s+', ' ', 'g'))
              ),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS public.lookup_nationalities (
  name        TEXT PRIMARY KEY
              CHECK (
                length(trim(name)) > 0
                AND name = trim(regexp_replace(name, '\s+', ' ', 'g'))
                -- TitleCase: first letter uppercase, rest lowercase
                AND name = upper(substring(name from 1 for 1)) || lower(substring(name from 2))
              ),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS public.lookup_designations (
  name        TEXT PRIMARY KEY
              CHECK (
                length(trim(name)) > 0
                AND name = trim(regexp_replace(name, '\s+', ' ', 'g'))
              ),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES profiles(id)
);


-- ── 2. RLS — read-open, HR/HRD write ─────────────────────────

ALTER TABLE public.lookup_departments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_nationalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_designations  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lookup_departments_select_all" ON public.lookup_departments
  FOR SELECT USING (true);
CREATE POLICY "lookup_departments_write_hr" ON public.lookup_departments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
  );

CREATE POLICY "lookup_nationalities_select_all" ON public.lookup_nationalities
  FOR SELECT USING (true);
CREATE POLICY "lookup_nationalities_write_authenticated"
  ON public.lookup_nationalities FOR INSERT
  TO authenticated WITH CHECK (true);
-- Once added, only HR can deactivate / rename.
CREATE POLICY "lookup_nationalities_modify_hr" ON public.lookup_nationalities
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
  );
CREATE POLICY "lookup_nationalities_delete_hr" ON public.lookup_nationalities
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
  );

CREATE POLICY "lookup_designations_select_all" ON public.lookup_designations
  FOR SELECT USING (true);
CREATE POLICY "lookup_designations_write_hr" ON public.lookup_designations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
  );


-- ── 3. Sanitise existing profile data ────────────────────────
-- This MUST run before the seed + FK steps, otherwise the FK
-- creation will fail on rows like "ADMIN " (trailing space) that
-- won't have an exact match in lookup_departments.

-- 3a. Department: trim, collapse, uppercase.
UPDATE public.profiles
SET department = upper(trim(regexp_replace(department, '\s+', ' ', 'g')))
WHERE department IS NOT NULL
  AND department <> upper(trim(regexp_replace(department, '\s+', ' ', 'g')));

-- 3b. Nationality: trim, collapse, TitleCase (first char upper, rest lower).
UPDATE public.profiles
SET nationality =
  upper(substring(trim(regexp_replace(nationality, '\s+', ' ', 'g')) from 1 for 1))
  || lower(substring(trim(regexp_replace(nationality, '\s+', ' ', 'g')) from 2))
WHERE nationality IS NOT NULL
  AND nationality <> (
    upper(substring(trim(regexp_replace(nationality, '\s+', ' ', 'g')) from 1 for 1))
    || lower(substring(trim(regexp_replace(nationality, '\s+', ' ', 'g')) from 2))
  );

-- 3c. Job title: trim + collapse only (mixed-case titles like
-- "Project Manager" already vary; we don't force TitleCase to avoid
-- mangling acronyms like "HR Director" → "Hr Director").
UPDATE public.profiles
SET job_title = trim(regexp_replace(job_title, '\s+', ' ', 'g'))
WHERE job_title IS NOT NULL
  AND job_title <> trim(regexp_replace(job_title, '\s+', ' ', 'g'));


-- ── 4. Seed lookup tables from current sanitised values ──────

INSERT INTO public.lookup_departments (name)
SELECT DISTINCT department FROM public.profiles
WHERE department IS NOT NULL AND length(trim(department)) > 0
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.lookup_nationalities (name)
SELECT DISTINCT nationality FROM public.profiles
WHERE nationality IS NOT NULL AND length(trim(nationality)) > 0
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.lookup_designations (name)
SELECT DISTINCT job_title FROM public.profiles
WHERE job_title IS NOT NULL AND length(trim(job_title)) > 0
ON CONFLICT (name) DO NOTHING;


-- ── 5. Add FK constraints ────────────────────────────────────
-- Future inserts / updates that try to write a value not in the
-- lookup are now rejected at the database level. The forms will
-- insert the lookup row first (via lookupService) when HR types
-- a new value, then write the profile with that value — keeping
-- "add new from the form" working while still enforcing the
-- canonical list.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_fk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_fk
  FOREIGN KEY (department) REFERENCES public.lookup_departments(name)
  ON UPDATE CASCADE;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_nationality_fk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_nationality_fk
  FOREIGN KEY (nationality) REFERENCES public.lookup_nationalities(name)
  ON UPDATE CASCADE;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_job_title_fk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_job_title_fk
  FOREIGN KEY (job_title) REFERENCES public.lookup_designations(name)
  ON UPDATE CASCADE;
