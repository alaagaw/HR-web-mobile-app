-- =============================================================
-- 030 — Monthly PTO accruals: schema + RPC + default entitlement
--
-- Replaces the Excel formula
--   =IF([Entitled/YEAR]=30, [prev]+2.5, [prev]+1.75)
-- with a managed, idempotent, audited monthly accrual:
--
--   monthly_days  = annual_leave_entitlement_days / 12
--   monthly_hours = monthly_days * profile.workday_hours
--
-- Design notes:
--   * `leave_accruals` is the bookkeeping table — one row per
--     (employee, leave_type, year, month). UNIQUE prevents double
--     credit even if the cron, lazy fallback, and manual button all
--     fire on the same morning.
--   * `apply_monthly_accruals(year, month, employee_id?)` is the
--     single entry point. Pass NULL for the employee to run for all
--     active employees (cron / manual button). Pass a UUID to run
--     for just one (lazy fallback on individual balance reads).
--   * Carry-over: previous year's balance is preserved unchanged.
--     The new January row inherits the prior balance + this month's
--     accrual. used_hours resets to 0 for the new year.
--   * Audit: every successful accrual writes BOTH a leave_accruals
--     row AND a leave_ledger row with reason='accrual' so the
--     existing Balance Ledger UI surfaces it alongside manual edits
--     and deductions.
-- =============================================================


-- 1. Default 21 days for anyone still NULL
-- -------------------------------------------------------------
-- Per agreed policy: every active employee has an entitlement.
-- 21 is the Saudi-default for <5 years tenure; HR overrides via
-- Edit Employee.
UPDATE profiles
SET annual_leave_entitlement_days = 21,
    updated_at = now()
WHERE annual_leave_entitlement_days IS NULL;


-- 2. Bookkeeping table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_accruals (
  id                            BIGSERIAL PRIMARY KEY,
  employee_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type                    TEXT NOT NULL CHECK (leave_type IN ('pto')),
  year                          INT  NOT NULL,
  month                         INT  NOT NULL CHECK (month BETWEEN 1 AND 12),
  entitlement_days_at_accrual   NUMERIC(5,1) NOT NULL,
  workday_hours_at_accrual      NUMERIC(4,2) NOT NULL,
  accrued_days                  NUMERIC(5,2) NOT NULL,
  accrued_hours                 NUMERIC(8,2) NOT NULL,
  balance_after_hours           NUMERIC(8,2) NOT NULL,
  source                        TEXT NOT NULL DEFAULT 'system'
                                CHECK (source IN ('system', 'lazy', 'manual', 'backfill')),
  performed_by                  UUID REFERENCES profiles(id),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type, year, month)
);

CREATE INDEX IF NOT EXISTS idx_leave_accruals_emp_year_month
  ON leave_accruals (employee_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_leave_accruals_run
  ON leave_accruals (year, month, created_at DESC);

ALTER TABLE leave_accruals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_accruals_self_read ON leave_accruals;
DROP POLICY IF EXISTS leave_accruals_hr_read   ON leave_accruals;

CREATE POLICY leave_accruals_self_read
  ON leave_accruals
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY leave_accruals_hr_read
  ON leave_accruals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  );

-- No INSERT/UPDATE policy: writes only happen via the SECURITY DEFINER RPC.


-- 3. RPC: apply_monthly_accruals(year, month, employee_id?)
-- -------------------------------------------------------------
-- Idempotent. Safe to call from any caller (the UNIQUE constraint
-- on leave_accruals catches duplicates inside the row loop so a
-- partial run can be retried). Returns JSON for visibility.

CREATE OR REPLACE FUNCTION apply_monthly_accruals(
  p_year        INT,
  p_month       INT,
  p_employee_id UUID DEFAULT NULL,
  p_source      TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp                  RECORD;
  v_year                 INT  := p_year;
  v_month                INT  := p_month;
  v_entitlement_days     NUMERIC(5,1);
  v_workday_hours        NUMERIC(4,2);
  v_monthly_days         NUMERIC(5,2);
  v_monthly_hours        NUMERIC(8,2);
  v_balance              NUMERIC(8,2);
  v_used                 NUMERIC(8,2);
  v_prev_balance         NUMERIC(8,2);
  v_accrued_count        INT := 0;
  v_skipped_count        INT := 0;
  v_error_count          INT := 0;
  v_errors               JSONB := '[]'::jsonb;
  v_caller               UUID := auth.uid();
BEGIN
  -- Validate inputs
  IF v_year IS NULL OR v_month IS NULL OR v_month < 1 OR v_month > 12 THEN
    RAISE EXCEPTION 'Invalid year/month: %/%', v_year, v_month;
  END IF;

  -- Source must be one of the allowed values; fall through to 'system'
  -- for anything weird so we never reject a legitimate call.
  IF p_source IS NULL OR p_source NOT IN ('system','lazy','manual','backfill') THEN
    p_source := 'system';
  END IF;

  -- Iterate the target employees
  FOR v_emp IN
    SELECT id, is_active, annual_leave_entitlement_days, workday_hours
      FROM profiles
     WHERE (p_employee_id IS NULL OR id = p_employee_id)
       AND is_active = true
  LOOP
    BEGIN
      v_entitlement_days := COALESCE(v_emp.annual_leave_entitlement_days, 21);
      v_workday_hours    := COALESCE(v_emp.workday_hours, 8);

      -- Excel rule generalised: monthly accrual = annual_days / 12.
      -- Store hours too so the leave_balances bookkeeping stays in
      -- the same unit it has always used.
      v_monthly_days  := ROUND(v_entitlement_days / 12.0, 2);
      v_monthly_hours := ROUND(v_monthly_days * v_workday_hours, 2);

      -- Find or create the (employee, pto, year) balance row.
      SELECT balance_hours, used_hours
        INTO v_balance, v_used
        FROM leave_balances
       WHERE employee_id = v_emp.id
         AND leave_type  = 'pto'
         AND year        = v_year;

      IF NOT FOUND THEN
        -- Year rollover (or first ever): carry over previous year's
        -- balance unchanged, then we'll add this month on top.
        SELECT balance_hours
          INTO v_prev_balance
          FROM leave_balances
         WHERE employee_id = v_emp.id
           AND leave_type  = 'pto'
           AND year        = v_year - 1
         ORDER BY year DESC
         LIMIT 1;

        INSERT INTO leave_balances (employee_id, leave_type, balance_hours, used_hours, year, updated_at)
        VALUES (v_emp.id, 'pto', COALESCE(v_prev_balance, 0), 0, v_year, now());

        v_balance := COALESCE(v_prev_balance, 0);
        v_used    := 0;
      END IF;

      -- Try to record this month's accrual. UNIQUE on
      -- (employee_id, leave_type, year, month) means a re-run is a
      -- no-op: the INSERT fails, we catch unique_violation, and
      -- mark this employee as skipped.
      BEGIN
        INSERT INTO leave_accruals (
          employee_id, leave_type, year, month,
          entitlement_days_at_accrual, workday_hours_at_accrual,
          accrued_days, accrued_hours, balance_after_hours,
          source, performed_by
        ) VALUES (
          v_emp.id, 'pto', v_year, v_month,
          v_entitlement_days, v_workday_hours,
          v_monthly_days, v_monthly_hours, v_balance + v_monthly_hours,
          p_source, v_caller
        );
      EXCEPTION WHEN unique_violation THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END;

      -- Apply the accrual to the balance.
      UPDATE leave_balances
         SET balance_hours = balance_hours + v_monthly_hours,
             updated_at    = now()
       WHERE employee_id = v_emp.id
         AND leave_type  = 'pto'
         AND year        = v_year;

      -- Write the matching ledger row so existing UIs (Balance Ledger,
      -- audit reports) show the accrual alongside manual adjustments.
      INSERT INTO leave_ledger (employee_id, leave_type, change_hours, reason, performed_by)
      VALUES (v_emp.id, 'pto', v_monthly_hours, 'accrual', v_caller);

      v_accrued_count := v_accrued_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'employee_id', v_emp.id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'year',     v_year,
    'month',    v_month,
    'accrued',  v_accrued_count,
    'skipped',  v_skipped_count,
    'errors',   v_error_count,
    'error_details', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_monthly_accruals(INT, INT, UUID, TEXT) TO authenticated;


-- 4. Convenience: apply_current_month_accrual_for_user(user_id)
-- -------------------------------------------------------------
-- One-shot version the client uses as a "lazy fallback": when an
-- employee views their balance, the hook calls this RPC. The UNIQUE
-- constraint keeps it cheap and idempotent.

CREATE OR REPLACE FUNCTION apply_current_month_accrual_for_user(p_employee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  RETURN apply_monthly_accruals(
    EXTRACT(YEAR FROM v_now)::int,
    EXTRACT(MONTH FROM v_now)::int,
    p_employee_id,
    'lazy'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_current_month_accrual_for_user(UUID) TO authenticated;


-- 5. pg_cron schedule (optional — try, ignore if extension absent)
-- -------------------------------------------------------------
-- Runs at 00:05 on day 1 of each month, applies the current month
-- for all active employees. Wrapped in a DO block so the migration
-- still succeeds when pg_cron isn't enabled on this project (the
-- lazy fallback + manual button still cover correctness in that
-- case; cron is just convenience).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('monthly_pto_accrual')
      FROM cron.job WHERE jobname = 'monthly_pto_accrual';

    PERFORM cron.schedule(
      'monthly_pto_accrual',
      '5 0 1 * *',  -- 00:05 on the 1st of every month (UTC)
      $cron$
        SELECT apply_monthly_accruals(
          EXTRACT(YEAR  FROM now())::int,
          EXTRACT(MONTH FROM now())::int,
          NULL,
          'system'
        );
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the migration if cron scheduling errors out. The
  -- lazy fallback + manual button paths still apply the accruals.
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;


COMMENT ON TABLE leave_accruals IS
  'Per-month PTO accrual bookkeeping. One row per (employee, leave_type, year, month). UNIQUE on those four prevents double-credit. Written only by apply_monthly_accruals.';

COMMENT ON FUNCTION apply_monthly_accruals IS
  'Idempotent monthly PTO accrual. Three call patterns: NULL employee = bulk (cron / manual button), specific UUID = lazy fallback on balance read. Source argument tags the row in leave_accruals.source for audit.';
