-- Ops agent activity log + approval queue (already applied in prod; keep idempotent).

CREATE TABLE IF NOT EXISTS public.ops_agent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  agent text NOT NULL,
  action text NOT NULL,
  detail text,
  task_id uuid NULL REFERENCES public.admin_tasks(id) ON DELETE SET NULL,
  link text NULL
);

CREATE TABLE IF NOT EXISTS public.ops_approval_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  agent text NOT NULL,
  kind text CHECK (kind IN ('mejl', 'pengar', 'avtal', 'beslut', 'övrigt')),
  title text NOT NULL,
  detail text,
  link text,
  task_id uuid NULL REFERENCES public.admin_tasks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'väntar' CHECK (status IN ('väntar', 'godkänd', 'avböjd', 'klar')),
  resolved_at timestamptz
);

ALTER TABLE public.ops_agent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_approval_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ops_agent_log FROM anon, authenticated;
REVOKE ALL ON public.ops_approval_queue FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS ops_agent_log_created_at_idx
  ON public.ops_agent_log (created_at DESC);

CREATE INDEX IF NOT EXISTS ops_approval_queue_status_idx
  ON public.ops_approval_queue (status, created_at);
