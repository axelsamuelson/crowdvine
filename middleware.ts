import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = [
  '/_next', '/favicon', '/images', '/public', '/auth',
  '/access-request', '/api/access-request', '/api/me/access', '/api/invite', '/api/auth', '/api/stripe/webhook',
  '/api/set-access-cookie', // Allow access cookie setting
  '/api/crowdvine', // Allow crowdvine API routes for products/collections
  '/api/user', // Allow user API routes for profile and reservations
  '/api/debug', // Allow debug API routes
  '/api/validate-access-token', '/api/use-access-token', '/api/grant-access', '/api/delete-access-request-on-signup', // Allow signup process APIs
  '/api/generate-signup-url', // Allow signup URL generation (used internally)
  '/product', '/shop', '/profile', '/signup', // Allow product, shop, profile, and signup pages
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
