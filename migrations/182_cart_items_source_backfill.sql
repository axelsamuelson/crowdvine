-- Backfill null cart_items.source to B2C default. Leave warehouse rows untouched.
UPDATE public.cart_items
SET source = 'producer'
WHERE source IS NULL;
