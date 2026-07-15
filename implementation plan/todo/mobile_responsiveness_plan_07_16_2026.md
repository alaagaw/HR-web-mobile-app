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
- [ ] Window ≥1200px — desktop layout unchanged

## Notes / log
- 07/16/2026 — Phase 0 shipped. Files: `hooks/use-breakpoint.ts` (new), `app/(app)/(tabs)/_layout.tsx` (responsive shell). Bundled clean.
