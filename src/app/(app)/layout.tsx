import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import Sidebar from '@/components/layout/Sidebar';
import { SessionSync } from '@/components/SessionSync';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/select-org');

  return (
    <div className="min-h-screen bg-background">
      <SessionSync />
      <TopNav />
      <Sidebar />
      <main className="relative z-30 pt-12 sm:pl-16 transition-[padding] duration-200 ease-out">
        <div className="container-compact py-4">{children}</div>
      </main>
    </div>
  );
}
