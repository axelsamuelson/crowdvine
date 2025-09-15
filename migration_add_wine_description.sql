-- Add description field to wines table
ALTER TABLE wines ADD COLUMN description TEXT;

-- Add index for description field
CREATE INDEX idx_wines_description ON wines(description);

-- Update existing wines with basic descriptions based on their properties
UPDATE wines 
SET description = CONCAT(
  'This exceptional ', 
  COALESCE(color, 'wine'), 
  ' wine from ', 
  vintage, 
  ' showcases the unique characteristics of ', 
  COALESCE(grape_varieties, 'carefully selected grapes'), 
  '. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.'
)
WHERE description IS NULL;
