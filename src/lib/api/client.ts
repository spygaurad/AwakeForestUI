import ky, { type Options } from 'ky';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8011/api/v1';

/**
 * Client-side ky instance.
 * Automatically injects the Clerk session JWT as a Bearer token.
 * Use this in client components and feature hooks.
 */
export const apiClient = ky.create({
  prefixUrl: API_BASE,
  timeout: 30_000,
  hooks: {
    beforeRequest: [
      async (request) => {
        // Clerk exposes the active session on window.Clerk
        const token = await (window as any).Clerk?.session?.getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (!response.ok) {
          // Let ky throw its HTTPError; callers can catch and read response.json()
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
