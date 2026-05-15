-- ============================================================
-- 036 – Make the lookup FK class of bug structurally impossible
--
-- Background:
--   Migration 023 put a strict FK + strict CHECK on three free-text
--   profiles columns:
--     - profiles.department   -> lookup_departments(name)   UPPERCASE
--     - profiles.nationality  -> lookup_nationalities(name)  TitleCase
--     - profiles.job_title    -> lookup_designations(name)   trim/collapse
--
--   Any write of a value that is not byte-for-byte a row in the
--   matching lookup table fails with
--     "violates foreign key constraint profiles_<col>_fk".
--
--   The ONLY code that handled this correctly was the client-side
--   lookupService.add* path (canonicalise -> upsert lookup -> write),
--   used by just two of the many write paths. The registration form,
--   the HR review dialog, the HR self-edit profile dialog, the two
--   registration RPCs, the create-employee edge function and the
--   seed-from-excel script all wrote raw text and the server never
--   self-healed -> the same employee-facing crash for anyone whose
--   typed/pre-filled value was not an exact seeded string.
--
-- Fix (single source of truth, defence at the lowest layer):
--   A BEFORE INSERT OR UPDATE trigger on profiles that, for each of
--   the three columns:
--     1. canonicalises the value to the exact form the lookup CHECK
--        requires (so it can never violate the CHECK),
--     2. auto-registers it into the matching lookup table
--        (ON CONFLICT DO NOTHING) so the FK target always exists,
--     3. writes the canonical value back into the row.
--
--   BEFORE triggers run before constraint validation, so by the time
--   the FK is checked the lookup row is guaranteed to exist and the
--   stored value is guaranteed canonical. This makes the crash class
--   impossible from EVERY path -- current forms, the two RPCs, the
--   edge function, the (currently broken) Excel script, raw SQL, and
--   any future code -- without touching application code.
--
--   The canon_* helpers mirror, exactly, the CHECK constraints from
--   migration 023 and the client-side canonicalise* helpers in
--   services/supabase/lookup.ts, so the DB and client agree.
-- ============================================================


-- ── 1. Canonicalisers (mirror migration 023 CHECK constraints) ──

-- department: UPPERCASE, trimmed, internal whitespace collapsed.
CREATE OR REPLACE FUNCTION public.canon_department(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')));
$$;

-- nationality: TitleCase (first char upper, rest lower), trimmed,
-- internal whitespace collapsed.
CREATE OR REPLACE FUNCTION public.canon_nationality(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    upper(substring(c FROM 1 FOR 1)) || lower(substring(c FROM 2))
  FROM (SELECT trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')) AS c) s;
$$;

-- designation / job_title: trimmed, internal whitespace collapsed
-- (mixed case preserved on purpose -- see migration 023 note).
CREATE OR REPLACE FUNCTION public.canon_designation(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g'));
$$;

GRANT EXECUTE ON FUNCTION public.canon_department(TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.canon_nationality(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.canon_designation(TEXT) TO authenticated;


-- ── 2. Trigger: canonicalise + auto-register before the FK runs ──
-- SECURITY DEFINER so the (RLS-protected) lookup tables can be
-- written regardless of which role triggered the profile write
-- (employee JWT, HR JWT, service-role edge function, raw SQL).

CREATE OR REPLACE FUNCTION public.profiles_canon_lookup_refs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();   -- NULL for service-role / SQL editor; column is nullable
  v_val   TEXT;
BEGIN
  -- department --------------------------------------------------
  IF NEW.department IS NOT NULL THEN
    v_val := public.canon_department(NEW.department);
    IF length(v_val) = 0 THEN
      NEW.department := NULL;
    ELSE
      NEW.department := v_val;
      IF TG_OP = 'INSERT' OR v_val IS DISTINCT FROM OLD.department THEN
        INSERT INTO public.lookup_departments (name, is_active, created_by)
        VALUES (v_val, true, v_actor)
        ON CONFLICT (name) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- nationality -------------------------------------------------
  IF NEW.nationality IS NOT NULL THEN
    v_val := public.canon_nationality(NEW.nationality);
    IF length(v_val) = 0 THEN
      NEW.nationality := NULL;
    ELSE
      NEW.nationality := v_val;
      IF TG_OP = 'INSERT' OR v_val IS DISTINCT FROM OLD.nationality THEN
        INSERT INTO public.lookup_nationalities (name, is_active, created_by)
        VALUES (v_val, true, v_actor)
        ON CONFLICT (name) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- job_title ---------------------------------------------------
  IF NEW.job_title IS NOT NULL THEN
    v_val := public.canon_designation(NEW.job_title);
    IF length(v_val) = 0 THEN
      NEW.job_title := NULL;
    ELSE
      NEW.job_title := v_val;
      IF TG_OP = 'INSERT' OR v_val IS DISTINCT FROM OLD.job_title THEN
        INSERT INTO public.lookup_designations (name, is_active, created_by)
        VALUES (v_val, true, v_actor)
        ON CONFLICT (name) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_canon_lookup_refs ON public.profiles;
CREATE TRIGGER trg_profiles_canon_lookup_refs
  BEFORE INSERT OR UPDATE OF department, nationality, job_title
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_canon_lookup_refs();


-- ── 3. Heal any pre-existing non-canonical rows ──────────────────
-- Migration 023 already sanitised the data that existed then and the
-- FK has been enforced since, so this is normally a no-op. It is
-- written idempotently as a safety net (e.g. rows touched by paths
-- that bypassed the FK such as ON UPDATE CASCADE renames). Re-saving
-- the same value fires the trigger above, which canonicalises and
-- registers it.

UPDATE public.profiles
SET department = department
WHERE department IS NOT NULL
  AND department <> public.canon_department(department);

UPDATE public.profiles
SET nationality = nationality
WHERE nationality IS NOT NULL
  AND nationality <> public.canon_nationality(nationality);

UPDATE public.profiles
SET job_title = job_title
WHERE job_title IS NOT NULL
  AND job_title <> public.canon_designation(job_title);


COMMENT ON FUNCTION public.profiles_canon_lookup_refs() IS
  'Migration 036: canonicalises profiles.department/nationality/job_title '
  'and auto-registers the value in the matching lookup_* table before the '
  'FK is validated, so a free-text or pre-filled value can never raise '
  'profiles_<col>_fk again. Single source of truth for the lookup contract.';
