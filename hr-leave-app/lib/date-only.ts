/**
 * date-only.ts — the single source of truth for calendar-date handling.
 *
 * THE BUG THIS KILLS
 * ------------------
 * A *date-only* value (an expiry, a joining date, a leave day, a birth
 * date) has no time and no timezone — it's a calendar day. The classic
 * corruption is `new Date("2026-05-24").toISOString().split("T")[0]`:
 * the string is parsed as UTC midnight, and `toISOString()` (or any
 * local→UTC step) shifts it across a day boundary, so `2026-05-24`
 * gets stored/shown as `2026-05-23`. NEVER use `toISOString()` to
 * derive a date-only string. Route every date-only path through here.
 *
 * THE BUSINESS DAY IS Asia/Riyadh, FIXED
 * --------------------------------------
 * "Today", expiry cutoffs, accrual months, etc. are defined by the
 * Riyadh calendar day for ALL users and server jobs — not the device
 * timezone — so staff, a travelling admin, and the cron all agree.
 * Saudi Arabia uses AST = UTC+3 year-round with no DST (and has since
 * 1947, with none planned), so we apply a fixed +03:00 offset rather
 * than depend on Intl timezone data being present in the RN/Hermes
 * runtime. If Saudi Arabia ever adopts DST, this constant is the one
 * place to revisit.
 */

/** Asia/Riyadh standard time: UTC+3, no DST. */
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** A regex for a strict date-only string. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format a `Date`'s **local** calendar day as `YYYY-MM-DD` — never UTC.
 *
 * Use this for a `Date` you already hold (e.g. an Excel cell parsed
 * with `cellDates`, which `xlsx` constructs at host-local midnight for
 * a timezone-naive cell). Local getters recover exactly the digits the
 * user typed, with no shift.
 */
export function toDateOnlyString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Today's **Riyadh** calendar day as `YYYY-MM-DD` (device-tz independent). */
export function todayDateOnly(): string {
  // Shift the instant by +3h, then read UTC parts: those parts now
  // spell the Riyadh wall-clock date.
  const r = new Date(Date.now() + RIYADH_OFFSET_MS);
  return `${r.getUTCFullYear()}-${pad2(r.getUTCMonth() + 1)}-${pad2(r.getUTCDate())}`;
}

/**
 * Parse a `YYYY-MM-DD` string to a `Date` at **local midnight** — safe
 * for display and intra-day use (no UTC shift). Built from numeric
 * components, never from string parsing (which would be UTC).
 */
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Internal: epoch ms of a date-only string at UTC midnight (DST-immune). */
function dateOnlyUTCms(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Normalize an Excel/CSV cell to a `YYYY-MM-DD` string with **no
 * timezone shift**, or `null` if empty/unparseable.
 *
 *  - already `YYYY-MM-DD` → returned untouched (never re-parsed)
 *  - `Date` (from `cellDates`) → its local calendar day
 *  - other strings (`5/24/2026`, `24-May-2026`) → local parse, then
 *    local calendar day
 */
export function parseExcelDateCell(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : toDateOnlyString(v);
  }
  const s = String(v).trim();
  if (!s) return null;
  if (DATE_ONLY_RE.test(s)) return s; // already date-only — do NOT reparse
  const d = new Date(s); // non-ISO formats parse as local
  return Number.isNaN(d.getTime()) ? null : toDateOnlyString(d);
}

/**
 * Whole calendar days from the Riyadh "today" until `dateOnly`
 * (negative = in the past). DST-immune integer math. `null` for
 * empty/invalid input.
 */
export function daysUntil(dateOnly: string | null | undefined): number | null {
  if (!dateOnly || !DATE_ONLY_RE.test(dateOnly.trim())) return null;
  const diff = dateOnlyUTCms(dateOnly.trim()) - dateOnlyUTCms(todayDateOnly());
  return Math.round(diff / 86_400_000);
}

/** Add `n` days (may be negative) to a `YYYY-MM-DD` string. DST-immune. */
export function addDaysToDateOnly(s: string, n: number): string {
  const r = new Date(dateOnlyUTCms(s) + n * 86_400_000);
  return `${r.getUTCFullYear()}-${pad2(r.getUTCMonth() + 1)}-${pad2(r.getUTCDate())}`;
}

/** Weekday of a date-only string, 0=Sun … 6=Sat. Timezone-immune. */
export function dateOnlyWeekday(s: string): number {
  return new Date(dateOnlyUTCms(s)).getUTCDay();
}
