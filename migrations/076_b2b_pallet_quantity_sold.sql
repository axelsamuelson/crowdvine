-- Track sold quantity per pallet item for B2B stock calculation
-- remaining = quantity - quantity_sold

ALTER TABLE b2b_pallet_shipment_items
ADD COLUMN IF NOT EXISTS quantity_sold INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN b2b_pallet_shipment_items.quantity_sold IS 'Quantity sold from this pallet. Remaining = quantity - quantity_sold.';
