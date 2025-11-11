# Schema Changelog

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
- `run_kommo_full_refresh` теперь игнорирует лиды в статусах `79790631` (Request bot answering) и `91703923` (Follow up) при построении букингов, чтобы календарь наполнялся только подтверждёнными бронями.
- Документация для Kommo mapping/tech spec обновлена, поясняя, что эти “предподтверждённые” шаги остаются в `sales_leads`, но больше не попадают в `bookings`/`calendar_events_expanded`.
- Фильтр расширен до `status_id = 143 (Closed - lost)`, чтобы в календаре не появлялись проигранные сделки.
- В `public.bookings` добавлена колонка `kommo_status_id bigint`, а снапшот Kommo импортов теперь сохраняет исходный `status_id` для каждой записи, что позволяет строить отчёты по стадиям без повторного обращения к Kommo.
