# Kommo Full-Refresh Import Spec

_Last updated: 10 Nov 2025_

## Goal
Provide a **push-button** workflow that replaces all Kommo-derived bookings, clients, and vehicle links in Supabase with a deterministic snapshot (leads created in 2025, pipeline status `!= 143`). The import must be idempotent, observable, and safe to re-run without leaving partial data.

## Trigger & Flow
1. **UI button** “Обновить букинги из Kommo” on the Bookings page calls `POST /api/integrations/kommo/full-refresh`.
2. Next.js API route proxies the call to Supabase Edge Function `import-kommo-refresh` (new) with the caller’s Supabase session for audit.
3. Edge Function orchestrates the refresh:
   - Validates feature flag `enableKommoLive`.
   - Creates an import run record (`kommo_import_runs`) and acquires advisory lock (`pg_try_advisory_lock(42)`) to avoid concurrent jobs.
   - Streams Kommo data → staging tables.
   - Executes transactional swap into production tables.
   - Updates run status + emits log/Slack alert.

```
UI Button --> Next.js API route --> Edge Function (import-kommo-refresh)
                 |                          |
                 |                Supabase Postgres (staging + prod tables)
                 v                          v
          Toast feedback             bookings/clients/vehicles
```

## External Filters
- `created_at >= '2025-01-01T00:00:00Z'`
- `created_at < '2026-01-01T00:00:00Z'`
- `status_id != 143`
- `with=contacts,catalog_elements` (for inline contact IDs)
- Page size 250; iterate with `_page` until `_links.next` exhausted.

## Staging Layer
Each run writes into staging tables scoped by `run_id` (UUID). Tables live in `public` schema for now; RLS disabled because only service role touches them.

### `stg_kommo_leads`
| Column | Type | Notes |
| --- | --- | --- |
| run_id | uuid | FK → `kommo_import_runs.id`. |
| lead_id | bigint | Kommo ID. |
| payload | jsonb | Raw lead for troubleshooting. |
| contact_id | bigint | Main contact ID (nullable). |
| vehicle_enum_id | bigint | From custom field 1234163. |
| source_enum_id | bigint | From custom field 823206. |
| created_at | timestamptz | Copied from Kommo. |
| updated_at | timestamptz | |

### `stg_kommo_contacts`
| Column | Type | Notes |
| --- | --- | --- |
| run_id | uuid | |
| contact_id | bigint | Kommo ID. |
| payload | jsonb | Includes name, phones, emails, documents. |

### `stg_kommo_booking_vehicles`
| Column | Type | Notes |
| --- | --- | --- |
| run_id | uuid | |
| lead_id | bigint | |
| vehicle_enum_id | bigint | Resolved to `vehicles.kommo_vehicle_id`. |

## Production Swap
Performed inside a single transaction after staging is populated and validated.

1. **Pre-checks**
   - Count leads/contacts in staging; abort if zero.
   - Compare new counts vs. previous run (`kommo_import_runs.last_success_count`) to detect accidental narrows (>30% drop triggers `status = 'needs_review'` and abort).
2. **Disable triggers** (optional) on `bookings`, `booking_vehicles`, `sales_leads` if they write to outbox—use `SET session_replication_role = 'replica'` or dedicated flags.
3. **Soft delete current Kommo data**
   - `UPDATE bookings SET is_active = false WHERE channel = 'Kommo';`
   - `UPDATE sales_leads SET archived_at = now() WHERE source = 'Kommo';`
   - Or physically delete rows where `source_payload_id IS NOT NULL AND channel='Kommo'` once no downstream dependency.
4. **Upsert clients**
   - `INSERT INTO clients (...) SELECT ... FROM stg_kommo_contacts` with `ON CONFLICT (kommo_contact_id)` update name/phone/email.
5. **Upsert sales_leads**
   - `INSERT INTO sales_leads (lead_code, client_id, stage_id, value_amount, owner_id, expected_close_at, created_at, updated_at, source)`
     from staging join `clients`.
6. **Upsert bookings**
   - Insert rows with `channel='Kommo'`, `source_payload_id = 'kommo:' || lead_id`, `source` from enum mapping, `owner_id` resolved via mapping table `kommo_user_map`.
   - Parse custom fields “Date/Time Delivery” (ID `1218176`) and “Date/Time Collect” (ID `1218178`) via helper `extract_kommo_epoch` to hydrate `bookings.start_at` / `bookings.end_at`; fall back to whichever timestamp is present to keep the record calendar-ready.
   - Map pipeline statuses to `bookings.status` per `docs/schemas/kommo-import-mapping.md` and persist `vehicle_id` when a `stg_kommo_booking_vehicles.vehicle_enum_id` matches `vehicles.kommo_vehicle_id`.
   - Лиды в статусах `79790631 (Request bot answering)`, `91703923 (Follow up)` и `143 (Closed - lost)` считаются “вне подтверждения” — остаются в `sales_leads`, но не попадают в `bookings`/календарь, хотя их `status_id` записывается в `bookings.kommo_status_id` для всех остальных стадий.
7. **Link vehicles**
   - Ensure each `vehicles.kommo_vehicle_id` exists (create missing rows on the fly).
   - Populate `booking_vehicles` linking the inserted booking ID with the resolved vehicle ID; mark `primary = true`.
   - Calendar UI reads from the `calendar_events_expanded` view, which unions manual `calendar_events` rows with these hydrated Kommo bookings, so any missing timestamps/vehicle IDs immediately manifest as gaps.
8. **Re-enable triggers**, recompute `bookings.updated_at`.
9. **Commit transaction**.

## Run Logging (`kommo_import_runs`)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | Generated at run start. |
| triggered_by | uuid | Supabase auth user. |
| status | text | `running`,`succeeded`,`failed`,`needs_review`. |
| started_at | timestamptz | |
| finished_at | timestamptz | |
| leads_count | int | Number of rows imported. |
| contacts_count | int | Distinct contacts. |
| vehicles_count | int | Distinct vehicle links. |
| error | text | Last error stack. |

Emit structured log lines (`console.info`) and optional Slack alert via `enableSlackAlerts`.

## Failure Handling & Retry
- If Kommo API errors mid-stream, mark run `failed`, store HTTP status + response, and leave staging tables for inspection (do not delete).
- If transactional swap errors, rollback automatically; staging remains for rerun.
- UI receives descriptive error and suggests checking logs.
- To rerun safely, operators click the same button; lock prevents concurrent runs.

## Security & Config
- Reads credentials from env (`KOMMO_BASE_URL`, `KOMMO_ACCESS_TOKEN`).
- Feature flag `enableKommoLive` guards the entire pathway; if false, API returns `403` with reason.
- Limit request origin to authenticated staff roles via RLS on `KommoRefresh` table or by checking `supabase.auth.getUser()` in the Edge Function.

## Open Questions / TODO
1. Decide whether to keep soft-deleted historical Kommo bookings or purge outright.
2. Confirm whether Kommo documents (passport scans) should be mirrored during refresh or left to realtime webhook ingestion only.
3. Define threshold alerting (e.g., send Slack if leads count drops by >30% vs. previous run).
4. Add snapshot export to S3 before replacement if auditors require raw Kommo data retention.

## Implementation Outline

### Next.js API Route (`app/api/integrations/kommo/full-refresh/route.ts`)
- Resolves пользователя по `Authorization: Bearer <access_token>` (используем `serviceClient.auth.getUser`), либо принимает `triggeredBy` явно из тела запроса.
- Вызывает Edge Function через `serviceClient.functions.invoke('kommo-full-refresh', { body: { year }, headers: { 'x-user-id': userId } })`.
- Возвращает `202 Accepted` + payload `{ runId, status, leads, contacts, vehicles }`, чтобы UI мог показать прогресс.

### Edge Function (`supabase/functions/kommo-full-refresh/index.ts`)
Pseudo flow:
```ts
import { createClient } from '@supabase/supabase-js'
import { fetchLeadsPaged } from './kommoClient'
import { upsertStaging, swapIntoProd } from './pipeline'

serve(async (req) => {
  const { year = 2025 } = await req.json().catch(() => ({}))
  guardFeatureFlag('enableKommoLive')

  const supabase = createServiceClient()
  const runId = await startRun(req.headers.get('x-user-id'))

  try {
    const counters = await stageKommoPayloads(year, runId) // pagination, contacts batching, vehicle links
    await supabase.rpc('run_kommo_full_refresh', { p_run_id: runId })
    await finishRun(runId, 'succeeded', counters)
    return json({ runId, status: 'succeeded', ...counters })
  } catch (error) {
    await finishRun(runId, 'failed', { leads: 0, contacts: 0, vehicles: 0 }, error)
    return json({ runId, status: 'failed', error: String(error) }, 500)
  }
})
```

### Supporting Modules
- `supabase/functions/kommo-full-refresh/kommoClient.ts`
  - Wraps Kommo API with rate-limit aware `fetch` using env vars.
  - Exposes `fetchLeadsPaged`, `fetchContactsBatch`, `fetchVehicleEnums`.
  - Retries 429/5xx with exponential backoff.
- `supabase/functions/kommo-full-refresh/pipeline.ts`
  - `upsertStaging`: inserts into `stg_kommo_*` via RPC `insert_stg_kommo_lead`, bundling batched contacts to limit network chatter.
  - `swapIntoProd`: runs a SQL function `run_kommo_full_refresh(run_id)` so the heavy lifting happens in Postgres (maintains transaction boundaries, uses `perform_full_refresh` DO block).
- `supabase/functions/kommo-full-refresh/logger.ts`
  - Wraps `console.info/error` with `run_id` context + optional Slack webhook when `enableSlackAlerts` is true.

### Database Helpers (RPC / SQL)
1. `start_kommo_import_run` – inserts run, ставит advisory lock (90901).
2. `insert_stg_kommo_lead`, `insert_stg_kommo_contact`, `insert_stg_kommo_vehicle_link` – idempotent upserts в staging.
3. `run_kommo_full_refresh` – transactional swap (delete прежние Kommo rows, апсерты клиентов/лидов/букингов, обновление счётчиков).
4. `finish_kommo_import_run` – обновляет статус/ошибку и снимает lock.

These routines should live in `/migrations` and be mirrored in `/docs/schemas/CHANGELOG.md`.

### Deployment Notes
- Edge Function uses `deno.json` bundler already configured under `supabase/functions`. Reuse patterns from `import-kommo`.
- Add `kommo-full-refresh` to `supabase/functions/config.toml` with timeout ≥ 120s and memory ≥ 512MB (bulk imports need headroom).
- Next.js API route is purely orchestrational; heavy logic stays in Edge Function/Postgres to keep secrets server-side.

## Validation & Testing Plan

| Layer | Test | Command / Notes |
| --- | --- | --- |
| Unit (Edge Function) | Mock Kommo API responses and assert pagination, staging inserts, error retry logic. | `deno test supabase/functions/kommo-full-refresh/**/*.test.ts` with `std/testing`. |
| SQL functions | Verify `run_kommo_full_refresh(run_id)` swaps data atomically and respects guard rails (count drops abort run). | `supabase db test` or `npm run test:db` calling `mcp__...execute_sql` fixtures. |
| Integration (local) | Spin up Supabase via `supabase start`, seed `.env.local`, run Edge Function against fixture JSON to ensure bookings/clients inserted correctly. | `pnpm supabase:functions:serve kommo-full-refresh --env-file .env.local`. |
| UI flow | Cypress/Playwright click button, mock success + failure responses, assert toasts + polling updates. | `pnpm test:e2e --filter kommo-refresh`. |
| Regression | After deployment, schedule nightly dry-run in staging; compare `kommo_import_runs` counts vs. previous day and alert on drift >30%. | Implement via Supabase Scheduler + Slack. |

Manual checklist per run:
1. Confirm `kommo_import_runs.status = 'succeeded'`.
2. Sample 5 bookings and verify `vehicle_id`, `client_id`, `source_payload_id`.
3. Ensure Zoho outbox counts unchanged (full refresh should not enqueue duplicates).

This spec must be updated before implementing schema changes or altering the replacement strategy.
