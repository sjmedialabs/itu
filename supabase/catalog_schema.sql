-- Run in Supabase SQL Editor (once). Service role from Next.js reads/writes via PostgREST.

create extension if not exists pgcrypto;

create table if not exists countries (
  country_iso text primary key,
  name text not null,
  dial_prefix text not null,
  min_length int default 10,
  max_length int default 15
);

create table if not exists operators (
  id uuid primary key default gen_random_uuid(),
  country_iso text not null references countries (country_iso) on delete cascade,
  code text not null,
  name text not null,
  short_name text,
  logo_url text,
  validation_regex text,
  region_code text,
  is_default boolean default false,
  unique (country_iso, code)
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  sku_code text not null unique,
  country_iso text not null references countries (country_iso) on delete cascade,
  operator_code text not null,
  price_inr numeric default 0,
  price_eur numeric default 0,
  validity text default '',
  plan_type text default 'topup',
  tag text default 'none',
  benefits text,
  data_label text,
  calls_label text,
  sms_label text,
  plan_name text,
  benefits_json jsonb default '[]'::jsonb,
  min_send_amount numeric,
  max_send_amount numeric,
  send_currency text default 'EUR',
  min_receive_amount numeric,
  max_receive_amount numeric,
  receive_currency text default 'INR',
  commission_rate numeric default 0,
  processing_mode text default 'Instant'
);

create index if not exists idx_operators_country on operators (country_iso);
create index if not exists idx_plans_country_operator on plans (country_iso, operator_code);

alter table countries enable row level security;
alter table operators enable row level security;
alter table plans enable row level security;
