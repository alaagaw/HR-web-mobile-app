# Auto-Refresh Strategy: React Query vs Enhanced useAutoRefresh Hook

## The Problem

- Admin pages don't auto-refresh — document-expiry, registrations, request-history, renewal-history, balance-ledger had no polling
- Redundant fetches on page switch — every focus triggers an immediate fetch even if data was fetched 2 seconds ago
- No staleness protection — rapid tab switching causes a burst of API calls
- Inconsistent intervals — some pages had 60s intervals, some had nothing
- No standardized mutation-refresh pattern

---

## Option A: React Query / SWR

| Aspect | Detail |
|--------|--------|
| **Request deduplication** | If 3 components call the same query, only 1 network request fires |
| **Built-in cache** | Configurable `staleTime`, `gcTime` |
| **Background refetch** | Retry logic, pagination, infinite scroll — all built-in |
| **Mutation invalidation** | `queryClient.invalidateQueries()` auto-refreshes related queries |
| **Bundle size** | ~13KB gzipped (React Query) |
| **Downside** | Requires rewriting every data-fetching hook and every component that calls them — big migration (8+ hooks, 12+ pages) |

## Option B: Enhanced useAutoRefresh Hook (Chosen)

| Aspect | Detail |
|--------|--------|
| **Staleness check** | Prevents redundant fetches on page switch (skips if data < 30s old) |
| **Polling** | 30s when active, stops when inactive or backgrounded |
| **Mutation refresh** | `invalidate()` return function for post-mutation refresh |
| **Dependencies** | Zero new dependencies, ~20 lines of change to the hook |
| **Downside** | No request deduplication (if dashboard and tasks both fetch approvals, that's 2 calls). No shared cache between pages |

---

## Performance Comparison

React Query is objectively better for apps with many components sharing the same data. But this app has a **page-based architecture** — each page fetches its own data independently, there's minimal data sharing between pages. The main waste is re-fetching on rapid tab switches, which the staleness check fixes.

## Decision: Enhanced Hook

The enhanced `useAutoRefresh` hook was chosen because:

1. **Solves the actual problems** — staleness check prevents redundant fetches, 30s polling standardized across all pages, `invalidate()` handles post-mutation refresh
2. **Minimal effort** — 1 file change to the hook + adoption across pages vs rewriting the entire data layer
3. **Zero new dependencies** — no bundle size increase
4. **Non-blocking** — if React Query is ever needed, nothing prevents migrating later. The `useAutoRefresh` pattern is easy to replace

---

## Implementation

### Enhanced Hook API

```typescript
const { invalidate } = useAutoRefresh(() => {
  fetchData();
}, [dep1, dep2]);

// After a mutation:
await updateSomething();
invalidate(); // Clears staleness, forces immediate refetch
```

### How It Works

1. **On screen focus**: checks if data is stale (last fetch > 30s ago). If fresh, skips the fetch and just restarts the polling timer
2. **On app foreground return**: same staleness check
3. **Every 30s**: fetches if screen is focused and app is active
4. **`invalidate()`**: resets the staleness timestamp to 0 and triggers an immediate fetch — use after any mutation

### Pages Using useAutoRefresh

| Page | Previous Pattern | Mutations Use `invalidate()` |
|------|-----------------|------------------------------|
| Dashboard | useAutoRefresh (no staleness) | - |
| Tasks | useAutoRefresh (no staleness) | - |
| Requests | useAutoRefresh (no staleness) | - |
| Request Detail | useAutoRefresh (no staleness) | - |
| Team | useFocusEffect only | - |
| Calendar | useFocusEffect only | - |
| Document Expiry | useFocusEffect only | Yes (assign, unassign, import) |
| Balances | useFocusEffect + 60s interval | Yes (balance adjust) |
| Employees | useFocusEffect + 60s interval | Yes (edit, invite) |
| Registrations | useFocusEffect only | Yes (approve, reject) |
| Request History | useFocusEffect only | - |
| Renewal History | useFocusEffect only | - |
| Balance Ledger | useFocusEffect only | - |

All 13 pages now auto-refresh every 30s with staleness protection.
