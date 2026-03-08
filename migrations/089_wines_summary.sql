-- Add summary column to wines (short text for PDP white box; description remains the long text)
ALTER TABLE wines
ADD COLUMN IF NOT EXISTS summary text;

COMMENT ON COLUMN wines.summary IS 'Short summary shown in PDP white box; description is the longer text shown above Price breakdown.';
