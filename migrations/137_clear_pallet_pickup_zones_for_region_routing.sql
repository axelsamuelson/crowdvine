-- Clear legacy pickup_zone_id on a specific pallet and on all region-based pallets
-- (routing uses shipping_region_id + current_pickup_producer_id).

UPDATE pallets
SET pickup_zone_id = NULL
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';

UPDATE pallets
SET pickup_zone_id = NULL
WHERE shipping_region_id IS NOT NULL
  AND pickup_zone_id IS NOT NULL;
