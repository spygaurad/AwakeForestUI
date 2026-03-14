'use client';

import { useEffect } from 'react';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { registerTokenGetter } from '@/lib/api/client';

/**
 * Mounted inside the (app) layout on every authenticated page.
 *
 * Does two things:
 *
 * 1. Ensures an org session is active in the Clerk JWT.
 *    Without an explicit `setActive` call, Clerk issues a JWT with no `org_id`
 *    and no `org_role`. The backend reads these exclusively from the JWT — there
 *    is no `?org_id=` param fallback. Missing org claims cause:
 *      - GET endpoints  → 400 "No active organization in JWT"
 *      - POST endpoints → 403 "Insufficient permissions" (org_role defaults to
 *                         "org:viewer" rank 0, failing the org:member check)
 *
 *    This effect auto-activates the first available org membership when the JWT
 *    has no org claims. This covers:
 *      - Returning users who navigate directly without going through /select-org
 *      - Edge cases where the session cookie has an org but the in-memory JWT
 *        was issued before setActive was called in this browser session
 *
 * 2. Calls POST /api/auth/sync to upsert the user + org in the backend DB.
 *    Only fires once an org session is confirmed active (orgId present in JWT).
 */
export function SessionSync() {
  const { isLoaded, isSignedIn, orgId, getToken } = useAuth();
  const {
    isLoaded: listLoaded,
    userMemberships,
    setActive,
  } = useOrganizationList({ userMemberships: { infinite: false } });

  // Register Clerk's getToken so apiClient always gets a fresh org-scoped JWT
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      registerTokenGetter(getToken);
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Effect 1 — ensure org session is active in the JWT
  useEffect(() => {
    if (!isLoaded || !listLoaded || !isSignedIn) return;
    if (orgId) return; // JWT already carries org_id — nothing to do

    const memberships = userMemberships?.data ?? [];
    if (memberships.length === 0 || !setActive) return;

    // Calling setActive causes Clerk to issue a new JWT with org_id + org_role.
    // All subsequent apiClient calls will carry correct org claims.
    setActive({ organization: memberships[0].organization.id });
  }, [isLoaded, listLoaded, isSignedIn, orgId, userMemberships, setActive]);

  // Effect 2 — sync user/org to the backend once org session is confirmed
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !orgId) return;
    fetch('/api/auth/sync', { method: 'POST' }).catch(console.error);
  }, [isLoaded, isSignedIn, orgId]);

  return null;
}
