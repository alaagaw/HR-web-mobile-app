-- ============================================================
-- 006 – Renewal Task History: single-record-per-task model
-- ============================================================
-- Instead of inserting a new row for each status change,
-- we keep one row per renewal task and UPDATE it on completion.
-- New columns track who confirmed and when.

ALTER TABLE renewal_task_history
  ADD COLUMN completed_by UUID REFERENCES profiles(id),
  ADD COLUMN completed_at TIMESTAMPTZ;

-- Clean up duplicate history rows (keep only the earliest per task)
DELETE FROM renewal_task_history a
USING renewal_task_history b
WHERE a.task_id = b.task_id
  AND a.id > b.id;

-- Add unique constraint so only one history row per task
ALTER TABLE renewal_task_history
  ADD CONSTRAINT unique_task_history UNIQUE (task_id);

-- Update action check to include 'confirmed'
ALTER TABLE renewal_task_history
  DROP CONSTRAINT IF EXISTS renewal_task_history_action_check;

ALTER TABLE renewal_task_history
  ADD CONSTRAINT renewal_task_history_action_check
  CHECK (action IN ('created','started','completed','cancelled','reassigned','confirmed'));
