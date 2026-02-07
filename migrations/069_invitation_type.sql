-- Classify invitations as consumer, producer, or business for different invite page designs.
-- Type is fixed per invitation; user cannot switch.
ALTER TABLE invitation_codes
  ADD COLUMN IF NOT EXISTS invitation_type text NOT NULL DEFAULT 'consumer'
  CHECK (invitation_type IN ('consumer', 'producer', 'business'));

COMMENT ON COLUMN invitation_codes.invitation_type IS 'Invitation type: consumer (B2C member), producer (winery), business (B2B). Determines which invite page design and profile setup.';

UPDATE invitation_codes SET invitation_type = 'consumer' WHERE invitation_type IS NULL;
