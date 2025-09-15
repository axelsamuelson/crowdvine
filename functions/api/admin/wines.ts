// Cloudflare Pages Function - Admin Wines
// Admin wine management

export async function onRequestGet(context: any) {
  const { request } = context
  
  try {
    // Check for access cookie
    const cookie = request.headers.get('Cookie') || ''
    const hasAccess = cookie.includes('cv-access=1')
    
    if (!hasAccess) {
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // For now, return mock wines
    // TODO: Implement actual Supabase query
    const mockWines = [
      {
        id: 'wine-1',
        wine_name: 'Sample Wine 1',
        vintage: '2020',
        grape_varieties: ['Merlot'],
        color: 'red',
        base_price_cents: 125000,
        producer: { name: 'Sample Producer' }
      }
    ]

    return new Response(JSON.stringify(mockWines), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Wines error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch wines'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function onRequestPost(context: any) {
  const { request } = context
  
  try {
    // Check for access cookie
    const cookie = request.headers.get('Cookie') || ''
    const hasAccess = cookie.includes('cv-access=1')
    
    if (!hasAccess) {
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await request.json()
    
    // For now, return mock created wine
    // TODO: Implement actual Supabase insert
    const mockWine = {
      id: 'wine-' + Date.now(),
      ...body,
      created_at: new Date().toISOString()
    }

    return new Response(JSON.stringify(mockWine), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Wine creation error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to create wine'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}