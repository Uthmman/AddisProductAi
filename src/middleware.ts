import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Login is disabled for now. Allow all requests to proceed.
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all paths except static assets
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'],
};
