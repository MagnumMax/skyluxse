# Schema Changelog

## 2025-11-13 — Client Document Metadata Alignment
- Added `document_status` enum plus `original_name`, `status`, `source`, `expires_at`, and `metadata` columns to `public.documents`, ensuring Kommo uploads persist without column mismatches and allowing compliance expiries.
- Updated the documents section in `docs/schemas/database-schema.md` to reflect the new metadata and clarify the storage bucket/file name expectations.

## 2025-11-13 — Sales Service Feedback Capture
- Added `sales_service_rating`, `sales_service_feedback`, `sales_service_rated_by`, and `sales_service_rated_at` columns to `public.bookings` to store the CEO’s handoff assessment without relying on UI placeholders.
- Documented the new fields inside `docs/schemas/database-schema.md` so the operations booking detail card can render live data and accept updates via server actions.

## 2025-11-09 — Initial Supabase Schema Baseline
- Added Postgres enums for roles, vehicle/task/booking statuses, and document scopes to keep RLS + App Router types in sync with `docs/schemas/database-schema.md`.
- Created core tables: `staff_accounts`, `driver_profiles`, `clients`, `vehicles`, `bookings`, `booking_invoices`, `booking_timeline_events`, `calendar_events`, `tasks`, `task_checklist_items`, `documents`, `document_links`, `sales_pipeline_stages`, `sales_leads`, `integrations_outbox`, `kommo_webhook_events`, `kpi_snapshots`, `ai_feedback_events`, and `system_feature_flags`.
- Added helper trigger `set_updated_at` across mutating tables plus a `current_app_role()` function for RLS checks aligned with persona-based navigation (PRD §2, §4).
- Seeded default pipeline stages (`prospect`, `proposal`, `won`) and feature flags (`enableKommoLive`, `enableZohoLive`, `enableSlackAlerts`).
- Provisioned private Supabase Storage buckets (`documents`, `task-media`, `analytics-exports`) with service-role upload policies and authenticated read policies for signed URL workflows.
- Enabled Row Level Security on all application tables, granting scoped access for operations/sales/CEO personas, drivers, and service-role automations; documented driver assignment rules for tasks.

## 2025-11-10 — Vehicle Spec Capture For Import
- Added `make`, `model`, `vin`, `model_year`, `exterior_color`, `interior_color`, `body_style`, and `seating_capacity` to `public.vehicles` so we can map OEM-provided sheets without overloading `name`/`class`.
- Captured performance metadata (`engine_displacement_l`, `power_hp`, `cylinders`, `zero_to_hundred_sec`, `transmission`) with CHECK constraints to keep values within realistic bounds for analytics.
- Declared a nullable unique VIN constraint to safeguard duplicates while still allowing missing VINs in the Montero/“SOLD” rows.
- Synced `docs/schemas/database-schema.md` and logged design context in `docs/design/vehicle-spec-extension.md` to stay aligned with the declarative schema workflow.

## 2025-11-10 — Kommo Vehicle Linkage
- Added `kommo_vehicle_id` to `public.vehicles` (nullable text with unique constraint) so CRM imports from Kommo can reference definitive IDs instead of fuzzy plate matches.
- Documented the field in `docs/design/vehicle-spec-extension.md` and `docs/schemas/database-schema.md` for future ETL work.

## 2025-11-10 — Vehicle Status Extensions
- Extended `vehicle_status` enum with `sold` and `service_car` to reflect lifecycle end-state inventory and long-term service shuttles.
- Updated documentation for `vehicles.status` and applied the new statuses to the imported Mercedes C200, Mitsubishi Montero Sport, and Mitsubishi Attrage records.

## 2025-11-10 — Kommo Full-Refresh Staging Layer
- Introduced `kommo_import_runs` to log button-triggered refreshes (who запустил, сколько лидов/клиентов/авто ушло, статус/ошибки).
- Added staging tables `stg_kommo_leads`, `stg_kommo_contacts`, `stg_kommo_booking_vehicles` with cascading FK на `kommo_import_runs` и индексами для быстрой агрегации перед транзакционным свопом.
- Все таблицы снабжены `payload jsonb` колонками для отладки плюс `created_at/updated_at` по конвенции схемы.

## 2025-11-10 — Kommo RPC Helpers & Full Refresh Function
- Добавлен `unique`-constraint `clients_kommo_contact_unique`, чтобы апсерты по `kommo_contact_id` были идемпотентными.
- Созданы RPC-хелперы: `start_kommo_import_run`, `finish_kommo_import_run`, `insert_stg_kommo_lead`, `insert_stg_kommo_contact`, `insert_stg_kommo_vehicle_link`.
- Реализован `run_kommo_full_refresh(p_run_id uuid)`, который очищает прежние Kommo-данные, апсерит клиентов/лиды/букинги и обновляет счётчики ранa с блокировками.

## 2025-11-11 — Maintenance Jobs + Calendar Link
- Создана таблица `maintenance_jobs` с enum-типами `maintenance_job_type` (`maintenance`,`repair`,`detailing`) и `maintenance_job_status` (`scheduled`,`in_progress`,`done`,`cancelled`) для учёта сервисных/ремонтных окон, включая поля для расписаний, фактических окон, пробега, вендора и стоимости.
- Добавлен триггер `trg_maintenance_jobs_updated`, использующий `set_updated_at`, чтобы аналитика и календари всегда видели актуальные метки времени.
- В `calendar_events` добавлена колонка `maintenance_job_id uuid references maintenance_jobs(id)` для связи карточек календаря с конкретными сервисными задачами.

## 2025-11-11 — Booking Windows In Calendar View
- Создана helper-функция `extract_kommo_epoch(jsonb, bigint)` и view `calendar_events_expanded`, объединяющее реальные `calendar_events` и букинги с заполненными окнами, чтобы календарь мог читать единый источник без дублирования записей.
- Переписан `run_kommo_full_refresh(p_run_id uuid)`: теперь во время свопа мы резолвим Kommo Vehicle select → `vehicles.kommo_vehicle_id`, сохраняем `bookings.vehicle_id`, а также парсим custom fields “Date/Time Delivery” (ID 1218176) и “Date/Time Collect” (ID 1218178) в `bookings.start_at/end_at`.
- В конце миграции повторно прогоняется последний успешный Kommo-ран, чтобы проставить даты/машины для уже загруженных букингов и сразу наполнить календарь.

## 2025-11-11 — Kommo Pending Status Filter
- `run_kommo_full_refresh` теперь работает по whitelist’у стадий: `75440391`, `75440395`, `75440399`, `76475495`, `78486287`, `75440643`, `75440639`, `142`. Только эти статусы конвертируются в букинги/календарь.
- Документация для Kommo mapping/tech spec обновлена: подчёркиваем, что бот-ответы `79790631`, `91703923`, `143` и прочие стадии остаются в `sales_leads`, но не попадают в `bookings`/`calendar_events_expanded`.
- `bookings.kommo_status_id` по-прежнему хранит исходный `status_id`, поэтому отчёты по стадиям можно строить без повторных запросов в Kommo.

## 2025-11-11 — Kommo Contact Profile Fields
- Добавлена колонка `gender text` в `public.clients`, чтобы фиксировать нормализованный пол контакта из Kommo и использовать его в клиентском рабочем пространстве.
- Обновлены `docs/schemas/database-schema.md` и `docs/schemas/kommo-import-mapping.md`, чтобы отразить новый атрибут и его назначение.
- Kommo full refresh теперь извлекает телефоны, email, `residency_country` и `gender` напрямую из `stg_kommo_contacts`, нормализует значения и заполняет `clients` без пустых полей.
- Realtime вебхук (`supabase/functions/kommo-status-webhook`) повторяет ту же нормализацию, чтобы инкрементальные обновления клиентов не перетирали новые столбцы.

## 2025-11-12 — Lifetime Value Derives From Bookings
- Удалена колонка `clients.lifetime_value`, поскольку LTV теперь высчитывается на лету из суммарного оборота аренды (совпадает с прежней формулой Turnover).
- Обновлены базовые миграции и документация, чтобы отразить вычисляемую природу метрики; UI показывает только новый LTV, поле `turnover` исключено.

## 2025-11-12 — Automatic Tier From Bookings
- Добавлены функции `calculate_client_lifetime_value` и `calc_client_tier_from_ltv` с порогами VIP ≥ 50 000 AED, Gold ≥ 35 000 AED, Silver < 15 000 AED. LTV теперь суммирует все `bookings.total_amount` независимо от статуса.
- Введена lifecycle-сегментация клиентов (`premier_loyalist`, `dormant_vip`, `growth_gold`, `at_risk`, `new_rising`, `high_value_dormant`, `general`) через функции `calculate_client_last_booking_at`, `calc_client_segment_from_metrics`, `refresh_client_metrics_for_ids`.
- Триггер `trg_bookings_refresh_client_tier` на `bookings` пересчитывает `clients.tier` и `clients.segment` при любой вставке/обновлении/удалении, чтобы статусы и сегменты всегда следовали за LTV/активностью.
- Документация обновлена: записывать tier/segment вручную в импортах/Edge Functions больше не требуется.

## 2025-11-11 — Fleet Detail Data Surfaces
- Расширили `vehicles` метаданными (`health_score`, `location`, `image_url`), чтобы UI мог отображать здоровье и точку базирования без моков.
- Таблица `vehicle_reminders` хранит напоминания по страховым, мулькия и сервису (тип, дедлайн, статус, severity, автор) с индексами по `vehicle_id`/`due_date` и RLS, совпадающим с существующими ролями.
- Таблица `vehicle_inspections` фиксирует осмотры (дата, водитель/исполнитель, заметки, массив `photo_document_ids`), открывая путь к хранению медиа через `document_links`.
- Таблица `maintenance_jobs` стандартизирует окна работ (расписание, фактическое время, пробеги, вендор, стоимость) и связывается с букингами/календарём.
- `document_links` теперь имеет `doc_type` и `notes`, что позволяет фильтровать страховые/мулькия документы и галерею прямо в SQL.
- Все новые таблицы получили `set_updated_at` триггеры и RLS/политики для операций/сервис-ролей; документация (`docs/tech-specs/fleet-detail-page.md`, `docs/schemas/database-schema.md`) обновлена.

## 2025-11-12 — Kommo Webhook Status Metadata
- Added `kommo_status_id`/`kommo_status_label` columns to `public.kommo_webhook_events` so intake/status Edge Functions can persist the latest Kommo stage directly in the event log.
- Updated schema powers the “Last stage”/“Status label” card on `/exec/integrations` without extra Kommo API calls and makes troubleshooting failed webhooks faster.

## 2025-11-12 — Kommo booking financials & documents
- Extended `public.bookings` with nullable columns: `delivery_fee_label`, `delivery_location`, `collect_location`, `rental_duration_days`, `price_daily`, `insurance_fee_label`, `advance_payment`, `sales_order_url`, `agreement_number`. These fields mirror Kommo custom fields so the status webhook can keep ERP totals, fees, and logistical notes aligned with CRM.
- Kommo status webhook now ingests client documents (passport/driver license/Emirates ID): files are downloaded via Kommo Files API, uploaded to the Supabase Storage bucket `client-documents`, stored in `documents`, and linked to clients via `document_links` with `doc_type` values `passport_id`, `driver_license`, `emirates_id`.

## 2025-11-12 — Client & Vehicle Audit Actors
- Добавлены колонки `created_by`/`updated_by` в `public.clients` и `public.vehicles`, обе nullable и ссылающиеся на `staff_accounts(id)` с `on delete set null`, чтобы UI мог выводить точных авторов без эвристик.
- Документация обновлена в `docs/schemas/database-schema.md` и смежных техспеках (клиент/флот), подчёркивая, что системные импорты всё ещё отображаются как “Kommo import”, если актуальных акторов нет.
- Новый SQL вошёл в миграцию `0027_add_clients_vehicles_audit_columns.sql`; ручных backfill’ов не требуется, так как UI gracefully обрабатывает `NULL`.
