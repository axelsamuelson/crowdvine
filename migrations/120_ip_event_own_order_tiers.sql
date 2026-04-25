-- Extra own-order IP event types for bottle-tier awards (points-engine awardPointsForOwnOrder).
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'own_order_medium';
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'own_order_xl';
