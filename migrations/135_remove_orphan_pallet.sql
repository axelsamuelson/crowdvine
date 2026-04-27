-- Remove orphan pallet (La Graine Sauvage route): no shipping_region_id, zero fill, never cleaned by region-based cleanup.
DELETE FROM pallets
WHERE id = '1f3230ec-2ebc-4d6c-8bfe-4050d14d98fa';
