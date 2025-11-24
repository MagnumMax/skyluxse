# Happy Paths

_Last updated: 9 Nov 2025_

Reference data: SPA prototype in `/beta`, PRD foundations (`docs/prd-foundations.md`), and database schema (`docs/schemas/database-schema.md`). All steps assume live API endpoints and tables described there.

## 1. Fleet Manager (Operations) - VIP Delivery Ready State
1. **Authenticate as operations** via `POST /auth/session` using `fleet@skyluxse.ae`. Expect payload seeded from `staff_accounts` (role `operations`).
2. **Open Fleet Calendar** (`GET /calendar/events?layers=rental`) to view events `EVT-2` ... `EVT-10`. Filter by vehicle `Rolls-Royce Ghost` (id 1) to confirm no maintenance conflicts.
3. **Drill into booking `BK-1052`** through `GET /bookings/BK-1052`. Validate status `delivery`, SLA (`sla_minutes = 30`), outstanding invoices, and assigned driver.
4. **Assign driver if needed** by `PATCH /bookings/BK-1052/status` (no change) plus `POST /tasks` to create logistics task linked to booking and driver `Andriy Kovalenko`. Persist metadata in `tasks`, `task_checklist_items`, `task_required_inputs`.
5. **Confirm service readiness** via `GET /fleet/1` ensuring next service date/mileage are not breached and reviewing reminders `vehicle_reminders` for mulkiya/insurance.
6. **Upload refreshed documents** (if inspection required) using `POST /clients/{clientId}/documents` or `/documents` with registry linking to `document_links` for booking.
7. **Monitor SLA timers** in Tasks board `GET /tasks?status=inprogress` until checklist and required inputs are complete, then mark done (`PATCH /tasks/{taskId}`) and confirm booking timeline update.
8. **Success criteria**: booking timeline shows "vehicle en route", driver task `status=done`, calendar event updated to `status=in_progress`, and `reports_vehicle_profitability` reflects revenue after nightly refresh.

## 2. Sales Manager - Lead LD-1201 to Won Booking
1. **Authenticate as sales** (`sales@skyluxse.ae`). Pull navigation config from `staff_accounts`.
2. **View pipeline** using `GET /leads?stage=proposal`. Confirm `LD-1201` attributes (value 12 400 AED, stage `proposal`, owner Anna).
3. **Open sales workspace** `GET /leads/LD-1201` for documents, financials, vehicle matches (Ferrari 488, Rolls-Royce Ghost).
4. **Resolve pending documents** by checking `sales_lead_documents` and triggering `POST /leads/LD-1201/actions` (`request-doc`). User uploads flows through `documents` table.
5. **Verify resource conflicts** (driver/vehicle) and coordinate with operations by checking `sales_lead_conflicts` plus `GET /fleet` availability.
6. **Confirm Kommo-imported booking**: in the happy path Kommo webhook already created `BK-XXXX` (see section 5). Sales reviews `channel = 'Kommo'`, verifies fields, and only uses `POST /bookings` as a fallback if Kommo was unavailable (UI displays warning and logs manual creation reason).
7. **Move to won + trigger Zoho sync** via `PATCH /leads/LD-1201` to `won`, add timeline event `proposal_accepted`. Booking creation/enrichment automatically enqueues Zoho contact + sales-order jobs in `integrations_outbox`; monitor `bookings.zoho_sync_status` until `synced`.
8. **Success criteria**: lead status `won`, booking confirmed (imported or fallback), Zoho sales order created, `analytics_channel_performance` shows conversion, and client dossier reflects new rental plus synced external IDs.

## 3. CEO - Daily Health Review and Alert
1. **Authenticate as ceo** (`ceo@skyluxse.ae`). Landing page `/exec/dashboard` uses `GET /analytics/kpis`.
2. **Read KPI snapshot** from `kpi_snapshots` (fleet utilisation 0.87, SLA 0.86). If values below thresholds, drill deeper.
3. **Inspect revenue trend** via `GET /analytics/revenue-daily?range=7d` (materialized view). Validate no sudden drops; verify day-over-day deltas.
4. **Check driver performance** using `GET /analytics/driver-performance`. Identify low NPS driver from `analytics_driver_metrics`.
5. **Open Reports** page calling `GET /reports/top-vehicles?period=2024-09` to ensure profitability ranking stable.
6. **Trigger follow-up**: if SLA drop tied to operations, log note in `analytics_ops_sla` via Slack/issue referencing `tasks` causing breaches; optionally create `POST /tasks` for root-cause analysis.
7. **Success criteria**: CEO dashboards show green metrics, no alerts from `documents_expiry_dashboard`, and any anomalies produce actionable tasks with owners.

## 4. Driver - Complete Delivery Task
1. **Authenticate as driver** (`driver@skyluxse.ae`), mobile layout loads `GET /driver/tasks` filtered by `assignee_driver_id`.
2. **Select task** (e.g., Task ID 1 "Deliver G-Wagen #1052"). API returns checklist, required inputs (odometer, fuel, photos), SLA timer, geo route from `tasks` and `task_required_inputs`.
3. **Start task**: mark `started_at` via `PATCH /tasks/{taskId}` to transition `status` from `todo` to `inprogress`.
4. **Collect data on-site**: update `task_checklist_items` (document verification). Record odometer/fuel using `POST /tasks/{taskId}/handover` which stores `task_required_input_values` and uploads photos (stored in `documents` + `document_links`).
5. **Handle payments**: if cash collection required, input amount into handover payload; system records in `driver_earnings_daily` after ETL.
6. **Complete task** once mandatory fields satisfied; backend auto-updates booking timeline and `calendar_events` drawer.
7. **Success criteria**: task status `done`, SLA met (timer stops before deadline), booking `BK-1052` timeline logs "delivery completed", `analytics_driver_metrics` reflects completion and kilometers, and operations receives push confirmation.

## 5. Integration Flow - Kommo -> ERP -> Zoho
1. **Kommo webhook fires** (`booking.created` or `booking.updated`). Integration service validates payload, upserts client (`clients.kommo_contact_id`), and writes/updates booking with `channel = 'Kommo'`, `source_payload_id`, `created_by = 'system-kommo'`.
2. **ERP persistence**: booking + invoices + calendar events committed; an `integrations_outbox` row is created with `target_system = 'zoho'`, `event_type = 'contact.upsert'` (if `zoho_contact_id` missing) and `event_type = 'sales_order.create'` referencing the booking.
3. **Worker picks message**: background job reads pending rows, calls Zoho APIs. On success, it stamps `clients.zoho_contact_id`, `bookings.zoho_sales_order_id`, `bookings.zoho_sync_status = 'synced'`; on failure, it increments `attempts`, logs `last_error`, and schedules retry via `next_run_at`.
4. **Fallback/manual mode**: if Kommo is unavailable, a salesperson can manually run `POST /bookings` (with `channel = 'manual'`). The same outbox logic still fires, ensuring Zoho stays in sync once booking exists.
5. **Observability**: operations monitors outbox lag, `zoho_sync_status`, and `analytics_channel_performance` to ensure upstream/downstream systems reconcile before the nightly reporting cycle.
