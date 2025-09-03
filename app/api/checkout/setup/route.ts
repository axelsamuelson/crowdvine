import { NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';

export async function GET(request: Request) {
  try {
    // Check if Stripe is configured
    if (!STRIPE_CONFIG.isConfigured) {
      return NextResponse.json({
        error: 'Stripe is not configured',
        message: 'Please set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.',
        setupUrl: null
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Create or get customer
    let customer;
    try {
      customer = await stripe!.customers.create({
        email,
        name: name || undefined,
      });
    } catch (error: any) {
      // If customer already exists, try to retrieve it
      if (error.code === 'resource_missing') {
        const customers = await stripe!.customers.list({ email });
        customer = customers.data[0];
      } else {
        console.error('Error creating customer:', error);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }
    }

    // Create Stripe Checkout session for setup
    const session = await stripe!.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout?canceled=true`,
      metadata: {
        type: 'payment_method_setup',
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Checkout setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
