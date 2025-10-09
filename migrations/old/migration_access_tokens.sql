-- Create access_tokens table for signup links
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Create access_tokens table
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_email ON access_tokens(email);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at);

-- Enable RLS
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public insert for creating tokens
CREATE POLICY "Allow public insert access tokens" ON access_tokens
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read tokens (for validation)
CREATE POLICY "Allow authenticated users to read tokens" ON access_tokens
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update tokens (for marking as used)
CREATE POLICY "Allow authenticated users to update tokens" ON access_tokens
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to clean up expired tokens (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_access_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM access_tokens 
  WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;
