-- ============================================================
-- 024c – Backfill emp_codes for legacy admin/seed accounts
--
-- The 8 admin / HR accounts created by migration 006 never received
-- an employee_documents row, so they have no emp_code today. This
-- script creates the rows and assigns each a code.
--
-- FILL IN the placeholder codes below with the real values from your
-- HR records before running. Aqeel's is known (70575); replace each
-- '_FILL_IN_' string for the others.
--
-- Notes:
--   * ON CONFLICT (employee_id) keeps the script idempotent —
--     re-running with new codes updates the same rows instead of
--     erroring out on the UNIQUE(employee_id) constraint.
--   * The UNIQUE(emp_code) constraint will reject any code that
--     already belongs to a different employee. If you get a unique-
--     violation error, the code in the matching VALUES row collides
--     with someone in the Excel-imported set — pick a different one.
-- ============================================================

BEGIN;

INSERT INTO public.employee_documents (employee_id, emp_code)
SELECT p.id, v.emp_code
FROM (VALUES
  ('Aqeel A Gaw',            '70575'),
  ('Fatima Hassan',          '_FILL_IN_'),
  ('Venod',                  '_FILL_IN_'),
  ('Pylee K Iype',           '_FILL_IN_'),
  ('Nouf Al Mutairi',        '_FILL_IN_'),
  ('Amani Thiyab',           '_FILL_IN_'),
  ('Maram Al Muammar',       '_FILL_IN_'),
  ('Shahad Nasser AlShehri', '_FILL_IN_')
) AS v(full_name, emp_code)
JOIN public.profiles p ON p.full_name = v.full_name
ON CONFLICT (employee_id) DO UPDATE
SET emp_code = EXCLUDED.emp_code,
    updated_at = now();

-- Report which admins now have codes
SELECT p.full_name, ed.emp_code
FROM public.profiles p
LEFT JOIN public.employee_documents ed ON ed.employee_id = p.id
WHERE p.full_name IN (
  'Aqeel A Gaw','Fatima Hassan','Venod','Pylee K Iype',
  'Nouf Al Mutairi','Amani Thiyab','Maram Al Muammar','Shahad Nasser AlShehri'
)
ORDER BY p.full_name;

COMMIT;
