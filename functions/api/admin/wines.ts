// Cloudflare Pages Function - Admin Wines
// Admin wine management endpoints

import { success, error, badRequest, unauthorized, forbidden, internalError, corsHeaders, cache } from '../_lib/response'
import { getSupabaseAdmin, getUserFromRequest, checkAdminAccess } from '../_lib/supabase'

export async function onRequestGet(ctx: any) {
  const { request, env } = ctx
  
  try {
    const userId = getUserFromRequest(request)
    
    if (!userId) {
      return unauthorized('Authentication required')
    }

    // Check admin access
    const isAdmin = await checkAdminAccess(env, userId)
    if (!isAdmin) {
      return forbidden('Admin access required')
    }

    const supabase = getSupabaseAdmin(env)

    // Get wines with producer data
    const { data: wines, error: winesError } = await supabase
      .from('wines')
      .select(`
        id,
        handle,
        wine_name,
        vintage,
        grape_varieties,
        color,
        base_price_cents,
        cost_amount,
        exchange_rate,
        alcohol_tax_cents,
        sb_price,
        label_image_path,
        producer_id,
        producers(name)
      `)
      .order('wine_name', { ascending: true })

    if (winesError) {
      console.error('Error fetching wines:', winesError)
      return internalError('Failed to fetch wines')
    }

    const response = success(wines || [], 'Wines fetched successfully')

    // Add caching headers
    Object.entries(cache(300)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Wines fetch error:', err)
    return internalError('Failed to fetch wines')
  }
}

export async function onRequestPost(ctx: any) {
  const { request, env } = ctx
  
  try {
    const userId = getUserFromRequest(request)
    
    if (!userId) {
      return unauthorized('Authentication required')
    }

    // Check admin access
    const isAdmin = await checkAdminAccess(env, userId)
    if (!isAdmin) {
      return forbidden('Admin access required')
    }

    const body = await request.json()
    const { wine_name, vintage, grape_varieties, color, base_price_cents, producer_id } = body

    if (!wine_name || !vintage || !producer_id) {
      return badRequest('Wine name, vintage, and producer are required')
    }

    const supabase = getSupabaseAdmin(env)

    // Create wine
    const { data: wine, error: wineError } = await supabase
      .from('wines')
      .insert({
        wine_name,
        vintage,
        grape_varieties,
        color,
        base_price_cents,
        producer_id,
        handle: `${wine_name.toLowerCase().replace(/\s+/g, '-')}-${vintage}`
      })
      .select()
      .single()

    if (wineError) {
      console.error('Error creating wine:', wineError)
      return internalError('Failed to create wine')
    }

    const response = success(wine, 'Wine created successfully')

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Wine creation error:', err)
    return internalError('Failed to create wine')
  }
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}