import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE } from './src/session-cookie';

/**
 * Gate the whole panel behind a session cookie.
 *
 * Without this, an unauthenticated visit renders a page that immediately 401s
 * against the API and falls through to the error boundary — technically safe
 * (the API is the real authority) but it looks like a broken deployment rather
 * than "you are signed out".
 *
 * This checks only for the cookie's *presence*. Validity is the API's call:
 * the JWT signature is verified there on every request, and an expired token
 * sends the user back here via the 401 handling in src/api.ts.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except /login itself, Next's own assets, and the favicon —
  // matching /login would be an infinite redirect.
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
