-- 243: make approval-queue rows explicit questions to Axel
alter table public.ops_approval_queue
  add column if not exists question text,
  add column if not exists answer_type text,
  add column if not exists options jsonb,
  add column if not exists recommendation text,
  add column if not exists context text,
  add column if not exists link text,
  add column if not exists deadline date,
  add column if not exists answer text,
  add column if not exists answered_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ops_approval_queue_answer_type_check') then
    alter table public.ops_approval_queue add constraint ops_approval_queue_answer_type_check
      check (answer_type is null or answer_type in ('ja_nej','val','belopp','datum','text','godkänn_utkast'));
  end if;
end $$;

comment on column public.ops_approval_queue.question is 'Exakt fråga till Axel, en mening';
comment on column public.ops_approval_queue.options is 'Vid answer_type=val: [{"label":..., "consequence":...}]';
