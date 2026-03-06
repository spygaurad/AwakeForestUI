# Clerk ↔ Backend Integration Guide

This document explains how Clerk auth events flow into the FastAPI backend, how to handle org invitations with metadata, and exactly what backend endpoints to implement.

---

## Architecture

```
Clerk (cloud)
    │
    │  Webhook (HTTPS POST)
    ▼
Next.js API Route                     ← runs in same network / VPC as backend
  /api/webhooks/clerk
    │  Verifies Svix signature
    │  Filters to relevant events
    │  Forwards with internal key
    ▼
FastAPI Backend (behind firewall)
  POST /api/v1/webhooks/clerk         ← internal, not public
  POST /api/v1/auth/sync              ← called per-session for lazy upsert
```

**Why forward through Next.js?**
Clerk can only POST to a public HTTPS URL. Your backend is behind a firewall. Next.js is already public-facing, sits in the same private network as FastAPI, and can relay events with an internal service key the firewall trusts.

**Two-track sync strategy:**
1. **Webhooks** — async, best-effort. Handles bulk events (user created, org created, membership changes).
2. **Session sync** (`POST /api/v1/auth/sync`) — called on every login. Acts as a safety net for missed webhooks (invited users who accepted before webhooks were wired up, webhook failures, etc.).

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```bash
CLERK_WEBHOOK_SECRET=whsec_...        # from Clerk Dashboard → Webhooks → endpoint secret
CLERK_SECRET_KEY=sk_test_...          # from Clerk Dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

INTERNAL_API_KEY=your-random-256bit-secret   # shared secret between Next.js and FastAPI
NEXT_PUBLIC_API_URL=http://localhost:8011/api/v1
```

### Backend (`backend/.env`)

```bash
CLERK_SECRET_KEY=sk_test_...          # same key — used to verify JWTs server-side
CLERK_PUBLISHABLE_KEY=pk_test_...     # used to fetch Clerk JWKS for JWT verification
INTERNAL_API_KEY=your-random-256bit-secret   # must match frontend value exactly
```

Generate a strong `INTERNAL_API_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Clerk Dashboard Setup

### 1. Create a Webhook Endpoint

1. Go to **Clerk Dashboard → Webhooks → Add Endpoint**
2. URL: `https://your-domain.com/api/webhooks/clerk`
   - For local dev: use [ngrok](https://ngrok.com) or [localtunnel](https://localtunnel.me) to expose localhost
   - `ngrok http 3000` → use the HTTPS URL it gives you
3. Copy the **Signing Secret** → set as `CLERK_WEBHOOK_SECRET` in `.env.local`

### 2. Subscribe to These Events

Check all of the following in the webhook endpoint settings:

| Event | Why |
|---|---|
| `user.created` | Create user record in backend |
| `user.updated` | Sync name/email changes |
| `user.deleted` | Soft-delete or anonymize user |
| `organization.created` | Create org record |
| `organization.updated` | Sync org name |
| `organization.deleted` | Archive org |
| `organizationMembership.created` | User joined org — create membership |
| `organizationMembership.updated` | Role changed |
| `organizationMembership.deleted` | User removed from org |
| `organizationInvitation.created` | (Optional) Log invitation |
| `organizationInvitation.accepted` | Capture invitation metadata before membership fires |
| `organizationInvitation.revoked` | Cancel pending invitation |

### 3. Clerk JWT Configuration (for backend verification)

In **Clerk Dashboard → JWT Templates** (or use the default session token):
- The default Clerk session token includes `sub` (user ID), `org_id`, `org_role`, `org_permissions`
- No custom template needed unless you want extra claims

---

## Invitation Metadata Pattern

When an admin invites a user, store any app-specific data (project access, custom role) in `public_metadata` on the invitation. Clerk carries this through the acceptance flow.

### Sending an Invitation (from your API or admin UI)

Call the Clerk Backend API — **do this from your FastAPI backend** (never expose `CLERK_SECRET_KEY` in the browser):

```python
# backend: POST /api/v1/projects/{project_id}/invitations
import httpx

async def invite_user_to_org(
    clerk_org_id: str,
    email: str,
    clerk_role: str,           # "org:admin" or "org:member"
    app_metadata: dict,        # your custom data
):
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://api.clerk.com/v1/organizations/{clerk_org_id}/invitations",
            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            json={
                "email_address": email,
                "role": clerk_role,
                "public_metadata": app_metadata,
                # e.g. {
                #   "app_role": "admin",
                #   "project_ids": ["proj_abc", "proj_xyz"],
                #   "invited_by_user_id": "user_123",
                # }
            },
        )
        res.raise_for_status()
        return res.json()
```

### What the Webhook Delivers

When the invited user accepts and Clerk fires `organizationInvitation.accepted`:

```json
{
  "type": "organizationInvitation.accepted",
  "data": {
    "id": "orginv_...",
    "organization_id": "org_...",
    "email_address": "user@example.com",
    "role": "org:member",
    "public_metadata": {
      "app_role": "admin",
      "project_ids": ["proj_abc"],
      "invited_by_user_id": "user_123"
    },
    "status": "accepted"
  }
}
```

Shortly after, `organizationMembership.created` fires:

```json
{
  "type": "organizationMembership.created",
  "data": {
    "id": "orgmem_...",
    "organization": { "id": "org_...", "name": "Acme Corp" },
    "public_user_data": {
      "user_id": "user_...",
      "first_name": "Jane",
      "last_name": "Doe",
      "identifier": "jane@example.com"
    },
    "role": "org:member",
    "created_at": 1234567890
  }
}
```

**Processing order:** Store invitation metadata from `organizationInvitation.accepted`, then apply it when `organizationMembership.created` arrives for the same org + user combination.

---

## FastAPI Backend Endpoints to Implement

### 1. `POST /api/v1/webhooks/clerk`

Receives forwarded events from the Next.js relay. Secured by `X-Internal-Key` header (not a user JWT).

```python
# routers/webhooks.py
from fastapi import APIRouter, Header, HTTPException, Request
import os

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]

@router.post("/clerk")
async def clerk_webhook(request: Request, x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = await request.json()
    event_type: str = payload["type"]
    data: dict = payload["data"]

    handler = EVENT_HANDLERS.get(event_type)
    if handler:
        await handler(data)

    return {"status": "ok"}


async def handle_user_created(data: dict):
    clerk_user_id = data["id"]
    email = next(
        (e["email_address"] for e in data.get("email_addresses", [])
         if e["id"] == data.get("primary_email_address_id")),
        None
    )
    name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
    # Upsert into your users table
    await db.users.upsert(clerk_user_id=clerk_user_id, email=email, name=name)


async def handle_org_created(data: dict):
    clerk_org_id = data["id"]
    name = data["name"]
    await db.organizations.upsert(clerk_org_id=clerk_org_id, name=name)


async def handle_membership_created(data: dict):
    clerk_user_id = data["public_user_data"]["user_id"]
    clerk_org_id = data["organization"]["id"]
    clerk_role = data["role"]  # "org:admin" or "org:member"

    user = await db.users.get_by_clerk_id(clerk_user_id)
    org = await db.organizations.get_by_clerk_id(clerk_org_id)
    if not user or not org:
        return  # user.created / org.created webhook should arrive first; or use sync endpoint

    # Check if we stored invitation metadata for this user+org
    invitation = await db.pending_invitations.get(
        clerk_org_id=clerk_org_id,
        email=data["public_user_data"]["identifier"]
    )

    app_role = invitation.app_role if invitation else _map_clerk_role(clerk_role)
    project_ids = invitation.project_ids if invitation else []

    await db.org_memberships.upsert(
        user_id=user.id,
        org_id=org.id,
        role=app_role,
    )
    if project_ids:
        await db.project_members.bulk_add(user_id=user.id, project_ids=project_ids)


async def handle_invitation_accepted(data: dict):
    # Store invitation metadata so handle_membership_created can use it
    await db.pending_invitations.upsert(
        clerk_org_id=data["organization_id"],
        email=data["email_address"],
        app_role=data["public_metadata"].get("app_role"),
        project_ids=data["public_metadata"].get("project_ids", []),
        invited_by=data["public_metadata"].get("invited_by_user_id"),
    )


async def handle_membership_deleted(data: dict):
    clerk_user_id = data["public_user_data"]["user_id"]
    clerk_org_id = data["organization"]["id"]
    await db.org_memberships.delete(clerk_user_id=clerk_user_id, clerk_org_id=clerk_org_id)


async def handle_user_updated(data: dict):
    clerk_user_id = data["id"]
    email = next(
        (e["email_address"] for e in data.get("email_addresses", [])
         if e["id"] == data.get("primary_email_address_id")),
        None
    )
    name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
    await db.users.update(clerk_user_id=clerk_user_id, email=email, name=name)


async def handle_user_deleted(data: dict):
    await db.users.soft_delete(clerk_user_id=data["id"])


def _map_clerk_role(clerk_role: str) -> str:
    return "admin" if clerk_role == "org:admin" else "member"


EVENT_HANDLERS = {
    "user.created": handle_user_created,
    "user.updated": handle_user_updated,
    "user.deleted": handle_user_deleted,
    "organization.created": handle_org_created,
    "organizationMembership.created": handle_membership_created,
    "organizationMembership.deleted": handle_membership_deleted,
    "organizationInvitation.accepted": handle_invitation_accepted,
}
```

---

### 2. `POST /api/v1/auth/sync`

Called by the frontend on every login. Verifies the user's Clerk JWT and upserts user + org membership. This is the safety net for everything webhooks can miss.

```python
# routers/auth.py
from fastapi import APIRouter, Depends
from app.dependencies import get_current_user   # your existing JWT verify dep

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/sync")
async def sync_session(
    body: dict,                      # { "org_id": "org_..." }
    clerk_user = Depends(get_current_user),   # JWT verified, extracts clerk_user_id, org_id, role
):
    """
    Upsert user and their active org membership.
    Called client-side on every login — idempotent.
    """
    # 1. Upsert user
    user = await db.users.upsert(
        clerk_user_id=clerk_user.id,
        email=clerk_user.email,
        name=clerk_user.name,
    )

    # 2. Upsert org if present in session
    if clerk_user.org_id:
        org = await db.organizations.upsert(clerk_org_id=clerk_user.org_id)

        # 3. Upsert membership
        await db.org_memberships.upsert(
            user_id=user.id,
            org_id=org.id,
            role=_map_clerk_role(clerk_user.org_role),
        )

    return {"status": "ok", "user_id": str(user.id)}
```

---

### 3. JWT Verification Dependency

Clerk JWTs are standard RS256 tokens. Verify them using the Clerk JWKS endpoint.

```python
# app/dependencies.py
import httpx
from jose import jwt, JWTError
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dataclasses import dataclass

CLERK_JWKS_URL = f"https://{os.environ['CLERK_FRONTEND_API']}/v1/.well-known/jwks.json"
# CLERK_FRONTEND_API = "distinct-gopher-77.clerk.accounts.dev"  (from your publishable key)

bearer = HTTPBearer()
_jwks_cache: dict | None = None

async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            res = await client.get(CLERK_JWKS_URL)
            _jwks_cache = res.json()
    return _jwks_cache


@dataclass
class ClerkUser:
    id: str          # clerk user id (sub)
    email: str
    name: str
    org_id: str | None
    org_role: str | None  # "org:admin" | "org:member"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer),
) -> ClerkUser:
    token = credentials.credentials
    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return ClerkUser(
            id=payload["sub"],
            email=payload.get("email", ""),
            name=payload.get("name", ""),
            org_id=payload.get("org_id"),
            org_role=payload.get("org_role"),
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
```

Install dependencies:
```bash
pip install python-jose[cryptography] httpx
```

---

## Database Tables Needed

```sql
-- pending_invitations: temporary store for invitation metadata
-- cleared after membership is created
CREATE TABLE pending_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_org_id TEXT NOT NULL,
    email TEXT NOT NULL,
    app_role TEXT,
    project_ids TEXT[] DEFAULT '{}',
    invited_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (clerk_org_id, email)
);
```

Your `users`, `organizations`, and `org_memberships` tables already exist — just make sure they have `clerk_user_id` and `clerk_org_id` columns for lookups.

---

## Local Development (Webhook Testing)

Since Clerk needs a public HTTPS URL, use ngrok:

```bash
# Terminal 1: run Next.js
npm run dev

# Terminal 2: expose Next.js to the internet
ngrok http 3000
# → gives you https://abc123.ngrok.io

# Add this to Clerk Dashboard → Webhooks:
# https://abc123.ngrok.io/api/webhooks/clerk
```

Update `CLERK_WEBHOOK_SECRET` in `.env.local` with the signing secret from the new endpoint.

**Test with Clerk CLI** (alternative to ngrok):
```bash
npm install -g @clerk/clerk-sdk-node
# Not directly supported — ngrok is the standard approach
```

**Simulate a webhook event manually:**
```bash
curl -X POST http://localhost:3000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test-id" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,invalid" \
  -d '{"type":"user.created","data":{"id":"user_test"}}'
# → Will fail signature check (expected) — use Clerk Dashboard "Send test event" instead
```

Use **Clerk Dashboard → Webhooks → your endpoint → Testing** to send real test events.

---

## Event Processing Order

Clerk does **not** guarantee event order. Handle each event idempotently:

```
Typical sign-up sequence:
  1. user.created
  2. organization.created           (if they create a new org)
  3. organizationMembership.created (creator auto-added as admin)

Typical invitation acceptance sequence:
  1. organizationInvitation.accepted  ← store metadata
  2. user.created                      ← may arrive before or after
  3. organizationMembership.created   ← apply stored metadata

Safe pattern: In handle_membership_created, if user/org don't exist yet,
enqueue a retry (Celery task) rather than silently dropping.
```

---

## Session Sync — Frontend Call

Call `/api/auth/sync` once per login from the dashboard layout:

```ts
// src/app/(app)/dashboard/page.tsx or layout
'use client';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function SessionSync() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/auth/sync', { method: 'POST' }).catch(console.error);
  }, [isLoaded, isSignedIn]);

  return null;
}
```

Add `<SessionSync />` inside `src/app/(app)/layout.tsx` (in a client boundary).

---

## Security Checklist

- [ ] `CLERK_WEBHOOK_SECRET` set in frontend `.env.local`
- [ ] `INTERNAL_API_KEY` set in both frontend and backend `.env` (same value)
- [ ] `INTERNAL_API_KEY` is at least 32 random bytes (use `secrets.token_hex(32)`)
- [ ] `/api/v1/webhooks/clerk` is **not** exposed on the public internet (firewall blocks it)
- [ ] `/api/webhooks/clerk` (Next.js) **does not** accept requests without a valid Svix signature
- [ ] Backend `/api/v1/auth/sync` requires a valid Clerk JWT (not the internal key)
- [ ] `pending_invitations` records are cleaned up after membership is created
- [ ] All webhook handlers are idempotent (safe to receive same event twice)
