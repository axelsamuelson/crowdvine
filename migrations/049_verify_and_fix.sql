-- Verify and fix data after migration 049
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: UPDATE NULL VALUES
-- ============================================

-- Set default status for existing pallets
UPDATE pallets
SET 
  status = 'open',
  is_complete = FALSE
WHERE status IS NULL OR is_complete IS NULL;

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
-- STEP 2: VERIFY COLUMNS EXIST
-- ============================================

-- Check pallets columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pallets'
AND column_name IN ('status', 'is_complete', 'completed_at', 'payment_deadline')
ORDER BY column_name;

-- Check order_reservations columns  
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'order_reservations'
AND column_name IN ('payment_status', 'payment_intent_id', 'payment_link', 'payment_deadline')
ORDER BY column_name;

-- ============================================
-- STEP 3: CHECK PALLET CAPACITY VS RESERVATIONS
-- ============================================

-- Show pallets with their fill status
SELECT 
  p.id,
  p.name,
  p.status,
  p.is_complete,
  p.bottle_capacity,
  COUNT(DISTINCT r.id) as reservation_count,
  COALESCE(SUM(
    (SELECT SUM(quantity) 
     FROM order_reservation_items ori 
     WHERE ori.reservation_id = r.id)
  ), 0) as total_bottles_reserved,
  ROUND(
    COALESCE(SUM(
      (SELECT SUM(quantity) 
       FROM order_reservation_items ori 
       WHERE ori.reservation_id = r.id)
    ), 0)::numeric / NULLIF(p.bottle_capacity, 0) * 100, 
    1
  ) as fill_percentage
FROM pallets p
LEFT JOIN order_reservations r ON r.pallet_id = p.id
  AND r.status IN ('placed', 'pending_payment', 'confirmed')
GROUP BY p.id, p.name, p.status, p.is_complete, p.bottle_capacity
ORDER BY fill_percentage DESC NULLS LAST;

-- ============================================
-- STEP 4: CHECK RESERVATION PAYMENT STATUS
-- ============================================

-- Count reservations by status and payment_status
SELECT 
  r.status,
  r.payment_status,
  COUNT(*) as count,
  COUNT(r.payment_link) as with_payment_link
FROM order_reservations r
GROUP BY r.status, r.payment_status
ORDER BY r.status, r.payment_status;

-- ============================================
-- STEP 5: SHOW RECENT RESERVATIONS
-- ============================================

-- Show latest reservations with their bottle counts
SELECT 
  r.id,
  r.status,
  r.payment_status,
  r.pallet_id,
  p.name as pallet_name,
  (SELECT SUM(quantity) 
   FROM order_reservation_items ori 
   WHERE ori.reservation_id = r.id) as bottle_count,
  r.payment_link IS NOT NULL as has_payment_link,
  r.payment_deadline,
  r.created_at
FROM order_reservations r
LEFT JOIN pallets p ON p.id = r.pallet_id
ORDER BY r.created_at DESC
LIMIT 20;

-- ============================================
-- EXPECTED RESULTS
-- ============================================

-- After this SQL:
-- 1. All pallets should have status='open' and is_complete=FALSE (unless manually set)
-- 2. All order_reservations should have a payment_status
-- 3. You should see which pallets are near or at capacity
-- 4. Ready to run /api/admin/pallets/check-completion to trigger payment flow

