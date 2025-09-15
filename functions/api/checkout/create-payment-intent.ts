// Cloudflare Pages Function - Create Payment Intent
// TODO: Implement Stripe PaymentIntent creation

export async function onRequestPost(ctx: EventContext) {
  const { request, env } = ctx;
  
  try {
    const body = await request.json();
    const { amount, currency = 'sek', metadata = {} } = body;

    // TODO: Implement Stripe PaymentIntent creation
    // const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: amount,
    //   currency: currency,
    //   metadata: metadata
    // });

    return Response.json({ 
      ok: true, 
      message: 'PaymentIntent creation - TODO: implement Stripe integration',
      amount: amount,
      currency: currency,
      // client_secret: paymentIntent.client_secret
    });
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: 'Invalid request body' 
    }, { status: 400 });
  }
}

// Handle GET requests
export async function onRequestGet() {
  return Response.json({ 
    ok: true, 
    message: 'Create PaymentIntent endpoint - TODO: implement Stripe integration' 
  });
}
