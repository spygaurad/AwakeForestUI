import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8011/api/v1';

/**
 * POST /api/auth/sync
 *
 * Called client-side on first load after sign-in (from the dashboard layout).
 * Forwards the user's Clerk JWT to the backend so it can upsert the user
 * and their org membership — catches any users/memberships that webhooks missed
 * (e.g. invited users who accepted before the webhook was live, or webhook failures).
 */
export async function POST() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const token = await getToken();

  try {
    const res = await fetch(`${BACKEND_URL}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[auth/sync] Backend error (${res.status}): ${text}`);
      return NextResponse.json({ error: 'Sync failed' }, { status: res.status });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[auth/sync] Backend unreachable:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 503 });
  }
}
