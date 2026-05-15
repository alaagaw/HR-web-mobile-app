-- =============================================================
-- 042 — Registration-lifecycle: audit trail + transition chokepoint
--
-- Why:
--   The "Send info-form request" action overwrote registration_status
--   to 'info_rejected' for ANY employee — including already-approved
--   (active) ones — with no audit trail and a misleading "rejected"
--   email/notification. There was also no history of who moved an
--   employee between registration states, when, or from what.
--
-- What this migration adds:
--   1. profile_audit_log.changed_by → nullable, so system/cron/
--      service-role writes (auth.uid() IS NULL) can be recorded.
--   2. profiles.form_request_sent_at — set ONLY when HR sends a form
--      request (first invite, re-verification, info-form request).
--      The form-warning clock now counts from here, not updated_at.
--   3. trg_profiles_log_registration_status — AFTER UPDATE trigger
--      that logs every registration_status / registration_note change
--      into profile_audit_log (context='registration_lifecycle'),
--      regardless of which code path made it.
--   4. hr_set_registration_status(p_user_id, p_action, p_note) —
--      SECURITY DEFINER, HR-only chokepoint that enforces the legal
--      transition map for approve / reject / request_info.
--   5. send_form_warnings_check rewritten to the agreed rule:
--      warn ONLY when HR sent a form (form_request_sent_at IS NOT
--      NULL) and the employee hasn't submitted since that send.
--   6. Backfill form_request_sent_at for in-flight pending rows so
--      cron behaviour is continuous (no sudden gap or blast).
--
-- Re-runnable: every CREATE is CREATE OR REPLACE / IF NOT EXISTS and
-- the trigger is dropped before re-create.
-- =============================================================


-- 1. Allow system/cron writes in the audit log -------------------------

ALTER TABLE profile_audit_log
  ALTER COLUMN changed_by DROP NOT NULL;

COMMENT ON COLUMN profile_audit_log.changed_by IS
  'Actor who made the change. NULL = system / cron / service-role write (no auth.uid() in context).';


-- 2. The HR-send clock -------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS form_request_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.form_request_sent_at IS
  'When HR last SENT this employee a form request (first invite, re-verification, or info-form request). The day-3/day-4 form-warning clock counts from here. NULL = HR never sent a form request → no warnings.';


-- 3. Audit trigger: log every status / note transition -----------------
-- SECURITY DEFINER so the INSERT into profile_audit_log (RLS-enabled,
-- no INSERT policy) succeeds for ANY caller — HR service calls, the
-- submit RPC, edge functions (service role), and pg_cron alike.

CREATE OR REPLACE FUNCTION log_registration_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.registration_status IS DISTINCT FROM OLD.registration_status THEN
    INSERT INTO profile_audit_log
      (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES
      (NEW.id, 'profiles', 'registration_status',
       OLD.registration_status, NEW.registration_status,
       auth.uid(), 'registration_lifecycle');
  END IF;

  IF NEW.registration_note IS DISTINCT FROM OLD.registration_note THEN
    INSERT INTO profile_audit_log
      (profile_id, table_name, field_name, old_value, new_value, changed_by, context)
    VALUES
      (NEW.id, 'profiles', 'registration_note',
       OLD.registration_note, NEW.registration_note,
       auth.uid(), 'registration_lifecycle');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_log_registration_status ON profiles;

CREATE TRIGGER trg_profiles_log_registration_status
  AFTER UPDATE OF registration_status, registration_note ON profiles
  FOR EACH ROW
  WHEN (OLD.registration_status IS DISTINCT FROM NEW.registration_status
        OR OLD.registration_note IS DISTINCT FROM NEW.registration_note)
  EXECUTE FUNCTION log_registration_status_change();


-- 4. Transition chokepoint --------------------------------------------
-- Single HR-only entry point for the three registration-state actions.
-- Enforces the legal transition map; the trigger above audits the write.
--
--   approve       : anything-but-active → active   (clears note)
--   reject        : pending_approval    → info_rejected (note required;
--                   stamps form_request_sent_at — a send-back IS HR
--                   asking the employee to refill, so the warning clock
--                   must restart from here)
--   request_info  : active             → pending_info  (note optional,
--                   stamps form_request_sent_at)
--                   pending_info / info_rejected → unchanged status but
--                   re-stamps form_request_sent_at (HR re-sent / nudged)

CREATE OR REPLACE FUNCTION hr_set_registration_status(
  p_user_id UUID,
  p_action  TEXT,
  p_note    TEXT DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_cur         profiles%ROWTYPE;
  v_new         profiles%ROWTYPE;
  v_note        TEXT := NULLIF(trim(COALESCE(p_note, '')), '');
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('hr', 'hr_director') THEN
    RAISE EXCEPTION 'Only HR can change registration status';
  END IF;

  SELECT * INTO v_cur FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_user_id;
  END IF;

  IF p_action = 'approve' THEN
    IF v_cur.registration_status = 'active' THEN
      RETURN v_cur;  -- idempotent no-op
    END IF;
    UPDATE profiles
       SET registration_status = 'active',
           registration_note   = NULL,
           updated_at          = now()
     WHERE id = p_user_id
     RETURNING * INTO v_new;

  ELSIF p_action = 'reject' THEN
    IF v_cur.registration_status <> 'pending_approval' THEN
      RAISE EXCEPTION
        'Can only send a submission back for changes while it is pending approval (current status: %)',
        v_cur.registration_status;
    END IF;
    IF v_note IS NULL THEN
      RAISE EXCEPTION 'A comment is required when sending a registration back for changes';
    END IF;
    -- form_request_sent_at restarts here: the employee submitted, HR
    -- sent it back, so the day-3/day-4 clock must run from the send-back
    -- (otherwise registration_submitted_at >= the old invite timestamp
    -- would permanently exclude them from the warning scan).
    UPDATE profiles
       SET registration_status  = 'info_rejected',
           registration_note    = v_note,
           form_request_sent_at = now(),
           updated_at           = now()
     WHERE id = p_user_id
     RETURNING * INTO v_new;

  ELSIF p_action = 'request_info' THEN
    -- Only meaningful for an already-onboarded employee, or a re-send
    -- to someone we already asked. Blocks not_invited / email_unverified
    -- (use Send Invite) and pending_approval (they already submitted —
    -- use 'reject' to send it back with a comment).
    IF v_cur.registration_status NOT IN ('active', 'pending_info', 'info_rejected') THEN
      RAISE EXCEPTION
        'Info-form requests can only be sent to an approved employee or re-sent to one already asked (current status: %)',
        v_cur.registration_status;
    END IF;
    UPDATE profiles
       SET registration_status  = CASE
                                     WHEN v_cur.registration_status = 'active'
                                       THEN 'pending_info'
                                     ELSE v_cur.registration_status
                                   END,
           -- Update the note only when HR supplied one; a bare re-send
           -- keeps the previous note.
           registration_note    = COALESCE(v_note, v_cur.registration_note),
           form_request_sent_at = now(),
           updated_at           = now()
     WHERE id = p_user_id
     RETURNING * INTO v_new;

  ELSE
    RAISE EXCEPTION 'Unknown action: % (expected approve | reject | request_info)', p_action;
  END IF;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION hr_set_registration_status(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION hr_set_registration_status IS
  'HR-only registration-state chokepoint. p_action ∈ approve|reject|request_info. Enforces the legal transition map; request_info stamps form_request_sent_at. All status/note changes are auto-audited via trg_profiles_log_registration_status.';


-- 5. Rewrite the form-warning scan to the agreed rule ------------------
-- Warn ONLY when HR actually sent a form (form_request_sent_at set) and
-- the employee has NOT submitted since that send. Count days from the
-- send, never from generic updated_at.

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
    SELECT id, email, full_name, registration_status, form_request_sent_at
      FROM profiles
     WHERE is_active = true
       AND warn_on_uncompleted_form = true
       AND registration_status IN ('pending_info', 'info_rejected')
       -- The clock only runs if HR actually sent a form...
       AND form_request_sent_at IS NOT NULL
       -- ...and the employee hasn't completed it since that send.
       AND (registration_submitted_at IS NULL
            OR registration_submitted_at < form_request_sent_at)
  LOOP
    v_days := GREATEST(0, (v_today - (v_emp.form_request_sent_at AT TIME ZONE 'UTC')::date)::int);

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

COMMENT ON FUNCTION send_form_warnings_check IS
  'Daily cron entry point. Warns only employees HR actually sent a form to (form_request_sent_at IS NOT NULL) who have NOT submitted since that send and are still in pending_info / info_rejected with warn_on_uncompleted_form=true. Days counted from form_request_sent_at. day3 reminder at >=3, day4 salary-hold at >=4. p_dry_run=true skips the log writes.';

-- Keep the manual-warning days figure consistent with the new clock.
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
         (now()::date
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


-- 6. Backfill: keep the cron continuous for in-flight employees --------
-- Anyone currently sitting in a form-pending state was (under the old
-- code) measured from updated_at. Seed form_request_sent_at from that
-- so we neither suddenly stop warning genuinely-overdue people nor
-- reset their clocks. Going forward the column is set explicitly by
-- the HR-send paths.

UPDATE profiles
   SET form_request_sent_at = updated_at
 WHERE form_request_sent_at IS NULL
   AND registration_status IN ('pending_info', 'info_rejected');


COMMENT ON TABLE profile_audit_log IS
  'Per-field audit trail for profile / employee_documents changes. Written by hr_update_pending_profile (context=registration_review) and the trg_profiles_log_registration_status trigger (context=registration_lifecycle, every registration_status/registration_note change, any code path). changed_by NULL = system/cron.';
