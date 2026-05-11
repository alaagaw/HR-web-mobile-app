-- ============================================================
-- 024 – Annual leave entitlement on profiles
--
-- The PolyTech employee list carries an "Entitled / YEAR" column
-- (30 or 21 days per row). HR wants this stored on the employee
-- record now so reports can show "expected PTO per year" alongside
-- "used / remaining" from leave_balances. The right long-term home
-- is probably a `leave_policies` table keyed by category, but for
-- now a single numeric column on profiles unblocks the import.
--
-- Stored as NUMERIC days (not hours) to match how HR communicates
-- entitlements ("30 days") and how the source spreadsheet records
-- them. Conversion to hours happens at the point of comparison
-- against leave_balances.balance_hours.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS annual_leave_entitlement_days NUMERIC(5,1)
  CHECK (annual_leave_entitlement_days IS NULL OR annual_leave_entitlement_days >= 0);

COMMENT ON COLUMN public.profiles.annual_leave_entitlement_days IS
  'Annual PTO entitlement in days. Imported from the HR roster; for legacy or future use, this may move into a dedicated leave_policies table keyed by category.';
