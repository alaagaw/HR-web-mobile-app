# Session Recap — May 5 to May 8, 2026

Comprehensive log of everything built, fixed, decided, and discovered across this multi-day session. Written as a reference you can return to. For *design* documents, see the other files in this folder; this one is the *narrative* and the cross-reference index.

> See also:
> - [EMAIL_AND_AUTH_FLOW_PLAN_05_05_2026.md](EMAIL_AND_AUTH_FLOW_PLAN_05_05_2026.md) — original plan, marked with status updates
> - [EMPLOYEE_EDIT_AND_SELF_EDIT_APPROVAL_PLAN_05_07_2026.md](EMPLOYEE_EDIT_AND_SELF_EDIT_APPROVAL_PLAN_05_07_2026.md) — Feature 1 (shipped) + Feature 2 (queued)
> - [DEPLOYMENT_AND_OPERATIONS.md](DEPLOYMENT_AND_OPERATIONS.md) — current production config + how to deploy + gotchas

---

## 1. Goal at the start of the session

The session began with a working HR app at `gaw-hr.vercel.app` that had two known problems:

1. **Invite emails weren't arriving.** The existing `invite-employee` Edge Function was deployed but its Resend integration was broken (no API key, swallowed errors).
2. **No way for new employees to set their own password** — current code generated a temp password and emailed it, but emails never arrived.

The user's eventual scope kept expanding (in a good way) from "fix the invite email" to a full identity / onboarding / approval pipeline.

---

## 2. Final system state (as of 2026-05-08)

| Layer | Configuration |
|---|---|
| **Web frontend** | Vercel auto-deploy from `main` → `https://gaw-hr.vercel.app` |
| **Supabase project** | `vwalbkxighagreetxczi` (free tier) |
| **Email transport** | Resend SMTP via verified domain `polytech-hr.com` ($10/yr Cloudflare-bought throwaway). When `polytech.com.sa` is verified by the DNS owner, swap the Sender field — no code change. |
| **Sender address** | `noreply@polytech-hr.com` |
| **Branding** | All emails open with a Poly-Tech hero banner image (`{{ .SiteURL }}/Poly-Tech_HR_Management_System.png`) and read as "Welcome to Poly-Tech HR Management System" |
| **Invite mode** | `magic_link` (employee gets a link, sets their own password). `temp_password` mode is also coded but inactive. |
| **Invite flow** | HR creates → status `not_invited` → click "Send Invite(s)" → email arrives → employee sets password → status flips to `pending_info` → AuthGuard routes to `/registration-form` → employee fills in identity docs → status `pending_approval` → HR reviews → `active` → full system access. |
| **emp_code generation** | Postgres sequence `emp_code_seq` (atomic, race-free). HR can override for legacy imports. |
| **RLS** | Migration 014 prevents self-promotion of role/supervisor/manager/department. Migration 017 prevents self-update of `emp_code`. |
| **`auth.users` ↔ `profiles` sync** | Email auto-syncs via trigger 015 after `auth.updateUser({email})`. Soft-delete propagates `is_active=false`. |

---

## 3. Decisions locked in (and who chose what)

| Decision | Choice | Made by |
|---|---|---|
| Email provider | **Resend** (pluggable adapter pattern lets us swap Brevo/SES/SendGrid later in 1 file) | Tech-lead recommendation, user confirmed |
| Sender domain | `polytech.com.sa` ideal; routed around with `polytech-hr.com` while waiting on DNS owner | User picked Cloudflare buy-domain workaround |
| Sender pattern | **Pattern A** — each HR sends from their own `@polytech.com.sa` address (`maram@`, `aqeel@`, etc.) | User confirmed all HR mailboxes can receive |
| Invite UX | **Magic link** (employee sets own password) by default. **Temp password** kept as togglable `INVITE_MODE` for HR-from-address branded option. | User said "yes/yes" to both |
| Two-step invite workflow | Create employee row first (`not_invited`) → "Send Invite(s)" later (single or batch) | User proposed; tech lead confirmed |
| Profile self-edit | Goes through change request → HR approves (Feature 2, designed not built) | User wanted approval workflow |
| Email change for HR editing employee | Real Edge Function `update-employee-email` calling `auth.admin.updateUserById` | User picked option B |
| Field validation strictness on Edit dialog | Same as New (every field required) | User confirmed |
| `emp_code` generation | Auto via Postgres sequence; HR can override for legacy imports | User confirmed (i): preserve existing codes when importing from Excel |
| Phone field at HR creation | Optional (employee fills) | User confirmed |
| Occupation field | Auto-derived from `job_title` HR enters | User confirmed |
| ID expiry color coding | Match existing document-expiry tracker traffic-light scheme | User confirmed |
| Verification email subject | "Action Required: Complete your Poly-Tech HR profile" — combines "Action Required" + descriptive content | User said "combine smart way" |
| Diff view for HR review | Yellow tint + hover tooltip showing old value | Tech lead recommendation |

---

## 4. Phases completed

### 4.1 Email & Auth flow infrastructure (commits `7eb5272`, `b964292`, `aea1b81`)

- **3 migrations:**
  - `014_profiles_self_update_lockdown.sql` — RLS narrowed so non-HR can only edit `full_name` + `phone` on their own profile (closes a privilege escalation hole — anyone could PATCH `role='hr_director'` before this)
  - `015_auth_profiles_sync.sql` — DB trigger auto-syncs `auth.users.email` → `profiles.email` after a confirmed change; backfill query fixes pre-existing drift
  - `016_employee_extras_and_not_invited.sql` — `job_title`, `start_date` columns; new `not_invited` registration status
- **Pluggable email adapter:** [`supabase/functions/_shared/email.ts`](../supabase/functions/_shared/email.ts) + `providers/resend.ts`. Provider chosen via `EMAIL_PROVIDER` env var. Future Brevo/SES/SendGrid drop in as separate adapter files.
- **Edge Functions split** the old monolithic `invite-employee` into:
  - `create-employee` — creates the profile + auth.users row, no email
  - `send-invite` — sends the magic-link / temp-password (single or batch)
  - `update-employee-email` — HR-only auth email change
  - `request-profile-verification` (added later in Phase A) — bulk demote to `pending_info`
- **Forgot/reset password flow:**
  - New screen `(auth)/forgot-password.tsx` — anti-enumeration message
  - New screen `(auth)/reset-password.tsx` — handles Supabase recovery URL (eventually got rewritten to use a dedicated supabase client because of the no-op lock issue, see §6.4)
  - `authService.resetPasswordForEmail()` + `updateEmail()` added
- **Profile self-edit:**
  - Mobile got a full Edit Profile screen (was read-only)
  - Web Edit dialog now routes email changes through `auth.updateUser({email})` instead of writing `profiles.email` directly (fixes drift bug)
  - Voluntary "Change Password" entry separate from forced first-login flow

### 4.2 Setup 3.A — Get the system live (no DNS)

- Migrations applied via Supabase SQL Editor
- Edge Function secrets set: `INVITE_MODE=magic_link`, `APP_URL=https://gaw-hr.vercel.app`
- Site URL + Redirect URLs configured in Supabase Auth → URL Configuration
- 3 Edge Functions deployed via `supabase functions deploy`
- Email template "Reset Password" customized as a welcome message (initially pushed via `supabase config push` — see §6.5 for the gotcha that overwrote other Auth settings)

### 4.3 Setup 3.A.bis — Resend with throwaway domain (commit `9d2de56` for branding)

- Bought `polytech-hr.com` from Cloudflare ($10/yr)
- Verified in Resend via Cloudflare auto-configure (DKIM, SPF MX, SPF TXT)
- Generated Resend API key, plugged into Supabase Auth → SMTP Settings (sender `noreply@polytech-hr.com`)
- Added `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_PROVIDER=resend` as Edge Function secrets
- Email branding rewritten to "Poly-Tech HR Management System" with hero banner image
- Verified end-to-end delivery to Yahoo + Gmail

### 4.4 Feature 1 — HR Edit Employee dialog parity (commits `60f0db2`, `bda5fda`, `0c230d1`, `9d2de56`)

- Edit dialog now mirrors the New Employee form field-for-field plus a Status dropdown
- All 11 fields: Full Name, Email, Employee Code, Phone, Job Title, Start Date, Role, Workday Hours, Department, Supervisor / Reports To, Manager
- "Show all employees" toggle on Supervisor + Manager (curated default + escape hatch)
- Workday Hours added to New form too (was missing)
- Conditional "Send invite now" checkbox in Edit dialog — visible for any active employee, with adaptive copy (first invite vs resend)
- Lifted status gate so HR can send/resend invite to any active employee, not just `not_invited` and `active`
- HR email change calls `update-employee-email` Edge Function (not direct profile write)

### 4.5 Phase A — Registration completion flow (commit `e5a5102`)

- **Migration 017** (the big one):
  - `profiles.nationality`, `profiles.hr_original_values` JSONB
  - `employee_documents.id_type` (national_id / iqama / passport), `national_id_number`, `id_document_url`
  - **`emp_code_seq` Postgres sequence** + `generate_next_emp_code()` SECURITY DEFINER function (atomic, race-free)
  - **RLS** narrowed so non-HR can't update `emp_code` on their own row
  - **Storage bucket `employee-id-documents`** with RLS (employee read/write own folder; HR read all)
- **`create-employee` Edge Function** updated:
  - `emp_code` now optional — auto-generated via the sequence if blank
  - Phone optional
  - Snapshots HR-entered values into `profiles.hr_original_values` for diff
  - Auto-sets `occupation = job_title`
- **`send-invite` Edge Function** updated:
  - First-time invite (was `not_invited`) → status flips to `pending_info` (not `active`) so AuthGuard routes to `/registration-form`
  - Resends preserve current status (don't demote)
- **`request-profile-verification` Edge Function** (new):
  - HR-only bulk action
  - Demotes selected `active` employees to `pending_info`
  - Triggers a magic-link email "Action Required: Complete your Poly-Tech HR profile"
  - Returns per-id results
- **HR forms:** New Employee dialog: `emp_code` + phone now optional. Edit dialog: phone optional, `emp_code` stays required.
- **Bulk button:** new orange "Request Profile Verification (N)" button next to "Send Invite(s) (N)" in the employee table toolbar

---

## 5. Phase B — still pending

The end-to-end flow now works using the **legacy** `registration-form.tsx`, which collects iqama/passport/insurance/occupation/birth_date but NOT the new fields (nationality, ID type, ID document upload). Phase B closes that gap:

1. **Registration form rewrite** (~1.5 h):
   - Pre-fill HR-entered values
   - Mark HR-controlled fields read-only (Job Title, Role, Department, Supervisor, Manager, Start Date, Workday Hours, Employee Code)
   - Add Nationality dropdown
   - Add ID Type selector (national_id / iqama / passport)
   - Add ID Number + Expiry fields conditional on type
   - Add ID document upload to Supabase Storage `employee-id-documents` bucket
   - Update Zod schema (`lib/validators.ts:120`) to match
2. **HR Pending Registrations admin diff view** (~45 min):
   - Compare each field's current value to `hr_original_values` snapshot
   - Yellow tint on changed fields with hover tooltip showing original value
   - Render uploaded ID document inline (PDF embed / image preview)
   - ID expiry color coding matching the existing document-expiry tracker
3. **Tests** (~30 min)

---

## 6. Bugs hit during the session (and the actual root causes)

### 6.1 MUI X DataGrid v8 selection model crash (fixed `0d57838`)

- **Symptom:** "Cannot read properties of undefined (reading 'size')" on Manage Employees
- **Cause:** MUI X DataGrid v8 changed `rowSelectionModel` from `string[]` to `{ type, ids: Set }`. We were passing an array.
- **Fix:** wrap in `{ type: 'include', ids: new Set(selectedIds) }` and unwrap from `.ids` on change.

### 6.2 React error #300 on sign-out (fixed `a556e89`)

- **Symptom:** "Something went wrong — Error: Minified React error #300" right after clicking Sign Out
- **Cause:** Hooks order violation in `profile.tsx`. A `useState(changePwOpen)` was declared AFTER an `if (!user) return null` early return. When user became null on sign-out, the early return fired, the useState was never called, hook count changed between renders → crash.
- **Fix:** moved the `useState` above the early return; added an in-code comment so future state additions don't hit the same trap.

### 6.3 AuthGuard auto-redirecting off `/reset-password` (fixed `60cdd84`)

- **Symptom:** Reset-password page appeared briefly then disappeared, going to dashboard instead.
- **Cause:** AuthGuard saw the freshly-set Supabase recovery session as a regular authenticated user with `status='active'` and immediately replaced the route to `/dashboard`.
- **Fix:** added `AUTH_EXEMPT_ROUTES = ['(auth)/reset-password', '(auth)/forgot-password']`. AuthGuard returns early on those paths regardless of auth state.

### 6.4 `setSession()` hang (fixed `2d6c809`, then refined `7323e24`, `6fe8c05`, `43c37ec`)

This one took several attempts.

- **Symptom:** Reset-password page stuck on "Verifying your reset link…" forever, even with a valid `access_token` in the URL.
- **Initial misdiagnosis:** I blamed Gmail link prefetching. Pushed the user to spend $10 on a domain. ❌ Wrong call.
- **Real cause:** The global supabase client (in `services/supabase/client.ts`) is configured with `detectSessionInUrl: false` AND a no-op `lock` override — both deliberate to avoid bugs elsewhere in the app. Together, they break `supabase.auth.setSession()`: it never resolves.
- **Fix:** spin up a **dedicated supabase client** just for the reset-password page using SDK defaults (Web Lock + URL hash detection enabled). Both clients share the same localStorage key, so once the recovery client establishes a session, the global client picks it up on the next page load. After password update, hard-navigate to `/` so the global auth guard reads the new session.
- **Lesson:** check your own recent code before blaming external services. I added this as a behavior change in [DEPLOYMENT_AND_OPERATIONS.md §10](DEPLOYMENT_AND_OPERATIONS.md).

### 6.5 The `supabase config push` "section overwrite" gotcha

- **Symptom:** Tried to push a small email template change. Diff also showed `site_url` getting changed from `https://gaw-hr.vercel.app` to `http://127.0.0.1:3000`, redirect URLs getting wiped, MFA being disabled, etc.
- **Cause:** `supabase config push` does **section-level replacement**, not field-level merge. Whatever you don't declare in `config.toml`, it fills with CLI defaults — and pushes those defaults as if you set them.
- **Fix:** wrote a complete `config.toml` declaring every existing field explicitly. Re-pushed with clean diff (only template content changed).
- **Lesson:** for one-off email template edits, the Dashboard is genuinely safer than the CLI for hosted projects. Documented in [DEPLOYMENT_AND_OPERATIONS.md §6](DEPLOYMENT_AND_OPERATIONS.md).

### 6.6 Email link prefetching (real, but partial cause of the apparent recovery failures)

- **Real:** Gmail/scanners DO prefetch links from low-reputation senders like `noreply@mail.app.supabase.io`, consuming single-use tokens before the user clicks.
- **Misweighted:** I treated it as the dominant cause when bug 6.4 (the setSession hang) was independently breaking the flow regardless of which sender we used.
- **Resolution:** moving to Resend with `polytech-hr.com` reduces prefetching dramatically (warm reputation), AND the setSession fix made fresh tokens actually work.

---

## 7. Commits shipped (chronological)

| Hash | Summary |
|---|---|
| `7eb5272` | Add invite/email system, password reset, profile self-edit, RLS hardening |
| `847da31` | Ignore Supabase CLI cache (`supabase/.temp`) |
| `0d57838` | Fix MUI X DataGrid v8 selection model crash |
| `60cdd84` | Fix reset-password auto-redirect bouncing user off the page |
| `a556e89` | Fix React error #300 on sign-out (hooks order in profile.tsx) |
| `e03a308` | Improve UX when reset/invite link is already used or expired |
| `7323e24` | Fix reset-password ignoring valid recovery tokens (root cause #1) |
| `6fe8c05` | Add diagnostics + hard fallback to reset-password |
| `2d6c809` | Use dedicated Supabase client for recovery flow (final fix) |
| `b964292` | Add Supabase config.toml with welcome email template |
| `aea1b81` | Add DEPLOYMENT_AND_OPERATIONS.md reference doc |
| `bda5fda` | Add Workday Hours field to New Employee dialog |
| `60f0db2` | Rebuild HR Edit Employee dialog to mirror New form |
| `0c230d1` | Allow HR to send/resend invite at any time (any status, active only) |
| `67ab539` | Add EMPLOYEE_EDIT_AND_SELF_EDIT_APPROVAL_PLAN_05_07_2026.md |
| `43c37ec` | Tidy reset-password — drop diagnostic logs, refresh comments |
| `9d2de56` | Rebrand emails as Poly-Tech HR Management System with hero banner |
| `5f5ed2c` | Update plan + ops docs with current status and known issues |
| `d3d1ce6` | Swap invitation email hero image to Poly-Tech_HR_Management_System.png |
| `e5a5102` | Phase A — Force HR-invited employees through registration form + auto emp_code + bulk verify action |

---

## 8. New Edge Functions live on Supabase

| Function | Purpose |
|---|---|
| `create-employee` | HR creates a new profile (no auth user, no email yet). Auto-generates emp_code if blank. |
| `send-invite` | Sends the magic-link / temp-password email (single or batch). First-time invite demotes status to `pending_info`. |
| `send-registration-email` | Existing — HR notifications + applicant approval/rejection emails. Uses shared adapter. |
| `update-employee-email` | HR-only. Calls `auth.admin.updateUserById({email, email_confirm: true})`. Trigger 015 syncs `profiles.email` after. |
| `request-profile-verification` | HR-only bulk action. Demotes selected active employees to `pending_info` + sends magic-link "Action Required" email. |
| `invite-employee` (deprecated) | Old monolithic function. No longer called by the new UI. Safe to delete after confirming nothing references it (see [DEPLOYMENT_AND_OPERATIONS.md §11.2](DEPLOYMENT_AND_OPERATIONS.md)). |

---

## 9. New / heavily modified frontend files

| File | What changed |
|---|---|
| `app/_layout.tsx` | AuthGuard now exempts `/reset-password` and `/forgot-password` from auto-redirect |
| `app/(auth)/sign-in.tsx` | Added "Forgot password?" link (web + mobile) |
| `app/(auth)/forgot-password.tsx` | NEW — anti-enumeration "if account exists" messaging |
| `app/(auth)/reset-password.tsx` | NEW — uses dedicated supabase client to handle recovery (works around the no-op lock issue in the global client) |
| `app/(app)/(tabs)/profile.tsx` | Added voluntary Change Password entry, mobile Edit Profile UI, email change via auth.updateUser |
| `app/(app)/admin/employees.tsx` | Full New Employee form (10 fields) + Edit dialog parity + status badges + bulk select + Send Invite(s) toolbar + Request Profile Verification button + per-row Send/Resend menu + DataGrid v8 selection model fix |
| `services/supabase/auth.ts` | + `resetPasswordForEmail`, + `updateEmail` |
| `services/supabase/registration.ts` | + `createEmployee`, + `sendInvites`, + `requestProfileVerification`; updated `submitRegistration` for new field shape |
| `services/types.ts` | New service interface methods |
| `types/models.ts` | + `nationality`, + `hr_original_values`, + `id_type`, + `national_id_number`, + `id_document_url` on Profile/EmployeeDocument; new `IdType`, `CreateEmployeeData`, `RequestProfileVerificationResult` types |
| `hooks/use-auth.ts` | Exposes `resetPasswordForEmail`, `updateEmail` |
| `supabase/config.toml` | NEW — declares the entire auth section explicitly so `config push` doesn't overwrite it |
| `supabase/templates/recovery.html` | NEW — branded welcome email with Poly-Tech hero banner |

---

## 10. Pending work

### 10.1 Mandatory before testing Phase A end-to-end

- **USER must apply migration 017** in Supabase SQL Editor. This adds the `nationality`, `hr_original_values`, `id_type`, `national_id_number`, `id_document_url` columns + the `emp_code_seq` sequence + the storage bucket. Until applied, `create-employee` will fail with "column does not exist" errors.

### 10.2 Phase B — finish the registration completion flow

Documented in §5 above. ~2 hours of work. Blocks the new fields from actually being collected by employees.

### 10.3 Feature 2 — Employee self-edit approval workflow

Designed but not built. Plan in [EMPLOYEE_EDIT_AND_SELF_EDIT_APPROVAL_PLAN_05_07_2026.md](EMPLOYEE_EDIT_AND_SELF_EDIT_APPROVAL_PLAN_05_07_2026.md). Needs answers to 6 open questions in §2.2 of that plan before starting. ~3 hours.

### 10.4 Setup 3.B — Resend with `polytech.com.sa`

Blocked on the polytech.com.sa DNS owner. Once they add the records:
1. Supabase Auth → SMTP Settings → change Sender from `noreply@polytech-hr.com` to `noreply@polytech.com.sa`
2. Edge Function secrets → update `EMAIL_FROM`
3. (Optional) cancel auto-renew on `polytech-hr.com` in Cloudflare

Zero code change.

### 10.5 Optional polish

- Brief error flash before redirect after password set — needs user to capture the actual error text from console with "Preserve log" enabled
- Delete the deprecated `invite-employee` Edge Function — see [DEPLOYMENT_AND_OPERATIONS.md §11.2](DEPLOYMENT_AND_OPERATIONS.md) for the safe-deletion procedure

### 10.6 Untested code paths

These were shipped but not exercised end-to-end by the user:

- Edit Employee dialog full field parity (all 11 fields, especially `emp_code` populating from `employee_documents`)
- Supervisor "Show all employees" toggle behaviour
- Email change via the `update-employee-email` Edge Function
- "Forgot password?" flow from sign-in screen
- Profile self-edit triggering Supabase email confirmation
- Bulk send invites to multiple selected rows at once
- RLS lockdown rejecting a privileged self-update (try changing own role via direct API)

---

## 11. Lessons learned (worth applying to future work)

### 11.1 Tech-lead conduct
- **Check your own recent code before blaming external services.** I burned $10 of the user's money pushing them to buy a domain to "fix" a Gmail prefetching issue when the actual bug was a hook race in code I had just written. That's a failure of debugging discipline.
- **Exhaust free options before recommending paid actions.** Even within the right transport (Resend), the `onboarding@resend.dev` test sender ($0) would have isolated the prefetch hypothesis without needing a domain purchase.
- **When in doubt, add a `console.log`, not a hypothesis.** The `setSession` hang took 4 commits to fully diagnose. The breakthrough was a single round of diagnostic logging (`6fe8c05`) that immediately showed `setSession` never resolved — turning speculation into evidence.

### 11.2 Supabase gotchas
- **`supabase config push` overwrites entire sections, not individual fields.** Always use a complete `config.toml` that declares every existing setting, and inspect the diff before confirming. For one-off changes, use the Dashboard.
- **`detectSessionInUrl: false` + no-op `lock` on the global client breaks recovery flows.** If you need recovery / OAuth callback / magic-link handling on a page, spin up a dedicated client with SDK defaults for that page. Both clients share localStorage so the session migrates automatically.
- **`auth.users` and `profiles` are two tables that need to stay in sync.** Migration 015 trigger handles `email`. Future shared fields would need similar triggers.
- **Edge Function deploys are manual** (no GitHub Actions) — `supabase functions deploy <name>` from `hr-leave-app/`. Always deploy functions BEFORE pushing frontend code that calls them, to avoid 404s during the gap.

### 11.3 React / Expo gotchas
- **Hooks must run in the same order on every render.** Putting a `useState` after an `if (cond) return null` is the classic foot-gun. Always declare all hooks before any early return.
- **MUI X DataGrid versioning matters.** v7 used `string[]` for `rowSelectionModel`, v8 uses `{ type, ids: Set }`. Major-version upgrades are not backwards compatible.
- **Vercel auto-deploys on push to main.** Edge Function changes don't deploy that way — you must run the CLI separately. Order matters: deploy functions first, then push frontend.

### 11.4 Email gotchas
- **Sender domain reputation matters.** `noreply@mail.app.supabase.io` is a shared, low-reputation sender used by every Supabase project. Gmail aggressively prefetches links from it (for malware scanning), consuming single-use recovery tokens.
- **Single-use recovery tokens are intentional.** If the same link is consumed twice (e.g. by a Gmail scanner then by the user), the second click gets `otp_expired`. The fix is sender domain reputation, not token reuse.
- **Email link auto-prefetching is non-deterministic.** Sometimes it happens, sometimes it doesn't, depending on the recipient mail provider's settings. Don't assume "it worked once" means it always will.

---

## 12. Cross-reference index

| Question | Where to look |
|---|---|
| How do I deploy something? | [DEPLOYMENT_AND_OPERATIONS.md §3](DEPLOYMENT_AND_OPERATIONS.md) |
| What's the current production config? | [DEPLOYMENT_AND_OPERATIONS.md §2](DEPLOYMENT_AND_OPERATIONS.md) |
| What broke and how was it fixed? | [DEPLOYMENT_AND_OPERATIONS.md §5, §6, §10](DEPLOYMENT_AND_OPERATIONS.md), this doc §6 |
| What's the design of Feature 2? | [EMPLOYEE_EDIT_AND_SELF_EDIT_APPROVAL_PLAN_05_07_2026.md §2](EMPLOYEE_EDIT_AND_SELF_EDIT_APPROVAL_PLAN_05_07_2026.md) |
| What's left to build? | This doc §10 |
| Why was a particular decision made? | This doc §3 (decision log) |
| What did each commit do? | This doc §7 |
| What `supabase config push` did to me? | [DEPLOYMENT_AND_OPERATIONS.md §6](DEPLOYMENT_AND_OPERATIONS.md), this doc §6.5 |
| Why does reset-password use a different supabase client? | [DEPLOYMENT_AND_OPERATIONS.md §10](DEPLOYMENT_AND_OPERATIONS.md), this doc §6.4 |
| What's the email rate limit and how to lift it? | This doc §4.3 (Resend config), [DEPLOYMENT_AND_OPERATIONS.md §11](DEPLOYMENT_AND_OPERATIONS.md) |

---

_05_08_2026_
