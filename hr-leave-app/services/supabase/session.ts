import { supabase } from './client';

/**
 * Ensure the Supabase session has a usable (non-expired) access token.
 *
 * This is the cure for "idle ~30 min → navigate → blank page → must
 * hard refresh": the access token (JWT) had expired in memory, every
 * query 401'd, and the failures were swallowed. Calling this before a
 * fetch silently refreshes the token first.
 *
 * Single-flight: concurrent callers (the focus handler, the 30s poll,
 * onAuthStateChange) share ONE in-flight refresh instead of each firing
 * their own. This restores the serialization the no-op `lock` in
 * client.ts removed — WITHOUT touching the lock config, so the old
 * "signal is aborted without reason" Web Locks bug stays fixed.
 *
 * Returns true if a usable session exists afterwards; false only when
 * the session is genuinely unrecoverable. A false here does NOT itself
 * sign the user out — callers just skip their fetch, and supabase-js's
 * own SIGNED_OUT path drives any teardown/redirect exactly as before.
 */
let inFlight: Promise<boolean> | null = null;

// Refresh proactively if the token expires within this window, so a
// fetch fired right at the boundary doesn't race the expiry.
const EXPIRY_SKEW_MS = 60_000;

export function ensureFreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return false;

      const expiresAtMs = (session.expires_at ?? 0) * 1000;
      if (expiresAtMs - Date.now() > EXPIRY_SKEW_MS) return true; // still good

      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) return true;

      // Our refresh may have lost a race — supabase-js's own auto-refresh
      // ticker can rotate the token first (no lock to serialize them).
      // Re-check before declaring the session dead.
      const {
        data: { session: recheck },
      } = await supabase.auth.getSession();
      return !!recheck && (recheck.expires_at ?? 0) * 1000 - Date.now() > 0;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export type RecoveryOutcome = 'signed_out' | 'transient';

/**
 * Last-resort recovery when `ensureFreshSession()` came back false.
 *
 * The old behaviour was a silent `return` — the screen just stayed
 * blank until the user hard-refreshed. Instead:
 *
 *  - No session at all (refresh token dead / already signed out) →
 *    force `signOut()`. supabase-js emits SIGNED_OUT → the auth
 *    listener pushes user=null → AuthGuard redirects to sign-in. The
 *    user sees the login screen, not a frozen empty page.
 *
 *  - A (stale) session object still exists → almost always a transient
 *    network failure during refresh, NOT a dead session. Signing the
 *    user out here would be a wrongful logout on a Wi-Fi blip, so we
 *    do NOT; the caller surfaces a retry and the 30s poll keeps trying.
 *
 * Returns which path was taken so callers can show the right feedback.
 */
export async function recoverOrSignOut(): Promise<RecoveryOutcome> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* best-effort — the SIGNED_OUT/redirect still happens on next tick */
      }
      return 'signed_out';
    }
    return 'transient';
  } catch {
    return 'transient';
  }
}
