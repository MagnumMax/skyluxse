# PRD Foundations

_Last updated: 10 Nov 2025_

## Inputs & Guardrails
- Source of truth: the interactive SPA prototype in `/beta` (hash router with `#role/page/selector`), including actual datasets for fleet (`cars` 1-5), bookings (`BK-1052` ... `BK-1058`), tasks (IDs 1-5), calendar events (`EVT-2` ... `EVT-10`), sales pipeline stages, analytics snapshots, and lead workspaces (`LD-1201` ... `LD-1205`).
- Best-practice anchor: Cursor AI PRD Workflow (`/nurettincoban/cursor-ai-prd-workflow`) - we will capture implementation constraints, enumerate RFCs in strict order, and fully specify data/API contracts before build.
- Canadian English copy, no hash navigation in the product build, and Supabase work must go through MCP tools when we start wiring the real backend.
- Parity artefacts (скринкасты, route map, interaction notes) за 10 Nov 2025 зафиксированы в этом документе: раздел «Parity log» + таблица `hash → App Router`.
- 10 Nov 2025 parity log:
  - `/login` mirrors `/beta#index.html#page-login` with split grid (role selector + MFA stub on left, hero narrative on right), default email `fleet@skyluxse.ae`, роль по умолчанию `sales`, тот же порядок опций, фирменные радиус/тени и hero-градиенты зафиксированы до локализации.
- `/bookings` copies `/beta#sales/bookings/main` Kanban: five columns (`new → preparation → delivery → in-rent → settlement`), same card badges (SLA, driver, payment), identical drag affordances mocked with shadcn cards until live Supabase data is wired.
- `/fleet-calendar` reflects `/beta#operations/fleet-calendar/main` grid: identical layer toggles (rental, maintenance, repair), same 7 sample events, chip colours, and tooltip copy; CTA order (assign driver, reschedule) preserved for both operations and sales teams.
- `/exec/fleet-calendar` переиспользует тот же календарь, но остаётся read-only, как в `/beta#ceo/fleet-calendar/main`.
  - `/fleet` recreates `/beta#operations/fleet-table/main`: three-column table (Vehicle, Year, Compliance) with plate chips, status pills, tags, mileage/utilisation/revenue stats, and expiry badges for insurance + mulkiya using the same October 2025 snapshot.
  - `/fleet/[carId]` mirrors `/beta#operations/fleet-detail/<carId>`: hero block with status + health bar, reminder chips, active/next/last booking cards, maintenance/documents/inspection sections, and gallery tiles populated from the original SPA car dataset.
  - `/bookings/[bookingId]?view=operations` recreates `/beta#operations/booking-detail/<bookingId>`: hero summary (status, priority, tags), schedule/logistics cards, financial summary (invoices, outstanding, deposit), timeline/history, documents, sales service score, and extension cards driven by the same mock dataset.
- `/bookings/[bookingId]` reuses the booking detail shell but adds the AI copilot + conflict signals card from `/beta#sales/booking-detail/<bookingId>`, including outstanding prompts and extension alerts for sales reps.
- `/bookings/[bookingId]?view=exec` leverages the same detail view but appends KPI highlights (outstanding, SLA state, driver) to match `/beta#ceo/booking-detail/<bookingId>` dashboard cards.
  - `/tasks` mirrors `/beta#operations/tasks/main` board: three columns (Backlog, In progress, Completed), owner filters, SLA chips, and checklist progress bars match the prototype copy; cards reuse identical task titles (`BK-1052` docs, Huracan driver assignment, Continental maintenance) and status badges.
  - `/tasks/[taskId]` now renders the SPA detail drawer with owner card, SLA timers, checklist progress, required inputs bar, and booking shortcut.
- `/clients` and `/clients/[clientId]` mirror `/beta#sales/clients-table/main` plus detail drawer: table columns, filters, and dossier tabs (Profile, Documents, Rentals, Payments) stay 1:1 with prototype data from `lib/mock-data.ts`.
  - `/driver/tasks` and `/driver/tasks/[taskId]` reuse the mobile shell from `/beta#driver/driver-tasks/...`: sticky action buttons, task timeline copy, offline banners, and CTA order (Start trip → Directions → Complete) remain unchanged.
- `/analytics` matches `/beta#sales/analytics/main`: range chips, pipeline velocity cards, revenue-by-manager and source-mix lists, plus the AI lead intelligence callouts.
  - `/exec/analytics` implements `/beta#ceo/analytics/main` cards: KPI tiles, pipeline panel, insight list, and chart captions follow the same labels and values. Suspense skeleton timings match the recordings.
  - `/exec/dashboard` now renders the KPI grid, SLA buckets, revenue trend, and driver performance lists from `/beta#ceo/dashboard/main`, using identical mock metrics (utilisation 0.87, SLA 0.86, NPS 82) and the same booking-based SLA heuristics (3h risk window).
- `/bookings?view=exec` shows the read-only lifecycle board (same Kanban as sales, но drag disabled) per `/beta#ceo/bookings/main`.
  - `/bookings/new`, `/maintenance/new`, and `/fleet/new` expose the parity forms that output JSON payloads used by the manual intake workflows.
  - `/documents/[docId]` mirrors the SPA document lightbox with preview, metadata, and links back to the owning client/vehicle record.
  - `/exec/reports` mirrors `/beta#ceo/reports/main`: summary tiles for revenue/expenses/profit with 7-day totals, daily trend list, top vehicles ranking, and channel mix chips based on the same mocked dataset.
  - `/exec/integrations` (M7 outbox) now restates `/beta#ceo/integrations/outbox`: filters (`All/Pending/Processing/Failed/Completed`), stat cards, queue table columns, manual replay button, and status pill colours align exactly; **data now comes from Supabase** (`integrations_outbox` + `kommo_import_runs`). Release notes must mention this so ops know the page reflects production queues.
  - Added Kommo status webhook (`/api/integrations/kommo/webhook`) to auto-create/update bookings when sales move лид в "Confirmed bookings". На данный момент статус букинга при импорте ставится как “New booking” (`bookings.status = 'new'`), чтобы пламя SLA шло из UI.

### 10 Nov 2025 — Hash route inventory → App Router targets

| Prototype hash (role/page/selector) | Surface + notes | Proposed App Router route |
| --- | --- | --- |
| `#operations/fleet-calendar/main`, `#sales/fleet-calendar/main`, `#ceo/fleet-calendar/main` | Fleet calendar grid with layer toggles, realtime indicators | `/fleet-calendar`, `/fleet-calendar`, `/exec/fleet-calendar` (shared RSC layout + role-scoped data) |
| `#operations/tasks/main` | Ops tasks board + SLA timers | `/tasks` |
| `#operations/fleet-table/main` | Fleet table and vehicle drawers | `/fleet` |
| `#sales/bookings/main`, `#ceo/bookings/main` | Kanban bookings board (M2) | `/bookings`, `/bookings?view=exec` |
| `#sales/clients-table/main` | Clients table + detail drawers | `/clients` |
| `#ceo/dashboard/main` | KPI dashboard cards | `/exec/dashboard` |
| `#ceo/reports/main` | Financial + top vehicles reports | `/exec/reports` |
| `#sales/analytics/main`, `#ceo/analytics/main` | Analytics hub (charts, filters) | `/analytics`, `/exec/analytics` |
| `#operations/booking-detail/<bookingId>` (selector = booking id) | Booking detail split-pane | `/bookings/[bookingId]?view=operations` (parallel route reused by sales/exec) |
| `#operations/task-detail/<taskId>` | Task detail drawer | `/tasks/[taskId]` |
| `#operations/fleet-detail/<carId>` | Vehicle profile | `/fleet/[carId]` |
| `#sales/client-detail/<clientId>` | Client dossier | `/clients/[clientId]` |
| `#operations/document-viewer/<docId>` | Document lightbox | `/documents/[docId]` (modal route) |
| `#operations/maintenance-create/main` | Maintenance automation form | `/maintenance/new` |
| `#operations/booking-create/main` | Manual booking form | `/bookings/new` |
| `#operations/vehicle-create/main` | Vehicle intake form | `/fleet/new` |
| `#driver/driver-tasks/main` | Driver mobile list | `/driver/tasks` (separate route group w/ mobile layout + viewport metadata) |
| `#driver/driver-task-detail/<taskId>` | Driver task detail | `/driver/tasks/[taskId]` |
| `#login` | Auth gate (паритет достигнут) | `/login` |

- Hash selectors map to dynamic segments (`<bookingId>`, `<taskId>`, `<docId>`). Default selector `main` → index routes.
- Route groups: `(dashboard)` for desktop personas (`operations`, `sales`, `exec`), `(driver)` mobile shell, plus shared `(modals)` for document viewer/creation flows.
- Caching expectations: dashboard/reports `force-cache + revalidate` per PRD cadence; bookings/tasks/fleet `no-store` when drag/drop enabled.

## 1. User Roles

| Role (prototype key) | Default App Router page | Primary navigation (prototype) | Permissions from SPA config |
| --- | --- | --- | --- |
| Fleet manager (`operations`) | `/fleet-calendar` | Fleet Calendar, Tasks, Fleet | Can assign drivers, manage calendar; blocked from client tables. |
| Sales manager (`sales`) | `/fleet-calendar` | Fleet Calendar, Bookings (Kanban), Clients, Analytics | Can access reports & client portal integrations, not driver assignment. |
| CEO (`ceo`) | `/exec/dashboard` | Dashboard, Reports, Analytics, Bookings, Fleet Calendar | Read-only strategic view with report export rights. |
| Driver (`driver`) | `/driver/tasks` | Mobile-only tasks list + task detail | Narrow scope: complete assignments, capture odometer/fuel/photos, collect payments. |

### 1.1 Fleet manager (Operations)
- **Mission**: keep 5-car fleet (Rolls-Royce Ghost to Ferrari 488) serviceable, scheduled, and staffed, reacting to 7 active calendar events between 14-22 Oct 2025.
- **Daily surfaces**: Fleet Calendar filter set (layer toggles for `rental`, `maintenance`, `repair`), Tasks board segmented by SLA, Fleet table (generic table view) and vehicle detail panels with inspections, reminders, and document galleries.
- **Key workflows**: assign drivers to bookings like `BK-1052` delivery (SLA 30 min), trigger maintenance forms (`/maintenance/new`) when reminders such as `RM-huracan-service` hit critical, open document viewer for insurance/mulkiya renewals, and update task checklists (fuel, odometer, photos) for logistics and maintenance jobs.
- **Data dependencies**: needs booking status taxonomy (`new -> preparation -> delivery -> in-rent -> settlement`), task type templates (delivery/pickup/maintenance) with required inputs, driver availability states, and vehicle service metadata (`serviceStatus.health`, mileage to service).

### 1.2 Sales manager
- **Mission**: shepherd 5 live leads (`LD-1201` to `LD-1205`) through stages (`new`, `qualified`, `proposal`, `negotiation`, `won`) while watching fleet conflicts.
- **Daily surfaces**: Kanban board filters (by type VIP/short/corporate and driver assignment), Clients table & client detail (documents, payments, notifications, preferences), Sales analytics (range/segment/class selectors, pipeline summary, manager vs. source charts), and Sales workspace panels (documents, financials, vehicle matches, conflicts, pricing, timeline, tasks, offers, playbooks, analytics for each lead).
- **Key workflows**: verify document states (`needs-review` passports, pending deposit authorisations), trigger payment reminders (e.g., outstanding AED 6 800 on BK-1052, deposit AED 3 000 pending for LD-1201), share lead-specific templates (WhatsApp reminder, email confirmation) and note loss reasons (high deposit 34%).
- **Data dependencies**: requires cross-sourcing car availability (fit scores for car IDs 1, 5, 3), conflict flags (`vehicle`, `delivery`), pipeline SLA counters (e.g., velocityDays 14 for LD-1201), and aggregated analytics (segment mix, revenue daily series) for narrative selling.

### 1.3 CEO / Executive team
- **Mission**: monitor KPIs (fleet utilisation 0.87, SLA compliance 0.86, driver availability 0.78, client NPS 74), review revenue vs expenses (7-day window, AED 12 500-18 500 revenue per day), and inspect top vehicles by profitability.
- **Daily surfaces**: Executive dashboard (KPIs + revenue/utilisation chart + driver performance), Reports page (financial summary, top-5 vehicles list) and Analytics page (sales pipeline overview, charts for revenue by manager and booking sources).
- **Key workflows**: spot SLA breaches (dashboard card referencing 3 overdue bookings), review driver overtime (1.5-2.2 h extracted from driverPerformance), audit campaign efficiency (Instagram Ads vs hotel partners), and rate sales service (existing feedback entries on BK-1052/1053/1054).
- **Data dependencies**: aggregated KPIs, driver performance stats, booking timelines, campaign metrics, historical revenue/expense data, and booking-level service ratings.

### 1.4 Driver (mobile field ops)
- **Mission**: execute assigned logistics/maintenance tasks (examples: deliver G-Wagen #1052, pick up Huracan #1053, detailing Huracan #1058) and feed evidence back in real time.
- **Daily surfaces**: `/driver/tasks` list (chronology of today's assignments) and `/driver/tasks/[taskId]` detail page with checklists, required data capture (odometer, fuel level, photos), payment card (collect outstanding AED amounts with remainder auto-calculation), SLA timer, route info, and quick contact actions.
- **Key workflows**: upload before/after media, confirm document bundles, capture odometer/fuel to unblock fleet health, and mark checklist items complete. Failsafe logic prevents completion until mandatory fields set (doc verification + odometer + fuel).
- **Data dependencies**: task metadata (type, category, SLA timer, checklist, required inputs), booking cross-links (bookingId), geo waypoints, payment instructions, and driver-specific analytics (completion rate, NPS) for feedback loops.

## 2. Sitemap (App Router baseline)
All hash routes (`#role/page/selector`) will become shareable URLs. Every route segment mirrors an existing SPA page, while selectors become path parameters or query strings. Suggested Next.js App Router tree:

```
/
|- login                     # replaces #login gate
|- operations
|  |- fleet-calendar         # calendar grid + drawer; ?view=week&layers=rentals,maintenance
|  |- fleet
|  |  |- page                # paginated table view
|  |  `- [vehicleId]         # mirrors #fleet-detail selectors (e.g., 2 -> G-Wagen)
|  |- tasks
|  |  |- page                # board with filters passed as query (?status=todo&owner=unassigned)
|  |  `- [taskId]
|  |- bookings
|  |  `- new                 # replaces page-booking-create
|  |- maintenance
|  |  `- new                 # replaces page-maintenance-create
|  `- vehicles
|     `- new                 # replaces page-vehicle-create
|- sales
|  |- fleet-calendar         # shared view; sales retains analytics sidebar toggle
|  |- bookings
|  |  |- board               # Kanban columns new->settlement
|  |  `- [bookingId]         # detail drawer (e.g., BK-1052 timeline, invoices, extensions)
|  |- clients
|  |  |- page                # client table
|  |  `- [clientId]
|  |- analytics              # chart suite with filters persisted via search params
|  `- leads
|     `- [leadId]            # sales workspace detail for LD-1201 etc.
|- exec
|  |- dashboard
|  |- reports
|  `- analytics              # same modules as sales but read-only
|- driver (mobile layout)
|  |- tasks                  # list view; offline-first caching
|  `- tasks/[taskId]
|- documents
|  `- [documentId]           # standalone viewer using document registry ids
|- calendar
|  `- events/[eventId]       # shareable deep link for drawers (EVT-2 maintenance, EVT-9 repair)
`- knowledge-base            # optional overlay for KB-01...KB-03 articles
```

### Sitemap notes
- **Role-aware shells**: `operations` routes (now exposed as `/fleet`, `/tasks`, and `/bookings?[view=operations]`), sales workspace routes (`/bookings`, `/clients`, `/analytics`), and `/exec` share core layout components but load different nav items and permissions exactly as in `ROLES_CONFIG`.
- **State preservation**: previous hash `selector` (default `main`) becomes either `/[id]` or `?panel=`. Example: prototype hash `#sales/booking-detail/BK-1052` becomes `/bookings/BK-1052`.
- **Forms as routes**: creation flows currently rendered as separate "page-*-create" views get dedicated URLs for bookmarking and access control.
- **Document viewer**: `registerDocument` already maps IDs to URLs; `/documents/[id]` exposes the same asset outside the SPA context (e.g., mulkiya, contracts).
- **Driver experience**: served from a distinct App Router segment (`app/(driver)/`) so we can enforce mobile-first bundles and offline caching while keeping desktop shell untouched.
- **Shareable drawers**: calendar event drawer and future side panels should use parallel routes so copying the URL retains the open event/task.

## 3. API Outline (v1)
Base path `/api/v1`. Each resource is grounded in existing mock data so we can validate payloads immediately.

### 3.1 Auth & Roles
- `POST /auth/session`: accepts role (`operations`, `sales`, `ceo`, `driver`) plus email; responds with permissions flags from `ROLES_CONFIG` so the App Router can gate routes.
-  _Tables: `staff_accounts.email`, `staff_accounts.role`, `staff_accounts.default_route`, `staff_sessions.session_token`, `staff_sessions.device_meta`._
- `GET /auth/session`: returns current role, default page, nav config, and email preset (e.g., `fleet@skyluxse.ae`).
-  _Tables: `staff_sessions` (active session lookup), `staff_accounts` (join for role, nav config, email preset)._

### 3.2 Fleet & Maintenance
- `GET /fleet`: filters by `status`, `class`, `segment`, `utilisationRange`; returns summary fields from `cars` (id, name, plate, status, mileage, class, segment, utilisation, revenueYTD, serviceStatus labels, reminder counts).
-  _Tables: `vehicles.status`, `vehicles.class`, `vehicles.segment`, `vehicles.mileage_km`, `vehicles.utilization_pct`, `vehicles.revenue_ytd`, `vehicle_reminders.status`, `vehicle_reminders.due_date`._
- `GET /fleet/{carId}`: full snapshot (documents array with expiry/reminder metadata, inspections (date, driver, notes, photos), maintenanceHistory entries with odometer, reminders with dueDate/status, documentGallery URIs).
-  _Tables: `vehicles` (core profile), `vehicle_inspections` (date, driver, notes, photos via `documents`), `maintenance_jobs` (history), `vehicle_reminders`, `document_links` + `documents` (insurance, mulkiya, gallery)._
- `POST /fleet`: create new vehicle (mirrors `/vehicle-create` form; fields: VIN/plate, class, insurance/mulkiya expiries, initial mileage, document uploads via document registry).
-  _Tables: insert into `vehicles` (plate, class, insurance_expires_on, mileage_km, health_score) and create `documents` + `document_links` records for mulkiya/insurance scans._
- `POST /fleet/{carId}/maintenance-events`: logs service/repair events referencing maintenance reminders (e.g., `RM-bentley-maint`).
-  _Tables: `maintenance_jobs` (job_type, scheduled_start/end, odometer values) plus optional `vehicle_reminders.status` updates._
- `GET /fleet/{carId}/health`: aggregated stats (serviceStatus.health, upcoming reminder windows) to power health badges on tables and detail cards.
-  _Tables: `vehicles.health_score`, `vehicle_reminders.due_date/status`, `maintenance_jobs` (latest job windows)._

### 3.3 Bookings & Lifecycle
- `GET /bookings`: supports filters `status` (`new`, `preparation`, `delivery`, `in-rent`, `settlement`), `type` (`vip`, `short`, `corporate`), `driverId`, `priority`, `channel`; returns Kanban cards (code, clientName, carName, start/end, SLA data, driver assignment, payment state).
-  _Tables: `bookings.status`, `bookings.booking_type`, `bookings.driver_id`, `bookings.priority`, `bookings.channel`, joins to `clients.name`, `vehicles.name`, SLA fields (`bookings.sla_minutes`, `bookings.promised_at`, `bookings.actual_at`)._
- `GET /bookings/{bookingId}`: includes invoices, deposits, addons, `salesService` ratings, pickup/drop-off logistics, mileage/fuel readings, tags, history, timeline entries, document list, and nested `extensions` (pricing, tasks, notifications) as seen in BK-1052 and BK-1054.
-  _Tables: `bookings` + `booking_addons`, `booking_invoices`, `booking_timeline_events`, `booking_extensions`, `extension_tasks`, `extension_notifications`, `booking_tags`, `document_links`/`documents` for contracts._
- `POST /bookings`: creates records via booking form; expects `clientId`, `carId`, schedule, type, addons, deposit settings, and optional driver assignment.
-  _Tables: `bookings` (core record), `booking_addons` (addons/discounts), `booking_invoices` (rental vs deposit invoices)._ 
- `POST /bookings/{bookingId}/extensions`: append extension blocks (id, label, window, status, pricing totals, payments, timeline, notifications) similar to `EXT-1052-1`.
-  _Tables: `booking_extensions`, `extension_tasks`, `extension_notifications`, `booking_invoices` (scope = extension)._
- `PATCH /bookings/{bookingId}/status`: enforces allowed transitions defined in `KANBAN_STATUS_META.allowedTransitions` and records SLA timers.
-  _Tables: `bookings.status`, `bookings.promised_at`, `bookings.actual_at`, audit via `booking_timeline_events`._
- `GET /bookings/{bookingId}/documents`: streams contract/deposit/NDA files via document registry.
-  _Tables: `document_links` filtered by `entity_type = 'booking'`, joined to `documents.storage_path`, `documents.status`._ 

**Source-of-truth rules**
- Default path: **Kommo webhook ingestion** hits `/bookings/import/kommo`, which validates payload, upserts `clients` (if needed), `sales_leads`, and `bookings` with `channel = 'Kommo'`, `source_payload_id`, `imported_at`, `created_by = 'system-kommo'`. Schedulers must keep this job idempotent (Kommo retries). Manual `POST /bookings` is restricted to fallback mode (UI presents warning) when Kommo is unavailable.
- After any booking creation (imported or manual), the system triggers **Zoho automation**: enqueue messages into `integrations_outbox` (`target_system = 'zoho'`, `event_type = 'sales_order.create'`, payload referencing booking/client IDs). Worker creates/updates Zoho Contact (if `clients.zoho_contact_id` empty) and Sales Order, then persists `bookings.zoho_sales_order_id` plus sync status/error columns.
- Bookings store both foreign references: `bookings.source_payload_id` (Kommo), `bookings.zoho_sales_order_id`; clients store `clients.kommo_contact_id`, `clients.zoho_contact_id`. RLS and audits must prevent manual tampering outside integration roles.

### 3.4 Calendar & Availability
- `GET /calendar/events`: date-range query returning `calendarEvents` records (id `EVT-2` ... `EVT-10`, carId, type `rental|maintenance|repair`, title, start/end ISO strings, status, priority). Supports `layers` filtering to drive the calendar toggle panel.
-  _Tables: `calendar_events.event_type`, `calendar_events.vehicle_id`, `calendar_events.status`, `calendar_events.priority`, joins to `vehicles` and `bookings` for labels._
- `POST /calendar/events`: create maintenance/repair holds when operations schedule garage time.
-  _Tables: `calendar_events` (insert), optional link to `maintenance_jobs.id`._
- `GET /calendar/events/{eventId}`: returns detail for drawers, including linked booking or maintenance order once hooks exist.
-  _Tables: `calendar_events` joined with `bookings`, `maintenance_jobs`, `vehicles`._

### 3.5 Tasks & Field Operations
- `GET /tasks`: operations-facing board data grouped by status (`todo`, `inprogress`, `done`), includes SLA timers, checklist items, requiredInputs definitions, geo metadata, `assigneeId`, and related booking IDs.
-  _Tables: `tasks.status`, `tasks.sla_minutes`, `tasks.assignee_driver_id`, `tasks.booking_id`, plus `task_checklist_items`, `task_required_inputs`._
- `POST /tasks`: uses task metadata templates (delivery/pickup/maintenance) to pre-fill checklist + required inputs; optionally attaches `bookingId` and `carId`.
-  _Tables: `tasks` insert, child tables `task_checklist_items`, `task_required_inputs` seeded per template._
- `GET /driver/tasks`: scoped to authenticated driver, returns simplified payload (title, type, checklist, requiredInputs, payment instructions, SLA timers, pickup/drop-off locations) for the mobile app.
-  _Tables: filter `tasks.assignee_driver_id`, join `task_checklist_items`, `task_required_inputs`, `task_required_input_values`, `task_media` (documents) for evidence._
- `POST /tasks/{taskId}/handover`: driver uploads odometer, fuel levels, and files (photosBefore/photosAfter/clientDocsPhotos) before completion; API validates required inputs derived from task type metadata.
-  _Tables: `task_required_input_values` (odometer/fuel/file metadata), `task_media` (document links), `tasks.completed_at`._
- `PATCH /tasks/{taskId}`: operations can change status, assignee, deadlines, or update checklists.
-  _Tables: `tasks.status`, `tasks.deadline_at`, `tasks.assignee_driver_id`, `task_checklist_items.completed`._

### 3.6 Clients & Documents
- `GET /clients`: supports filters by `status` (VIP/Gold/Silver), `segment` (e.g., Premier Loyalist, Dormant VIP, Growth Gold), `outstanding>0`, `documents.status`; returns summary data, outstanding balances, lifetime value, NPS, preferred channels, and last rental info.
-  _Tables: `clients.tier`, `clients.segment`, `clients.outstanding_amount`, `clients.nps_score`, `clients.preferred_channels`, lookups to `document_links`/`documents` for verification status, плюс агрегация по `booking_invoices`/`bookings` для расчёта lifetime value и последнего rental._
- `GET /clients/{clientId}`: full dossier as in SPA detail card-documents array (type, number, expiry, status), rentals (bookingId, status, dates, carName, totalAmount), payments (id, type, amount, status, channel, date), notifications, preferences.
-  _Tables: `clients`, `document_links` + `documents`, `bookings`, `booking_invoices`, `client_notifications`, `client_preferences`._
- `GET /documents/{documentId}`: resolves registry ID to signed URL and metadata (type, name, expiry, status) for both client and vehicle artefacts.
-  _Tables: `documents.storage_path`, `documents.mime_type`, `documents.expires_at`, `document_links.entity_type`._
- `POST /clients/{clientId}/documents`: uploads and registers new files, updating the registry used by the document viewer route.
-  _Tables: `documents` insert + `document_links` row referencing `entity_type = 'client'`._

### 3.7 Sales Pipeline & Workspace
- `GET /leads`: returns pipeline cards with stage metadata (`probability`, `slaDays`, `color`), value, owner, source, expected close date, requested rental window, fleet size, `nextAction`, and `velocityDays`.
-  _Tables: `sales_leads.value_amount`, `sales_leads.stage_id`, `sales_leads.owner_id`, `sales_leads.expected_close_at`, `sales_leads.requested_start_at/end_at`, `sales_leads.fleet_size`, `sales_leads.next_action`, `sales_leads.velocity_days`, joined with `sales_pipeline_stages.probability`, `sales_pipeline_stages.sla_days`, `sales_pipeline_stages.badge_color`._
- `GET /leads/{leadId}`: full workspace payload mirroring `salesWorkspace.leadDetails` (request details, documents w/ source + timestamps, financial schedule including outstanding/upcoming payments, vehicleMatches with fitScore, resourceConflicts, pricing breakdown, timeline events, operational tasks, offers catalogue, playbook checklist + quick actions + templates, analytics insights like lossReasons, vehiclePopularity, campaignPerformance).
-  _Tables: `sales_leads` plus `sales_lead_documents`, `sales_lead_financials`, `sales_lead_vehicle_matches`, `sales_lead_conflicts`, `sales_lead_pricing_items`, `sales_lead_timeline_events`, `sales_lead_tasks`, `sales_lead_offers`, `sales_lead_playbook_steps`, analytics rollups from `bookings`/`sales_leads` views for loss reasons and campaign stats._
- `POST /leads/{leadId}/actions`: log events (e.g., `request-doc`, `payment-link`, `portal-invite`) and sync with external CRMs (Kommo/Zoho) referenced in mock data.
-  _Tables: `sales_lead_timeline_events` (append action), optionally `sales_lead_tasks` (new to-dos) and `sales_lead_documents` (new uploads)._

### 3.8 Analytics & Reports
- `GET /analytics/kpis`: returns overall KPIs (fleetUtilization 0.87, slaCompliance 0.86, driverAvailability 0.78, tasksCompleted 124, pendingDocuments 6, clientNps 74, avgRevenuePerCar 245, activeBookings 18) for dashboard cards.
-  _Tables/views: `kpi_snapshots` (materialized daily snapshot populated via ETL from `bookings`, `tasks`, `documents`, `driver_profiles`), with optional real-time delta overlays from those base tables._
- `GET /analytics/revenue-daily?range=7d`: provides `revenueDaily` array (dates + revenue/expenses/bookings/cancellations) powering charts in dashboard and reports.
-  _Tables/views: materialized view `analytics_revenue_daily` (fact rows by date with `revenue`, `expenses`, `bookings`, `cancellations`), refreshed hourly from `booking_invoices` (revenue/expense) and `bookings` (counts, cancellation flags)._ 
- `GET /analytics/driver-performance`: returns driver metrics (completionRate, NPS, overtimeHours, kilometers) for the "Driver performance" chart.
-  _Tables/views: view `analytics_driver_metrics` (aggregates per `driver_profiles.id` sourced from `tasks` for completion/overtime/km and from `booking_timeline_events` for NPS), refreshed every 15 minutes._
- `GET /analytics/segment-mix` and `/analytics/forecast`: supply `segmentMix` shares (Premier Loyalist/Dormant VIP/etc.) and weekly forecasts for the analytics page.
-  _Tables/views: `analytics_segment_mix` (daily share per lifecycle `client_segment`, fed from `bookings.segment` + `sales_leads.segment`) and `analytics_forecast` (weekly projections generated by ETL job from historical `bookings`/`sales_leads`)._
- `GET /reports/top-vehicles?period=2024-09`: yields profitability leaderboard for the Reports page, matching `top-cars-report` content.
-  _Tables/views: materialized view `reports_vehicle_profitability` (joins `bookings`, `booking_invoices`, `vehicles`, plus apportioned expense facts) refreshed nightly for the requested period._

#### Analytics aggregates & ETL expectations

| View / materialized view | Source tables | Refresh cadence | Purpose |
| --- | --- | --- | --- |
| `kpi_snapshots` | `bookings`, `tasks`, `documents`, `driver_profiles` | Nightly (00:30 Gulf) | Dashboard KPIs (fleet utilization, SLA, NPS, etc.). |
| `analytics_revenue_daily` | `booking_invoices`, `bookings` | Hourly | Revenue/expense/bookings/cancellations time series. |
| `analytics_driver_metrics` | `driver_profiles`, `tasks`, `booking_timeline_events` | 15 min | Driver completion, overtime, kilometres, NPS. |
| `analytics_segment_mix` | `bookings.segment`, `sales_leads.segment` | Nightly | Share of lifecycle segments (Premier Loyalist, Dormant VIP, etc.). |
| `analytics_forecast` | Historical `bookings`, `sales_leads` | Weekly (Sunday 02:00 Gulf) | Rolling revenue/bookings projections (W38+). |
| `reports_vehicle_profitability` | `bookings`, `booking_invoices`, `vehicles` | Nightly | Top vehicle profitability list for reports. |
| `analytics_channel_performance` | `bookings.channel`, `sales_leads.source`, `booking_invoices` | Nightly | Marketing attribution (win rate, CAC proxy, margin). |
| `analytics_ops_sla` | `tasks`, `booking_timeline_events`, `staff_accounts`, `driver_profiles` | Hourly | SLA breach heatmap per role/assignee. |
| `analytics_client_retention` | `clients`, `bookings`, `booking_invoices` | Nightly | 30/90/180-day retention and LTV growth. |
| `analytics_vehicle_utilization_daily` | `bookings`, `tasks`, `vehicle_reminders` | Nightly | Occupancy/mileage trends plus maintenance risk. |
| `driver_earnings_daily` | `task_required_input_values`, `booking_invoices`, `tasks` | Hourly | Cash/card collections per driver for payouts. |
| `documents_expiry_dashboard` | `documents`, `document_links` | Nightly | Compliance alerting (Emirates ID, mulkiya, insurance). |
| `sales_stage_velocity` | `sales_leads`, `sales_pipeline_stages`, `bookings` outcomes | Nightly | Velocity, conversion, revenue by stage. |
| `accounts_receivable_aging` | `booking_invoices`, `clients` | Nightly | AR buckets (0-7, 8-14, 15+ days) for finance follow-up. |

Supabase cron jobs or an external ETL runner must keep these aggregates fresh; schema migrations should account for downstream dependencies (e.g., view refresh order, permissions, RLS considerations).

### 3.9 Knowledge Base (optional but ready)
- `GET /knowledge-base`: exposes articles such as `KB-01` "How to upload Emirates ID", enabling inline help.
-  _Tables: `knowledge_base_articles` (id, category, title, body, updated_at, owner_id)._
