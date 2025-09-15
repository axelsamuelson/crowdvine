// Cloudflare Pages Functions - Stripe Helpers
// Stripe client and webhook verification for Pages Functions

import Stripe from 'stripe'

export function getStripeClient(env: any): Stripe {
  const stripeSecretKey = env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    throw new Error('Missing Stripe secret key')
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-08-27.basil',
    typescript: true
  })
}

export async function verifyStripeWebhook(
  request: Request,
  env: any
): Promise<{ event: Stripe.Event; rawBody: string }> {
  const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET

  if (!stripeWebhookSecret) {
    throw new Error('Missing Stripe webhook secret')
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    throw new Error('Missing Stripe signature')
  }

  // Get raw body
  const rawBody = await request.text()

  try {
    const stripe = getStripeClient(env)
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret
    )

    return { event, rawBody }
  } catch (error) {
    console.error('Webhook verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

export function createPaymentIntentData(
  amount: number,
  currency: string = 'sek',
  metadata: Record<string, string> = {}
): Stripe.PaymentIntentCreateParams {
  return {
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    metadata,
    automatic_payment_methods: {
      enabled: true
    }
  }
}

export function createSetupIntentData(
  customerId: string,
  metadata: Record<string, string> = {}
): Stripe.SetupIntentCreateParams {
  return {
    customer: customerId,
    usage: 'off_session',
    metadata
  }
}
