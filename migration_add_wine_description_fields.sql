-- Add description fields to wines table
ALTER TABLE wines ADD COLUMN description TEXT;
ALTER TABLE wines ADD COLUMN description_html TEXT;

-- Add indexes for description fields
CREATE INDEX idx_wines_description ON wines(description);
CREATE INDEX idx_wines_description_html ON wines(description_html);
