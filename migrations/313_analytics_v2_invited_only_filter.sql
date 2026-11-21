-- Analytics V2 etapp 2: friends filter mode "only" (Bara inbjudna vänner, K33 / AC2).
-- Helper used by aggregate RPCs. Additive; no DELETE/UPDATE of facts.

CREATE OR REPLACE FUNCTION public.analytics_v2_invited_matches(
  p_invited text,
  p_is_friend boolean
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT
    p_invited IS NULL
    OR btrim(p_invited) = ''
    OR lower(btrim(p_invited)) IN ('all', 'include')
    OR (lower(btrim(p_invited)) = 'exclude' AND p_is_friend IS NOT TRUE)
    OR (lower(btrim(p_invited)) = 'only' AND p_is_friend IS TRUE);
$$;

COMMENT ON FUNCTION public.analytics_v2_invited_matches(text, boolean) IS
  'V2 invited-friend filter: include (all), exclude (non-friends), only (friends).';

REVOKE ALL ON FUNCTION public.analytics_v2_invited_matches(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_v2_invited_matches(text, boolean)
  TO service_role;

-- Patched analytics_v2_rpc_rollup_totals for invited=only (1 sites)
CREATE OR REPLACE FUNCTION analytics_v2_rpc_rollup_totals(
  p_site text,
  p_from date,
  p_to date,
  p_market text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_invited text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'sessions', COALESCE(SUM(r.sessions), 0),
    'engaged', COALESCE(SUM(r.engaged), 0),
    'plp', COALESCE(SUM(r.plp), 0),
    'pdp', COALESCE(SUM(r.pdp), 0),
    'cart', COALESCE(SUM(r.cart), 0),
    'checkout', COALESCE(SUM(r.checkout), 0),
    'purchases', COALESCE(SUM(r.purchases), 0),
    'purchase_value_sek', COALESCE(SUM(r.purchase_value_sek), 0),
    'prerender_suspect', COALESCE(SUM(r.prerender_suspect), 0)
  )
  INTO v
  FROM analytics_daily_rollup r
  WHERE r.site = p_site
    AND r.day_sthlm >= p_from
    AND r.day_sthlm <= p_to
    AND (p_market IS NULL OR p_market = '' OR p_market = 'all' OR r.market = p_market)
    AND (p_channel IS NULL OR p_channel = '' OR r.channel = p_channel)
    AND (p_device IS NULL OR p_device = '' OR r.device = p_device)
    AND analytics_v2_invited_matches(p_invited, r.is_invited_friend);
  RETURN COALESCE(v, '{}'::jsonb);
END;
$$;

-- Patched analytics_v2_rpc_group_by for invited=only (2 sites)
CREATE OR REPLACE FUNCTION analytics_v2_rpc_group_by(
  p_dim text,
  p_site text,
  p_from date,
  p_to date,
  p_market text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_invited text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF p_dim NOT IN ('channel', 'market') THEN
    RAISE EXCEPTION 'p_dim must be channel or market';
  END IF;

  IF p_dim = 'channel' THEN
    SELECT COALESCE(jsonb_agg(row_obj ORDER BY (row_obj->>'sessions')::int DESC), '[]'::jsonb)
    INTO v
    FROM (
      SELECT jsonb_build_object(
        'key', COALESCE(r.channel, 'direct'),
        'channel', COALESCE(r.channel, 'direct'),
        'sessions', SUM(r.sessions),
        'engaged', SUM(r.engaged),
        'plp', SUM(r.plp),
        'pdp', SUM(r.pdp),
        'cart', SUM(r.cart),
        'checkout', SUM(r.checkout),
        'purchases', SUM(r.purchases),
        'purchase_value_sek', SUM(r.purchase_value_sek)
      ) AS row_obj
      FROM analytics_daily_rollup r
      WHERE r.site = p_site
        AND r.day_sthlm >= p_from
        AND r.day_sthlm <= p_to
        AND (p_market IS NULL OR p_market = '' OR p_market = 'all' OR r.market = p_market)
        AND (p_channel IS NULL OR p_channel = '' OR r.channel = p_channel)
        AND (p_device IS NULL OR p_device = '' OR r.device = p_device)
        AND analytics_v2_invited_matches(p_invited, r.is_invited_friend)
      GROUP BY COALESCE(r.channel, 'direct')
    ) s;
  ELSE
    SELECT COALESCE(jsonb_agg(row_obj ORDER BY (row_obj->>'sessions')::int DESC), '[]'::jsonb)
    INTO v
    FROM (
      SELECT jsonb_build_object(
        'key', COALESCE(r.market, 'unknown'),
        'market', COALESCE(r.market, 'unknown'),
        'sessions', SUM(r.sessions),
        'engaged', SUM(r.engaged),
        'plp', SUM(r.plp),
        'pdp', SUM(r.pdp),
        'cart', SUM(r.cart),
        'checkout', SUM(r.checkout),
        'purchases', SUM(r.purchases),
        'purchase_value_sek', SUM(r.purchase_value_sek)
      ) AS row_obj
      FROM analytics_daily_rollup r
      WHERE r.site = p_site
        AND r.day_sthlm >= p_from
        AND r.day_sthlm <= p_to
        AND (p_market IS NULL OR p_market = '' OR p_market = 'all' OR r.market = p_market)
        AND (p_channel IS NULL OR p_channel = '' OR r.channel = p_channel)
        AND (p_device IS NULL OR p_device = '' OR r.device = p_device)
        AND analytics_v2_invited_matches(p_invited, r.is_invited_friend)
      GROUP BY COALESCE(r.market, 'unknown')
    ) s;
  END IF;

  RETURN COALESCE(v, '[]'::jsonb);
END;
$$;

-- Patched analytics_v2_rpc_checkout_steps for invited=only (1 sites)
CREATE OR REPLACE FUNCTION analytics_v2_rpc_checkout_steps(
  p_site text,
  p_from date,
  p_to date,
  p_market text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_invited text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  -- Distinct clean sessions per checkout step (ANY step viewed, not last-only).
  WITH facts AS (
    SELECT f.session_id, f.checkout_steps_seen
    FROM analytics_session_facts f
    WHERE f.site = p_site
      AND f.day_sthlm >= p_from
      AND f.day_sthlm <= p_to
      AND f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
      AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
      AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
      AND analytics_v2_invited_matches(p_invited, f.is_invited_friend)
      AND (
        p_market IS NULL OR p_market = '' OR p_market = 'all'
        OR (p_market = 'SE' AND f.country_code = 'SE')
        OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
        OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
        OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
      )
  ),
  steps_from_array AS (
    SELECT f.session_id, step
    FROM facts f
    CROSS JOIN LATERAL unnest(COALESCE(f.checkout_steps_seen, '{}'::text[])) AS step
    WHERE step IS NOT NULL
  ),
  steps_from_events AS (
    SELECT DISTINCT ue.session_id, analytics_checkout_step(ue.event_metadata) AS step
    FROM facts f
    JOIN user_events ue ON ue.session_id = f.session_id
    WHERE ue.event_type = 'checkout_step_viewed'
      AND analytics_checkout_step(ue.event_metadata) IS NOT NULL
      AND (
        f.checkout_steps_seen IS NULL
        OR cardinality(f.checkout_steps_seen) = 0
      )
  ),
  all_steps AS (
    SELECT * FROM steps_from_array
    UNION
    SELECT * FROM steps_from_events
  )
  SELECT COALESCE(
    jsonb_object_agg(step, cnt),
    '{}'::jsonb
  )
  INTO v
  FROM (
    SELECT step, COUNT(DISTINCT session_id)::int AS cnt
    FROM all_steps
    GROUP BY step
  ) s;

  RETURN jsonb_build_object(
    'postal', COALESCE((v->>'postal')::int, 0),
    'delivery', COALESCE((v->>'delivery')::int, 0),
    'age_terms', COALESCE((v->>'age_terms')::int, 0),
    'payment', COALESCE((v->>'payment')::int, 0)
  );
END;
$$;

-- Patched analytics_v2_rpc_closed_funnel for invited=only (1 sites)
CREATE OR REPLACE FUNCTION analytics_v2_rpc_closed_funnel(
  p_site text,
  p_from date,
  p_to date,
  p_market text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_invited text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  -- Closed = must have reached each prior step, but timestamps may be out of order
  -- (e.g. PDP → PLP → PDP still counts as reached PLP and PDP).
  WITH facts AS (
    SELECT
      f.session_id,
      f.purchased,
      f.reached_plp,
      f.reached_pdp,
      f.added_to_cart,
      f.reached_checkout
    FROM analytics_session_facts f
    WHERE f.site = p_site
      AND f.day_sthlm >= p_from
      AND f.day_sthlm <= p_to
      AND f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
      AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
      AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
      AND analytics_v2_invited_matches(p_invited, f.is_invited_friend)
      AND (
        p_market IS NULL OR p_market = '' OR p_market = 'all'
        OR (p_market = 'SE' AND f.country_code = 'SE')
        OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
        OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
        OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
      )
  ),
  scored AS (
    SELECT
      session_id,
      true AS s_sessions,
      reached_plp AS s_plp,
      (reached_plp AND reached_pdp) AS s_pdp,
      (reached_plp AND reached_pdp AND added_to_cart) AS s_cart,
      (reached_plp AND reached_pdp AND added_to_cart AND reached_checkout) AS s_checkout,
      (
        reached_plp AND reached_pdp AND added_to_cart AND reached_checkout AND purchased
      ) AS s_purchase
    FROM facts
  )
  SELECT jsonb_build_object(
    'sessions', COUNT(*)::int,
    'plp', COUNT(*) FILTER (WHERE s_plp)::int,
    'pdp', COUNT(*) FILTER (WHERE s_pdp)::int,
    'cart', COUNT(*) FILTER (WHERE s_cart)::int,
    'checkout', COUNT(*) FILTER (WHERE s_checkout)::int,
    'purchases', COUNT(*) FILTER (WHERE s_purchase)::int,
    'mode', 'closed_order_tolerant',
    'steps', jsonb_build_array('sessions', 'plp', 'pdp', 'cart', 'checkout', 'purchase')
  )
  INTO v
  FROM scored;

  RETURN COALESCE(v, jsonb_build_object(
    'sessions', 0, 'plp', 0, 'pdp', 0, 'cart', 0, 'checkout', 0, 'purchases', 0
  ));
END;
$$;

-- Patched analytics_v2_rpc_products for invited=only (3 sites)
CREATE OR REPLACE FUNCTION analytics_v2_rpc_products(
  p_site text,
  p_from date,
  p_to date,
  p_market text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_invited text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wines jsonb;
  v_lists jsonb;
  v_unattrib int := 0;
BEGIN
  WITH facts AS (
    SELECT f.*
    FROM analytics_session_facts f
    WHERE f.site = p_site
      AND f.day_sthlm >= p_from
      AND f.day_sthlm <= p_to
      AND f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
      AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
      AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
      AND analytics_v2_invited_matches(p_invited, f.is_invited_friend)
      AND (
        p_market IS NULL OR p_market = '' OR p_market = 'all'
        OR (p_market = 'SE' AND f.country_code = 'SE')
        OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
        OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
        OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
      )
  ),
  viewed AS (
    SELECT
      pid AS product_id,
      COUNT(*) FILTER (WHERE f.reached_pdp)::int AS pdp_sessions,
      COUNT(*) FILTER (WHERE f.added_to_cart AND pid = ANY (f.product_ids_added))::int AS cart_sessions,
      COUNT(*) FILTER (WHERE f.reached_checkout)::int AS checkout_sessions,
      COUNT(*) FILTER (WHERE f.purchased)::int AS purchase_sessions
    FROM facts f
    CROSS JOIN LATERAL unnest(COALESCE(f.product_ids_viewed, '{}'::text[])) AS pid
    WHERE pid IS NOT NULL AND btrim(pid) <> ''
    GROUP BY pid
  ),
  listed AS (
    SELECT
      pid AS product_id,
      COUNT(DISTINCT f.session_id)::int AS list_sessions
    FROM facts f
    JOIN user_events ue
      ON ue.session_id = f.session_id
     AND ue.event_type = 'product_list_viewed'
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(ue.event_metadata->'productIds') = 'array'
          THEN ue.event_metadata->'productIds'
        ELSE '[]'::jsonb
      END
    ) AS pid
    WHERE pid IS NOT NULL AND btrim(pid) <> ''
    GROUP BY pid
  ),
  merged AS (
    SELECT
      COALESCE(v.product_id, l.product_id) AS product_id,
      COALESCE(l.list_sessions, 0) AS list_sessions,
      COALESCE(v.pdp_sessions, 0) AS pdp_sessions,
      COALESCE(v.cart_sessions, 0) AS cart_sessions,
      COALESCE(v.checkout_sessions, 0) AS checkout_sessions,
      COALESCE(v.purchase_sessions, 0) AS purchase_sessions
    FROM viewed v
    FULL OUTER JOIN listed l ON l.product_id = v.product_id
  ),
  named AS (
    SELECT
      m.product_id,
      COALESCE(
        w.wine_name,
        w2.wine_name,
        (
          SELECT pd.product_name
          FROM analytics_product_daily pd
          WHERE pd.product_id = m.product_id
            AND pd.product_name IS NOT NULL
          ORDER BY pd.day_sthlm DESC
          LIMIT 1
        ),
        m.product_id
      ) AS product_name,
      m.list_sessions,
      m.pdp_sessions,
      m.cart_sessions,
      m.checkout_sessions,
      m.purchase_sessions
    FROM merged m
    LEFT JOIN wines w
      ON w.id::text = m.product_id
    LEFT JOIN wines w2
      ON w2.handle = m.product_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_id', product_id,
        'product_name', product_name,
        'list_sessions', list_sessions,
        'pdp_sessions', pdp_sessions,
        'cart_sessions', cart_sessions,
        'checkout_sessions', checkout_sessions,
        'purchase_sessions', purchase_sessions
      )
      ORDER BY pdp_sessions DESC, list_sessions DESC, product_name
    ),
    '[]'::jsonb
  )
  INTO v_wines
  FROM named;

  WITH facts AS (
    SELECT f.session_id, f.landing_path, f.reached_plp
    FROM analytics_session_facts f
    WHERE f.site = p_site
      AND f.day_sthlm >= p_from
      AND f.day_sthlm <= p_to
      AND f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
      AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
      AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
      AND analytics_v2_invited_matches(p_invited, f.is_invited_friend)
      AND (
        p_market IS NULL OR p_market = '' OR p_market = 'all'
        OR (p_market = 'SE' AND f.country_code = 'SE')
        OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
        OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
        OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
      )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('path', path, 'sessions', sessions)
      ORDER BY sessions DESC
    ),
    '[]'::jsonb
  )
  INTO v_lists
  FROM (
    SELECT COALESCE(NULLIF(landing_path, ''), '/') AS path, COUNT(*)::int AS sessions
    FROM facts
    WHERE reached_plp
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 40
  ) s;

  SELECT COUNT(*)::int
  INTO v_unattrib
  FROM analytics_session_facts f
  WHERE f.site = p_site
    AND f.day_sthlm >= p_from
    AND f.day_sthlm <= p_to
    AND f.is_clean
    AND NOT f.is_prerender_suspect
    AND NOT COALESCE(f.is_geo_bot_suspect, false)
    AND f.reached_pdp
    AND (f.product_ids_viewed IS NULL OR cardinality(f.product_ids_viewed) = 0)
    AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
    AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
    AND analytics_v2_invited_matches(p_invited, f.is_invited_friend)
    AND (
      p_market IS NULL OR p_market = '' OR p_market = 'all'
      OR (p_market = 'SE' AND f.country_code = 'SE')
      OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
      OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
      OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
    );

  RETURN jsonb_build_object(
    'wines', COALESCE(v_wines, '[]'::jsonb),
    'lists', COALESCE(v_lists, '[]'::jsonb),
    'unattributed_pdp', COALESCE(v_unattrib, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION analytics_v2_rpc_rollup_totals(text, date, date, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_rollup_totals(text, date, date, text, text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION analytics_v2_rpc_group_by(text, text, date, date, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_group_by(text, text, date, date, text, text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION analytics_v2_rpc_checkout_steps(text, date, date, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_checkout_steps(text, date, date, text, text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION analytics_v2_rpc_closed_funnel(text, date, date, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_closed_funnel(text, date, date, text, text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION analytics_v2_rpc_products(text, date, date, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_products(text, date, date, text, text, text, text)
  TO service_role;
