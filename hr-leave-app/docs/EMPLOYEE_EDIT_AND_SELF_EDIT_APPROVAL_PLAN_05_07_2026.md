# Employee Edit + Self-Edit Approval Workflow — Plan

Two related features for managing employee profile changes:

- **Feature 1 — HR Edit Employee dialog parity ✅ SHIPPED.** HR can edit every field that exists in the New Employee form, plus toggle Status, plus optionally send the invite email at any time on any active employee.
- **Feature 2 — Employee self-edit approval workflow ⏳ NOT STARTED.** When a non-HR employee edits their own profile, the change submits as a request that HR reviews from the Tasks tab. Approve / Reject / Return-for-clarification, with a mandatory justification and optional PDF/image attachment.

---

## 🚦 Status as of 2026-05-08

| Feature | Status | Commit(s) |
|---|---|---|
| Feature 1 — Edit Employee dialog parity | ✅ Shipped | `60f0db2` (initial), `bda5fda` (workday hours), `0c230d1` (lift status gate so HR can send/resend at any time) |
| Feature 1 follow-on — Allow Send Invite at any time | ✅ Shipped | `0c230d1` — backend gate dropped, frontend menu shows for any active employee, Edit dialog "Send invite now" available for any active employee |
| Feature 1 follow-on — Email rebrand to "Poly-Tech HR Management System" + hero banner image | ✅ Shipped | `9d2de56` |
| Feature 2 — Employee self-edit approval | ⏳ Not started — needs answers to the 6 questions in §2.2 below |
| End-to-end test of Feature 1 (all 11 fields, supervisor toggle, email change, send-invite-now) | ⏳ Code shipped, partial test only (single-invite verified; full field parity not exercised by user yet) |

---

## Feature 1 — HR Edit Employee dialog parity ✅ SHIPPED

### Summary

The Edit Employee dialog used to have only 7 fields (Full Name, Email, Phone, Department, Role, Workday Hours, Status). It now has every field the New Employee form has, plus the Status field, plus a conditional "Send invite now" checkbox.

### Final field map

| Field | In New form | In Edit | Notes |
|---|---|---|---|
| Full Name | ✅ | ✅ | |
| Email | ✅ | ✅ | Email change goes through `update-employee-email` Edge Function — see §1.4 |
| Employee Code (`emp_code`) | ✅ | ✅ | Lives in `employee_documents`, upserted on save |
| Phone | ✅ | ✅ | |
| Job Title | ✅ | ✅ | |
| Start Date | ✅ | ✅ | |
| Role | ✅ | ✅ | |
| Workday Hours | ✅ | ✅ | |
| Department | ✅ | ✅ | |
| Supervisor / Reports To | ✅ | ✅ | Default-filtered to Supervisor/Manager/HR/HRDirector + "Show all employees" toggle override |
| Manager | ✅ | ✅ | Same default-filter + override toggle |
| **Status** (Active / Inactive) | ❌ | ✅ | The extra Edit gets over New |
| Send invite now | ✅ (always) | ⚙️ Conditional | Edit shows it ONLY when employee status is `not_invited`. For Active employees, "Resend Invite" lives in the row 3-dot menu. |

### 1.1 Validation

Same strictness as the New form — every field required. The Save button is disabled until all fields pass. Workday hours bounded 1–24 with 0.5 step.

### 1.2 What touches the database

Three writes per save:

1. `profiles` table — every editable field except `email` and `emp_code`. Goes through `userService.updateProfile()`.
2. `auth.users.email` — only if email changed. Routed through Edge Function (see §1.4). Trigger 015 then auto-syncs `profiles.email`.
3. `employee_documents.emp_code` — upserted with `onConflict: 'employee_id'`. Goes direct via supabase client (HR has full RLS access).

If "Send invite now" is checked AND the employee status was `not_invited`, a fourth call:

4. `send-invite` Edge Function — generates the magic link / temp password and emails the employee.

### 1.3 RLS

No new policies needed. The existing `profiles_update_hr` policy from migration 001 already permits HR/HRDirector to update any column on any profile. Migration 014's lockdown only restricts the `profiles_update_own` self-edit path — HR is unaffected.

### 1.4 Email change Edge Function (`update-employee-email`)

**Why it exists:** writing a new email directly to `profiles.email` would desync from `auth.users.email`. The employee would still authenticate with the old email until somebody manually fixed it. Migration 015's trigger only syncs in the `auth → profiles` direction, so we have to update `auth.users` first.

**What it does:**

```ts
auth.admin.updateUserById(profile_id, {
  email: new_email,
  email_confirm: true,  // skip the user-side "click to confirm" round-trip; HR is the verifier
})
```

After this, trigger 015 (`sync_profile_email`) fires and updates `profiles.email`. Single source of truth maintained.

**Authorisation:** the function checks the caller's profile.role — only `hr` or `hr_director` can call it. Returns 400 with `Only HR staff can change employee emails` otherwise.

**Conflict handling:** rejects if the target email is already used by a different `auth.users` row.

### 1.5 Files touched

- `app/(app)/admin/employees.tsx` — `EditDialogState`, `INITIAL_DIALOG`, `EditEmployeeDialog` UI, `handleOpenEdit` (now async, fetches emp_code), `handleSubmitEdit` (now handles email + emp_code + optional invite), call site passes `employees` prop.
- `supabase/functions/update-employee-email/index.ts` — NEW.

### 1.6 Test checklist

- [ ] Open Edit on an Active employee → all fields prefilled correctly (including emp_code from `employee_documents`).
- [ ] Save with no changes → succeeds, no errors.
- [ ] Change phone only → saves to `profiles`, employee can sign in with same email.
- [ ] Change emp_code only → reflects in `employee_documents`.
- [ ] Change email → employee can sign in with new email immediately, can no longer use old email. Both `auth.users.email` and `profiles.email` show new value.
- [ ] Change supervisor with "Show all employees" toggled ON → can pick a regular employee, saves correctly.
- [ ] Open Edit on a Not-Invited employee → "Send invite email after saving" checkbox visible. Tick it → save → invite email arrives, status flips to Active.
- [ ] Open Edit on an Active employee → "Send invite email after saving" checkbox NOT visible.
- [ ] Try to set email to an already-used address → clear error, no DB write.
- [ ] Set Status = Inactive → row shows as Inactive in directory; employee blocked from sign-in (existing `is_active` check).

---

## Feature 2 — Employee self-edit approval workflow 📋 TO BUILD

### Summary

Today, a non-HR employee can edit their own profile (name, phone, email) directly via Profile → Edit Profile. We're locking that down: edits become **change requests** that HR reviews from the Tasks tab. HR can Approve, Reject, or Return for clarification.

Driving requirement: prevent unverified self-changes to identity data while keeping HR in the loop with proof (justification + optional document like an ID copy or marriage certificate for a name change).

### 2.1 In scope vs. out of scope

| Field | Goes through approval? |
|---|---|
| `full_name` | ✅ Yes |
| `phone` | ✅ Yes |
| `email` | ✅ Yes (HR-approved → calls `update-employee-email` to apply) |
| `photo_url` (future) | ✅ Yes (when implemented) |
| Password | ❌ No — handled by Supabase auth flows directly |
| `role`, `supervisor_id`, `manager_id`, `department`, `job_title`, `start_date`, `emp_code`, `is_active`, `workday_hours` | ❌ Not editable by non-HR (already enforced by migration 014) |

### 2.2 Open questions (before I build)

These need answers before the schema is finalized:

1. **Bundle vs. one-per-field?** Recommend bundle — a single request can change multiple fields with one justification. Simpler UX, simpler review.
2. **Attachment limits:**
   - Recommend: optional, max 3 files per request, PDF / JPG / PNG only, ≤ 5 MB each.
3. **Email change post-approval:** does Supabase still send a confirmation to the new address as a second check, or does HR approval alone make it official? Recommend: HR approval alone (matches the model where HR is the verifier). Apply via the existing `update-employee-email` Edge Function with `email_confirm=true`.
4. **Where in the UI for HR review?** Recommend: new section under the existing **Tasks tab** so HR has all incoming approvals in one place. (Alternative: dedicated `/admin/profile-change-requests` page — pick if you'd rather separate concerns.)
5. **Notifications to employee:** in-app only, or also email? Recommend: in-app + email on status change (approved / rejected / returned).
6. **Resubmission:** if HR returns for clarification, can the employee edit the original request and resubmit, or does it close the old one and open a new one? Recommend: edit-and-resubmit on the same row (status flips back to `pending`, history captured).

### 2.3 Schema (proposed)

#### Migration 017 — `profile_change_requests`

```sql
CREATE TABLE profile_change_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Snapshot of what's being requested. Bundled per request.
  changes      JSONB NOT NULL,
    -- e.g. { "full_name": { "old": "Alaa", "new": "Alaa Gaw" }, "phone": { "old": "...", "new": "..." } }

  justification TEXT NOT NULL CHECK (length(justification) >= 5),

  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','returned_for_revision')),

  hr_comment   TEXT,                              -- HR's reason on reject / return / approve
  reviewed_by  UUID REFERENCES profiles(id),
  reviewed_at  TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pcr_employee ON profile_change_requests(employee_id);
CREATE INDEX idx_pcr_status   ON profile_change_requests(status);
```

#### Migration 017 — `profile_change_attachments`

```sql
CREATE TABLE profile_change_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES profile_change_requests(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,        -- Supabase Storage public URL or signed
  file_size_bytes INTEGER NOT NULL,
  file_type       TEXT NOT NULL,        -- 'application/pdf' | 'image/jpeg' | 'image/png'
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Storage bucket

`profile-change-attachments` — private. Read access via RLS for: the requesting employee (their own files) + HR. Insert restricted to authenticated users uploading to their own employee folder.

#### RLS

```sql
ALTER TABLE profile_change_requests ENABLE ROW LEVEL SECURITY;

-- Employee can read + insert their own requests, and update only when returned_for_revision
CREATE POLICY pcr_select_own ON profile_change_requests
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY pcr_insert_own ON profile_change_requests
  FOR INSERT WITH CHECK (employee_id = auth.uid() AND status = 'pending');

CREATE POLICY pcr_update_own_returned ON profile_change_requests
  FOR UPDATE USING (
    employee_id = auth.uid()
    AND status = 'returned_for_revision'
  );

-- HR sees all, can update status
CREATE POLICY pcr_hr_full ON profile_change_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr','hr_director'))
  );

-- (Same dual-pattern for profile_change_attachments)
```

### 2.4 Edge Functions (proposed)

| Function | Purpose |
|---|---|
| `submit-profile-change-request` | Validates payload (max 3 attachments, file type/size), inserts request + attachments. Could be a SECURITY DEFINER RPC instead — simpler, no Edge Function needed if we do it that way. |
| `approve-profile-change-request` | Atomic apply: read the `changes` JSON, write each field to `profiles` (and call the existing `update-employee-email` for email), set status=`approved`, record reviewer. Needs SECURITY DEFINER because employee profile updates would otherwise hit migration 014's lockdown. |
| `reject-profile-change-request` | Sets status=`rejected`, captures HR comment. RPC. |
| `return-profile-change-request` | Sets status=`returned_for_revision`, captures HR comment, allows the employee to resubmit. RPC. |

Recommendation: **all four as RPCs (SECURITY DEFINER PostgreSQL functions)** rather than Edge Functions. Simpler, no Resend involvement, no extra deploy step. Edge Functions only needed for the email side, which `approve-profile-change-request` calls into via `update-employee-email`.

### 2.5 Frontend changes (proposed)

**Profile tab self-edit (`app/(app)/(tabs)/profile.tsx`):**
- Replace direct `userService.updateProfile()` call with a "Request Profile Change" modal.
- Modal collects: edited field values + mandatory **justification** (textarea, min 5 chars) + optional file uploads (drag/drop, or file picker).
- On submit, calls `submit-profile-change-request` RPC.
- After submit: dialog shows "Submitted — pending HR review", profile data does NOT change yet.
- If user has a pending request already, show its status inline ("Pending HR review" / "Returned for clarification: <comment>") with option to edit if returned.

**HR Tasks tab (new section):**
- New tab/segment: "Profile Change Requests" (badge with count of pending).
- List view: rows show employee name, fields requested, requested at, justification snippet.
- Click row → review modal:
  - Shows old vs new for each field (diff style).
  - Justification full text.
  - Attachments: thumbnail for images, click to open PDF inline (or new tab).
  - Three buttons: **Approve** / **Reject** (requires comment) / **Return for clarification** (requires comment).
  - On Approve, an extra confirmation if email is one of the changed fields (since it's irreversible).

### 2.6 Notifications

When HR acts on a request, insert into the existing `notifications` table:

| Status | Notification title | Body |
|---|---|---|
| `approved` | "Your profile changes were approved" | "Updates have been applied: <field list>." |
| `rejected` | "Your profile change request was rejected" | "<HR comment>" |
| `returned_for_revision` | "Your profile change request needs more info" | "<HR comment> — open Profile to revise and resubmit." |

For email: if Setup 3.B is done by then, route through the `_shared/email.ts` adapter — otherwise rely on Supabase Auth's built-in templates (which we'd customise) or in-app only.

### 2.7 Files to create / modify (estimate)

#### New
- `supabase/migrations/017_profile_change_requests.sql`
- `app/(app)/admin/profile-change-requests.tsx` (or section in tasks.tsx)
- `services/supabase/profile-change-request.ts` — client service
- `components/profile/request-profile-change-dialog.tsx` — the modal employees see

#### Modified
- `app/(app)/(tabs)/profile.tsx` — replace direct edit with request flow
- `app/(app)/(tabs)/tasks.tsx` — add the new section + badge
- `services/types.ts` — `ProfileChangeRequestService` interface, types
- `types/models.ts` — `ProfileChangeRequest`, `ProfileChangeAttachment` types

### 2.8 Estimated effort

~3 hours of focused work, broken down:

- Migration 017 + RLS + RPCs: ~45 min
- Storage bucket + upload service: ~20 min
- Profile self-edit dialog rewrite: ~30 min
- HR review screen: ~45 min
- Wire up notifications: ~15 min
- End-to-end test + bug squash: ~30 min

### 2.9 Test checklist (when built)

- [ ] Employee edits name + phone + email together → submits with justification "Got married, name change documented" + attached PDF (marriage cert).
- [ ] Profile in DB unchanged immediately; pending request visible to HR.
- [ ] HR opens Tasks → sees the pending request with badge count.
- [ ] HR opens review modal → diff view correct, attachment opens.
- [ ] HR clicks Approve → all three fields update in `profiles` + `auth.users.email`. Employee gets in-app notification.
- [ ] HR Returns for clarification with "Need a clearer ID photo" → status flips, employee sees the comment, can edit + resubmit.
- [ ] Employee resubmits → status back to pending, history preserved.
- [ ] HR Rejects → status `rejected`, employee sees reason, profile unchanged.
- [ ] Employee tries to edit profile while a pending request exists → blocked or shown "Pending request — please wait".
- [ ] Try uploading 4 files → blocked at 3.
- [ ] Try uploading a 10 MB PDF → blocked at 5 MB.
- [ ] Try uploading `.exe` or `.docx` → blocked.
- [ ] RLS check: a different employee tries to read someone else's request → 403.

---

## Cross-feature notes

### Email change unification

Both features end up changing employee emails through the same Edge Function (`update-employee-email`). Feature 1 calls it directly when HR edits. Feature 2's Approve action also calls it as part of `approve-profile-change-request`. **Trigger 015 keeps `profiles.email` in sync after the auth.users update completes**, so no application code needs to write to `profiles.email` for either feature.

### `profiles_update_own` lockdown (migration 014)

The lockdown still applies. Even after Feature 2 is live, employees can't directly UPDATE their own privileged columns. Their edits go through the request flow → HR approves → SECURITY DEFINER RPC writes the changes (bypassing the lockdown for that one operation).

### Future: applying same approval flow to other types of edits

The schema is field-agnostic (the `changes` column is JSONB). If HR ever wants to require approval for, say, `phone` self-edits but skip approval for `photo_url`, it's a config tweak, not a redesign.

---

_05_07_2026_
