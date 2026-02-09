-- Migration: Add warehouse orders support
-- Date: 2025-01-XX
-- Description: Adds support for warehouse orders (direct B2B orders, not on pallets) and invoice payment

-- Add order_type to order_reservations to distinguish producer vs warehouse orders
ALTER TABLE order_reservations 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'producer' 
CHECK (order_type IN ('producer', 'warehouse'));

-- Add payment_method_type to order_reservations
ALTER TABLE order_reservations 
ADD COLUMN IF NOT EXISTS payment_method_type TEXT DEFAULT 'card'
CHECK (payment_method_type IN ('card', 'invoice'));

-- Warehouse orders should not have pallet_id (set to NULL)
-- Producer orders keep pallet_id as before

-- Add index for warehouse orders
CREATE INDEX IF NOT EXISTS idx_order_reservations_order_type 
ON order_reservations(order_type);

-- Add index for payment method type
CREATE INDEX IF NOT EXISTS idx_order_reservations_payment_method_type 
ON order_reservations(payment_method_type);

-- Add comment explaining the difference
COMMENT ON COLUMN order_reservations.order_type IS 
'producer: reservation that goes on a pallet, warehouse: direct B2B order from warehouse';

COMMENT ON COLUMN order_reservations.payment_method_type IS 
'card: payment via card, invoice: payment via invoice (B2B)';
