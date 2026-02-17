-- ============================================================
-- 004 – Renewal Tasks (Document expiry task assignment)
-- ============================================================

CREATE TABLE renewal_tasks (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number         TEXT NOT NULL UNIQUE,
  employee_id         UUID NOT NULL REFERENCES profiles(id),
  document_id         UUID NOT NULL REFERENCES employee_documents(id),
  document_type       TEXT NOT NULL,                  -- 'passport', 'iqama', 'insurance'
  expiry_date         DATE NOT NULL,                  -- snapshot of the expiry date at assignment time
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','in_progress','completed','cancelled')),
  assigned_to_id      UUID REFERENCES profiles(id),   -- HR employee working on it
  assigned_by_id      UUID REFERENCES profiles(id),   -- who created the task
  notes               TEXT,
  assigned_at         TIMESTAMPTZ DEFAULT now(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_renewal_tasks_assigned_to ON renewal_tasks(assigned_to_id);
CREATE INDEX idx_renewal_tasks_status ON renewal_tasks(status);
CREATE INDEX idx_renewal_tasks_employee ON renewal_tasks(employee_id);
CREATE INDEX idx_renewal_tasks_document ON renewal_tasks(document_id);

-- ============================================================
-- Renewal Task History (audit trail)
-- ============================================================

CREATE TABLE renewal_task_history (
  id              SERIAL PRIMARY KEY,
  task_id         UUID NOT NULL REFERENCES renewal_tasks(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN ('created','started','completed','cancelled','reassigned')),
  performed_by    UUID NOT NULL REFERENCES profiles(id),
  performer_role  TEXT NOT NULL,
  comment         TEXT,
  from_status     TEXT,
  to_status       TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_renewal_task_history_task ON renewal_task_history(task_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE renewal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_task_history ENABLE ROW LEVEL SECURITY;

-- HR and HR Director: full access to all tasks
CREATE POLICY "hr_full_access_renewal_tasks"
  ON renewal_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );

-- Assigned employee can read their own tasks
CREATE POLICY "assigned_read_own_tasks"
  ON renewal_tasks FOR SELECT
  USING (assigned_to_id = auth.uid());

-- HR and HR Director: full access to task history
CREATE POLICY "hr_full_access_renewal_task_history"
  ON renewal_task_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );

-- Anyone can read history for tasks they can see
CREATE POLICY "read_own_task_history"
  ON renewal_task_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM renewal_tasks
      WHERE renewal_tasks.id = renewal_task_history.task_id
        AND renewal_tasks.assigned_to_id = auth.uid()
    )
  );
