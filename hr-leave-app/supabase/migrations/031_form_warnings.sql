-- =============================================================
-- 031 — Uncompleted-form warning system
--
-- Companion to the three-action HR flow (Send Invite / Send Reset
-- Password / Send Info Form Request). When HR puts an employee back
-- into pending_info or info_rejected, a clock starts. After 3 calendar
-- days of no resubmit the employee gets a reminder email; on day 4 a
-- "salary will be held" email goes out. HR + HR Director are CC'd on
-- both so they know the policy is being enforced.
--
-- Schema:
--   * profiles.warn_on_uncompleted_form — per-employee opt-in (default
--     true for normal hires; HR can switch off for special cases via
--     the Edit Employee dialog).
--   * form_warnings_log — append-only audit; UNIQUE on
--     (employee_id, warning_type, sent_date) so the daily cron is
--     idempotent. Re-run safe; only one row per warning per day.
--
-- RPC send_form_warnings_check() is the daily entry point. It scans
-- everyone in pending_info / info_rejected with the opt-in flag on,
-- computes "days since the form went incomplete" (uses
-- profiles.updated_at as the proxy — when the demote happened), and
-- enqueues whichever warnings are due. Returns counts for visibility.
--
-- We DO NOT send emails from inside the RPC. Sending is the caller's
-- job (the edge function `send-registration-email`) so the same
-- service is used for ad-hoc HR warnings too. The RPC just decides
-- WHO gets WHICH warning today and records it; the caller iterates
-- the returned list and fires the emails.
-- =============================================================


-- 1. Per-employee opt-in column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS warn_on_uncompleted_form BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.warn_on_uncompleted_form IS
  'When true (default), the daily form-warnings cron emails the employee + HR if their registration form sits in pending_info / info_rejected past the grace period.';


-- 2. Audit log
CREATE TABLE IF NOT EXISTS form_warnings_log (
  id                     BIGSERIAL PRIMARY KEY,
  employee_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warning_type           TEXT NOT NULL CHECK (warning_type IN ('day3_reminder', 'day4_salary_hold', 'manual')),
  status_at_send         TEXT NOT NULL,
  days_in_status         INT  NOT NULL,
  sent_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_date              DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  performed_by           UUID REFERENCES profiles(id),
  message                TEXT,
  UNIQUE (employee_id, warning_type, sent_date)
);

CREATE INDEX IF NOT EXISTS idx_form_warnings_log_employee
  ON form_warnings_log (employee_id, sent_at DESC);

ALTER TABLE form_warnings_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS form_warnings_log_self_read ON form_warnings_log;
DROP POLICY IF EXISTS form_warnings_log_hr_read   ON form_warnings_log;

CREATE POLICY form_warnings_log_self_read
  ON form_warnings_log
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY form_warnings_log_hr_read
  ON form_warnings_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
  );

-- Writes go through the SECURITY DEFINER RPC; no INSERT policy.


-- 3. RPC: compute which warnings are due TODAY and return the list.
--
-- The caller (edge function or admin button) then iterates the result
-- and sends the actual emails. We log here so we don't double-record
-- if the email send fails — same as the leave_accruals pattern.

CREATE OR REPLACE FUNCTION send_form_warnings_check(p_dry_run BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now           TIMESTAMPTZ := now();
  v_today         DATE        := (v_now AT TIME ZONE 'UTC')::date;
  v_emp           RECORD;
  v_days          INT;
  v_warning_type  TEXT;
  v_caller        UUID := auth.uid();
  v_results       JSONB := '[]'::jsonb;
  v_count_day3    INT := 0;
  v_count_day4    INT := 0;
BEGIN
  FOR v_emp IN
    SELECT id, email, full_name, registration_status, updated_at
      FROM profiles
     WHERE is_active = true
       AND warn_on_uncompleted_form = true
       AND registration_status IN ('pending_info', 'info_rejected')
  LOOP
    v_days := GREATEST(0, (v_today - (v_emp.updated_at AT TIME ZONE 'UTC')::date)::int);

    -- Day 4+: salary-hold warning. Higher severity wins so we don't
    -- ALSO send the day-3 reminder on the same day if both are due.
    IF v_days >= 4 THEN
      v_warning_type := 'day4_salary_hold';
    ELSIF v_days >= 3 THEN
      v_warning_type := 'day3_reminder';
    ELSE
      CONTINUE;
    END IF;

    -- Skip if we've already sent this warning_type today for this employee.
    IF EXISTS (
      SELECT 1 FROM form_warnings_log
       WHERE employee_id  = v_emp.id
         AND warning_type = v_warning_type
         AND sent_date    = v_today
    ) THEN
      CONTINUE;
    END IF;

    IF NOT p_dry_run THEN
      INSERT INTO form_warnings_log (employee_id, warning_type, status_at_send, days_in_status, performed_by)
      VALUES (v_emp.id, v_warning_type, v_emp.registration_status, v_days, v_caller);
    END IF;

    IF v_warning_type = 'day3_reminder' THEN v_count_day3 := v_count_day3 + 1;
    ELSE v_count_day4 := v_count_day4 + 1;
    END IF;

    v_results := v_results || jsonb_build_object(
      'employee_id', v_emp.id,
      'email',       v_emp.email,
      'full_name',   v_emp.full_name,
      'status',      v_emp.registration_status,
      'days',        v_days,
      'warning_type', v_warning_type
    );
  END LOOP;

  RETURN jsonb_build_object(
    'today',     v_today,
    'day3_count', v_count_day3,
    'day4_count', v_count_day4,
    'recipients', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_form_warnings_check(BOOLEAN) TO authenticated;


-- 4. RPC: log a manual warning (used by the "Send Warning" button).
--    Always logs, no idempotency — HR firing a manual one is intentional.

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

  SELECT registration_status, (now()::date - (updated_at AT TIME ZONE 'UTC')::date)::int AS days
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


-- 5. pg_cron schedule (best-effort)
-- Daily at 06:00 UTC = 09:00 Saudi Arabia time. The check is dry-run
-- by default ONLY in tests; production schedule logs + lets the
-- companion edge function actually send the emails.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('daily_form_warnings_check')
      FROM cron.job WHERE jobname = 'daily_form_warnings_check';

    PERFORM cron.schedule(
      'daily_form_warnings_check',
      '0 6 * * *',
      $cron$
        SELECT send_form_warnings_check(false);
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling for form warnings skipped: %', SQLERRM;
END $$;


COMMENT ON TABLE form_warnings_log IS
  'Audit log for uncompleted-form warning emails. UNIQUE(employee, warning_type, sent_date) makes the daily cron idempotent.';

COMMENT ON FUNCTION send_form_warnings_check IS
  'Daily cron entry point. Scans active employees in pending_info / info_rejected with warn_on_uncompleted_form=true, logs which warnings are due (day3 reminder at >=3 days, day4 salary-hold at >=4), returns the recipient list as JSONB. Caller (edge function) iterates and sends emails. p_dry_run=true skips the log writes (useful for previewing).';
