-- SkyLuxse ERP 2.0 - Initial schema baseline (9 Nov 2025)

set check_function_bodies = off;

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create type role_type as enum ('operations','sales','ceo','driver','integration');
create type driver_status as enum ('available','on_task','standby');
create type client_tier as enum ('vip','gold','silver');
create type client_segment as enum ('resident','tourist','business_traveller','special');
create type vehicle_status as enum ('available','in_rent','maintenance','reserved');
create type booking_status as enum ('lead','confirmed','delivery','in_progress','completed','cancelled');
create type booking_type as enum ('rental','chauffeur','transfer');
create type priority_level as enum ('low','medium','high','critical');
create type calendar_event_type as enum ('booking','maintenance','logistics');
create type event_status as enum ('scheduled','in_progress','done','cancelled');
create type task_type as enum ('pickup','delivery','inspection','document','custom');
create type task_status as enum ('todo','inprogress','done','blocked');
create type document_scope as enum ('client','vehicle','booking','task','lead');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Identity & roles ---------------------------------------------------------
create table if not exists public.staff_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email citext not null unique,
  phone text,
  role role_type not null default 'operations',
  locale text default 'en-CA',
  timezone text default 'Asia/Dubai',
  default_route text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.driver_profiles (
  id uuid primary key default uuid_generate_v4(),
  staff_account_id uuid references public.staff_accounts(id) on delete set null unique,
  status driver_status not null default 'available',
  experience_years integer,
  current_lat numeric(9,6),
  current_lng numeric(9,6),
  languages text[],
  notes text,
  last_status_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Clients & fleet ----------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  kommo_contact_id text,
  zoho_contact_id text,
  name text not null,
  phone text,
  email citext,
  residency_country text,
  tier client_tier not null default 'vip',
  segment client_segment not null default 'resident',
  outstanding_amount numeric(12,2) default 0,
  lifetime_value numeric(12,2) default 0,
  nps_score smallint,
  preferred_channels text[],
  preferred_language text,
  timezone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  external_ref text unique,
  name text not null,
  plate_number text,
  status vehicle_status not null default 'available',
  class text,
  segment text,
  mileage_km integer default 0,
  utilization_pct numeric(5,2) default 0,
  revenue_ytd numeric(12,2) default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Bookings -----------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  external_code text unique,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.driver_profiles(id) on delete set null,
  owner_id uuid references public.staff_accounts(id) on delete set null,
  status booking_status not null default 'lead',
  booking_type booking_type not null default 'rental',
  channel text default 'kommo',
  priority priority_level not null default 'medium',
  start_at timestamptz,
  end_at timestamptz,
  total_amount numeric(12,2) default 0,
  deposit_amount numeric(12,2) default 0,
  zoho_sales_order_id text,
  zoho_sync_status text default 'pending',
  created_by text default 'system',
  source_payload_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.booking_invoices (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade,
  label text,
  invoice_type text,
  amount numeric(12,2) not null,
  status text default 'pending',
  issued_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.booking_timeline_events (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete cascade,
  event_type text not null,
  message text,
  payload jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

-- Calendar & tasks ---------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  event_type calendar_event_type not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status event_status not null default 'scheduled',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  task_type task_type not null,
  status task_status not null default 'todo',
  title text not null,
  deadline_at timestamptz,
  assignee_driver_id uuid references public.driver_profiles(id) on delete set null,
  created_by uuid references public.staff_accounts(id) on delete set null,
  sla_minutes integer default 60,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.task_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade,
  label text not null,
  is_required boolean default false,
  is_complete boolean default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Documents ----------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  bucket text not null default 'documents',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  checksum text,
  created_by uuid references public.staff_accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.document_links (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents(id) on delete cascade,
  scope document_scope not null,
  entity_id uuid not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Sales pipeline -----------------------------------------------------------
create table if not exists public.sales_pipeline_stages (
  id text primary key,
  name text not null,
  probability numeric(5,2) not null,
  sla_days integer default 5
);

create table if not exists public.sales_leads (
  id uuid primary key default uuid_generate_v4(),
  lead_code text unique,
  client_id uuid references public.clients(id) on delete set null,
  owner_id uuid references public.staff_accounts(id) on delete set null,
  stage_id text references public.sales_pipeline_stages(id),
  value_amount numeric(12,2) default 0,
  expected_close_at timestamptz,
  ai_summary jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Integrations & observability --------------------------------------------
create table if not exists public.integrations_outbox (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid,
  target_system text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  next_run_at timestamptz not null default timezone('utc', now()),
  response jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.kommo_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  source_payload_id text,
  hmac_validated boolean default false,
  status text not null default 'received',
  payload jsonb not null,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.kpi_snapshots (
  id uuid primary key default uuid_generate_v4(),
  snapshot_date date not null,
  metrics jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_feedback_events (
  id uuid primary key default uuid_generate_v4(),
  entity_type text,
  entity_id uuid,
  model text,
  recommendation text,
  rating text,
  comment text,
  payload jsonb,
  created_by uuid references public.staff_accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_feature_flags (
  flag text primary key,
  is_enabled boolean not null default false,
  description text,
  rollout_notes text,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.sales_pipeline_stages (id, name, probability, sla_days) values
  ('prospect','Prospect',0.25,5),
  ('proposal','Proposal',0.6,7),
  ('won','Won',1.0,0)
on conflict (id) do nothing;

insert into public.system_feature_flags(flag, is_enabled, description) values
  ('enableKommoLive', false, 'Turns on live Kommo webhook ingestion'),
  ('enableZohoLive', false, 'Turns on Zoho API dispatch from outbox'),
  ('enableSlackAlerts', false, 'Turns on Slack alert webhooks for anomalies')
on conflict (flag) do nothing;

-- Helper function now that staff_accounts exists
create or replace function public.current_app_role()
returns role_type
language sql
stable
as $$
  select role
  from public.staff_accounts
  where id = auth.uid();
$$;

-- Indexes ------------------------------------------------------------------
create index if not exists idx_clients_kommo on public.clients(kommo_contact_id);
create index if not exists idx_bookings_client on public.bookings(client_id);
create index if not exists idx_bookings_owner on public.bookings(owner_id);
create index if not exists idx_tasks_driver on public.tasks(assignee_driver_id);
create index if not exists idx_integrations_outbox_status on public.integrations_outbox(status, next_run_at);
create index if not exists idx_kommo_payload_id on public.kommo_webhook_events(source_payload_id);

-- Triggers -----------------------------------------------------------------
create trigger trg_staff_accounts_updated
  before update on public.staff_accounts
  for each row execute function public.set_updated_at();
create trigger trg_driver_profiles_updated
  before update on public.driver_profiles
  for each row execute function public.set_updated_at();
create trigger trg_clients_updated
  before update on public.clients
  for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated
  before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger trg_bookings_updated
  before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger trg_booking_invoices_updated
  before update on public.booking_invoices
  for each row execute function public.set_updated_at();
create trigger trg_calendar_events_updated
  before update on public.calendar_events
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated
  before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger trg_task_items_updated
  before update on public.task_checklist_items
  for each row execute function public.set_updated_at();
create trigger trg_documents_updated
  before update on public.documents
  for each row execute function public.set_updated_at();
create trigger trg_sales_leads_updated
  before update on public.sales_leads
  for each row execute function public.set_updated_at();
create trigger trg_integrations_outbox_updated
  before update on public.integrations_outbox
  for each row execute function public.set_updated_at();
create trigger trg_system_feature_flags_updated
  before update on public.system_feature_flags
  for each row execute function public.set_updated_at();

-- RLS policies -------------------------------------------------------------
alter table public.staff_accounts enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_invoices enable row level security;
alter table public.booking_timeline_events enable row level security;
alter table public.calendar_events enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.documents enable row level security;
alter table public.document_links enable row level security;
alter table public.sales_pipeline_stages enable row level security;
alter table public.sales_leads enable row level security;
alter table public.integrations_outbox enable row level security;
alter table public.kommo_webhook_events enable row level security;
alter table public.kpi_snapshots enable row level security;
alter table public.ai_feedback_events enable row level security;
alter table public.system_feature_flags enable row level security;

create policy "self access" on public.staff_accounts
  for select using (auth.uid() = id);
create policy "self update" on public.staff_accounts
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "service role staff" on public.staff_accounts
  for all using (auth.role() = 'service_role') with check (true);

create policy "driver profile by owner" on public.driver_profiles
  for select using (auth.uid() = staff_account_id or auth.role() = 'service_role');
create policy "driver profile manage" on public.driver_profiles
  for all using (auth.role() = 'service_role') with check (true);

create policy "ops sales read clients" on public.clients
  for select using (coalesce(public.current_app_role(),'operations') in ('operations','sales','ceo'));
create policy "ops sales manage clients" on public.clients
  for insert with check (coalesce(public.current_app_role(),'operations') in ('operations','sales'));
create policy "ops sales update clients" on public.clients
  for update using (coalesce(public.current_app_role(),'operations') in ('operations','sales'));
create policy "service role clients" on public.clients
  for all using (auth.role() = 'service_role') with check (true);

create policy "role scoped read bookings" on public.bookings
  for select using (
    coalesce(public.current_app_role(),'operations') in ('operations','sales','ceo')
    or auth.uid() = owner_id
  );
create policy "role scoped mutate bookings" on public.bookings
  for all using (coalesce(public.current_app_role(),'operations') in ('operations','sales'))
  with check (coalesce(public.current_app_role(),'operations') in ('operations','sales'));
create policy "driver booking read" on public.bookings
  for select using (exists (
    select 1 from public.driver_profiles dp
    where dp.id = public.bookings.driver_id and dp.staff_account_id = auth.uid()
  ));
create policy "service role bookings" on public.bookings
  for all using (auth.role() = 'service_role') with check (true);

create policy "tasks read role" on public.tasks
  for select using (
    coalesce(public.current_app_role(),'operations') in ('operations','sales')
    or auth.uid() = (select staff_account_id from public.driver_profiles dp where dp.id = public.tasks.assignee_driver_id)
  );
create policy "tasks mutate ops" on public.tasks
  for all using (coalesce(public.current_app_role(),'operations') in ('operations'))
  with check (coalesce(public.current_app_role(),'operations') in ('operations'));
create policy "service role tasks" on public.tasks
  for all using (auth.role() = 'service_role') with check (true);

create policy "documents read staff" on public.documents
  for select using (auth.role() in ('authenticated','service_role'));
create policy "documents insert ops" on public.documents
  for insert with check (coalesce(public.current_app_role(),'operations') in ('operations','sales'));
create policy "documents service" on public.documents
  for all using (auth.role() = 'service_role') with check (true);

create policy "document links read" on public.document_links
  for select using (auth.role() in ('authenticated','service_role'));
create policy "document links manage" on public.document_links
  for all using (coalesce(public.current_app_role(),'operations') in ('operations','sales'))
  with check (coalesce(public.current_app_role(),'operations') in ('operations','sales'));
create policy "service role doc links" on public.document_links
  for all using (auth.role() = 'service_role') with check (true);

create policy "outbox read ops" on public.integrations_outbox
  for select using (coalesce(public.current_app_role(),'operations') in ('operations','integration','ceo'));
create policy "outbox insert service" on public.integrations_outbox
  for insert with check (auth.role() = 'service_role');
create policy "outbox update service" on public.integrations_outbox
  for update using (auth.role() = 'service_role');

create policy "feature flags read" on public.system_feature_flags
  for select using (auth.role() in ('authenticated','service_role'));
create policy "feature flags manage" on public.system_feature_flags
  for all using (auth.role() = 'service_role');

-- Storage buckets ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents','documents',false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('task-media','task-media',false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('analytics-exports','analytics-exports',false)
on conflict (id) do nothing;

create policy "documents bucket read" on storage.objects
  for select using (bucket_id = 'documents' and auth.role() in ('authenticated','service_role'));
create policy "task media read" on storage.objects
  for select using (bucket_id = 'task-media' and auth.role() in ('authenticated','service_role'));
create policy "analytics exports read" on storage.objects
  for select using (bucket_id = 'analytics-exports' and auth.role() in ('authenticated','service_role'));
create policy "service role storage write" on storage.objects
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
