alter table public.bookings add column if not exists full_insurance_fee numeric(12,2);

update public.bookings
set full_insurance_fee = abs(((regexp_match(insurance_fee_label, '(-?\d+(?:\.\d+)?)'))[1])::numeric)
where insurance_fee_label ~ '(-?\d+(?:\.\d+)?)' and full_insurance_fee is null;
