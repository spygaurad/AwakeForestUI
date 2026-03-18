import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SessionSync } from '@/components/SessionSync';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return (
    <>
      <SessionSync />
      {children}
    </>
  );
}
