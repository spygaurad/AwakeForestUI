import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * /workspace — Entry point after login/signup.
 *
 * Resolution order:
 *   1. Active org in the Clerk session → /workspace/[orgId]
 *   2. No active org → look up the user's first org membership via Clerk admin API
 *      → /workspace/[firstOrgId]
 *   3. No org memberships → /select-org (create or join one first)
 */
export default async function WorkspaceIndexPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/sign-in');

  // Happy path: Clerk already has an active org in the session
  if (orgId) redirect(`/workspace/${orgId}`);

  // No active org — resolve from Clerk membership list
  const clerk = await clerkClient();
  const { data: memberships } = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 1,
  });

  if (memberships.length > 0) {
    redirect(`/workspace/${memberships[0].organization.id}`);
  }

  // User has no org memberships — prompt to create or join one
  redirect('/select-org');
}
