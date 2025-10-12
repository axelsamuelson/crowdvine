-- Fix existing data after migration 049
-- Run this in Supabase SQL Editor to update NULL values

-- ============================================
-- 1. UPDATE PALLETS TABLE
-- ============================================

-- Set default status for existing pallets
UPDATE pallets
SET 
  status = 'open',
  is_complete = FALSE
WHERE status IS NULL OR is_complete IS NULL;

-- ============================================
-- 2. UPDATE ORDER_RESERVATIONS TABLE
-- ============================================

-- Set payment_status based on existing status
UPDATE order_reservations
SET payment_status = CASE 
  WHEN status = 'confirmed' THEN 'paid'
  WHEN status = 'pending_payment' THEN 'pending'
  WHEN status = 'placed' THEN 'pending'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END
WHERE payment_status IS NULL;

-- ============================================
-- 3. VERIFY UPDATES
-- ============================================

-- Check pallets
SELECT id, name, status, is_complete, completed_at
FROM pallets
ORDER BY created_at DESC
LIMIT 10;

-- Check reservations with payment status
SELECT 
  id, 
  status, 
  payment_status, 
  payment_link,
  payment_deadline,
  created_at
FROM order_reservations
ORDER BY created_at DESC
LIMIT 20;

-- Count reservations by payment status
SELECT 
  payment_status,
  COUNT(*) as count,
  SUM(quantity) as total_bottles
FROM order_reservations
GROUP BY payment_status;

