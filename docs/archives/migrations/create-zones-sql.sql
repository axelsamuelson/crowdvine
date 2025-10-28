-- Create Sweden delivery zones to fix "No Delivery Zone Found" error
-- Run this SQL in Supabase SQL Editor

-- Insert delivery zones for major Swedish cities
INSERT INTO pallet_zones (name, center_lat, center_lon, radius_km, zone_type, country_code) VALUES 
('Stockholm Delivery Zone', 59.3293, 18.0686, 150, 'delivery', 'SE'),
('Gothenburg Delivery Zone', 57.7089, 11.9746, 150, 'delivery', 'SE'),
('Malmö Delivery Zone', 55.6059, 13.0007, 150, 'delivery', 'SE'),
('Uppsala Delivery Zone', 59.8586, 17.6389, 100, 'delivery', 'SE'),
('Linköping Delivery Zone', 58.4108, 15.6214, 100, 'delivery', 'SE'),
('Örebro Delivery Zone', 59.2741, 15.2066, 100, 'delivery', 'SE'),
('Västerås Delivery Zone', 59.6099, 16.5448, 100, 'delivery', 'SE'),
('Helsingborg Delivery Zone', 56.0467, 12.6944, 100, 'delivery', 'SE')
ON CONFLICT (name) DO NOTHING;

-- Insert pickup zone for Sweden
INSERT INTO pallet_zones (name, center_lat, center_lon, radius_km, zone_type, country_code) VALUES 
('Sweden Pickup Zone', 59.3293, 18.0686, 50, 'pickup', 'SE')
ON CONFLICT (name) DO NOTHING;

-- Verify zones were created
SELECT name, zone_type, country_code, radius_km FROM pallet_zones WHERE country_code = 'SE' ORDER BY zone_type, name;
