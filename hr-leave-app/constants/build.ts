// ============================================================
// Build marker
//
// A browser tab NEVER re-downloads the JS bundle on a tab switch or
// while idle — only a full page load does. So a long-open tab can be
// running stale code (e.g. before a session-resilience fix) while the
// server already has the new build. That made "is the fix actually
// running?" unanswerable.
//
// `BUILD_ID` is logged at boot and exposed on `window.__HR_BUILD__`
// (web) so anyone — dev or support — can open the console and confirm
// exactly which bundle a complaining user's tab is executing.
//
// Set EXPO_PUBLIC_BUILD_ID in the host (Vercel) env to wire this to
// the real commit/deploy automatically; otherwise bump the fallback
// string below on each deploy.
// ============================================================

export const BUILD_ID: string =
  process.env.EXPO_PUBLIC_BUILD_ID || '2026-05-19-session-resilience';
