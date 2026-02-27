-- tracking_events schema (Supabase)
-- Required for canonical funnel metrics

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  nanny_id text,
  event_name text not null,
  event_at timestamptz not null default now(),
  source text,
  channel text,
  actor_id text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tracking_events_nanny_id_idx on public.tracking_events (nanny_id);
create index if not exists tracking_events_event_name_idx on public.tracking_events (event_name);
create index if not exists tracking_events_event_at_idx on public.tracking_events (event_at);

-- RLS
alter table public.tracking_events enable row level security;

-- authenticated users can insert (no select by default)
create policy "tracking_events_insert_authenticated" on public.tracking_events
for insert to authenticated
with check (true);
