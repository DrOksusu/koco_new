import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporarily disable i18n middleware to fix redirect loop
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|.*\\.png$).*)',
};