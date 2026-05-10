-- ============================================================
-- 021 – v_emp_codes view
--
-- Why this view exists:
--   employee_documents.emp_code is the single source of truth for an
--   employee's staff/payroll number. RLS on employee_documents is
--   restrictive (owner-only + HR full access) because the same table
--   carries sensitive ID fields (iqama, passport, insurance). That
--   restrictiveness is correct for those fields but blocks legitimate
--   use of emp_code for any non-HR caller — for example, a timesheet
--   keeper searching for an employee to add to a project should see
--   the staff number on the row they pick.
--
--   Rather than denormalize (copy emp_code onto profiles) or relax
--   RLS on the whole employee_documents table (which would expose
--   iqama / passport), we expose ONLY the emp_code field through a
--   minimal view and grant SELECT broadly. The underlying table keeps
--   its strict RLS.
--
-- security_invoker = false is set explicitly so the view runs with
-- the owner's privileges (definer-style) and bypasses
-- employee_documents' SELECT policy. This is the intended behavior:
-- emp_code is non-sensitive, the rest of the table stays locked down.
-- ============================================================

DROP VIEW IF EXISTS public.v_emp_codes;

CREATE VIEW public.v_emp_codes
WITH (security_invoker = off)
AS
SELECT employee_id, emp_code
FROM public.employee_documents;

-- Anyone signed in (and Supabase's anon role, which is what unauthed
-- clients get) can read staff numbers. There is no PII here.
GRANT SELECT ON public.v_emp_codes TO authenticated, anon;
