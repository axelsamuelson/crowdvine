-- Dirty Wine default momsregistreringsnummer on invoice sender defaults
UPDATE invoice_sender_defaults
SET
  vat_number = 'SE94040253301',
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
