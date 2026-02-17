-- ============================================================
-- 005 – Registration System (HR Invite + Self-Registration)
-- ============================================================

-- 1. Add registration-related columns to profiles
ALTER TABLE profiles
  ADD COLUMN registration_status TEXT NOT NULL DEFAULT 'active'
    CHECK (registration_status IN (
      'email_unverified',
      'pending_info',
      'pending_approval',
      'active',
      'rejected'
    )),
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN invited_by UUID REFERENCES profiles(id),
  ADD COLUMN registration_note TEXT;

-- Index for filtering by registration status
CREATE INDEX idx_profiles_registration_status ON profiles(registration_status);

-- ============================================================
-- 2. DB Trigger: auto-create profile on auth.users INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if profile already exists (e.g., seeded data)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      role,
      registration_status,
      must_change_password,
      is_active,
      workday_hours
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
      COALESCE(NEW.raw_user_meta_data->>'registration_status', 'email_unverified'),
      COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false),
      true,
      8.00
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. Helper function: create default leave balances
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_leave_balances(p_employee_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM now())::INT;
BEGIN
  -- PTO: 160 hours (20 days)
  INSERT INTO leave_balances (employee_id, leave_type, balance_hours, used_hours, year)
  VALUES (p_employee_id, 'pto', 160.00, 0.00, v_year)
  ON CONFLICT (employee_id, leave_type, year) DO NOTHING;

  -- Emergency: 24 hours (3 days)
  INSERT INTO leave_balances (employee_id, leave_type, balance_hours, used_hours, year)
  VALUES (p_employee_id, 'emergency', 24.00, 0.00, v_year)
  ON CONFLICT (employee_id, leave_type, year) DO NOTHING;

  -- Ledger entries for the initial accruals
  INSERT INTO leave_ledger (employee_id, leave_type, change_hours, reason, performed_by)
  VALUES
    (p_employee_id, 'pto', 160.00, 'accrual', p_employee_id),
    (p_employee_id, 'emergency', 24.00, 'accrual', p_employee_id);
END;
$$;
