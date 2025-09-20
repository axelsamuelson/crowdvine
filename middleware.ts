import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createServerClient } from "@supabase/ssr";

const PUBLIC = [
  // Static assets and Next.js internals
  '/_next', '/favicon', '/images', '/public',
  
  // Authentication and access control pages
  '/access-request', '/log-in', '/signup',
  
  // Access control APIs
  '/api/access-request', '/api/me/access', '/api/auth', 
  '/api/validate-access-token', '/api/use-access-token', '/api/grant-access', 
  '/api/delete-access-request-on-signup', '/api/create-profile', '/api/create-user',
  '/api/generate-signup-url', '/api/set-access-cookie',
  
  // Invitation system
  '/api/invite',
  
  // External webhooks (Stripe)
  '/api/stripe/webhook',
  
  // Admin access
  '/admin', '/admin-auth', '/api/admin',
  
  // Debug/development APIs (remove in production)
  '/api/debug', '/api/test-simple', '/api/test-supabase', '/api/test-email'
];

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  
  // Allow public routes
  if (PUBLIC.some((x) => p.startsWith(x))) {
    return NextResponse.next();
  }

  // Check authentication status
  const supabase = getSupabaseAdmin();
  
  // Create a server-side Supabase client to check auth
  const cookieStore = req.cookies;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabaseClient = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {}, // No-op for middleware
      remove() {}, // No-op for middleware
    },
  });

  let isAuthenticated = false;
  
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    isAuthenticated = !!user && !error;
  } catch (error) {
    // If token validation fails, user is not authenticated
    isAuthenticated = false;
  }

  // Check access cookie
  const accessCookie = req.cookies.get('cv-access')?.value === '1';
  
  // User must be both authenticated AND have access cookie to proceed
  if (!isAuthenticated || !accessCookie) {
    // Not authenticated or no access, redirect to access request
    const url = req.nextUrl.clone();
    url.pathname = '/access-request';
    url.searchParams.set('next', p);
    return NextResponse.redirect(url);
  }
  
  // User is authenticated and has access, allow request
  return NextResponse.next();
}

export const config = { 
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
};
