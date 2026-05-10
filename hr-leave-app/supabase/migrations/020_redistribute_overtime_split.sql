-- ============================================================
-- 020 – Redistribute existing timesheet entries into R/OT split
--
-- Old code path saved every entry as standard_hours = total,
-- overtime_hours = 0 regardless of how many hours the day held.
-- After 019 each row carries a frozen effective_regular_hours_per_day,
-- so we can now redistribute the totals into the proper split.
--
-- Idempotent: re-running produces the same result because
-- standard_hours + overtime_hours (the total) is preserved,
-- and the LEAST/GREATEST math always converges.
-- ============================================================

UPDATE timesheet_entries
SET
  standard_hours = LEAST(
    standard_hours + overtime_hours,
    effective_regular_hours_per_day
  ),
  overtime_hours = GREATEST(
    0,
    standard_hours + overtime_hours - effective_regular_hours_per_day
  )
WHERE
  -- Only touch rows that aren't already correctly split.
  -- A row is "correctly split" when overtime_hours covers any excess
  -- above the limit and standard_hours is capped at the limit.
  (
    standard_hours > effective_regular_hours_per_day
    OR (
      standard_hours + overtime_hours > effective_regular_hours_per_day
      AND standard_hours <> effective_regular_hours_per_day
    )
  );
