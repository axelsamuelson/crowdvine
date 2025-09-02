-- Replace campaigns and campaign_items with wines table
CREATE TABLE wines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle VARCHAR(255) UNIQUE NOT NULL,
    wine_name VARCHAR(255) NOT NULL,
    vintage VARCHAR(10) NOT NULL,
    grape_varieties TEXT,
    color VARCHAR(50),
    label_image_path TEXT,
    base_price_cents INTEGER NOT NULL,
    producer_id UUID NOT NULL REFERENCES producers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wines_producer_id ON wines(producer_id);
CREATE INDEX idx_wines_handle ON wines(handle);
CREATE INDEX idx_wines_vintage ON wines(vintage);
CREATE INDEX idx_wines_color ON wines(color);

-- Migrate existing data
INSERT INTO wines (id, handle, wine_name, vintage, grape_varieties, color, label_image_path, base_price_cents, producer_id, created_at, updated_at)
SELECT ci.id, ci.handle, ci.wine_name, ci.vintage, ci.grape_varieties, ci.color, ci.label_image_path, ci.base_price_cents, COALESCE(ci.producer_id, c.producer_id), ci.created_at, ci.updated_at
FROM campaign_items ci
LEFT JOIN campaigns c ON ci.campaign_id = c.id;

-- Drop old tables
DROP TABLE campaign_items;
DROP TABLE campaigns;
