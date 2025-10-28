-- Check what columns exist in wines table
-- Run this first to see the current structure

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'wines' 
ORDER BY ordinal_position;
