# Email & Auth Flow — Implementation Plan

**Scope:** Fix the broken invite email flow, add forgot/reset password, lock down profile self-edit, and enable employees to manage their own basic info — all on a single free email stack (Resend + Supabase Auth).

---

## 1. Decisions locked in

| Topic | Decision | Rationale |
|---|---|---|
| Email provider | **Resend** (free tier: 3,000/mo, 100/day) | Already integrated; clean DX; works for Polytech's volume forever |
| Sender domain | `polytech.com.sa` (verified in Resend via DNS) | We control it; deliverability requires DKIM/SPF/DMARC on a verified domain |
| Sender pattern | **Pattern A** — each HR's own email (`maram@`, `aqeel@`, `shahad@`, …) | All HR mailboxes are real and can receive replies/bounces |
| Auth emails (forgot password, email change confirmation, magic link) | **Supabase built-in templates over Resend SMTP** | Zero custom code; one config point; handled entirely by Supabase Auth |
| App emails (invites, registration approved/rejected, future notifications) | **Custom Edge Functions** calling Resend REST via a pluggable adapter | Templates and business logic stay in our code; provider is swappable |
| Provider portability | Pluggable `_shared/email.ts` adapter (Resend now; Brevo/SES/SendGrid swap = 1 file) | 30 min upfront to never hard-couple to a vendor |
| Invite UX | **Default = magic-link** (user clicks email link → sets own password). **Optional `INVITE_MODE=temp_password`** keeps the temp-password flow available (requires Resend). | Magic-link works today via Supabase's built-in mailer (no DNS / no Resend needed); temp-password remains a togglable option once Resend is verified. |
| **Invite workflow** | **Two-step "create now, invite when ready" with batch send** (and optional one-click "Send invite now" checkbox for the impatient case) | Lets HR enter data once, fix typos pre-send, batch-onboard cohorts, re-send lost invites, and pre-stage future hires |
| **Invite form required fields (expanded)** | full_name, email, **emp_code**, **phone**, role, department, **supervisor (renamed "Supervisor / Reports To" — defaults to filtered list of supervisor-class roles, with "Show all employees" toggle)**, **manager** (same pattern), **job_title**, **start_date** | Profile is complete from day one; default UX stays clean, but HR can override when an unconventional supervisor is needed |
| Profile self-edit | Allow `full_name`, `phone`, `email` (with confirmation). Block `role`, `supervisor_id`, `manager_id`, `department` (HR-only) | Org-chart integrity stays under HR control |
| Forgot password | Self-serve via `auth.resetPasswordForEmail()` → Supabase emails reset link → custom landing page | No HR support burden for forgotten passwords |
| **Two-table sync (auth.users ↔ profiles)** | **Every change automatically reflects in both tables via DB triggers — code only writes to one place per operation** | Single source of truth (`auth.users` for email/password, `profiles` for business data); no drift; no manual juggling |

---

## 2. Audit — what exists today

### 2.1 Already built (works, do not rebuild)

| Item | Location |
|---|---|
| `invite-employee` Edge Function (HR-only check, creates auth user with temp password, sends Resend email) | `supabase/functions/invite-employee/index.ts` |
| `send-registration-email` Edge Function (HR notifications + approval/rejection emails) | `supabase/functions/send-registration-email/index.ts` |
| Forced change-password screen on first login | `app/(auth)/change-password.tsx` |
| `must_change_password` flag in DB; auth guard auto-routes | migration `005_registration_system.sql` |
| `auth.changePassword(newPassword)` service method | `services/supabase/auth.ts:82` |
| `auth.signOut()` + Sign Out button (web + mobile) | `services/supabase/auth.ts:101`, `app/(app)/(tabs)/profile.tsx:614,734` |
| **Web** Edit Profile dialog (name/phone/email; dept/role for HR) | `app/(app)/(tabs)/profile.tsx:381-538` |
| HR-only "Invite Employee" UI button | `app/(app)/admin/employees.tsx:743-750` |
| `registrationService.inviteEmployee()` client wrapper | `services/supabase/registration.ts:275` |
| DB trigger `on_auth_user_created` auto-creates profile row | migration `005_registration_system.sql` |
| Adopts existing pending self-registration if email matches | `invite-employee/index.ts:65-110` |

### 2.2 Bugs in what's built

| # | Bug | Where | Impact |
|---|---|---|---|
| **B1** | Resend failures swallowed — `console.error` then return success | `invite-employee/index.ts:216-218` | UI shows "Invitation sent" even when email never went out |
| **B2** | `EMAIL_FROM` is one fixed env var — doesn't use the inviting HR's actual address | `invite-employee/index.ts:8` | All invites look like they came from a generic noreply address; can't reply to HR |
| **B3** | RLS `profiles_update_own` permits update of **any column** on user's own row, including `role`, `supervisor_id`, `manager_id` | `migrations/001_initial_schema.sql:190` | **Privilege escalation** — any logged-in user can promote themselves to HR Director |
| **B4** | Profile Edit dialog writes `email` directly to `profiles` table — bypasses Supabase auth's email-change confirmation | `app/(app)/(tabs)/profile.tsx:578-582` | `auth.users.email` and `profiles.email` drift apart; user gets locked out of their account |
| **B5** | No DB trigger to sync `auth.users.email` → `profiles.email` after a confirmed email change | (missing trigger) | Even when email change is done correctly through `auth.updateUser`, the `profiles` row stays stale until manual fix |

### 2.3 Missing (build from scratch)

| # | Missing | Where it goes |
|---|---|---|
| **M1** | Pluggable email adapter | `supabase/functions/_shared/email.ts` + `_shared/providers/resend.ts` |
| **M2** | `resetPasswordForEmail()` wrapper in authService | `services/supabase/auth.ts` |
| **M3** | "Forgot password?" link on sign-in (web + mobile) | `app/(auth)/sign-in.tsx` |
| **M4** | Forgot-password screen (enter email, submit) | `app/(auth)/forgot-password.tsx` (NEW) |
| **M5** | Reset-password landing page (Supabase recovery link target → set new password) | `app/(auth)/reset-password.tsx` (NEW) |
| **M6** | Voluntary "Change Password" entry in Profile tab (separate from the forced first-login flow) | `app/(app)/(tabs)/profile.tsx` |
| **M7** | **Mobile** Edit Profile UI (mobile profile is read-only today) | `app/(app)/(tabs)/profile.tsx` |
| **M8** | RLS lockdown migration — whitelist columns for self-update | `supabase/migrations/014_profiles_self_update_lockdown.sql` (NEW) |
| **M9** | DB trigger to keep `auth.users` ↔ `profiles` in sync on email changes (and any future shared field) | `supabase/migrations/015_auth_profiles_sync.sql` (NEW) |
| **M10** | Schema: add `job_title`, `start_date` columns + extend `registration_status` to include `not_invited` | `supabase/migrations/016_employee_extras_and_not_invited.sql` (NEW) |
| **M11** | Split invite Edge Function into `create-employee` (no auth, no email) and `send-invite` (auth user + email; takes profile id, accepts an array for batch) | `supabase/functions/create-employee/index.ts`, `supabase/functions/send-invite/index.ts` (NEW) |
| **M12** | Expand invite/create form: add `emp_code`, `phone`, `job_title`, `start_date`; rename Supervisor → "Supervisor / Reports To" (curated default + "Show all employees" toggle); same toggle on Manager; make supervisor + manager required; add "Send invite now" checkbox | `app/(app)/admin/employees.tsx` |
| **M13** | Employee table: status badge column ("Not Invited" / "Active" / "Inactive"), bulk-select checkboxes, "Send Invite(s)" toolbar button (when rows selected), per-row "Send Invite" / "Resend Invite" action | `app/(app)/admin/employees.tsx` |

---

## 3. Phased setup — what to do now vs. when DNS is sorted

The system supports two deliverability paths. We start on the free, no-DNS path today and upgrade later — **same code, no redeploy required**. The upgrade is purely Supabase Dashboard configuration.

### 3.A — TODAY (zero DNS, ships immediately)

Get the full system working using **Supabase's built-in default SMTP**. Limit: ~3 emails/hour from the address `noreply@mail.app.supabase.io`. Fine for testing and low-volume onboarding (a few invites a day).

| # | Step | Where |
|---|---|---|
| A.1 | Apply the three migrations (014, 015, 016) | Supabase SQL Editor |
| A.2 | Set Edge Function secrets: `INVITE_MODE=magic_link` (default if omitted), `APP_URL=<your URL>`, `EMAIL_PROVIDER=resend` (irrelevant in magic_link mode but harmless) | Supabase → Project Settings → Edge Functions → Secrets |
| A.3 | Set **Site URL** to your app URL and add `<APP_URL>/reset-password` as a Redirect URL | Supabase → Authentication → URL Configuration |
| A.4 | (Optional but recommended) Customise the **Reset Password** email template wording in the Supabase Dashboard so it reads as a welcome (e.g. `"You've been invited to HR System! Click the button below to set your password."`) | Supabase → Authentication → Email Templates → Reset Password |
| A.5 | Deploy: `supabase functions deploy create-employee && supabase functions deploy send-invite && supabase functions deploy send-registration-email` | Your terminal |

After A: full flow works. New employees get an email from Supabase saying "Click here to set your password." `forgot-password`, `change-email`, `change-password` all work too. Sender is `noreply@mail.app.supabase.io` — looks generic but lands in the inbox.

### 3.B — LATER (Resend + verified domain, polytech.com.sa branding)

Once the domain owner has added Resend's DNS records and the domain shows ✅ Verified in Resend, do this. **No code change.**

| # | Step | Where |
|---|---|---|
| B.1 | Sign up at [resend.com](https://resend.com), add `polytech.com.sa`, copy DKIM + SPF records | Resend dashboard → Domains |
| B.2 | Forward records to whoever controls polytech.com.sa DNS; wait for ✅ Verified | DNS registrar |
| B.3 | Generate a Resend API key | Resend → API Keys |
| B.4 | Plug Resend SMTP into Supabase Auth: host `smtp.resend.com`, port `465`, user `resend`, password = API key, sender `noreply@polytech.com.sa` | Supabase → Authentication → SMTP Settings |
| B.5 | Add Edge Function secrets `RESEND_API_KEY` and `EMAIL_FROM=HR System <noreply@polytech.com.sa>` | Supabase → Edge Functions → Secrets |
| B.6 | (Optional) flip `INVITE_MODE=temp_password` if you want HR-from-address branded invites with a temp password instead of a "set your own" link | Supabase → Edge Functions → Secrets |

After B:
- Supabase Auth emails (invite link, reset password, email change confirmation) now go through Resend automatically — branded `polytech.com.sa`, 100/day instead of 3/hour, far better inbox placement.
- If you flipped INVITE_MODE to `temp_password`, invites are sent FROM the inviting HR's own address (Pattern A) via Resend, with our custom HTML template.
- `send-registration-email` notifications also now go through Resend (because `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` are now set).

### Code-side `INVITE_MODE` reference

| Mode | Email transport | Email content | When to use |
|---|---|---|---|
| `magic_link` (default) | Supabase Auth's mailer (its built-in SMTP, or whatever SMTP is plugged into Auth → SMTP Settings) | Supabase's "Reset Password" template (customisable in Dashboard) | Always — the path of least resistance. Works today with no DNS, gets better automatically when Resend SMTP is plugged into Supabase later. |
| `temp_password` | Our `_shared/email.ts` adapter (Resend by default) | Our custom HTML; From = inviting HR's own email (Pattern A) | Only when (a) Resend is verified AND (b) you specifically prefer temp-password UX over set-your-own. |

---

## 4. Phase 1 — Implementation checklist

Order matters: M1 (adapter) and M8 (RLS) come first because everything else depends on them.

### 4.1 Email infrastructure

- [ ] **M1.a** Create `supabase/functions/_shared/email.ts` exporting `sendEmail({ to, subject, html, from? })` — provider chosen by `EMAIL_PROVIDER` env var, defaulting to `resend`.
- [ ] **M1.b** Create `supabase/functions/_shared/providers/resend.ts` — wraps the Resend REST call; throws on non-2xx.
- [ ] **M1.c** Add provider stubs (commented placeholder) for `brevo.ts` and `sendgrid.ts` so the swap path is documented.

### 4.2 Edge Function refactors + split

- [ ] **M11.a + B1 + B2** Create new `supabase/functions/create-employee/index.ts`:
  - HR-only check (same as today).
  - Validate the expanded payload (full_name, email, emp_code, phone, role, department, supervisor_id, manager_id, job_title, start_date).
  - Insert/upsert a `profiles` row with `registration_status = 'not_invited'`. **No `auth.users` row, no email yet.**
  - Insert `employee_documents` row with the `emp_code` (so it doesn't get the `PENDING-<timestamp>` placeholder anymore).
  - Returns the new profile.
- [ ] **M11.b** Create new `supabase/functions/send-invite/index.ts`:
  - HR-only check.
  - Accepts `{ profile_ids: string[] }` (single or batch).
  - For each profile id: generate temp password → `auth.admin.createUser` → trigger creates auth row + profile already exists → set `must_change_password = true` and `registration_status = 'active'` → call default leave balances RPC → call `sendEmail` via the shared adapter (From = inviting HR's address; Pattern A) → record per-id success/failure.
  - Returns `{ results: [{ profile_id, success, error? }] }` so the UI can show partial-success.
  - Re-throw / surface failures so UI doesn't fake-succeed.
- [ ] **M11.c** Delete or deprecate the old `invite-employee/index.ts` once the two new functions are live and the UI is switched over.
- [ ] **4.2.b** Refactor `send-registration-email/index.ts` to use the shared `_shared/email.ts` module too.

### 4.3 Forgot / reset password

- [ ] **M2** Add `authService.resetPasswordForEmail(email)` calling `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<APP_URL>/reset-password' })`.
- [ ] **M3** Add "Forgot password?" link below the password input on `sign-in.tsx` (web + mobile branches) → routes to `/forgot-password`.
- [ ] **M4** Build `app/(auth)/forgot-password.tsx`:
  - Single email input + submit button.
  - On success: show "If an account exists for that email, a reset link has been sent." (don't disclose whether the email exists)
  - "Back to sign in" link.
- [ ] **M5** Build `app/(auth)/reset-password.tsx`:
  - This is where Supabase's recovery link lands.
  - Two fields: new password + confirm.
  - On submit: `supabase.auth.updateUser({ password })` then route to dashboard.
  - Handle the case where session is missing/expired with a clear error.

### 4.4 Profile self-service

- [ ] **M6** Add a "Change Password" row in Profile (web + mobile) — opens a small dialog (web) or screen (mobile) with old/new/confirm fields. Calls `authService.changePassword(newPassword)`. (The existing `change-password.tsx` is for the forced first-login flow; this is the voluntary one accessed any time.)
- [ ] **M7** Build mobile Edit Profile UI in `profile.tsx` (mobile branch is read-only today). Same fields and rules as the web dialog: `full_name`, `phone`, `email` editable; `role`/`department`/`supervisor`/`manager` shown but disabled.
- [ ] **B4** Fix email-change handling in the Edit Profile save path:
  - If `email` changed → call `supabase.auth.updateUser({ email })` (Supabase emails confirmation link to **both** old and new addresses).
  - Only update `profiles.email` after Supabase confirms (or via a DB trigger on `auth.users` email change).
  - Show user a "We sent a confirmation link to your new email" notice.

### 4.4.5 Admin: invite form + employee table changes

- [ ] **M12.a** Expand the "Invite / New Employee" dialog (`admin/employees.tsx`):
  - Add fields: **Employee Code** (required), **Phone** (required), **Job Title** (required), **Start Date** (required date picker).
  - Rename "Supervisor" → **"Supervisor / Reports To"**, make required.
    - Default: autocomplete filtered to Supervisor / Manager / HR / HR Director roles (the curated list — covers the 95% case).
    - Below the field, add a **"Show all employees"** toggle/checkbox. When ON, the autocomplete switches to ALL active employees (searchable by name/email/department). Lets HR assign anyone as a reports-to when needed without making the default cluttered.
  - Make **Manager** required, with the same "Show all employees" toggle pattern (default filter: Manager / HR Director).
  - Update validation in `isValid` to enforce all new required fields.
  - Update the dialog title from "Invite Employee" to **"New Employee"**.
  - Add a **"Send invite email now"** checkbox at the bottom (default: unchecked, i.e., create-only by default; if checked, immediately calls `send-invite` after `create-employee`).
- [ ] **M12.b** Update `registrationService` to expose `createEmployee()` (calls `create-employee`) and `sendInvites(profileIds: string[])` (calls `send-invite`). Keep `inviteEmployee()` as a thin wrapper that calls both for backward compat (or delete it once UI is migrated).
- [ ] **M13.a** Add **Status badge column** to the employee DataGrid: "Not Invited" (amber), "Active" (green), "Inactive" (gray).
- [ ] **M13.b** Enable `checkboxSelection` on the MUI DataGrid. Track selected row IDs in component state.
- [ ] **M13.c** When ≥1 row is selected, show a sticky toolbar with **"Send Invite(s) (N)"** button. Disabled if any selected row is already `active` (with a tooltip explaining). On click → confirmation dialog → call `sendInvites(ids)` → show per-row success/failure summary.
- [ ] **M13.d** Add a per-row action menu (3-dot) with **"Send Invite"** (when status = `not_invited`) and **"Resend Invite"** (when status = `active`, regenerates password and re-sends).

### 4.5 Database / RLS / Sync triggers

- [ ] **M8 + B3** Migration `014_profiles_self_update_lockdown.sql`:
  - `DROP POLICY profiles_update_own ON profiles;`
  - Replace with two narrower policies:
    - `profiles_update_own_safe_fields` — `USING (auth.uid() = id)` `WITH CHECK (auth.uid() = id AND <only-safe-columns-changed-check>)`. The check uses old/new comparisons via `OLD`/`NEW` (or relies on `WITH CHECK` plus a column-list grant — pick one approach).
  - **Alternative approach (cleaner):** revoke direct UPDATE on the locked columns, use a SECURITY DEFINER function `update_my_profile(full_name, phone)` and call that from the client.
  - Verify HR's `profiles_update_hr` still works for changing role/supervisor on others.

- [ ] **M9 + B5** Migration `015_auth_profiles_sync.sql` — keep the two tables consistent automatically:
  - **Trigger A — email sync (`auth.users` → `profiles`):**
    ```sql
    CREATE OR REPLACE FUNCTION sync_profile_email()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.profiles SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
      END IF;
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER on_auth_user_email_changed
      AFTER UPDATE OF email ON auth.users
      FOR EACH ROW EXECUTE FUNCTION sync_profile_email();
    ```
    Fires when Supabase confirms an email change → `profiles.email` follows automatically. No app code needed.
  - **Trigger B — soft-delete propagation (optional but consistent):** when `auth.users` row is deleted, mark profile `is_active = false` instead of letting the FK cascade nuke history. (Skip if existing FK is `ON DELETE CASCADE` and you prefer that — call it out for confirmation.)
  - **Backfill:** one-time `UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS DISTINCT FROM u.email;` to fix any existing drift.
  - **Source-of-truth rule documented in this migration's header comment:**
    - `auth.users.email` = source of truth, `profiles.email` = denormalized cache, kept in sync by Trigger A.
    - `auth.users.encrypted_password` = source of truth, never mirrored.
    - All other employee fields (`full_name`, `phone`, `role`, `department`, `supervisor_id`, `manager_id`, etc.) live ONLY in `profiles`.

### 4.6 End-to-end test (manual)

- [ ] **T1** HR signs in → invites a new employee with a real Gmail address → email arrives in Gmail inbox (not spam) within 60s.
- [ ] **T2** New employee opens email → temp password works → forced change-password screen appears → sets new password → lands on dashboard.
- [ ] **T3** Employee opens Profile → edits name + phone → saves → sees changes immediately.
- [ ] **T4** Employee tries to PATCH `role = 'hr_director'` via direct API call → RLS rejects (verify in Supabase logs).
- [ ] **T5** Employee changes email → Supabase sends confirmation to old + new → confirmation completes → can sign in with new email.
- [ ] **T6** Employee signs out → "Forgot password?" → enters email → reset link arrives → clicks link → lands on `/reset-password` → sets new password → signs in successfully.
- [ ] **T7** HR tries to invite an email that already has an active account → gets clear "already exists" error.
- [ ] **T8** Adoption path: someone self-registered (status `pending_approval`) → HR uses Invite with same email → existing record adopted, status becomes `active`.
- [ ] **T9** Email sync verification: employee changes email → confirms via Supabase link → query both `auth.users` and `profiles` → both show the new email. Then run the backfill query → 0 rows updated (proves no drift remains).
- [ ] **T10** Create-without-invite path: HR fills full New Employee form → submits without checking "Send invite now" → row appears in employee table with "Not Invited" amber badge → no email sent → no `auth.users` row created.
- [ ] **T11** Batch send: HR selects 3 "Not Invited" rows → clicks "Send Invite(s) (3)" → all 3 receive emails → all 3 statuses flip to "Active" → Supabase `auth.users` shows 3 new rows.
- [ ] **T12** Partial-failure handling: simulate one bad email in a batch → other invites succeed, the bad one shows error in the result summary → no half-broken state in DB.
- [ ] **T13** Resend invite: pick an Active employee → click "Resend Invite" from row menu → new temp password generated, new email sent → old password still works until they change it (or we choose to invalidate; document the call).
- [ ] **T14** Required-field enforcement: try to submit New Employee form missing emp_code / phone / job_title / start_date / supervisor / manager → form blocks submission with clear errors.
- [ ] **T15** Supervisor field — default state: dropdown shows ONLY users with role Supervisor/Manager/HR/HRDirector. Toggle "Show all employees" → dropdown now includes regular employees too, searchable. Selecting a regular employee saves correctly.

---

## 5. Files touched (final list)

### New files
- `supabase/functions/_shared/email.ts`
- `supabase/functions/_shared/providers/resend.ts`
- `supabase/functions/create-employee/index.ts`
- `supabase/functions/send-invite/index.ts`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/reset-password.tsx`
- `supabase/migrations/014_profiles_self_update_lockdown.sql`
- `supabase/migrations/015_auth_profiles_sync.sql`
- `supabase/migrations/016_employee_extras_and_not_invited.sql`

### Modified files
- `supabase/functions/invite-employee/index.ts` (deprecated → may delete after switchover)
- `supabase/functions/send-registration-email/index.ts`
- `services/supabase/auth.ts`
- `services/supabase/registration.ts` (add `createEmployee()`, `sendInvites()`)
- `services/types.ts` (add `resetPasswordForEmail` to `AuthService`; expand `RegistrationService` with new methods)
- `types/models.ts` + `types/enums.ts` (add `not_invited` status, new profile fields)
- `app/(auth)/sign-in.tsx` (Forgot password link)
- `app/(app)/(tabs)/profile.tsx` (mobile edit, Change Password row, email-change fix)
- `app/(app)/admin/employees.tsx` (expanded form, status badges, bulk select, Send Invite actions)

---

## 6. Risks & open questions

| Risk | Mitigation |
|---|---|
| DNS verification (3.B) takes longer than expected | Not a blocker — 3.A path lets the system ship + onboard a few users today |
| Supabase default SMTP rate limit (~3/hr) bites if HR batch-invites 10 people | Either invite in small groups, OR finish 3.B first; once Resend SMTP is plugged into Supabase Auth the limit jumps to Resend's quotas |
| `noreply@mail.app.supabase.io` sender (3.A) lands in spam for some recipients | Customise the email template to clearly identify HR System; tell users to whitelist; finish 3.B for proper polytech.com.sa branding |
| Resend free tier (100/day) too small if Polytech onboards a large batch | Easy upgrade ($20/mo → 50k/mo) or swap to Brevo/SES via the adapter |
| RLS lockdown breaks an existing flow we forgot about | T4 + grep for direct profile updates before merging |
| User changes their email and never confirms → stuck between two emails | Supabase keeps old email until confirmed; show clear UI status; allow re-trigger |
| In `magic_link` mode, email template wording defaults to generic "Reset Password" copy | A.4 — customise the template in Supabase Dashboard once, takes ~5 min |

---

## 7. Estimate

- **Implementation work:** done.
- **Setup 3.A (TODAY, no DNS):** ~5 min — apply migrations + set 3 env vars + deploy 3 functions.
- **Setup 3.B (LATER, with Resend):** ~15 min wall-clock + DNS propagation wait for the domain owner.
- **End-to-end testing:** ~45 min.

---

_05_05_2026_
