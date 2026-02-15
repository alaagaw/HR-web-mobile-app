-- ============================================================
-- HR LEAVE SYSTEM — SEED DATA (Test Users + Balances)
-- Run this AFTER 001_initial_schema.sql
-- ============================================================
--
-- TEST ACCOUNTS (all passwords: "password123"):
--
--   admin@aqeel.com     — HR Director (Aqeel)
--   hr@aqeel.com        — HR Staff (Fatima)
--   manager@aqeel.com   — Manager (Khalid)
--   supervisor@aqeel.com — Supervisor (Omar)
--   employee1@aqeel.com — Employee (Ahmed)
--   employee2@aqeel.com — Employee (Sara)
--
-- ============================================================

-- Use fixed UUIDs so we can reference them for org chart
DO $$
DECLARE
  v_aqeel_id    UUID := 'a0000000-0000-0000-0000-000000000001';
  v_fatima_id   UUID := 'a0000000-0000-0000-0000-000000000002';
  v_khalid_id   UUID := 'a0000000-0000-0000-0000-000000000003';
  v_omar_id     UUID := 'a0000000-0000-0000-0000-000000000004';
  v_ahmed_id    UUID := 'a0000000-0000-0000-0000-000000000005';
  v_sara_id     UUID := 'a0000000-0000-0000-0000-000000000006';
  v_password    TEXT := crypt('password123', gen_salt('bf'));
BEGIN

  -- ============================================================
  -- CREATE AUTH USERS
  -- ============================================================

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES
  -- HR Director: Aqeel
  (
    '00000000-0000-0000-0000-000000000000', v_aqeel_id, 'authenticated', 'authenticated',
    'admin@aqeel.com', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr_director", "full_name": "Aqeel Al-Rashid"}',
    now(), now(), '', '', '', ''
  ),
  -- HR Staff: Fatima
  (
    '00000000-0000-0000-0000-000000000000', v_fatima_id, 'authenticated', 'authenticated',
    'hr@aqeel.com', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr", "full_name": "Fatima Hassan"}',
    now(), now(), '', '', '', ''
  ),
  -- Manager: Khalid
  (
    '00000000-0000-0000-0000-000000000000', v_khalid_id, 'authenticated', 'authenticated',
    'manager@aqeel.com', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "manager", "full_name": "Khalid Ibrahim"}',
    now(), now(), '', '', '', ''
  ),
  -- Supervisor: Omar
  (
    '00000000-0000-0000-0000-000000000000', v_omar_id, 'authenticated', 'authenticated',
    'supervisor@aqeel.com', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "supervisor", "full_name": "Omar Yusuf"}',
    now(), now(), '', '', '', ''
  ),
  -- Employee: Ahmed
  (
    '00000000-0000-0000-0000-000000000000', v_ahmed_id, 'authenticated', 'authenticated',
    'employee1@aqeel.com', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "employee", "full_name": "Ahmed Malik"}',
    now(), now(), '', '', '', ''
  ),
  -- Employee: Sara
  (
    '00000000-0000-0000-0000-000000000000', v_sara_id, 'authenticated', 'authenticated',
    'employee2@aqeel.com', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "employee", "full_name": "Sara Noor"}',
    now(), now(), '', '', '', ''
  );

  -- Auth identities (required by Supabase for email login)
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_aqeel_id, 'admin@aqeel.com',
     jsonb_build_object('sub', v_aqeel_id, 'email', 'admin@aqeel.com', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_fatima_id, 'hr@aqeel.com',
     jsonb_build_object('sub', v_fatima_id, 'email', 'hr@aqeel.com', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_khalid_id, 'manager@aqeel.com',
     jsonb_build_object('sub', v_khalid_id, 'email', 'manager@aqeel.com', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_omar_id, 'supervisor@aqeel.com',
     jsonb_build_object('sub', v_omar_id, 'email', 'supervisor@aqeel.com', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_ahmed_id, 'employee1@aqeel.com',
     jsonb_build_object('sub', v_ahmed_id, 'email', 'employee1@aqeel.com', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_sara_id, 'employee2@aqeel.com',
     jsonb_build_object('sub', v_sara_id, 'email', 'employee2@aqeel.com', 'email_verified', true),
     'email', now(), now(), now());

  -- ============================================================
  -- CREATE PROFILES (org chart)
  -- ============================================================
  --
  -- Org chart:
  --   Aqeel (HR Director) — top level
  --   Fatima (HR) — reports to Aqeel
  --   Khalid (Manager, Engineering) — reports to Aqeel
  --   Omar (Supervisor, Engineering) — reports to Khalid
  --   Ahmed (Employee, Engineering) — supervisor: Omar, manager: Khalid
  --   Sara (Employee, Engineering) — supervisor: Omar, manager: Khalid

  -- Insert top-level users first (no supervisor/manager references)
  INSERT INTO profiles (id, full_name, email, role, department, workday_hours)
  VALUES
    (v_aqeel_id, 'Aqeel Al-Rashid', 'admin@aqeel.com', 'hr_director', 'Management', 8.00),
    (v_khalid_id, 'Khalid Ibrahim', 'manager@aqeel.com', 'manager', 'Engineering', 8.00);

  -- Insert users that reference top-level
  INSERT INTO profiles (id, full_name, email, role, department, supervisor_id, manager_id, workday_hours)
  VALUES
    (v_fatima_id, 'Fatima Hassan', 'hr@aqeel.com', 'hr', 'Human Resources', NULL, v_aqeel_id, 8.00),
    (v_omar_id, 'Omar Yusuf', 'supervisor@aqeel.com', 'supervisor', 'Engineering', NULL, v_khalid_id, 8.00);

  -- Insert employees that reference supervisor + manager
  INSERT INTO profiles (id, full_name, email, role, department, supervisor_id, manager_id, workday_hours)
  VALUES
    (v_ahmed_id, 'Ahmed Malik', 'employee1@aqeel.com', 'employee', 'Engineering', v_omar_id, v_khalid_id, 8.00),
    (v_sara_id, 'Sara Noor', 'employee2@aqeel.com', 'employee', 'Engineering', v_omar_id, v_khalid_id, 8.00);

  -- ============================================================
  -- CREATE LEAVE BALANCES (2026)
  -- ============================================================
  -- Everyone gets 160 hours PTO (20 days) per year

  INSERT INTO leave_balances (employee_id, leave_type, balance_hours, used_hours, year)
  VALUES
    -- Aqeel (HR Director)
    (v_aqeel_id, 'pto', 160.00, 0.00, 2026),
    (v_aqeel_id, 'emergency', 24.00, 0.00, 2026),
    -- Fatima (HR)
    (v_fatima_id, 'pto', 160.00, 0.00, 2026),
    (v_fatima_id, 'emergency', 24.00, 0.00, 2026),
    -- Khalid (Manager)
    (v_khalid_id, 'pto', 160.00, 0.00, 2026),
    (v_khalid_id, 'emergency', 24.00, 0.00, 2026),
    -- Omar (Supervisor)
    (v_omar_id, 'pto', 160.00, 16.00, 2026),
    (v_omar_id, 'emergency', 24.00, 0.00, 2026),
    -- Ahmed (Employee) — has used some PTO already
    (v_ahmed_id, 'pto', 160.00, 24.00, 2026),
    (v_ahmed_id, 'emergency', 24.00, 8.00, 2026),
    -- Sara (Employee)
    (v_sara_id, 'pto', 160.00, 8.00, 2026),
    (v_sara_id, 'emergency', 24.00, 0.00, 2026);

  -- ============================================================
  -- INITIAL LEDGER ENTRIES (accruals)
  -- ============================================================

  INSERT INTO leave_ledger (employee_id, leave_type, change_hours, reason, performed_by)
  VALUES
    (v_aqeel_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_aqeel_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_fatima_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_fatima_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_khalid_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_khalid_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_omar_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_omar_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_ahmed_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_ahmed_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_sara_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_sara_id, 'emergency', 24.00, 'accrual', v_aqeel_id);

END $$;
