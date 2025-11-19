alter table public.clients
  add column if not exists doc_raw jsonb,
  add column if not exists doc_status text,
  add column if not exists doc_confidence numeric(5,2),
  add column if not exists doc_type text,
  add column if not exists doc_full_name text,
  add column if not exists doc_first_name text,
  add column if not exists doc_last_name text,
  add column if not exists doc_middle_name text,
  add column if not exists doc_date_of_birth date,
  add column if not exists doc_nationality text,
  add column if not exists doc_address text,
  add column if not exists doc_document_number text,
  add column if not exists doc_issue_date date,
  add column if not exists doc_expiry_date date,
  add column if not exists doc_issuing_country text,
  add column if not exists doc_driver_class text,
  add column if not exists doc_driver_restrictions text,
  add column if not exists doc_driver_endorsements text,
  add column if not exists doc_processed_at timestamptz,
  add column if not exists doc_model text,
  add column if not exists doc_error text,
  add column if not exists doc_document_id uuid references public.documents(id);

comment on column public.clients.doc_status is 'Document recognition status: pending|processing|done|failed|fallback_pro';
comment on column public.clients.doc_confidence is 'Confidence score from Gemini (0-1)';
comment on column public.clients.doc_model is 'Model used for last successful run (gemini-2.5-flash|gemini-2.5-pro)';
comment on column public.clients.doc_document_id is 'Source document id used for last run';
