-- Add mileage_limit to bookings for Zoho Sales Order integration (06 Dec 2025)

alter table if exists public.bookings
  add column if not exists mileage_limit text;

comment on column public.bookings.mileage_limit is 'Mileage limit for the booking (e.g. "250 km/day" or "-").';
