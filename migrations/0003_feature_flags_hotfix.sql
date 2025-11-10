-- 2025-11-09: Hotfix to bootstrap system feature flags for Next.js feature gate usage

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.system_feature_flags (
  flag text primary key,
  is_enabled boolean not null default false,
  description text,
  rollout_notes text,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_system_feature_flags_updated
  before update on public.system_feature_flags
  for each row execute function public.set_updated_at();

alter table public.system_feature_flags enable row level security;

do $$
begin
  create policy "feature flags read" on public.system_feature_flags
    for select using (auth.role() in ('authenticated','service_role'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "feature flags manage" on public.system_feature_flags
    for all using (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end $$;

insert into public.system_feature_flags(flag, is_enabled, description) values
  ('enableKommoLive', false, 'Turns on live Kommo webhook ingestion'),
  ('enableZohoLive', false, 'Turns on Zoho API dispatch from outbox'),
  ('enableSlackAlerts', false, 'Turns on Slack alert webhooks for anomalies'),
  ('enableAiCopilot', false, 'Turns on AI lead copilot + SLA nudges'),
  ('enableTelemetryPipelines', false, 'Turns on external telemetry + Slack routing')
on conflict (flag) do nothing;
