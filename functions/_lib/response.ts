// Cloudflare Pages Functions - Response Helpers
// Standardized response helpers for consistent API responses

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function json<T>(data: T, status: number = 200, headers: Record<string, string> = {}): Response {
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...headers
  })

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders
  })
}

export function success<T>(data: T, message?: string, status: number = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  }

  return json(response, status)
}

export function error(message: string, status: number = 400, data?: any): Response {
  const response: ApiResponse = {
    success: false,
    error: message,
    data
  }

  return json(response, status)
}

export function badRequest(message: string = 'Bad Request'): Response {
  return error(message, 400)
}

export function unauthorized(message: string = 'Unauthorized'): Response {
  return error(message, 401)
}

export function forbidden(message: string = 'Forbidden'): Response {
  return error(message, 403)
}

export function notFound(message: string = 'Not Found'): Response {
  return error(message, 404)
}

export function internalError(message: string = 'Internal Server Error'): Response {
  return error(message, 500)
}

export function cache(seconds: number): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${seconds}, s-maxage=${seconds}`
  }
}

export function noCache(): Record<string, string> {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}

export function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    'https://dirtywine.se',
    'https://www.dirtywine.se',
    'http://localhost:3000',
    'http://localhost:3001'
  ]

  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true'
  }
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(request.headers.get('Origin') || undefined)
    })
  }
  return null
}

// Additional helper functions for compatibility
export function jsonResponse(data: any, options: { status?: number; headers?: Headers } = {}) {
  const { status = 200, headers = new Headers() } = options;
  
  headers.set('Content-Type', 'application/json');
  
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}
