-- Support chat (family <-> support) MVP

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('support')),
  family_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_agents (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  thread_id uuid references public.chat_threads(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('family','support')),
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  sender_id uuid not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.chat_messages(id) on delete cascade,
  url text not null,
  type text not null check (type in ('image','file')),
  size int,
  created_at timestamptz not null default now()
);

alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_attachments enable row level security;
alter table public.support_agents enable row level security;

-- Policies: participants can read/write, support agents can access all support threads

create policy "support_agents_select" on public.support_agents
for select using (user_id = auth.uid());

create policy "support_threads_select" on public.chat_threads
for select using (
  exists (
    select 1 from public.chat_participants p
    where p.thread_id = chat_threads.id and p.user_id = auth.uid()
  )
  or exists (select 1 from public.support_agents sa where sa.user_id = auth.uid())
);

create policy "support_threads_insert" on public.chat_threads
for insert with check (auth.uid() = family_id);

create policy "support_participants_select" on public.chat_participants
for select using (
  user_id = auth.uid()
  or exists (select 1 from public.support_agents sa where sa.user_id = auth.uid())
);

create policy "support_participants_insert" on public.chat_participants
for insert with check (
  user_id = auth.uid()
  or exists (select 1 from public.support_agents sa where sa.user_id = auth.uid())
);

create policy "support_messages_select" on public.chat_messages
for select using (
  exists (
    select 1 from public.chat_participants p
    where p.thread_id = chat_messages.thread_id and p.user_id = auth.uid()
  )
  or exists (select 1 from public.support_agents sa where sa.user_id = auth.uid())
);

create policy "support_messages_insert" on public.chat_messages
for insert with check (
  exists (
    select 1 from public.chat_participants p
    where p.thread_id = chat_messages.thread_id and p.user_id = auth.uid()
  )
  or exists (select 1 from public.support_agents sa where sa.user_id = auth.uid())
);

create policy "support_attachments_select" on public.chat_attachments
for select using (
  exists (
    select 1 from public.chat_messages m
    join public.chat_participants p on p.thread_id = m.thread_id
    where m.id = chat_attachments.message_id and p.user_id = auth.uid()
  )
  or exists (select 1 from public.support_agents sa where sa.user_id = auth.uid())
);

create policy "support_attachments_insert" on public.chat_attachments
for insert with check (
  exists (
    select 1 from public.chat_messages m
    join public.chat_participants p on p.thread_id = m.thread_id
    where m.id = chat_attachments.message_id and p.user_id = auth.uid()
  )
  or exists (select 1 from public.support_agents sa where sa.user_id = auth.uid())
);
