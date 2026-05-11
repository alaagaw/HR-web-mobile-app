# Employee Data Reconciliation — Vacation Excel vs. Live DB

**Date:** 2026-05-11
**Source spreadsheet:** `PloyTech_employye_list_from_othersheet_vacation_maybe.xlsx` (310 rows)
**Live DB:** Supabase project `vwalbkxighagreetxczi`

---

## What was done on 2026-05-11

| Migration | What it did |
|---|---|
| `024_annual_leave_entitlement.sql` | Added `profiles.annual_leave_entitlement_days NUMERIC(5,1)` |
| `024b_backfill_doj_entitled.sql` | Initial code-match attempt. Only 10 profiles updated — most DB employees had auto-generated `90xxx` codes from a prior import, no overlap with the vacation Excel's `70xxx`. |
| `024c_seed_admin_emp_codes.sql` | Fixed the 9 admin/HR/Finance seed accounts (names, job titles, departments, real emp_codes). |
| `024d_seed_nationalities.sql` | Standard set of 10 nationalities. |
| `024e_seed_designations.sql` | 91 designations from the PolyTech roster. |
| `024f_seed_departments_and_typo_fix.sql` | Added ADMIN, IT, LOGISTICS, SAFETY DEPARTMENT, HR + renamed `Manager- Estmation & PMO` → `Manager- Estimation & PMO`. |
| Ad-hoc name-match UPDATE | Direct DB run via pg client. 183 profiles updated via exact normalised / token-set / token-subset matching. 11 more via fuzzy match (last-token exact + first-token 3-char prefix). **Total: 194 + 10 from 024b = ~200.** |

**Final tally:** 200 / 236 profiles have `start_date` and `annual_leave_entitlement_days` populated.

---

## Outstanding: 36 DB profiles still missing `start_date`

### Test / admin accounts (8) — expected, not in vacation Excel

- `Aqeel Al-Rashid`, `Ahmed Malik`, `Khalid Ibrahim`, `Omar Yusuf`, `Sara Noor` — all `@aqeel.com` test users from initial seed
- `Fatima Hassan` (`hr@aqeel.com`) — admin seed, handled by 024c
- `Shahad HR` (`shahad.hr@polytech.com.sa`) — admin seed, handled by 024c
- `شكير وعدودي`, `مامون سليمان بخيت سعد` — Arabic-name test users

### Probably matchable manually (≈ 8) — fuzzy logic couldn't catch them

These weren't matched because the DB name and Excel name differ in ways automatic logic can't safely disambiguate (compound vs split tokens, or multiple DB candidates per Excel name).

| DB profile (current) | Likely Excel candidate | Reason fuzzy didn't catch |
|---|---|---|
| `DIL AFSAR KHAN MAQBOOL UR REHMAN` | `Dilafsar Khan` (70387) | Last token `REHMAN` ≠ `KHAN` |
| `SOHID MIAH - - MUSLEM UDDIN` | `Sohid Miah Muslemuddin` (70100) | DB splits `MUSLEM UDDIN` into 2 tokens; Excel keeps `MUSLEMUDDIN` as 1 |
| `MOHAMMED HAMED MOHAMMED GHOUSE` | `Mohammed Hamed` (70125) | Skipped — Excel name matched 2 DB candidates |
| `RAM KUMAR BABU RAM` | `Ram Kumar` (70675) | Skipped — Excel name matched 5 DB candidates |
| `MASUM MOHAMMED MAHATAB MASUM` | `Masum Mohd. M. M.` (70097) | Excel uses initials, names don't overlap |
| `RANA AFZAAL AHMAD GULZAR AHMAD` | `Rana Afzal Ahmad Gulzar` (70370) | Last tokens differ (`AHMAD` vs `GULZAR`) |
| `BASHARAT AMIN MUHAMMAD AMIN` | `Basharat Ameen` (70386) | Last tokens differ (`AMIN` vs `AMEEN`) |
| `AKHILESH KUSHWAHA NAGESHWAR KUSHWAHA` | `Akhilesh Kushawaha` (70517) | Last tokens differ (spelling) |

**Action:** HR eyeball these and confirm which pairs to link, then run a targeted UPDATE per pair (matching by profile.id or unambiguous email). This is a manual one-off.

### Genuinely missing from the vacation Excel (≈ 20)

The remaining ~20 are real `OPERATIONS` employees that exist in the DB (originally from the "Active Residents" Excel) but aren't in the vacation list. No action unless another roster surfaces.

---

## Outstanding: 110 Excel rows with NO DB profile

**Real employees in HR's roster who haven't been invited to the system yet.** Two groups:

### `70xxx`-prefixed (89 rows)

Bulk of the existing PolyTech roster, never imported. Sample:

| Code | Name | Designation | Dept | Nationality |
|---|---|---|---|---|
| 70023 | Hassan M. Al Nasser | Deputy Manager-GR | ADMIN | Saudi |
| 70025 | Abdul Hadi Mohammad | Equipment Supervisor | OPERATIONS | Saudi |
| 70029 | Bilal B. Al-Buainain | Government Rep - I | ADMIN | Saudi |
| 70031 | Khalid Y. Al Buinain | Security Supervisor | ADMIN | Saudi |
| 70050 | Jefferson G. Ilagan | Manager- Estimation & PMO | OPERATIONS | Filipino |
| 70062 | Ritin Raveendran | System Administrator | IT | Indian |
| ... | ... (full list in the validation script output) | | | |

### `EMD1xx`-prefixed (21 rows) — newer batch

| Code | Name | Designation | Dept | Nationality |
|---|---|---|---|---|
| EMD101 | Syed Faisal | ID Officer | Logistics | Indian |
| EMD102 | Alam Zeb | Safety Officer | SAFETY DEPARTMENT | Pakistani |
| EMD103 | Javed Ali | Safety Officer | SAFETY DEPARTMENT | Pakistani |
| EMD104 | Zeeshan Muhammad Latif | Rigger III | OPERATIONS | Pakistani |
| EMD105 | Hyder Khurshid | Estimator | OPERATIONS | Indian |
| ... | (21 total) | | | |

**Action options:**

1. **Bulk-import via the `create-employee` edge function.** A script reads the vacation Excel, iterates the 110 unmatched rows, calls the edge function for each. The function atomically creates `auth.users` → `profiles` → `employee_documents`. New employees land in the `not_invited` state until HR sends their welcome emails.

2. **Generate a one-shot SQL seed** mirroring `seed-from-excel.js`. Same destination, no edge-function dependency, but requires manual review of generated emails (and they'll be `<first>.<last>@company.com` placeholders by default).

3. **Defer.** Leave the 110 out of the system until HR is ready to onboard them individually via the New Employee dialog.

---

## Action items going forward

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Confirm 8 probable matches above, run targeted UPDATEs | HR (review) + dev (run) | open |
| 2 | Decide whether to bulk-import the 110 missing employees and which option | HR | open |
| 3 | Re-run DOJ + entitlement update if/when the 110 land in profiles | dev | open after #2 |
| 4 | Investigate why `MOHAMMED HAMED` matched 2 candidates and `RAM KUMAR` matched 5 — there may be duplicate-employee rows in the DB | dev | open |
| 5 | Resolve `HR` vs `HUMAN RESOURCES` department split (consolidate or keep both) | HR decision | open |

---

## Reference: how the matching worked

For reproducibility / debugging, the matching layers used were:

1. **Exact normalised:** uppercase + collapse spaces + strip non-alphanumeric. e.g. `"ABDUL OHAB MIA  "` ↔ `"Abdul Ohab Mia"` both normalise to `"ABDUL OHAB MIA"`.
2. **Token-set:** split + sort + rejoin. Catches reorderings like `"Mia Abdul Ohab"`.
3. **Token-subset:** every Excel-name token appears somewhere in the DB-name. Catches `"Abdul Ohab"` matching `"ABDUL OHAB MIA"`.
4. **Fuzzy (last-token + first-token-prefix ≥ 3 chars):** catches `"ABUHANIF MUSLEMUDDIN"` ↔ `"Abu Haneef Muslemuddin"` (last token MUSLEMUDDIN matches; ABU prefixes ABUHANIF for 3+ chars).
5. **Ambiguous handling:** if a match returns 2+ DB candidates, skip the update rather than guess.

Anything beyond layer 4 (e.g. phonetic / Levenshtein) was deliberately not used to avoid false positives.
