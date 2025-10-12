# SetupIntent Alternatives for Swedish Debit Cards

## Problem Identified:
- **Network Decline Code 79**: "Do Not Honor"
- **Card Type**: Mastercard Debit from Swedish bank
- **Issue**: Swedish banks block off-session payments on debit cards
- **Advice Code**: "try_again_later" (but will likely fail again)

## Alternative Solutions:

### Option 1: 1 SEK Verification Charge
Instead of SetupIntent (0 kr), charge 1 SEK and refund immediately:

```typescript
// Create PaymentIntent with 1 SEK
const paymentIntent = await stripe.paymentIntents.create({
  amount: 100, // 1 SEK
  currency: 'sek',
  customer: customerId,
  payment_method: paymentMethodId,
  confirm: true,
  return_url: `${baseUrl}/profile?payment_method_added=true`
});

// If successful, refund immediately
if (paymentIntent.status === 'succeeded') {
  await stripe.refunds.create({
    payment_intent: paymentIntent.id,
    amount: 100
  });
}
```

**Pros:**
- Real transaction, banks more likely to approve
- Shows as 1 SEK charge + 1 SEK refund
- Verifies card actually works

**Cons:**
- Customer sees temporary 1 SEK charge
- Requires refund logic
- More complex implementation

### Option 2: On-Session Payments Only
Remove SetupIntent, require customer presence for each payment:

```typescript
// Don't save payment method, require confirmation each time
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount,
  currency: 'sek',
  customer: customerId,
  confirm: true,
  return_url: `${baseUrl}/checkout/return`
});
```

**Pros:**
- No off-session issues
- Works with all card types
- Simpler implementation

**Cons:**
- Customer must approve each payment
- Less convenient for recurring orders
- No saved payment methods

### Option 3: Subscription Model
Create a subscription (even if not charging regularly):

```typescript
// Create subscription for future payments
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_future_payments' }],
  trial_period_days: 365, // Free trial for 1 year
  collection_method: 'charge_automatically'
});
```

**Pros:**
- Banks approve subscriptions more easily
- Can charge when needed
- Standard Stripe pattern

**Cons:**
- More complex billing logic
- Requires price creation
- Customer sees "subscription"

### Option 4: Multiple Payment Methods
Offer multiple options:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  payment_method_types: ['card', 'klarna', 'swish'],
  mode: 'setup',
  // ... rest of config
});
```

**Pros:**
- Swedish customers prefer Swish/Klarna
- Reduces card dependency
- Better conversion rates

**Cons:**
- Requires additional setup
- More complex checkout flow
- Different UX patterns

## Recommended Implementation:

### Phase 1: Try Credit Card First
1. Add messaging to encourage credit cards
2. Provide clear error messages for debit card failures
3. Suggest contacting bank

### Phase 2: Implement 1 SEK Verification
If credit cards also fail, implement verification charge:

```typescript
// In /api/checkout/setup/route.ts
export async function POST(request: Request) {
  const { useVerificationCharge } = await request.json();
  
  if (useVerificationCharge) {
    // Create 1 SEK PaymentIntent instead of SetupIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'sek',
      customer: customerId,
      payment_method_types: ['card'],
      confirm: true,
      return_url: `${baseUrl}/profile?payment_method_added=true`
    });
    
    return NextResponse.json({
      url: paymentIntent.next_action?.redirect_to_url?.url,
      type: 'payment_intent'
    });
  } else {
    // Existing SetupIntent logic
    const session = await stripe.checkout.sessions.create({
      // ... existing setup intent code
    });
    
    return NextResponse.json({
      url: session.url,
      type: 'setup_intent'
    });
  }
}
```

### Phase 3: Add Swish/Klarna
For better Swedish market penetration:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  payment_method_types: ['card', 'klarna', 'swish'],
  mode: 'setup',
  // ... rest of config
});
```

## User Experience Improvements:

### Better Error Messages:
```typescript
const getDeclineMessage = (declineCode: string) => {
  switch (declineCode) {
    case 'try_again_later':
      return "Your bank declined this transaction. Please try a credit card or contact your bank to enable recurring payments.";
    case 'card_not_supported':
      return "This card type doesn't support future payments. Please use a credit card.";
    default:
      return "Your card was declined. Please try a different card or contact your bank.";
  }
};
```

### Payment Method Selection:
```typescript
// Show payment method options
<div className="payment-methods">
  <button onClick={() => addPaymentMethod('setup_intent')}>
    💳 Save Card for Future Payments
  </button>
  <button onClick={() => addPaymentMethod('verification_charge')}>
    💳 Verify Card with 1 SEK (refunded immediately)
  </button>
  <button onClick={() => addPaymentMethod('on_session')}>
    💳 Pay Each Time (no card saving)
  </button>
</div>
```

## Implementation Priority:

1. **Immediate**: Add better error messages and credit card encouragement
2. **Short-term**: Implement 1 SEK verification charge option
3. **Medium-term**: Add Swish/Klarna support
4. **Long-term**: Consider subscription model for regular customers

## Testing Strategy:

1. **Test with different card types**:
   - Swedish debit cards (expect failures)
   - Swedish credit cards (should work)
   - International cards (should work)

2. **Test with different banks**:
   - SEB, Nordea, Handelsbanken, Swedbank
   - Digital banks (Revolut, N26, etc.)

3. **Test verification charge flow**:
   - 1 SEK charge goes through
   - Refund is processed correctly
   - Payment method is saved successfully

This approach provides multiple fallbacks while maintaining a good user experience for Swedish customers.

