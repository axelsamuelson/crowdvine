// Cloudflare Pages Function - Create Payment Intent
// Create Stripe Payment Intent for checkout

import { success, error, badRequest, unauthorized, internalError, corsHeaders } from '../_lib/response'
import { getStripeClient, createPaymentIntentData } from '../_lib/stripe'
import { getUserFromRequest } from '../_lib/supabase'

export async function onRequestPost(ctx: any) {
  const { request, env } = ctx
  
  try {
    const userId = getUserFromRequest(request)
    
    if (!userId) {
      return unauthorized('Authentication required')
    }

    const body = await request.json()
    const { amount, currency = 'sek', metadata = {} } = body

    if (!amount || amount <= 0) {
      return badRequest('Valid amount is required')
    }

    const stripe = getStripeClient(env)

    // Create payment intent
    const paymentIntentData = createPaymentIntentData(amount, currency, {
      user_id: userId,
      ...metadata
    })

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    const response = success({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    }, 'Payment intent created')

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Payment intent creation error:', err)
    return internalError('Payment intent creation failed')
  }
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}