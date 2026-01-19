-- Reservation shared items (assign bottles in a reservation to friends you follow)

CREATE TABLE IF NOT EXISTS reservation_shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_shared_items_reservation_id_idx
  ON reservation_shared_items(reservation_id);

CREATE INDEX IF NOT EXISTS reservation_shared_items_to_user_id_idx
  ON reservation_shared_items(to_user_id);

CREATE INDEX IF NOT EXISTS reservation_shared_items_from_user_id_idx
  ON reservation_shared_items(from_user_id);

ALTER TABLE reservation_shared_items ENABLE ROW LEVEL SECURITY;

-- Read: you can read shares you sent or received
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservation_shared_items'
      AND policyname = 'Users can read their reservation shares'
  ) THEN
    CREATE POLICY "Users can read their reservation shares"
      ON reservation_shared_items
      FOR SELECT
      TO authenticated
      USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
  END IF;
END $$;

-- Insert: allowed for the sender (server uses service role, but keep policy sane)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservation_shared_items'
      AND policyname = 'Users can create reservation shares'
  ) THEN
    CREATE POLICY "Users can create reservation shares"
      ON reservation_shared_items
      FOR INSERT
      TO authenticated
      WITH CHECK (from_user_id = auth.uid());
  END IF;
END $$;


