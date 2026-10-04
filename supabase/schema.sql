create table if not exists public.user_data (
  uid text primary key,
  settings jsonb not null default '{}'::jsonb,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id text primary key,
  value jsonb
);

alter table public.user_data enable row level security;
alter table public.app_settings enable row level security;

-- The application accesses these tables only through its server-side API.
-- Do not add public/anon policies unless the architecture is intentionally changed.
