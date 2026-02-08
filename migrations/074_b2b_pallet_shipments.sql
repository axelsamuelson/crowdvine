-- Dirty Wine (B2B) pallet shipments: physical pallets with wine contents, costs, dates
-- Separate from PACT pallets (zone-based sharing)

CREATE TABLE IF NOT EXISTS b2b_pallet_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_pallet_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES b2b_pallet_shipments(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  cost_cents_override INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shipment_id, wine_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_shipment_items_shipment ON b2b_pallet_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_b2b_shipment_items_wine ON b2b_pallet_shipment_items(wine_id);

COMMENT ON TABLE b2b_pallet_shipments IS 'Dirty Wine B2B pallet shipments. Tracks physical pallets with wine contents.';
COMMENT ON COLUMN b2b_pallet_shipment_items.cost_cents_override IS 'Cost ex VAT in öre for this pallet. Null = use wine cost from DB.';
