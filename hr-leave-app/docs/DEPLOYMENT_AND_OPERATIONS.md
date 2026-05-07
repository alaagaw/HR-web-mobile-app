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
| Site URL | `https://gaw-hr.vercel.app` | Auth → URL Configuration |
| Redirect URLs | `https://gaw-hr.vercel.app/reset-password`, `http://localhost:8081/reset-password` | Auth → URL Configuration |
| SMTP | Supabase default (`noreply@mail.app.supabase.io`, ~3/hr limit) | Auth → SMTP Settings (will switch to Resend in Setup 3.B) |
| Email template `recovery` | "Welcome to HR System — Set your password" | `supabase/templates/recovery.html` (also editable in Dashboard) |

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

### ✅ Setup 3.A — Done

- Migrations 014, 015, 016 applied
- Edge Function secrets set: `INVITE_MODE=magic_link`, `APP_URL=https://gaw-hr.vercel.app`
- Site URL + Redirect URLs configured
- Edge Functions deployed: `create-employee`, `send-invite`, `send-registration-email`
- Email template "Reset Password" customized as a welcome message
- End-to-end invite flow verified working

### ⏳ Setup 3.B — Pending (Resend domain verification)

When the polytech.com.sa DNS owner adds the records:

1. Add `RESEND_API_KEY` as Edge Function secret
2. Add `EMAIL_FROM=HR System <noreply@polytech.com.sa>` as Edge Function secret
3. Plug Resend SMTP into Supabase Auth → SMTP Settings:
   - host: `smtp.resend.com`
   - port: `465`
   - user: `resend`
   - password: the API key
   - sender: `noreply@polytech.com.sa`
4. (Optional) Switch `INVITE_MODE` to `temp_password` if you want HR-from-address branded invites instead of "set your own password" links.

After 3.B: same flow, but emails come from `noreply@polytech.com.sa`, deliverability jumps, and the rate limit goes from ~3/hr to Resend's quota (100/day on free, 50k/mo on $20 tier).

No code change required for 3.B. It's pure Supabase Dashboard config.

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
