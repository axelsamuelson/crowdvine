-- Add description and avatar_image_path columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS avatar_image_path TEXT;

-- Add index for avatar lookups if needed
CREATE INDEX IF NOT EXISTS idx_profiles_avatar ON profiles(avatar_image_path) WHERE avatar_image_path IS NOT NULL;


