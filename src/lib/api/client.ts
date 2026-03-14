import ky, { type Options } from 'ky';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/**
 * Token getter registered by the React layer (SessionSync or any auth-aware component).
 * Falls back to window.Clerk.session.getToken() as a last resort.
 */
let _tokenGetter: (() => Promise<string | null>) | null = null;

export function registerTokenGetter(fn: () => Promise<string | null>) {
  _tokenGetter = fn;
}

async function getAuthToken(): Promise<string | null> {
  if (_tokenGetter) {
    return _tokenGetter();
  }
  // Fallback: try window.Clerk directly
  try {
    const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Client-side ky instance.
 * Automatically injects the Clerk session JWT as a Bearer token.
 * Register a token getter via registerTokenGetter() for reliable auth.
 */
export const apiClient = ky.create({
  prefixUrl: API_BASE,
  timeout: 30_000,
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
