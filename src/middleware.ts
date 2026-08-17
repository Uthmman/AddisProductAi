import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('authenticated')?.value === 'true';
  const { pathname } = request.nextUrl;

  // Define paths that do not require authentication
  const isPublicPath = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/telegram') || 
    pathname.startsWith('/api/bot') || 
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/logs'); // Allow logs for debugging if needed

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if already authenticated and trying to access login
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all paths except static assets
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'],
};
