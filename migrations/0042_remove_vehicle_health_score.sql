-- Remove deprecated vehicle readiness score column in favour of service scheduling metadata

alter table if exists public.vehicles
  drop column if exists health_score;
