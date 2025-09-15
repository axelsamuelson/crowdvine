// Cloudflare Pages Function - Authentication Logout
// Handle user logout and clear access cookie

import { success, error, internalError, corsHeaders } from '../_lib/response'
import { getSupabasePublic } from '../_lib/supabase'

export async function onRequestPost(ctx: any) {
  const { request, env } = ctx
  
  try {
    const supabase = getSupabasePublic(env)

    // Sign out from Supabase
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      console.error('Sign out error:', signOutError)
      // Continue anyway to clear the access cookie
    }

    // Create response
    const response = success(null, 'Logout successful')

    // Clear access cookie
    response.headers.set('Set-Cookie', 'cv-access=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Logout error:', err)
    return internalError('Logout failed')
  }
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}