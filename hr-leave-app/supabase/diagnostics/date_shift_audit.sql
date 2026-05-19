-- ============================================================
-- READ-ONLY DIAGNOSTIC — scope of historically date-shifted rows
--
-- Purpose
--   Before the date-only fixes (lib/date-only.ts + migration 058),
--   the Excel bulk-import paths could write date-only values one day
--   early (toISOString() shift). This script SCOPES how much data may
--   be affected. It is SELECT-only — it changes nothing.
--
-- CRITICAL CAVEAT — why we do NOT auto-correct
--   There is no ground truth in the DB for what a date "should" have
--   been. Not every row went through the buggy path: dates entered via
--   the date-picker UI are correct. A blind "shift every date +1 day"
--   would CORRUPT the correctly-entered rows. So this only reports;
--   remediation is fix-forward (re-upload the authoritative master via
--   the now-fixed import, or correct specific rows in the UI).
--
-- How to run
--   supabase db query --linked --file supabase/diagnostics/date_shift_audit.sql
--   (or paste into the Supabase SQL editor). Nothing here mutates data.
-- ============================================================


-- Q1 — employee_documents date inventory.
-- Reconcile against your authoritative master list. `updated_at` helps
-- spot rows recently touched by the bulk import (most-suspect first).
SELECT ed.emp_code,
       p.full_name,
       ed.birth_date,
       ed.passport_expiry,
       ed.iqama_expiry,
       ed.insurance_expiry,
       ed.updated_at
FROM employee_documents ed
JOIN profiles p ON p.id = ed.employee_id
ORDER BY ed.updated_at DESC NULLS LAST, ed.emp_code;


-- Q2 — profiles.start_date (Joining Date) inventory.
-- The employee bulk import shifted start_date; reconcile vs the master.
-- start_date drives PTO accrual proration & leave payout, so errors
-- here are financial, not cosmetic.
SELECT ed.emp_code,
       p.full_name,
       p.start_date,
       p.updated_at
FROM profiles p
LEFT JOIN employee_documents ed ON ed.employee_id = p.id
WHERE p.start_date IS NOT NULL
ORDER BY p.updated_at DESC NULLS LAST, ed.emp_code;


-- Q3 — HEURISTIC shift signal (not proof).
-- renewal_tasks.expiry_date is a snapshot; the renew flow writes it
-- from a date-picker (correct). Where a task's expiry differs from the
-- matching employee_documents expiry by EXACTLY 1 day, the document
-- value is a likely import shift. Same-day = consistent (no signal).
SELECT rt.document_type,
       ed.emp_code,
       p.full_name,
       rt.expiry_date                                   AS task_expiry,
       CASE rt.document_type
         WHEN 'passport'  THEN ed.passport_expiry
         WHEN 'iqama'     THEN ed.iqama_expiry
         WHEN 'insurance' THEN ed.insurance_expiry
       END                                              AS doc_expiry,
       (CASE rt.document_type
         WHEN 'passport'  THEN ed.passport_expiry
         WHEN 'iqama'     THEN ed.iqama_expiry
         WHEN 'insurance' THEN ed.insurance_expiry
       END - rt.expiry_date)                            AS doc_minus_task_days
FROM renewal_tasks rt
JOIN employee_documents ed ON ed.id = rt.document_id
JOIN profiles p            ON p.id = rt.employee_id
WHERE ABS(
        (CASE rt.document_type
           WHEN 'passport'  THEN ed.passport_expiry
           WHEN 'iqama'     THEN ed.iqama_expiry
           WHEN 'insurance' THEN ed.insurance_expiry
         END - rt.expiry_date)
      ) = 1
ORDER BY rt.document_type, ed.emp_code;


-- Q4 — scope summary (counts only).
SELECT
  (SELECT count(*) FROM employee_documents)                                   AS total_doc_rows,
  (SELECT count(*) FROM employee_documents WHERE birth_date       IS NOT NULL) AS with_birth_date,
  (SELECT count(*) FROM employee_documents WHERE passport_expiry  IS NOT NULL) AS with_passport_expiry,
  (SELECT count(*) FROM employee_documents WHERE iqama_expiry     IS NOT NULL) AS with_iqama_expiry,
  (SELECT count(*) FROM employee_documents WHERE insurance_expiry IS NOT NULL) AS with_insurance_expiry,
  (SELECT count(*) FROM employee_documents
     WHERE updated_at >= now() - interval '30 days')                          AS docs_touched_last_30d,
  (SELECT count(*) FROM profiles WHERE start_date IS NOT NULL)                AS profiles_with_start_date;


-- Q5 — H3 pre-deploy check (run before applying migration 058's H3).
-- Any row here means an accrual landed in a month that disagrees with
-- its created_at Riyadh month — investigate before re-anchoring cron.
SELECT la.employee_id,
       la.leave_type,
       la.year,
       la.month,
       la.created_at,
       EXTRACT(YEAR  FROM (la.created_at AT TIME ZONE 'Asia/Riyadh'))::int AS created_riyadh_year,
       EXTRACT(MONTH FROM (la.created_at AT TIME ZONE 'Asia/Riyadh'))::int AS created_riyadh_month
FROM leave_accruals la
WHERE la.year  <> EXTRACT(YEAR  FROM (la.created_at AT TIME ZONE 'Asia/Riyadh'))::int
   OR la.month <> EXTRACT(MONTH FROM (la.created_at AT TIME ZONE 'Asia/Riyadh'))::int
ORDER BY la.created_at DESC;
