-- Migration 047: Producer Groups for 6-Bottle Rule
-- Purpose: Allow admins to link producers together so customers can combine
-- bottles from linked producers to meet the 6-bottle minimum requirement

-- Producer groups table (e.g., "Southern France Partners")
CREATE TABLE producer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: which producers belong to which groups
CREATE TABLE producer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES producer_groups(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, producer_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_pgm_group ON producer_group_members(group_id);
CREATE INDEX idx_pgm_producer ON producer_group_members(producer_id);

-- Enable RLS
ALTER TABLE producer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_group_members ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can view, only admins can manage

-- Producer Groups Policies
CREATE POLICY "Anyone can view producer groups" ON producer_groups
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage producer groups" ON producer_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Producer Group Members Policies
CREATE POLICY "Anyone can view group members" ON producer_group_members
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage group members" ON producer_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Function to get all producers in the same group as a given producer
CREATE OR REPLACE FUNCTION get_grouped_producers(p_producer_id UUID)
RETURNS TABLE (producer_id UUID, group_id UUID, group_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pgm.producer_id,
    pg.id as group_id,
    pg.name as group_name
  FROM producer_group_members pgm
  INNER JOIN producer_groups pg ON pgm.group_id = pg.id
  WHERE pgm.group_id IN (
    SELECT group_id 
    FROM producer_group_members 
    WHERE producer_id = p_producer_id
  );
END;
$$ LANGUAGE plpgsql;

-- Verification queries (optional, for testing)
-- SELECT * FROM producer_groups;
-- SELECT * FROM producer_group_members;
-- SELECT * FROM get_grouped_producers('some-producer-uuid');

