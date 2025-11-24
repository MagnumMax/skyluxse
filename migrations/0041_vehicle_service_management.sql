-- Vehicle service management: location on maintenance_jobs + maintenance_job document scope

set check_function_bodies = off;

-- Document scope for maintenance/repair service attachments
alter type public.document_scope add value if not exists 'maintenance_job';

-- Location of the service (free text, required at API level)
alter table if exists public.maintenance_jobs
  add column if not exists location text;
