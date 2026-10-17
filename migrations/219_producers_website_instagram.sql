ALTER TABLE public.producers
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS links_verified_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'producers_website_url_format') THEN
    ALTER TABLE public.producers ADD CONSTRAINT producers_website_url_format
      CHECK (website_url IS NULL OR website_url ~* '^https?://[^\s]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'producers_instagram_handle_format') THEN
    ALTER TABLE public.producers ADD CONSTRAINT producers_instagram_handle_format
      CHECK (instagram_handle IS NULL OR instagram_handle ~ '^[a-z0-9._]{1,30}$');
  END IF;
END $$;
