-- Migration 046: Create admin views for easier querying with customer data
-- These views pre-join customer information for admin dashboards

-- Drop existing views if they exist
DROP VIEW IF EXISTS bookings_with_customers CASCADE;
DROP VIEW IF EXISTS orders_with_customers CASCADE;

-- View 1: Bookings with customer information
-- Combines bookings with profiles, wines, producers, and pallets
CREATE VIEW bookings_with_customers AS
SELECT 
  b.id,
  b.user_id,
  b.item_id,
  b.quantity,
  b.band,
  b.status,
  b.created_at,
  b.pallet_id,
  
  -- Customer info from profiles
  p.email as customer_email,
  p.first_name as customer_first_name,
  p.last_name as customer_last_name,
  p.full_name as customer_full_name,
  
  -- Wine info
  w.wine_name,
  w.vintage,
  w.color as wine_color,
  w.grape_varieties,
  w.base_price_cents,
  
  -- Producer info
  pr.name as producer_name,
  pr.region as producer_region,
  
  -- Pallet info
  pa.name as pallet_name,
  pa.bottle_capacity as pallet_capacity

FROM bookings b
LEFT JOIN profiles p ON b.user_id = p.id
LEFT JOIN wines w ON b.item_id = w.id
LEFT JOIN producers pr ON w.producer_id = pr.id
LEFT JOIN pallets pa ON b.pallet_id = pa.id;

-- View 2: Orders (order_reservations) with customer information
-- Combines order_reservations with profiles and zone information
CREATE VIEW orders_with_customers AS
SELECT 
  r.id,
  r.user_id,
  r.order_id,
  r.status,
  r.created_at,
  r.updated_at,
  r.cart_id,
  r.address_id,
  r.pallet_id,
  r.pickup_zone_id,
  r.delivery_zone_id,
  r.payment_status,
  r.fulfillment_status,
  r.total_amount_cents,
  r.shipping_cost_cents,
  
  -- Customer info from profiles
  p.email as customer_email,
  p.first_name as customer_first_name,
  p.last_name as customer_last_name,
  p.full_name as customer_full_name,
  
  -- Pallet info
  pa.name as pallet_name,
  
  -- Pickup zone info
  pz_pickup.name as pickup_zone_name,
  pz_pickup.zone_type as pickup_zone_type,
  
  -- Delivery zone info
  pz_delivery.name as delivery_zone_name,
  pz_delivery.zone_type as delivery_zone_type

FROM order_reservations r
LEFT JOIN profiles p ON r.user_id = p.id
LEFT JOIN pallets pa ON r.pallet_id = pa.id
LEFT JOIN pallet_zones pz_pickup ON r.pickup_zone_id = pz_pickup.id
LEFT JOIN pallet_zones pz_delivery ON r.delivery_zone_id = pz_delivery.id;

-- Grant access to views (adjust role as needed)
-- GRANT SELECT ON bookings_with_customers TO authenticated;
-- GRANT SELECT ON orders_with_customers TO authenticated;

-- Verification queries (optional, for testing)
-- SELECT COUNT(*) as bookings_count FROM bookings_with_customers;
-- SELECT COUNT(*) as orders_count FROM orders_with_customers;
-- SELECT * FROM bookings_with_customers LIMIT 5;
-- SELECT * FROM orders_with_customers LIMIT 5;

