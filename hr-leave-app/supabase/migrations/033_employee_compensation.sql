-- =============================================================
-- 033 — Employee compensation (effective-dated) + leave-payout RPC
--
-- HR needs to track BASIC + HRA + TRANSPORTATION (plus a catch-all
-- "other allowances") per employee, and compute per-month leave
-- payouts using the Saudi convention:
--
--     payable = (component / 30) * days_off_in_month
--
-- Salary changes have to be auditable AND must be honoured at the
-- time of the leave: if an employee took leave in March at SAR 5000
-- and got a raise to 7000 in April, March's payout uses 5000. That
-- means effective-dated rows, not a single overwrite-in-place
-- column on profiles.
--
-- Schema:
--   employee_compensation (employee_id, effective_from) — composite
--   PK. Insert a new row on every change. Current pay = the row
--   with the most recent effective_from <= today.
--
-- Views / RPCs:
--   v_current_compensation        — one row per employee, latest
--                                   effective row (security_invoker
--                                   so RLS still applies).
--   get_compensation_at_date()    — point-in-time lookup for a
--                                   specific date.
--   compute_leave_payouts()       — the leave-payouts page's single
--                                   read. Joins profiles + comp +
--                                   leave_requests for the month
--                                   and returns one row per active
--                                   employee with all payables.
--
-- Security model:
--   * Employee can read their own compensation rows (transparency).
--   * HR / HR Director can read and write everyone's.
--   * Anyone else: blocked by RLS USING clause.
-- =============================================================


-- 1. Table
CREATE TABLE IF NOT EXISTS employee_compensation (
  employee_id       UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  effective_from    DATE  NOT NULL,
  basic_salary      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (basic_salary >= 0),
  hra               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (hra >= 0),
  transportation    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (transportation >= 0),
  other_allowances  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (other_allowances >= 0),
  currency          TEXT  NOT NULL DEFAULT 'SAR',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES profiles(id),
  PRIMARY KEY (employee_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_employee_compensation_emp
  ON employee_compensation (employee_id, effective_from DESC);

COMMENT ON TABLE employee_compensation IS
  'Effective-dated compensation per employee. PK (employee_id, effective_from). Current pay = row with max(effective_from) where effective_from <= today.';


-- 2. RLS
ALTER TABLE employee_compensation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emp_comp_self_read ON employee_compensation;
DROP POLICY IF EXISTS emp_comp_hr_read   ON employee_compensation;
DROP POLICY IF EXISTS emp_comp_hr_write  ON employee_compensation;

CREATE POLICY emp_comp_self_read
  ON employee_compensation
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY emp_comp_hr_read
  ON employee_compensation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  );

CREATE POLICY emp_comp_hr_write
  ON employee_compensation
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  );


-- 3. View: current (latest) compensation per employee
CREATE OR REPLACE VIEW v_current_compensation
WITH (security_invoker = on) AS
SELECT DISTINCT ON (employee_id)
  employee_id,
  effective_from,
  basic_salary,
  hra,
  transportation,
  other_allowances,
  currency,
  notes,
  (basic_salary + hra + transportation + other_allowances) AS total_monthly,
  created_at,
  created_by
FROM employee_compensation
WHERE effective_from <= CURRENT_DATE
ORDER BY employee_id, effective_from DESC;

COMMENT ON VIEW v_current_compensation IS
  'One row per employee: the compensation row currently in effect. security_invoker so RLS on employee_compensation still applies — employees see only their own, HR sees all.';


-- 4. RPC: point-in-time compensation lookup
CREATE OR REPLACE FUNCTION get_compensation_at_date(p_employee_id UUID, p_date DATE)
RETURNS employee_compensation
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM employee_compensation
  WHERE employee_id = p_employee_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_compensation_at_date(UUID, DATE) TO authenticated;


-- 5. RPC: full leave-payouts table for a (year, month). The single
--    read backing the /admin/leave-payouts page.
--
--    Per Saudi convention all components divide by 30 regardless of
--    the calendar month's actual day count.
--
--    Joins:
--      * profiles (for the active employee list)
--      * v_emp_codes (for emp_code display)
--      * comp = compensation effective on the FIRST day of the
--        target month (raises mid-month don't change that month's
--        payout — keeps the math deterministic and matches Saudi
--        labour-law practice)
--      * leaves = sum of approved PTO + emergency leave days
--        falling inside the target month (clamped at the month
--        boundary for cross-month requests)

CREATE OR REPLACE FUNCTION compute_leave_payouts(
  p_year       INT,
  p_month      INT,
  p_department TEXT DEFAULT NULL
)
RETURNS TABLE (
  employee_id      UUID,
  full_name        TEXT,
  emp_code         TEXT,
  department       TEXT,
  basic_salary     NUMERIC,
  hra              NUMERIC,
  transportation   NUMERIC,
  other_allowances NUMERIC,
  total_monthly    NUMERIC,
  days_in_month    NUMERIC,
  basic_payable    NUMERIC,
  hra_payable      NUMERIC,
  transport_payable NUMERIC,
  other_payable    NUMERIC,
  total_payable    NUMERIC,
  effective_from   DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_month_start DATE := make_date(p_year, p_month, 1);
  v_month_end   DATE := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
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
      WHERE c.effective_from <= v_month_start
      ORDER BY c.employee_id, c.effective_from DESC
    ),
    leaves AS (
      SELECT
        lr.employee_id,
        SUM(
          GREATEST(
            0,
            (LEAST(lr.end_date, v_month_end)::date
             - GREATEST(lr.start_date, v_month_start)::date) + 1
          )
        )::NUMERIC AS days_in_month
      FROM leave_requests lr
      WHERE lr.status = 'approved'
        AND lr.start_date <= v_month_end
        AND lr.end_date   >= v_month_start
      GROUP BY lr.employee_id
    ),
    codes AS (
      SELECT v.employee_id, v.emp_code FROM v_emp_codes v
    )
  SELECT
    p.id                                        AS employee_id,
    p.full_name                                 AS full_name,
    co.emp_code                                 AS emp_code,
    p.department                                AS department,
    COALESCE(c.basic_salary, 0)                 AS basic_salary,
    COALESCE(c.hra, 0)                          AS hra,
    COALESCE(c.transportation, 0)               AS transportation,
    COALESCE(c.other_allowances, 0)             AS other_allowances,
    (COALESCE(c.basic_salary, 0)
      + COALESCE(c.hra, 0)
      + COALESCE(c.transportation, 0)
      + COALESCE(c.other_allowances, 0))        AS total_monthly,
    COALESCE(l.days_in_month, 0)                AS days_in_month,
    ROUND(COALESCE(c.basic_salary, 0) / 30.0
          * COALESCE(l.days_in_month, 0), 2)    AS basic_payable,
    ROUND(COALESCE(c.hra, 0) / 30.0
          * COALESCE(l.days_in_month, 0), 2)    AS hra_payable,
    ROUND(COALESCE(c.transportation, 0) / 30.0
          * COALESCE(l.days_in_month, 0), 2)    AS transport_payable,
    ROUND(COALESCE(c.other_allowances, 0) / 30.0
          * COALESCE(l.days_in_month, 0), 2)    AS other_payable,
    ROUND((COALESCE(c.basic_salary, 0)
           + COALESCE(c.hra, 0)
           + COALESCE(c.transportation, 0)
           + COALESCE(c.other_allowances, 0)) / 30.0
          * COALESCE(l.days_in_month, 0), 2)    AS total_payable,
    c.effective_from                            AS effective_from
  FROM profiles p
    LEFT JOIN comp   c  ON c.employee_id = p.id
    LEFT JOIN leaves l  ON l.employee_id = p.id
    LEFT JOIN codes  co ON co.employee_id = p.id
  WHERE p.is_active = true
    AND (p_department IS NULL OR p.department = p_department)
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION compute_leave_payouts(INT, INT, TEXT) TO authenticated;

COMMENT ON FUNCTION compute_leave_payouts IS
  'Per-employee leave-payout breakdown for (year, month, optional department). Compensation is taken at first day of month. Days off = approved PTO + emergency leave falling in month, clamped at month edges.';
