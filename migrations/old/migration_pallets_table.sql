-- Create pallets table
CREATE TABLE pallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    delivery_zone_id UUID NOT NULL REFERENCES pallet_zones(id),
    pickup_zone_id UUID NOT NULL REFERENCES pallet_zones(id),
    cost_cents INTEGER NOT NULL DEFAULT 0,
    bottle_capacity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pallets_delivery_zone_id ON pallets(delivery_zone_id);
CREATE INDEX idx_pallets_pickup_zone_id ON pallets(pickup_zone_id);
CREATE INDEX idx_pallets_cost_cents ON pallets(cost_cents);
CREATE INDEX idx_pallets_bottle_capacity ON pallets(bottle_capacity);

-- Add constraint to ensure delivery and pickup zones are different
ALTER TABLE pallets
ADD CONSTRAINT pallets_different_zones
CHECK (delivery_zone_id != pickup_zone_id);
