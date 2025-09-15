// Cloudflare Pages Function - Stripe Webhook
// Handle Stripe webhook events

export async function onRequestPost(context: any) {
  const { request, env } = context
  
  try {
    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return new Response(JSON.stringify({
        error: 'No Stripe signature in headers'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await request.text()
    
    // For now, just log the webhook
    console.log('Stripe webhook received:', { signature, body: body.substring(0, 100) + '...' })
    
    // Return 200 to acknowledge receipt
    return new Response(null, { status: 200 })

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return new Response(JSON.stringify({
      error: 'Webhook processing failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}