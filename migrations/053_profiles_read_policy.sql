-- Allow authenticated users to read profiles (if RLS is enabled)
DO $$
BEGIN
  CREATE POLICY "profiles_read_authenticated" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
