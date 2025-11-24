# Vehicle Service Management (Maintenance/Repair)

## Objectives
- Allow operations to create and manage maintenance/repair windows directly on the vehicle detail page with type, location, and planned dates.
- Attach and remove documents for each service entry (no additional file-type/size restrictions beyond Supabase limits).
- Surface service windows in Booking detail and Fleet Calendar so rental slots are blocked for the planned interval.

## Scope
1) Data model: extend `maintenance_jobs` with `location`; allow documents via `document_links.scope = 'maintenance_job'`; reuse `scheduled_start/ scheduled_end` as planned start/end; keep `actual_end` as completion marker (optional).  
2) API: CRUD for services + document upload/delete under `/api/fleet/vehicles/:vehicleId/services`; return enriched entries with signed URLs.  
3) UI: vehicle detail gains a “Service” block with list + create/edit form, doc upload/delete per service; Booking detail shows blocking service windows for the assigned vehicle; Fleet Calendar already consumes `maintenance_jobs` and should render the new entries with the planned interval.  
4) Testing/QA: validation of date range and type, attachment flows, calendar surfacing, booking block messaging.

Out of scope: predictive maintenance, automation checklists, vendor onboarding.

## Data Model & Migrations
- `maintenance_jobs`
  - Add `location text`.
  - Continue to use `scheduled_start` / `scheduled_end` as planned window; `actual_end` is the completion timestamp when present.
  - RLS/policies unchanged.
- `document_scope` enum: add `maintenance_job` to allow scoped attachments.
- Storage: bucket `vehicle-documents`, path template `services/<maintenance_job_id>/<uuid>-<sanitized_name>`.
- Docs update: reflect new column + scope in `docs/schemas/database-schema.md` and log in `docs/schemas/CHANGELOG.md`.

## API Design
- `POST /api/fleet/vehicles/:vehicleId/services`
  - Body: `{ type: "maintenance" | "repair", location: string, plannedStart: string, plannedEnd: string, notes?: string }`.
  - Validation: required fields, `plannedStart <= plannedEnd`, trims strings. Creates `maintenance_jobs` row with `scheduled_start/_end` and `description`, returns normalized service DTO.
- `PATCH /api/fleet/vehicles/:vehicleId/services/:serviceId`
  - Same payload fields (all optional), updates row.
- `DELETE /api/fleet/vehicles/:vehicleId/services/:serviceId`
  - Deletes job + cascades: removes linked `document_links` with `scope='maintenance_job'`, deletes storage objects if no other links remain.
- Documents
  - `POST /api/fleet/vehicles/:vehicleId/services/:serviceId/documents` (multipart `{ file }`)
  - `DELETE /api/fleet/vehicles/:vehicleId/services/:serviceId/documents/:documentId`
  - Scope `maintenance_job`; reuse signed URL builder; no extra size/MIME validation beyond storage failure handling.
- Responses return normalized service objects `{ id, vehicleId, type, plannedStart, plannedEnd, location, notes, documents[] }` so UI can update optimistically.

## Data Layer
- `getVehicleServices(vehicleId)` returns enriched `VehicleMaintenanceEntry[]` with `plannedStart/plannedEnd`, `location`, `description`, `documents`.
- `getFleetVehicleProfile` consumes `getVehicleServices` (exposed as `maintenanceHistory` or `services` prop on the vehicle profile).
- Calendar events builder pulls `scheduled_start/_end` to create maintenance/repair events; title includes type + location snippet for readability.

## UI/UX
- Vehicle detail: new “Service” card
  - List existing entries with type badge, planned range, location, notes, and attached files (open/delete).
  - “Add service” inline form: type select (Maintenance/Repair), location text, planned start/end (date+time), optional notes; creates row and refreshes list.
  - Per-entry document uploader (drag/drop or button) with progress + delete.
  - Delete service with confirm; disables actions during network calls; success/error toasts.
- Booking detail:
  - Show overlapping/nearby service windows for the booking’s vehicle; if the booking interval intersects a service, display a blocking pill “Vehicle in service <dates> at <location>”.
  - Link to vehicle detail for context.
- Fleet Calendar:
  - Maintenance/repair events reflect new rows automatically; labels include type + location; span covers plannedStart→plannedEnd; clicking a service event keeps existing behaviour (no modal yet).

## Validation & Rules
- Type allowlist: `maintenance`, `repair`.
- Location: free text, required.
- Dates: ISO strings, plannedStart <= plannedEnd. Completion uses `actual_end` when set (optional).
- Files: no custom limits; rely on Supabase storage constraints and return descriptive errors on failure.

## Testing
- Unit: mapper for `maintenance_jobs` → service DTO (dates, location, documents), calendar event builder includes location in title.
- Integration/API: create/update/delete service, upload/delete document, cascade deletes storage when unlinked.
- UI: component tests for service form validation and list rendering with attachments; Booking detail renders service blockers.
- Commands: `npm run lint`, `npm run typecheck`, targeted `npm run test:component` for new UI pieces.
