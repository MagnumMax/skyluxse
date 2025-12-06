-- Add external_crm_id to staff_accounts for Kommo user mapping (06 Dec 2025)

alter table if exists public.staff_accounts
  add column if not exists external_crm_id text unique;

comment on column public.staff_accounts.external_crm_id is 'External CRM User ID (e.g. Kommo Responsible User ID) for mapping imports.';

create index if not exists idx_staff_accounts_external_crm on public.staff_accounts(external_crm_id);
