-- Country-aware plan ownership across sync/recharge pipeline

alter table if exists provider_plans_raw
  add column if not exists country_code text;

alter table if exists agg_plans
  add column if not exists country_code text;

alter table if exists system_plans
  add column if not exists country_code text;

alter table if exists plan_mappings
  add column if not exists country_code text;

create index if not exists idx_provider_plans_raw_country_code
  on provider_plans_raw (country_code);

create index if not exists idx_agg_plans_country_code
  on agg_plans (country_code);

create index if not exists idx_system_plans_country_code
  on system_plans (country_code);

create index if not exists idx_plan_mappings_country_code
  on plan_mappings (country_code);

create index if not exists idx_system_plans_country_operator_signature
  on system_plans (country_code, system_operator_id, normalized_signature);
