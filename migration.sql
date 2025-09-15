-- Migration: Add zone_type to pallet_zones and pickup_zone to producers
-- Run this in Supabase SQL Editor

-- Add zone_type column to pallet_zones table
ALTER TABLE pallet_zones 
ADD COLUMN zone_type VARCHAR(20) NOT NULL DEFAULT 'delivery' 
CHECK (zone_type IN ('delivery', 'pickup'));

-- Add pickup_zone column to producers table
ALTER TABLE producers 
ADD COLUMN pickup_zone_id UUID REFERENCES pallet_zones(id);

-- Create index for better performance
CREATE INDEX idx_pallet_zones_zone_type ON pallet_zones(zone_type);
CREATE INDEX idx_producers_pickup_zone_id ON producers(pickup_zone_id);

-- Update existing zones to have delivery as default
UPDATE pallet_zones SET zone_type = 'delivery' WHERE zone_type IS NULL;
