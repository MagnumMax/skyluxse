-- Fleet detail support tables and columns (11 Nov 2025)

set check_function_bodies = off;

-- Vehicles metadata --------------------------------------------------------
alter table if exists public.vehicles
  add column if not exists health_score numeric(5,2) check (health_score between 0 and 1),
  add column if not exists location text,
  add column if not exists image_url text;

-- Document link metadata ---------------------------------------------------
alter table if exists public.document_links
  add column if not exists doc_type text,
  add column if not exists notes text;

-- Vehicle reminders --------------------------------------------------------
create table if not exists public.vehicle_reminders (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  reminder_type text not null,
  due_date date not null,
  status text not null default 'scheduled',
  severity text not null default 'info',
  notes text,
  created_by uuid references public.staff_accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vehicle_reminders_vehicle_id_idx on public.vehicle_reminders(vehicle_id);
create index if not exists vehicle_reminders_due_date_idx on public.vehicle_reminders(due_date);

-- Vehicle inspections ------------------------------------------------------
create table if not exists public.vehicle_inspections (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  inspection_date date not null,
  driver_id uuid references public.driver_profiles(id) on delete set null,
  performed_by text,
  notes text,
  photo_document_ids uuid[] default '{}'::uuid[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vehicle_inspections_vehicle_id_idx on public.vehicle_inspections(vehicle_id);

-- Maintenance jobs ---------------------------------------------------------
create table if not exists public.maintenance_jobs (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  job_type text not null,
  status text not null default 'scheduled',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  odometer_start integer,
  odometer_end integer,
  vendor text,
  cost_estimate numeric(12,2),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists maintenance_jobs_vehicle_id_idx on public.maintenance_jobs(vehicle_id);
create index if not exists maintenance_jobs_scheduled_idx on public.maintenance_jobs(scheduled_start, scheduled_end);

-- Updated at triggers ------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_vehicle_reminders_updated') then
    create trigger trg_vehicle_reminders_updated
      before update on public.vehicle_reminders
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_vehicle_inspections_updated') then
    create trigger trg_vehicle_inspections_updated
      before update on public.vehicle_inspections
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_maintenance_jobs_updated') then
    create trigger trg_maintenance_jobs_updated
      before update on public.maintenance_jobs
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- Row level security -------------------------------------------------------
alter table public.vehicle_reminders enable row level security;
alter table public.vehicle_inspections enable row level security;
alter table public.maintenance_jobs enable row level security;

drop policy if exists "vehicle reminders read" on public.vehicle_reminders;
drop policy if exists "vehicle reminders manage" on public.vehicle_reminders;
drop policy if exists "service role vehicle reminders" on public.vehicle_reminders;
create policy "vehicle reminders read" on public.vehicle_reminders
  for select using (coalesce(public.current_app_role(),'operations') in ('operations','sales','ceo'));
create policy "vehicle reminders manage" on public.vehicle_reminders
  for all using (coalesce(public.current_app_role(),'operations') = 'operations')
  with check (coalesce(public.current_app_role(),'operations') = 'operations');
create policy "service role vehicle reminders" on public.vehicle_reminders
  for all using (auth.role() = 'service_role') with check (true);

drop policy if exists "vehicle inspections read" on public.vehicle_inspections;
drop policy if exists "vehicle inspections manage" on public.vehicle_inspections;
drop policy if exists "service role vehicle inspections" on public.vehicle_inspections;
create policy "vehicle inspections read" on public.vehicle_inspections
  for select using (coalesce(public.current_app_role(),'operations') in ('operations','sales','ceo'));
create policy "vehicle inspections manage" on public.vehicle_inspections
  for all using (coalesce(public.current_app_role(),'operations') = 'operations')
  with check (coalesce(public.current_app_role(),'operations') = 'operations');
create policy "service role vehicle inspections" on public.vehicle_inspections
  for all using (auth.role() = 'service_role') with check (true);

drop policy if exists "maintenance jobs read" on public.maintenance_jobs;
drop policy if exists "maintenance jobs manage" on public.maintenance_jobs;
drop policy if exists "service role maintenance jobs" on public.maintenance_jobs;
create policy "maintenance jobs read" on public.maintenance_jobs
  for select using (coalesce(public.current_app_role(),'operations') in ('operations','sales','ceo'));
create policy "maintenance jobs manage" on public.maintenance_jobs
  for all using (coalesce(public.current_app_role(),'operations') = 'operations')
  with check (coalesce(public.current_app_role(),'operations') = 'operations');
create policy "service role maintenance jobs" on public.maintenance_jobs
  for all using (auth.role() = 'service_role') with check (true);

-- Ensure staff access ------------------------------------------------------
comment on table public.vehicle_reminders is 'Reminder entries for vehicle compliance and maintenance tasks.';
comment on table public.vehicle_inspections is 'Inspection logs with optional document references.';
comment on table public.maintenance_jobs is 'Scheduled and historical maintenance/repair jobs per vehicle.';
