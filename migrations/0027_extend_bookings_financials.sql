alter table if exists public.bookings
  add column if not exists delivery_fee_label text,
  add column if not exists delivery_location text,
  add column if not exists collect_location text,
  add column if not exists rental_duration_days integer,
  add column if not exists price_daily numeric(12,2),
  add column if not exists insurance_fee_label text,
  add column if not exists advance_payment numeric(12,2),
  add column if not exists sales_order_url text,
  add column if not exists agreement_number text;
