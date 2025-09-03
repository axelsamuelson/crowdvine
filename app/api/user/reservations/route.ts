import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // For now, return mock data for the authenticated user
    // In a real app, you would fetch actual reservations from the database
    const mockReservations = [
      {
        id: 'test-reservation-1',
        status: 'placed',
        created_at: '2025-09-03T20:00:00.000Z',
        address: {
          full_name: user.user_metadata?.full_name || 'Test User',
          email: user.email || 'test@example.com',
          phone: '123456789',
          address_street: 'Test Street 123',
          address_postcode: '12345',
          address_city: 'Test City',
          country_code: 'SE'
        },
        zones: {
          pickup: { name: 'Béziers', zone_type: 'pickup' },
          delivery: { name: 'Stockholm', zone_type: 'delivery' }
        },
        pallet: {
          id: 'test-pallet-1',
          name: 'Test Pallet',
          bottle_capacity: 100,
          currentBottles: 25,
          remainingBottles: 75
        },
        tracking: {
          code: '12345678',
          created_at: '2025-09-03T20:00:00.000Z'
        },
        items: [
          {
            quantity: 2,
            price_band: 'standard',
            wines: {
              id: 'test-wine-1',
              wine_name: 'Test Wine',
              vintage: '2020',
              grape_varieties: 'Merlot',
              color: 'Red',
              base_price_cents: 20000,
              producers: {
                name: 'Test Producer',
                region: 'Test Region',
                country_code: 'FR'
              }
            }
          }
        ]
      }
    ];

    return NextResponse.json({ 
      reservations: mockReservations,
      message: 'Authenticated user reservations',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name
      }
    });
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
