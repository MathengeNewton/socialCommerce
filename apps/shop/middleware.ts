import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths often probed by bots/scanners; return 404 without invoking the app
// to avoid "Failed to find Server Action" and viewport metadata noise.
const BLOCKED_PATHS = [
  '/wp-admin',
  '/wp-login',
  '/bin/login',
  '/backend',
  '/admin',
  '/login',
  '/manager',
  '/back-office',
  '/administrator',
  '/api/upload',
  '/apriso',
  '/v1/tools',
  '/Providers/',
  '/hosting/',
  '/customer/',
  '/get_csrf_token',
  '/administracja',
  '/amministra',
  '/webadmin',
  '/kontrollpanel',
  '/admin123',
  '/admin0',
  '/admin-dev',
  '/admin_',
  '/Backoffice',
  '/backoffice',
  '/adminshop',
  '/adm',
  '/admin-web',
  '/mikromanage',
  '/thirdparty-access',
  '/api/v2/hoverfly',
  '/services/',
  '/crx/',
  '/inspector/',
];

function isBlockedPath(pathname: string): boolean {
  const p = pathname.split('?')[0].toLowerCase();
  return BLOCKED_PATHS.some((blocked) => p === blocked || p.startsWith(blocked.toLowerCase() + '/'));
}

export function middleware(request: NextRequest) {
  if (isBlockedPath(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
