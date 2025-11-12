-- Add created_by / updated_by columns for clients and vehicles (12 Nov 2025)

alter table if exists public.clients
  add column if not exists created_by uuid references public.staff_accounts(id) on delete set null,
  add column if not exists updated_by uuid references public.staff_accounts(id) on delete set null;

alter table if exists public.vehicles
  add column if not exists created_by uuid references public.staff_accounts(id) on delete set null,
  add column if not exists updated_by uuid references public.staff_accounts(id) on delete set null;
