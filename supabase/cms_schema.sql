-- Run in Supabase SQL Editor (once). Stores website CMS content as JSON.
-- Next.js reads/writes via PostgREST using service role.

create table if not exists cms_site (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_cms_site_updated_at on cms_site (updated_at desc);

-- Keep the app simple: service-role only. Enable RLS so anon can't read/write.
alter table cms_site enable row level security;

-- Optional: seed a single row for the singleton site config.
insert into cms_site (id, content)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

