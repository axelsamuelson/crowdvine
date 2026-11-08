-- crowdvine-checkout-audit ONLY (ref msdfjrrokcmjifetuwgc).
-- App confirm inserts order_reservation_items via user-scoped supabaseServer()
-- (not service role). Without INSERT/UPDATE policies, browser Pay now reaches
-- Stripe success then fails confirm with 42501 RLS on items.
-- Idempotent. NEVER apply to abrnvjqwpdkodgrtezeg.

DO $$
BEGIN
  IF (
    SELECT value FROM checkout_audit_meta WHERE key = 'project_ref'
  ) IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION 'REFUSED: wrong project_ref for reservation write policies';
  END IF;
END $$;

DROP POLICY IF EXISTS audit_order_reservation_items_insert_own ON order_reservation_items;
CREATE POLICY audit_order_reservation_items_insert_own ON order_reservation_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_reservations r
      WHERE r.id = order_reservation_items.reservation_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS audit_order_reservation_items_update_own ON order_reservation_items;
CREATE POLICY audit_order_reservation_items_update_own ON order_reservation_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM order_reservations r
      WHERE r.id = order_reservation_items.reservation_id
        AND r.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_reservations r
      WHERE r.id = order_reservation_items.reservation_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS audit_order_reservations_update_own ON order_reservations;
CREATE POLICY audit_order_reservations_update_own ON order_reservations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO checkout_audit_meta (key, value) VALUES
  ('schema_reservation_items_write_policies', now()::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
