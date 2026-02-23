-- Blizko MVP: core deal tracking
-- Minimal, scalable schema for matched → deal_done funnel

-- 1) Current state of matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null,
  nanny_id uuid not null,
  status text not null check (status in ('contacted','responded','approved','matched','deal_done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_status_idx on public.matches(status);
create index if not exists matches_parent_idx on public.matches(parent_id);
create index if not exists matches_nanny_idx on public.matches(nanny_id);

-- 2) Immutable status history (audit)
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('contacted','responded','approved','matched','deal_done')),
  actor text not null default 'system',
  ts timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists match_events_match_idx on public.match_events(match_id);
create index if not exists match_events_ts_idx on public.match_events(ts);

-- 3) Deals (optional now, useful later)
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  amount numeric,
  currency text default 'RUB',
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  created_at timestamptz not null default now()
);

create index if not exists deals_match_idx on public.deals(match_id);

-- View: funnel conversion matched → deal_done (by event history)
create or replace view public.v_funnel_matched_to_deal_done as
select
  date_trunc('day', ts) as day,
  count(*) filter (where to_status = 'matched') as matched_cnt,
  count(*) filter (where to_status = 'deal_done') as deal_done_cnt,
  case when count(*) filter (where to_status = 'matched') = 0 then 0
       else round(100.0 * count(*) filter (where to_status = 'deal_done')
                      / count(*) filter (where to_status = 'matched'), 2)
  end as deal_done_pct
from public.match_events
where to_status in ('matched','deal_done')
group by 1
order by 1 desc;

-- Optional trigger to keep matches.updated_at fresh
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_matches_touch on public.matches;
create trigger trg_matches_touch
before update on public.matches
for each row execute function public.touch_updated_at();
