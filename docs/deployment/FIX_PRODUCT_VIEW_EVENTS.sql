-- ===========================================
-- Fix Product View Events
-- Convert incorrectly tagged product_viewed events
-- ===========================================

-- This script converts product_viewed events to product_list_viewed
-- for events that were incorrectly tagged when browsing PLP (Product List Pages)

-- ===========================================
-- Fix Product View Events Migration
-- ===========================================
-- This script helps identify and convert incorrectly tagged
-- product_viewed events to product_list_viewed

-- Step 1: Check current state
SELECT 
  event_type,
  COUNT(*) as count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM user_events
WHERE event_type IN ('product_viewed', 'product_list_viewed')
GROUP BY event_type
ORDER BY event_type;

-- Step 2: Show all product_viewed events for review
SELECT 
  id,
  user_id,
  session_id,
  event_type,
  event_metadata,
  page_url,
  created_at
FROM user_events
WHERE event_type = 'product_viewed'
ORDER BY created_at DESC;

-- Step 3: UPDATE ALL product_viewed to product_list_viewed
-- Since ProductCard was used on PLP pages, all existing product_viewed
-- events were actually from viewing product lists, not individual products
-- Uncomment the lines below to run the update

-- UPDATE user_events
-- SET 
--   event_type = 'product_list_viewed',
--   event_metadata = event_metadata || jsonb_build_object(
--     'converted_from', 'product_viewed',
--     'original_event_type', 'product_viewed'
--   )
-- WHERE event_type = 'product_viewed';

-- Step 4: Verify the update (run AFTER the UPDATE above)
SELECT 
  event_type,
  COUNT(*) as count
FROM user_events
WHERE event_type IN ('product_viewed', 'product_list_viewed')
GROUP BY event_type
ORDER BY event_type;

-- IMPORTANT NOTES:
-- 1. This will convert ALL existing product_viewed events to product_list_viewed
-- 2. This is safe because ProductCard tracking was only added to PLP pages
-- 3. New product_viewed events from PDP pages will be correctly tracked
-- 4. Always review the SELECT queries before running the UPDATE
-- 5. Consider backing up your data first: 
--    SELECT * FROM user_events WHERE event_type = 'product_viewed';

