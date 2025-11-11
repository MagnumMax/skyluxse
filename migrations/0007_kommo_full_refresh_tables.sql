-- Creates run log + staging tables for Kommo full-refresh pipeline.
-- Generated 10 Nov 2025.

create table if not exists kommo_import_runs (
    id uuid primary key default gen_random_uuid(),
    triggered_by uuid references staff_accounts(id),
    status text not null default 'running',
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    leads_count integer not null default 0,
    contacts_count integer not null default 0,
    vehicles_count integer not null default 0,
    error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint kommo_import_runs_status_check
        check (status in ('running','succeeded','failed','needs_review'))
);

comment on table kommo_import_runs is 'Audit table for manual Kommo full-refresh runs triggered from UI.';
comment on column kommo_import_runs.triggered_by is 'Supabase auth user (staff_accounts.id) who launched the job.';
comment on column kommo_import_runs.status is 'running | succeeded | failed | needs_review.';

create table if not exists stg_kommo_leads (
    run_id uuid not null references kommo_import_runs(id) on delete cascade,
    lead_id bigint not null,
    contact_id bigint,
    vehicle_enum_id bigint,
    source_enum_id bigint,
    kommo_created_at timestamptz,
    kommo_updated_at timestamptz,
    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (run_id, lead_id)
);

comment on table stg_kommo_leads is 'Raw Kommo leads snapshot for a specific import run.';
comment on column stg_kommo_leads.payload is 'Full Kommo lead JSON for troubleshooting.';

create index if not exists stg_kommo_leads_lead_id_idx on stg_kommo_leads (lead_id);
create index if not exists stg_kommo_leads_contact_id_idx on stg_kommo_leads (contact_id);

create table if not exists stg_kommo_contacts (
    run_id uuid not null references kommo_import_runs(id) on delete cascade,
    contact_id bigint not null,
    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (run_id, contact_id)
);

comment on table stg_kommo_contacts is 'Raw Kommo contacts referenced by staged leads.';

create index if not exists stg_kommo_contacts_contact_id_idx on stg_kommo_contacts (contact_id);

create table if not exists stg_kommo_booking_vehicles (
    run_id uuid not null,
    lead_id bigint not null,
    vehicle_enum_id bigint not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (run_id, lead_id, vehicle_enum_id),
    constraint stg_kommo_booking_vehicles_lead_fk
        foreign key (run_id, lead_id)
        references stg_kommo_leads (run_id, lead_id)
        on delete cascade
);

comment on table stg_kommo_booking_vehicles is 'Denormalized select values (Vehicle) for staging joins.';
create index if not exists stg_kommo_booking_vehicles_enum_idx on stg_kommo_booking_vehicles (vehicle_enum_id);

