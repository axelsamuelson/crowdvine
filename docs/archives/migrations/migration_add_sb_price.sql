-- Add sb_price column to wines table
-- This column will store the calculated Systembolaget price

ALTER TABLE wines 
ADD COLUMN sb_price DECIMAL(10,2);

-- Add comment to explain the column
COMMENT ON COLUMN wines.sb_price IS 'Calculated Systembolaget price based on supplier price with markup, alcohol tax, and VAT';

-- Create index for better query performance
CREATE INDEX idx_wines_sb_price ON wines(sb_price);
