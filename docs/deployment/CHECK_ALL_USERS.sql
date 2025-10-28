-- Check how many unique users with events exist
-- This will help us understand if there really are only 6 users

-- Count unique users with events
SELECT 
  COUNT(DISTINCT user_id) as total_users_with_events
FROM user_events
WHERE user_id IS NOT NULL;

-- List all unique users with their details
SELECT 
  ue.user_id,
  p.full_name,
  p.email,
  COUNT(DISTINCT DATE(ue.created_at)) as days_active,
  COUNT(*) as total_events,
  MIN(ue.created_at) as first_event,
  MAX(ue.created_at) as last_event
FROM user_events ue
LEFT JOIN profiles p ON p.id = ue.user_id
WHERE ue.user_id IS NOT NULL
GROUP BY ue.user_id, p.full_name, p.email
ORDER BY total_events DESC;

