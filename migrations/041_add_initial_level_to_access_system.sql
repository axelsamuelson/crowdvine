-- Migration: Add initial_level to access_requests and access_tokens tables
-- This allows admins to specify the membership level when approving access requests

-- Add initial_level column to access_requests table
ALTER TABLE access_requests 
ADD COLUMN IF NOT EXISTS initial_level VARCHAR(20) DEFAULT 'basic';

-- Add comment to explain the column
COMMENT ON COLUMN access_requests.initial_level IS 'The membership level to assign when user completes signup (basic, brons, silver, guld)';

-- Add initial_level column to access_tokens table  
ALTER TABLE access_tokens 
ADD COLUMN IF NOT EXISTS initial_level VARCHAR(20) DEFAULT 'basic';

-- Add comment to explain the column
COMMENT ON COLUMN access_tokens.initial_level IS 'The membership level to assign when user uses this token to signup (basic, brons, silver, guld)';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_access_requests_initial_level ON access_requests(initial_level);
CREATE INDEX IF NOT EXISTS idx_access_tokens_initial_level ON access_tokens(initial_level);

