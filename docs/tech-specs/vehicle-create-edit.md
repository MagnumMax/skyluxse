# Vehicle Create & Edit with Document Management

## Context
We need unified pages for vehicle creation and editing that mirror the detail view fields and add document management. Documents must live in the `vehicle-documents` storage bucket and be accessed via signed URLs only. No schema changes are required.

## Goals & Scope
- Add `/fleet/new` and `/fleet/[carId]/edit` pages sharing one form.
- Capture the same data shown on vehicle detail (profile/specs) while keeping utilisation read-only.
- Manage vehicle documents (upload, list, delete) under `scope = 'vehicle'`.
- Use signed URLs for all document downloads; never expose public URLs by default.

Out of scope:
- Changing database schema.
- Mandatory document types.
- Bulk imports (still handled via existing scripts/MCP SQL).

## Data Model (read/write)
- `vehicles`: editable fields — `name`, `make`, `model`, `vin`, `plate_number`, `status`, `body_style`, `model_year`, `exterior_color`, `interior_color`, `seating_capacity`, `engine_displacement_l`, `power_hp`, `cylinders`, `zero_to_hundred_sec`, `transmission`, `location`, `kommo_vehicle_id`, `mileage_km`. Audit fields (`created_at/by`, `updated_at/by`) read-only. `class`, `segment`, `image_url` are no longer editable or displayed in UI; `segment` is not used in data reads.
- Read-only values on the form: `utilization_pct` (computed), `revenue_ytd` (derived), service metrics (next service, mileageToService), reminders/maintenance history/inspections (display-only on edit).
- Documents: `documents` + `document_links` with `scope='vehicle'` and `entity_id=<vehicle_id>`. `doc_type` allowed: `insurance`, `mulkiya`, `registration`, `gallery`, `other`. Storage bucket: `vehicle-documents`. No custom metadata fields stored. Gallery items can be marked as hero image (stores `vehicles.image_url` as `bucket/storage_path`).

## UX Specification
- Routes:
  - `/fleet/new`: empty form, CTA “Create vehicle”.
  - `/fleet/[carId]/edit`: prefilled from `getFleetVehicleProfile(carId)`, CTA “Save changes”.
- Layout sections:
  - Unified form: display name (required), plate (required), status (select), location, Kommo vehicle ID (numeric string), mileage, VIN, make/model/year, body style, exterior/interior colour, seating, transmission, engine displacement (L), power (hp), cylinders, 0–100 km/h.
  - Operational snapshot: mileage (editable), utilisation % (read-only), revenue YTD (read-only), service status (next service, mileage to service, read-only).
- Documents: list existing, upload new, delete. Show doc name/type; previews via signed links. Gallery items managed in a separate photo block with thumbnails and “set as hero” (updates `vehicles.image_url` to the storage path).
- States:
  - Loading: skeleton for edit load + document list placeholder.
  - Validation errors inline per field; upload errors shown per file row.
  - Success toasts on create/update/upload/delete; redirect to detail after save.

## Server/API Design
- Server actions or API routes under `/api/fleet/vehicles`:
  - `POST /api/fleet/vehicles`: create vehicle with editable fields; returns `id`.
  - `PATCH /api/fleet/vehicles/:id`: update vehicle.
  - All writes performed via Supabase service client; audit fields set by Postgres triggers; do not touch utilisation/service metrics.
- Document endpoints:
  - `POST /api/fleet/vehicles/:id/documents`: multipart upload `{ file, doc_type, name?, status?, expiry?, number?, notes? }`.
    - Steps: upload to `vehicle-documents/<vehicle_id>/<uuid>.<ext>`; insert into `documents` (bucket, storage_path, original_name, mime_type, size_bytes, metadata); insert `document_links` row (`scope='vehicle'`, `entity_id=:id`, `doc_type`, `metadata`, `document_id`).
    - Response includes signed URL via `serviceClient.storage.from(bucket).createSignedUrl(path, ttl)`.
  - `DELETE /api/fleet/vehicles/:id/documents/:documentId`: remove link and storage object; idempotent if missing. Optionally keep `documents` row if shared elsewhere.
- Downloads/previews: use `buildStorageAccessUrl` (signed) with TTL; fall back to public only on signing failure.
- Validation:
  - `doc_type` ∈ {insurance, mulkiya, registration, gallery, other}; `doc_type=gallery` treated as gallery asset (no expiry/status enforcement).
  - File size limit 10 MB; MIME allowlist `image/*, application/pdf`.
  - `kommo_vehicle_id` numeric string; VIN max 17 uppercase.
- Security:
  - Only service role routes perform storage writes; client uploads go through API (no direct client-side Supabase storage calls).
  - No secrets in responses; signed URLs time-bound.

## UI Behaviour for Documents
- Existing documents: render list with name/type/status/expiry + “View” (opens signed link) and “Delete”.
- Upload flow:
  - Select doc type and optional name/status/expiry/notes.
  - Dropzone/button to pick file(s); show progress; disable save while uploading.
  - After upload completes, refresh list from server response.
- Delete flow: confirm, call delete endpoint; optimistic remove with rollback on failure.

## Testing Plan
- Unit: map form state ↔ payload (create/update), doc metadata builder, validators (VIN, year range, Kommo ID numeric, doc_type).
- Integration/e2e (Playwright/Vitest): create vehicle, attach document (PDF + image), verify it appears with signed URL, edit vehicle fields, delete document and ensure it disappears.
- Commands to run locally before PR: `npm run lint`, `npm run typecheck`, `npm test`; targeted doc tests as added.

## Operational Notes
- No migrations. If new doc_type values are added later, update allowlist and UI select.
- Keep `docs/schemas/database-schema.md` untouched for this iteration; update only if schema changes occur in future.
