-- Migration: Add basic delivery zones to pallet_zones table
-- Date: 2025-01-02

-- First, add country_code column to pallet_zones if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pallet_zones' AND column_name = 'country_code') THEN
    ALTER TABLE pallet_zones ADD COLUMN country_code TEXT;
  END IF;
END $$;

-- Add unique constraint on name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pallet_zones_name_unique') THEN
    ALTER TABLE pallet_zones ADD CONSTRAINT pallet_zones_name_unique UNIQUE (name);
  END IF;
END $$;

-- Add basic delivery zones for MVP testing (only if they don't exist)
INSERT INTO pallet_zones (name, zone_type, country_code, radius_km, center_lat, center_lon) VALUES 
('Sweden Delivery', 'delivery', 'SE', 1000, 62.0, 15.0),
('Norway Delivery', 'delivery', 'NO', 1000, 62.0, 10.0),
('Denmark Delivery', 'delivery', 'DK', 500, 56.0, 10.0),
('Finland Delivery', 'delivery', 'FI', 1000, 64.0, 26.0)
ON CONFLICT (name) DO NOTHING;
