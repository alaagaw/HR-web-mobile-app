-- Migration: Add 'non_paid_time_off' leave type
-- Updates CHECK constraints on leave_requests and leave_balances tables

-- 1. Drop and recreate leave_requests CHECK constraint
ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN ('pto', 'emergency', 'non_paid_time_off'));

-- 2. Drop and recreate leave_balances CHECK constraint
ALTER TABLE leave_balances
  DROP CONSTRAINT IF EXISTS leave_balances_leave_type_check;

ALTER TABLE leave_balances
  ADD CONSTRAINT leave_balances_leave_type_check
  CHECK (leave_type IN ('pto', 'emergency', 'non_paid_time_off'));
