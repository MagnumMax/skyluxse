# Integrations: Kommo Ingestion & Zoho Sync

_Last updated: 9 Nov 2025_

## Goals
- Treat Kommo as the primary source for booking requests, ensuring idempotent ingestion into our ERP (Supabase Postgres).
- Keep Zoho CRM/Sales Orders in lockstep with bookings and clients without blocking UI/API calls.
- Provide observability and retry mechanics through an `integrations_outbox` pattern.

## Architecture Overview
```
Kommo Webhook --> Supabase Edge Function (import-kommo)
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

### Kommo webhook (`import-kommo`)
- Hosted as a Supabase Edge Function exposed via `/functions/v1/import-kommo`.
- Receives Kommo payload (booking metadata, client docs, dates, source IDs).
- Steps:
  1. Validate HMAC/secret to ensure payload authenticity.
  2. Upsert client: match by `kommo_contact_id` or email; update profile data (`clients.kommo_contact_id`).
  3. Upsert booking:
     - Find by `source_payload_id` or `external_code`.
     - If new, insert into `bookings` with `channel = 'Kommo'`, `created_by = 'system-kommo'`, `owner_id` resolved via mapping table (Kommo manager -> staff_accounts).
     - Create/refresh `booking_invoices`, `calendar_events`, `sales_leads` snapshot if needed.
  4. Enqueue Zoho tasks: insert rows into `integrations_outbox` for `contact.upsert` and `sales_order.create` (unless `zoho_contact_id`/`zoho_sales_order_id` already set).
  5. Respond 200 to Kommo; log structured event for observability.
- MVP behaviour: when `enableKommoLive = false`, the function logs payloads + security metadata, then replies `202` with `{ mode: "stubbed" }` so upstream systems treat it as accepted but no DB writes occur.
- Post-MVP: flip the flag to true and enable actual upsert logic + Zoho enqueueing once dry-runs pass.
- Retry strategy: Kommo retries requests; function must be idempotent (use `source_payload_id`). On DB conflicts, return 200 after confirming record exists.

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
- Runbook: manual requeue by setting `status = 'pending'` and adjusting `next_run_at` once issue resolved.
- Feature flags double as a kill-switch; set the relevant flag to `false` before bulk requeues to prevent noisy retries.

## Post-MVP swap guidance
1. **Kommo ingestion** – enable `enableKommoLive`, run scripted dry-runs, then monitor `kommo_webhook_events` for failures. Disable flag if validation fails.
2. **Zoho outbox** – enable `enableZohoLive`, integrate OAuth tokens + HTTP retries, and monitor `integrations_outbox` for <1% failure. Flag off = stubbed fallback.
3. **Slack / Telemetry** – once secrets stored, enable `enableSlackAlerts` / `enableTelemetryPipelines` and replace stubbed adapters with webhook/queue dispatch.
4. **AI Copilot** – after LLM contract + eval harness ready, flip `enableAiCopilot` and replace stub with provider SDK. Capture thumbs feedback in `ai_feedback_events`.
5. Document every flag transition in release notes + `docs/tech-specs/integrations.md` to keep operators informed.
