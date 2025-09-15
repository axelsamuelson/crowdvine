// Cloudflare Pages Functions - Supabase Helpers
// Server-side Supabase clients for Pages Functions only

import { createClient } from '@supabase/supabase-js'

export interface SupabaseClients {
  public: ReturnType<typeof createClient>
  admin: ReturnType<typeof createClient>
}

export function getSupabaseClients(env: any): SupabaseClients {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public credentials')
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key')
  }

  return {
    public: createClient(supabaseUrl, supabaseAnonKey),
    admin: createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
}

export function getSupabasePublic(env: any) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public credentials')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export function getSupabaseAdmin(env: any) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper to extract user from request headers/cookies
export function getUserFromRequest(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/cv-access=([^;]+)/)
  return match ? match[1] : null
}

// Helper to check if user has admin access
export async function checkAdminAccess(env: any, userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin(env)
    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return data.is_admin === true
  } catch (error) {
    console.error('Error checking admin access:', error)
    return false
  }
}
