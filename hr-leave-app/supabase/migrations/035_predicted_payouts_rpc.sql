-- =============================================================
-- 035 — Forecast / predicted-payouts RPC
--
-- The existing compute_leave_payouts RPC sums APPROVED leave days
-- in the target month. That's the right number for payroll
-- processing (what we actually owe). But HR also needs a planning
-- view that answers "if employee X takes N days in this month,
-- what would we owe?" — a forecast based on their CURRENT PTO
-- balance.
--
-- This RPC returns the raw inputs the Forecast tab needs:
--   * compensation at month_end (same rule as compute_leave_payouts
--     so the two tabs agree on what comp each employee has)
--   * the employee's current PTO balance, converted to days using
--     their workday_hours
--
-- All the "what-if" math (how many days to use, optional date range,
-- per-row pay totals) happens client-side so HR can edit interactively
-- without a round-trip per keystroke. The server just answers
-- "here's everyone's comp and balance for the selected month."
-- =============================================================

CREATE OR REPLACE FUNCTION compute_predicted_payouts(
  p_year       INT,
  p_month      INT,
  p_department TEXT DEFAULT NULL
)
RETURNS TABLE (
  employee_id           UUID,
  full_name             TEXT,
  emp_code              TEXT,
  department            TEXT,
  workday_hours         NUMERIC,
  basic_salary          NUMERIC,
  hra                   NUMERIC,
  transportation        NUMERIC,
  other_allowances      NUMERIC,
  total_monthly         NUMERIC,
  pto_balance_hours     NUMERIC,
  pto_balance_days      NUMERIC,
  effective_from        DATE,
  days_in_calendar_month INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_month_start  DATE := make_date(p_year, p_month, 1);
  v_month_end    DATE := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
  v_calendar     INT  := EXTRACT(DAY FROM v_month_end)::INT;
  v_year         INT  := p_year;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month: %', p_month;
  END IF;

  RETURN QUERY
  WITH
    comp AS (
      SELECT DISTINCT ON (c.employee_id)
        c.employee_id,
        c.basic_salary,
        c.hra,
        c.transportation,
        c.other_allowances,
        c.effective_from
      FROM employee_compensation c
      WHERE c.effective_from <= v_month_end
      ORDER BY c.employee_id, c.effective_from DESC
    ),
    -- PTO balance for the target year. Falls back to 0 if the row
    -- doesn't exist yet — accruals will populate it eventually.
    pto AS (
      SELECT lb.employee_id, lb.balance_hours
      FROM leave_balances lb
      WHERE lb.leave_type = 'pto'
        AND lb.year = v_year
    ),
    codes AS (
      SELECT v.employee_id, v.emp_code FROM v_emp_codes v
    )
  SELECT
    p.id                                       AS employee_id,
    p.full_name                                AS full_name,
    co.emp_code                                AS emp_code,
    p.department                               AS department,
    COALESCE(p.workday_hours, 8)               AS workday_hours,
    COALESCE(c.basic_salary, 0)                AS basic_salary,
    COALESCE(c.hra, 0)                         AS hra,
    COALESCE(c.transportation, 0)              AS transportation,
    COALESCE(c.other_allowances, 0)            AS other_allowances,
    (COALESCE(c.basic_salary, 0)
      + COALESCE(c.hra, 0)
      + COALESCE(c.transportation, 0)
      + COALESCE(c.other_allowances, 0))       AS total_monthly,
    COALESCE(pt.balance_hours, 0)              AS pto_balance_hours,
    ROUND(COALESCE(pt.balance_hours, 0) / NULLIF(COALESCE(p.workday_hours, 8), 0), 2)
                                               AS pto_balance_days,
    c.effective_from                           AS effective_from,
    v_calendar                                 AS days_in_calendar_month
  FROM profiles p
    LEFT JOIN comp  c  ON c.employee_id = p.id
    LEFT JOIN pto   pt ON pt.employee_id = p.id
    LEFT JOIN codes co ON co.employee_id = p.id
  WHERE p.is_active = true
    AND (p_department IS NULL OR p.department = p_department)
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION compute_predicted_payouts(INT, INT, TEXT) TO authenticated;

COMMENT ON FUNCTION compute_predicted_payouts IS
  'Forecast inputs for /admin/leave-payouts → Forecast tab. Returns comp at month_end + current PTO balance in days. The actual prediction math (days input, optional start_date range, per-row pay totals) is done client-side so HR can edit interactively.';
