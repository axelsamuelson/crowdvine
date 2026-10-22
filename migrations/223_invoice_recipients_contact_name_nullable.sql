-- contact_name is deprecated. Contacts live in invoice_recipient_contacts.
-- The column stays so existing readers do not break, but it must accept NULL
-- so a recipient can be saved without a contact name.
ALTER TABLE invoice_recipients ALTER COLUMN contact_name DROP NOT NULL;
