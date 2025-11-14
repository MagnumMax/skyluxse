-- Align documents metadata with Kommo ingestion (13 Nov 2025)

set check_function_bodies = off;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type public.document_status as enum ('needs_review', 'verified', 'expired');
  end if;
end $$;

alter table if exists public.documents
  add column if not exists original_name text,
  add column if not exists status public.document_status not null default 'needs_review',
  add column if not exists source text,
  add column if not exists expires_at date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.documents
  set original_name = coalesce(original_name, file_name),
      metadata = coalesce(metadata, '{}'::jsonb)
  where original_name is null
     or metadata is null;

alter table if exists public.documents
  alter column original_name set not null;

comment on type public.document_status is 'Documents lifecycle state (needs_review, verified, expired).';
comment on column public.documents.original_name is 'Human-readable file label from upstream system.';
comment on column public.documents.status is 'Document review status (needs_review, verified, expired).';
comment on column public.documents.source is 'Source system indicator (Kommo, client upload, etc).';
comment on column public.documents.expires_at is 'Optional compliance expiry date.';
comment on column public.documents.metadata is 'JSON metadata (Kommo IDs, notes, extracted numbers).';
