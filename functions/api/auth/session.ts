// Cloudflare Pages Function - Authentication Session
// Check user session status

export async function onRequestGet(context: any) {
  const { request } = context
  
  // Check for access cookie
  const cookie = request.headers.get('Cookie') || ''
  const hasAccess = cookie.includes('cv-access=1')
  
  if (!hasAccess) {
    return new Response(JSON.stringify({
      success: false,
      error: 'No active session'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({
    success: true,
    user: { id: 'user-123', email: 'user@example.com' },
    expires_at: new Date(Date.now() + 86400000).toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}