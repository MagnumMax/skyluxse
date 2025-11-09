# Schema Changelog

## 2025-11-09 — Initial Supabase Schema Baseline
- Added Postgres enums for roles, vehicle/task/booking statuses, and document scopes to keep RLS + App Router types in sync with `docs/schemas/database-schema.md`.
- Created core tables: `staff_accounts`, `driver_profiles`, `clients`, `vehicles`, `bookings`, `booking_invoices`, `booking_timeline_events`, `calendar_events`, `tasks`, `task_checklist_items`, `documents`, `document_links`, `sales_pipeline_stages`, `sales_leads`, `integrations_outbox`, `kommo_webhook_events`, `kpi_snapshots`, `ai_feedback_events`, and `system_feature_flags`.
- Added helper trigger `set_updated_at` across mutating tables plus a `current_app_role()` function for RLS checks aligned with persona-based navigation (PRD §2, §4).
- Seeded default pipeline stages (`prospect`, `proposal`, `won`) and feature flags (`enableKommoLive`, `enableZohoLive`, `enableSlackAlerts`).
- Provisioned private Supabase Storage buckets (`documents`, `task-media`, `analytics-exports`) with service-role upload policies and authenticated read policies for signed URL workflows.
- Enabled Row Level Security on all application tables, granting scoped access for operations/sales/CEO personas, drivers, and service-role automations; documented driver assignment rules for tasks.
