-- ===========================================
-- Fix Product View Events - SAFE VERSION
-- ===========================================
-- Run queries step by step
-- ===========================================

-- STEP 1: See what events we have
SELECT 
  event_type,
  COUNT(*) as count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM user_events
WHERE event_type IN ('product_viewed', 'product_list_viewed')
GROUP BY event_type
ORDER BY event_type;

-- STEP 2: See PLP events that will be converted (those NOT from /product/ URLs)
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
  AND (page_url IS NULL OR page_url NOT LIKE '%/product/%')
ORDER BY created_at DESC
LIMIT 20;

-- STEP 3: See PDP events that will KEEP product_viewed (from /product/ URLs)
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
  AND page_url LIKE '%/product/%'
ORDER BY created_at DESC
LIMIT 20;

-- STEP 4: Preview how many will be changed
SELECT COUNT(*) as will_be_converted
FROM user_events
WHERE event_type = 'product_viewed'
  AND (page_url IS NULL OR page_url NOT LIKE '%/product/%');

-- STEP 5: After reviewing above, run the update:
-- This converts PLP events ONLY
UPDATE user_events
SET 
  event_type = 'product_list_viewed',
  event_metadata = COALESCE(event_metadata, '{}'::jsonb) || jsonb_build_object(
    'converted_from', 'product_viewed',
    'original_event_type', 'product_viewed',
    'converted_at', NOW()::text
  )
WHERE event_type = 'product_viewed'
  AND (page_url IS NULL OR page_url NOT LIKE '%/product/%');

-- STEP 6: Verify the results
SELECT 
  event_type,
  COUNT(*) as count
FROM user_events
WHERE event_type IN ('product_viewed', 'product_list_viewed')
GROUP BY event_type
ORDER BY event_type;

-- STEP 7: Check that PDP events (from /product/) are still product_viewed
SELECT COUNT(*) as pdp_events_still_product_viewed
FROM user_events
WHERE event_type = 'product_viewed'
  AND page_url LIKE '%/product/%';

