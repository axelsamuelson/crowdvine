-- Create image_backups table for tracking image backups
CREATE TABLE IF NOT EXISTS image_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fileName TEXT NOT NULL,
  originalPath TEXT NOT NULL,
  backupPath TEXT NOT NULL,
  checksum TEXT NOT NULL,
  uploadedAt TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_image_backups_original_path ON image_backups(originalPath);
CREATE INDEX IF NOT EXISTS idx_image_backups_uploaded_at ON image_backups(uploadedAt);
CREATE INDEX IF NOT EXISTS idx_image_backups_checksum ON image_backups(checksum);

-- Create RLS policies
ALTER TABLE image_backups ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage backups
CREATE POLICY "Service role can manage image backups" ON image_backups
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_image_backups_updated_at
  BEFORE UPDATE ON image_backups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up old backups (call this periodically)
CREATE OR REPLACE FUNCTION cleanup_old_image_backups(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM image_backups 
  WHERE uploadedAt < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get backup info for an image
CREATE OR REPLACE FUNCTION get_image_backup_info(image_path TEXT)
RETURNS TABLE (
  id UUID,
  fileName TEXT,
  backupPath TEXT,
  checksum TEXT,
  uploadedAt TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.fileName,
    b.backupPath,
    b.checksum,
    b.uploadedAt
  FROM image_backups b
  WHERE b.originalPath = image_path
  ORDER BY b.uploadedAt DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE image_backups IS 'Stores metadata for backed up images';
COMMENT ON COLUMN image_backups.fileName IS 'Original filename of the backed up image';
COMMENT ON COLUMN image_backups.originalPath IS 'Original path where the image was stored';
COMMENT ON COLUMN image_backups.backupPath IS 'Path where the backup is stored';
COMMENT ON COLUMN image_backups.checksum IS 'SHA256 checksum for integrity verification';
COMMENT ON FUNCTION cleanup_old_image_backups(INTEGER) IS 'Removes backup records older than specified days';
COMMENT ON FUNCTION get_image_backup_info(TEXT) IS 'Returns backup information for a given image path';
