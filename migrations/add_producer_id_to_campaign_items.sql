-- Migration: Add producer_id to campaign_items table
-- Date: 2025-01-02

-- Add producer_id column to campaign_items table
ALTER TABLE campaign_items
ADD COLUMN producer_id UUID REFERENCES producers(id);

-- Create index for better performance
CREATE INDEX idx_campaign_items_producer_id ON campaign_items(producer_id);

-- Update existing wines to have a default producer (if any exist)
-- This assumes you have at least one producer in the database
-- If no producers exist, you'll need to create one first
UPDATE campaign_items 
SET producer_id = (SELECT id FROM producers LIMIT 1)
WHERE producer_id IS NULL;

-- Make producer_id NOT NULL after setting default values
ALTER TABLE campaign_items
ALTER COLUMN producer_id SET NOT NULL;
