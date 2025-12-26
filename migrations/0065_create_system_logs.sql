-- Create system logs table for critical events tracking

create type system_log_level as enum ('info', 'warning', 'error', 'critical');
create type system_log_category as enum ('system', 'kommo', 'zoho', 'auth', 'booking', 'task');

create table if not exists system_logs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now() not null,
    level system_log_level not null default 'info',
    category system_log_category not null default 'system',
    message text not null,
    metadata jsonb default '{}'::jsonb,
    entity_id text,
    entity_type text
);

-- Add index for fast filtering
create index if not exists system_logs_created_at_idx on system_logs(created_at desc);
create index if not exists system_logs_category_idx on system_logs(category);
create index if not exists system_logs_level_idx on system_logs(level);
create index if not exists system_logs_entity_idx on system_logs(entity_type, entity_id);

-- Enable RLS
alter table system_logs enable row level security;

-- Policy: Authenticated users (staff) can view logs
create policy "Staff can view system logs"
    on system_logs for select
    to authenticated
    using (true);

-- Policy: Service role can insert logs (or authenticated users if we log from client side actions)
create policy "Authenticated users can insert system logs"
    on system_logs for insert
    to authenticated
    with check (true);
