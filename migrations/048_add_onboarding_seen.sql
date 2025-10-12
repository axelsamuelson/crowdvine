-- Migration 048: Add onboarding_seen flag to profiles

-- Add column to track if user has seen onboarding
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_seen BOOLEAN DEFAULT FALSE;

-- Set existing users to true (they don't need to see it)
UPDATE profiles
SET onboarding_seen = TRUE
WHERE created_at < NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_seen ON profiles(onboarding_seen);
