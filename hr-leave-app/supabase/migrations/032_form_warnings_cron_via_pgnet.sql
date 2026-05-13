-- =============================================================
-- 032 — Wire daily form-warnings cron to the new edge function
--
-- Migration 031 set up a daily pg_cron job that called
-- send_form_warnings_check() and threw the recipient list away. That
-- recorded the audit row but never delivered an email.
--
-- We're closing the loop. The new run-form-warnings edge function
-- does the orchestration (RPC → recipients → send-registration-email
-- per row with HR BCC). pg_cron's job is now to POST to that edge
-- function via pg_net, which is the standard Supabase pattern for
-- DB-triggered HTTP work.
--
-- Idempotency still lives in form_warnings_log (UNIQUE on
-- employee+type+sent_date), so this endpoint is safe to call
-- multiple times the same day.
-- =============================================================


-- 1. Enable pg_net (no-op if already on; required for net.http_post)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- 2. Replace the old job
DO $$
DECLARE
  v_url TEXT := 'https://vwalbkxighagreetxczi.supabase.co/functions/v1/run-form-warnings';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove the previous job that just called the RPC.
    PERFORM cron.unschedule('daily_form_warnings_check')
      FROM cron.job WHERE jobname = 'daily_form_warnings_check';
    PERFORM cron.unschedule('daily_form_warnings_run')
      FROM cron.job WHERE jobname = 'daily_form_warnings_run';

    -- Daily 06:00 UTC = 09:00 Saudi time. The edge function gates on
    -- the optional CRON_SECRET env var; populate that secret + the
    -- corresponding `app.cron_secret` DB setting if you want to lock
    -- the URL down (see comment block below).
    PERFORM cron.schedule(
      'daily_form_warnings_run',
      '0 6 * * *',
      format(
        $cron$
          SELECT net.http_post(
            url := %L,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || coalesce(current_setting('app.cron_secret', true), '')
            ),
            body := '{}'::jsonb
          );
        $cron$,
        v_url
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron rewire for form warnings skipped: %', SQLERRM;
END $$;


-- =============================================================
-- Operator note — locking the endpoint down (optional)
--
-- run-form-warnings is deployed with verify_jwt:false because the
-- endpoint is idempotent (UNIQUE on form_warnings_log) and returns
-- only counts, so the worst a stranger can do is trigger today's
-- already-due warnings a few hours early. If you want a hard secret:
--
--   1) Generate a random string (e.g. uuidgen).
--   2) Set it on the edge function:
--        supabase secrets set CRON_SECRET=<value>
--   3) Set the same value in the DB so pg_cron can pass it:
--        ALTER DATABASE postgres SET app.cron_secret TO '<value>';
--      (Run this once as a Supabase admin; persists across sessions.)
--
-- Without those steps the function's CRON_SECRET env is empty, the
-- function skips the header check, and pg_cron POSTs an empty
-- Authorization header — still works, just unauthenticated.
-- =============================================================
