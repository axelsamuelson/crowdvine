-- Create access_requests table
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Allow public insert for access requests
CREATE POLICY "Allow public insert access requests" ON access_requests
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read all access requests (for admin)
CREATE POLICY "Allow authenticated users to read access requests" ON access_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to read all access requests (for admin API)
CREATE POLICY "Allow service role to read access requests" ON access_requests
  FOR SELECT USING (auth.role() = 'service_role');

-- Allow service role to update access requests (for admin API)
CREATE POLICY "Allow service role to update access requests" ON access_requests
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_access_requests_updated_at();
