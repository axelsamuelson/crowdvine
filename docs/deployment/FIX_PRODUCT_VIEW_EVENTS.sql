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

-- Step 3: UPDATE product_viewed to product_list_viewed
-- Only convert events from PLP pages (where page_url does NOT contain '/product/')
-- Events with '/product/' in URL are actual PDP views and should remain as product_viewed
-- 
-- IMPORTANT: Review Step 2 output above before running this!
-- This will convert only PLP events (those NOT from /product/ URLs)
-- 
-- To run the update, execute the following:
UPDATE user_events
SET 
  event_type = 'product_list_viewed',
  event_metadata = COALESCE(event_metadata, '{}'::jsonb) || jsonb_build_object(
    'converted_from', 'product_viewed',
    'original_event_type', 'product_viewed'
  )
WHERE event_type = 'product_viewed'
  AND (page_url IS NULL OR page_url NOT LIKE '%/product/%');

-- Step 4: Verify the update (run AFTER the UPDATE above)
SELECT 
  event_type,
  COUNT(*) as count
FROM user_events
WHERE event_type IN ('product_viewed', 'product_list_viewed')
GROUP BY event_type
ORDER BY event_type;

-- IMPORTANT NOTES:
-- 1. This will ONLY convert product_viewed events from PLP pages (not from /product/ URLs)
-- 2. Events where page_url contains '/product/' will remain as product_viewed (they are correct)
-- 3. This is safe because ProductCard tracking was only added to PLP pages, not PDP pages
-- 4. New events from now on will be correctly tracked automatically
-- 5. Always review the SELECT queries before running the UPDATE
-- 6. Consider backing up your data first: 
--    SELECT * FROM user_events WHERE event_type = 'product_viewed';

