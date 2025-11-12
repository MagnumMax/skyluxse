# Database Schema

_Last updated: 9 Nov 2025_

This schema proposal is derived from the production requirements captured in `docs/prd-foundations.md` and the live SPA prototype in `/beta`. It is designed for Supabase/PostgreSQL, keeps App Router friendly URL structures in mind, and documents the structure in a DBML-friendly way, following the Holistics DBML guidelines for table, column, and relationship definitions.

## Modelling goals
- Unify **operations**, **sales**, **executive**, and **driver** workflows around a single source of truth for fleet, bookings, pipeline, and task data.
- Preserve auditability of SLA timers, payment status, and document approvals that currently live inside the SPA mock data.
- Keep the schema extensible for Supabase real-time subscriptions and RLS policies (per-role access control defined in `ROLES_CONFIG`).

## Conventions
- Primary keys use UUID (`uuid` default `gen_random_uuid()`) unless a natural key already exists (e.g., booking codes like `BK-1052`).
- Every table has `created_at timestamptz default now()` and `updated_at timestamptz default now()` triggers.
- Monetary amounts use `numeric(12,2)`; percentages/fractions use `numeric(5,2)`.
- Geospatial waypoints are stored as `jsonb` (`{"label":"SkyLuxse HQ","lat":25.2,"lng":55.27}`) until we decide to add PostGIS.
- Enumerations are implemented as Postgres enums for referential integrity but mirrored in the app layer TypeScript unions.

## Entity overview
- **Identity & roles**: `staff_accounts`, `driver_profiles`, `staff_sessions`.
- **Clients & contacts**: `clients`, `client_notifications`, `client_preferences`.
- **Fleet & maintenance**: `vehicles`, `vehicle_reminders`, `vehicle_inspections`, `maintenance_jobs`.
- **Documents & media**: `documents` (files) + contextual `document_links` for clients, vehicles, bookings, tasks, and leads.
- **Bookings & rentals**: `bookings`, `booking_addons`, `booking_invoices`, `booking_timeline_events`, `booking_tags`, `booking_extensions`.
- **Calendar & field work**: `calendar_events`, `tasks`, `task_checklist_items`, `task_required_inputs`, `task_required_input_values`, `task_media`.
- **Sales pipeline**: `sales_pipeline_stages`, `sales_leads`, `sales_lead_financials`, `sales_lead_vehicle_matches`, `sales_lead_conflicts`, `sales_lead_timeline_events`, `sales_lead_tasks`, `sales_lead_offers`, `sales_lead_playbook_steps`.
- **Analytics & knowledge**: `kpi_snapshots`, `knowledge_base_articles`.

## Detailed tables

### Staff & roles
**staff_accounts**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | Supabase auth UID (can mirror). |
| full_name | text | Display name. |
| email | citext unique | Login + notifications. |
| phone | text | Optional contact. |
| role | role_type enum | `operations`, `sales`, `ceo`, `driver`. |
| locale | text | e.g., `en-CA`. |
| timezone | text | e.g., `Asia/Dubai`. |
| default_route | text | App Router landing page per role. |
| is_active | boolean default true | Soft disable.

**driver_profiles** (extends staff driver accounts)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| staff_account_id | uuid fk staff_accounts(id) unique | Nullable for contractor drivers. |
| status | driver_status enum | `available`, `on_task`, `standby`. |
| experience_years | int | |
| current_lat | numeric(9,6) | Last reported location. |
| current_lng | numeric(9,6) | |
| languages | text[] | `{"English","Arabic"}`. |
| notes | text | Certifications, partnerships. |
| last_status_at | timestamptz | SLA monitoring.

**staff_sessions** records the role + device used for each login (mirrors prototype login role selector).

### Clients & contacts
**clients**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| kommo_contact_id | text | Original Kommo contact ID. |
| zoho_contact_id | text | Zoho CRM contact reference. |
| name | text | |
| phone | text | |
| email | citext | |
| residency_country | text | ISO code. |
| tier | client_tier enum | Автопересчёт от LTV (сумма `bookings.total_amount`): `VIP ≥ 50k`, `Gold ≥ 35k`, `Silver < 15k`. |
| segment | client_segment enum | Автосегментация по давности последнего букинга и LTV: `premier_loyalist`, `dormant_vip`, `growth_gold`, `at_risk`, `new_rising`, `high_value_dormant`, `general`. |
| gender | text | Normalised value (`Male`, `Female`, `Non-binary`, etc.). |
| birth_date | date | Optional. |
| outstanding_amount | numeric(12,2) | Live balance. |
| nps_score | smallint | Latest NPS rating. |
| preferred_channels | text[] | e.g., `{email,sms}`. |
| preferred_language | text | `ru`, `en`, `ar`. |
| timezone | text | |
| created_by | uuid fk staff_accounts | Nullable; операции/боты могут оставлять `NULL`. |
| updated_by | uuid fk staff_accounts | Nullable; фиксирует последнего редактора. |
| created_at | timestamptz | Default `timezone('utc', now())`. |
| updated_at | timestamptz | Updated via `set_updated_at()`. |

**client_notifications** keep the historical feed currently mocked under each client (`NT-101` etc.). Columns: `id`, `client_id`, `channel`, `subject`, `content`, `sent_at`, `status`, `meta jsonb`.

**client_preferences** holds structured boolean flags (marketing opt-in, VIP concierge assignment) separate from the high-churn `clients` row.

> `tier` и `segment` пересчитываются функцией `refresh_client_tier_from_booking()` после любого изменения в `bookings`. LTV считается как сумма всех `bookings.total_amount` по клиенту, `tier` = `VIP ≥ 50k`, `Gold ≥ 35k`, `Silver < 15k`, а `segment` выбирается по правилам:
> - `premier_loyalist`: VIP и букинг был ≤ 30 дней назад.
> - `dormant_vip`: VIP, но букинг отсутствует > 60 дней.
> - `growth_gold`: Gold, букинг ≤ 45 дней.
> - `at_risk`: Gold/Silver, букинг > 90 дней.
> - `new_rising`: Silver, букинг ≤ 30 дней, LTV < 15k.
> - `high_value_dormant`: LTV ≥ 35k и букинг > 45 дней.
> - иначе `general`.
> Хелперы: `calculate_client_lifetime_value`, `calculate_client_last_booking_at`, `refresh_client_metrics_for_ids`. Не пишите `tier`/`segment` напрямую из внешних импортов.

### Fleet & maintenance
**vehicles**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | Mirrors SPA IDs 1-5 via `external_ref`. |
| external_ref | text unique | Existing numeric ID to keep history. |
| name | text | Display label (e.g., `Rolls-Royce Ghost`). |
| kommo_vehicle_id | text unique | Nullable CRM ID from Kommo select lists. |
| make | text | OEM brand (Audi, BMW, etc.). |
| model | text | Model or trim code (Q8, X6, etc.). |
| vin | text unique | Optional unique VIN; nullable for unknown/SOLD stock. |
| model_year | smallint | Guard-railed between 1980 and 2100. |
| exterior_color | text | Marketing colour name (e.g., Mango Blue). |
| interior_color | text | Cabin palette (Black/Red, Beige, etc.). |
| plate_number | text | |
| body_style | text | SUV, Sedan, Convertible, etc. |
| status | vehicle_status enum | `available`, `in_rent`, `maintenance`, `reserved`, `sold`, `service_car`. |
| class | text | `Luxury`, `SUV`, `Sport`. |
| segment | text | Coupe, Sedan, etc. |
| seating_capacity | smallint | 1-20 seats. |
| engine_displacement_l | numeric(4,2) | Litres; parser normalises commas to dots. |
| power_hp | smallint | Horsepower (50-1200). |
| cylinders | smallint | 2-16 cylinders; `NULL` for EV variants. |
| zero_to_hundred_sec | numeric(4,2) | 0-100 km/h time in seconds. |
| transmission | text | e.g., Automatic, DCT, AMT. |
| mileage_km | int | Current reading. |
| utilization_pct | numeric(5,2) | Derived metric. |
| revenue_ytd | numeric(12,2) | |
| health_score | numeric(5,2) | Normalised 0–1 score used by fleet health bar. |
| location | text | Base location / depot label for hero metadata. |
| image_url | text | Optional hero background for vehicle profile. |
| created_by | uuid fk staff_accounts | Nullable; `NULL` для Kommo импорта. |
| updated_by | uuid fk staff_accounts | Nullable; последний оператор. |
| created_at | timestamptz | Default `timezone('utc', now())`. |
| updated_at | timestamptz | Updated via `set_updated_at()`. |

> `utilization_pct` пересчитывается функцией `refresh_vehicle_utilization_from_booking()` после любого `INSERT/UPDATE/DELETE` в `bookings`. Формула повторяет runtime-метрику в приложении: суммируется перекрытие активных букингов за последние 30 дней и нормализуется в диапазон 0—1 (хранится в decimal с точностью до двух знаков). Не записывайте значение вручную — используйте `refresh_vehicle_utilization(<vehicle_id>)` или правьте buкінги.

**vehicle_reminders** track entries such as `RM-huracan-service` with columns `vehicle_id`, `reminder_type`, `due_date`, `status`, `severity`, `created_by`.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| vehicle_id | uuid fk `vehicles.id` | Cascade delete when vehicle gone. |
| reminder_type | text | e.g., `insurance`, `mulkiya`, `maintenance`. |
| due_date | date | Shown in Reminders card. |
| status | text | `scheduled`, `warning`, `critical`. |
| severity | text | visual tone; default `info`. |
| notes | text | Optional operator note. |
| created_by | uuid fk `staff_accounts.id` | nullable. |
| created_at/updated_at | timestamptz | `set_updated_at()` trigger. |

**vehicle_inspections** capture the inspection cards shown in fleet detail.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| vehicle_id | uuid fk `vehicles.id` | |
| inspection_date | date | Displayed in Inspection highlights. |
| driver_id | uuid fk `driver_profiles.id` | nullable. |
| performed_by | text | Snapshot of staff/contractor name. |
| notes | text | optional remarks. |
| photo_document_ids | uuid[] | Document IDs stored in `documents`/`document_links`. |
| created_at/updated_at | timestamptz | |

**maintenance_jobs** unify maintenance + repair schedules.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| vehicle_id | uuid fk `vehicles.id` | required. |
| booking_id | uuid fk `bookings.id` | nullable reference to job-triggering booking. |
| job_type | text | `maintenance`, `repair`, `detailing`. |
| status | text | `scheduled`, `in_progress`, `done`, `cancelled`. |
| scheduled_start / scheduled_end | timestamptz | planned window. |
| actual_start / actual_end | timestamptz | actual window. |
| odometer_start / odometer_end | integer | km readings. |
| vendor | text | preferred supplier. |
| cost_estimate | numeric(12,2) | optional. |
| description | text | job summary. |
| created_at/updated_at | timestamptz | |

### Documents & media
**documents** own the binary metadata once instead of duplicating arrays per entity.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | References SPA registry IDs (`doc-*`). |
| storage_path | text | Supabase Storage key. |
| original_name | text | Human label. |
| mime_type | text | |
| size_bytes | bigint | |
| checksum | text | Optional integrity check. |
| status | document_status enum | `verified`, `needs_review`, `expired`. |
| source | text | `Kommo`, `Client upload`, etc. |
| expires_at | date | For licenses/mulkiya. |
| created_by | uuid fk staff_accounts | Nullable (system imports). |

**document_links** map each file to a domain entity with polymorphic fields: `document_id`, `entity_type` (`client`,`vehicle`,`booking`,`task`,`lead`), `entity_id`, `doc_type`, `notes`, `created_at`.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| document_id | uuid fk `documents.id` | |
| scope | document_scope enum | existing field. |
| entity_id | uuid | |
| doc_type | text | e.g., `insurance`, `mulkiya`, `gallery`, `inspection`. |
| notes | text | optional description/tooltips. |
| metadata | jsonb | unchanged. |
| created_at | timestamptz | |

### Bookings & rentals
**bookings**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | Store SPA numeric ID inside `external_code`. |
| external_code | text unique | `BK-1052`. |
| client_id | uuid fk clients | |
| vehicle_id | uuid fk vehicles | |
| driver_id | uuid fk driver_profiles | nullable. |
| owner_id | uuid fk staff_accounts | Sales owner (Anna, Max, Sara). |
| status | booking_status enum | `new`, `preparation`, `delivery`, `in_rent`, `settlement`. |
| booking_type | booking_type enum | `vip`, `short`, `corporate`. |
| channel | text | `Kommo`, `Website`, etc. |
| source_payload_id | text | Upstream identifier from Kommo webhook. |
| kommo_status_id | bigint | Raw Kommo stage ID used for audit/filtering. |
| priority | priority_level enum | `high`, `medium`, `low`. |
| segment | client_segment enum | mirrors sales analytics. |
| start_at | timestamptz | Combines date + time. |
| end_at | timestamptz | |
| pickup_location | jsonb | {"label":...,"address":...}. |
| dropoff_location | jsonb | |
| sla_minutes | int | Default from KANBAN meta. |
| promised_at | timestamptz | service level target. |
| actual_at | timestamptz | actual delivery time. |
| total_amount | numeric(12,2) | Billing base + addons. |
| paid_amount | numeric(12,2) | |
| deposit_amount | numeric(12,2) | |
| currency | text | default `AED`. |
| pickup_mileage | int | |
| pickup_fuel_level | text | `Full`, `3/4`, etc. |
| return_mileage | int | nullable. |
| return_fuel_level | text | nullable. |
| sales_rating_value | smallint | 0-10. |
| sales_rating_feedback | text | |
| rated_by_role | role_type | `ceo` per prototype. |
| rated_at | timestamptz | |
| zoho_sales_order_id | text | Linked Zoho Sales Order reference. |
| zoho_sync_status | text | `pending`,`synced`,`failed`. |
| zoho_sync_error | text | Last error payload for Zoho integration. |

**booking_addons** describe `chauffeur`, `insurance-premium`, etc. Columns: `id`, `booking_id`, `label`, `amount`, `category` (`base`,`addon`,`discount`).

**booking_invoices** map to entries like `INV-1052-1`: `id`, `booking_id`, `label`, `invoice_type`, `amount`, `status`, `issued_at`, `due_at`, `scope` (`rental`, `deposit`, `extension`), `external_ref`.

**booking_timeline_events** log workflow events + SLA: `booking_id`, `event_ts`, `status`, `note`, `actor_type` (`system`,`staff`,`driver`), `actor_id`.

**booking_tags** + `booking_tag_links` let us store `vip`, `long-rent`, etc.

**booking_extensions** capture nested structures such as `EXT-1052-1`: columns include `booking_id`, `label`, `start_at`, `end_at`, `status`, `note`, `pricing_base`, `pricing_addons`, `pricing_fees`, `pricing_discounts`, `pricing_total`, `currency`, `deposit_adjustment`, `created_by`, `created_at`.

**extension_notifications** and **extension_tasks** keep WhatsApp/email alerts and operational follow-ups generated per extension, referencing `booking_extensions`.

### Calendar & field work
**calendar_events** unify rental, maintenance, and repair rows shown in fleet calendar.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | Could reuse `EVT-*` codes in `external_ref`. |
| vehicle_id | uuid fk vehicles | |
| booking_id | uuid fk bookings | nullable. |
| maintenance_job_id | uuid fk maintenance_jobs | nullable. |
| event_type | calendar_event_type enum | `rental`,`maintenance`,`repair`. |
| title | text | |
| description | text | |
| start_at | timestamptz | |
| end_at | timestamptz | |
| status | event_status enum | `scheduled`,`in_progress`,`completed`. |
| priority | priority_level enum | |
| color_token | text | for calendar rendering. |

**calendar_events_expanded (view)** unions `calendar_events` with any `bookings` row that has both a vehicle and at least one timestamp, translating booking statuses (`lead/confirmed/in_progress/...`) into `event_status`. This keeps maintenance/repair entries in their dedicated table while surfacing Kommo-imported rentals in the same grid without duplicating rows. Columns mirror `calendar_events` (`id`, `vehicle_id`, `booking_id`, `event_type`, `start_at`, `end_at`, `status`).

**tasks** correspond to the operations board and driver mobile cards.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| booking_id | uuid fk bookings | nullable. |
| vehicle_id | uuid fk vehicles | nullable. |
| client_id | uuid fk clients | nullable. |
| extension_id | uuid fk booking_extensions | nullable. |
| task_type | task_type enum | `delivery`,`pickup`,`maintenance`,`documents`. |
| category | task_category enum | `logistics`,`maintenance`,`operations`. |
| status | task_status enum | `todo`,`inprogress`,`done`. |
| priority | priority_level enum | |
| title | text | |
| description | text | |
| deadline_at | timestamptz | matches prototype deadlines. |
| sla_minutes | int | e.g., 30 for deliveries. |
| geo_pickup | jsonb | |
| geo_dropoff | jsonb | |
| route_distance_km | numeric(6,2) | |
| assignee_driver_id | uuid fk driver_profiles | nullable. |
| assignee_staff_id | uuid fk staff_accounts | nullable. |
| created_by | uuid fk staff_accounts | |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| completion_notes | text | |

**task_checklist_items**: `task_id`, `label`, `required boolean`, `position`, `completed boolean`, `completed_by`, `completed_at`.

**task_required_inputs**: capture definitions (odometer, fuel, photos). Columns: `task_id`, `key`, `label`, `input_type` (`number`,`text`,`select`,`file`), `accept`, `multiple`, `required`.

**task_required_input_values** store submissions for each definition, including `value_text`, `value_number`, `value_json`, `captured_by`, `captured_at`.

**task_media** simply references `documents` with entity_type = `task` for photos/videos.

### Sales pipeline
**sales_pipeline_stages** keep the stage metadata now stored in `MOCK_DATA.salesPipeline.stages`: columns `id` (`new`), `name`, `probability`, `sla_days`, `badge_color`.

**sales_leads** mirror `LD-1201` etc.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | store external `lead_code`. |
| lead_code | text unique | `LD-1201`. |
| client_id | uuid fk clients | nullable (lead may predate client record). |
| title | text | |
| company | text | |
| owner_id | uuid fk staff_accounts | Sales owner. |
| stage_id | text fk sales_pipeline_stages(id) | |
| value_amount | numeric(12,2) | |
| currency | text | `AED`. |
| probability_override | numeric(5,2) | allows manual tweaks. |
| source | text | `Kommo`, `Website`, `Referral`. |
| created_at | timestamptz | |
| expected_close_at | timestamptz | |
| requested_start_at | timestamptz | |
| requested_end_at | timestamptz | |
| fleet_size | smallint | |
| next_action | text | |
| velocity_days | int | age vs stage SLA. |
| status | lead_status enum | `active`,`won`,`lost`. |
| loss_reason | text | nullable until close.

Supporting tables keep the detailed workspace sections:
- **sales_lead_financials**: outstanding vs upcoming payments (`lead_id`, `label`, `amount`, `due_at`, `status`).
- **sales_lead_documents**: link to `documents` with `source` and verification timestamps.
- **sales_lead_vehicle_matches**: `lead_id`, `vehicle_id`, `fit_score`.
- **sales_lead_conflicts**: `lead_id`, `conflict_type` (`vehicle`,`delivery`,`maintenance`), `severity`, `message`.
- **sales_lead_pricing_items**: `lead_id`, `label`, `amount`, `category` (`base`,`addon`,`discount`).
- **sales_lead_timeline_events**: `lead_id`, `event_ts`, `event_type` (`system`,`call`,`proposal`,`task`), `label`, `owner_id`.
- **sales_lead_tasks**: `lead_id`, `label`, `due_date`, `status`. Reuses board statuses for pipeline follow-ups.
- **sales_lead_offers**: `lead_id`, `name`, `description`, `price`, `margin_pct`.
- **sales_lead_playbook_steps**: `lead_id`, `label`, `position`, `is_done boolean`.

### Analytics & knowledge
- **kpi_snapshots** store dashboard metrics per day/week: `snapshot_date`, `fleet_utilization`, `sla_compliance`, `driver_availability`, `tasks_completed`, `pending_documents`, `client_nps`, `avg_revenue_per_car`, `active_bookings`.
- **knowledge_base_articles** back the SPA knowledge base cards: `id`, `category`, `title`, `body`, `updated_at`, `owner_id`.
- **integrations_outbox** queues downstream sync tasks so OLTP requests stay non-blocking. Columns: `id uuid pk`, `entity_type` (`client`,`booking`,`lead`), `entity_id uuid`, `target_system` (`kommo`,`zoho`), `event_type` (`contact.upsert`,`sales_order.create`,`booking.retry`), `payload jsonb`, `status` (`pending`,`processing`,`succeeded`,`failed`), `attempts int`, `last_error text`, `next_run_at timestamptz`, `created_at`, `updated_at`. Workers consume pending rows, call external APIs, and update associated `clients.zoho_contact_id` or `bookings.zoho_sales_order_id` on success.

## Enumerations
- `role_type`: `operations`, `sales`, `ceo`, `driver`.
- `driver_status`: `available`, `on_task`, `standby`.
- `client_tier`: `vip`, `gold`, `silver`.
- `client_segment`: `resident`, `tourist`, `business_traveller`, `special`.
- `vehicle_status`: `available`, `in_rent`, `maintenance`.
- `booking_status`: `new`, `preparation`, `delivery`, `in_rent`, `settlement`.
- `booking_type`: `vip`, `short`, `corporate`.
- `priority_level`: `high`, `medium`, `low`.
- `calendar_event_type`: `rental`, `maintenance`, `repair`.
- `event_status`: `scheduled`, `in_progress`, `completed`.
- `task_type`: `delivery`, `pickup`, `maintenance`, `documents`.
- `task_category`: `logistics`, `maintenance`, `operations`.
- `task_status`: `todo`, `inprogress`, `done`.
- `document_status`: `verified`, `needs_review`, `expired`.
- `lead_status`: `active`, `won`, `lost`.

## DBML excerpt (authoritative view)
```dbml
Table staff_accounts {
  id uuid [pk]
  full_name text
  email citext [unique]
  phone text
  role role_type
  locale text
  timezone text
  default_route text
  is_active boolean
  created_at timestamptz
  updated_at timestamptz
}

Table driver_profiles {
  id uuid [pk]
  staff_account_id uuid [unique, ref: > staff_accounts.id]
  status driver_status
  experience_years int
  current_lat numeric(9,6)
  current_lng numeric(9,6)
  languages text
  notes text
  last_status_at timestamptz
}

Table clients {
  id uuid [pk]
  external_crm_id text
  name text
  phone text
  email citext
  residency_country text
  tier client_tier
  segment client_segment
  outstanding_amount numeric(12,2)
  nps_score smallint
  preferred_channels text
  preferred_language text
  timezone text
}

Table vehicles {
  id uuid [pk]
  external_ref text [unique]
  name text
  plate_number text
  status vehicle_status
  class text
  segment text
  mileage_km int
  utilization_pct numeric(5,2)
  revenue_ytd numeric(12,2)
}

Table bookings {
  id uuid [pk]
  external_code text [unique]
  client_id uuid [ref: > clients.id]
  vehicle_id uuid [ref: > vehicles.id]
  driver_id uuid [ref: > driver_profiles.id]
  owner_id uuid [ref: > staff_accounts.id]
  status booking_status
  booking_type booking_type
  channel text
  kommo_status_id bigint
  priority priority_level
  start_at timestamptz
  end_at timestamptz
  total_amount numeric(12,2)
  deposit_amount numeric(12,2)
}

Table booking_invoices {
  id uuid [pk]
  booking_id uuid [ref: > bookings.id]
  label text
  invoice_type text
  amount numeric(12,2)
  status text
  issued_at timestamptz
  due_at timestamptz
}

Table calendar_events {
  id uuid [pk]
  vehicle_id uuid [ref: > vehicles.id]
  booking_id uuid [ref: > bookings.id]
  event_type calendar_event_type
  start_at timestamptz
  end_at timestamptz
  status event_status
}

Table tasks {
  id uuid [pk]
  booking_id uuid [ref: > bookings.id]
  vehicle_id uuid [ref: > vehicles.id]
  client_id uuid [ref: > clients.id]
  task_type task_type
  status task_status
  title text
  deadline_at timestamptz
  assignee_driver_id uuid [ref: > driver_profiles.id]
}

Table sales_pipeline_stages {
  id text [pk]
  name text
  probability numeric(5,2)
  sla_days int
}

Table sales_leads {
  id uuid [pk]
  lead_code text [unique]
  client_id uuid [ref: > clients.id]
  owner_id uuid [ref: > staff_accounts.id]
  stage_id text [ref: > sales_pipeline_stages.id]
  value_amount numeric(12,2)
  expected_close_at timestamptz
}

Ref: bookings.client_id > clients.id
Ref: bookings.vehicle_id > vehicles.id
Ref: bookings.driver_id > driver_profiles.id
Ref: tasks.booking_id > bookings.id
Ref: sales_leads.client_id > clients.id
Ref: sales_leads.stage_id > sales_pipeline_stages.id
```

The DBML excerpt can be copied into dbdiagram.io/dbdocs for visualization or converted into SQL migrations. As per DBML best practices, table-level and column-level settings (primary keys, unique constraints, default values) are included inline, and referential actions (`on delete cascade`) can be appended once we finalise RLS policies.
