-- Create wine_images table to support multiple images per wine
CREATE TABLE wine_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wine_images_wine_id ON wine_images(wine_id);
CREATE INDEX idx_wine_images_sort_order ON wine_images(wine_id, sort_order);
CREATE INDEX idx_wine_images_primary ON wine_images(wine_id, is_primary);

-- Migrate existing label_image_path data to wine_images table
INSERT INTO wine_images (wine_id, image_path, alt_text, sort_order, is_primary)
SELECT 
    id as wine_id,
    label_image_path as image_path,
    CONCAT(wine_name, ' ', vintage) as alt_text,
    0 as sort_order,
    TRUE as is_primary
FROM wines 
WHERE label_image_path IS NOT NULL AND label_image_path != '';

-- Add constraint to ensure only one primary image per wine
CREATE UNIQUE INDEX idx_wine_images_unique_primary ON wine_images(wine_id) WHERE is_primary = TRUE;

-- Add trigger to automatically set updated_at
CREATE OR REPLACE FUNCTION update_wine_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wine_images_updated_at
    BEFORE UPDATE ON wine_images
    FOR EACH ROW
    EXECUTE FUNCTION update_wine_images_updated_at();
