-- Manual "becomes physical" pickup selection for PACT pallets.
-- Stops auto-locking pickup after every order; admin confirms at a fill trigger.
-- Settings live in site_content so admins can change them without a redeploy.

ALTER TABLE public.pallets
  ADD COLUMN IF NOT EXISTS pickup_producer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_producer_confirmed_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_selection_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_selection_task_id UUID
    REFERENCES public.admin_tasks(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pallets.pickup_producer_confirmed_at IS
  'When an admin manually confirmed the pickup producer/location (becomes physical).';
COMMENT ON COLUMN public.pallets.pickup_producer_confirmed_by IS
  'Admin user who confirmed the pickup producer/location.';
COMMENT ON COLUMN public.pallets.pickup_selection_triggered_at IS
  'When the pallet first reached the configurable pickup-selection fill trigger and an admin task was created.';
COMMENT ON COLUMN public.pallets.pickup_selection_task_id IS
  'admin_tasks row created when the pickup-selection trigger fired.';

CREATE INDEX IF NOT EXISTS idx_pallets_pickup_selection_triggered_at
  ON public.pallets (pickup_selection_triggered_at)
  WHERE pickup_selection_triggered_at IS NOT NULL;

-- Configurable parameters (defaults). Empty weight limit = no check.
INSERT INTO public.site_content (key, value, type, description) VALUES
(
  'pallet_pickup_selection_trigger_share',
  '0.8',
  'number',
  'Share of min_bottles_to_complete at which admin must choose a pickup location (default 0.8 = 80%).'
),
(
  'pallet_weight_limit_kg',
  '',
  'number',
  'Optional pallet weight limit in kg. Empty/null = no weight check. Admin sees a warning when estimated weight exceeds this.'
),
(
  'pallet_kg_per_bottle',
  '1.4',
  'number',
  'Estimated kg per bottle used for pallet weight warnings (default 1.4).'
)
ON CONFLICT (key) DO NOTHING;
