import { createClient, processLock } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// SSR-safe storage adapter: no-op on server, AsyncStorage on client
const storage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

// ── Single-flight forced token refresh ───────────────────────────────
// When the tab has been idle/backgrounded the access token may have
// expired (or been killed by a refresh-rotation race). The 401-aware
// fetch below calls this to force ONE shared refresh — if a screen
// fires 8 parallel requests that all 401, they trigger a single
// refresh and all replay, instead of a refresh stampede.
let refreshInFlight: Promise<boolean> | null = null;
function forceRefreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        return !error && !!data.session;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

// ── 401-aware fetch ──────────────────────────────────────────────────
// The cure for "idle a while → click/upload/edit → it just fails until
// a hard browser refresh". PostgREST/Storage/Functions return 401 only
// for a missing/expired/invalid JWT (RLS denials are 403), so a 401
// here means the in-memory token died while we weren't looking. We
// refresh once and replay the original request with the fresh bearer —
// transparently, for every read, write, upload and screen, with no
// per-call-site changes.
//
// Auth endpoints (/auth/v1/*) are deliberately NOT retried: a 401 from
// the refresh-token call itself is terminal, and retrying it here would
// recurse. supabase-js passes string URLs + an init object (never a
// body-bearing Request), so replaying with the same init is safe.
const authAwareFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  const reqUrl =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);
  if (reqUrl.includes('/auth/v1/')) return res;

  const refreshed = await forceRefreshOnce();
  if (!refreshed) return res; // genuinely unrecoverable — let the caller surface it

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return res;

  const headers = new Headers(
    (init && init.headers) || (input instanceof Request ? input.headers : undefined)
  );
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(input, { ...init, headers });
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Real in-process mutex (NOT navigator Web Locks, so the old
    // "signal is aborted without reason" bug stays fixed). Serializes
    // concurrent token refreshes — without this, the auto-refresh
    // ticker + ensureFreshSession + the auth listener race on a
    // rotating refresh token and GoTrue kills the whole session
    // ("Invalid Refresh Token: Already Used"), which only a hard
    // page reload could recover.
    lock: processLock,
  },
  global: { fetch: authAwareFetch },
});
