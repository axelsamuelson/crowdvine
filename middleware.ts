import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = [
  '/_next', '/favicon', '/images', '/public', '/auth',
  '/access-request', '/api/me/access', '/api/invite', '/api/auth', '/api/stripe/webhook',
  '/api/set-access-cookie', // Allow access cookie setting
  '/admin', '/admin-auth', '/api/admin' // Allow admin access and admin APIs
];

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  
  // Allow public routes
  if (PUBLIC.some((x) => p.startsWith(x))) {
    return NextResponse.next();
  }

  // Check access cookie
  const pass = req.cookies.get('cv-access')?.value === '1';
  
  if (!pass) {
    const url = req.nextUrl.clone();
    url.pathname = '/access-request';
    url.searchParams.set('next', p);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = { 
  matcher: ['/((?!api/stripe/webhook).*)'] 
};
