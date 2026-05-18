-- ============================================================
-- 048 – Phase 2: fn_can_access() — the same access rule engine
--       as lib/access/evaluate.ts, but in Postgres so the
--       HR-configured policies can ALSO enforce at the database
--       (RLS) layer, not just navigation/UX.
--
-- This migration only CREATES the functions. It deliberately
-- does NOT attach them to any table's RLS — that is a separate,
-- careful, table-by-table rollout (each as an AS RESTRICTIVE
-- gate AND-ed with the existing engineer-written row-scoping,
-- smoke-tested individually, exactly like 046).
--
-- Two functions:
--   fn_access_rule_match(rules, role, dept, title) — PURE,
--     no auth, unit-testable. Mirrors evaluate.ts ruleMatches +
--     dimensionMatches (OR of rules; within a rule every
--     non-empty dimension must match; values normalised
--     trim+lower; empty allow-list ⇒ dimension unconstrained).
--   fn_can_access(resource_key) — wraps it with the same
--     precedence as evaluateAccess():
--       1. superuser  → true   (profile_capabilities.is_superuser)
--       2. HR/HR_Dir floor → true ONLY for nav:admin +
--          page:admin/access-control (lockout floor — nothing else)
--       3. no/disabled policy → true  (fail OPEN: the 045 seed
--          guarantees a row for every governed resource; an
--          absent/disabled row must never cause a surprise DB
--          lockout — the table's own row-scoping still applies.
--          This is the one intentional divergence from
--          evaluate.ts, which uses the client registry's
--          legacyDefault for UX; SQL has no registry.)
--       4. visible_to_all → true
--       5. else: ANY rule matches
--
-- SECURITY DEFINER + fixed search_path: the helper must read
-- profiles / access_policies / profile_capabilities regardless
-- of the caller's RLS (and without recursing into profiles RLS
-- once gap #1 locks it down). STABLE: evaluated once per row
-- scan, not per row twice.
-- ============================================================

-- ── Pure rule core (unit-testable, no auth) ──────────────────
CREATE OR REPLACE FUNCTION public.fn_access_rule_match(
  p_rules jsonb,
  p_role  text,
  p_dept  text,
  p_title text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_rule jsonb;
  v_ok   boolean;
  v_role  text := lower(trim(coalesce(p_role,  '')));
  v_dept  text := lower(trim(coalesce(p_dept,  '')));
  v_title text := lower(trim(coalesce(p_title, '')));
BEGIN
  IF p_rules IS NULL OR jsonb_typeof(p_rules) <> 'array' THEN
    RETURN false;
  END IF;

  FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
  LOOP
    v_ok := true;

    -- roles
    IF jsonb_array_length(coalesce(v_rule->'roles', '[]'::jsonb)) > 0 THEN
      IF v_role = '' OR NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(v_rule->'roles') x
            WHERE lower(trim(x)) = v_role
         ) THEN
        v_ok := false;
      END IF;
    END IF;

    -- departments
    IF v_ok AND jsonb_array_length(coalesce(v_rule->'departments', '[]'::jsonb)) > 0 THEN
      IF v_dept = '' OR NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(v_rule->'departments') x
            WHERE lower(trim(x)) = v_dept
         ) THEN
        v_ok := false;
      END IF;
    END IF;

    -- job_titles
    IF v_ok AND jsonb_array_length(coalesce(v_rule->'job_titles', '[]'::jsonb)) > 0 THEN
      IF v_title = '' OR NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(v_rule->'job_titles') x
            WHERE lower(trim(x)) = v_title
         ) THEN
        v_ok := false;
      END IF;
    END IF;

    IF v_ok THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- ── Resource gate (auth-aware) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_can_access(p_resource_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_role  text;
  v_dept  text;
  v_title text;
  v_pol   public.access_policies%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT role, department, job_title
    INTO v_role, v_dept, v_title
    FROM public.profiles
   WHERE id = v_uid;

  -- 1. Superuser bypasses everything.
  IF EXISTS (
    SELECT 1 FROM public.profile_capabilities
     WHERE profile_id = v_uid AND is_superuser
  ) THEN
    RETURN true;
  END IF;

  -- 2. Minimal lockout floor — HR/HR_Director, these two keys only.
  IF p_resource_key IN ('nav:admin', 'page:admin/access-control')
     AND v_role IN ('hr', 'hr_director') THEN
    RETURN true;
  END IF;

  SELECT * INTO v_pol
    FROM public.access_policies
   WHERE resource_key = p_resource_key;

  -- 3. No row / disabled → fail OPEN (see header).
  IF NOT FOUND OR v_pol.enabled = false THEN
    RETURN true;
  END IF;

  -- 4. Visible to everyone.
  IF v_pol.visible_to_all THEN
    RETURN true;
  END IF;

  -- 5. Rule evaluation.
  RETURN public.fn_access_rule_match(v_pol.rules, v_role, v_dept, v_title);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_access_rule_match(jsonb, text, text, text)
  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fn_can_access(text)
  TO authenticated, anon;
