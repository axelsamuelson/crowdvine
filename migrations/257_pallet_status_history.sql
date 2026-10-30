-- Append-only status history for pallets (CRO: reconstruct gaps like 3985cbfe).
-- Filled by trigger on pallets.status changes; seed one row per current pallet.

CREATE TABLE IF NOT EXISTS public.pallet_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_id uuid NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  -- 'seed' | 'trigger' | optional actor hint (e.g. 'admin', 'hygiene', user uuid)
  changed_by text,
  source text NOT NULL DEFAULT 'trigger'
);

CREATE INDEX IF NOT EXISTS idx_pallet_status_history_pallet_changed
  ON public.pallet_status_history (pallet_id, changed_at DESC);

COMMENT ON TABLE public.pallet_status_history IS
  'Append-only pallet status transitions. Admin SELECT only; no anon access.';

ALTER TABLE public.pallet_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select pallet_status_history"
  ON public.pallet_status_history;
CREATE POLICY "Admins can select pallet_status_history"
  ON public.pallet_status_history
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- No INSERT/UPDATE/DELETE policies for anon/authenticated — service_role + trigger only.
REVOKE ALL ON public.pallet_status_history FROM anon;
REVOKE ALL ON public.pallet_status_history FROM authenticated;
GRANT SELECT ON public.pallet_status_history TO authenticated;
GRANT ALL ON public.pallet_status_history TO service_role;

CREATE OR REPLACE FUNCTION public.log_pallet_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.pallet_status_history (
      pallet_id,
      old_status,
      new_status,
      changed_at,
      changed_by,
      source
    ) VALUES (
      NEW.id,
      OLD.status,
      COALESCE(NEW.status, 'unknown'),
      now(),
      NULL,
      'trigger'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pallet_status_history ON public.pallets;
CREATE TRIGGER trg_pallet_status_history
  AFTER UPDATE OF status ON public.pallets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pallet_status_change();

-- Seed current status as the starting history row (idempotent per pallet).
INSERT INTO public.pallet_status_history (
  pallet_id,
  old_status,
  new_status,
  changed_at,
  changed_by,
  source
)
SELECT
  p.id,
  NULL,
  COALESCE(p.status, 'unknown'),
  COALESCE(p.updated_at, p.created_at, now()),
  'seed',
  'seed'
FROM public.pallets p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pallet_status_history h
  WHERE h.pallet_id = p.id
    AND h.source = 'seed'
);
