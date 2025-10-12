# Migration 049 - Pallet Completion System

## ⚠️ VIKTIGT: Kör denna migration i Supabase SQL Editor

Denna migration måste köras **innan** det nya payment-systemet fungerar korrekt.

## Steg 1: Öppna Supabase SQL Editor

1. Gå till [Supabase Dashboard](https://app.supabase.com)
2. Välj ditt projekt
3. Klicka på "SQL Editor" i vänstermenyn
4. Klicka på "New Query"

## Steg 2: Kopiera och Kör Migration

Kopiera hela innehållet från `migrations/049_pallet_completion_system.sql` och kör det.

Eller kopiera detta:

```sql
-- Migration 049: Pallet Completion System
-- Description: Add tracking for pallet completion and payment status
-- Date: 2025-10-12

-- ============================================
-- 1. ADD COLUMNS TO PALLETS TABLE
-- ============================================

-- Add status and completion tracking to pallets
ALTER TABLE pallets
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open',
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE;

-- Create index for pallet status queries
CREATE INDEX IF NOT EXISTS idx_pallets_status 
ON pallets(status, is_complete);

-- ============================================
-- 2. ADD COLUMNS TO ORDER_RESERVATIONS TABLE
-- ============================================

-- Add payment tracking to order_reservations
ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_link TEXT,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE;

-- Create index for finding reservations needing payment
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status 
ON order_reservations(payment_status, pallet_id);

-- Create index for payment deadline queries
CREATE INDEX IF NOT EXISTS idx_reservations_payment_deadline
ON order_reservations(payment_deadline) WHERE payment_status = 'pending';

-- ============================================
-- 3. UPDATE EXISTING DATA (OPTIONAL)
-- ============================================

-- Set default payment_status based on existing status
UPDATE order_reservations
SET payment_status = CASE 
  WHEN status = 'confirmed' THEN 'paid'
  WHEN status = 'pending_payment' THEN 'pending'
  WHEN status = 'placed' THEN 'pending'
  ELSE 'pending'
END
WHERE payment_status IS NULL OR payment_status = 'pending';

COMMENT ON COLUMN pallets.status IS 'Pallet status: open, complete, locked, cancelled';
COMMENT ON COLUMN pallets.is_complete IS 'Whether pallet has reached 100% capacity';
COMMENT ON COLUMN pallets.completed_at IS 'Timestamp when pallet reached 100%';
COMMENT ON COLUMN pallets.payment_deadline IS 'Deadline for all payments in this pallet';

COMMENT ON COLUMN order_reservations.payment_status IS 'Payment status: pending, paid, failed, expired';
COMMENT ON COLUMN order_reservations.payment_intent_id IS 'Stripe PaymentIntent ID';
COMMENT ON COLUMN order_reservations.payment_link IS 'Stripe Checkout Session URL';
COMMENT ON COLUMN order_reservations.payment_deadline IS 'Deadline for completing payment';
```

## Steg 3: Verifiera Migration

Kör dessa queries för att verifiera:

```sql
-- Check pallets columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pallets'
AND column_name IN ('status', 'is_complete', 'completed_at', 'payment_deadline');

-- Check order_reservations columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'order_reservations'
AND column_name IN ('payment_status', 'payment_intent_id', 'payment_link', 'payment_deadline');

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('pallets', 'order_reservations')
AND indexname LIKE '%status%' OR indexname LIKE '%payment%';
```

## Steg 4: Trigga Pallet Completion Check

Efter migration, kör detta för att markera fulla paletter som kompletta:

```bash
curl -X POST https://pactwines.com/api/admin/pallets/check-completion
```

## Förväntade Resultat

Efter migration och completion check:

- ✅ Paletter med 100%+ kapacitet markeras som `is_complete = true`
- ✅ Reservationer får `payment_status = 'pending'` och `payment_link`
- ✅ Email skickas till alla kunder med betalningslänkar
- ✅ På profile/reservations-sidan visas "Payment Required" med "Pay Now" knapp

## Felsökning

Om något går fel, kontakta utvecklaren med:
- Error message från SQL Editor
- Screenshot av felmeddelandet
- Vilken query som kördes

