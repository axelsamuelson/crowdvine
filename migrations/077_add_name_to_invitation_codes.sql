-- Add name column to invitation_codes table
ALTER TABLE invitation_codes
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Add index for name lookups
CREATE INDEX IF NOT EXISTS idx_invitation_codes_name ON invitation_codes(name);

COMMENT ON COLUMN invitation_codes.name IS 'Optional name/description for the invitation code';
