// Development user reservations endpoint
export async function onRequest(context: any) {
  const { request } = context;
  
  console.log(`[DEV] User reservations request: ${request.method} ${request.url}`);
  
  if (request.method === 'GET') {
    // Return mock reservations data
    return new Response(JSON.stringify({
      reservations: [
        {
          id: 'dev-reservation-1',
          user_id: 'dev-user-123',
          status: 'confirmed',
          total_amount: 1299,
          created_at: new Date().toISOString(),
          wines: [
            {
              id: 'dev-wine-1',
              name: 'Development Wine 1',
              quantity: 2,
              price: 299
            }
          ]
        }
      ],
      environment: 'development'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}