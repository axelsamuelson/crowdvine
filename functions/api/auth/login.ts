// Cloudflare Pages Function - Authentication Login
// Handle user login with Supabase Auth

import { success, error, badRequest, internalError, corsHeaders } from '../_lib/response'
import { getSupabasePublic } from '../_lib/supabase'

export async function onRequestPost(ctx: any) {
  const { request, env } = ctx
  
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return badRequest('Email and password are required')
    }

    const supabase = getSupabasePublic(env)

    // Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Authentication error:', authError)
      return error('Invalid credentials', 401)
    }

    if (!data.user) {
      return error('Authentication failed', 401)
    }

    // Create response with access cookie
    const response = success({
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      },
      session: data.session
    }, 'Login successful')

    // Set access cookie
    response.headers.set('Set-Cookie', 'cv-access=1; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400')

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Login error:', err)
    return internalError('Login failed')
  }
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}