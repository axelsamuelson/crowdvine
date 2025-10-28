-- ===========================================
-- Fix: Convert PDP events BACK to product_viewed
-- ===========================================
-- This fixes events that were incorrectly converted
-- Events from /product/ URLs should be product_viewed, not product_list_viewed
-- ===========================================

-- STEP 1: See PDP events that are incorrectly tagged as product_list_viewed
SELECT 
  id,
  user_id,
  event_type,
  page_url,
  event_metadata,
  created_at
FROM user_events
WHERE event_type = 'product_list_viewed'
  AND page_url LIKE '%/product/%'
ORDER BY created_at DESC
LIMIT 20;

-- STEP 2: Count how many will be fixed
SELECT COUNT(*) as pdp_events_to_fix
FROM user_events
WHERE event_type = 'product_list_viewed'
  AND page_url LIKE '%/product/%';

-- STEP 3: Convert PDP events back to product_viewed
-- This fixes events that were incorrectly converted
UPDATE user_events
SET 
  event_type = 'product_viewed',
  event_metadata = COALESCE(event_metadata, '{}'::jsonb) || jsonb_build_object(
    'fixed_from_product_list_viewed', true,
    'fix_applied_at', NOW()::text
  )
WHERE event_type = 'product_list_viewed'
  AND page_url LIKE '%/product/%';

-- STEP 4: Verify the fix
SELECT 
  event_type,
  COUNT(*) as count
FROM user_events
WHERE event_type IN ('product_viewed', 'product_list_viewed')
GROUP BY event_type
ORDER BY event_type;

-- STEP 5: Verify PDP events are now product_viewed
SELECT 
  event_type,
  COUNT(*) as count
FROM user_events
WHERE page_url LIKE '%/product/%'
  AND event_type IN ('product_viewed', 'product_list_viewed')
GROUP BY event_type
ORDER BY event_type;

