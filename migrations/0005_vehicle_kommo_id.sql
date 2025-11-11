-- SkyLuxse ERP 2.0 - Kommo vehicle linkage (10 Nov 2025)

alter table if exists public.vehicles
  add column if not exists kommo_vehicle_id text;

alter table if exists public.vehicles
  add constraint vehicles_kommo_vehicle_id_unique unique (kommo_vehicle_id);
