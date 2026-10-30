-- Fix RLS policies for access_requests table
-- This allows admin users to update access requests

-- First, let's check if RLS is enabled
-- ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admin users to update access requests
-- We'll use a simple approach: allow updates if the user has admin role in profiles table
CREATE POLICY "Allow admin users to update access requests" ON access_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Also allow admin users to read access requests
CREATE POLICY "Allow admin users to read access requests" ON access_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow admin users to delete access requests
CREATE POLICY "Allow admin users to delete access requests" ON access_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow public to insert access requests (for the access request form)
CREATE POLICY "Allow public to insert access requests" ON access_requests
  FOR INSERT WITH CHECK (true);
