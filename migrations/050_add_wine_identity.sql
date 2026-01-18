-- Add wine_identity column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS wine_identity JSONB;

-- Add index for wine identity queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_wine_identity ON profiles USING gin(wine_identity) WHERE wine_identity IS NOT NULL;




