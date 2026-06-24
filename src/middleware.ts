import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has('authenticated');

  // Define public paths that DON'T need authentication
  const isPublicPath = 
    pathname === '/login' || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/api/bot') || 
    pathname.startsWith('/telegram') || 
    pathname.startsWith('/_next') || 
    pathname === '/favicon.ico';

  // If the user is NOT authenticated and trying to access a restricted path
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If the user IS authenticated and trying to go to login page, send to dashboard
  if (isAuthenticated && pathname === '/login') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all paths except static assets
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'],
};
