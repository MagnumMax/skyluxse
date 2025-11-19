# Integrations: Kommo Ingestion & Zoho Sync

_Last updated: 10 Nov 2025_

## Goals
- Treat Kommo as the primary source for booking requests, ensuring idempotent ingestion into our ERP (Supabase Postgres).
- Keep Zoho CRM/Sales Orders in lockstep with bookings and clients without blocking UI/API calls.
- Provide observability and retry mechanics through an `integrations_outbox` pattern.

## Architecture Overview
```
Kommo Webhook --> Next.js API route (/api/integrations/kommo/webhook)
                     |  writes bookings/clients/leads
                     v
             integrations_outbox (Zoho tasks)
                    |
         Supabase Edge Function (process-outbox) --> Zoho CRM API
```

## Feature Flags & Stub Strategy (MVP)
- Feature toggles live in `system_feature_flags` and are fetched via `lib/feature-flags.ts` (Next.js) or inside Edge Functions. Default `false` keeps external systems disconnected until credentials + contracts are finalized.
- Flag map:
  - `enableKommoLive`: controls Kommo ingestion pipeline.
  - `enableZohoLive`: controls Zoho outbox worker behaviour.
  - `enableSlackAlerts`: drives `lib/integrations/slack.ts`.
  - `enableAiCopilot`: powers `lib/integrations/ai.ts`.
  - `enableTelemetryPipelines`: powers `lib/integrations/telemetry.ts`.
- Toggling a flag happens via Supabase dashboard/SQL without redeploys. Use this as a kill-switch if external providers misbehave.

### Kommo webhook (`/api/integrations/kommo/webhook`)
- Hosted inside Next.js App Router (Vercel) and exposed via `/api/integrations/kommo/webhook`.
- Kommo CRM must point its webhook URL to `https://<APP_URL>/api/integrations/kommo/webhook` (using the same `x-kommo-signature` secret as before); there is no Supabase fallback anymore.
- Receives Kommo payload (booking metadata, client docs, dates, source IDs).
- Steps:
  1. Validate HMAC/secret to ensure payload authenticity.
  2. Upsert client: match by `kommo_contact_id` or email; update profile data (`clients.kommo_contact_id`).
  3. Resolve vehicle: extract `kommo_vehicle_id` from the Kommo dropdown field (field ID `1234163`, baked into the handler configuration with an optional env override) and then lookup `vehicles.kommo_vehicle_id` to map bookings and calendar events. Payload logs and responses now include `{ kommoVehicleId, vehicleId }` for observability.
  4. Принимаем только подтверждённые стадии Kommo: `96150292`, `75440391`, `75440395`, `75440399`, `76475495`, `78486287`, `75440643`, `75440639`, `142`. Payload’ы с другими статусами (включая `79790631`, `91703923`, `143`) помечаются `ignored_pending_status`, отвечают 202 и не дойдут до `bookings`/календаря; при этом их `status_id` продолжает записываться в `bookings.kommo_status_id` для аудита.
  4. Upsert booking:
     - Find by `source_payload_id` or `external_code`.
     - If new, insert into `bookings` with `channel = 'Kommo'`, `created_by = 'system-kommo'`, `owner_id` resolved via mapping table (Kommo manager -> staff_accounts).
     - Create/refresh `booking_invoices`, `calendar_events`, `sales_leads` snapshot if needed.
  5. Enqueue Zoho tasks: insert rows into `integrations_outbox` for `contact.upsert` and `sales_order.create` (unless `zoho_contact_id`/`zoho_sales_order_id` already set).
  6. Respond 200 to Kommo; log structured event for observability.
- MVP behaviour: when `enableKommoLive = false`, the handler logs payloads + security metadata, then replies `202` with `{ mode: "stubbed" }` so upstream systems treat it as accepted but no DB writes occur.
- Post-MVP: flip the flag to true and enable actual upsert logic + Zoho enqueueing once dry-runs pass.
- Retry strategy: Kommo retries requests; the route must be idempotent (use `source_payload_id`). On DB conflicts, return 200 after confirming record exists.

### Kommo status events (same route)
- Используем тот же Next.js API маршрут (`/api/integrations/kommo/webhook`), который получает `leads.status` события, ожидает HMAC (`x-kommo-signature`) и по-прежнему завязан на фиче-флаг `enableKommoLive`.
- Kommo fires `leads.status` whenever a lead hops between stages. Мы теперь обрабатываем не только "Confirmed Bookings" (`status_id = 75440391`), но и "Waiting for Payment" (`96150292`), `75440395` (“Delivery Within 24 Hours”) и `75440399` (“Car with Customers”).
- Processing steps:
  1. Validate signature + feature flag.
  2. Fetch full lead + contact payload (`GET /api/v4/leads/{id}?with=contacts,custom_fields` + contacts endpoint).
  3. Upsert `clients`, `sales_leads`, и `bookings` (по `source_payload_id = kommo:{id}`) c обновлением `bookings.status` в зависимости от стадии (`preparation`, `delivery`, `in_rent`).
  4. Записываем системные события в `booking_timeline_events` (`event_type = 'kommo_status_sync'`) с указанием pipeline/stage label. Это даёт операторам видимость прогресса прямо в брони.
  5. В `kommo_webhook_events` хранится последний Kommo stage (`kommo_status_id/kommo_status_label`), что выводится на `/exec/integrations` карточке “Last stage”.
- Idempotency: replays обновляют те же строки. При ошибке событие помечается `status = 'failed'`, счётчики (`kommo_webhook_stats`/`kommo_webhook_summary`) обновляются триггером.

### Kommo full refresh (`kommo-full-refresh`)
- Adds a button-driven **historical import** that replays Kommo leads for a given calendar year (currently 2025) and swaps them wholesale into Supabase.
- Trigger: Next.js API `POST /api/integrations/kommo/full-refresh` → Edge Function `kommo-full-refresh`. Edge function enforces `enableKommoLive` and reads Supabase secrets (`KOMMO_BASE_URL`, `KOMMO_ACCESS_TOKEN`, optional overrides like `KOMMO_VEHICLE_FIELD_ID`/`KOMMO_SOURCE_FIELD_ID`).
- Flow:
  1. `start_kommo_import_run(triggered_by)` creates a run record + advisory lock (90901) to avoid concurrent jobs.
  2. Function paginates `GET /api/v4/leads?with=contacts,catalog_elements,source_id&filter[created_at]=2025`, skips status `143`, normalises timestamps (handles both ISO strings and unix seconds like `1762786272`), batches contact fetches, and writes into `stg_kommo_leads`, `stg_kommo_contacts`, `stg_kommo_booking_vehicles` via RPC upserts.
  3. `run_kommo_full_refresh(run_id)` validates volume drop (<30%), deletes prior Kommo-derived `bookings`/`sales_leads`, upserts `clients` by `kommo_contact_id`, rebuilds leads/bookings snapshot, and backfills vehicle links. Advisory lock 90902 protects the transactional swap.
  4. `finish_kommo_import_run` stores counters, status (`succeeded/failed/needs_review`), and releases locks.
- Telemetry: `kommo_import_runs` REST view surfaces run status/counts for dashboards; staging tables remain for inspection on failure.
- Latest run (10 Nov 2025) succeeded with **429 leads / 32 contacts / 26 vehicles** in ~110s, proving Kommo credentials + timestamp normalisation are production-ready.

**Kommo status webhooks**
- Payload минимум: `leads.status[].id` (lead id). Мы больше не полагаемся на `status_id`/`pipeline_id`, сразу делаем `GET /api/v4/leads/{id}?with=contacts,custom_fields` и определяем стадию по свежим данным. Это упрощает подписку — Kommo может триггерить функцию, передавая лишь id лида.

### Manual fallback (`POST /bookings`)
- UI hides "New booking" for sales unless Kommo outage flag is set.
- When fallback is used, backend still enqueues Zoho sync tasks identically, but marks booking `channel = 'manual'` and stores `manual_created_by` for auditing.

## integrations_outbox schema
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| entity_type | text | `client`, `booking`, `lead`. |
| entity_id | uuid | Foreign key (not enforced for flexibility). |
| target_system | text | `kommo`, `zoho`. |
| event_type | text | `contact.upsert`, `sales_order.create`, etc. |
| payload | jsonb | Serialized instructions (IDs, monetary values). |
| status | text | `pending`, `processing`, `succeeded`, `failed`. |
| attempts | int | Retry counter. |
| last_error | text | Most recent failure message. |
| next_run_at | timestamptz | Earliest time worker may retry. |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Edge Function: process-outbox
- Triggered via Supabase Scheduler (e.g., every minute) or long-running worker (Deno runtime).
- Responsibilities:
  1. Fetch batch of rows `status = 'pending'` and `next_run_at <= now()` (FOR UPDATE SKIP LOCKED) to avoid contention.
  2. Mark `status = 'processing'`, `attempts = attempts + 1`.
  3. Dispatch per `event_type`:
     - `contact.upsert`: call Zoho Contacts API; update `clients.zoho_contact_id` on success.
     - `sales_order.create`: call Zoho Sales Orders API using booking totals/invoices; update `bookings.zoho_sales_order_id`, `bookings.zoho_sync_status = 'synced'`.
  4. On success: set outbox row status `succeeded`, clear `last_error`.
  5. On failure: set `status = 'failed'` (or `pending` with exponential backoff), populate `last_error`, compute `next_run_at = now() + retry_delay`. After N attempts (e.g., 5), keep `failed` until manual intervention.
- MVP behaviour: with `enableZohoLive = false`, the worker marks jobs as `succeeded` immediately with `response.mode = 'stubbed'` so analytics and UI continue to work without hitting Zoho.
- Post-MVP: once Zoho creds + retry harness are verified, turn the flag on and wire HTTP calls; toggle off for emergency rollback.
- Logging/metrics: emit structured logs and optionally push metrics to monitoring (retry counts, latency).
- Security: store Zoho credentials in Supabase secrets; Edge Function uses service role key.
- Implementation notes:
  - Edge Function source lives in `supabase/functions/process-outbox/index.ts`. It calls the RPC `process_outbox_batch` (see `supabase/sql/process_outbox_batch.sql`) with configurable `batch_size`, `max_attempts`, and retry intervals.
  - The SQL function currently serves as a locking/parameter stub; actual Zoho HTTP calls should run inside the Edge Function after selecting pending rows via REST (`/rest/v1/integrations_outbox?status=eq.pending...`) or by enhancing the SQL to use `http_request` extension once available.

## Observability & Ops
- Dashboard surfaces: count of pending/failed outbox rows, `bookings.zoho_sync_status`. Alerts when failed rows > threshold.
- Exec portal route `/exec/integrations` теперь читает live данные из Supabase (`integrations_outbox`, `kommo_import_runs`, `kommo_webhook_events`, агрегаты `kommo_webhook_stats`). Блок “Kommo webhooks” показывает дату/время последнего события, объём за день и за последний час.
- Runbook: manual requeue by setting `status = 'pending'` and adjusting `next_run_at` once issue resolved.
- Feature flags double as a kill-switch; set the relevant flag to `false` before bulk requeues to prevent noisy retries.

## Post-MVP swap guidance
1. **Kommo ingestion** – enable `enableKommoLive`, run scripted dry-runs, then monitor `kommo_webhook_events` for failures. Disable flag if validation fails.
2. **Zoho outbox** – enable `enableZohoLive`, integrate OAuth tokens + HTTP retries, and monitor `integrations_outbox` for <1% failure. Flag off = stubbed fallback.
3. **Slack / Telemetry** – once secrets stored, enable `enableSlackAlerts` / `enableTelemetryPipelines` and replace stubbed adapters with webhook/queue dispatch.
4. **AI Copilot** – after LLM contract + eval harness ready, flip `enableAiCopilot` and replace stub with provider SDK. Capture thumbs feedback in `ai_feedback_events`.
5. Document every flag transition in release notes + `docs/tech-specs/integrations.md` to keep operators informed.
