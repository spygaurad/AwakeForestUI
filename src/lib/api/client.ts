import ky, { type Options } from 'ky';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * Token getter registered by the React layer (SessionSync or any auth-aware component).
 * Falls back to window.Clerk.session.getToken() as a last resort.
 */
let _tokenGetter: (() => Promise<string | null>) | null = null;

// ── Token deduplication cache ──────────────────────────────────────────────────
// Clerk JWTs live for 60 s. Caching the resolved token for 30 s means:
//   • All concurrent callers (e.g. 20–50 tile requests firing simultaneously)
//     share a single getToken() call instead of hammering Clerk's SDK.
//   • Polling queries (5 s interval) coalesce to ≤ 1 real token fetch per 30 s.
//   • Worst-case the cached token still has 30 s of life remaining — well within
//     the backend's 60 s verification window.
// The cache is busted immediately whenever registerTokenGetter is called (org
// switch, sign-out / re-auth) so stale org-scoped tokens are never reused.
let _tokenCache: { token: string; expiresAt: number } | null = null;
let _tokenInflight: Promise<string | null> | null = null;
const TOKEN_CACHE_MS = 30_000;

export function registerTokenGetter(fn: () => Promise<string | null>) {
  _tokenGetter = fn;
  // Bust cache so the next call gets a fresh org-scoped token.
  _tokenCache = null;
  _tokenInflight = null;
}

export async function getAuthToken(): Promise<string | null> {
  // Serve from cache if still fresh.
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  // Deduplicate concurrent callers: if a fetch is already in flight, reuse it.
  if (_tokenInflight) return _tokenInflight;

  _tokenInflight = (async (): Promise<string | null> => {
    let token: string | null = null;
    try {
      if (_tokenGetter) {
        token = await _tokenGetter();
      } else {
        // Fallback: try window.Clerk directly (before SessionSync has mounted).
        const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
        token = (await clerk?.session?.getToken()) ?? null;
      }
    } catch {
      token = null;
    }

    if (token) {
      _tokenCache = { token, expiresAt: Date.now() + TOKEN_CACHE_MS };
    }
    _tokenInflight = null;
    return token;
  })();

  return _tokenInflight;
}

/**
 * Bust the token cache and fetch a fresh Clerk JWT immediately.
 * Call this before authenticated requests that follow long-running
 * unauthenticated operations (e.g. multipart part uploads) where the
 * cached token may have expired.
 */
export async function refreshAuthToken(): Promise<string | null> {
  _tokenCache = null;
  _tokenInflight = null;
  return getAuthToken();
}

/**
 * Client-side ky instance.
 * Automatically injects the Clerk session JWT as a Bearer token.
 * Register a token getter via registerTokenGetter() for reliable auth.
 */
export const apiClient = ky.create({
  prefixUrl: API_BASE,
  timeout: 60_000, // 60 s — large dataset lists / tile registrations can be slow
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await getAuthToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
  },
});

/**
 * Server-side fetch helper for Route Handlers and Server Components.
 * Caller must supply the token (from `await auth().getToken()`).
 */
export function serverFetch(token: string, options?: Options) {
  return ky.create({
    prefixUrl: API_BASE,
    timeout: 30_000,
    headers: { Authorization: `Bearer ${token}` },
    ...options,
  });
}
