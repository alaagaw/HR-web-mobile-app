-- ============================================================
-- 019 – Overtime v2
--
-- Schema additions for the new overtime system:
--   * Project-level entry mode (auto vs. manual R/OT split)
--   * Project-level regular hours per day
--   * Frozen per-entry "effective regular hours" snapshot so
--     historical payroll cannot be retro-corrupted by later
--     config changes
--   * Profile capabilities table (GM, OM, approver flags)
--   * Per-project Project Manager assignments
--   * Project-hours change-request pipeline + audit history
--   * Month-closure tracking for retroactive corrections
--   * Current-month OT balance view (per employee)
--
-- This is a hard-cut migration: no feature flag, no rollback path
-- besides a manual reverse migration. Aligned with the planning
-- discussion that locked entry_mode forever post-creation and
-- mirrored the leave-request approval pipeline.
-- ============================================================

-- ── PROJECTS: payroll config columns ─────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS entry_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (entry_mode IN ('auto','manual_split'));

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS regular_hours_per_day NUMERIC(3,1) NOT NULL DEFAULT 8.0
    CHECK (regular_hours_per_day > 0 AND regular_hours_per_day <= 24);

-- ── TIMESHEET ENTRIES: frozen effective regular hours ────────
-- Snapshot taken at the moment of save. Later changes to the
-- project baseline or to monthly_hour_settings do NOT touch
-- past rows. The auto-derive logic uses THIS column to split
-- standard vs. overtime hours.

ALTER TABLE timesheet_entries
  ADD COLUMN IF NOT EXISTS effective_regular_hours_per_day NUMERIC(3,1);

-- Backfill existing rows: prefer the matching monthly_hour_settings
-- row for the entry's month/year; fall back to 8.0.
UPDATE timesheet_entries te
SET effective_regular_hours_per_day = COALESCE(
  (SELECT mhs.regular_hours_limit
     FROM monthly_hour_settings mhs
    WHERE mhs.month = EXTRACT(MONTH FROM te.entry_date)::int
      AND mhs.year  = EXTRACT(YEAR  FROM te.entry_date)::int
    LIMIT 1),
  8.0
)
WHERE te.effective_regular_hours_per_day IS NULL;

ALTER TABLE timesheet_entries
  ALTER COLUMN effective_regular_hours_per_day SET NOT NULL;

ALTER TABLE timesheet_entries
  ALTER COLUMN effective_regular_hours_per_day SET DEFAULT 8.0;

-- ── PROFILE CAPABILITIES ─────────────────────────────────────
-- Boolean flags layered on top of the Role enum so we can grant
-- specific approval/visibility rights without growing the role list.

CREATE TABLE IF NOT EXISTS profile_capabilities (
  profile_id                          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_general_manager                  BOOLEAN NOT NULL DEFAULT false,
  is_operations_manager               BOOLEAN NOT NULL DEFAULT false,
  can_approve_project_hours_changes   BOOLEAN NOT NULL DEFAULT false,
  can_close_month                     BOOLEAN NOT NULL DEFAULT false,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_caps_gm
  ON profile_capabilities(profile_id) WHERE is_general_manager = true;
CREATE INDEX IF NOT EXISTS idx_profile_caps_approver
  ON profile_capabilities(profile_id) WHERE can_approve_project_hours_changes = true;

-- ── PROJECT MANAGERS (per-project assignment) ────────────────
-- A profile can be PM on zero, one, or many projects.

CREATE TABLE IF NOT EXISTS project_managers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_project_managers_project ON project_managers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_managers_profile ON project_managers(profile_id);

-- ── PROJECT-HOURS CHANGE REQUESTS ────────────────────────────
-- One row per request. Scope determines what the approval applies to:
--   'this_week'         single week override (per-project)
--   'from_week_forward' permanent baseline change starting at week_start
--   'retroactive_week'  correction to a prior week (must be in open month)

CREATE TABLE IF NOT EXISTS project_hours_change_requests (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope             TEXT NOT NULL CHECK (scope IN ('this_week','from_week_forward','retroactive_week')),
  week_start        DATE NOT NULL,
  current_value     NUMERIC(3,1) NOT NULL,
  requested_value   NUMERIC(3,1) NOT NULL CHECK (requested_value > 0 AND requested_value <= 24),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
  reason            TEXT,
  requested_by      UUID NOT NULL REFERENCES profiles(id),
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by        UUID REFERENCES profiles(id),
  decided_at        TIMESTAMPTZ,
  decision_comment  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phcr_project ON project_hours_change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_phcr_status ON project_hours_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_phcr_requested_by ON project_hours_change_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_phcr_pending
  ON project_hours_change_requests(status, requested_at) WHERE status = 'pending';

-- Mirrors leave_request_history shape so the UI can use one timeline component.
CREATE TABLE IF NOT EXISTS project_hours_change_history (
  id              SERIAL PRIMARY KEY,
  request_id      UUID NOT NULL REFERENCES project_hours_change_requests(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN (
    'created','approved','rejected','cancelled','commented'
  )),
  performed_by    UUID NOT NULL REFERENCES profiles(id),
  performer_role  TEXT NOT NULL,
  comment         TEXT,
  from_status     TEXT,
  to_status       TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phch_request ON project_hours_change_history(request_id);
CREATE INDEX IF NOT EXISTS idx_phch_performer ON project_hours_change_history(performed_by);

-- ── MONTH CLOSURES ───────────────────────────────────────────
-- A month is considered "closed" when a row exists with reopened_at IS NULL.
-- HR can close (suggested on the 22nd of that month) and reopen if needed.

CREATE TABLE IF NOT EXISTS month_closures (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year         INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month        INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  closed_by    UUID NOT NULL REFERENCES profiles(id),
  closed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reopened_by  UUID REFERENCES profiles(id),
  reopened_at  TIMESTAMPTZ,
  notes        TEXT,
  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_month_closures_open
  ON month_closures(year, month) WHERE reopened_at IS NULL;

-- ── OT BALANCE VIEW (current calendar month, per employee) ───
-- Resets automatically on the 1st of each month because the view
-- filters by date_trunc('month', CURRENT_DATE). No cron required.

CREATE OR REPLACE VIEW v_employee_overtime_current_month AS
SELECT
  employee_id,
  COALESCE(SUM(overtime_hours), 0)::numeric(8,1) AS overtime_hours_total,
  date_trunc('month', CURRENT_DATE)::date         AS month_start,
  (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date AS month_end
FROM timesheet_entries
WHERE employee_id IS NOT NULL
  AND entry_date >= date_trunc('month', CURRENT_DATE)::date
  AND entry_date <  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
GROUP BY employee_id;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE profile_capabilities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_managers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_hours_change_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_hours_change_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_closures                   ENABLE ROW LEVEL SECURITY;

-- profile_capabilities: own-row read, HR/HRD full access
CREATE POLICY "profile_caps_select_own" ON profile_capabilities
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "profile_caps_select_hr" ON profile_capabilities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
  );

CREATE POLICY "profile_caps_all_hr" ON profile_capabilities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
  );

-- project_managers: everyone reads (PM lists are not sensitive),
-- HR/HRD/managers can write.
CREATE POLICY "project_managers_select_all" ON project_managers
  FOR SELECT USING (true);

CREATE POLICY "project_managers_all_hr" ON project_managers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director','manager'))
  );

-- project_hours_change_requests: visible to HR/HRD, GM (via capability),
-- to the requester, and to PMs of the affected project. Insert allowed
-- for PMs, HR, HR Director, and GM. Update reserved for approvers.
CREATE POLICY "phcr_select_hr_or_gm" ON project_hours_change_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
    OR EXISTS (SELECT 1 FROM profile_capabilities
               WHERE profile_id = auth.uid() AND is_general_manager = true)
  );

CREATE POLICY "phcr_select_requester" ON project_hours_change_requests
  FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "phcr_select_project_pm" ON project_hours_change_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_managers
            WHERE project_id = project_hours_change_requests.project_id
              AND profile_id = auth.uid())
  );

CREATE POLICY "phcr_insert_pm_or_hr_or_gm" ON project_hours_change_requests
  FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
      OR EXISTS (SELECT 1 FROM profile_capabilities
                 WHERE profile_id = auth.uid() AND is_general_manager = true)
      OR EXISTS (SELECT 1 FROM project_managers
                 WHERE project_id = project_hours_change_requests.project_id
                   AND profile_id = auth.uid())
    )
  );

CREATE POLICY "phcr_update_approver" ON project_hours_change_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr_director')
    OR EXISTS (SELECT 1 FROM profile_capabilities
               WHERE profile_id = auth.uid() AND is_general_manager = true)
    OR requested_by = auth.uid() -- requester can cancel their own pending request
  );

-- project_hours_change_history: readable to anyone who can see the request;
-- inserts are open (service layer enforces correctness).
CREATE POLICY "phch_select_any" ON project_hours_change_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_hours_change_requests phcr
      WHERE phcr.id = project_hours_change_history.request_id
        AND (
          phcr.requested_by = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
          OR EXISTS (SELECT 1 FROM profile_capabilities
                     WHERE profile_id = auth.uid() AND is_general_manager = true)
          OR EXISTS (SELECT 1 FROM project_managers
                     WHERE project_id = phcr.project_id AND profile_id = auth.uid())
        )
    )
  );

CREATE POLICY "phch_insert_any" ON project_hours_change_history
  FOR INSERT WITH CHECK (performed_by = auth.uid());

-- month_closures: everyone reads, HR/HRD or capability-holders write.
CREATE POLICY "month_closures_select_all" ON month_closures
  FOR SELECT USING (true);

CREATE POLICY "month_closures_all_hr" ON month_closures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
    OR EXISTS (SELECT 1 FROM profile_capabilities
               WHERE profile_id = auth.uid() AND can_close_month = true)
  );

-- ── updated_at triggers (match existing pattern) ─────────────

CREATE OR REPLACE FUNCTION set_updated_at_overtime_v2()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_caps_updated_at ON profile_capabilities;
CREATE TRIGGER trg_profile_caps_updated_at
  BEFORE UPDATE ON profile_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_overtime_v2();

DROP TRIGGER IF EXISTS trg_phcr_updated_at ON project_hours_change_requests;
CREATE TRIGGER trg_phcr_updated_at
  BEFORE UPDATE ON project_hours_change_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_overtime_v2();
