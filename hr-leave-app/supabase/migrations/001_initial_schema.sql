-- ============================================================
-- HR LEAVE SYSTEM — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- PROFILES
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  photo_url       TEXT,
  role            TEXT NOT NULL CHECK (role IN ('employee','supervisor','manager','hr','hr_director')),
  supervisor_id   UUID REFERENCES profiles(id),
  manager_id      UUID REFERENCES profiles(id),
  department      TEXT,
  workday_hours   NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_supervisor ON profiles(supervisor_id);
CREATE INDEX idx_profiles_manager ON profiles(manager_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_department ON profiles(department);

-- LEAVE BALANCES
CREATE TABLE leave_balances (
  id              SERIAL PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES profiles(id),
  leave_type      TEXT NOT NULL CHECK (leave_type IN ('pto','emergency')),
  balance_hours   NUMERIC(8,2) NOT NULL DEFAULT 0,
  used_hours      NUMERIC(8,2) NOT NULL DEFAULT 0,
  year            INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, leave_type, year)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);

-- LEAVE LEDGER
CREATE TABLE leave_ledger (
  id              SERIAL PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES profiles(id),
  leave_type      TEXT NOT NULL,
  change_hours    NUMERIC(8,2) NOT NULL,
  reason          TEXT NOT NULL,
  reference_id    UUID,
  performed_by    UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leave_ledger_employee ON leave_ledger(employee_id);

-- CASE NUMBER SEQUENCE
CREATE SEQUENCE leave_request_seq START 1;

-- LEAVE REQUESTS
CREATE TABLE leave_requests (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_number         TEXT NOT NULL UNIQUE,
  employee_id         UUID NOT NULL REFERENCES profiles(id),
  leave_type          TEXT NOT NULL CHECK (leave_type IN ('pto','emergency')),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  start_time          TIME,
  end_time            TIME,
  include_weekends    BOOLEAN DEFAULT false,
  requested_hours     NUMERIC(8,2) NOT NULL,
  paid_hours          NUMERIC(8,2) NOT NULL DEFAULT 0,
  excess_hours        NUMERIC(8,2) NOT NULL DEFAULT 0,
  has_excess          BOOLEAN DEFAULT false,
  is_emergency        BOOLEAN DEFAULT false,
  emergency_number    INT,
  emergency_reason    TEXT,
  excess_determination TEXT CHECK (excess_determination IN ('pending','unpaid','converted','partial_reject')),
  excess_determined_by UUID REFERENCES profiles(id),
  excess_determined_at TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','pending_supervisor','pending_manager',
    'pending_hr','pending_hr_director','approved','rejected','cancelled'
  )),
  current_assignee_id UUID REFERENCES profiles(id),
  current_assignee_role TEXT,
  employee_comment    TEXT,
  submitted_at        TIMESTAMPTZ,
  pending_since       TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_assignee ON leave_requests(current_assignee_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- APPROVAL HISTORY
CREATE TABLE leave_request_history (
  id              SERIAL PRIMARY KEY,
  request_id      UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN (
    'created','submitted','approved','rejected','commented',
    'reassigned','bypassed','cancelled','auto_approved',
    'excess_determined','attachment_added','attachment_removed',
    'returned_for_revision'
  )),
  performed_by    UUID NOT NULL REFERENCES profiles(id),
  performer_role  TEXT NOT NULL,
  comment         TEXT,
  from_status     TEXT,
  to_status       TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_history_request ON leave_request_history(request_id);
CREATE INDEX idx_history_performed_by ON leave_request_history(performed_by);

-- ATTACHMENTS
CREATE TABLE leave_attachments (
  id              SERIAL PRIMARY KEY,
  request_id      UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       INT NOT NULL,
  file_type       TEXT NOT NULL,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  uploaded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attachments_request ON leave_attachments(request_id);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  reference_id    UUID,
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- HELPER FUNCTION: Deduct leave balance on approval
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_leave_balance(
  p_employee_id UUID,
  p_leave_type TEXT,
  p_hours NUMERIC,
  p_request_id UUID,
  p_performed_by UUID
) RETURNS void AS $$
BEGIN
  -- Update balance
  UPDATE leave_balances
  SET balance_hours = balance_hours - p_hours,
      used_hours = used_hours + p_hours,
      updated_at = now()
  WHERE employee_id = p_employee_id
    AND leave_type = p_leave_type
    AND year = EXTRACT(YEAR FROM now());

  -- Write to ledger
  INSERT INTO leave_ledger (employee_id, leave_type, change_hours, reason, reference_id, performed_by)
  VALUES (p_employee_id, p_leave_type, -p_hours, 'approved_deduction', p_request_id, p_performed_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read all profiles (needed for org chart display)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_hr" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
);

-- Leave balances: employee sees own, HR sees all
CREATE POLICY "balances_select_own" ON leave_balances FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "balances_select_hr" ON leave_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
);
CREATE POLICY "balances_all_hr" ON leave_balances FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
);

-- Leave requests: broad read for approvers, employee sees own
CREATE POLICY "requests_select_own" ON leave_requests FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "requests_select_assignee" ON leave_requests FOR SELECT USING (current_assignee_id = auth.uid());
CREATE POLICY "requests_select_hr" ON leave_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
);
CREATE POLICY "requests_select_supervisor" ON leave_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = employee_id AND supervisor_id = auth.uid())
);
CREATE POLICY "requests_select_manager" ON leave_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = employee_id AND manager_id = auth.uid())
);
CREATE POLICY "requests_insert_own" ON leave_requests FOR INSERT WITH CHECK (employee_id = auth.uid());
CREATE POLICY "requests_update_all" ON leave_requests FOR UPDATE USING (true);

-- History: readable by anyone who can see the request
CREATE POLICY "history_select" ON leave_request_history FOR SELECT USING (true);
CREATE POLICY "history_insert" ON leave_request_history FOR INSERT WITH CHECK (true);

-- Attachments
CREATE POLICY "attachments_select" ON leave_attachments FOR SELECT USING (true);
CREATE POLICY "attachments_insert" ON leave_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "attachments_delete_own" ON leave_attachments FOR DELETE USING (uploaded_by = auth.uid());

-- Notifications: user sees own
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);

-- Ledger: HR sees all, employee sees own
CREATE POLICY "ledger_select_own" ON leave_ledger FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "ledger_select_hr" ON leave_ledger FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'hr_director'))
);
CREATE POLICY "ledger_insert" ON leave_ledger FOR INSERT WITH CHECK (true);
