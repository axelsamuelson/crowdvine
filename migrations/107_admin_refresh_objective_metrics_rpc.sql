-- Recompute current_value for known metric slugs (whitelist); v1 ignores period_type (all_time).

CREATE OR REPLACE FUNCTION admin_refresh_objective_metrics(p_objective_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v NUMERIC;
  ord_ok TEXT[] := ARRAY[
    'placed',
    'approved',
    'confirmed',
    'pending_payment',
    'partly_approved'
  ]::TEXT[];
BEGIN
  FOR rec IN
    SELECT m.id, m.slug
    FROM admin_objective_metrics m
    WHERE m.objective_id = p_objective_id
  LOOP
    v := CASE rec.slug
      WHEN 'signup_count' THEN (
        SELECT COUNT(*)::NUMERIC FROM profiles
      )
      WHEN 'activated_users' THEN (
        SELECT COUNT(DISTINCT user_id)::NUMERIC
        FROM order_reservations
        WHERE status = ANY (ord_ok)
          AND user_id IS NOT NULL
      )
      WHEN 'conversion_rate' THEN (
        SELECT COALESCE(
          ROUND(
            (
              (SELECT COUNT(DISTINCT user_id)::NUMERIC
               FROM order_reservations
               WHERE status = ANY (ord_ok)
                 AND user_id IS NOT NULL)
              / NULLIF((SELECT COUNT(*)::NUMERIC FROM profiles), 0)
            ) * 100,
            1
          ),
          0
        )
      )
      WHEN 'avg_bottles_per_order' THEN (
        SELECT COALESCE(
          ROUND(
            (SELECT AVG(item_sum)::NUMERIC
             FROM (
               SELECT SUM(ori.quantity)::NUMERIC AS item_sum
               FROM order_reservation_items ori
               INNER JOIN order_reservations orr
                 ON ori.reservation_id = orr.id
               WHERE orr.status = ANY (ord_ok)
               GROUP BY orr.id
             ) sub),
            1
          ),
          0
        )
      )
      WHEN 'total_bottles' THEN (
        SELECT COALESCE(
          SUM(ori.quantity)::NUMERIC,
          0
        )
        FROM order_reservation_items ori
        INNER JOIN order_reservations orr ON ori.reservation_id = orr.id
        WHERE orr.status = ANY (ord_ok)
      )
      WHEN 'add_to_cart_count' THEN (
        SELECT COUNT(*)::NUMERIC
        FROM user_events
        WHERE event_type = 'add_to_cart'
      )
      WHEN 'product_views' THEN (
        SELECT COUNT(*)::NUMERIC
        FROM user_events
        WHERE event_type = 'product_viewed'
      )
      WHEN 'active_producers' THEN (
        SELECT COUNT(*)::NUMERIC
        FROM producers
        WHERE is_live IS TRUE
      )
      ELSE NULL
    END;

    IF v IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE admin_objective_metrics
    SET current_value = v,
        refreshed_at = NOW()
    WHERE id = rec.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION admin_refresh_objective_metrics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_refresh_objective_metrics(UUID) TO service_role;
