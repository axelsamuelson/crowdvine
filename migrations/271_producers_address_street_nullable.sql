-- Admin producer create/edit: street address is optional.
ALTER TABLE producers ALTER COLUMN address_street DROP NOT NULL;
