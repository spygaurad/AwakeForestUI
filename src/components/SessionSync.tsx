'use client';

import { useEffect, useRef } from 'react';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { registerTokenGetter } from '@/lib/api/client';

/**
 * Mounted inside the (app) layout on every authenticated page.
 *
 * 1. Registers Clerk's getToken with the API client.
 * 2. Calls POST /api/auth/sync to upsert the user + org in the backend DB.
 * 3. Renders <OrgAutoActivate> only when orgId is absent — that child component
 *    calls useOrganizationList, which triggers Clerk's membership polling. Once
 *    an org is activated (orgId present), the child unmounts and polling stops.
 *
 * Clerk v2 JWTs encode org info as "o": {"id": "org_xxx", "rol": "admin"}.
 * The SDK surfaces this as orgId/orgRole. When absent the backend returns:
 *   - GET  → 400 "No active organization in JWT"
 *   - POST → 403 (role defaults to rank 0, failing org:member check)
 */
export function SessionSync() {
  const { isLoaded, isSignedIn, orgId, getToken } = useAuth();

  // Keep a stable ref to getToken so that Clerk's 30–60 s token refreshes
  // (which produce a new function reference) don't re-trigger the effect
  // and bust the token cache unnecessarily.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Register Clerk's getToken so apiClient always gets a fresh org-scoped JWT.
  // Re-register only when orgId changes (org switch) — the ref indirection
  // means token refreshes are transparent; the cached wrapper always calls
  // the latest getToken without busting client.ts's 30 s token cache.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      registerTokenGetter(() => getTokenRef.current());
    }
  }, [isLoaded, isSignedIn, orgId]);

  // Sync user/org to the backend once org session is confirmed
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !orgId) return;
    fetch('/api/auth/sync', { method: 'POST' }).catch(console.error);
  }, [isLoaded, isSignedIn, orgId]);

  // Only mount the org-list poller when there's no active org in the JWT.
  // This avoids Clerk's useOrganizationList polling for the entire session.
  if (isLoaded && isSignedIn && !orgId) {
    return <OrgAutoActivate />;
  }

  return null;
}

/**
 * Calls useOrganizationList to auto-activate the first org membership.
 * Rendered only when orgId is absent — unmounts as soon as setActive succeeds
 * and Clerk reissues a JWT with org claims, stopping all membership polling.
 */
function OrgAutoActivate() {
  const { isLoaded: listLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: false },
  });

  useEffect(() => {
    if (!listLoaded || !setActive) return;
    const memberships = userMemberships?.data ?? [];
    if (memberships.length === 0) return;
    setActive({ organization: memberships[0].organization.id });
  }, [listLoaded, userMemberships, setActive]);

  return null;
}
