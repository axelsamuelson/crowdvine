-- Create invitation_codes table
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Create invitation_codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  created_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_email ON invitation_codes(email);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_is_active ON invitation_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires_at ON invitation_codes(expires_at);

-- Enable RLS
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read invitation codes (for admin)
CREATE POLICY "Allow authenticated users to read invitation codes" ON invitation_codes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert invitation codes (for admin)
CREATE POLICY "Allow authenticated users to insert invitation codes" ON invitation_codes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update invitation codes (for admin)
CREATE POLICY "Allow authenticated users to update invitation codes" ON invitation_codes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow public to validate invitation codes (for signup)
CREATE POLICY "Allow public to validate invitation codes" ON invitation_codes
  FOR SELECT USING (is_active = TRUE AND expires_at > NOW());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invitation_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_invitation_codes_updated_at
  BEFORE UPDATE ON invitation_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_codes_updated_at();

-- Create function to clean up expired invitation codes
CREATE OR REPLACE FUNCTION cleanup_expired_invitation_codes()
RETURNS void AS $$
BEGIN
  UPDATE invitation_codes 
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 20-character random code
    new_code := substring(md5(random()::text || clock_timestamp()::text) from 1 for 20);
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM invitation_codes WHERE code = new_code) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
