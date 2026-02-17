-- ============================================================
-- HR SYSTEM — POLYTECH SEED USERS
-- Run this AFTER 005_registration_system.sql
-- ============================================================
--
-- POLYTECH ACCOUNTS (all passwords: "password123"):
--
--   aqeel@polytech.com.sa       — HR Director (Aqeel A Gaw)
--   Amani@polytech.com.sa       — HR (Amani Thiyab)
--   maram@polytech.com.sa       — HR (Maram Al Muammar)
--   projectadmin@polytech.com.sa — HR (Venod)
--   pylee@polytech.com.sa       — HR (Pylee K Iype)
--   nouf@polytech.com.sa        — HR (Nouf Al Mutairi)
--   shahad@polytech.com.sa      — Employee / Finance (Shahad Nasser AlShehri)
--
-- ============================================================

DO $$
DECLARE
  v_aqeel_id    UUID := 'b0000000-0000-0000-0000-000000000001';
  v_amani_id    UUID := 'b0000000-0000-0000-0000-000000000002';
  v_maram_id    UUID := 'b0000000-0000-0000-0000-000000000003';
  v_venod_id    UUID := 'b0000000-0000-0000-0000-000000000004';
  v_pylee_id    UUID := 'b0000000-0000-0000-0000-000000000005';
  v_nouf_id     UUID := 'b0000000-0000-0000-0000-000000000006';
  v_shahad_id   UUID := 'b0000000-0000-0000-0000-000000000007';
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
  -- HR Director: Aqeel A Gaw
  (
    '00000000-0000-0000-0000-000000000000', v_aqeel_id, 'authenticated', 'authenticated',
    'aqeel@polytech.com.sa', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr_director", "full_name": "Aqeel A Gaw"}',
    now(), now(), '', '', '', ''
  ),
  -- HR: Amani Thiyab
  (
    '00000000-0000-0000-0000-000000000000', v_amani_id, 'authenticated', 'authenticated',
    'amani@polytech.com.sa', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr", "full_name": "Amani Thiyab"}',
    now(), now(), '', '', '', ''
  ),
  -- HR: Maram Al Muammar
  (
    '00000000-0000-0000-0000-000000000000', v_maram_id, 'authenticated', 'authenticated',
    'maram@polytech.com.sa', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr", "full_name": "Maram Al Muammar"}',
    now(), now(), '', '', '', ''
  ),
  -- HR: Venod
  (
    '00000000-0000-0000-0000-000000000000', v_venod_id, 'authenticated', 'authenticated',
    'projectadmin@polytech.com.sa', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr", "full_name": "Venod"}',
    now(), now(), '', '', '', ''
  ),
  -- HR: Pylee K Iype
  (
    '00000000-0000-0000-0000-000000000000', v_pylee_id, 'authenticated', 'authenticated',
    'pylee@polytech.com.sa', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr", "full_name": "Pylee K Iype"}',
    now(), now(), '', '', '', ''
  ),
  -- HR: Nouf Al Mutairi
  (
    '00000000-0000-0000-0000-000000000000', v_nouf_id, 'authenticated', 'authenticated',
    'nouf@polytech.com.sa', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "hr", "full_name": "Nouf Al Mutairi"}',
    now(), now(), '', '', '', ''
  ),
  -- Employee (Finance): Shahad Nasser AlShehri
  (
    '00000000-0000-0000-0000-000000000000', v_shahad_id, 'authenticated', 'authenticated',
    'shahad@polytech.com.sa', v_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "employee", "full_name": "Shahad Nasser AlShehri"}',
    now(), now(), '', '', '', ''
  );

  -- ============================================================
  -- AUTH IDENTITIES (required by Supabase for email login)
  -- ============================================================

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_aqeel_id, 'aqeel@polytech.com.sa',
     jsonb_build_object('sub', v_aqeel_id, 'email', 'aqeel@polytech.com.sa', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_amani_id, 'amani@polytech.com.sa',
     jsonb_build_object('sub', v_amani_id, 'email', 'amani@polytech.com.sa', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_maram_id, 'maram@polytech.com.sa',
     jsonb_build_object('sub', v_maram_id, 'email', 'maram@polytech.com.sa', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_venod_id, 'projectadmin@polytech.com.sa',
     jsonb_build_object('sub', v_venod_id, 'email', 'projectadmin@polytech.com.sa', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_pylee_id, 'pylee@polytech.com.sa',
     jsonb_build_object('sub', v_pylee_id, 'email', 'pylee@polytech.com.sa', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_nouf_id, 'nouf@polytech.com.sa',
     jsonb_build_object('sub', v_nouf_id, 'email', 'nouf@polytech.com.sa', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_shahad_id, 'shahad@polytech.com.sa',
     jsonb_build_object('sub', v_shahad_id, 'email', 'shahad@polytech.com.sa', 'email_verified', true),
     'email', now(), now(), now());

  -- ============================================================
  -- UPDATE PROFILES (trigger already created them — now set correct data)
  -- ============================================================
  --
  -- The handle_new_user() trigger (from 005) auto-creates a profile
  -- on each auth.users INSERT, so we UPDATE rather than INSERT.
  --
  -- Org chart:
  --   Aqeel A Gaw (HR Director) — top level
  --   Amani, Maram, Venod, Pylee, Nouf (HR) — report to Aqeel
  --   Shahad (Employee, Finance) — reports to Aqeel
  --

  -- Update top-level user first (no manager reference)
  UPDATE profiles SET
    full_name = 'Aqeel A Gaw',
    role = 'hr_director',
    department = 'Management',
    registration_status = 'active'
  WHERE id = v_aqeel_id;

  -- Update HR staff and Finance employee (all report to Aqeel)
  UPDATE profiles SET
    full_name = 'Amani Thiyab',
    role = 'hr',
    department = 'Human Resources',
    manager_id = v_aqeel_id,
    registration_status = 'active'
  WHERE id = v_amani_id;

  UPDATE profiles SET
    full_name = 'Maram Al Muammar',
    role = 'hr',
    department = 'Human Resources',
    manager_id = v_aqeel_id,
    registration_status = 'active'
  WHERE id = v_maram_id;

  UPDATE profiles SET
    full_name = 'Venod',
    role = 'hr',
    department = 'Human Resources',
    manager_id = v_aqeel_id,
    registration_status = 'active'
  WHERE id = v_venod_id;

  UPDATE profiles SET
    full_name = 'Pylee K Iype',
    role = 'hr',
    department = 'Human Resources',
    manager_id = v_aqeel_id,
    registration_status = 'active'
  WHERE id = v_pylee_id;

  UPDATE profiles SET
    full_name = 'Nouf Al Mutairi',
    role = 'hr',
    department = 'Human Resources',
    manager_id = v_aqeel_id,
    registration_status = 'active'
  WHERE id = v_nouf_id;

  UPDATE profiles SET
    full_name = 'Shahad Nasser AlShehri',
    role = 'employee',
    department = 'Finance',
    manager_id = v_aqeel_id,
    registration_status = 'active'
  WHERE id = v_shahad_id;

  -- ============================================================
  -- CREATE LEAVE BALANCES (2026)
  -- ============================================================

  INSERT INTO leave_balances (employee_id, leave_type, balance_hours, used_hours, year)
  VALUES
    -- Aqeel (HR Director)
    (v_aqeel_id, 'pto', 160.00, 0.00, 2026),
    (v_aqeel_id, 'emergency', 24.00, 0.00, 2026),
    -- Amani (HR)
    (v_amani_id, 'pto', 160.00, 0.00, 2026),
    (v_amani_id, 'emergency', 24.00, 0.00, 2026),
    -- Maram (HR)
    (v_maram_id, 'pto', 160.00, 0.00, 2026),
    (v_maram_id, 'emergency', 24.00, 0.00, 2026),
    -- Venod (HR)
    (v_venod_id, 'pto', 160.00, 0.00, 2026),
    (v_venod_id, 'emergency', 24.00, 0.00, 2026),
    -- Pylee (HR)
    (v_pylee_id, 'pto', 160.00, 0.00, 2026),
    (v_pylee_id, 'emergency', 24.00, 0.00, 2026),
    -- Nouf (HR)
    (v_nouf_id, 'pto', 160.00, 0.00, 2026),
    (v_nouf_id, 'emergency', 24.00, 0.00, 2026),
    -- Shahad (Finance)
    (v_shahad_id, 'pto', 160.00, 0.00, 2026),
    (v_shahad_id, 'emergency', 24.00, 0.00, 2026);

  -- ============================================================
  -- INITIAL LEDGER ENTRIES (accruals)
  -- ============================================================

  INSERT INTO leave_ledger (employee_id, leave_type, change_hours, reason, performed_by)
  VALUES
    (v_aqeel_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_aqeel_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_amani_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_amani_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_maram_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_maram_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_venod_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_venod_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_pylee_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_pylee_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_nouf_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_nouf_id, 'emergency', 24.00, 'accrual', v_aqeel_id),
    (v_shahad_id, 'pto', 160.00, 'accrual', v_aqeel_id),
    (v_shahad_id, 'emergency', 24.00, 'accrual', v_aqeel_id);

END $$;
