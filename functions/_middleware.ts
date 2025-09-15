// Cloudflare Pages Function - Middleware
// Replaces Next.js middleware.ts for access control

export async function onRequest(ctx: EventContext) {
  const { request, next } = ctx;
  const cookie = request.headers.get('Cookie') || '';
  const hasAccess = cookie.includes('cv-access=1');
  const url = new URL(request.url);

  // Allow public routes to pass through
  const publicPaths = [
    '/access-request',
    '/favicon.ico',
    '/_worker.js',
    '/api/health',
    '/api/auth/login',
    '/api/auth/callback',
    '/api/stripe/webhook',
    '/api/crowdvine',
    '/product',
    '/shop',
    '/boxes',
    '/about',
    '/contact'
  ];

  // Check if path starts with any public path
  if (publicPaths.some(p => url.pathname.startsWith(p))) {
    return next();
  }

  // Protect all other content
  if (!hasAccess) {
    return Response.redirect('/access-request', 302);
  }

  return next();
}
