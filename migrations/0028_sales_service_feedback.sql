alter table if exists public.bookings
  add column if not exists sales_service_rating smallint check (sales_service_rating between 1 and 10),
  add column if not exists sales_service_feedback text,
  add column if not exists sales_service_rated_by text,
  add column if not exists sales_service_rated_at timestamptz;

comment on column public.bookings.sales_service_rating is 'Leadership-posted sales service score on a 1-10 scale.';
comment on column public.bookings.sales_service_feedback is 'Optional qualitative feedback for the sales handoff.';
comment on column public.bookings.sales_service_rated_by is 'Actor reference (role or staff id) that submitted the score.';
comment on column public.bookings.sales_service_rated_at is 'Timestamp when the score was last updated.';
