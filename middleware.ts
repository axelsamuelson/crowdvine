import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase } = createClient(request);

  // Public routes that don't require access control
  const publicRoutes = [
    '/access-request',
    '/api/access-request',
    '/api/invitation-codes',
    '/log-in',
    '/signup',
    '/auth',
    '/_next',
    '/favicon.ico',
    '/api/auth'
  ];

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Allow public routes to pass through
  if (isPublicRoute) {
    return NextResponse.next();
  }

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // User not authenticated, redirect to access request page
      return NextResponse.redirect(new URL('/access-request', request.url));
    }

    // Check if user has access to the platform
    const { data: userAccess, error: accessError } = await supabase
      .from('user_access')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (accessError || !userAccess) {
      // User doesn't have access, redirect to access request page
      return NextResponse.redirect(new URL('/access-request', request.url));
    }

    // User has access, allow request to proceed
    return NextResponse.next();

  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to access request page
    return NextResponse.redirect(new URL('/access-request', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - access-request (access request page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|access-request).*)',
  ],
};
