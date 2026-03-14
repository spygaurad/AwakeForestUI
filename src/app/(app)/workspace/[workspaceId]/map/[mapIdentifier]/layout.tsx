import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function MapLayout({ children }: { children: ReactNode }) {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/select-org');

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {children}
    </div>
  );
}
