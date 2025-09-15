// Cloudflare Pages Function - Stripe Webhook
// Handle Stripe webhook events with raw body verification

import { success, error, internalError, corsHeaders } from '../_lib/response'
import { verifyStripeWebhook } from '../_lib/stripe'
import { getSupabaseAdmin } from '../_lib/supabase'

export async function onRequestPost(ctx: any) {
  const { request, env } = ctx
  
  try {
    // Verify webhook signature and get event
    const { event, rawBody } = await verifyStripeWebhook(request, env)

    console.log('Received Stripe webhook:', event.type, event.id)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event, env)
        break
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event, env)
        break
        
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event, env)
        break
        
      default:
        console.log('Unhandled event type:', event.type)
    }

    const response = success({ received: true }, 'Webhook processed')

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Webhook processing error:', err)
    return internalError('Webhook processing failed')
  }
}

async function handlePaymentIntentSucceeded(event: any, env: any) {
  const paymentIntent = event.data.object
  
  console.log('Payment succeeded:', paymentIntent.id)
  
  // Update reservation status in Supabase
  const supabase = getSupabaseAdmin(env)
  
  try {
    const { error } = await supabase
      .from('order_reservations')
      .update({ 
        status: 'confirmed',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id)
    
    if (error) {
      console.error('Error updating reservation:', error)
    }
  } catch (err) {
    console.error('Error handling payment success:', err)
  }
}

async function handlePaymentIntentFailed(event: any, env: any) {
  const paymentIntent = event.data.object
  
  console.log('Payment failed:', paymentIntent.id)
  
  // Update reservation status in Supabase
  const supabase = getSupabaseAdmin(env)
  
  try {
    const { error } = await supabase
      .from('order_reservations')
      .update({ 
        status: 'payment_failed',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntent.id)
    
    if (error) {
      console.error('Error updating reservation:', error)
    }
  } catch (err) {
    console.error('Error handling payment failure:', err)
  }
}

async function handleSetupIntentSucceeded(event: any, env: any) {
  const setupIntent = event.data.object
  
  console.log('Setup intent succeeded:', setupIntent.id)
  
  // Handle payment method setup
  // This could update user's default payment method
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}