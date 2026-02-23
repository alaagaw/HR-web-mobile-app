-- ============================================================
-- 007 – Add unassign support to renewal tasks
-- Run this AFTER 006_polytech_seed_users.sql
-- ============================================================

-- Add unassign tracking columns to renewal_tasks
ALTER TABLE renewal_tasks
  ADD COLUMN unassigned_at    TIMESTAMPTZ,
  ADD COLUMN unassigned_by_id UUID REFERENCES profiles(id);

-- Allow 'unassigned' action in task history
ALTER TABLE renewal_task_history
  DROP CONSTRAINT renewal_task_history_action_check;

ALTER TABLE renewal_task_history
  ADD CONSTRAINT renewal_task_history_action_check
  CHECK (action IN ('created','started','completed','cancelled','reassigned','unassigned'));
