alter table public.bookings
  add constraint bookings_source_payload_unique unique (source_payload_id);
