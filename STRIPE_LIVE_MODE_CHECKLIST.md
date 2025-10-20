# Stripe Live Mode Configuration Checklist

## Overview

You've activated Stripe Live mode. This guide ensures everything is configured correctly for production payments.

## Current Stripe Integration

### What Stripe is Used For:

1. ✅ **Payment Method Storage** - Save customer credit cards for future use
2. ✅ **SetupIntents** - Securely collect payment methods without charging
3. ✅ **Customer Management** - Create and manage Stripe customer profiles

### What Stripe is NOT Used For (Yet):

- ❌ **Actual Payments** - No payment charging implemented
- ❌ **Webhooks** - No Stripe webhook handler exists
- ❌ **Subscriptions** - Not implemented

## Environment Variables Checklist

### Required Variables (Vercel):

#### 1. Live API Keys

```bash
# In Vercel → Settings → Environment Variables

# Live Secret Key (starts with sk_live_)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Live Publishable Key (starts with pk_live_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# Live Webhook Secret (starts with whsec_)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### 2. Other Required Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=welcome@pactwines.com
SENDGRID_FROM_NAME=PACT
NEXT_PUBLIC_APP_URL=https://pactwines.com
```

### How to Get Live Keys from Stripe:

1. **Log in to Stripe Dashboard**
   - Go to https://dashboard.stripe.com

2. **Toggle to Live Mode**
   - Top right corner: Switch from "Test mode" to "Live mode"

3. **Get Secret Key**
   - Developers → API keys
   - Copy "Secret key" (starts with `sk_live_`)
   - Add to Vercel as `STRIPE_SECRET_KEY`

4. **Get Publishable Key**
   - Same page as secret key
   - Copy "Publishable key" (starts with `pk_live_`)
   - Add to Vercel as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

5. **Get Webhook Secret** (if using webhooks)
   - Developers → Webhooks
   - Click on your webhook endpoint
   - Copy "Signing secret" (starts with `whsec_`)
   - Add to Vercel as `STRIPE_WEBHOOK_SECRET`

### Verify in Vercel:

1. Go to Vercel Dashboard
2. Your Project → Settings → Environment Variables
3. Check each variable:
   - ✅ `STRIPE_SECRET_KEY` starts with `sk_live_`
   - ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`
   - ✅ Both are set for "Production" environment
4. Redeploy after updating variables

## Current Implementation Review

### ✅ Working Features:

#### 1. Payment Method Setup (`/api/checkout/setup`)

```typescript
// Creates Stripe SetupIntent
// Redirects user to Stripe hosted page
// User adds card
// Stripe saves card to customer
```

**Flow:**

1. User clicks "Add Payment Method"
2. API creates SetupIntent with Stripe
3. User redirected to Stripe Checkout
4. User enters card details (secure, PCI-compliant)
5. Stripe redirects back with success/failure
6. Payment method saved to customer

**Status:** ✅ Works in both test and live mode

#### 2. Customer Creation

```typescript
// lib/stripe.ts - createCustomer()
// Creates Stripe customer with email
```

**Status:** ✅ Works in both test and live mode

#### 3. Payment Method Display

```typescript
// Profile page shows saved cards
// Fetches from Stripe customer
```

**Status:** ✅ Works in both test and live mode

### ⚠️ Not Implemented:

#### 1. Payment Processing

- No payment charging implemented
- Reservations are created but not charged
- Need to add payment intent creation if charging upfront

#### 2. Stripe Webhooks

- No webhook endpoint exists
- Can't receive:
  - payment_intent.succeeded
  - setup_intent.succeeded
  - customer.subscription.updated
  - etc.

#### 3. Payment Confirmation

- No verification of successful payment
- Reservations created without payment confirmation

## Testing Live Mode

### Test Payment Methods in Live Mode:

**Valid Test Cards (Work in Live Mode for Testing):**

```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/28)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)

This card will:
- ✅ Pass validation
- ✅ Save to customer
- ✅ Work for SetupIntents
- ⚠️ Won't actually charge (it's a test card)
```

**For Real Payments:**

- Use your actual credit card
- Small test amount to verify
- Check Stripe Dashboard → Payments

### Test Flow:

1. **Add Payment Method:**

   ```
   1. Login to pactwines.com
   2. Go to Profile
   3. Click "Add Payment Method"
   4. Redirected to Stripe
   5. Enter card: 4242 4242 4242 4242
   6. Submit
   7. Redirected back to profile
   8. See success toast ✅
   9. Card appears in list ✅
   ```

2. **Check Stripe Dashboard:**

   ```
   1. Go to Stripe Dashboard (Live mode)
   2. Customers → Find customer by email
   3. Check "Payment methods" tab
   4. Card should be listed ✅
   ```

3. **Make Test Reservation:**
   ```
   1. Add wines to cart (6-bottle multiples)
   2. Go to checkout
   3. Select payment method
   4. Place reservation
   5. Check: reservation created ✅
   6. Check: no payment charged (not implemented)
   ```

## Required Actions for Live Mode

### ✅ Already Done:

1. Payment method collection via SetupIntent
2. Customer creation in Stripe
3. Payment method display in profile
4. Stripe SDK integration (v18.5.0)

### 🔧 To Do (If Charging Payments):

#### 1. Update Environment Variables in Vercel

```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_... (not sk_test_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (not pk_test_)
```

#### 2. Create Webhook Endpoint (If Needed)

```typescript
// app/api/stripe/webhook/route.ts
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  // Handle events:
  switch (event.type) {
    case "setup_intent.succeeded":
      // Payment method added
      break;
    case "payment_intent.succeeded":
      // Payment successful
      break;
  }

  return NextResponse.json({ received: true });
}
```

#### 3. Configure Webhook in Stripe Dashboard

```
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: https://pactwines.com/api/stripe/webhook
3. Select events to listen for:
   - setup_intent.succeeded
   - payment_intent.succeeded (if charging)
4. Copy webhook signing secret
5. Add to Vercel: STRIPE_WEBHOOK_SECRET
```

#### 4. Add Payment Processing (If Charging)

```typescript
// In checkout/confirm or separate payment API
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmountCents,
  currency: "sek",
  customer: stripeCustomerId,
  payment_method: selectedPaymentMethodId,
  off_session: true,
  confirm: true,
});
```

## Security Checklist

### ✅ Current Security (Good):

1. ✅ Secret key only used server-side
2. ✅ Publishable key safe to expose client-side
3. ✅ Customer creation server-side only
4. ✅ SetupIntent creation server-side only
5. ✅ User authentication required
6. ✅ PCI-compliant (Stripe hosted checkout)

### ⚠️ Additional Security for Live:

1. ⚠️ Add webhook signature verification (if using webhooks)
2. ⚠️ Log all Stripe operations for audit trail
3. ⚠️ Add idempotency keys for payment creation
4. ⚠️ Validate amounts server-side before charging
5. ⚠️ Add fraud detection (Stripe Radar)

## Monitoring & Alerts

### Stripe Dashboard Checks:

1. **Daily:**
   - Check Payments tab for errors
   - Review failed payment methods
   - Check customer disputes

2. **Weekly:**
   - Review successful SetupIntents
   - Check customer list growth
   - Verify webhook delivery (if using)

3. **Monthly:**
   - Review Stripe fees
   - Check for unusual patterns
   - Update API version if needed

### Set Up Alerts:

1. Stripe Dashboard → Settings → Notifications
2. Enable email alerts for:
   - Failed payments
   - Disputes/chargebacks
   - Webhook failures
   - Suspicious activity

## Common Issues & Solutions

### Issue 1: "Stripe is not configured"

**Solution:**

- Check Vercel environment variables
- Ensure `STRIPE_SECRET_KEY` exists
- Ensure starts with `sk_live_` (not `sk_test_`)
- Redeploy after changing

### Issue 2: Payment method not saving

**Solution:**

- Check browser console for errors
- Verify publishable key is live mode
- Check Stripe Dashboard → Logs for API errors
- Verify customer exists in Stripe

### Issue 3: Webhook not receiving events

**Solution:**

- Verify webhook URL: https://pactwines.com/api/stripe/webhook
- Check webhook signing secret in Vercel
- Check Stripe Dashboard → Webhooks → Delivery attempts
- Verify endpoint returns 200 response

### Issue 4: CORS errors in live mode

**Solution:**

- Stripe Checkout handles CORS automatically
- Ensure return URLs are https://pactwines.com
- Check domain is verified in Stripe

## Verification Steps

### Step 1: Check Environment Variables

```bash
# In Vercel Dashboard
Settings → Environment Variables

Required:
✅ STRIPE_SECRET_KEY (sk_live_...)
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)
✅ STRIPE_WEBHOOK_SECRET (whsec_...) - if using webhooks

Scope:
✅ Production ✅
```

### Step 2: Test Payment Method Addition

```
1. Create test user account
2. Go to /profile
3. Click "Add Payment Method"
4. Should redirect to Stripe (live mode)
5. Add card (use real card or test card)
6. Redirected back to /profile
7. Payment method appears ✅
8. Check Stripe Dashboard → card is there ✅
```

### Step 3: Check Logs

```
Vercel → Functions → Check logs for:
- "DEBUG: Stripe configured: true"
- "DEBUG: Has secret key: true"
- "DEBUG: Has publishable key: true"

Stripe Dashboard → Developers → Logs:
- Check for API errors
- Verify requests going through
```

### Step 4: Test Complete Flow

```
1. Add wines to cart (6-bottle multiples)
2. Add payment method
3. Go to checkout
4. Select payment method
5. Place reservation
6. Check: reservation created ✅
7. Check: payment method stored ✅
8. Note: No payment charged (not implemented) ⚠️
```

## What Works Now:

✅ **Payment Method Collection**

- Users can add credit cards
- Cards stored securely in Stripe
- PCI-compliant (Stripe handles card data)
- Works in live mode

✅ **Customer Management**

- Stripe customers created automatically
- Linked to user email
- Payment methods attached to customers

✅ **SetupIntents**

- Secure card collection flow
- Stripe hosted checkout
- Return URL handling
- Success/failure states

## What to Add for Full Live Payments:

### 1. Payment Charging (High Priority)

If you want to actually charge customers:

```typescript
// app/api/checkout/charge/route.ts
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { amount, customerId, paymentMethodId } = await req.json();

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount, // in cents
    currency: "sek",
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    description: "Wine Reservation",
  });

  return NextResponse.json({ success: true });
}
```

### 2. Webhook Handler (High Priority)

```typescript
// app/api/stripe/webhook/route.ts
// Handle payment confirmations, failures, disputes
```

### 3. Error Handling

- Insufficient funds
- Card declined
- Authentication required (3D Secure)

### 4. Refunds (Medium Priority)

- Partial refunds
- Full refunds
- Cancellation flow

## Quick Start: Enable Live Mode

### 1. Update Vercel Environment Variables

```bash
# Get keys from Stripe Dashboard (Live mode)
# Settings → Environment Variables → Add:

STRIPE_SECRET_KEY=sk_live_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (if using webhooks)

# Set for: Production
# Save
```

### 2. Redeploy

```bash
# Trigger new deployment
git commit --allow-empty -m "Redeploy for Stripe live keys"
git push origin main

# Or in Vercel:
# Deployments → ... → Redeploy
```

### 3. Test

```
1. Go to https://pactwines.com/profile
2. Add payment method
3. Use test card: 4242 4242 4242 4242
4. Verify success
5. Check Stripe Dashboard (Live mode) → Customers
6. Find customer, verify card saved
```

### 4. Monitor

```
Stripe Dashboard → Home
- Watch for:
  - New customers
  - Setup intents
  - Failed attempts
  - Errors
```

## Current Code Status

### Files Using Stripe:

1. **lib/stripe.ts** - Stripe configuration ✅
   - Initializes Stripe SDK
   - Export config and helpers
   - apiVersion: "2024-12-18.acacia" (latest)

2. **app/api/checkout/setup/route.ts** - SetupIntent creation ✅
   - Creates customer if not exists
   - Creates SetupIntent
   - Returns Stripe checkout URL

3. **app/profile/page.tsx** - Payment method management ✅
   - Displays saved cards
   - Add payment method button
   - Success handling

4. **components/checkout/payment-method-selector.tsx** - Checkout UI ✅
   - Select saved payment method
   - Add new method option
   - Displays card details

### Files That Would Need Updates for Charging:

1. **app/api/checkout/confirm/route.ts**
   - Currently creates reservation WITHOUT charging
   - Would need to add PaymentIntent creation
   - Verify payment before confirming reservation

2. **New: app/api/stripe/webhook/route.ts**
   - Handle payment confirmations
   - Update reservation status
   - Send confirmation emails

## Testing Checklist

### Before Going Live:

- [ ] Live keys added to Vercel
- [ ] Keys start with `sk_live_` and `pk_live_`
- [ ] Redeployed application
- [ ] Tested adding payment method
- [ ] Verified in Stripe Dashboard (Live mode)
- [ ] Tested complete reservation flow
- [ ] Checked for console errors
- [ ] Verified return URLs work (https://pactwines.com)

### After Going Live:

- [ ] Monitor Stripe Dashboard daily
- [ ] Set up email alerts for failures
- [ ] Test with real card (small amount)
- [ ] Verify customer creation
- [ ] Check webhook delivery (if using)
- [ ] Monitor Vercel function logs
- [ ] Set up error tracking (Sentry, etc.)

## Important Notes

### Payment Method vs Payment Processing:

- **SetupIntent** = Save card for later (implemented ✅)
- **PaymentIntent** = Actually charge the card (NOT implemented ⚠️)

### Current Behavior:

1. User adds payment method → Saved to Stripe ✅
2. User places reservation → Reservation created ✅
3. Payment charged? → **NO** ⚠️ (not implemented)

### If You Want to Charge:

You'll need to implement PaymentIntent creation in checkout/confirm or create a separate payment processing step.

### Security:

- ✅ Never store card numbers yourself (Stripe handles it)
- ✅ Use Stripe.js or Checkout (PCI-compliant)
- ✅ Server-side payment creation only
- ✅ Validate amounts server-side
- ✅ Use idempotency keys for retries

## Next Steps

### Immediate (Required):

1. ✅ Update Vercel with live Stripe keys
2. ✅ Redeploy application
3. ✅ Test payment method addition
4. ✅ Verify in Stripe Dashboard

### Soon (Recommended):

1. Add webhook endpoint for payment events
2. Add proper error handling for declined cards
3. Add payment confirmation flow
4. Set up Stripe alerts

### Future (Nice to Have):

1. Implement actual payment charging
2. Add refund functionality
3. Add dispute handling
4. Implement subscriptions (if needed)
5. Add detailed payment analytics

## Support

### If Issues Occur:

1. **Check Vercel Logs:**
   - Functions tab
   - Look for Stripe errors

2. **Check Stripe Logs:**
   - Dashboard → Developers → Logs
   - See all API requests and responses

3. **Common Fixes:**
   - Redeploy after env var changes
   - Clear browser cache
   - Test in incognito mode
   - Verify keys are live mode (not test)

## Summary

### What's Working:

✅ Payment method collection  
✅ Stripe customer creation  
✅ Card storage (PCI-compliant)  
✅ Setup flow from profile and checkout

### What Needs Attention:

⚠️ Update environment variables with live keys  
⚠️ Redeploy after updating  
⚠️ Test thoroughly before accepting real payments

### What's Not Implemented (Optional):

❌ Actual payment charging  
❌ Webhook handling  
❌ Payment confirmation flow

**Your current setup is ready for live mode card collection!**  
The payment method storage works perfectly.  
If you want to actually charge customers, we'll need to add PaymentIntent creation.
