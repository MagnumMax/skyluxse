# Kommo → Supabase Import Mapping

_Last updated: 10 Nov 2025 (Kommo account `infoskyluxsecom.kommo.com`, pipelines snapshot retrieved via API)._

## Scope
- Import Kommo leads created between **1 Jan 2025** and **31 Dec 2025**, но в букинги проходят только стадии `status_id ∈ {75440391, 75440395, 75440399, 76475495, 78486287, 75440643, 75440639, 142}`. Kommo API разрешает указывать лишь одну стадию в `filter[statuses]`, поэтому full refresh делает по одному проходу на каждый статус и дальше режет результат по датам уже на нашей стороне.
- Alongside each lead we ingest its main contact (`_embedded.contacts[is_main=true]`) and the custom select field **Vehicle** so we can tie bookings to our fleet.
- Target tables: `sales_leads`, `bookings`, `clients`, `vehicles`, `booking_vehicles`, `documents`, `sales_pipeline_stages`.
- `sales_pipeline_stages` теперь хранит полный словарь Kommo → Supabase: для каждой стадии задаём `kommo_pipeline_id`, `kommo_status_id` и `booking_status` (одно из `lead`, `confirmed`, `delivery`, `in_progress`, `completed`, `cancelled`). Серверный маршрут Next.js `/api/integrations/kommo/webhook` читает эти столбцы, поэтому любые новые стадии нужно вносить сюда и миграциями.

## Leads → sales_leads & bookings
| Kommo field | Example | Supabase column | Notes |
| --- | --- | --- | --- |
| `lead.id` | `19627379` | `sales_leads.lead_code`, `bookings.source_payload_id` | Store as text; drives idempotent upsert. |
| `lead.name` | `Lead #19627379` | `sales_leads.lead_code` (human), `bookings.external_code` (fallback) | Keep original label for traceability until ERP issues BK codes. |
| `lead.price` | `0` | `sales_leads.value_amount` | Value captured even if Kommo automation overwrote via `is_price_modified_by_robot`; bookings totals теперь считаем сами. |
| `lead.responsible_user_id` | `12157403` | `sales_leads.owner_id` | Map via `staff_accounts.external_crm_id`. |
| `lead.pipeline_id` + `status_id` | `9815931` / `79790631` | `sales_leads.stage_id` | Use mapping table in section “Pipeline status mapping”. |
| `lead.created_at` | `2025-11-10T07:51:21Z` | `sales_leads.created_at`, `bookings.created_at` | Keep UTC timestamps. |
| `lead.updated_at` | `2025-11-10T08:08:53Z` | `sales_leads.updated_at`, `bookings.updated_at` | |
| `lead.closed_at` | `null` | `bookings.actual_at` (optional) | Only when Kommo marks closed-won. |
| `lead.source_id` / custom field **Source** (ID 823206) | `21022` / `RENTACAR-DUBAI.AE` | `bookings.source`, `sales_leads.channel` | `bookings.channel` hard-coded to `Kommo`; marketing source stored separately. |
| Custom field **Date/Time Delivery** (ID 1218176) | `1735977600` | `bookings.start_at` | Stored as epoch seconds in Kommo; converted to `timestamptz` via `extract_kommo_epoch`.
| Custom field **Date/Time Collect** (ID 1218178) | `1736064000` | `bookings.end_at` | Same conversion; also used as fallback when delivery time is missing.
| `lead.status_id` | `75440391` и др. | `bookings.kommo_status_id` (только whitelist) | В букинги попадают лишь статусы `75440391`, `75440395`, `75440399`, `76475495`, `78486287`, `75440643`, `75440639`, `142`; остальные стадии (включая `79790631`, `91703923`, `143`) игнорируются, но сохраняются в `kommo_status_id` для аудита. |
| `lead.custom_fields_values[]` (`field_name="Vehicle"`, ID 1234163) | `enum_id: 958555` | `booking_vehicles.vehicle_id` (via mapping table), `vehicles.kommo_vehicle_id` | See “Vehicle select mapping”. |
| Custom field **Full Insurance Fee** (ID 1234179) | `3500` | `bookings.full_insurance_fee` | Numeric input (AED) representing paid full insurance; используется в формулах Total/Total with VAT. |
| `_embedded.contacts[].id` | `22190089` | `bookings.client_id`, `sales_leads.client_id` | Look up/insert client using contact mapping below. |
| `is_deleted` | `false` | `bookings.is_active` flag / soft-delete logic | Skip deleted leads unless historically needed. |

> **Booking totals.** `bookings.total_amount` = `Daily rate × Duration + Delivery fee + Full insurance fee + Deposit options`. Delivery fee и Deposit options по‑прежнему приходят строками (matching enum) — парсим числа из текстов, пока Kommo не начнёт отдавать отдельные numeric поля. **Full insurance fee** читаем из `bookings.full_insurance_fee`. В UI **Total with VAT** = `Total × 1.05`, outstanding = `Total with VAT − Advance payment`.

## Contacts → clients & documents
| Kommo contact field | Supabase column / entity | Notes |
| --- | --- | --- |
| `contact.id` | `clients.kommo_contact_id` | Primary lookup key when ingesting. |
| `contact.name` | `clients.name` | Trim “Lead #” prefixes if Kommo auto-filled. |
| Custom field **Phone** (`code=PHONE`, multitext) | `clients.phone` (primary), `client_preferences->phones` | Take the first `MOB` entry; store rest as JSONB metadata. |
| Custom field **Email** (`code=EMAIL`) | `clients.email` | Prefer `WORK`, fallback `OTHER`. |
| Custom field **Nationality** | `clients.residency_country` | Normalize to ISO (map known free-text values). |
| Custom field **Birthday** | `clients.birth_date` | Stored as date. |
| Custom field **Gender** | `clients.gender` | Normalise casing (`Male`/`Female`). |
| Custom field **Source phone** | `clients.metadata->source_phone` | Optional audit. |
| Custom fields **Passport/ID**, **Driver's license**, **Emirates ID** (type `file`) | `documents` + `document_links` | Upload URLs referenced in Kommo to Supabase storage when available; set `documents.source='Kommo'` and link to `clients`. |

## Vehicle select mapping
Kommo lead custom field `Vehicle` (ID `1234163`) is a select list. Each enum ID becomes a row in `vehicles` (if missing) and a bridge row in `booking_vehicles`.

| enum_id | Value | vehicles.name | Suggested `vehicles.external_ref` |
| --- | --- | --- | --- |
| 958555 | Audi Q8 Z32005 | `Audi Q8` | `Z32005` |
| 958557 | BMW Z4 Y82984 | `BMW Z4` | `Y82984` |
| 958559 | BMW X6 K21656 | `BMW X6` | `K21656` |
| 958561 | BMW X7 D47942 | `BMW X7` | `D47942` |
| 958563 | BMW XM CC40232 | `BMW XM` | `CC40232` |
| 958565 | Cadillac Escalade Sport AA46394 | `Cadillac Escalade Sport` | `AA46394` |
| 958567 | Cadillac Escalade Sport Z28895 | `Cadillac Escalade Sport` | `Z28895` |
| 958569 | Land Rover Defender K52548 | `Land Rover Defender` | `K52548` |
| 958571 | Land Rover Range Rover N30535 | `Range Rover` | `N30535` |
| 958573 | Land Rover Discovery BB11089 | `Land Rover Discovery` | `BB11089` |
| 958575 | Mercedes GLE350 E22850 | `Mercedes GLE350` | `E22850` |
| 958577 | Mercedes GLE53 Q65886 | `Mercedes GLE53` | `Q65886` |
| 958579 | Mercedes GLC43 Y25323 | `Mercedes GLC43` | `Y25323` |
| 958581 | Mercedes E450 Y19840 | `Mercedes E450` | `Y19840` |
| 958583 | Mercedes E350 I65713 | `Mercedes E350` | `I65713` |
| 958585 | Mercedes G63 Grey Z54986 | `Mercedes G63 (Grey)` | `Z54986` |
| 958587 | Mercedes G63 Nardo Grey O46126 | `Mercedes G63 (Nardo Grey)` | `O46126` |
| 958589 | Mercedes G63 Blue M31998 | `Mercedes G63 (Blue)` | `M31998` |
| 958591 | Mercedes S500 S22741 | `Mercedes S500` | `S22741` |
| 958593 | BMW 735 Z16260 | `BMW 735` | `Z16260` |
| 958595 | Porsche Boxter Red Q73510 | `Porsche Boxster` | `Q73510` |
| 958597 | Porsche Boxter Grey Y32427 | `Porsche Boxster` | `Y32427` |
| 958599 | Porsche Targa S19421 | `Porsche Targa` | `S19421` |
| 958601 | Porsche Cayenne T61018 | `Porsche Cayenne` | `T61018` |
| 958603 | Mitsubishi Outlander M58549 | `Mitsubishi Outlander` | `M58549` |
| 958605 | B/B Vehicle | `Brokered / Borrowed Vehicle` | `BROKER` |

> Parsing rule: `value` consistently follows “MODEL IDENTIFIER”; split on last space to separate display name vs. unit code.

## Marketing source mapping
Kommo custom field **Source** (ID `823206`) maps to `bookings.source` and optionally `sales_leads.channel`. Keep raw strings for analytics and optionally normalize into enumerations later.

| enum_id | Kommo label | Destination |
| --- | --- | --- |
| 615194 | RENTY.AE | `bookings.source = 'RENTY.AE'` |
| 615196 | ONECLICKDRIVE.COM | `'ONECLICKDRIVE.COM'` |
| 615198 | RENTACAR-DUBAI.AE | `'RENTACAR-DUBAI.AE'` |
| 615200 | FRIENDS | `'FRIENDS'` |
| 935896 | OLD CUSTOMER | `'OLD CUSTOMER'` |
| 935898 | OTHERS | `'OTHERS'` |
| 948760 | BROKER | `'BROKER'` (may require special handling for B/B vehicles). |
| 948762 | B/B | `'B/B'` |
| 958813 | Skyluxse.ae | `'Skyluxse.ae'` |

## Pipeline status mapping
Create `sales_pipeline_stages` slugs following `pipelineName_statusName` (lowercase snake case). Example: `skyluxse_pipeline_incoming_leads`. Map to operational states via the `booking_status` column — см. миграцию `0036_unify_kommo_stage_mapping.sql`, которая сидирует базовые стадии пайплайна `9815931`.

| Pipeline ID / Name | Kommo status (ID) | Supabase `sales_pipeline_stages.id` | Suggested `bookings.status` |
| --- | --- | --- | --- |
| 9815931 `SkyLuxse Pipeline` | 75440383 `Incoming Leads` | `skyluxse_incoming` | `new` |
| 9815931 | 79790631 `Request Bot Answering` | `skyluxse_bot_answering` | `new` |
| 9815931 | 91703923 `Follow Up` | `skyluxse_follow_up` | `preparation` |
| 9815931 | 96150292 `Waiting for Payment` | `skyluxse_waiting_payment` | `preparation` |
| 9815931 | 75440391 `Confirmed Bookings` | `skyluxse_confirmed` | `preparation` |
| 9815931 | 75440395 `Delivery Within 24 Hours` | `skyluxse_delivery_24h` | `delivery` |
| 9815931 | 75440399 `Car with Customers` | `skyluxse_with_customer` | `in_rent` |
| 9815931 | 76475495 `Pick Up Within 24 Hours` | `skyluxse_pickup_24h` | `settlement` |
| 9815931 | 78486287 `Objections` | `skyluxse_objections` | `preparation` |
| 9815931 | 75440643 `Refund Deposit` | `skyluxse_refund_deposit` | `settlement` |
| 9815931 | 75440639 `Deal Is Closed` | `skyluxse_deal_closed` | `settlement` |
| 9815931 | 142 `Closed · Won` | `skyluxse_closed_won` | `settlement` |
| 9815931 | 143 `Closed · Lost` | (excluded) | — |
| 9839071 `Aleksei` | 75590083 `Incoming leads` | `aleksei_incoming` | `new` |
| 9839071 | 82164527 `Manager` | `aleksei_manager` | `preparation` |
| 9839071 | 75590091 `pre-Confirmed booking` | `aleksei_preconfirmed` | `preparation` |
| 9839071 | 78154191 `Follow up` | `aleksei_follow_up` | `preparation` |
| 9839071 | 142 `Booking` | `aleksei_booking_won` | `settlement` |
| 9839071 | 143 `Closed - lost` | (excluded) | — |
| 10852939 `Konstantin` | 83223803 `Неразобранное` | `konstantin_uncategorized` | `new` |
| 10852939 | 83223807 `Manager` | `konstantin_manager` | `preparation` |
| 10852939 | 88078291 `Pre-confirmed` | `konstantin_preconfirmed` | `preparation` |
| 10852939 | 83223811 `Follow Up` | `konstantin_follow_up` | `preparation` |
| 10852939 | 142 `Успешно реализовано` | `konstantin_closed_won` | `settlement` |
| 10852939 | 143 `Закрыто и не реализовано` | (excluded) | — |
| 10988431 `Sidd` | 84280207 `Incoming leads` | `sidd_incoming` | `new` |
| 10988431 | 84280215 `manager` | `sidd_manager` | `preparation` |
| 10988431 | 84280311 `pre-Confirmed` | `sidd_preconfirmed` | `preparation` |
| 10988431 | 84280219 `Follow up` | `sidd_follow_up` | `preparation` |
| 10988431 | 142 `Closed - won` | `sidd_closed_won` | `settlement` |
| 10988431 | 143 `Closed - lost` | (excluded) | — |
| 11527247 `Danil` | 88515295 `Incoming leads` | `danil_incoming` | `new` |
| 11527247 | 88515299 `Pre-confirmed` | `danil_preconfirmed` | `preparation` |
| 11527247 | 88515303 `Follow up` | `danil_follow_up` | `preparation` |
| 11527247 | 88515307 `Negotiation` | `danil_negotiation` | `preparation` |
| 11527247 | 142 `Closed - won` | `danil_closed_won` | `settlement` |
| 11527247 | 143 `Closed - lost` | (excluded) | — |

> When inserting into `sales_pipeline_stages`, reuse the IDs above. `booking_status` переводит Kommo стадию в операционный статус букинга (`lead`, `confirmed`, `delivery`, `in_progress`, `completed`, `cancelled`). Эти значения читает вебхук, поэтому поддерживается ровно одно значение на комбинацию `kommo_pipeline_id + kommo_status_id`.

`/app/(dashboard)/bookings` и панель интеграций читают метаданные напрямую из `sales_pipeline_stages`, поэтому обновляйте таблицу и документы при каждом изменении пайплайна.

## Data quality rules
- **Idempotency**: Use `lead.id` + `contact.id` to avoid duplicate rows. Any re-run must upsert (not append) when Kommo data changes.
- **Null Vehicles**: If `custom_fields_values` lacks Vehicle, leave `booking_vehicles` empty and flag row for manual review (store alert in `booking_timeline_events`).
- **B/B Vehicles**: Enum `958605` represents brokered cars; do not create actual `vehicles` rows—link to placeholder `vehicle_id` referencing a synthetic “Brokered Vehicle” entry.
- **Timezone**: Kommo timestamps are UTC; convert to Dubai time only when presenting in UI, not in the DB.

This document must be updated whenever Kommo custom fields/pipelines change or when new Supabase columns are added. Use the Kommo API endpoints `GET /api/v4/leads/custom_fields`, `GET /api/v4/contacts/custom_fields`, and `GET /api/v4/leads/pipelines` to refresh the metadata.
