-- Add cover image path to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cover_image_path TEXT;



