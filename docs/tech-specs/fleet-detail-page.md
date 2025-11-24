# Fleet Detail Page Refactor

_Last updated: 11 Nov 2025_

## Objectives
- Achieve 1:1 parity with `/beta#operations/fleet-detail/<carId>` using live Supabase data.
- Provide a reusable vehicle profile data contract for dashboard, maintenance intake, and future public catalog pages.
- Unblock downstream KPIs (utilisation, service readiness) by persisting reminders, inspections, and maintenance history in Postgres.

## Scope
1. **Database**: add missing fleet tables (`vehicle_reminders`, `vehicle_inspections`, `maintenance_jobs`) and extend `vehicles` + `document_links` columns needed by UI.
2. **Data layer**: expose a typed `getFleetVehicleProfile(id)` helper that aggregates vehicles, bookings, reminders, maintenance jobs, inspections, and document links in one server-safe function.
3. **UI**: modularise `/fleet/[carId]` into shareable components (hero, stats grid, reminder list, booking cards, maintenance timeline, documents, inspections, gallery) and ensure layout parity with shadcn primitives.
4. **Docs & tests**: update schema references, UI gap log, and add regression tests for booking derivation and maintenance timelines.

## Data Model Changes
| Object | Action | Notes |
| --- | --- | --- |
| `vehicles` | rely on existing `location text` and `image_url text`; remove dependency on the retired readiness score | readiness UI now leans on utilisation + service cadence. |
| `vehicle_reminders` | new table | `id uuid`, `vehicle_id`, `reminder_type`, `due_date`, `status`, `severity`, `notes`, `created_by`, timestamps. Indexed by `vehicle_id`. |
| `vehicle_inspections` | new table | `inspection_date date`, `driver_id`, `performed_by text`, `notes text`, `photo_document_ids uuid[]`. |
| `maintenance_jobs` | new table | `job_type`, `status`, schedule + actual ranges, odometer start/end, vendor, cost estimate, description. |
| `document_links` | add `doc_type text`, `notes text` | allows filtering insurance/mulkiya vs gallery media. |
| RLS | enable + policies for each new table | mirror existing `vehicles` policies (role-based read, service role manage).

All migrations follow Supabase guidance: dedicated SQL, deterministic `set_updated_at` triggers, and post-migration `VACUUM ANALYZE` if data backfills (ref: Supabase migration best practices, Context7 `/supabase/supabase`). `vehicles.created_at/updated_at` и новые `created_by/updated_by` (uuid fk `staff_accounts`) напрямую питают audit strip.

## Data Layer Architecture
```
lib/data/
  fleet-data.ts        # new module exporting getFleetVehicleProfile
  live-data.ts        # keeps generic helpers + shared fetch caches
```
- `getFleetVehicleProfile(vehicleId: string)` returns `{ vehicle: FleetCar; bookings: Booking[]; reminders; maintenance; inspections; documents }`.
- Use targeted fetchers with `cache()` + `noStore()` where appropriate: list endpoints stay cached; detail uses `noStore` per request.
- Document mapping: `document_links` rows filtered by `scope='vehicle'` and `doc_type` in (`insurance`,`mulkiya`,`gallery`). Derive `documentGallery` by selecting `doc_type='gallery'`.
- Maintenance timeline: unify `maintenance_jobs` + `vehicle_reminders` critical statuses to show chronological entries.

## UI Composition
- `VehicleProfileHero` (title, status pill, location, metadata chips)
- `VehicleAuditStrip` (created/updated with actor hints right below the hero metadata)
- `VehicleStatsGrid` (utilisation, mileage, revenue, next service)
- `VehicleBookingPanel` (active/next/last bookings)
- `VehicleRemindersCard`
- `VehicleMaintenanceTimeline`
- `VehicleInspectionsCard`
- `VehicleDocumentsCard`
- `VehicleGallery`

Each component receives explicit props to ease reuse. Shared helpers (formatNumber, formatCurrency, formatDateRange) move to `lib/formatters.ts`.

## Testing & QA
- Unit tests under `tests/fleet/` for:
  - `deriveBookings` (active/next/last logic)
  - `buildMaintenanceTimeline`
  - `mapVehicleDocuments`
- Snapshot or Storybook stories optional; at minimum cover hero + reminders.
- Commands: `npm run lint`, `npm run test`, optional targeted `node --test tests/fleet/*.test.ts`.

## Rollout Plan
| Phase | Description | Exit criteria |
| --- | --- | --- |
| 1. Schema | Apply migrations (tables + columns + policies) through MCP, backfill seed rows if needed. | `migrations/0023_fleet_detail_support.sql` merged, Supabase schema matches docs, `docs/schemas/CHANGELOG.md` updated. |
| 2. Data Layer | Introduce `lib/data/fleet-data.ts`, extend domain types, add document/reminder mappers, keep compatibility for existing consumers. | `getFleetVehicleProfile` used by `/fleet/[carId]`, unit tests green. |
| 3. UI Refactor | Extract components under `components/fleet/`, simplify page file, ensure shadcn primitives + responsive layout. | Page renders with modular components, no lint warnings, parity with `/beta` snapshot. |
| 4. QA & Docs | Update PRD/UI gap docs, add tests + manual QA checklist, run `npm run lint && npm run test`. | Tests pass, documentation refreshed, QA notes recorded in PR/commit message. |
