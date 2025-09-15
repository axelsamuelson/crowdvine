// Cloudflare Pages Function - Stripe Webhook
// TODO: Implement Stripe webhook verification and processing

export async function onRequestPost(ctx: EventContext) {
  const { request, env } = ctx;
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    // TODO: Implement Stripe webhook verification
    // const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    // const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);

    // TODO: Handle different event types
    // switch (event.type) {
    //   case 'payment_intent.succeeded':
    //     // Handle successful payment
    //     break;
    //   case 'payment_intent.payment_failed':
    //     // Handle failed payment
    //     break;
    // }

    // OBS: kräv "raw body" hantering; ev. rekommendera separata Workers/Routes för robusthet
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      ok: false, 
      error: 'Webhook processing failed' 
    }, { status: 400 });
  }
}

// Handle GET requests (not allowed for webhooks)
export async function onRequestGet() {
  return Response.json({ 
    ok: false, 
    error: 'Method not allowed' 
  }, { status: 405 });
}
