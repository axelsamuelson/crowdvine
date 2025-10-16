-- System Audit: Database Schema Verification
-- This script verifies the payment-when-pallet-fills system schema

-- 1. Verify pallets columns
SELECT 
  'pallets' as table_name,
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pallets'
AND column_name IN ('status', 'is_complete', 'completed_at', 'payment_deadline')
ORDER BY column_name;

-- 2. Verify order_reservations columns
SELECT 
  'order_reservations' as table_name,
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'order_reservations'
AND column_name IN ('payment_status', 'payment_intent_id', 'payment_link', 'payment_deadline')
ORDER BY column_name;

-- 3. Check data integrity - reservations
SELECT 
  'Data Integrity Check' as check_type,
  COUNT(*) as total_reservations,
  COUNT(payment_status) as with_payment_status,
  COUNT(payment_link) as with_payment_link,
  SUM(CASE WHEN status = 'pending_payment' AND payment_link IS NULL THEN 1 ELSE 0 END) as missing_links,
  SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as pending_payment_count
FROM order_reservations;

-- 4. Check data integrity - pallets
SELECT 
  'Pallets Integrity Check' as check_type,
  COUNT(*) as total_pallets,
  COUNT(status) as with_status,
  COUNT(is_complete) as with_is_complete,
  SUM(CASE WHEN is_complete = true THEN 1 ELSE 0 END) as completed_pallets
FROM pallets;

-- 5. Sample recent reservations with payment status
SELECT 
  id,
  status,
  payment_status,
  CASE WHEN payment_link IS NOT NULL THEN 'Has Link' ELSE 'No Link' END as link_status,
  payment_deadline,
  created_at
FROM order_reservations
ORDER BY created_at DESC
LIMIT 10;

-- 6. Sample pallets with completion status
SELECT 
  id,
  name,
  status,
  is_complete,
  completed_at,
  bottle_capacity,
  current_bottles,
  ROUND((current_bottles::float / bottle_capacity * 100)::numeric, 1) as percent_filled
FROM pallets
ORDER BY updated_at DESC
LIMIT 10;
