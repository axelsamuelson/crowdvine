-- Migration 143: Backfill order_reservations.market_drop_id from market_drops (keyed joins, no hardcoded drop UUIDs).
-- Safe to run after migrations 141 (markets) and 142 (market_drops).
-- Review counts before/after in production.

-- EU / SE mirror drop: internal pallet + non-conditional + EU checkout countries (or legacy null country_code)
UPDATE order_reservations r
SET market_drop_id = md.id
FROM market_drops md
WHERE r.market_drop_id IS NULL
  AND r.pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
  AND COALESCE(r.is_conditional, false) = false
  AND (
    r.country_code IS NULL
    OR upper(trim(r.country_code)) IN ('SE', 'NO', 'DK', 'FI', 'DE', 'FR', 'GB')
  )
  AND md.source_pallet_id = r.pallet_id
  AND md.market_code = 'EU'
  AND md.country_code = 'SE'
  AND md.region_code IS NULL
  AND md.checkout_mode = 'normal_checkout'
  AND md.status IN ('active', 'conditional', 'paused');

-- US / CA conditional drop
UPDATE order_reservations r
SET market_drop_id = md.id
FROM market_drops md
WHERE r.market_drop_id IS NULL
  AND r.pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
  AND upper(trim(coalesce(r.country_code, ''))) = 'US'
  AND upper(trim(coalesce(r.region, ''))) = 'CA'
  AND r.is_conditional = true
  AND md.source_pallet_id = r.pallet_id
  AND md.market_code = 'US'
  AND md.country_code = 'US'
  AND md.region_code = 'CA'
  AND md.checkout_mode = 'conditional_reservation'
  AND md.status IN ('active', 'conditional', 'paused');
