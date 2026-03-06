// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'access_token';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = req.cookies.has(AUTH_COOKIE);

  if ((pathname === '/login' || pathname === '/register') && hasToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register'],
};
