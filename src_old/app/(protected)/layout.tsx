import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClientShell from './ClientShell';

const AUTH_COOKIE = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'access_token';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  
  if (!cookieStore.has(AUTH_COOKIE)) {
    redirect('/login');
  }
  
  return <ClientShell>{children}</ClientShell>;
}