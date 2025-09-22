-- Create invitation_codes table for user invitations
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL, -- 20-character invitation code
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES profiles(id),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by ON invitation_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires_at ON invitation_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_is_active ON invitation_codes(is_active);

-- Enable RLS
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create invitations
CREATE POLICY "Allow authenticated users to create invitations" ON invitation_codes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL
    )
  );

-- Allow authenticated users to read their own invitations
CREATE POLICY "Allow users to read their own invitations" ON invitation_codes
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = created_by OR auth.uid() = used_by)
  );

-- Allow public to validate invitation codes (for signup flow)
CREATE POLICY "Allow public to validate invitation codes" ON invitation_codes
  FOR SELECT USING (
    is_active = TRUE AND 
    (expires_at IS NULL OR expires_at > NOW()) AND
    (max_uses IS NULL OR current_uses < max_uses)
  );

-- Allow authenticated users to update invitation usage
CREATE POLICY "Allow users to update invitation usage" ON invitation_codes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = created_by OR auth.uid() = used_by)
  );

-- Function to generate random invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..20 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to use an invitation code
CREATE OR REPLACE FUNCTION use_invitation_code(
  invitation_code TEXT,
  user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find the invitation code
  SELECT * INTO invitation_record
  FROM invitation_codes
  WHERE code = invitation_code
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update the invitation record
  UPDATE invitation_codes
  SET used_at = NOW(),
      used_by = user_id,
      current_uses = current_uses + 1
  WHERE id = invitation_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
