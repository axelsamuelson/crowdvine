// Cloudflare Pages Function - Authentication Session
// Return current session status for client

import { success, error, unauthorized, corsHeaders, cache } from '../_lib/response'
import { getSupabasePublic, getUserFromRequest } from '../_lib/supabase'

export async function onRequestGet(ctx: any) {
  const { request, env } = ctx
  
  try {
    const userId = getUserFromRequest(request)
    
    if (!userId) {
      return unauthorized('No active session')
    }

    const supabase = getSupabasePublic(env)

    // Get user data from Supabase
    const { data: user, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return unauthorized('Invalid session')
    }

    // Check if user has admin access
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin, access_granted_at')
      .eq('id', user.user.id)
      .single()

    const response = success({
      user: {
        id: user.user.id,
        email: user.user.email,
        is_admin: userProfile?.is_admin || false,
        access_granted_at: userProfile?.access_granted_at
      },
      authenticated: true
    }, 'Session valid')

    // Add caching headers
    Object.entries(cache(60)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Session check error:', err)
    return error('Session check failed', 500)
  }
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}
