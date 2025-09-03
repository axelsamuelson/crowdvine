import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  // For testing purposes, simulate successful authentication
  // In a real app, this would check actual user authentication
  
  // Simulate some mock reservations for testing
  const mockReservations = [
    {
      id: 'test-reservation-1',
      status: 'placed',
      created_at: '2025-09-03T20:00:00.000Z',
      address: {
        full_name: 'Test User',
        email: 'test@example.com',
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
    message: 'Mock authentication successful'
  });
}
