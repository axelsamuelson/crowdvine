-- Create wine_boxes table
CREATE TABLE IF NOT EXISTS wine_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  handle VARCHAR(255) UNIQUE NOT NULL,
  margin_percentage DECIMAL(5,2) DEFAULT 0.00, -- Margin percentage for the box
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wine_box_items table to link wines to boxes
CREATE TABLE IF NOT EXISTS wine_box_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_box_id UUID NOT NULL REFERENCES wine_boxes(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wine_box_id, wine_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wine_boxes_handle ON wine_boxes(handle);
CREATE INDEX IF NOT EXISTS idx_wine_boxes_active ON wine_boxes(is_active);
CREATE INDEX IF NOT EXISTS idx_wine_box_items_box_id ON wine_box_items(wine_box_id);
CREATE INDEX IF NOT EXISTS idx_wine_box_items_wine_id ON wine_box_items(wine_id);

-- Insert some sample wine boxes (without hardcoded prices)
INSERT INTO wine_boxes (name, description, handle, margin_percentage, image_url) VALUES
('Organic Discovery Box', '3 carefully selected organic wines from our finest producers', 'organic-discovery-box', 15.00, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop'),
('Light Reds Collection', '6 elegant light red wines perfect for any occasion', 'light-reds-collection', 12.00, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b5d?w=600&h=600&fit=crop'),
('Pet-Nat Adventure', '3 natural sparkling wines with unique character and bubbles', 'pet-nat-adventure', 18.00, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=600&fit=crop'),
('Premium Mixed Box', '6 exceptional wines showcasing the best of all our producers', 'premium-mixed-box', 10.00, 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=600&fit=crop')
ON CONFLICT (handle) DO NOTHING;
