import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = [
  '/_next', '/favicon', '/images', '/public', '/auth',
  '/access-request', '/api/me/access', '/api/invite', '/api/auth', '/api/stripe/webhook',
  '/api/set-access-cookie', // Allow access cookie setting
  '/api/crowdvine', // Allow crowdvine API routes for products/collections
  '/api/user', // Allow user API routes for profile and reservations
  '/product', '/shop', '/profile', // Allow product, shop, and profile pages
  '/admin', '/admin-auth', '/api/admin' // Allow admin access and admin APIs
];

export async function onRequest(context: any) {
  const request = context.request;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Allow public routes
  if (PUBLIC.some((x) => pathname.startsWith(x))) {
    return NextResponse.next();
  }

  // Check access cookie
  const pass = request.cookies.get('cv-access')?.value === '1';
  
  if (!pass) {
    const redirectUrl = new URL('/access-request', url.origin);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  return NextResponse.next();
}
