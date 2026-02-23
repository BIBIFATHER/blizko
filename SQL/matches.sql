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
create index if not exists matches_parent_status_idx on public.matches(parent_id, status);

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
create index if not exists match_events_status_ts_idx on public.match_events(to_status, ts);
create index if not exists match_events_match_status_ts_idx on public.match_events(match_id, to_status, ts);

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

-- ==========================
-- RLS POLICIES (Supabase)
-- Assumptions:
-- 1) matches.parent_id stores auth.uid() of the parent user
-- 2) Admin access via JWT claim: auth.jwt()->>'role' = 'admin'
-- ==========================

alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.deals enable row level security;

-- Parents: can read only their matches
create policy "parents_read_own_matches"
  on public.matches for select
  using (auth.uid() = parent_id);

-- Admin: can read all matches
create policy "admin_read_all_matches"
  on public.matches for select
  using ((auth.jwt()->>'role') = 'admin');

-- Match events: parents can read events for their matches
create policy "parents_read_own_match_events"
  on public.match_events for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_events.match_id
        and m.parent_id = auth.uid()
    )
  );

-- Admin: can read all match events
create policy "admin_read_all_match_events"
  on public.match_events for select
  using ((auth.jwt()->>'role') = 'admin');

-- Deals: parents can read deals for their matches
create policy "parents_read_own_deals"
  on public.deals for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = deals.match_id
        and m.parent_id = auth.uid()
    )
  );

-- Admin: can read all deals
create policy "admin_read_all_deals"
  on public.deals for select
  using ((auth.jwt()->>'role') = 'admin');

-- ==========================
-- KPI QUERIES
-- matched → deal_done (7d / 30d) + median time
-- ==========================

-- 7 days conversion (events)
-- returns: matched_cnt, deal_done_cnt, deal_done_pct
-- (pct = deal_done / matched)
-- NOTE: if needed, add parent filter: AND m.parent_id = auth.uid()
--
-- select
--   count(*) filter (where e.to_status = 'matched') as matched_cnt,
--   count(*) filter (where e.to_status = 'deal_done') as deal_done_cnt,
--   case when count(*) filter (where e.to_status = 'matched') = 0 then 0
--        else round(100.0 * count(*) filter (where e.to_status = 'deal_done')
--                        / count(*) filter (where e.to_status = 'matched'), 2)
--   end as deal_done_pct
-- from public.match_events e
-- where e.to_status in ('matched','deal_done')
--   and e.ts >= now() - interval '7 days';

-- 30 days conversion (events)
-- select
--   count(*) filter (where e.to_status = 'matched') as matched_cnt,
--   count(*) filter (where e.to_status = 'deal_done') as deal_done_cnt,
--   case when count(*) filter (where e.to_status = 'matched') = 0 then 0
--        else round(100.0 * count(*) filter (where e.to_status = 'deal_done')
--                        / count(*) filter (where e.to_status = 'matched'), 2)
--   end as deal_done_pct
-- from public.match_events e
-- where e.to_status in ('matched','deal_done')
--   and e.ts >= now() - interval '30 days';

-- Median time from matched → deal_done (overall)
-- select percentile_cont(0.5) within group (order by dd.ts - mm.ts) as median_time
-- from (
--   select match_id, min(ts) as ts
--   from public.match_events
--   where to_status = 'matched'
--   group by match_id
-- ) mm
-- join (
--   select match_id, min(ts) as ts
--   from public.match_events
--   where to_status = 'deal_done'
--   group by match_id
-- ) dd using (match_id)
-- where dd.ts >= mm.ts;
