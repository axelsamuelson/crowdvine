-- Analytics V2 etapp 2 M7: manual channel-test cost table (K20).
-- Ingrid/Margaux fill in; no Meta API in etapp 2. TEST first.

CREATE TABLE IF NOT EXISTS public.analytics_channel_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  test_channel text NOT NULL,
  utm_campaign text,
  cost_sek numeric(12, 2) NOT NULL CHECK (cost_sek >= 0),
  source text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_channel_costs_period_ok CHECK (period_from <= period_to),
  CONSTRAINT analytics_channel_costs_test_channel_ok CHECK (
    test_channel IN (
      'meta_ads',
      'instagram_organic',
      'instagram_no_utm',
      'organic_search'
    )
  )
);

COMMENT ON TABLE public.analytics_channel_costs IS
  'Manual ad/channel costs for Analytics V2 kanaltest (K20). Admin + service_role only.';

CREATE INDEX IF NOT EXISTS idx_analytics_channel_costs_period
  ON public.analytics_channel_costs (period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_analytics_channel_costs_channel
  ON public.analytics_channel_costs (test_channel);

ALTER TABLE public.analytics_channel_costs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analytics_channel_costs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_channel_costs TO service_role;

-- No policies for anon/authenticated — admin reads via service_role API routes only.
