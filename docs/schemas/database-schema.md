# Database Schema

_Last updated: 27 Dec 2025_

This schema reflects the current state of the Supabase/PostgreSQL database. It covers operations, sales, fleet management, and integrations.

## Entity Overview

- **Identity & Staff**: `staff_accounts`, `driver_profiles`, `profiles` (customer profiles).
- **Clients & Contacts**: `clients`, `client_notifications`.
- **Fleet & Maintenance**: `vehicles`, `vehicle_reminders`, `vehicle_inspections`, `maintenance_jobs`, `additional_services`.
- **Documents**: `documents`, `document_links`, `profile_documents`, `application_documents`.
- **Bookings**: `bookings`, `booking_additional_services`, `booking_invoices`, `booking_timeline_events`.
- **Calendar & Tasks**: `calendar_events`, `tasks`, `task_checklist_items`, `task_required_inputs`, `task_required_input_values`, `task_additional_services`.
- **Sales & Deals**: `sales_leads`, `sales_pipeline_stages`, `deals`, `deal_events`, `applications`, `ai_feedback_events`.
- **Integrations**: `kommo_import_runs`, `kommo_pipeline_stages`, `kommo_webhook_events`, `kommo_webhook_stats`, `integrations_outbox`, `zoho_tokens`.
- **System**: `system_settings`, `system_feature_flags`, `system_logs`, `kpi_snapshots`.

## Detailed Tables

### Staff & Identity

**staff_accounts**
Internal staff members (operations, sales, drivers).
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | Supabase Auth ID references `auth.users.id`. |
| full_name | text | |
| email | citext unique | |
| phone | text | |
| role | role_type enum | `operations`, `sales`, `ceo`, `driver`, `integration`. |
| locale | text | e.g., `en-CA`. |
| timezone | text | e.g., `Asia/Dubai`. |
| default_route | text | |
| is_active | boolean | default `true`. |
| external_crm_id | text | e.g. Kommo User ID. |
| created_at/updated_at | timestamptz | |

**driver_profiles**
Extends `staff_accounts` for drivers.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| staff_account_id | uuid fk staff_accounts | |
| status | driver_status enum | `available`, `on_task`, `standby`. |
| experience_years | int | |
| current_lat/lng | numeric | |
| languages | text[] | |
| notes | text | |
| last_status_at | timestamptz | |

**profiles**
Customer/User profiles (likely for client portal/app).
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid | Link to auth.users? |
| status | user_status enum | `pending`, `active`, `suspended`, `archived`. |
| full_name | text | |
| first_name/last_name | text | |
| phone | text | |
| emirates_id | text | |
| passport_number | text | |
| nationality | text | |
| residency_status | text | |
| date_of_birth | date | |
| address | jsonb | |
| employment_info | jsonb | |
| financial_profile | jsonb | |

### Clients & Contacts

**clients**
CRM contacts/clients.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| kommo_contact_id | text unique | |
| zoho_contact_id | text | |
| name | text | |
| phone | text | |
| email | citext | |
| residency_country | text | |
| tier | client_tier enum | `vip`, `gold`, `silver`. |
| segment | client_segment enum | `resident`, `tourist`, `premier_loyalist`, etc. |
| gender | text | |
| date_of_birth | date | |
| outstanding_amount | numeric | |
| nps_score | smallint | |
| preferred_channels | text[] | |
| preferred_language | text | |
| timezone | text | |
| doc_status | text | Document recognition status. |
| doc_confidence | numeric | |
| doc_model | text | |
| doc_data | fields | `doc_document_id`, `doc_raw`, `first_name`, `last_name`, `nationality`, `document_number`, etc. |
| created_by/updated_by | uuid fk staff_accounts | |

**client_notifications**
History of notifications sent to clients.

### Fleet & Maintenance

**vehicles**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| external_ref | text unique | Legacy ID. |
| name | text | |
| make/model/year | text/int | |
| vin | text unique | |
| plate_number | text | |
| status | vehicle_status enum | `available`, `in_rent`, `maintenance`, `reserved`, `sold`, `service_car`. |
| class | text | |
| segment | text | |
| specs | fields | `body_style`, `seating_capacity`, `engine_displacement_l`, `power_hp`, `cylinders`, `transmission`, `zero_to_hundred_sec`, `exterior_color`, `interior_color`. |
| mileage_km | int | |
| utilization_pct | numeric | |
| revenue_ytd | numeric | |
| location | text | |
| image_url | text | |
| kommo_vehicle_id | text unique | |
| zoho_item_id | text | |
| rental_prices | jsonb | Daily/weekly/monthly rates. |

**vehicle_reminders**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| vehicle_id | uuid fk vehicles | |
| reminder_type | text | `insurance`, `service`, etc. |
| due_date | date | |
| status | text | |
| severity | text | |
| notes | text | |

**vehicle_inspections**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| vehicle_id | uuid fk vehicles | |
| inspection_date | date | |
| driver_id | uuid fk driver_profiles | |
| performed_by | text | |
| notes | text | |
| photo_document_ids | uuid[] | |

**maintenance_jobs**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| vehicle_id | uuid fk vehicles | |
| booking_id | uuid fk bookings | Optional link to booking. |
| job_type | maintenance_job_type enum | `maintenance`, `repair`, `detailing`. |
| status | maintenance_job_status enum | `scheduled`, `in_progress`, `done`, `cancelled`. |
| scheduled_start/end | timestamptz | |
| actual_start/end | timestamptz | |
| odometer_start/end | int | |
| vendor | text | |
| cost_estimate | numeric | |
| description | text | |
| location | text | |

**additional_services**
Global catalog of additional services (e.g. Child Seat, WiFi).
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| name | text | |
| description | text | |
| default_price | numeric | |
| is_active | boolean | default `true`. |
| created_at/updated_at | timestamptz | |

### Documents

**documents**
Central file registry (Supabase Storage metadata).
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| bucket | text | |
| storage_path | text | |
| file_name | text | |
| original_name | text | |
| mime_type | text | |
| size_bytes | bigint | |
| checksum | text | |
| status | document_status enum | `needs_review`, `verified`, `expired`. |
| source | text | |
| expires_at | date | |
| metadata | jsonb | |

**document_links**
Polymorphic links between documents and entities.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| document_id | uuid fk documents | |
| scope | document_scope enum | `client`, `vehicle`, `booking`, `task`, `lead`, `maintenance_job`. |
| entity_id | uuid | ID of the linked entity. |
| doc_type | text | e.g. `passport`, `contract`. |
| notes | text | |

**profile_documents**
Documents linked to `profiles`.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| profile_id | uuid | |
| document_type | text | |
| document_category | text | |
| title | text | |
| storage_path | text | |
| mime_type | text | |
| file_size | bigint | |
| status | text | `uploaded` |
| metadata | jsonb | |
| uploaded_at | timestamptz | |
| verified_at | timestamptz | |
| verified_by | uuid | |

**application_documents**
Documents linked to financing `applications`.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| application_id | uuid | |
| document_type | text | |
| document_category | text | |
| original_filename | text | |
| stored_filename | text | |
| storage_path | text | |
| mime_type | text | |
| file_size | int | |
| checksum | text | |
| status | text | |
| verification_data | jsonb | |
| uploaded_at | timestamptz | |
| verified_at | timestamptz | |
| verified_by | uuid | |

### Bookings & Rentals

**bookings**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| external_code | text unique | `BK-...` |
| client_id | uuid fk clients | |
| vehicle_id | uuid fk vehicles | |
| driver_id | uuid fk driver_profiles | |
| owner_id | uuid fk staff_accounts | |
| status | booking_status enum | `lead`, `confirmed`, `delivery`, `in_progress`, `completed`, `cancelled`. |
| booking_type | booking_type enum | `rental`, `chauffeur`, `transfer`. |
| start_at/end_at | timestamptz | |
| rental_duration_days | int | |
| price_daily | numeric | |
| total_amount | numeric | |
| deposit_amount | numeric | |
| advance_payment | numeric | |
| full_insurance_fee | numeric | |
| channel | text | |
| priority | priority_level enum | |
| kommo_status_id | bigint | |
| zoho_sales_order_id | text | |
| zoho_sync_status | text | |
| sales_service_rating | smallint | |
| sales_service_feedback | text | |

**booking_additional_services** (formerly booking_addons)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| booking_id | uuid fk bookings | |
| service_id | uuid | |
| price | numeric | |
| quantity | int | |
| description | text | |

**booking_invoices**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| booking_id | uuid fk bookings | |
| label | text | |
| invoice_type | text | |
| amount | numeric | |
| status | text | |
| issued_at | timestamptz | |
| due_at | timestamptz | |

**booking_timeline_events**
Audit log for bookings.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| booking_id | uuid fk bookings | |
| event_type | text | |
| message | text | |
| payload | jsonb | |
| occurred_at | timestamptz | |

### Calendar & Tasks

**calendar_events**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| vehicle_id | uuid fk vehicles | |
| booking_id | uuid fk bookings | |
| maintenance_job_id | uuid fk maintenance_jobs | |
| event_type | calendar_event_type enum | `booking`, `maintenance`, `logistics`. |
| start_at/end_at | timestamptz | |
| status | event_status enum | `scheduled`, `in_progress`, `done`, `cancelled`. |

**tasks**
Operational tasks (deliveries, pickups, etc.).
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| booking_id | uuid fk bookings | |
| vehicle_id | uuid fk vehicles | |
| client_id | uuid fk clients | |
| task_type | task_type enum | `pickup`, `delivery`, `inspection`, `document`, `custom`. |
| status | task_status enum | `todo`, `inprogress`, `done`, `blocked`. |
| title | text | |
| deadline_at | timestamptz | |
| assignee_driver_id | uuid fk driver_profiles | |
| sla_minutes | int | |
| metadata | jsonb | |

**task_checklist_items**
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid fk tasks | |
| label | text | |
| is_required | boolean | |
| is_complete | boolean | |

**task_required_inputs**
Definitions of inputs required for a task.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid fk tasks | |
| key | text | |
| label | text | |
| input_type | text | |
| required | boolean | |
| options | text[] | |

**task_required_input_values**
Values submitted for task inputs.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid fk tasks | |
| key | text | |
| value_text | text | |
| value_number | numeric | |
| value_json | jsonb | |
| storage_paths | text[] | For media/files. |
| captured_by | uuid fk staff_accounts | |
| captured_at | timestamptz | |

**task_additional_services**
Services linked to specific tasks (e.g. payment collection).
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| task_id | uuid fk tasks | |
| service_id | uuid | |
| price | numeric | |
| quantity | int | |
| description | text | |

### Sales & Deals (New)

**sales_leads**
Early stage leads.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| lead_code | text | |
| client_id | uuid fk clients | |
| owner_id | uuid fk staff_accounts | |
| stage_id | text | |
| value_amount | numeric | |
| expected_close_at | timestamptz | |
| ai_summary | jsonb | |

**sales_pipeline_stages**
Definitions of stages in the sales pipeline.
| Column | Type | Notes |
| --- | --- | --- |
| id | text pk | |
| name | text | |
| probability | numeric | |
| sla_days | int | |
| kommo_pipeline_id | text | |
| kommo_status_id | text | |
| booking_status | text | |

**applications**
Financing/Leasing applications.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| application_number | text | |
| user_id | uuid | |
| vehicle_id | uuid fk vehicles | |
| status | application_status enum | `draft`, `submitted`, `in_review`, `approved`, `rejected`, etc. |
| requested_amount | numeric | |
| term_months | int | |
| personal_info | jsonb | |
| financial_info | jsonb | |
| scoring_results | jsonb | |

**deals**
Active deals/contracts.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| deal_number | text | |
| application_id | uuid fk applications | |
| vehicle_id | uuid fk vehicles | |
| client_id | uuid fk clients | |
| status | deal_status enum | `draft`, `active`, `completed`, `defaulted`, etc. |
| contract_terms | jsonb | |
| financial_fields | numeric | `principal_amount`, `monthly_payment`, `interest_rate`, `security_deposit`, etc. |
| contract_dates | date | `contract_start_date`, `contract_end_date`, `first_payment_date`. |

**deal_events**
Audit log for deals.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| deal_id | uuid | |
| event_type | text | |
| payload | jsonb | |
| created_by | uuid | |
| created_at | timestamptz | |

**ai_feedback_events**
AI recommendations and feedback tracking.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| entity_type | text | |
| entity_id | uuid | |
| model | text | |
| recommendation | text | |
| rating | text | |
| comment | text | |
| payload | jsonb | |
| created_by | uuid | |
| created_at | timestamptz | |

### Integrations

**kommo_import_runs**
Tracks import jobs from Kommo CRM.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| triggered_by | uuid | |
| status | text | `running`, `completed`, `failed`. |
| started_at/finished_at | timestamptz | |
| leads_count | int | |
| contacts_count | int | |
| vehicles_count | int | |
| error | text | |

**kommo_webhook_events**
Raw webhook payloads from Kommo.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| source_payload_id | text | |
| hmac_validated | boolean | |
| status | text | `received` |
| payload | jsonb | |
| error_message | text | |
| created_at | timestamptz | |
| kommo_status_id | text | |
| kommo_status_label | text | |
| fetched_data | jsonb | |

**kommo_webhook_stats**
Aggregated statistics for Kommo webhooks.
| Column | Type | Notes |
| --- | --- | --- |
| bucket_start | timestamptz | |
| event_type | text | |
| total_events | int | |
| processed_events | int | |
| failed_events | int | |
| last_event_at | timestamptz | |

**kommo_pipeline_stages**
Mirrors Kommo pipeline structure.
| Column | Type | Notes |
| --- | --- | --- |
| id | text pk | |
| label | text | |
| group_name | text | |
| description | text | |
| header_color | text | |
| booking_status | text | |
| is_active | boolean | |
| order_index | int | |

**integrations_outbox**
Queue for outgoing integration events (reliable delivery).
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| entity_type | text | |
| entity_id | uuid | |
| target_system | text | |
| event_type | text | |
| payload | jsonb | |
| status | text | `pending`, `processed`, `failed`. |
| attempts | int | |
| last_error | text | |
| next_run_at | timestamptz | |
| response | jsonb | |

**zoho_tokens**
Auth tokens for Zoho integration.
| Column | Type | Notes |
| --- | --- | --- |
| id | bigint pk | |
| user_mail | text | |
| client_id | text | |
| refresh_token | text | |
| access_token | text | |
| grant_token | text | |
| expiry_time | text | |

### System

**system_settings**
Global configuration.
| Column | Type | Notes |
| --- | --- | --- |
| key | text pk | |
| value | jsonb | |
| description | text | |

**system_feature_flags**
Feature toggles.
| Column | Type | Notes |
| --- | --- | --- |
| flag | text pk | |
| is_enabled | boolean | |

**system_logs**
Centralized logging.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| level | system_log_level enum | `info`, `warning`, `error`, `critical`. |
| category | system_log_category enum | `system`, `kommo`, `zoho`, `auth`, `booking`, `task`. |
| message | text | |
| metadata | jsonb | |

**kpi_snapshots**
Daily/Periodic snapshots of key performance indicators.
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| snapshot_date | date | |
| metrics | jsonb | |
| created_at | timestamptz | |
