-- Create structured grape varieties and colors system
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Create grape_varieties table
CREATE TABLE IF NOT EXISTS grape_varieties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wine_colors table
CREATE TABLE IF NOT EXISTS wine_colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  hex_color VARCHAR(7) DEFAULT '#000000', -- For UI display
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wine_grape_varieties junction table (many-to-many)
CREATE TABLE IF NOT EXISTS wine_grape_varieties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  grape_variety_id UUID NOT NULL REFERENCES grape_varieties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wine_id, grape_variety_id)
);

-- Insert default grape varieties
INSERT INTO grape_varieties (name, description) VALUES
('Carignan', 'Full-bodied red wine grape variety'),
('Massanne', 'Medium-bodied white wine grape variety'),
('Rousanne', 'Full-bodied white wine grape variety'),
('Vermentino', 'Light to medium-bodied white wine grape variety'),
('Muscat', 'Aromatic white wine grape variety'),
('Syrah', 'Full-bodied red wine grape variety'),
('Grenache', 'Medium to full-bodied red wine grape variety'),
('Mourvèdre', 'Full-bodied red wine grape variety'),
('Cabernet Sauvignon', 'Full-bodied red wine grape variety'),
('Merlot', 'Medium to full-bodied red wine grape variety'),
('Pinot Noir', 'Light to medium-bodied red wine grape variety'),
('Chardonnay', 'Full-bodied white wine grape variety'),
('Sauvignon Blanc', 'Light to medium-bodied white wine grape variety'),
('Pinot Grigio', 'Light-bodied white wine grape variety'),
('Riesling', 'Light to medium-bodied white wine grape variety'),
('Viognier', 'Full-bodied white wine grape variety'),
('Pinot Blanc', 'Light-bodied white wine grape variety'),
('Gewürztraminer', 'Medium-bodied white wine grape variety'),
('Chenin Blanc', 'Light to medium-bodied white wine grape variety'),
('Semillon', 'Medium-bodied white wine grape variety'),
('Tempranillo', 'Medium-bodied red wine grape variety'),
('Nebbiolo', 'Full-bodied red wine grape variety'),
('Sangiovese', 'Medium-bodied red wine grape variety'),
('Malbec', 'Full-bodied red wine grape variety'),
('Carménère', 'Medium to full-bodied red wine grape variety')
ON CONFLICT (name) DO NOTHING;

-- Insert default wine colors
INSERT INTO wine_colors (name, hex_color, description) VALUES
('Red', '#8B0000', 'Red wine color'),
('White', '#F5F5DC', 'White wine color'),
('Rosé', '#FFB6C1', 'Rosé wine color'),
('Orange', '#FFA500', 'Orange wine color'),
('Sparkling', '#F0F8FF', 'Sparkling wine color')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wine_grape_varieties_wine_id ON wine_grape_varieties(wine_id);
CREATE INDEX IF NOT EXISTS idx_wine_grape_varieties_grape_variety_id ON wine_grape_varieties(grape_variety_id);

-- Enable RLS
ALTER TABLE grape_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE wine_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE wine_grape_varieties ENABLE ROW LEVEL SECURITY;

-- Allow public read access to grape varieties and colors
CREATE POLICY "Allow public read access to grape varieties" ON grape_varieties
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to wine colors" ON wine_colors
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to wine grape varieties" ON wine_grape_varieties
  FOR SELECT USING (true);

-- Allow authenticated users to manage grape varieties and colors (for admin)
CREATE POLICY "Allow authenticated users to manage grape varieties" ON grape_varieties
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage wine colors" ON wine_colors
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage wine grape varieties" ON wine_grape_varieties
  FOR ALL USING (auth.role() = 'authenticated');

-- Create function to get wine with grape varieties and color
CREATE OR REPLACE FUNCTION get_wine_with_details(wine_id UUID)
RETURNS TABLE (
  id UUID,
  wine_name VARCHAR,
  vintage INTEGER,
  grape_varieties TEXT[],
  color_name VARCHAR,
  color_hex VARCHAR,
  producer_name VARCHAR,
  base_price_cents INTEGER,
  calculated_price_cents INTEGER,
  band VARCHAR,
  handle VARCHAR,
  label_image_path TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.wine_name,
    w.vintage,
    ARRAY_AGG(DISTINCT gv.name) FILTER (WHERE gv.name IS NOT NULL) as grape_varieties,
    wc.name as color_name,
    wc.hex_color as color_hex,
    p.name as producer_name,
    w.base_price_cents,
    w.calculated_price_cents,
    w.band,
    w.handle,
    w.label_image_path,
    w.description,
    w.created_at,
    w.updated_at
  FROM wines w
  LEFT JOIN producers p ON w.producer_id = p.id
  LEFT JOIN wine_colors wc ON w.color = wc.name
  LEFT JOIN wine_grape_varieties wgv ON w.id = wgv.wine_id
  LEFT JOIN grape_varieties gv ON wgv.grape_variety_id = gv.id
  WHERE w.id = wine_id
  GROUP BY w.id, w.wine_name, w.vintage, wc.name, wc.hex_color, p.name, 
           w.base_price_cents, w.calculated_price_cents, w.band, w.handle, 
           w.label_image_path, w.description, w.created_at, w.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to get all wines with details
CREATE OR REPLACE FUNCTION get_all_wines_with_details()
RETURNS TABLE (
  id UUID,
  wine_name VARCHAR,
  vintage INTEGER,
  grape_varieties TEXT[],
  color_name VARCHAR,
  color_hex VARCHAR,
  producer_name VARCHAR,
  base_price_cents INTEGER,
  calculated_price_cents INTEGER,
  band VARCHAR,
  handle VARCHAR,
  label_image_path TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.wine_name,
    w.vintage,
    ARRAY_AGG(DISTINCT gv.name) FILTER (WHERE gv.name IS NOT NULL) as grape_varieties,
    wc.name as color_name,
    wc.hex_color as color_hex,
    p.name as producer_name,
    w.base_price_cents,
    w.calculated_price_cents,
    w.band,
    w.handle,
    w.label_image_path,
    w.description,
    w.created_at,
    w.updated_at
  FROM wines w
  LEFT JOIN producers p ON w.producer_id = p.id
  LEFT JOIN wine_colors wc ON w.color = wc.name
  LEFT JOIN wine_grape_varieties wgv ON w.id = wgv.wine_id
  LEFT JOIN grape_varieties gv ON wgv.grape_variety_id = gv.id
  GROUP BY w.id, w.wine_name, w.vintage, wc.name, wc.hex_color, p.name, 
           w.base_price_cents, w.calculated_price_cents, w.band, w.handle, 
           w.label_image_path, w.description, w.created_at, w.updated_at
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql;
