import { NextResponse } from 'next/server';
import { createSetupIntent, createCustomer } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Create or get customer
    let customer;
    try {
      customer = await createCustomer(email, name);
    } catch (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Create setup intent
    let setupIntent;
    try {
      setupIntent = await createSetupIntent(customer.id);
    } catch (error) {
      console.error('Error creating setup intent:', error);
      return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    console.error('Setup intent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
