-- Fix: The original UNIQUE(project_id, employee_id, entry_date) does not handle
-- NULL employee_id (PostgreSQL treats NULL != NULL in unique constraints).
-- This causes duplicate rows for external workers on every save.

-- Step 1: Clean up any existing duplicates (keep the row with the highest standard_hours)
DELETE FROM timesheet_entries a
USING timesheet_entries b
WHERE a.id < b.id
  AND a.project_id = b.project_id
  AND a.entry_date = b.entry_date
  AND a.employee_id IS NULL
  AND b.employee_id IS NULL
  AND a.employee_name = b.employee_name;

-- Step 2: Drop the old constraint that can't handle NULLs
ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_project_id_employee_id_entry_date_key;

-- Step 3: Drop partial indexes if they were created from a previous run
DROP INDEX IF EXISTS idx_ts_entry_unique_with_emp;
DROP INDEX IF EXISTS idx_ts_entry_unique_without_emp;

-- Step 4: Add a generated column that is NEVER NULL
-- For employees with ID: uses the UUID as text
-- For external workers: uses their name
ALTER TABLE timesheet_entries
  ADD COLUMN IF NOT EXISTS employee_key TEXT GENERATED ALWAYS AS (
    COALESCE(employee_id::text, employee_name)
  ) STORED;

-- Step 5: Create a single, standard unique constraint that Supabase/PostgREST supports
ALTER TABLE timesheet_entries
  ADD CONSTRAINT timesheet_entries_project_employee_key_date_key
  UNIQUE (project_id, employee_key, entry_date);
