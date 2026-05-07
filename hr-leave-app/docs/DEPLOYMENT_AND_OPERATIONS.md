# Deployment & Operations Reference

How to deploy, what NOT to do, and the gotchas we already paid the price for.

> **Read this before** running `supabase` CLI commands or making infra changes.
> Most foot-guns in this stack come from things that look harmless until they
> silently overwrite production config.

---

## 1. Stack at a glance

| Layer | Where it lives | How it deploys |
|---|---|---|
| **Web frontend** (Expo Web → Vercel) | `hr-leave-app/app/`, `components/`, `services/`, etc. | **Auto** — `git push` to `main` → Vercel rebuilds |
| **Mobile** (Expo Native, not built yet) | Same code, different bundler target | Future: EAS Build |
| **Edge Functions** (Supabase Deno) | `hr-leave-app/supabase/functions/` | **Manual** — `supabase functions deploy <name>` from CLI |
| **Database migrations** (SQL) | `hr-leave-app/supabase/migrations/` | **Manual** — paste into Supabase Dashboard SQL Editor |
| **Auth settings** (URLs, MFA, password rules) | Lives in Supabase Auth | **Dashboard ONLY** — see §6 for why CLI is dangerous here |
| **Auth email templates** (Reset Password etc.) | `supabase/templates/*.html` + `supabase/config.toml` | Carefully via `supabase config push`, OR via Dashboard. See §6. |
| **Edge Function secrets** (`INVITE_MODE`, `APP_URL`, etc.) | Supabase Dashboard → Project Settings → Edge Functions → Secrets | Dashboard ONLY |
| **SMTP config** (custom sender, e.g. Resend) | Supabase Dashboard → Authentication → SMTP Settings | Dashboard ONLY |

---

## 2. Current production configuration

| Setting | Value | Where set |
|---|---|---|
| Vercel project URL | `https://gaw-hr.vercel.app` | Vercel Dashboard |
| Supabase project ref | `vwalbkxighagreetxczi` | Supabase URL |
| Linked CLI workdir | `hr-leave-app/` (where `supabase/` lives) | `supabase link --project-ref ...` |
| `INVITE_MODE` | `magic_link` | Edge Function secrets |
| `APP_URL` | `https://gaw-hr.vercel.app` | Edge Function secrets (fallback only — web client overrides via `window.location.origin`) |
| `RESEND_API_KEY` | `re_***` (set 2026-05-08) | Edge Function secrets |
| `EMAIL_FROM` | `HR System <noreply@polytech-hr.com>` | Edge Function secrets |
| `EMAIL_PROVIDER` | `resend` | Edge Function secrets |
| Site URL | `https://gaw-hr.vercel.app` | Auth → URL Configuration |
| Redirect URLs | `https://gaw-hr.vercel.app/reset-password`, `http://localhost:8081/reset-password` | Auth → URL Configuration |
| SMTP | **Resend via `polytech-hr.com`** — sender `noreply@polytech-hr.com`, host `smtp.resend.com`, port 465 (Setup 3.A.bis, 2026-05-08) | Auth → Notifications → Email → SMTP |
| Email template `recovery` | "Welcome to Poly-Tech HR Management System — Set your password" with hero banner | `supabase/templates/recovery.html` + `supabase/config.toml` |
| Email branding | "Poly-Tech HR Management System" with `PolyTech_background.png` hero banner | hardcoded in templates and Edge Function HTML |

---

## 3. Standard deploy procedures

### 3.1 Pure frontend / type / hook change

Examples: a new screen, a styling tweak, a new client-side service method that doesn't depend on a new Edge Function.

```powershell
git add <files>
git commit -m "..."
git push
```

Vercel auto-builds in 1–2 min. **Always hard-refresh** (Ctrl+Shift+R) the browser after the deploy is **Ready** in https://vercel.com/alaa-gaws-projects/~/deployments — Chrome aggressively caches the bundle.

### 3.2 New / changed Edge Function

**Order matters: deploy the function FIRST, push code SECOND.** If you push first, the new UI calls a function that doesn't exist yet → 404 → broken state until you deploy.

```powershell
cd hr-leave-app

# Deploy function(s) FIRST
supabase functions deploy <function-name>
# (deploy as many as you changed)

# Then push code
git push
```

Verify the function shows as deployed at:
`https://supabase.com/dashboard/project/vwalbkxighagreetxczi/functions`

### 3.3 New database migration

```sql
-- 1. Open Supabase Dashboard → SQL Editor → New Query
-- 2. Paste the contents of the new migration file
-- 3. Click Run
-- 4. Verify no errors
```

**Order matters when migrations + code go together:**
1. Apply the migration (DB has the new column / table)
2. Deploy any Edge Function that uses it
3. Push the frontend code

If you push frontend code first, the UI tries to read a column that doesn't exist → errors.

### 3.4 New Edge Function secret

Dashboard → Project Settings → Edge Functions → Secrets → Add. Functions read it on next invocation, no redeploy needed.

### 3.5 Auth email template change

**Two safe paths.** Pick one — don't mix.

#### Path A — Dashboard (RECOMMENDED for one-off edits)

Authentication → Email Templates → click the template → edit subject + HTML → Save.

Done. Zero risk.

#### Path B — CLI (config-as-code, only if you want it in git)

> ⚠️ **READ §6 FIRST.** `supabase config push` overwrites the entire auth section. We have a complete `supabase/config.toml` that captures every setting explicitly to prevent this. Do not strip anything from it.

1. Edit the template HTML in `supabase/templates/<name>.html`
2. If changing the subject, edit `supabase/config.toml` under `[auth.email.template.<name>]`
3. From `hr-leave-app/`:
   ```powershell
   supabase config push --yes
   ```
4. **Inspect the diff the CLI prints carefully.** If the diff shows changes to anything OTHER than the template you edited, **do not confirm** — abort and figure out what's missing from `config.toml`.

### 3.6 Auth setting change (Site URL, Redirect URLs, MFA, password rules, etc.)

**Always use the Dashboard.** Do NOT push these via `supabase config push` (see §6 for why).

If you do want them in git eventually: keep `supabase/config.toml` synced manually with whatever you set in the Dashboard, but only push it after triple-checking the diff.

---

## 4. End-to-end test checklist (after any deploy)

After deploying anything that touches the invite/auth flow:

1. Hard-refresh `https://gaw-hr.vercel.app` (Ctrl+Shift+R)
2. Sign in as HR
3. Admin → Manage Employees → click **New Employee**
4. Fill all 10 fields (use a real email you control, e.g. your own gmail)
5. Leave "Send invite email immediately" unchecked → **Create Employee**
6. Verify row appears with **Not Invited** amber badge
7. Tick the row → **Send Invite(s) (1)** → snackbar success → status flips to **Active**
8. Check the recipient inbox (and spam folder)
9. Click the link → lands on `/reset-password` → set password → signed in as the new employee
10. Sign out → "Forgot password?" → enter email → reset link arrives → set new password → signed in
11. Profile → edit name + phone → save (works); edit email → see confirmation notice

---

## 5. Common failure modes & fixes

| Symptom | Cause | Fix |
|---|---|---|
| Browser shows old code after deploy | Cached JS bundle | Hard-refresh (Ctrl+Shift+R). Still cached? DevTools → right-click reload → Empty Cache and Hard Reload |
| "Cannot read properties of undefined (reading 'size')" on employee table | MUI X DataGrid v8 expects `{ type, ids: Set }` for `rowSelectionModel`, not an array | Already fixed in commit `0d57838` |
| Magic-link email redirects to `127.0.0.1:3000` | Supabase Site URL got reset to local default | Restore in Dashboard → Auth → URL Configuration → Site URL = `https://gaw-hr.vercel.app`. **Caused by Path B in §3.5 with incomplete config.toml.** |
| "URL does not match any enabled patterns" on reset-password | Redirect URL not whitelisted | Auth → URL Configuration → Redirect URLs → add the exact URL the link points to |
| Edge Function returns 404 | Function never deployed | `supabase functions deploy <name>` from `hr-leave-app/` |
| Edge Function returns "Resend rejected" | `RESEND_API_KEY` missing or domain not verified | Setup 3.B — add the key as a secret AND verify the domain in Resend |
| "Invite email never arrives" | Supabase default SMTP rate limit (~3/hr) hit, OR landed in spam | Check spam first; for production, finish Setup 3.B (Resend) to lift the limit |
| New employee form silently fails | Old `invite-employee` Edge Function being called | UI should call `create-employee` + `send-invite` (the new split). Verify build is current. |

---

## 6. The `supabase config push` gotcha — read this carefully

### What happened (2026-05-07)

Trying to add a custom email template, I ran `supabase config push` with a minimal `config.toml` that only declared `[auth.email.template.recovery]`. The CLI did NOT just push that one section — it pushed an entire diff of the `[auth]` namespace, replacing every unset field with the local CLI defaults.

The result:

| Field | Was | Got pushed |
|---|---|---|
| `site_url` | `https://gaw-hr.vercel.app` | `http://127.0.0.1:3000` |
| `additional_redirect_urls` | both real URLs | `["https://127.0.0.1:3000"]` |
| `mfa.totp.enroll_enabled` | `true` | `false` |
| `email.enable_confirmations` | `true` | `false` |
| `email.max_frequency` | `1m0s` | `1s` |
| `email.otp_length` | `8` | `6` |

The Site URL + Redirect URLs we'd just set in the Dashboard were **silently nuked**. Magic-link emails would have redirected to a non-existent localhost URL until we fixed it.

### Why it happens

`supabase config push` does **section-level replacement**, not field-level merge. Whatever fields you don't declare in `config.toml`, the CLI fills with its defaults — and pushes those defaults as if you had explicitly set them.

There is no warning, no "are you sure you want to overwrite these other fields" prompt — just a `[Y/n]` after a diff that shows everything that's about to change. If you blindly hit Y (or pass `--yes`), all of it goes through.

### How we fixed it

1. Wrote a **complete** `supabase/config.toml` with every existing field declared explicitly (see commit `b964292`).
2. Re-pushed → diff showed only the fields we actually wanted to change (subject + content of recovery template).

### Rules going forward

1. **For one-off email template edits, use the Dashboard.** It's literally faster than the CLI roundtrip and has zero risk of overwriting other settings.
2. **If you DO use `supabase config push`:**
   - Never push a `config.toml` that only declares the section you're changing.
   - Always include every existing field for the section you're touching.
   - **Inspect the printed diff before confirming.** If it shows any change you didn't intend, abort with `n` and update `config.toml` to match the remote state for those fields.
3. **For Auth section settings (Site URL, Redirect URLs, MFA, signups, etc.) — use the Dashboard.** Even with a complete `config.toml`, the cost of getting it wrong is downtime; the cost of clicking through the Dashboard is 30 seconds.
4. The current `supabase/config.toml` has the Auth section captured exhaustively as of 2026-05-07. **If you change something in the Dashboard, also update `config.toml`** to keep them in sync. Otherwise the next `config push` will silently revert your Dashboard change.

---

## 7. Setup phases (where we are vs. where we're going)

### ✅ Setup 3.A — Done (2026-05-07)

- Migrations 014, 015, 016 applied
- Edge Function secrets set: `INVITE_MODE=magic_link`, `APP_URL=https://gaw-hr.vercel.app`
- Site URL + Redirect URLs configured
- Edge Functions deployed: `create-employee`, `send-invite`, `send-registration-email`, `update-employee-email`
- Email template "Reset Password" customized as a welcome message
- End-to-end invite flow verified working

### ✅ Setup 3.A.bis — Done (2026-05-08)

The Supabase default SMTP (`noreply@mail.app.supabase.io`) hit a rate limit during testing AND was suspected (likely correctly) of having its links pre-fetched by Gmail link scanners. To unblock without waiting on the polytech.com.sa DNS owner, we bought a throwaway domain and routed through Resend:

- Bought `polytech-hr.com` from Cloudflare (~$10/yr)
- Verified the domain in Resend via Cloudflare auto-configure (DKIM, SPF MX, SPF TXT)
- Generated a Resend API key
- Plugged Resend SMTP into Supabase Auth → SMTP Settings (sender `noreply@polytech-hr.com`)
- Added `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_PROVIDER=resend` as Edge Function secrets
- Email branded as "Poly-Tech HR Management System" with hero banner image (`PolyTech_background.png`)
- Verified end-to-end: invite to Yahoo, click link, set password, sign in — works.

### ⏳ Setup 3.B — Pending (DNS owner)

When the polytech.com.sa DNS owner adds Resend's records and the domain shows ✅ Verified in Resend:

1. Supabase Dashboard → Authentication → Notifications → Email → SMTP Settings → change **Sender email** from `noreply@polytech-hr.com` to `noreply@polytech.com.sa`. Save.
2. Edge Function secrets → update `EMAIL_FROM` to `HR System <noreply@polytech.com.sa>`.
3. (Optional) Cancel auto-renew on `polytech-hr.com` in Cloudflare if you don't want it as a permanent fallback.

That's it. No code change. The infrastructure is identical — only the sender domain swaps.

---

## 8. Reference: useful commands

```powershell
# Where am I?
git log --oneline -5
git status

# Deploy a function
cd hr-leave-app
supabase functions deploy <function-name>

# List deployed functions
# (no CLI command — check the Dashboard)
# https://supabase.com/dashboard/project/vwalbkxighagreetxczi/functions

# Push frontend (triggers Vercel)
git push

# View Vercel deployments
# https://vercel.com/alaa-gaws-projects/~/deployments

# Push email template config (USE WITH CARE — read §6)
cd hr-leave-app
supabase config push       # NO --yes, so you can inspect the diff first

# View live Edge Function logs
# Dashboard → Edge Functions → <function-name> → Logs
```

---

## 9. Future automation candidates (not done)

- **GitHub Actions to auto-deploy Edge Functions on push**: would require a `SUPABASE_ACCESS_TOKEN` GitHub secret and a workflow that runs `supabase functions deploy` whenever files in `supabase/functions/**` change. ~30 min one-time setup, eliminates the "remember to run the CLI" step. Worth doing once the function code stabilizes.
- **Migrations via `supabase db push`** instead of Dashboard SQL Editor: requires the migrations to be in a clean state and the link to be working. Less risky than auth config pushes, but still requires care. Currently we paste SQL manually — works fine for a small project.
- **Preview deployments per PR**: Vercel already does this for the frontend. Would also need a way to provision Supabase preview environments — non-trivial.

---

## 10. The recovery-client gotcha — read this if you change supabase auth code

### What happened (2026-05-08)

The reset-password page kept showing "Reset link unavailable" on perfectly valid recovery links. Multiple cascading causes — diagnosed by adding console.log statements and reading the actual behaviour:

1. The global supabase client (in `services/supabase/client.ts`) is initialized with `detectSessionInUrl: false` — done deliberately to avoid bugs elsewhere, but it means the client doesn't auto-process recovery tokens in the URL hash.
2. The same client also has a no-op `lock` override (line 31) — done to prevent "signal is aborted" errors during normal app navigation. But that no-op breaks `supabase.auth.setSession()` for the recovery flow: the call hangs forever, never resolving, never throwing.
3. So manually calling `setSession()` with the tokens from the URL hash (the obvious workaround for #1) didn't work either.

### How we fixed it

[`app/(auth)/reset-password.tsx`](../app/(auth)/reset-password.tsx) creates a **dedicated supabase client** just for the recovery flow, with SDK defaults (Web Lock + `detectSessionInUrl: true`). That client parses the URL hash automatically on construction and fires `PASSWORD_RECOVERY` / `SIGNED_IN` events. We listen for those.

Both clients share the same localStorage key (`sb-<project-ref>-auth-token`), so once the recovery client establishes a session, the global client picks it up on the next page load. After password update, we hard-navigate to `/` (`window.location.replace('/')`) so the global client re-initializes and the auth guard sees the new session.

### Rules going forward

1. **Don't enable `detectSessionInUrl: true` on the global client without testing every flow** — it was disabled for a reason; turning it on may resurrect old bugs.
2. **Don't remove the no-op `lock` override on the global client without testing every flow** — same reason.
3. **If you need recovery / magic-link / OAuth callback handling on a new page**, follow the same pattern: a dedicated client just for that page with default settings. Don't fight the global client.

---

## 11. Known issues / optional polish

These don't block anything but are worth fixing eventually.

### 11.1 Brief error flash before redirect after password set

**Symptom:** After successfully setting a new password on `/reset-password`, the page shows "Password updated. Redirecting…" and then for a fraction of a second some red error text flashes in DevTools / on screen before the hard navigation to `/` completes.

**Severity:** Cosmetic. The password actually saves; the user can sign in with the new password (verified). The flash is too brief for most users to read.

**Likely causes (un-confirmed):**
- The global supabase client trying to react to the localStorage change made by the recoveryClient
- React unmounting subscriptions while a Promise is mid-flight during the navigation
- Background token-refresh tick from the recoveryClient firing during teardown

**To investigate when ready:** Open DevTools → Console → enable **"Preserve log"** before submitting the new password. Then read the red lines that appear just before navigation. Paste them into the next session and we'll fix the specific thing instead of guessing.

### 11.2 Delete the deprecated `invite-employee` Edge Function

**Status:** The function still exists at `supabase/functions/invite-employee/index.ts` and is still deployed to Supabase. It's no longer called by the new UI (which uses `create-employee` + `send-invite` instead).

**To safely delete:**

1. Verify nothing in the codebase references it:
   ```bash
   grep -r "invite-employee" hr-leave-app --exclude-dir=node_modules
   # Expected: only the function's own folder and old docs.
   ```
2. Remove the local folder: `rm -rf hr-leave-app/supabase/functions/invite-employee`
3. Delete the deployed function in Supabase Dashboard → Edge Functions → invite-employee → Delete
4. Commit the deletion.

The `services/supabase/registration.ts` still has an `inviteEmployee()` method that calls this function for backward compatibility. If nothing in the UI calls `registrationService.inviteEmployee()` anymore (only `createEmployee` + `sendInvites`), that method can be removed too.

### 11.3 Untested code paths from this session

These were shipped but not verified end-to-end by the user yet:

- Edit Employee dialog full field parity (all 11 fields, especially `emp_code` populating from `employee_documents`)
- Supervisor "Show all employees" toggle behaviour
- Email change via the `update-employee-email` Edge Function (HR changes someone's auth email)
- "Forgot password?" flow from sign-in screen
- Profile self-edit triggering Supabase email confirmation flow (`auth.updateUser({email})`)
- Bulk send invites to multiple selected rows at once
- RLS lockdown rejecting a privileged self-update (try changing your own role via direct API to confirm)
