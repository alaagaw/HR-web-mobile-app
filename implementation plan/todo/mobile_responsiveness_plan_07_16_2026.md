# Mobile Responsiveness — Implementation Plan & Checklist
**Created:** 07/16/2026
**Owner:** Alaa Gaw
**App:** hr-leave-app (Expo Router + react-native-web + MUI)

---

## Hard rule (non-negotiable)
> **At/above 1200px, the current desktop-web layout renders byte-for-byte unchanged.**
> **Below 1200px, switch to card / mobile-app view.**

Every mobile change is gated:
```ts
if (width < MOBILE_BREAKPOINT) { /* mobile */ } else { /* existing code, untouched */ }
```
Wrap the old code — never delete or restyle it. Desktop must look identical after every change.

**Breakpoint = 1200px** (MUI `lg`, "12-inch class"). Laptops/desktops keep the web layout; iPads + phones get mobile view.

## Global decisions
- **Mobile nav:** bottom tab bar (top 5 accessible screens) **+** hamburger Drawer (full nav).
- **Tables:** MUI `DataGrid` at ≥1200px; stacked cards below 1200px.
- **Dialogs:** `fullScreen={isMobile}` on every MUI `<Dialog>`.
- **Single source of truth for the cutoff:** `hooks/use-breakpoint.ts`.

## Key technique — "dual-layout gating" (cheapest win)
Many pages already have BOTH a desktop web layout AND a separate mobile
layout, written as:
```ts
if (isWeb) { return <DesktopWebLayout/> }   // <-- catches ALL web widths
return <MobileLayout/>                        // native only today
```
On a phone browser `isWeb` is true, so the **desktop** layout renders on
mobile — often hiding inputs (e.g. the calendar sat in an off-screen right
column, so dates could not be picked). Fix = gate the web block behind the
breakpoint so mobile web reuses the existing, already-working mobile layout:
```ts
if (isWeb && !isMobile) { return <DesktopWebLayout/> }   // ≥1200px only
return <MobileLayout/>                                     // mobile web + native
```
This is often a ~3-line change (import `useBreakpoint`, add `!isMobile`) and
needs **no** new UI — the mobile layout is RN-based and renders on web via
react-native-web. **Prefer this** wherever a usable mobile layout already
exists; only build card conversions where a page is web-only.

**Audit result (all 30 `if (isWeb)` pages classified 07/16/2026):**

*Category A/B — GATED behind `!isMobile` (mobile web now uses the existing mobile layout):*
- [x] `requests/new.tsx` — date + time picker reachable on mobile web
- [x] `(tabs)/dashboard.tsx`  - [x] `(tabs)/profile.tsx`  - [x] `(tabs)/calendar.tsx`  - [x] `(tabs)/admin.tsx`  - [x] `(tabs)/timesheet-management.tsx`
- [x] `(tabs)/requests.tsx`  - [x] `(tabs)/tasks.tsx`  - [x] `(tabs)/team.tsx` (inline `isWeb ?` ternary gated)
- [x] `(auth)/sign-up.tsx`
- [x] `admin/user-activity.tsx`  - [x] `admin/balance-ledger.tsx`  - [x] `admin/request-history.tsx`  - [x] `admin/renewal-history.tsx`  - [x] `admin/balances.tsx`

*Already responsive (width-gated ≥1280/1366 — mobile web already gets mobile layout; SKIP, but consider normalizing breakpoint to 1200):*
- `(tabs)/timeclock.tsx` (≥1366)  - `(tabs)/timesheet-entry.tsx` (≥1280, mobile is read-only)  - `admin/document-expiry.tsx`  - `timesheet/suppliers.tsx`  - `timesheet/projects.tsx`  - `timesheet/timesheet-assignments.tsx`

*Category A but VIEW-ONLY mobile (data shows, but no CRUD actions on mobile) — needs user decision:*
- [ ] `admin/employees.tsx` (search+list, no add/edit dialogs on mobile)
- [ ] `admin/registrations.tsx` (list, no review/approve on mobile)

*Category C — mobile fallback is a stub / desktop-redirect (need real mobile UI):*
- Reusable `components/ui/mobile-card-list.tsx` built (07/16/2026) — DataGrid→stacked-cards on mobile.
- [x] `timesheet/employee-project-breakdown.tsx` — month nav + card list (07/16/2026)
- [x] `timesheet/project-hours-requests.tsx` — card list + fullScreen approve/reject dialog (07/16/2026)
- [x] `admin/leave-payouts.tsx` — mobile month nav + forecast/actual tabs + search + card list + export (07/16/2026)
- [x] `admin/compensation.tsx` — card list (tap → history/add dialog), 3 dialogs fullScreen (07/16/2026)
- [x] `timesheet/timesheets.tsx` — Monthly Consolidated per-employee card summary (07/16/2026)
- [x] `timesheet/month-closures.tsx` — fullScreen dialog; card grid already reflows (07/16/2026)
- [x] `admin/hr-policies-documents.tsx` — searchable single-column doc list on mobile, tap to open file (07/16/2026)
- [ ] `(auth)/registration-form.tsx` (single shared render; `isWeb` only for styling — needs responsive form work, not gating) — OPTIONAL/remaining

*Category A view-only → add mobile actions (parity):*
- [x] `admin/registrations.tsx` — gated + mobile Review button → fullScreen review/approve dialog (07/16/2026)
- [x] `admin/employees.tsx` — gated + tap-to-edit + New Employee button + fullScreen Edit/Invite dialogs (07/16/2026)

## Action-parity audit + fixes (07/16/2026)
After the layout work, a full audit found pages whose mobile view rendered
data but was missing web ACTIONS. Fixed:
- [x] `timesheet/projects.tsx` — search was a dead stub, edit silently no-op, no Add. Wired search + Add + mounted ProjectDialog/DeleteConfirmDialog.
- [x] `admin/document-expiry.tsx` — added search, per-card Assign renewal (AssignDialog), Export/Upload Excel.
- [x] `admin/employees.tsx` — added include-inactive toggle, checkbox select + bulk bar (Send Invites/Reset/Info/Warning), per-card Send invite, ResendEmailDialog.
- [x] `admin/balances.tsx` — added Run Accruals / Export / Import.
- [x] `timesheet/timesheets.tsx` — added Reg-hrs/day setter + Export.
- [x] `(tabs)/tasks.tsx` — renew Modal was `!isWeb` (inert on mobile web); now renders on mobile web.
- [x] `admin/hr-policies-documents.tsx` — added New Document/Folder + per-card Edit/New-version/Archive + mounted DocDialog/FolderDialog.
- [x] `(tabs)/dashboard.tsx` — convenience gap only; every action reachable via nav (approvals→request detail, renewals→tasks tab, registrations→registrations page). No change needed.
- [x] **`(tabs)/timesheet-entry.tsx`** — CORE editing shipped: per-day editable hour inputs (0–24, locked days skipped) + Save + Submit for Approval, reusing web's gridRowsToDrafts/upsertEntries/submitForApproval; editable only in draft/rejected. Extras (Copy Last Week / Auto-fill / Add Employee / Export) still desktop-only.

**Theme consistency fixes (07/16/2026):**
- [x] Review Registration dialog was light on dark mobile — was mounted without `MuiThemeProvider`; wrapped it (MUI theme flows through the Dialog portal via context). Verified every other mobile MUI dialog I added IS wrapped.
- [x] `(auth)/registration-form.tsx` — labels used `isWeb ? light : dark` (invisible on web light mode); flipped 5 color ternaries to `isDark`. Width was already responsive.

### Status 07/16/2026: mobile-responsiveness initiative essentially COMPLETE.
Only `registration-form.tsx` responsive polish remains (public sign-up form,
already usable). Reusable `MobileCardList` + `useBreakpoint` (1200px) power
the whole thing; every change gated so desktop ≥1200px is byte-for-byte
unchanged. All batches verified: no new tsc errors + `expo export` exit 0.

## Every page must pass "input reachability" on mobile
For each page below, after layout work, verify at 390px width that EVERY
input is visible and usable — **date pickers, time pickers**, dropdowns,
toggles, file upload, and submit/cancel buttons. A hidden/off-screen input
is a blocker (this was the `requests/new.tsx` symptom).

## Project gotchas (must respect)
- This layout code also runs on **native** → import MUI only via web-only `require()` (never top-level `import`).
- Project has **no `SafeAreaProvider`** → use `SafeAreaView`, **not** the `useSafeAreaInsets` hook (it throws without a provider).
- MUI is **lazy-loaded web-only** across screen files (see `dashboard.tsx` pattern).

---

## Phase 0 — Foundation (shell) ✅ DONE (07/16/2026)
- [x] Create `hooks/use-breakpoint.ts` (`MOBILE_BREAKPOINT = 1200`, `useBreakpoint()`)
- [x] Add `MobileTopBar` (hamburger + active title + notification bell) — mobile web only
- [x] Add `MobileBottomBar` (top 5 accessible primary tabs, tasks badge) — mobile web only
- [x] Add hamburger → MUI `Drawer` reusing `WebSidebar` (+ `onNavigate` prop to close on tap)
- [x] Lazy-`require` MUI `Drawer` web-only (native-safe)
- [x] `headerShown: isMobileWeb ? false : undefined` (desktop/native untouched)
- [x] Verify: typecheck clean + `expo export --platform web` (exit 0, 5025 modules)
- [ ] **User acceptance:** test on phone / device toolbar; confirm desktop ≥1200px unchanged

---

## Phase 1 — Reusable building blocks (do before per-page work)
- [ ] Build `components/ui/responsive-table.tsx` — renders `DataGrid` (≥1200px) or a stacked **card list** (<1200px) from the same `columns` + `rows`
  - [ ] Card renders label:value pairs; supports a "primary" field (title) + optional actions
  - [ ] Accepts `onRowClick` so cards and grid rows behave the same
- [ ] Add `fullScreen={isMobile}` to every MUI `<Dialog>` (sweep — ~15 dialogs)
- [ ] Confirm `+html.tsx` viewport meta + no horizontal body scroll (already OK — re-verify)

---

## Phase 2 — Tab screens (per page)
Each page: keep the current web layout at ≥1200px; stack/convert below 1200px.

- [x] **requests/new.tsx** (Request Time Off form) — gated web layout behind `!isMobile`; date + time pickers now reachable on mobile web (07/16/2026)
- [ ] **dashboard.tsx** — card grid `maxWidth:1400` → single column <1200px; task DataGrid → `ResponsiveTable`
- [ ] **admin.tsx** (the screenshot page) — `maxWidth:960` card grid → 1 col <1200px (mostly fixed by Phase 0)
- [ ] **requests.tsx** — DataGrid → `ResponsiveTable`
- [ ] **tasks.tsx** — DataGrid → `ResponsiveTable`; approve/reject dialogs `fullScreen`
- [ ] **team.tsx** — DataGrid → `ResponsiveTable`
- [ ] **timeclock.tsx** — clock card OK (`maxWidth:320`); history DataGrid → cards
- [ ] **timesheet-entry.tsx** — wide weekly grid: bound in horizontal-scroll container; dialogs `fullScreen`
- [ ] **calendar.tsx** — add mobile agenda/list fallback under the month grid
- [ ] **profile.tsx** — `maxWidth:1100` two-column → stack <1200px
- [ ] **timesheet-management.tsx** — `maxWidth:960` card grid → 1 col <1200px

## Phase 3 — Admin screens
- [ ] **admin/employees.tsx** — biggest DataGrid → `ResponsiveTable`; filters into a Drawer/collapsible
- [ ] **admin/document-expiry.tsx** — 3 DataGrids → card lists per tab
- [ ] **admin/hr-policies-documents.tsx** — 3 fixed panes (880px): collapse to single pane + Drawer for tree; details as full-screen route on mobile
- [ ] **admin/compensation.tsx** — DataGrid + dialogs
- [ ] **admin/balances.tsx** — DataGrid + dialog
- [ ] **admin/balance-ledger.tsx** — DataGrid
- [ ] **admin/leave-payouts.tsx** — DataGrid + fixed-width fields
- [ ] **admin/registrations.tsx** — DataGrid
- [ ] **admin/renewal-history.tsx** — DataGrid
- [ ] **admin/request-history.tsx** — DataGrid
- [ ] **admin/user-activity.tsx** — DataGrid
- [ ] **admin/access-control.tsx** — wide form → single column <1200px

## Phase 4 — Timesheet module screens
- [ ] **timesheet/projects.tsx** — DataGrid → `ResponsiveTable`
- [ ] **timesheet/suppliers.tsx** — DataGrid
- [ ] **timesheet/timesheets.tsx** — DataGrid (fixed 280/260 widths) → cards / bounded scroll
- [ ] **timesheet/timesheet-assignments.tsx** — DataGrid
- [ ] **timesheet/employee-project-breakdown.tsx** — DataGrid
- [ ] **timesheet/project-hours-requests.tsx** — DataGrid
- [ ] **timesheet/month-closures.tsx** — DataGrid

## Phase 5 — Auth / public screens
- [ ] **(auth)/sign-in.tsx** — fixed `width:520` → `width:'100%', maxWidth:520` + padding
- [ ] **(auth)/sign-up.tsx** — fixed `width:400/350` → responsive
- [ ] **(auth)/registration-form.tsx** — single-column below 1200px; wide fields fluid
- [ ] **(auth)/pending-approval / forgot-password / reset-password** — verify fluid widths

## Phase 6 — Final pass
- [ ] Sweep for any remaining `width: >=300` fixed pixels that overflow <1200px
- [ ] Verify no page scrolls horizontally at 390px (iPhone) and 768px (tablet)
- [ ] Confirm ≥1200px still identical to pre-project desktop (spot-check every phase's pages)
- [ ] `expo export --platform web` clean after each phase

---

## Verification checklist (run per phase)
- [ ] `npx tsc --noEmit` — no **new** errors in touched files
- [ ] `npx expo export --platform web` — exit 0
- [ ] Device toolbar (iPhone XR / 390px) — nav works, no horizontal scroll
- [ ] **Input reachability** — every date/time picker, dropdown, toggle, upload & button visible + usable at 390px
- [ ] Window ≥1200px — desktop layout unchanged

## Notes / log
- 07/16/2026 — Phase 0 shipped. Files: `hooks/use-breakpoint.ts` (new), `app/(app)/(tabs)/_layout.tsx` (responsive shell). Bundled clean.
