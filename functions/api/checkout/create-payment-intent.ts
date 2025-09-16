// Development checkout endpoint
export async function onRequest(context: any) {
  const { request } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const body = await request.json();
    const { amount, currency = 'SEK' } = body;
    
    console.log(`[DEV] Creating payment intent for ${amount} ${currency}`);
    
    // Development payment intent - return mock data
    return new Response(JSON.stringify({
      clientSecret: 'pi_dev_1234567890_secret_abcdef',
      paymentIntentId: 'pi_dev_1234567890',
      amount: amount,
      currency: currency,
      status: 'requires_payment_method',
      environment: 'development'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}