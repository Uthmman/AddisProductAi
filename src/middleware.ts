import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Authentication check removed as requested.
  // All users can now access the dashboard and tools directly.
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all paths except static assets
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'],
};
