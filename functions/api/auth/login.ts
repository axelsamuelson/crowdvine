// Cloudflare Pages Function - Authentication Login
// Handle user login with Supabase Auth

export async function onRequestPost(context: any) {
  const { request, env } = context
  
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // For now, return a simple success response
    // TODO: Implement actual Supabase authentication
    const response = new Response(JSON.stringify({
      success: true,
      message: 'Login successful',
      user: { email }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'cv-access=1; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400'
      }
    })

    return response

  } catch (err) {
    console.error('Login error:', err)
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}