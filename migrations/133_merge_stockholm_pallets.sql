-- Merge duplicate Stockholm route pallets (La Liquire master, Cabrerolles secondary).
-- After apply: run pickup sync from the app if needed, e.g. updatePickupProducerForPallet
-- ('3985cbfe-178f-4fa1-a897-17183a1f18db') — not invokable from SQL.

BEGIN;

UPDATE order_reservations
SET pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
WHERE pallet_id = '3a4ddb5f-a3b6-477a-905e-951e91eab774';

UPDATE bookings
SET pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
WHERE pallet_id = '3a4ddb5f-a3b6-477a-905e-951e91eab774';

DELETE FROM pallets
WHERE id = '3a4ddb5f-a3b6-477a-905e-951e91eab774';

UPDATE pallets
SET
  name = 'Middle Languedoc to Stockholm',
  shipping_region_id = 'af3fb523-8139-4ff8-bc70-6e553b6a4a99'
WHERE id = '3985cbfe-178f-4fa1-a897-17183a1f18db';

COMMIT;
