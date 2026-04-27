-- Remove manually created empty open pallet; shipping_ordered pallets now accept new orders.
DELETE FROM pallets
WHERE shipping_region_id = 'af3fb523-8139-4ff8-bc70-6e553b6a4a99'
  AND status = 'open'
  AND created_at > '2026-04-27'
  AND id != '3985cbfe-178f-4fa1-a897-17183a1f18db';
