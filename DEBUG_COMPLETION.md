# Debug Pallet Completion

## Problem

Pallet shows 786/720 bottles (109%) but `wasCompleted = false`

## Step 1: Check Pallet Status in Supabase

Run this SQL:

```sql
SELECT
  id,
  name,
  status,
  is_complete,
  completed_at,
  payment_deadline,
  bottle_capacity
FROM pallets
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';
```

Expected:

- `is_complete` should be `FALSE` (if you ran the reset)
- `status` should be `'open'`

## Step 2: Check Reservations Status

```sql
SELECT
  id,
  status,
  payment_status,
  pallet_id
FROM order_reservations
WHERE pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
ORDER BY created_at;
```

Expected:

- All should have `status` IN ('placed', 'pending_payment', 'confirmed')

## Step 3: Check Order Reservation Items

```sql
SELECT
  ori.id,
  ori.reservation_id,
  ori.quantity,
  ori.item_id,
  r.status as reservation_status
FROM order_reservation_items ori
JOIN order_reservations r ON r.id = ori.reservation_id
WHERE r.pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db';
```

Expected:

- Should see total 786 bottles across all items

## Step 4: Check Vercel Logs

```bash
vercel logs pactwines.com --since 5m
```

Look for:

- `🔍 [Pallet Completion] Checking pallet`
- `📊 [Pallet Completion] Pallet X: 786/720 bottles (109.2%)`
- `🎉 [Pallet Completion] Pallet X is complete!`
- Any error messages

## Step 5: Manual Trigger Test

If automated check doesn't work, try manual completion:

```sql
-- Manually trigger completion
BEGIN;

-- Mark pallet complete
UPDATE pallets
SET
  status = 'complete',
  is_complete = TRUE,
  completed_at = NOW(),
  payment_deadline = NOW() + INTERVAL '7 days'
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';

-- Update reservations
UPDATE order_reservations
SET
  status = 'pending_payment',
  payment_status = 'pending',
  payment_deadline = NOW() + INTERVAL '7 days'
WHERE pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
  AND status IN ('placed', 'pending_payment');

-- Verify
SELECT * FROM pallets WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';
SELECT id, status, payment_status FROM order_reservations
WHERE pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db';

COMMIT;
```

## Step 6: Create Payment Links Manually

If completion worked but emails didn't send, create payment links manually:

1. Go to: `https://pactwines.com/api/admin/pallets/check-completion`
2. This will attempt to create payment links for pending reservations

## Common Issues

### Issue 1: is_complete already TRUE

**Solution:** Run reset SQL again

```sql
UPDATE pallets
SET is_complete = FALSE, status = 'open', completed_at = NULL, payment_deadline = NULL
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';
```

### Issue 2: Reservations have wrong status

**Solution:** Fix reservation status

```sql
UPDATE order_reservations
SET status = 'placed', payment_status = 'pending'
WHERE pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
  AND status NOT IN ('placed', 'pending_payment', 'confirmed');
```

### Issue 3: SendGrid not configured

**Check:** `process.env.SENDGRID_API_KEY` is set in Vercel
**Check:** `process.env.SENDGRID_FROM_EMAIL` is set in Vercel

### Issue 4: Stripe not configured

**Check:** `process.env.STRIPE_SECRET_KEY` is set in Vercel
**Check:** Key has permissions to create Checkout Sessions

## Expected Flow

1. API receives request → `checkAllPallets()`
2. For each pallet → `checkPalletCompletion(palletId)`
3. If `is_complete = FALSE` and `786 >= 720` → `completePallet(palletId)`
4. `completePallet()` marks pallet complete
5. `triggerPaymentNotifications(palletId)` is called
6. For each reservation → `createPaymentLinkForReservation()`
7. Stripe Checkout Session created
8. `payment_link` saved to database
9. Email sent via SendGrid
10. Returns `wasCompleted: true`

## Next Steps

1. Run Step 1 SQL and share results
2. Check Vercel logs for errors
3. If needed, manually trigger completion (Step 5)
