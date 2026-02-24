-- ============================================================
-- 009 – Time Tracking (Clock In / Clock Out)
-- ============================================================

CREATE TABLE time_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in        TIMESTAMPTZ NOT NULL,
  clock_out       TIMESTAMPTZ,                             -- NULL while clocked in
  notes           TEXT,
  entry_type      TEXT NOT NULL DEFAULT 'regular'
                  CHECK (entry_type IN ('regular','manual')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','edited','deleted')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_clock_in ON time_entries(clock_in);
CREATE INDEX idx_time_entries_status ON time_entries(status);

-- Prevent double clock-in at database level
CREATE UNIQUE INDEX unique_active_entry ON time_entries(employee_id)
  WHERE status = 'active';

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Employee reads own entries
CREATE POLICY "time_entries_select_own"
  ON time_entries FOR SELECT
  USING (employee_id = auth.uid());

-- Employee inserts own entries
CREATE POLICY "time_entries_insert_own"
  ON time_entries FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Employee updates own entries
CREATE POLICY "time_entries_update_own"
  ON time_entries FOR UPDATE
  USING (employee_id = auth.uid());

-- HR / HR Director: full access to all entries
CREATE POLICY "time_entries_hr_full_access"
  ON time_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );

-- Supervisors can read their direct reports' entries
CREATE POLICY "time_entries_supervisor_read"
  ON time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = time_entries.employee_id
        AND profiles.supervisor_id = auth.uid()
    )
  );

-- Managers can read their direct reports' entries
CREATE POLICY "time_entries_manager_read"
  ON time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = time_entries.employee_id
        AND profiles.manager_id = auth.uid()
    )
  );
