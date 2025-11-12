# SkyLuxse ERP 2.0 Delivery TODO

Baseline inputs: `docs/PRD.md`, `docs/happy-paths.md`, `docs/schemas/database-schema.md`, and `docs/tech-specs/integrations.md`. All copy follows Canadian English.

## 1. Bootstrap & Tooling Foundations
- [x] Run the pre-install matrix to confirm latest LTS versions of Node.js, Next.js 15 App Router, Tailwind CSS 4, shadcn/ui CLI, and Supabase JS client before scaffolding or upgrading; document the matrix in `/docs/tech-specs/tooling.md` for future audits (Context7 `/tailwindlabs/tailwindcss.com`, `/vercel/next.js`).
- [x] Initialise or upgrade the Next.js App Router workspace with React Server Components, shared layouts, and Edge Runtime-ready route handlers per App Router migration guide (Context7 `/vercel/next.js`).
- [x] Install Tailwind CSS (with MDX + Next.js config alignment) and verify content paths cover `app`, `components`, and MDX sources as shown in Tailwind's Next.js configuration guidance (Context7 `/tailwindlabs/tailwindcss.com`).
- [x] Initialise shadcn/ui (`npx shadcn@latest init`) and add base primitives (Button, Card, Dialog, Sheet, Navigation Menu) plus ThemeProvider wiring in `app/layout.tsx` to support system-aware theming (Context7 `/shadcn-ui/ui`).
- [x] Configure absolute imports, ESLint/Prettier, Husky + lint-staged, and Storybook (or Chromatic) for component QA; ensure existing `/beta` SPA is referenced but not mutated.
- Pause & commit: `git commit -m "chore: bootstrap next app shell"` after lint/typecheck snapshots.

## 2. Supabase Infrastructure (Schema, Auth, Storage, RLS)
- [x] Translate `docs/schemas/database-schema.md` into incremental migrations under `/migrations`, starting with identity, bookings, vehicles, tasks, integrations_outbox, analytics, and AI feedback tables; record schema diffs in `/docs/schemas/CHANGELOG.md`.
- [x] Configure Supabase Auth (email magic link + OTP) and map roles (`operations`, `sales`, `ceo`, `driver`) to RLS policies per module access, ensuring `staff_accounts.default_route` persists navigation preferences (PRD §4, §6).
- [x] Set up Storage buckets (`documents`, `task-media`, `analytics-exports`) with signed URL policies and document retention of 7 years; enforce service-role uploads via Edge Functions following Supabase storage upload patterns (Context7 `/supabase/supabase`).
- [x] Implement Edge Function scaffolds `import-kommo` and `process-outbox` with environment variable handling, size checks, and logging, matching integration spec responsibilities while stubbing external calls for MVP (Context7 `/supabase/supabase`).
- [x] Add observability tables/log views for outbox retries, webhook events, and audit histories.
- Pause & commit: `git commit -m "feat: supabase schema-auth baseline"` after running migrations + tests.

## 3. MVP Integration Stubs (Feature-Flagged)
- [x] Create integration feature flags (`enableKommoLive`, `enableZohoLive`, `enableSlackAlerts`) stored in Supabase config tables; default to `false` for MVP to gate external calls.
- [x] Build Kommo webhook Edge Function stub that validates HMAC, logs payload, persists to staging tables, and short-circuits before external side effects when feature flag disabled (PRD §2 M1, §6 Integrations).
- [x] Implement Zoho outbox processor stub that enqueues payloads and simulates responses with deterministic mock data; ensure retries and exponential backoff logic run even when network calls are mocked (tech-spec integrations).
- [x] Provide placeholder adapters for AI copilots, telemetry feeds, and Slack alerts, all returning mocked responses while feature flags remain off.
- [x] Document stub swap strategy in `/docs/tech-specs/integrations.md` and add Playwright mocks for ingestion + outbox flows.
- Pause & commit: `git commit -m "feat: integration stubs with feature flags"` after integration tests.

## 4. App Router Migration of SPA Screens
- **Critical rule:** прежде чем заниматься улучшениями или рефакторингом, полностью воспроизводим существующий SPA-прототип в `/beta` (те же маршруты, UX и тексты). Любые отклонения допускаются только после подтверждённого паритета, а все артефакты фиксируются в `/docs/prd-foundations.md`.
- **UI primitives:** каждую перенесённую поверхность собираем на shadcn/ui-компонентах; если приходится временно отходить от праймитивов, записываем причину в `/docs/ui-gaps.md`.
- [x] Parity gate: route map + скринкасты `/beta` зафиксированы в `/docs/prd-foundations.md` (раздел «Parity log», обновлено 10 Nov 2025); новые поверхности не добавляем, пока не подтверждён паритет.
- [x] Inventory `/beta` SPA routes vs. App Router: таблица соответствий и описания групп `(operations|sales|exec|driver)` находятся в `/docs/prd-foundations.md` §1; layout-группы в `app/(dashboard)` и `app/(driver)` соответствуют им.
- [x] Apply shadcn/ui primitives: базовые Button/Card/Dialog/Sheet/NavMenu и остальные UI компоненты заведены, аудит и оставшиеся отступления задокументированы в `/docs/ui-gaps.md`.
- [x] Migrate booking lifecycle board (M2): `/bookings` (sales) и `/bookings?view=exec` используют серверные данные с `dynamic = "force-dynamic"`, drag-обвязка готова к включению; копия UX совпадает с `/beta`.
- [x] Port fleet calendar + maintenance automation (M3): `/fleet-calendar` (operations + sales) и `/exec/fleet-calendar` делят общий компонент `FleetCalendarBoard` с live-тогглами, формы `/maintenance/new` перенесены.
- [x] Rebuild sales workspace + AI intelligence (M4): страницы клиентов и booking detail содержат AI-панели/стриминг-плейсхолдеры, включаемые после parity gate (см. `/components/sales-client-workspace`).
- [x] Construct driver mobile shell (M5): группа `app/(driver)` + `viewport` метаданные повторяют мобильную оболочку `/beta#driver`.
- [x] Build analytics + insight hub (M6): `/analytics` и `/exec/analytics` портированы, suspense/skeletonы и Web Vitals (см. `components/web-vitals.tsx`) подключены через `app/layout.tsx`.
- [x] Stand up integrations outbox + Zoho management pages (M7) for integration engineers, ensuring control sets and flows match `/beta` before expanding scope. (Now powered by Supabase `kommo_import_runs` + `integrations_outbox`.)
- [x] Add combined integrations status page (Kommo full refresh runs + Zoho outbox health) so operators can trigger Kommo refreshes and monitor Zoho parity from one screen.
- [x] Extend Kommo status webhook coverage beyond "Confirmed bookings" (обработаны статусы `75440395`/`75440399`, пишем события в `booking_timeline_events`, UI отображает stage label в `/exec/integrations`).
- Pause & commit: `git commit -m "feat: migrate spa screens to app router"` only after visual regression, lint, and parity QA complete.

## 5. Business Logic & Automation
- [ ] Implement Kommo intake orchestration: timeline stamping, SLA timer updates, document checklist auto-generation per PRD §2 M1-M2.
- [ ] Build task automation engine covering SLA timers, driver notifications, and maintenance triggers; ensure timers write to analytics views.
- [ ] Configure AI copilots (lead insights, predictive maintenance, anomaly narratives) behind feature flags; capture thumbs feedback + evaluation metrics tables.
- [ ] Implement analytics snapshot jobs/materialized views (fleet utilisation, SLA, channel ROI) and nightly refresh workflow.
- [ ] Add automation triggers (document expiry notifications, Slack anomaly alerts) referencing Config tables.
- Pause & commit: `git commit -m "feat: business logic & automation layer"` after domain tests.

## 6. CI/CD & DevOps
- [ ] Align pipelines with GitHub Actions: lint, test, typecheck, Supabase migration verification, Edge Function deployment, Vercel preview creation.
- [ ] Add scripts to run targeted packages via `pnpm turbo run where <project>` for reproducible CI filtering (workspace tip).
- [ ] Configure Web Vitals + Lighthouse budgets in CI, referencing App Router instrumentation (Context7 `/vercel/next.js`).
- [ ] Automate Supabase Edge Function bundle-size checks (`deno info`) and storage policy tests (Context7 `/supabase/supabase`).
- [ ] Define environment secrets management + rotation procedure (Kommo, Zoho, AI, Slack) without committing plaintext secrets.
- Pause & commit: `git commit -m "chore: ci-cd hardening"` after green pipeline.

## 7. QA & Hardening
- [ ] Mirror happy-path scenarios (docs/happy-paths.md) via Playwright E2E (operations, sales, CEO, driver, integrations).
- [ ] Expand unit/integration tests for Edge Functions, RLS, AI scoring, and analytics jobs.
- [ ] Run accessibility audits (WCAG 2.1 AA) and localisation smoke tests (en, ar, ru) per PRD §5.
- [ ] Execute load tests for booking board, calendar, analytics queries; capture baselines.
- [ ] Review logs/metrics for failures, prune unused feature flags, ensure observability dashboards cover outbox + SLA breaches.
- Pause & commit: `git commit -m "test: qa hardening coverage"` after reports attached.

## 8. Go-Live Checklist
- [ ] Finalise schema + data backfills, confirm migrations applied in prod Supabase project.
- [ ] Complete integration dry-runs with Kommo + Zoho (flags on), ensuring ≥99% sync success and SLA alert coverage.
- [ ] Validate AI copilots meet accuracy targets or keep disabled with comms note.
- [ ] Confirm Vercel production deploy gating, rollback plan, and observability alerts.
- [ ] Capture operator runbooks (webhooks, outbox, AI) and attach to release ticket.
- Pause & commit: `git commit -m "chore: go-live readiness"` plus create release tag.

## 9. Post-MVP Full Integration Swap
- [ ] Turn on feature flags in staging, replace Kommo stub with live OAuth + webhook storage using production secrets; add canary monitoring before full rollout (PRD roadmap Phase 2).
- [ ] Replace Zoho stub with real HTTP client, implement exponential backoff, and wire `integrations_outbox` status dashboards to Ops command centre; document retry + manual requeue steps.
- [ ] Implement Slack + telemetry webhooks, payments roadmap hooks, and upcoming CRM connectors (HubSpot/Salesforce) as modular adapters.
- [ ] Expand AI services (maintenance scoring, anomaly alerts) with production providers and cost tracking; ensure ThemeProvider + UI components handle new surfaces (Context7 `/shadcn-ui/ui`).
- [ ] Update PRD/tech-specs with learnings, deprecate manual booking fallback workflows once Kommo uptime confirmed.
- Pause & commit: `git commit -m "feat: post-mvp integrations"` after integration SLA metrics verified.
