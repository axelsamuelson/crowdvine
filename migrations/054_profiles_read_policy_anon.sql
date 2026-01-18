-- Allow anonymous users to read profiles (public profiles)
DO $$
BEGIN
  CREATE POLICY "profiles_read_anon" ON profiles
    FOR SELECT
    TO anon
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
