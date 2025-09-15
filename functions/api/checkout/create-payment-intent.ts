// Cloudflare Pages Function - Checkout Payment Intent
// Create Stripe payment intent

export async function onRequestPost(context: any) {
  const { request, env } = context
  
  try {
    const body = await request.json()
    const { amount, currency = 'sek' } = body

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(JSON.stringify({
        error: 'Valid amount is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // For now, return a mock payment intent
    // TODO: Implement actual Stripe integration
    return new Response(JSON.stringify({
      clientSecret: 'pi_mock_client_secret_' + Date.now()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Create Payment Intent error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}