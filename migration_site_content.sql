-- Create content management table
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Create content table for managing site content
CREATE TABLE IF NOT EXISTS site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'url', 'phone', 'coordinates'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default content
INSERT INTO site_content (key, value, type, description) VALUES
('header_logo', '', 'image', 'Logo displayed in header'),
('footer_logo', '', 'image', 'Logo displayed in footer'),
('homepage_title', 'Välkommen till CrowdVine', 'text', 'Main title on homepage'),
('homepage_subtitle', 'Upptäck exklusiva viner från världens bästa producenter', 'text', 'Subtitle on homepage'),
('homepage_description', 'Vi samlar vinälskare för att köpa exklusiva viner direkt från producenter. Genom att samla beställningar kan vi erbjuda fantastiska priser på högkvalitativa viner.', 'text', 'Main description on homepage'),
('instagram_url', 'https://instagram.com/crowdvine', 'url', 'Instagram profile URL'),
('phone_number', '+46 70 123 45 67', 'phone', 'Contact phone number'),
('address', 'Stockholm, Sverige', 'text', 'Company address'),
('coordinates_lat', '59.3293', 'coordinates', 'Latitude coordinate'),
('coordinates_lng', '18.0686', 'coordinates', 'Longitude coordinate'),
('email', 'info@crowdvine.se', 'text', 'Contact email address')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(key);

-- Enable RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access to content
CREATE POLICY "Allow public read access to site content" ON site_content
  FOR SELECT USING (true);

-- Allow authenticated users to update content (for admin)
CREATE POLICY "Allow authenticated users to update site content" ON site_content
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert content (for admin)
CREATE POLICY "Allow authenticated users to insert site content" ON site_content
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create function to update content
CREATE OR REPLACE FUNCTION update_site_content(
  content_key VARCHAR,
  content_value TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE site_content 
  SET value = content_value, updated_at = NOW()
  WHERE key = content_key;
  
  IF NOT FOUND THEN
    INSERT INTO site_content (key, value, updated_at)
    VALUES (content_key, content_value, NOW());
  END IF;
END;
$$ LANGUAGE plpgsql;
