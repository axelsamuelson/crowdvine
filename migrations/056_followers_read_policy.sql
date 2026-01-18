-- Allow reading followers relationships (so profiles can show followers/following lists)
-- NOTE: Only applies if RLS is enabled on the followers table.
DO $$
BEGIN
  CREATE POLICY "followers_read_anon" ON followers
    FOR SELECT
    TO anon
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "followers_read_authenticated" ON followers
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


