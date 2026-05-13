-- =============================================================
-- 034 — Leave-payouts: use month_end (not month_start) for the
-- compensation snapshot.
--
-- Why this changed:
--   The original RPC pegged the compensation lookup to the FIRST
--   of the target month, on the theory that "salary in effect at
--   month start" is the basis for that month's leave pay. In
--   practice HR enters new comp rows DURING the month (e.g. a new
--   hire on May 13 gets their first comp row dated 2026-05-13).
--   Pegged at month_start, the May 1 lookup misses that row and
--   the payout for May shows 0 across the board.
--
--   Semantics that match HR's mental model: "what was their pay
--   for that month?" — use the most recent comp row with
--   effective_from <= month_end. A mid-month raise still applies
--   to the whole month (simple, matches typical Saudi payroll
--   practice; we can switch to prorating later if needed).
--
--   Past months stay correct because effective_from rows from
--   after that month's end are still excluded. Future months pick
--   up pre-recorded raises (effective_from inside that month or
--   before).
--
-- This migration replaces the function body. Signature and return
-- shape are unchanged — the client doesn't need to know.
-- =============================================================

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
      -- Changed: month_end instead of month_start (see header).
      WHERE c.effective_from <= v_month_end
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
