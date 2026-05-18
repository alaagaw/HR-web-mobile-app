# Forms Revamp — Requirements, Code Analysis & Plan

**Date:** 2026-05-18
**App URL:** https://www.polytech-hr.com/
**Status:** requirements + plan agreed; Phase A (safe pieces) implemented
this session; Phase B (schema + registration chokepoint RPC) drafted &
**gated on review** (mirrors the gap-#1 / migration-046 discipline — the
registration submit RPC is a prod-critical path).

---

## 1. Requirements (verbatim intent + decisions)

### R1 — "Start Date" → "Joining Date" everywhere
**Decision:** this is a **label-only** change in the *employee* context.
The DB column stays `profiles.start_date` (renaming it would cascade
through RPCs, FKs, payroll/accrual logic, exports — high risk, zero
benefit; it's a wording concern). "Everywhere" = the **employee joining
date** only:
- `employees.tsx` Edit Employee (`label="Start Date"` ~L744)
- `employees.tsx` New Employee (`label="Start Date"` ~L1361)
- `registration-form.tsx` read-only HR block (`'Start Date'` ~L326)

**Explicitly NOT renamed** (different meaning): project Start Date
(`projects.tsx`), Leave Payouts "Start Date (optional)" forecast input
(`leave-payouts.tsx`), leave-request dates (`requests/[id].tsx`).

### R2 — Registration form additions

| # | Field | Type / source | Storage |
|---|---|---|---|
| a | **National Address** (Saudi SPL "Short Address") | free text, e.g. `RRRD2929`; light format hint | new `profiles.national_address` |
| b | **Absher Mobile Number** | relabel of the existing **Phone** field (registration form). Same `profiles.phone` column. *(Decision: relabel in the registration form as asked; can extend app-wide later — flagged.)* | `profiles.phone` |
| c | **Qualification** | autocomplete dropdown, fixed list: `None`, `High School`, `Diploma`, `Bachelor's`, `Master's`, `Doctorate / PhD`, `Professional Training / Certificate` *(adjustable — confirm exact wording)* | new `profiles.qualification` |
| d | **Specialization** | **creatable** autocomplete: pick from a lookup, or type a new one which is accepted as-is and **flagged for HR** to spell-check / approve / merge | new `profiles.specialization` + new `lookup_specializations` table (mirrors `lookup_designations`, incl. `is_active`) |
| e | **Declaration** | mandatory checkbox block, large font, yellow highlight/border, shown right before Submit. Exact text: *"I, hereby confirm that all the information in this form is true and correct. I also understand that the information collected in this form will be used for creation of Qiwa contract, and by accepting/submitting this form, I confirm that the information can be used for this purpose."* Dated `dd/mm/yyyy`. **Submit blocked unless checked.** Store the acceptance + timestamp. | new `profiles.declaration_accepted_at TIMESTAMPTZ` (+ `declaration_version TEXT` for future-proofing if the text changes) |

### R3 — Universal mandatory-field visual state
Every mandatory field, on **every** form: **red border when required and
empty**, **green border (or check) when filled** — not only on submit
error. Applies to the registration form AND all other forms with required
fields.

---

## 2. Code analysis (what exists today)

### Two distinct form stacks
1. **React-Hook-Form + Zod + RN `<Input>`** — auth/registration
   (`registration-form.tsx`, sign-in, change-password). Validation
   schemas in `lib/validators.ts`. Shared input: `components/ui/input.tsx`
   (currently: red border only when there's a submitted error; no
   "required & empty" or "filled = green" state).
2. **MUI `<TextField>` / `<Autocomplete>`** — HR admin web dialogs
   (`employees.tsx` Edit/New, `review-registration-dialog.tsx`,
   projects/suppliers). Ad-hoc per-field; no shared validation visual.

→ A truly universal R3 needs **two** small reusable primitives (one per
stack), not one. See Plan §4.

### Registration submit path (critical)
`registration-form.tsx onSubmit` → `registrationService.submitRegistration`
→ **RPC `submit_registration`** (current def: migration `040`; only
`p_phone, p_nationality` for profile fields; id-doc fields handled
alongside). HR-side edits go through **RPC `hr_update_pending_profile`**
(migration `026`) which also writes one `profile_audit_log` row per
changed field. Both are **chokepoint RPCs** from the migration-042
registration lifecycle rework — adding fields means superseding both
function definitions, carefully, and smoke-testing a real submit.

### Lookups
`lookup_departments / nationalities / designations` (migration 023):
single canonical `name` PK, `is_active` soft-delete, casing CHECK,
`canonicalise*` client helpers, FK from `profiles`. `Specialization`
should follow this exact pattern as `lookup_specializations` (no casing
CHECK — free-form like designations; HR curates).

### Profile model
`types/models.ts` `Profile` + the secure accessors from migration 050
(`get_profile_secure`, `list_employees_secure`). **Any new `profiles`
column must be added to:** the `Profile` interface, the migration-050
`list_employees_secure` projected column list (and decide if it's PII →
redaction CASE + exclude from migration-051 GRANT). National address /
qualification / specialization are **not** highly sensitive → keep in the
21 safe-granted columns. `declaration_accepted_at` likewise safe.

---

## 3. Phased plan

### Phase A — safe, self-contained (DONE this session)
- **R1** Joining Date relabel (3 spots). Zero-risk string change.
- **R3 (stack 1)** Enhance `components/ui/input.tsx` with a `required`
  prop → live red(empty)/green(filled) border, independent of submit
  errors. Wire registration form's required inputs. This is the reusable
  primitive for every RHF/Input form.

### Phase B — schema + registration RPC (GATED: review this doc first)
One migration:
1. `ALTER TABLE profiles ADD COLUMN national_address TEXT,
   qualification TEXT, specialization TEXT,
   declaration_accepted_at TIMESTAMPTZ, declaration_version TEXT;`
2. `CREATE TABLE lookup_specializations (name TEXT PK, is_active …)`
   + RLS (all read, HR write) + `profiles.specialization` FK
   (`ON UPDATE CASCADE`, like the other three).
3. `CREATE OR REPLACE FUNCTION submit_registration(...)` — add
   `p_national_address, p_qualification, p_specialization,
   p_declaration_accepted` params; the declaration param is **required**
   (raise if null/false) so the DB enforces R2e even if the client is
   bypassed; set `declaration_accepted_at = now()` server-side.
4. `CREATE OR REPLACE FUNCTION hr_update_pending_profile(...)` — same new
   params + per-field `profile_audit_log` rows (so HR edits are audited
   exactly like phone/nationality today).
- Idempotent. **Not applied until reviewed**; then apply via
  `supabase db query --linked --file` and **smoke-test one real
  registration submit + one HR review-edit** before trusting (registration
  is the most prod-critical user path).

### Phase C — registration form + HR review UI (after B applied)
- `registration-form.tsx`: add National Address (Input), relabel Phone →
  "Absher Mobile Number", Qualification (Autocomplete fixed list),
  Specialization (creatable — reuse `CreatableLookupAutocomplete` on web /
  Input fallback on native; new value → `lookupService.addSpecialization`,
  which inserts inactive-flagged for HR review… see note), Declaration
  block + mandatory checkbox gating Submit. Extend
  `registrationFormSchema` (zod) with the new required fields +
  `declaration_accepted: z.literal(true)`.
- `lib/validators.ts`: new fields + refine.
- `services`: extend `submitRegistration` payload + `lookupService`
  (`getSpecializations`, `addSpecialization`, `canonicaliseSpecialization`).
- `types/models.ts`: `Profile` new fields.
- `review-registration-dialog.tsx`: surface + edit the 4 new fields
  (HR can correct Specialization spelling / approve). Show declaration
  acceptance + timestamp (read-only).
- Migration 050 `list_employees_secure`: add the new columns to the
  projection so HR screens still see them.

> **Specialization "flag for HR" mechanism:** new values are inserted into
> `lookup_specializations` with `is_active = false` (a "pending HR review"
> state). HR's existing lookup management (or the review dialog) flips
> `is_active = true` or merges/corrects. The employee's
> `profiles.specialization` stores whatever they submitted; HR can correct
> it in the review dialog. Cleanest reuse of the established pattern.

### Phase D — universal validation across the OTHER forms

The plan for every remaining form (R3 rollout):

| Form | Stack | Action |
|---|---|---|
| Sign-in (`sign-in.tsx`) | RHF/Input | mark email+password `required` (low value — short form; optional) |
| Change password | RHF/Input | `required` on both fields |
| **Edit / New Employee** (`employees.tsx`) | MUI | build `RequiredField` MUI wrapper (or shared `requiredSx(value)` → red/green border) and apply to the required TextFields/Autocompletes (Full Name, Email, Emp Code, Nationality, Job Title, Start/Joining Date, Role, Department, Supervisor, Manager) |
| Review Registration dialog | MUI | same MUI wrapper on its editable required fields |
| Leave request (`requests/new`) | check stack | apply matching primitive |
| Projects / Suppliers dialogs | MUI | same MUI wrapper on required fields |
| Compensation / balance adjust / bulk dialogs | MUI | same wrapper |

**Reusable primitives to build (one per stack):**
- RN: `Input` gains `required?: boolean` → border = red if
  `required && !value`, green if `required && value`, default otherwise.
  (Phase A.)
- MUI: a tiny helper `requiredSx(value: string)` returning the
  `sx`/`color` to drop on any `<TextField>`/`<Autocomplete>` +
  optionally a `<RequiredTextField>` thin wrapper. One file, imported by
  every MUI dialog. (Phase D.)

Order of rollout: Edit/New Employee first (highest-traffic HR form,
already touched by R1), then Review Registration, then the
projects/suppliers/compensation dialogs, then the low-value auth forms.

---

## 4. Open confirmations (non-blocking — defaults assumed)

1. Qualification list exact labels/order (assumed list in R2c).
2. "Absher Mobile Number" relabel — registration form only (assumed) or
   app-wide (Edit/New Employee + review dialog) too?
3. Declaration: store `declaration_version` text snapshot too? (assumed
   yes — cheap future-proofing if the legal text changes).
4. National Address — any format validation? (assumed: free text + hint
   only; SPL format is `AAAA####` but not strictly enforced.)

If any default is wrong, only Phase B/C wording changes — Phase A stands.

---

## 5. Risk & rollback

- Phase A: trivial; revert commit.
- Phase B: registration chokepoint RPC — same risk class as gap #1.
  Mitigations: idempotent `CREATE OR REPLACE`; new params all
  `DEFAULT NULL` except the declaration gate; smoke-test a real submit
  before relying; rollback = re-apply the migration-040 / 026 function
  bodies (kept in git history).
- Phase C/D: UI only; revert commits.
