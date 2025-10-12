-- Migration 049: Pallet Completion System
-- Date: 2025-01-12
-- Purpose: Add pallet completion tracking and payment status to reservations

-- Add status and completion tracking to pallets table
ALTER TABLE pallets
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open',
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE;

-- Add payment status to order_reservations
ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_link TEXT,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE;

-- Create index for finding reservations needing payment
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status 
ON order_reservations(payment_status, pallet_id);

-- Create index for pallet status queries
CREATE INDEX IF NOT EXISTS idx_pallets_status 
ON pallets(status, is_complete);

-- Update existing reservations to have proper status
UPDATE order_reservations 
SET status = 'pending_payment' 
WHERE status = 'pending' AND payment_method_id IS NULL;

-- Update existing reservations with payment methods to confirmed
UPDATE order_reservations 
SET status = 'confirmed', payment_status = 'paid' 
WHERE payment_method_id IS NOT NULL AND status = 'pending';

-- Add constraint for valid status values
ALTER TABLE order_reservations 
ADD CONSTRAINT chk_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired'));

-- Add constraint for valid pallet status values  
ALTER TABLE pallets 
ADD CONSTRAINT chk_pallet_status 
CHECK (status IN ('open', 'complete', 'shipped', 'delivered', 'cancelled'));

-- Add comment explaining the new system
COMMENT ON TABLE pallets IS 'Pallets track completion status. When complete, payment notifications are sent.';
COMMENT ON COLUMN order_reservations.payment_status IS 'pending: awaiting pallet completion, paid: payment completed, failed: payment failed, expired: deadline passed';
COMMENT ON COLUMN order_reservations.payment_link IS 'Stripe Checkout Session URL sent via email when pallet completes';
COMMENT ON COLUMN pallets.payment_deadline IS 'Deadline for customers to complete payment after pallet fills';
