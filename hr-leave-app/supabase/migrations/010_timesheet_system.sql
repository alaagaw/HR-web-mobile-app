-- ============================================================
-- 010 – Monthly Timesheet System
-- Projects, suppliers, timesheet entries, submissions, assignments
-- ============================================================

-- ── PROJECTS ─────────────────────────────────────────────────

CREATE TABLE projects (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_number  TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  client          TEXT,
  location        TEXT,
  scope           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','on_hold','cancelled')),
  start_date      DATE,
  end_date        DATE,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_number ON projects(project_number);

-- ── SUPPLIERS (Vendors / Subcontractors) ─────────────────────

CREATE TABLE suppliers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  code            TEXT UNIQUE,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- ── TIMESHEET ASSIGNMENTS (keeper <-> project mapping) ───────

CREATE TABLE timesheet_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID NOT NULL REFERENCES projects(id),
  assigned_to_id  UUID NOT NULL REFERENCES profiles(id),
  assigned_by_id  UUID NOT NULL REFERENCES profiles(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, assigned_to_id)
);

CREATE INDEX idx_ts_assignments_project ON timesheet_assignments(project_id);
CREATE INDEX idx_ts_assignments_user ON timesheet_assignments(assigned_to_id);

-- ── TIMESHEET ENTRIES (one row per employee per day per project) ──

CREATE TABLE timesheet_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID NOT NULL REFERENCES projects(id),
  employee_id     UUID REFERENCES profiles(id),
  employee_name   TEXT NOT NULL,
  employee_number TEXT,
  designation     TEXT,
  supplier_id     UUID REFERENCES suppliers(id),
  entry_date      DATE NOT NULL,
  standard_hours  NUMERIC(4,1) DEFAULT 0,
  overtime_hours  NUMERIC(4,1) DEFAULT 0,
  st_shift        TEXT DEFAULT 'D' CHECK (st_shift IN ('D','N')),
  ot_shift        TEXT DEFAULT 'D' CHECK (ot_shift IN ('D','N')),
  notes           TEXT,
  entered_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, employee_id, entry_date)
);

CREATE INDEX idx_ts_entries_project ON timesheet_entries(project_id);
CREATE INDEX idx_ts_entries_employee ON timesheet_entries(employee_id);
CREATE INDEX idx_ts_entries_date ON timesheet_entries(entry_date);
CREATE INDEX idx_ts_entries_project_date ON timesheet_entries(project_id, entry_date);

-- ── TIMESHEET SUBMISSIONS (weekly batches for approval) ──────

CREATE TABLE timesheet_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID NOT NULL REFERENCES projects(id),
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_by    UUID REFERENCES profiles(id),
  submitted_at    TIMESTAMPTZ,
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  rejected_by     UUID REFERENCES profiles(id),
  rejected_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, week_start)
);

CREATE INDEX idx_ts_submissions_project ON timesheet_submissions(project_id);
CREATE INDEX idx_ts_submissions_status ON timesheet_submissions(status);
CREATE INDEX idx_ts_submissions_week ON timesheet_submissions(week_start, week_end);

-- ── COMPLIANCE FLAGS (non-compliance tracking) ───────────────

CREATE TABLE timesheet_compliance_flags (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID NOT NULL REFERENCES projects(id),
  keeper_id       UUID NOT NULL REFERENCES profiles(id),
  flag_date       DATE NOT NULL,
  flag_type       TEXT NOT NULL CHECK (flag_type IN ('missing_entry','late_submission')),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES profiles(id),
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ts_compliance_project ON timesheet_compliance_flags(project_id);
CREATE INDEX idx_ts_compliance_keeper ON timesheet_compliance_flags(keeper_id);
CREATE INDEX idx_ts_compliance_unresolved ON timesheet_compliance_flags(resolved_at) WHERE resolved_at IS NULL;

-- ── TIMESHEET HISTORY (audit trail) ──────────────────────────

CREATE TABLE timesheet_history (
  id              SERIAL PRIMARY KEY,
  submission_id   UUID REFERENCES timesheet_submissions(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN (
    'created','submitted','approved','rejected','updated','imported'
  )),
  performed_by    UUID NOT NULL REFERENCES profiles(id),
  performer_role  TEXT NOT NULL,
  comment         TEXT,
  from_status     TEXT,
  to_status       TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ts_history_submission ON timesheet_history(submission_id);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_compliance_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_history ENABLE ROW LEVEL SECURITY;

-- Projects: everyone reads, HR/managers write
CREATE POLICY "projects_select_all" ON projects FOR SELECT USING (true);
CREATE POLICY "projects_all_hr" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director','manager'))
);

-- Suppliers: everyone reads, HR/managers write
CREATE POLICY "suppliers_select_all" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_all_hr" ON suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director','manager'))
);

-- Assignments: HR/managers full access, keepers read own
CREATE POLICY "ts_assignments_all_hr" ON timesheet_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director','manager'))
);
CREATE POLICY "ts_assignments_read_own" ON timesheet_assignments FOR SELECT USING (
  assigned_to_id = auth.uid()
);

-- Entries: HR full access, managers read all, assigned keepers CRUD their projects
CREATE POLICY "ts_entries_all_hr" ON timesheet_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
);
CREATE POLICY "ts_entries_select_manager" ON timesheet_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "ts_entries_keeper" ON timesheet_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM timesheet_assignments
    WHERE timesheet_assignments.project_id = timesheet_entries.project_id
      AND timesheet_assignments.assigned_to_id = auth.uid()
      AND timesheet_assignments.is_active = true
  )
);

-- Submissions: same as entries
CREATE POLICY "ts_submissions_all_hr" ON timesheet_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
);
CREATE POLICY "ts_submissions_select_manager" ON timesheet_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "ts_submissions_keeper" ON timesheet_submissions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM timesheet_assignments
    WHERE timesheet_assignments.project_id = timesheet_submissions.project_id
      AND timesheet_assignments.assigned_to_id = auth.uid()
      AND timesheet_assignments.is_active = true
  )
);

-- Compliance flags: HR/managers full access
CREATE POLICY "ts_compliance_all_hr" ON timesheet_compliance_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director','manager'))
);

-- History: readable by all, insertable by all
CREATE POLICY "ts_history_select" ON timesheet_history FOR SELECT USING (true);
CREATE POLICY "ts_history_insert" ON timesheet_history FOR INSERT WITH CHECK (true);
