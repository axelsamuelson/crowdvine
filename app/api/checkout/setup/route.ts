import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

export async function POST() {
  // TODO: hämta stripe_customer_id från profiles vid auth; MVP kan skapa en anonym kund
  const customer = await stripe.customers.create({});
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customer.id,
    payment_method_types: ['card'],
    success_url: `${process.env.APP_URL}/profile?setup=success`,
    cancel_url: `${process.env.APP_URL}/profile?setup=cancel`,
  });
  return NextResponse.json({ url: session.url });
}
