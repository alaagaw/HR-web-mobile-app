# Access Control, Superusers & RLS Hardening — Session Recap

**Date:** 2026-05-18
**Branch/remote:** all work committed **and pushed** to `origin/main`
(`https://github.com/alaagaw/HR-web-mobile-app`)
**App URL:** https://www.polytech-hr.com/
**Commits (oldest → newest):** `ba96a71`, `9f5ee3e`, `9c6ef4d`,
`6d245fe`, `62a5ab1`, `73bd94b`, `3484651`, `3b3bae6`
**Migrations applied to prod (linked project `vwalbkxighagreetxczi`):**
**045, 046, 047, 048, 049, 050, 051 — all applied & verified.**

> Deploy model reminder: prod DB is **not** `db push` managed. SQL is
> applied manually with `supabase db query --linked --file <migration>`.
> All migrations here are idempotent. Local migration history is known
> out of sync with remote (pre-existing; see HR manual follow-ups).

---

## 1. Why this work happened

Started from three questions: move "Timesheet Management" off the HR
Admin landing into the sidebar; let Operations Project Managers (and all
HR) reach it; and "who is supposed to have access anyway?". That snow­
balled into the user's real ask: **a fully HR-configurable access system**
— gate any nav item or page by **Role, Department, and/or Job Title**, in
any combination, from a screen inside the app, with rules that auto-apply
when an employee's profile changes (attribute-based, never per-person).

Along the way an RLS audit found pre-existing data-exposure holes; those
were hardened in the same initiative.

---

## 2. The model (as built)

**Per resource** (a navbar item or a page) there is one `access_policies`
row:
- `visible_to_all` — "default for everyone" switch. On ⇒ all signed-in
  users pass, rules ignored.
- `rules` (JSONB array) — **OR of ANDs**: access granted if ANY rule
  passes; within a rule every *non-empty* dimension must match (AND);
  within a dimension the user's value must be in the list (IN); an empty
  dimension does not constrain. Dimensions: `roles`, `departments`,
  `job_titles`. Values normalised trim+lowercase.
- `enabled` — off ⇒ fall back to the registry `legacyDefault`.

**Failsafe precedence** (identical in client `evaluate.ts` and SQL
`fn_can_access`):
1. **Superuser** (`profile_capabilities.is_superuser`) → bypass everything.
2. **Minimal HR lockout floor** — HR / HR_Director can ALWAYS reach
   **only** `nav:admin` and `page:admin/access-control` (nothing else),
   so a bad policy or zero superusers can never permanently brick policy
   management.
3. No/disabled policy → client uses registry `legacyDefault` (today's
   behaviour); SQL fails **open** (seed guarantees a row for every
   governed resource; row-scoping still applies).
4. `visible_to_all` → true.
5. Else evaluate rules.

> The blanket "HR sees everything" failsafe was **removed** mid-session
> (it made it impossible to restrict a page away from regular HR — the
> reported bug where a plain `hr` user still saw an `hr_director`-only
> page). The superuser flag replaced it.

Resource keys: `nav:<tab-name>` and `page:admin/<route>`. **These must
stay in sync between the migration 045 seed and
`lib/access/resources.ts`** — if you add a guardable resource, add it in
both places.

---

## 3. What shipped, by layer

### Database (migrations)

| Mig | Purpose | Prod status |
|---|---|---|
| **045** | `access_policies` table, self-protecting RLS (all read, HR/HR_Director write), seed reproducing the *old* hardcoded nav behaviour 1:1 | applied, verified (11 nav + 18 page rows) |
| **046** | RLS hardening: `leave_requests` UPDATE was `USING(true)` → 5 scoped policies (own/assignee/hr/supervisor/manager); `leave_attachments` SELECT was `USING(true)` → visible only if parent request visible | applied, verified, code-audited safe |
| **047** | `profile_capabilities.is_superuser` (HR-set, default false) | applied, verified |
| **048** | `fn_access_rule_match()` (pure IMMUTABLE rule core) + `fn_can_access(resource_key)` (SECURITY DEFINER STABLE) — Postgres mirror of `evaluate.ts` | applied; 10/10 SQL unit tests pass |
| **049** | Phase-2 proof: `AS RESTRICTIVE` `fn_can_access('page:admin/compensation')` gate on `employee_compensation`, AND-ed with existing self/HR row-scoping | applied; RLS-simulated |
| **050** | `get_profile_secure(id)` + `list_employees_secure(filters)` — SECURITY DEFINER accessors that redact 5 PII columns unless self/HR | applied; impersonation-validated |
| **051** | Gap #1 lockdown: `REVOKE SELECT ON profiles FROM authenticated` + `GRANT SELECT (21 safe cols)` — closes the raw `select=*` PII leak | applied; verified |

### Client code

- `lib/access/evaluate.ts` — pure rule engine (`evaluateAccess`,
  `ruleMatches`, `isAccessFailsafe`). **Source of truth; `fn_can_access`
  must mirror it exactly.**
- `lib/access/resources.ts` — registry of every guardable resource +
  `legacyDefault` (reproduces pre-existing behaviour for unseeded keys).
- `services/supabase/access-policy.ts` — `accessPolicyService` (list/upsert).
- `stores/access-store.ts` — zustand cache (policies + `isSuperuser`),
  cleared on sign-out.
- `hooks/use-access.ts` — `useAccess()` → `canAccess(key)`; loads
  policies + current user's `is_superuser` once per session.
- `components/access/access-gate.tsx` — `<AccessGate resourceKey>` route
  guard (spinner while loading → page or "Access restricted").
- `app/(app)/admin/access-control.tsx` — the HR config screen.
- `app/(app)/(tabs)/_layout.tsx` — navbar now policy-driven (old
  `approverOnly`/`hrOnly` removed).
- `app/(app)/(tabs)/admin.tsx` — landing cards hidden via `canAccess`.
- 17 admin pages wrapped in `<AccessGate>` (inner component unchanged;
  hook order preserved).
- Edit Employee (`employees.tsx`) — "Access superuser" capability checkbox.
- Gap #1 reroute: `auth.ts fetchProfile`, `registration.ts` ×4,
  `user.ts getProfile/getEmployees`, `lib/employee-bulk-excel.ts`, and
  `user.ts updateProfile` (no longer `.update().select()`) now go through
  the SECURITY DEFINER accessors.

---

## 4. Verification evidence (prod)

- **045**: seed = old behaviour, app unchanged until HR edits a policy.
- **046**: every `leave_requests` UPDATE path code-audited (submit=own,
  approve/reject=assignee or HR-claim-step, cancel=own/HR,
  reassign/bypass/excess=HR); policies mirror proven migration-001 SELECT
  patterns.
- **048**: 10/10 rule-core unit tests incl. the exact bug case
  ("hr_director-only, role hr → deny").
- **049**: impersonated employee sees own comp (1) / others (0);
  impersonated HR sees all (13). Behaviour-preserving; restrictive gate
  can only subtract, never over-grant.
- **050/051**: impersonated non-HR raw `SELECT phone FROM profiles` →
  **permission denied**; raw `SELECT id,full_name,role` → 238 rows OK;
  own phone via `get_profile_secure` → 1; others via
  `list_employees_secure` → 0; HR → 8. `authenticated` has 0 col-privs on
  the 5 PII cols, 21 safe cols granted.

---

## 5. The Phase-2 pattern (for future per-table wiring)

To enforce an HR-configured gate at the database for a table:

```sql
CREATE POLICY <name> ON <table> AS RESTRICTIVE FOR SELECT
  USING ( <legit non-HR row-scoping, e.g. employee_id = auth.uid()>
          OR public.fn_can_access('page:admin/<resource>') );
```

- Postgres: `final = (OR of PERMISSIVE) AND (AND of RESTRICTIVE)`.
- Keep existing permissive policies (they define WHICH rows). The
  restrictive gate can only **subtract** — HR can tighten visibility via
  the Access Control screen but can never over-grant data.
- Always include the `OR <self/legit scoping>` so self-service never
  breaks if HR restricts the page.
- **Caution — granularity mismatch:** gate is per *page*; RLS is per
  *table*. Tables broadly joined for display (`profiles`, `projects`,
  `timesheets`) must NOT get a blanket gate or incidental name/dropdown
  reads break. Analyse per table; do not mechanise.
- Reversible: `DROP POLICY <name> ON <table>;`

`employee_compensation` (migration 049) is the worked example.

---

## 6. Where to pick up

**Nothing is required — the initiative's core goals are met and verified.**
Remaining items are optional, in priority order:

1. **More Phase-2 table wiring** (defense-in-depth only; underlying data
   already has RLS). Candidates must pass the §5 granularity test.
   `employee_compensation` is done.
2. **Gap #4 — audit-table write hardening** (low severity, integrity not
   exposure): `leave_ledger` INSERT, `leave_request_history`
   SELECT+INSERT, `timesheet_history` SELECT+INSERT are still
   `USING(true)` (any authenticated user can forge/read audit rows).
3. **Local↔remote migration history sync** — pre-existing; consider
   `supabase migration repair --status applied` for 045–051.

**Invariants to respect in any future change:**
- If you add a guardable nav/page: add the key to **both**
  `lib/access/resources.ts` **and** the 045-style seed (insert an
  `access_policies` row), or it falls to `legacyDefault`/fails closed.
- If you change `lib/access/evaluate.ts` semantics, **mirror it in
  `fn_can_access` (migration 048)** and re-run the SQL unit tests, or the
  UI and DB layers will disagree.
- The two-key HR floor (`nav:admin`, `page:admin/access-control`) and the
  superuser bypass exist in **both** layers — keep them identical.
- `profiles` sensitive columns (`phone, nationality, start_date,
  registration_note, hr_original_values`) are reachable by app code
  **only** via `get_profile_secure` / `list_employees_secure`. Any new
  code path needing them must use those RPCs, never raw
  `from('profiles').select('*')`. Adding a new sensitive column ⇒ also
  add it to the redaction CASEs in migration 050 and exclude it from the
  051 GRANT.
- The owner/admin should be flagged **Access superuser** (Edit Employee →
  Capabilities) so they're never surprised by a restrictive policy.

---

## 7. Quick rollbacks (if ever needed)

| Concern | Rollback |
|---|---|
| Access gating misbehaving | `UPDATE access_policies SET visible_to_all = true;` (opens everything) or set `enabled=false` per row |
| 046 broke a leave flow | drop the 5 `requests_update_*` + scoped `attachments_select`, recreate `requests_update_all`/`attachments_select` as `USING(true)` |
| 049 comp gate | `DROP POLICY emp_comp_access_gate ON employee_compensation;` |
| 051 PII lockdown | `GRANT SELECT ON public.profiles TO authenticated;` |

---

## 8. HR-facing summary (also added to `HR_USAGE_MANUAL.md`)

- **HR Admin → System → Access Control**: per nav item / page, toggle
  "Visible to everyone" or add rules (Role / Department / Job Title
  pickers). Changes take effect on next load; rules are attribute-based
  so moving an employee's department/role/title re-grants automatically.
- **Edit Employee → Capabilities → Access superuser**: bypasses every
  rule. Grant sparingly; the owner should have it.
- HR / HR Director can always reach Access Control itself (can't be
  locked out), but otherwise follow the rules like everyone else.
