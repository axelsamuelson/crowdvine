-- Migrate existing wines to use structured grape varieties
-- Kör denna SQL i Supabase Dashboard -> SQL Editor efter att ha kört migration_structured_grape_varieties.sql

-- Function to find or create grape variety
CREATE OR REPLACE FUNCTION find_or_create_grape_variety(grape_name TEXT)
RETURNS UUID AS $$
DECLARE
  grape_id UUID;
BEGIN
  -- Try to find existing grape variety
  SELECT id INTO grape_id 
  FROM grape_varieties 
  WHERE LOWER(name) = LOWER(grape_name);
  
  -- If not found, create new one
  IF grape_id IS NULL THEN
    INSERT INTO grape_varieties (name, description)
    VALUES (grape_name, 'Imported grape variety')
    RETURNING id INTO grape_id;
  END IF;
  
  RETURN grape_id;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing wines to use structured grape varieties
DO $$
DECLARE
  wine_record RECORD;
  grape_names TEXT[];
  grape_name TEXT;
  grape_variety_uuid UUID;
BEGIN
  -- Loop through all wines
  FOR wine_record IN 
    SELECT id, grape_varieties 
    FROM wines 
    WHERE grape_varieties IS NOT NULL AND grape_varieties != ''
  LOOP
    -- Split grape_varieties by comma and clean up
    grape_names := string_to_array(trim(wine_record.grape_varieties), ',');
    
    -- Process each grape variety
    FOREACH grape_name IN ARRAY grape_names
    LOOP
      -- Clean up the grape name
      grape_name := trim(grape_name);
      
      -- Skip empty names
      IF grape_name != '' THEN
        -- Find or create grape variety
        grape_variety_uuid := find_or_create_grape_variety(grape_name);
        
        -- Create wine-grape variety relationship
        INSERT INTO wine_grape_varieties (wine_id, grape_variety_id)
        VALUES (wine_record.id, grape_variety_uuid)
        ON CONFLICT (wine_id, grape_variety_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Update wine_colors table to match existing wine colors
INSERT INTO wine_colors (name, hex_color, description) VALUES
('red', '#8B0000', 'Red wine color'),
('white', '#F5F5DC', 'White wine color'),
('rose', '#FFB6C1', 'Rosé wine color')
ON CONFLICT (name) DO NOTHING;

-- Verify migration by checking a few wines
SELECT 
  w.wine_name,
  w.grape_varieties as old_grape_varieties,
  ARRAY_AGG(gv.name) as new_grape_varieties,
  w.color as old_color,
  wc.name as new_color
FROM wines w
LEFT JOIN wine_grape_varieties wgv ON w.id = wgv.wine_id
LEFT JOIN grape_varieties gv ON wgv.grape_variety_id = gv.id
LEFT JOIN wine_colors wc ON w.color = wc.name
GROUP BY w.id, w.wine_name, w.grape_varieties, w.color, wc.name
LIMIT 5;
