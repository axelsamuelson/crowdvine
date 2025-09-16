// Cloudflare Pages Function - Middleware
// Access control middleware for all requests

export async function onRequest(ctx: any) {
  const { request, next } = ctx
  
  const url = new URL(request.url)
  const cookie = request.headers.get('Cookie') || ''
  const hasAccess = cookie.includes('cv-access=1')

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }

  // Public paths that don't require authentication
  const publicPaths = [
    '/access-request',
    '/favicon.ico',
    '/_worker.js',
    '/_next', // Allow Next.js static files
    '/api/health',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/stripe/webhook',
    '/api/exchange-rates',
    '/api/invite/redeem',
    '/api/invitation-codes/validate',
    '/api/access-request'
  ]

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => {
    if (path.includes('[') && path.includes(']')) {
      // Handle dynamic routes like /api/user/reservations/[id]
      const pattern = path.replace(/\[.*?\]/g, '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(url.pathname)
    }
    return url.pathname.startsWith(path)
  })

  // Allow public paths to pass through
  if (isPublicPath) {
    const response = await next()
    
    // Add CORS headers to the response
    if (response) {
      const newHeaders = new Headers(response.headers)
      newHeaders.set('Access-Control-Allow-Origin', '*')
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      newHeaders.set('Access-Control-Allow-Credentials', 'true')
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
    }
    
    return response
  }

  // Check authentication for protected paths
  if (!hasAccess) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/access-request',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }

  // User has access, continue to the next function
  const response = await next()
  
  // Add CORS headers to the response
  if (response) {
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    newHeaders.set('Access-Control-Allow-Credentials', 'true')
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
  }
  
  return response
}