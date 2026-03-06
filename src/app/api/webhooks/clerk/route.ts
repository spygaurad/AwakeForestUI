import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8011/api/v1';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

// Clerk events we care about — anything else is ignored
const HANDLED_EVENTS = new Set([
  'user.created',
  'user.updated',
  'user.deleted',
  'organization.created',
  'organization.updated',
  'organization.deleted',
  'organizationMembership.created',
  'organizationMembership.updated',
  'organizationMembership.deleted',
  'organizationInvitation.created',
  'organizationInvitation.accepted',
  'organizationInvitation.revoked',
]);

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // --- Verify Svix signature ---
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: { type: string; data: Record<string, unknown> };

  try {
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as typeof event;
  } catch (err) {
    console.error('[clerk-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // --- Ignore unhandled event types ---
  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ status: 'ignored' });
  }

  console.log(`[clerk-webhook] Received: ${event.type}`);

  // --- Forward to backend ---
  try {
    const backendRes = await fetch(`${BACKEND_URL}/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Internal service key — backend verifies this, not a user JWT
        ...(INTERNAL_API_KEY ? { 'X-Internal-Key': INTERNAL_API_KEY } : {}),
      },
      body: JSON.stringify({ type: event.type, data: event.data }),
    });

    if (!backendRes.ok) {
      const text = await backendRes.text().catch(() => '');
      console.error(`[clerk-webhook] Backend rejected (${backendRes.status}): ${text}`);
      // Return 200 to Clerk anyway — retrying won't help if backend has a logic error
      return NextResponse.json({ status: 'forwarded_with_error', backend_status: backendRes.status });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[clerk-webhook] Failed to reach backend:', err);
    // Return 500 so Clerk retries — backend may be temporarily down
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 500 });
  }
}
