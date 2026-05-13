# Poly-Tech HR System — Usage Manual

> Living document. Sections below describe features as they ship.
> Add new sections at the bottom as we build more.

**Last updated:** 2026-05-13
**Latest commits covered:** through `979f54d` (filter refresh fix) + Forecast tab on Leave Payouts (this commit)

---

## Table of contents

1. [Signing in (employees and HR)](#1-signing-in)
2. [Forgot password (6-digit OTP)](#2-forgot-password)
3. [Inviting & managing employees (Employee Directory)](#3-employee-directory)
4. [Reviewing registrations (HR)](#4-reviewing-registrations)
5. [HR Email Actions (4 explicit choices)](#5-hr-email-actions)
6. [Document upload & rotation](#6-document-upload--rotation)
7. [PTO entitlement & monthly accruals](#7-pto-entitlement--monthly-accruals)
8. [Bulk Excel import / export (Balance Management)](#8-bulk-excel-import--export)
9. [Uncompleted-form warning system](#9-uncompleted-form-warning-system)
10. [Timesheet entry & Monthly Consolidated](#10-timesheets)
11. [Compensation (BASIC + HRA + Transport)](#11-compensation)
12. [Leave Payouts calculator](#12-leave-payouts)
13. [What runs automatically (cron schedules)](#13-automated-jobs)
14. [Domain & email infrastructure](#14-domain--email)
15. [Known follow-ups](#15-known-follow-ups)

---

## 1. Signing in

- **URL:** `https://www.polytech-hr.com` (primary) or `https://gaw-hr.vercel.app` (legacy, still works during cutover).
- All employees can sign in **regardless of registration status** — the only gate is `is_active`. Inactive accounts see *"Your account is inactive. Please contact HR to re-activate it before signing in."*
- After sign-in, the auth guard routes based on status:
  - `active` → Dashboard
  - `pending_info` / `email_unverified` → Registration form (forced)
  - `info_rejected` → Registration form (with bypass option to dashboard)
  - `pending_approval` → "Waiting for approval" screen
  - `not_invited` → Registration form (treated like `pending_info`)

---

## 2. Forgot password

Employees who lose access click **Forgot password?** on the sign-in screen.

**The flow:**
1. They type their email and click **Send code**.
2. Supabase sends a 6-digit OTP email (subject: *"Reset your HR app password — code inside"*).
3. They click **Enter the code** → land on `/reset-password` with email pre-filled.
4. They enter the 6-digit code + new password (twice).
5. **Update password** → resets via `supabase.auth.verifyOtp({ type: 'recovery' })` + `updateUser({ password })`.
6. Auto-signed-out from any stale session, redirected to `/sign-in` to sign in with the new password.

**Why OTP, not a magic link:**
Corporate email scanners (Microsoft Defender Safe Links, Mimecast, Proofpoint, etc.) preview every link in inbound mail. A magic link gets *consumed* by the preview — by the time the user clicks it, the token is already burned. A typed 6-digit code can't be consumed by a scanner.

**Settings:**
- OTP length: **6 digits**
- OTP validity: **1 hour** (configurable up to 24h via Supabase Dashboard → Auth → Email OTP Expiration)
- Email template: editable at Supabase Dashboard → Authentication → Email Templates → **Reset Password**

---

## 3. Employee Directory

**Path:** Admin → Employees (`/admin/employees`)

### Filtering

- Per-column filter row at the top (Employee / Email / Phone / Department / Role / Status).
- **Include inactive** toggle (top right) — default ON. Turn off to focus on the live workforce only. Preference persists across navigation.
- The subtitle shows the live count: *"237 shown · 1 inactive"*.

### Selecting rows

Tick the leftmost checkbox to select rows. With at least one row selected, four bulk-action buttons appear in the header (next to **New Employee**). See [HR Email Actions](#5-hr-email-actions).

### Editing an employee

Click any row → **Edit Employee** dialog opens. From there you can change:
- Identity: Full Name, Email (auth-mirrored), Phone, Employee Code, Job Title, Start Date
- Org: Role, Department, Supervisor, Manager, Workday Hours
- Status: Active / Inactive (**only HR controls this — never auto-flipped**)
- Annual PTO Entitlement (days/year) — live preview of the monthly accrual it produces
- Auto-warn opt-in (see [Uncompleted-form warning system](#9-uncompleted-form-warning-system))
- Capability flags (HR Director / Operations Manager / etc.)
- ID document preview with rotate & save (see [Document upload & rotation](#6-document-upload--rotation))
- Email action to fire after Save (see [HR Email Actions](#5-hr-email-actions))

### Adding an employee

**New Employee** button (top right) opens the invite dialog. Required: name, email, role, department, supervisor, manager, job title, start date, workday hours. Employee code is auto-generated from the `emp_code_seq` Postgres sequence; HR can override with a legacy code.

### Bulk remap Emp Codes (admin tool)

For one-off legacy code migrations (e.g. renumbering everyone from `70xxx` to `80xxx`), the header has a **Remap Emp Codes** button (outlined style, less prominent than New Employee). It opens a small dialog:

1. Pick an Excel file with **two columns** — headers can be any wording that contains "Old" + "Code" and "New" + "Code" (case-insensitive). Example:

   | Old Emp Code | New Emp Code |
   |---|---|
   | 70023 | 80023 |
   | 70025 | 80025 |

2. The dialog parses the file and validates each row against the live data:
   - **✓ valid** — old exists and new is free
   - **✗ old not found** — no employee has that code
   - **✗ new already used** — another employee already has that code
   - **✗ duplicate in batch** — same new_code used more than once in the upload
   - **✗ identical** — old equals new
   - **✗ blank** — one of the cells is empty

3. **Apply** is disabled until every row is ✓.
4. Each successful rename updates `employee_documents.emp_code` AND writes one row to `profile_audit_log` with `context='bulk_remap'`, `old_value`, `new_value`. The change is reversible by inspecting the audit log.

This isn't meant for daily use — for one-off renames, use the **Employee Code** field in Edit Employee instead.

---

## 4. Reviewing registrations

When an employee submits the registration form, HR sees them in **Action Required → Pending Registrations** on the dashboard.

Click **Review** → **Review Registration** dialog opens.

### What HR sees
- Identity, contact, nationality, ID type, ID number, expiry — all read-only by default.
- Inline preview of the uploaded ID document (image or PDF).
- Yellow-tinted fields = employee changed a value HR originally pre-filled.

### Editing on the spot

**Edit fields** button (top right) unlocks: Full Name, Email, Phone, Nationality, ID Type, ID Number, ID Expiry, plus the document slot. Email changes go through `update-employee-email` (auth-mirrored). Document replacement uploads to Storage.

### Confirming changes before approval

When HR clicks **Approve** with any edits in place, the dialog flips to a **Confirm changes** view listing every diff (`old → new`) with an audit-log preview. Save fires `hr_update_pending_profile()` RPC which writes both the changes and one `profile_audit_log` row per field.

### Sending back for changes (replaces old "Reject")

Click **Send back for changes** (amber, was the old red "Reject"). HR types what needs fixing in the comment field; the action:
- Sets `registration_status = info_rejected`
- Saves the comment to `registration_note`
- Does **not** touch `is_active`
- Fires the "needs changes" email to the employee
- Inserts an in-app notification

Employee resubmits via the registration form (banner shows HR's comment at the top); status flips back to `pending_approval` for HR's next review.

---

## 5. HR Email Actions

Four explicit, named actions. Available both in the **Employee Directory bulk header** (as buttons when rows are selected) and inside the **Edit Employee dialog** (as a radio under "Email After Save").

| Action | Email sent | Status change | When to use |
|---|---|---|---|
| **Send Password Reset** (blue) | Supabase 6-digit OTP recovery | none | Employee forgot password |
| **Send Invite** (green) | Two emails, in order: reset OTP first, then info-form request | `active → info_rejected` (for the info-form step) | First-time onboarding or full re-onboarding |
| **Send Info Form Request** (amber) | Resend "info_form_request" template (no OTP) | `→ info_rejected` (with optional HR comment) | HR wants the employee to update profile info; password stays as-is |
| **Send Warning** (red) | Resend "manual_form_warning" template (HR-customisable body) | none | Ad-hoc reminder about an uncompleted form |

### Bulk dialog UX

Each button opens the same dialog with:
- Per-row editable email (auth-mirrored via `update-employee-email` before send)
- Per-row × to drop a row from the batch
- Amber chip + top-of-dialog warning for any inactive rows (still sendable, since the employee may need to be reactivated separately)
- Optional **Comment for employee** field (info-form / warning actions only)
- Send button labelled with the chosen action's verb and recipient count

### Inside Edit Employee

A single radio chooses one of: Save only / Reset / Invite / Info Form / Warning. Picking Invite or Info Form / Warning surfaces a comment box. Save dispatches whichever was picked after persisting the rest of the dialog's edits.

---

## 6. Document upload & rotation

Applies to ID document uploads in both the employee registration form and the HR review dialog.

### Auto-orient on first upload

Phone cameras embed EXIF orientation in JPEGs (the bytes are landscape; metadata says "rotate me 90°"). Most browsers honour this for preview but downloaded copies and some viewers don't.

When an employee picks a file, we read the EXIF orientation tag and **re-encode** the pixels rotated to match. The stored file is upright regardless of viewer.

### Manual rotate-and-save

If a file is still sideways (e.g. a paper scan), use the **⟲ Rotate 90°** button under the preview. Each click rotates the display in 90° steps. Click **Save rotation** to persist; the rotated bytes overwrite the original at the same Storage path. Click **Reset** to discard pending rotation.

PDFs don't get the rotate button (canvas can't redraw PDF pages without a heavy dependency). PDFs surface as a clickable card opening in a new tab.

**Available in three places:**
- Employee's registration form (Phase B form)
- HR Review Registration dialog (preview + edit-mode)
- HR Edit Employee dialog (preview only — no full edit yet)

---

## 7. PTO entitlement & monthly accruals

Replaces the old Excel formula `=IF([Entitled/YEAR]=30, prev+2.5, prev+1.75)` with a managed, audited, idempotent monthly accrual.

### Entitlement entry

Set per-employee via Edit Employee → **Annual PTO Entitlement (days/year)** field. Common values: **30** (Saudi 5+ years tenure), **21** (under 5 years). Default for any employee with `NULL` is `21` (per agreed policy).

The dialog shows a live read-only preview of the monthly accrual:
`monthly_days = entitlement / 12`
`monthly_hours = monthly_days × workday_hours`

Example: 30 days × 8 hours / 12 = `2.5 days/month = 20.0h`.

### How accrual happens

Three independent triggers, all calling the same RPC `apply_monthly_accruals()`:

1. **pg_cron `monthly_pto_accrual`** — automatic, `00:05 UTC on day 1 each month`, credits all active employees with `entitlement IS NOT NULL`.
2. **Lazy fallback in `useBalance` hook** — first time any employee views a balance in a new month, their accrual is applied on demand (covers gaps if cron missed).
3. **"Run Monthly Accruals" button** (Balance Management page) — HR-initiated, idempotent, safe to spam.

All three are protected by `UNIQUE (employee_id, leave_type, year, month)` on the `leave_accruals` table → no double-credit possible.

### Audit trail

Every accrual writes:
- One row to `leave_accruals` (per-month detail: days, hours, workday_hours snapshot, source = 'system' / 'lazy' / 'manual')
- One row to `leave_ledger` with `reason = 'accrual'` (the same audit table manual adjustments use)
- An in-place increment on `leave_balances.balance_hours`

Visible at Admin → Balance Ledger.

### Year rollover

On the first accrual of a new year (e.g. Jan 2027), the previous year's balance is **carried over unchanged**. `used_hours` resets to 0. January's accrual is added on top. Per agreed policy.

---

## 8. Bulk Excel import / export

**Path:** Admin → **Balance Management** → header buttons.

### Export Excel

Downloads `employees_bulk_<date>.xlsx` with one row per active employee. Columns:
- Emp Code (match key, read-only)
- Name, Email, Department (read-only context)
- DOJ, Workday Hours, Entitled / YEAR (editable)
- PTO Balance (hours) (editable — overwriting fires a `leave_ledger` row)
- PTO Used (hours) (read-only)

### Import Excel

1. Edit the downloaded file.
2. Click **Import Excel** → pick the modified file.
3. Each row is matched by **Emp Code**. Unknown codes show in the result banner as errors and are skipped.
4. For each successful row:
   - Profile fields update via `userService.updateProfile`.
   - Balance overrides go through `leave_ledger` with `reason='manual_adjustment'` so HR's change has an audit row.
5. Result banner shows N succeeded / M failed with the first 5 errors detailed.

### Adding a new bulk-editable column

Edit [`lib/employee-bulk-fields.ts`](../lib/employee-bulk-fields.ts) — one entry per column with `key`, `label`, `type`, `read`, `write`. Both export and import read this array; no other code changes needed beyond a schema migration if it's a new DB column.

---

## 9. Uncompleted-form warning system

Pressures employees to finish their registration info promptly. Per-employee opt-in.

### Setup

In Edit Employee, toggle **Auto-warn if registration form goes uncompleted** (default ON for new employees). Persists to `profiles.warn_on_uncompleted_form`.

### Daily run

`pg_cron daily_form_warnings_run` fires at `06:00 UTC = 09:00 Saudi time` and POSTs to the `run-form-warnings` Edge Function:

1. Calls `send_form_warnings_check()` RPC — scans active employees in `pending_info` / `info_rejected` with opt-in on, computes days since `updated_at`.
2. For each recipient:
   - **Day 3+** → email type `form_reminder_day3` ("please complete your profile")
   - **Day 4+** → email type `form_salary_hold_day4` (**"your salary for this month will be held and paid only with next month's payroll until you complete your profile"**)
3. HR + HR Director addresses are **BCC'd** on each email (employee doesn't see HR in the CC line).
4. UNIQUE constraint on `(employee_id, warning_type, sent_date)` makes re-runs same-day no-ops.

### Manual warnings

HR can fire ad-hoc warnings at any time via the bulk **Send Warning** button. Optional message field for custom wording. Logged with `warning_type='manual'`.

### Audit

`form_warnings_log` table — one row per warning sent. Visible via direct SQL today (no dedicated UI yet — see [Known follow-ups](#13-known-follow-ups)).

---

## 10. Timesheets

### Timesheet Entry

**Path:** `/timesheet-entry`. Per-project, per-week.

- Week starts on **Sunday** (Saudi convention).
- **Edit window:** 2 working days back. Older days are locked (greyed); current and next-day editable.
- **Manual R+OT mode:** projects with `entry_mode = 'manual_rot'` allow keepers to type R and OT directly per cell (two columns per day). Auto mode = single column, R/OT split derived at save.
- **Project info chip** under the title shows current mode + regular hours/day setting.
- **Request change** button opens the Project Hours Change Request dialog — used for retroactive edits on locked / approved entries.
- **TOTAL block** on the right edge: R / OT / ALL columns. Same shape on Manual and Auto.

### Monthly Consolidated

**Path:** Admin → Timesheets → Monthly Consolidated. Cross-project view per calendar month.

- Header buttons: month navigator, "Regular hrs/day" (drives the OT split), supplier filter, **Export Excel**.
- Filter buttons: **Show R** / **Hide OT** / **Show All Columns**.
- Right edge: same **TOTAL** group as Timesheet Entry — R / OT / ALL columns, always visible regardless of the day-column toggle.
- Per-row subtotals; bottom row shows column totals.

---

## 11. Compensation

**Path:** Admin → **Compensation** (`/admin/compensation`)
**Also accessible from:** Employee Directory → click any row → Edit Employee → **Compensation** section

### Model

`employee_compensation` is **effective-dated**: each row has an `effective_from` date. The row currently "in effect" is the one with the latest `effective_from <= today`. To record a raise, HR inserts a **new** row — past rows are kept as the audit trail and as the source of truth for past-month payouts.

Components per row:
- **Basic Salary**
- **HRA** (housing allowance)
- **Transportation**
- **Other Allowances** (single catch-all bucket for now — phone, food, etc.)
- **Notes** (free text, e.g. "Annual raise 2026")
- **Currency** (default SAR)

### Two entry points

**Quick-edit (most common):** Open any employee via Edit Employee → scroll to the **Compensation** section. Change any of the four amounts + pick **Effective From** date. Save fires a `compensationService.addNewRow()` call only if at least one amount changed; unchanged saves don't write a new row.

**Standalone page (history view):** Admin → Compensation lists every active employee with their current row + monthly total. Click any row → modal opens showing the full effective-dated history (most recent first, "current" tagged). **+ Add new pay row** button inserts a new effective-dated row without leaving the page.

### Past-month payouts

Because rows are effective-dated, [Leave Payouts](#12-leave-payouts) for any past month automatically uses the row that was in effect on the **1st of that month**. Raises don't retroactively change historical payouts.

### Bulk Excel (mass updates)

For setting up the initial values across the whole company, or applying a uniform raise to many people at once, the page header has two extra buttons:

- **Export Excel** — downloads `compensation_<today>.xlsx` with one row per active employee. Columns: Emp Code (key) · Name · Department · Current Effective From · Basic Salary · HRA · Transportation · Other Allowances · Notes. The latter five are editable; the rest are context.
- **Import Excel** — opens a confirm dialog asking for the **Effective From** date that applies to every row in the batch. After picking it and clicking Import, the system:
  - Matches each row to an employee by Emp Code.
  - Compares the four amount fields (and Notes) to the current row.
  - For every row that changed → inserts a new effective-dated row with the chosen date.
  - For every row that's unchanged → no-op (counted as "unchanged" in the summary).
  - For rows that fail → reported per-row in the result banner. Most common failure: a row already exists with that exact `effective_from` for that employee. Pick a different date or edit by hand.

The metadata array lives in [`lib/compensation-bulk-fields.ts`](../lib/compensation-bulk-fields.ts) — adding a new pay component later = one entry there + a migration + nothing else.

---

## 12. Leave Payouts

**Path:** Admin → **Leave Payouts** (`/admin/leave-payouts`)

Two tabs at the top, both keyed off the same month picker, search, and department filter:

### Tab 1 — Forecast (from balance) — *default, planning view*

What-if calculator. Mimics the Excel HR has been using.

- Two **global inputs** at the top of the filter row apply to every visible row:
  - **Forecast Days** — type a single number (e.g. 10) and every visible employee's pay columns recompute as `comp/30 × 10`. The TOTAL summary refreshes live.
  - **Start Date (optional)** — when filled, treats Days as a date range starting from this date. Days falling outside the selected month are clipped, so a cross-month leave (e.g., May 25 + 14 days) splits correctly when you flip the month picker.
- Defaults are empty (Days = 0, Start Date = none) so the page opens at 0 pay until HR types something. **Clear** button resets both.
- The grid itself is read-only — Available Days shown for context, pay columns derived from the globals.
- **Available Days** column shows each employee's current PTO balance, so HR can spot who's near their cap before typing a forecast.
- The search and department filters are the way to narrow which people the globals apply to. Filter to "OPERATIONS" and type 5 days → see "if every operations person took 5 days this month, here's the total."
- **Export Forecast** writes the grid + the global Days/Start Date as audit columns + a TOTAL footer row.

Backing RPC: `compute_predicted_payouts(year, month, department?)` — returns comp + balance per employee; the what-if math (single Days × every row, or date-range overlap) is client-side for instant feedback.

### Tab 2 — Actual (from approved leave) — *payroll view*

End-of-month payroll number. Use this to know what to add to the payroll ledger.

- Sums **approved leave-request days** that fall inside the selected month → `payable = (component / 30) × days`.
- Cross-month leaves (May 28 → Jun 5) contribute the right slice per month (4 days to May, 5 to June).
- No editable inputs — the data comes straight from the approval workflow.
- **Export Actual** for the payroll team.

Backing RPC: `compute_leave_payouts(year, month, department?)`.

### Shared between tabs

- **Month nav** (`‹ May 2026 ›`) — past, present, or future.
- **Search box** (name / emp code / department) and **Department dropdown**.
- **Compensation snapshot** for both is taken at `month_end` of the selected month (migration 034). So a comp row entered on 2026-05-13 counts for May 2026 onwards; past months still use the row that was effective then. Honest historical accuracy + forgiving for new hires entered mid-month.

### Common use cases

- "What's our leave-pay budget for next quarter?" → Forecast tab, Days=30 + empty Start Date, flip through Jun/Jul/Aug, top-right TOTAL each month.
- "How much do I add to May's payroll for leave?" → Actual tab, end of May.
- "If Aqeel takes 10 days starting June 20, how much pays in June vs July?" → Forecast tab → search "Aqeel" so only his row is visible → Days=10 + Start Date=2026-06-20 → toggle month picker between Jun and Jul. June shows 11 days × comp/30; July shows 3 days × comp/30.
- "What does it cost if Operations takes a 5-day company-wide break?" → Forecast tab → Department=OPERATIONS → Days=5 → TOTAL is your number.

---

## 13. Automated jobs

Confirmed scheduled via `pg_cron`:

| Job name | Schedule | What it does |
|---|---|---|
| `monthly_pto_accrual` | `5 0 1 * *` (00:05 UTC, 1st of each month) | Credits PTO accruals to every active employee |
| `daily_form_warnings_run` | `0 6 * * *` (06:00 UTC daily = 09:00 Saudi) | POSTs to `run-form-warnings` edge function → reminders/salary-hold emails |

Check status: `SELECT jobname, schedule FROM cron.job;` (Supabase SQL editor).

Manual escape hatches for all of the above are present in the UI — see sections 7 and 9.

---

## 14. Domain & email

### Canonical domain

`https://www.polytech-hr.com` (Vercel + Cloudflare). Old `gaw-hr.vercel.app` still works during cutover.

### Where the URL is configured

| Layer | Setting |
|---|---|
| Supabase Auth `site_url` | `https://www.polytech-hr.com` — drives `{{ .SiteURL }}` in all auth emails |
| Supabase Auth `uri_allow_list` | `polytech-hr.com/**`, `www.polytech-hr.com/**`, `gaw-hr.vercel.app/**`, `localhost:8081/**` |
| Edge Function secret `APP_URL` | `https://www.polytech-hr.com` — used by edge functions to build email links |
| Client code | Reads `window.location.origin` dynamically — no hardcoded URL |

### Email provider

- **Provider:** Resend (`EMAIL_PROVIDER=resend`)
- **From:** Configured via `EMAIL_FROM` edge function secret
- **Templates:**
  - Supabase Auth templates (Recovery, Invite, etc.) — edit at Dashboard → Authentication → Email Templates
  - Resend transactional templates (registration_*, info_form_request, form_reminder_day3, form_salary_hold_day4, manual_form_warning) — defined in `supabase/functions/send-registration-email/index.ts`

### Adding a new email type

1. Add the type to `EmailPayload['type']` union in `send-registration-email/index.ts`.
2. Add a new `case` in `buildEmail()` with subject + HTML body.
3. Optional: pass `bcc: string[]` in the payload to silently copy others.
4. Redeploy: `supabase functions deploy send-registration-email --no-verify-jwt`.

---

## 15. Known follow-ups

Items deferred from today's work, listed in priority order so we don't forget:

- **`form_warnings_log` audit UI.** Today HR sees who got warned only via SQL. A small page at `/admin/form-warnings` (list view with employee + warning_type + sent_date) would be the natural addition.
- **Universal status-change email framework.** User asked for it but we deferred. Single event-to-email mapping table, generic edge function endpoint. Will replace the scattered email-per-feature pattern.
- **HR vs HUMAN RESOURCES department consolidation.** Two values exist in `lookup_departments`; HR hasn't decided which is canonical.
- **110 missing Excel employees bulk import.** From the 2026-05-11 reconciliation — `docs/EMPLOYEE_DATA_RECONCILIATION_05_11_2026.md`.
- **Apex domain (polytech-hr.com without www) Vercel mapping.** DNS-side decision; both are already in the Supabase allow-list.
- **HR-side mobile UX for the new dialogs.** Edit Employee, Review Registration, and the bulk dialogs are web-only today (MUI components, `if (isWeb)` paths). Mobile gets a simpler list-only view.
- **Apply migration via `supabase db push`** — local migration history is out of sync with remote since we've been applying via `supabase db query --linked --file`. Worth a `supabase migration repair --status applied` pass to align.

---

## Maintenance notes

- All migrations are idempotent (`CREATE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, drop-then-recreate for cron jobs). Safe to re-run.
- Edge functions are deployed with `verify_jwt:false` for the internal ones (`run-form-warnings`); JWT-required for HR-facing ones (`update-employee-email`, `request-profile-verification`).
- The lazy fallback in `useBalance` is defence-in-depth — even if pg_cron is disabled, balances self-heal on first read each month.
