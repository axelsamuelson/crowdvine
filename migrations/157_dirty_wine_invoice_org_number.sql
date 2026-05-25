-- Dirty Wine default organisationsnummer on invoice sender defaults
UPDATE invoice_sender_defaults
SET
  org_number = '19940402-5133',
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
