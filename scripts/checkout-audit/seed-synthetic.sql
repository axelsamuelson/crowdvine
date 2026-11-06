-- Synthetic-only seed for crowdvine_checkout_audit (local). No prod PII/orders.

TRUNCATE synthetic_cart_lines, synthetic_carts, synthetic_wines,
  order_reservations, customer_shipping_rates, profiles
  RESTART IDENTITY CASCADE;

INSERT INTO profiles (id, email, full_name, phone) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'synthetic.buyer@example.test', 'Synthetic Buyer', '+46700000001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'synthetic.member@example.test', 'Synthetic Member', '+46700000002');

-- Shared-pallet / pact rate only (DIRECT_BOX stays OFF; no direct_box price invention).
INSERT INTO customer_shipping_rates (country_code, channel, flat_fee_sek, free_shipping_threshold_sek, active)
VALUES ('SE', 'pact', 99, NULL, true);

INSERT INTO synthetic_wines (id, slug, name, producer_name, price_sek) VALUES
  ('11111111-1111-1111-1111-111111111111', 'synthetic-souteronne', 'Synthetic Souteronne', 'Synthetic Producer A', 211),
  ('22222222-2222-2222-2222-222222222222', 'synthetic-resiste', 'Synthetic Résiste', 'Synthetic Producer B', 107);

INSERT INTO synthetic_carts (id, owner_profile_id, label) VALUES
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'audit-cart-6plus2');

INSERT INTO synthetic_cart_lines (cart_id, wine_id, quantity) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 6),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 2);

INSERT INTO checkout_audit_meta (key, value) VALUES
  ('seeded_at', now()::text),
  ('seed_bottles', '8')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
