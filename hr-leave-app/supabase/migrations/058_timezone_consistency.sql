-- ============================================================
-- 058 – Timezone consistency for date-semantic SQL
--
-- WHY
--   The app's canonical business day is Asia/Riyadh (UTC+3, no DST),
--   fixed for ALL users and server jobs. A few SQL expressions derived
--   "today"/"this month" from session-timezone `CURRENT_DATE` /
--   `now()::date` / `EXTRACT(... FROM now())`. Supabase sessions
--   default to UTC, so near a day/month boundary those expressions
--   disagreed with the Riyadh business calendar (and, for form
--   warnings, with the system's own UTC-keyed ledger). This migration
--   makes every such expression explicit.
--
--   The matching client-side fix lives in hr-leave-app/lib/date-only.ts
--   (single source of truth for date-only handling).
--
-- SCOPE / SAFETY
--   * No column type changes, no data writes — pure CREATE OR REPLACE
--     of two functions + one view, plus a pg_cron re-schedule. Safe to
--     re-run; safe to apply via `supabase db query --linked`.
--   * NOT auto-deployed. Review, then apply manually.
--   * Deploy at a non-boundary time (not within ~3h of local midnight,
--     and not on the 1st of a month) so H2/H3's month anchor does not
--     change under a request mid-flight.
--   * Before deploying H3, run the leave_accruals reconciliation in
--     supabase/diagnostics/date_shift_audit.sql and confirm no row's
--     (year,month) disagrees with its created_at Riyadh month.
--
-- DECISION NOTE — why H1 uses UTC, not Riyadh
--   The form-warnings subsystem is a deliberately closed, UTC-keyed
--   ledger: the automated scan (042 send_form_warnings_check) anchors
--   on (now() AT TIME ZONE 'UTC')::date and the idempotency key
--   form_warnings_log.sent_date defaults to the UTC date by design
--   (031, audited as intentional). The bug there is purely that the
--   MANUAL path mixed session-tz now()::date with UTC on the other
--   side of the subtraction. The minimal, lowest-risk, internally
--   consistent fix is to make the manual path UTC like the scan —
--   re-anchoring the whole salary-hold engine + idempotency key to
--   Riyadh would be a behavioural change to salary withholding and a
--   column-default migration, both out of scope here. Riyadh remains
--   canonical for user-facing dates (H2, H3, all client code).
-- ============================================================


-- ── H3a — PTO accrual: lazy fallback anchors month to Riyadh ──
-- Was: EXTRACT(YEAR/MONTH FROM now())  [session-tz timestamptz]
-- Now: EXTRACT from the Riyadh calendar date (tz-immune once a DATE).
CREATE OR REPLACE FUNCTION apply_current_month_accrual_for_user(p_employee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Asia/Riyadh calendar day; AT TIME ZONE on a timestamptz yields the
  -- Riyadh wall-clock timestamp, ::date gives that calendar date.
  v_riyadh_date DATE := (now() AT TIME ZONE 'Asia/Riyadh')::date;
BEGIN
  RETURN apply_monthly_accruals(
    EXTRACT(YEAR  FROM v_riyadh_date)::int,
    EXTRACT(MONTH FROM v_riyadh_date)::int,
    p_employee_id,
    'lazy'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_current_month_accrual_for_user(UUID) TO authenticated;


-- ── H3b — PTO accrual cron: anchor month to Riyadh ───────────
-- The job still fires at 00:05 UTC on the 1st (= 03:05 Riyadh on the
-- 1st, safely inside the Riyadh 1st), but now derives the month from
-- the Riyadh date so the lazy path and the cron path always agree.
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
          EXTRACT(YEAR  FROM (now() AT TIME ZONE 'Asia/Riyadh')::date)::int,
          EXTRACT(MONTH FROM (now() AT TIME ZONE 'Asia/Riyadh')::date)::int,
          NULL,
          'system'
        );
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;


-- ── H2 — current-month overtime view: anchor to Riyadh ───────
-- Was: date_trunc('month', CURRENT_DATE)  [session-tz]
-- Now: date_trunc on the Riyadh calendar date, so the month resets on
-- the Riyadh 1st for every viewer regardless of connection timezone.
CREATE OR REPLACE VIEW v_employee_overtime_current_month AS
WITH anchor AS (
  SELECT (now() AT TIME ZONE 'Asia/Riyadh')::date AS today
)
SELECT
  te.employee_id,
  COALESCE(SUM(te.overtime_hours), 0)::numeric(8,1)                    AS overtime_hours_total,
  date_trunc('month', a.today)::date                                   AS month_start,
  (date_trunc('month', a.today) + interval '1 month' - interval '1 day')::date AS month_end
FROM timesheet_entries te
CROSS JOIN anchor a
WHERE te.employee_id IS NOT NULL
  AND te.entry_date >= date_trunc('month', a.today)::date
  AND te.entry_date <  (date_trunc('month', a.today) + interval '1 month')::date
GROUP BY te.employee_id, a.today;


-- ── H1 — manual form-warning days: match the scan's UTC clock ─
-- Was: now()::date (session-tz) − (... AT TIME ZONE 'UTC')::date
-- Now: both sides UTC, identical to 042 send_form_warnings_check
-- (v_today := (now() AT TIME ZONE 'UTC')::date). See DECISION NOTE.
CREATE OR REPLACE FUNCTION log_manual_form_warning(
  p_employee_id UUID,
  p_message     TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id            BIGINT;
  v_caller        UUID := auth.uid();
  v_caller_role   TEXT;
  v_emp           RECORD;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller;
  IF v_caller_role NOT IN ('hr', 'hr_director') THEN
    RAISE EXCEPTION 'Only HR can send manual form warnings';
  END IF;

  SELECT registration_status,
         ((now() AT TIME ZONE 'UTC')::date
          - (COALESCE(form_request_sent_at, updated_at) AT TIME ZONE 'UTC')::date)::int AS days
    INTO v_emp
    FROM profiles
   WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  INSERT INTO form_warnings_log (
    employee_id, warning_type, status_at_send, days_in_status, performed_by, message
  ) VALUES (
    p_employee_id, 'manual', v_emp.registration_status, COALESCE(v_emp.days, 0), v_caller, p_message
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_manual_form_warning(UUID, TEXT) TO authenticated;
