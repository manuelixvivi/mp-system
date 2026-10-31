import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Read session token from httpOnly cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  // 2. Protected Routes (Dashboard & protected APIs)
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isProtectedApiRoute =
    pathname.startsWith('/api/members') ||
    pathname.startsWith('/api/groups') ||
    pathname.startsWith('/api/broadcast/manual') ||
    pathname.startsWith('/api/devotionals/audit') ||
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/api/users');

  // If user is trying to access protected route without valid session -> REDIRECT TO /login
  if (isDashboardRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedApiRoute && !user) {
    return NextResponse.json(
      { error: 'Akses ditolak: Sesi tidak valid atau belum login.' },
      { status: 401 }
    );
  }

  // 3. Superadmin-exclusive route enforcement in middleware
  if (pathname.startsWith('/dashboard/users') && user && user.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. If user is ALREADY logged in and visits /login -> REDIRECT TO /dashboard
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/api/members/:path*',
    '/api/groups/:path*',
    '/api/broadcast/manual/:path*',
    '/api/devotionals/audit/:path*',
    '/api/settings/:path*',
    '/api/users/:path*',
  ],
};
