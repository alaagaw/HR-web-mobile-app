-- ============================================================
-- 022 – Fix recursive policy on employee_documents
--
-- Migration 017 added `employee_update_own_documents_safe_fields`
-- to prevent employees from changing their own emp_code (and the
-- HR-only verification fields) while letting them update everything
-- else on their own document row. Its WITH CHECK clause re-queried
-- employee_documents itself:
--
--     emp_code = (SELECT emp_code FROM employee_documents WHERE employee_id = auth.uid())
--
-- Each subquery against the same table triggers a fresh RLS
-- evaluation, which runs this policy, which runs another subquery,
-- and so on until Postgres aborts with 42P17 "infinite recursion
-- detected in policy". It only ever worked because most write paths
-- in practice took the HR full-access branch first; the upsert from
-- the HR Admin Employee Edit dialog finally exposed the bug.
--
-- This migration replaces the column-level guard with a BEFORE UPDATE
-- trigger. Triggers can see OLD and NEW row values directly, so no
-- subqueries are needed.
--
-- Security model after this migration:
--   * HR / HR Director (role) and service-role contexts: full update
--     allowed on every column (existing hr_full_access_documents
--     policy unchanged, trigger short-circuits for these callers).
--   * Employee on their own row: update allowed on every column
--     EXCEPT emp_code, is_verified, verified_by, verified_at. The
--     trigger raises an exception if any of those changes.
--   * Anyone else: blocked by RLS USING clause.
-- ============================================================

-- ── 1. Drop the recursive policy ─────────────────────────────

DROP POLICY IF EXISTS "employee_update_own_documents_safe_fields" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_update_own_documents" ON public.employee_documents;

-- ── 2. Reinstate permissive own-row UPDATE policy ────────────
-- No WITH CHECK — the trigger below handles field-level enforcement
-- so the policy stays simple and recursion-free.

CREATE POLICY "employee_update_own_documents"
  ON public.employee_documents
  FOR UPDATE
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- ── 3. Field-lock trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_employee_documents_field_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Service-role / Postgres admin paths have no auth.uid(). They've
  -- already authenticated at the API boundary (edge functions use the
  -- service-role key) so we let them through unconditionally.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  -- HR / HR Director may change anything.
  IF caller_role IN ('hr', 'hr_director') THEN
    RETURN NEW;
  END IF;

  -- Anyone else: field-level locks. IS DISTINCT FROM treats NULL safely
  -- (NULL = NULL evaluates to NULL, which would let a change to NULL
  -- slip through with a plain =).
  IF NEW.emp_code IS DISTINCT FROM OLD.emp_code THEN
    RAISE EXCEPTION 'emp_code can only be changed by HR'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'is_verified can only be changed by HR'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
    RAISE EXCEPTION 'verified_by can only be changed by HR'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    RAISE EXCEPTION 'verified_at can only be changed by HR'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_employee_documents_field_lock ON public.employee_documents;

CREATE TRIGGER trg_enforce_employee_documents_field_lock
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_employee_documents_field_lock();
