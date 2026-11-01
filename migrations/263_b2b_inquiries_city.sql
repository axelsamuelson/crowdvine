-- Add delivery city (Ort) for Dirtywine B2B inquiries.

ALTER TABLE public.b2b_inquiries
  ADD COLUMN IF NOT EXISTS city text;

COMMENT ON COLUMN public.b2b_inquiries.city IS
  'Delivery city (Ort), paired with postal_code on the inquiry form.';

-- Backfill empty for existing rows; new submits require a non-empty city via API.
UPDATE public.b2b_inquiries
SET city = ''
WHERE city IS NULL;

ALTER TABLE public.b2b_inquiries
  ALTER COLUMN city SET DEFAULT '';

ALTER TABLE public.b2b_inquiries
  ALTER COLUMN city SET NOT NULL;
