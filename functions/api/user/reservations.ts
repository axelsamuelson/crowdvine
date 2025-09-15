// Cloudflare Pages Function - User Reservations
// Get user reservations

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

    // For now, return mock reservations
    // TODO: Implement actual Supabase query
    const mockReservations = [
      {
        id: 'res-1',
        order_id: 'order-123',
        status: 'confirmed',
        created_at: new Date().toISOString(),
        pallet_name: 'Stockholm Pallet',
        delivery_address: '123 Main St, Stockholm',
        total_amount_cents: 250000,
        items: [
          {
            wine_name: 'Sample Wine 1',
            vintage: '2020',
            quantity: 2,
            base_price_cents: 125000
          }
        ]
      }
    ]

    return new Response(JSON.stringify(mockReservations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Reservations error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch reservations'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}