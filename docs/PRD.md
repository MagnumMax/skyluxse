# Product Requirements Document — SkyLuxse ERP 2.0

## 1. Executive Summary
### Product Vision
Build a unified, automation-forward operations hub where premium car-rental teams orchestrate bookings, fleet readiness, logistics, and revenue intelligence from a single Next.js App Router experience backed by Supabase services, Kommo ingestion, Zoho fulfilment, and AI copilots for sales and ops efficiency (see Reference Docs for framework guidance). The platform replaces the SPA prototype in `/beta` with production-grade routing, data contracts, and integrations that minimise manual re-entry while keeping executive insight real time.

### Goals & Objectives
1. **G1 – Zero-touch booking intake**: 95% of new rentals land via Kommo webhook without manual creation by end of Q2.
2. **G2 – SLA compliance uplift**: reduce late deliveries/pickups by 40% through automated timers and driver guidance.
3. **G3 – Revenue intelligence**: deliver daily analytics snapshots (fleet utilisation, channel mix) with <5 min lag.
4. **G4 – AI-assisted sales**: cut lead qualification time by 30% via AI next-action and vehicle-fit explanations.
5. **G5 – Integration resilience**: keep Zoho sales-order sync success rate ≥99% with automatic retries and observability.

### Target Audience
- **Primary**: Fleet/operations managers, sales managers, executive leadership of luxury mobility firms, field drivers.
- **Secondary**: Finance/compliance teams, integration engineers maintaining CRM/payment stacks.

### Key Value Propositions
- Single source of truth for bookings, fleet readiness, and documents with Kommo + Zoho automation.
- AI-augmented workspace suggesting best-fit vehicles, risk flags, and summarised timelines.
- Mobile-first driver workflow capturing odometer/fuel/media data tied to SLA timers.
- Real-time dashboards of utilisation, channel ROI, and profitability with drill-down to raw events.

### High-Level Success Metrics (KPIs)
- % bookings auto-imported; SLA compliance %; driver task completion time; AI recommendation adoption; Zoho sync latency; exec dashboard DAU; number of failed outbox items; document expiry alerts resolved within 24h.

### Scope Overview
- **MVP**: modules listed in Section 2 with Kommo intake, booking orchestration, fleet calendar, sales workspace, driver app, analytics hub, and Zoho outbox. Includes AI copilots scoped to lead insights and predictive SLA nudges.
- **Phase 2**: payments, customer portal, additional CRM connectors (HubSpot/Salesforce), marketplace APIs.
- **Assumptions**: Supabase project hosts Postgres, Auth, Storage, Realtime; Vercel hosts Next.js frontend; Kommo + Zoho credentials available; Canadian English copy; no legacy hash routing.

## 2. Product Scope, Features & Modules
### Features List
| Feature | Module | Tags | Priority | Success Metrics | Primary Persona | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Kommo webhook intake & validation | M1 Kommo Intake & Client Auto-Provisioning | [B][I][A] | P1 | ≥95% bookings auto-created, webhook error rate <1% | Integration Engineer | Next.js API route, Kommo API |
| Booking lifecycle board & document orchestration | M2 Booking Lifecycle & Document Orchestration | [B][A] | P1 | SLA breach rate <5%, doc completion ≤2h | Fleet Manager | M1, Supabase tables |
| Fleet calendar & maintenance automation | M3 Fleet Calendar & Maintenance Automation | [B][A][AI] | P1 | Maintenance conflicts auto-resolved within 15m; predictive alerts accuracy 80% | Fleet Manager | Vehicle telemetry, analytics views |
| Sales workspace with AI lead intelligence | M4 Sales Workspace & AI Lead Intelligence | [B][AI] | P1 | Lead cycle time −30%, AI suggestion adoption ≥60% | Sales Manager | M1 data, AI services |
| Driver mobile tasks & SLA capture | M5 Driver Task & Mobile Execution | [B][A] | P1 | Driver compliance 95%, photo/odometer completeness 100% | Driver | Task metadata, mobile shell |
| Analytics & insight hub | M6 Analytics & Insight Hub | [B][AI] | P1 | Dashboard freshness <5 min, anomaly detection precision ≥85% | CEO | Materialized views |
| Integrations outbox & Zoho sales order sync | M7 Integrations Outbox & Zoho Sync | [I][A] | P1 | Zoho sync success ≥99%, failed retries resolved <30m | Integration Engineer | M1, Zoho API |

### User Personas
- **Fleet Manager (Operations Hero)**: Manages fleet utilisation, tasks, compliance. Gains automation via SLA timers, predictive maintenance, document reminders.
- **Sales Manager (Revenue Driver)**: Owns leads, documents, upsells. Gains AI summaries, Kommo auto-ingest, Zoho automation.
- **CEO / Exec**: Consumes dashboards, KPI alerts, risk insights. Gains real-time analytics snapshots.
- **Driver**: Executes deliveries/pickups. Gains guided checklists, offline-first task capture.
- **Integration Engineer**: Maintains webhooks/outbox. Gains observability, retries, secrets rotation.

### Out of Scope
- Customer-facing portal, payment processing, partner marketplace APIs, dynamic pricing algorithms, advanced telematics ingestion beyond manual inputs.

### Traceability Matrix
| Goal | Supporting Modules | KPI Link |
| --- | --- | --- |
| G1 Kommo intake | M1, M7 | Auto-import %, Zoho sync success |
| G2 SLA uplift | M2, M3, M5 | SLA compliance %, driver completion time |
| G3 Revenue intelligence | M6 | Dashboard freshness, exec DAU |
| G4 AI sales | M4, M6 | Lead cycle time, AI adoption |
| G5 Integration resilience | M1, M7 | Outbox failure count, Zoho latency |

## 3. Module Specifications
### M1. Kommo Intake & Client Auto-Provisioning
1. **Business Goal/Value**: Eliminate manual booking entry by ingesting Kommo events and normalising clients/leads/bookings.
2. **Detailed Description**: Next.js App Router endpoint `/api/integrations/kommo/webhook` verifies HMAC, maps Kommo payloads to internal schema (`clients`, `bookings`, `sales_leads`), creates/updates invoices, marks booking source metadata, then enqueues Zoho tasks in `integrations_outbox`.
3. **User Stories**: 
   - *As an integration engineer, when Kommo emits `add_lead`, the system must create or update the booking without duplicates based on `source_payload_id`.*
   - *As a sales manager, I want outages flagged so I know when manual booking creation is allowed.*
4. **Acceptance Criteria**: 200 response to Kommo within 2s; dedup by `source_payload_id`; failed validations logged with trace ID; manual override toggled via feature flag.
5. **Technical Constraints/Notes**: Built on Next.js App Router (Vercel) referencing the shared server utilities and Supabase service client; Edge Function remains only as a proxy fallback until Kommo is reconfigured. Max payload 1 MB; log errors via Next.js logging / Sentry; Supabase logs cover fallback proxy invocations.
6. **Dependencies**: Kommo webhook API (/websites/developers_kommo... for webhooks), Supabase Postgres tables, `integrations_outbox`.
7. **Priority**: P1.
8. **UX Flow**: N/A (backend). Ops console surfaces ingestion status in M6 dashboard.
9. **AI/Automation Usage**: Automation only; future AI validation optional.
10. **Integration Matrix Row**:
| Module | External System | Integration Type | Data Flow | Frequency/Event | Auth | Error Handling |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Kommo CRM | Webhook + REST | Kommo → Next.js API route → Postgres | Event-driven (`add_lead`, `status_lead`) | HMAC + OAuth token | Retry on Kommo side; idempotent inserts; alert on >3 consecutive failures |
11. **Non-Functional**: Availability 99.9%; requests processed <1s avg; secrets stored in Supabase config.

### M2. Booking Lifecycle & Document Orchestration
1. **Business Goal**: Manage statuses, SLAs, documents from creation through settlement.
2. **Description**: Replace Kanban prototype with App Router views for bookings, detail panels, document upload, SLA timers, and checklist enforcement mapped to `bookings`, `booking_timeline_events`, `documents`, `document_links`.
3. **User Stories**: 
   - Ops moves booking across stages only if required documents uploaded.
   - Finance views invoices and outstanding amounts per booking.
4. **Acceptance Criteria**: Transition validations enforce allowed states; SLA countdown visible; document upload to Supabase Storage completes <10s; audit trail recorded.
5. **Technical Constraints**: Next.js App Router nested layouts with streaming data fetch (per /vercel/next.js). Document metadata stored per schema; use Supabase Storage signed URLs.
6. **Dependencies**: M1 data, Supabase Storage, Document viewer route `/documents/[id]`.
7. **Priority**: P1.
8. **UX Flow**: 1) User opens `/bookings` board → 2) Click card to open detail drawer `/bookings/[bookingId]` → 3) Upload docs → 4) Move stage; SLA recalculates.
9. **AI/Automation Usage**: SLA breach predictor uses analytics view to warn if stage > threshold; automation triggers tasks.
10. **Integration Matrix**: N/A (internal).
11. **Non-Functional**: Guard rails for RLS; realtime updates via Supabase Realtime; doc storage encrypted at rest.

### M3. Fleet Calendar & Maintenance Automation
1. **Business Goal**: Visualise fleet availability, maintenance, and predictive conflicts.
2. **Description**: Calendar view (week/month) fed by `calendar_events`, `vehicles`, `maintenance_jobs`, with filters and multi-layer toggles. Automation auto-creates maintenance tasks when reminders near due.
3. **User Stories**: 
   - Fleet manager filters by vehicle class and sees overlaps.
   - System auto-creates maintenance event when `mileage_to_service` < threshold.
4. **Acceptance Criteria**: Calendar load <2s for 30-day window; auto task creation occurs within 5 min of reminder trigger; conflict resolution suggestions logged.
5. **Technical Constraints**: Use Next.js dynamic routes; time-zone set to Dubai; caching per App Router guidelines (server components). Predictive suggestions use analytics view `analytics_vehicle_utilization_daily`.
6. **Dependencies**: `vehicles`, `vehicle_reminders`, `tasks`, `analytics_vehicle_utilization_daily`.
7. **Priority**: P1.
8. **UX Flow**: 1) `/fleet-calendar` loads → 2) User toggles layers → 3) Click event to open drawer `/calendar/events/[eventId]` → 4) Accept automation suggestion (create maintenance task) → 5) Task assigned to driver.
9. **AI/Automation**: Gradient boosted model (hosted service) predicts service need probability; displays AI confidence chip; autop-creates tasks when >85%.
10. **Integration Matrix**: optional telematics later (out of scope).
11. **Non-Functional**: Data refreshed every minute; handle 50 concurrent viewers.

### M4. Sales Workspace & AI Lead Intelligence
1. **Business Goal**: Equip sales with a cockpit integrating docs, payments, conflicts, and AI recommendations.
2. **Description**: Lead workspace view showing request, documents, financials, vehicle matches, conflicts, pricing, tasks, offers, playbook, analytics per `salesWorkspace` data mapping to tables (`sales_leads`, `sales_lead_*`). AI summarises timeline and suggests next actions.
3. **User Stories**: 
   - Sales sees AI summary “Client needs decorated car; ensure deposit pre-auth by 24 Sep.”
   - AI recommends top 3 vehicles ranked by fit score and predicted margin.
4. **Acceptance Criteria**: AI response <3s; manual override possible; suggestions logged. Stage change updates pipeline metrics.
5. **Technical Constraints**: Next.js server actions calling LLM (OpenAI/Azure). Prompt uses lead data; store responses with feedback rating. Use shadcn/ui components for detail cards (per /shadcn-ui/ui) and Tailwind utilities (/tailwindlabs/tailwindcss.com) for responsive layouts.
6. **Dependencies**: M1 data, analytics views, AI provider.
7. **Priority**: P1.
8. **UX Flow**: 1) `/sales/leads/[leadId]` loads → 2) AI summary renders in panel → 3) User accepts recommended task template → 4) Document checklist updates → 5) Stage changed to `won` triggers Zoho sync.
9. **AI/Automation**: LLM prompt: “Summarise lead timeline, highlight blockers, propose next action referencing SLA and outstanding payments.” Evaluate accuracy weekly; incorporate thumbs-up/down feedback loop.
10. **Integration Matrix**: interacts indirectly with Zoho via M7.
11. **Non-Functional**: Cache AI responses per lead for 10 min; redact PII before sending to model.

### M5. Driver Task & Mobile Execution
1. **Business Goal**: Provide guided mobile workflow for drivers capturing mandatory evidence.
2. **Description**: `/driver/tasks` list + `/driver/tasks/[taskId]` detail with checklist, timers, forms for odometer/fuel/photos, payment capture. Works offline-first with local storage; syncs via Supabase when online.
3. **User Stories**:
   - Driver uploads before/after photos; cannot mark complete until odometer + doc verification done.
   - Driver records collected cash; finance notified.
4. **Acceptance Criteria**: Offline mode caches tasks up to 12h; SLA timer visible; media upload compresses <2MB per photo; completion event updates booking timeline.
5. **Technical Constraints**: Next.js App Router with mobile layout; use PWA features; Supabase Storage for media; tailwindcss animate for micro-interactions.
6. **Dependencies**: `tasks`, `task_checklist_items`, `task_required_inputs`, `driver_profiles`.
7. **Priority**: P1.
8. **UX Flow**: 1) Driver logs in → 2) Views tasks sorted by deadline → 3) Opens task detail, toggles checklist → 4) Records odometer/fuel/photos → 5) Completes task; pushes event to operations board.
9. **AI/Automation**: Optional AI image check (future), but automation auto-validates required fields and pings ops if missing.
10. **Integration Matrix**: none external.
11. **Non-Functional**: Must operate on low-bandwidth networks; enforce device pinning; geolocation optional per privacy policy.

### M6. Analytics & Insight Hub
1. **Business Goal**: Provide exec-ready dashboards and anomaly detection across bookings, fleet, tasks, revenue.
2. **Description**: Dashboard includes KPI cards, revenue/utilisation charts, driver performance, channel mix, retention, AR ageing, documents at risk. Feeds from materialized views listed in Section 2 (kpi_snapshots, analytics_revenue_daily, etc.).
3. **User Stories**:
   - CEO sees drop in SLA compliance and drills into offending bookings.
   - Finance views AR buckets and exports CSV.
4. **Acceptance Criteria**: Dashboard load <3s; data freshness <5 min; anomalies flagged with severity; exports delivered via email.
5. **Technical Constraints**: Server components streaming; caching per Next.js guidelines; Supabase views refreshed via cron. Use chart components (e.g., Chart.js) already in prototype.
6. **Dependencies**: Materialized views, tasks/bookings tables, AI service for anomaly detection.
7. **Priority**: P1.
8. **UX Flow**: 1) `/exec/dashboard` loads KPIs → 2) Click KPI to open `/analytics?metric=fleetUtilization` → 3) Filter by date/channel → 4) Export or schedule report.
9. **AI/Automation**: Unsupervised anomaly model monitors KPIs; sends Slack alerts when z-score >2.5. AI narrative summary generated daily.
10. **Integration Matrix**: Optional Slack webhook for alerts.
11. **Non-Functional**: Role-based data access; GDPR-compliant masking for client data; audit log of exports.

### M7. Integrations Outbox & Zoho Sales Order Sync
1. **Business Goal**: Guarantee downstream sync to Zoho Contacts/Sales Orders with retries and observability.
2. **Description**: `integrations_outbox` table stores pending tasks; Edge Function `process-outbox` (see Supabase function stub) polls, locks rows, calls Zoho API to upsert contacts and create sales orders, updates booking/client external IDs and statuses.
3. **User Stories**: 
   - Integration engineer monitors queue and replays failed jobs.
   - Finance needs assurance that each booking has Zoho sales order ID before invoicing.
4. **Acceptance Criteria**: Worker runs every minute; each job processed within 5 min; failure alerts triggered after 3 retries; admin UI shows queue state.
5. **Technical Constraints**: Use Supabase Edge Function referencing `process_outbox_batch`; Zoho API per developer docs for conversions (Reference Docs). Store OAuth tokens securely; abide by Zoho rate limits.
6. **Dependencies**: M1 data, Zoho CRM API, Supabase scheduler.
7. **Priority**: P1.
8. **UX Flow**: 1) Booking created → 2) Outbox row inserted → 3) Worker picks row, calls Zoho → 4) Updates booking/client metadata → 5) Dashboard shows status.
9. **AI/Automation**: Automation only; future AI to predict failure risk.
10. **Integration Matrix Row**:
| Module | External System | Integration Type | Data Flow | Frequency/Event | Auth | Error Handling |
| --- | --- | --- | --- | --- | --- | --- |
| M7 | Zoho CRM | REST API | ERP → Zoho Contacts/Sales Orders | Scheduled (every min) | OAuth 2.0 | Exponential backoff, manual replay, alert on failure |
11. **Non-Functional**: Idempotent job execution; encrypted secret storage; compliance with Zoho terms.

## 4. Sitemap & Interaction Flows
### App Directory (Next.js App Router)
```
app/
├─ layout.tsx (global providers, shadcn shell)
├─ page.tsx (role-aware redirect)
├─ login/page.tsx
├─ operations/
│  ├─ layout.tsx
│  ├─ fleet-calendar/page.tsx
│  ├─ fleet/[vehicleId]/page.tsx
│  └─ bookings/[bookingId]/page.tsx
├─ sales/
│  ├─ layout.tsx
│  ├─ bookings/page.tsx
│  ├─ bookings/[bookingId]/page.tsx
│  ├─ leads/page.tsx
│  └─ leads/[leadId]/page.tsx
├─ exec/
│  ├─ dashboard/page.tsx
│  └─ analytics/page.tsx
├─ driver/
│  ├─ tasks/page.tsx
│  └─ tasks/[taskId]/page.tsx
├─ documents/[documentId]/page.tsx
├─ calendar/events/[eventId]/page.tsx
└─ api (Next.js route handlers for server actions)
```
AI components flagged: sales lead AI panel, analytics narrative cards.

### Backend API Routes (Supabase Edge + Next.js Route Handlers)
| Route | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/integrations/kommo/webhook` | POST | Kommo HMAC | Intake webhook → Postgres |
| `/functions/v1/process-outbox` | POST | Scheduler | Processes Zoho sync jobs |
| `/api/v1/bookings` | GET/POST/PATCH | Supabase Auth (JWT) | Booking list/create/update |
| `/api/v1/tasks` | GET/POST/PATCH | Role-scoped | Task board + driver updates |
| `/api/v1/analytics/kpis` | GET | Exec roles | KPI snapshot JSON |
| `/api/v1/documents` | GET/POST | Role-scoped | Signed URL mgmt |
| `/api/v1/leads/{id}/ai-summary` | POST | Sales | Calls AI service |

### Navigation & Automation Triggers
- Role switcher stores preference in Supabase `staff_accounts.default_route`.
- Automation triggers: booking stage change → SLA timer update; document expiry → notification; analytics anomaly → Slack webhook.

## 5. User Experience & Design Requirements
- **Design Philosophy**: automation-first, AI-assisted decisions, low cognitive load. Layouts use shadcn/ui building blocks with Tailwind tokens for consistent spacing/colour (Ref: /shadcn-ui/ui, /tailwindlabs/tailwindcss.com).
- **Visual Identity**: adopt Linear-inspired palette (midnight, slate, accent indigo) with a light-only theme via Tailwind tokens; typography Inter/Geist.
- **Layout & Navigation**: Desktop split panes for boards/detail drawers; mobile-first driver screens; persistent sidebar for ops & sales.
- **Core UI Components**: KPI cards, Kanban columns, calendar grid, AI insight panel, document checklist, media gallery, task forms.
- **Micro-Interactions**: tailwindcss-animate for hover/focus; Framer Motion for drawer transitions; AI panel displays typing indicator.
- **Accessibility & Localization**: WCAG 2.1 AA, keyboard navigation for boards, text alternatives for media, locale toggle (en/ar/ru) in roadmap.

## 6. Technical Specifications
### System Architecture Overview
- **Frontend**: Next.js App Router (React Server Components) with Tailwind + shadcn components for modular UI (Ref: /vercel/next.js, /tailwindlabs/tailwindcss.com, /shadcn-ui/ui).
- **Backend**: Supabase Postgres, Auth, Storage, Edge Functions. Supabase Realtime for UI updates (Ref: /supabase/supabase).
- **Integrations**: Kommo webhooks hit the Next.js API route (`/api/integrations/kommo/webhook`); Zoho CRM REST API consumes outbox.
- **AI Services**: LLM provider via server actions; anomaly detection job in Supabase cron.

### Runtime Stack
- Next.js 15 App Router + React 19.
- Tailwind CSS + shadcn/ui + Radix primitives.
- Supabase JS client for data access; Supabase Edge Functions for integrations.
- Chart.js for analytics visualisations.

### Data Model & Storage
- Entities per `docs/schemas/database-schema.md`: `clients` (with Kommo/Zoho IDs), `bookings` (source metadata, SLA, Zoho), `vehicles`, `tasks`, `sales_leads`, `documents`, `integrations_outbox`, analytics views. Storage retention: documents 7 years; logs 13 months.

### Auth & Security
- Supabase Auth (email magic link + OTP). RBAC via policies per role. Audit tables log state changes. Encrypt secrets; apply HMAC verification for webhooks; enforce TLS.

### Integrations ([I])
| System | Purpose | Auth | Rate Limit Strategy | Retry |
| --- | --- | --- | --- | --- |
| Kommo CRM | Booking intake | HMAC + OAuth | Obey Kommo webhook throughput; respond <2s | Idempotent inserts; alert on 3 failures |
| Zoho CRM | Contacts + Sales Orders | OAuth 2.0 | Respect Zoho quotas (per docs) | Exponential backoff via outbox |
| Slack (optional) | Alerts | Webhook token | Limit <1 msg/s | Dead-letter queue |

### Automation ([A])
- Kommo webhook ingestion pipeline.
- SLA timers + reminders via server actions.
- Maintenance triggers based on `vehicle_reminders`.
- Outbox worker for Zoho.
- Document expiry alerts.

### AI ([AI])
- Lead copilot summarisation (LLM) with prompt template and feedback.
- Predictive maintenance risk scoring using utilisation view.
- Anomaly detection on KPIs with unsupervised model.
- Evaluate via precision/recall metrics; collect thumbs data.

### DevOps & CI/CD
- GitHub Actions: lint/test/build, Supabase migration checks, Edge Function deploy.
- Vercel preview deployments per PR; production gating via checklist.
- Observability: Supabase logs, Vercel analytics, custom dashboard for outbox metrics.

## 7. Delivery & Operations
### Implementation Roadmap
1. **Phase 0 (Week 0-1)**: finalize schema migrations, set up Supabase + Vercel envs.
2. **Phase 1 (Weeks 2-6)**: build Next.js shell, Kommo webhook, booking board, document handling.
3. **Phase 2 (Weeks 7-10)**: fleet calendar, tasks/driver mobile, analytics base views.
4. **Phase 3 (Weeks 11-14)**: AI lead copilot, anomaly alerts, Zoho outbox deployment.
5. **Phase 4 (Weeks 15-16)**: hardening, QA, compliance review, go-live.
Release gates: schema migration sign-off, integration dry-run, security review, user UAT.

### Resourcing & RACI
| Role | R | A | C | I |
| --- | --- | --- | --- | --- |
| Product Manager | | X | | |
| Engineering Lead | X | | X | |
| Backend Engineer | X | | | |
| Frontend Engineer | X | | | |
| Data/AI Engineer | X | | | |
| QA Lead | | | X | |
| Integration Engineer | X | | | |
| Exec Sponsor | | | | X |

### Testing Strategy
- Unit tests for React components and Supabase RPCs.
- Integration tests for webhooks/outbox using mock servers.
- E2E tests (Playwright) covering role flows.
- AI evaluation harness for suggestion accuracy.
- Load tests for booking board, calendar, analytics views.

### Risk Register
| Risk | Impact | Likelihood | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Kommo payload change | High | Medium | Schema validation + contract monitoring | Integration Eng |
| Zoho rate limits | Medium | Medium | Queue throttling, backoff | Integration Eng |
| AI hallucination | Medium | Medium | Confidence thresholds, human override | Data Eng |
| Mobile offline failures | High | Low | Local cache + sync retries | Frontend Eng |
| Data privacy breach | High | Low | RLS, encryption, audits | Security Lead |

### Compliance & Legal
- GDPR & UAE DP: consent logging, data minimisation, right-to-erasure workflows.
- Audit readiness: change logs, export logs, anomaly alerts stored 2 years.
- Contracts: Kommo & Zoho ToS compliance; encrypted secrets; DPA with AI vendor.

## 8. Appendices
### Glossary
- **SLA**: Service Level Agreement for deliveries/pickups.
- **Outbox Pattern**: Table-driven integration queue ensuring eventual consistency.
- **LLM**: Large Language Model powering AI summaries.
- **RLS**: Row Level Security policies in Postgres.

### Open Questions & Assumptions
1. Confirm AI provider (OpenAI vs Azure) and budget.
2. Define manual override flow for booking creation when Kommo down.
3. Need telemetry integration roadmap?
4. Confirm locales beyond English (Arabic, Russian) for MVP.

### Reference Docs (Context7)
| Library ID | Doc/Source | Relevance | Date Accessed |
| --- | --- | --- | --- |
| /vercel/next.js | Next.js App Router docs | Routing, data fetching, layouts | 9 Nov 2025 |
| /supabase/supabase | Supabase Edge Functions & platform docs | Backend services, Edge Functions | 9 Nov 2025 |
| /tailwindlabs/tailwindcss.com | Tailwind CSS design system | Utility classes, responsive design | 9 Nov 2025 |
| /shadcn-ui/ui | shadcn/ui components | UI architecture & components | 9 Nov 2025 |
| /websites/developers_kommo_com-docs-kommo-for-developers | Kommo webhook API | Booking ingestion integration | 9 Nov 2025 |
| /websites/zoho_crm_developer_api_v8 | Zoho CRM API | Sales order sync, conversions | 9 Nov 2025 |

### Change Log
| Date | Author | Summary |
| --- | --- | --- |
| 2025-11-09 | TPM | Initial PRD baseline covering modules M1-M7, integrations, AI, automation. |
