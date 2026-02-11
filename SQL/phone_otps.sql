-- Phone OTP storage (server-side only)

create table if not exists public.phone_otps (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null,
  window_start timestamptz not null,
  send_count int not null default 0
);

alter table public.phone_otps enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'phone_otps'
      and policyname = 'deny all'
  ) then
    create policy "deny all" on public.phone_otps
      for all
      using (false)
      with check (false);
  end if;
end $$;
