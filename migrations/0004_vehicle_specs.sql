-- SkyLuxse ERP 2.0 - Vehicle specification fields (10 Nov 2025)

alter table if exists public.vehicles
  add column if not exists make text,
  add column if not exists model text,
  add column if not exists vin text,
  add column if not exists model_year smallint check (model_year between 1980 and 2100),
  add column if not exists exterior_color text,
  add column if not exists interior_color text,
  add column if not exists body_style text,
  add column if not exists seating_capacity smallint check (seating_capacity between 1 and 20),
  add column if not exists engine_displacement_l numeric(4,2) check (engine_displacement_l > 0),
  add column if not exists power_hp smallint check (power_hp between 50 and 1200),
  add column if not exists cylinders smallint check (cylinders between 2 and 16),
  add column if not exists zero_to_hundred_sec numeric(4,2) check (zero_to_hundred_sec > 0),
  add column if not exists transmission text;

alter table if exists public.vehicles
  add constraint vehicles_vin_unique unique (vin);
