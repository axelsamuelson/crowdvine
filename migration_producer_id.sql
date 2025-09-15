-- Add producer_id to campaign_items table
ALTER TABLE campaign_items ADD COLUMN producer_id UUID REFERENCES producers(id);
CREATE INDEX idx_campaign_items_producer_id ON campaign_items(producer_id);

-- Update existing wines to have a default producer
UPDATE campaign_items SET producer_id = (SELECT id FROM producers LIMIT 1) WHERE producer_id IS NULL;

-- Make producer_id NOT NULL
ALTER TABLE campaign_items ALTER COLUMN producer_id SET NOT NULL;
