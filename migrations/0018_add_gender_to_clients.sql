alter table if exists public.clients
  add column if not exists gender text;

comment on column public.clients.gender is 'Normalized gender value sourced from Kommo contacts (e.g., Male, Female).';
