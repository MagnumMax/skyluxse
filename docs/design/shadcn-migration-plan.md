# Shadcn UI Migration Plan (2025-11-13)

## Context
- The Next.js app already ships 15 shadcn primitives under `components/ui`, but only ~71% (30/42) of higher-level components rely on them; 12 bespoke components still render raw HTML/CSS.
- Just 8 out of 35 route files in `app/` import `@/components/ui/*`, so most page shells inherit hand-written markup (`DashboardPageShell`, `DriverPageShell`) instead of consistent primitives.
- `app/globals.css` defines a large `@layer components` block (`.fleet-calendar-*`, filter controls, badges) that duplicates shadcn styles and complicates Tailwind 4 tree-shaking.
- `components.json` is already configured with HTTPS schema and aliases per shadcn guidance, and `pnpm shadcn` is available for generating additional primitives.
- The `beta/` SPA is explicitly out of scope for this migration per product direction.

## Goals
1. Standardise all interactive UI across the Next.js app on shadcn/ui primitives for consistent styling, accessibility, and theming.
2. Eliminate bespoke UI wrappers (`DashboardPageShell`, legacy filters, calendar controls) by either replacing them with shadcn components or rebuilding them on top of primitives.
3. Reduce custom global CSS to only tokens/layout rules, enabling Tailwind 4 + shadcn to manage component-level styling.
4. Keep the migration incremental (“small, safe steps”), ensuring each refactor ships with updated docs/tests and never touches the `beta/` directory.

## Tooling Prerequisites
- Preferred command surface: `pnpm dlx shadcn@latest <command>`, which ensures the latest CLI without keeping it in dependencies; answer `n` when prompted to overwrite customised components or pass `--overwrite` explicitly when needed.
- Registry hygiene: only add registries over HTTPS (per shadcn guidance) and pass auth tokens via `REGISTRY_TOKEN=... pnpm dlx shadcn@latest add <component>` when targeting private registries; rotate tokens every 30 days and store secrets outside git.
- CSS ordering for any registry item JSON: place all `@import` statements first, then `@plugin`, then component-specific CSS blocks so Tailwind 4 parses directives deterministically.
- Component backlog to install before major refactors: `tabs`, `toggle-group`, `table`, `tooltip`, `popover`, `accordion`, `textarea`, `form`, `calendar`, `avatar`, `progress`, `sonner`. Run `pnpm dlx shadcn@latest add <name>` for each and commit the generated files immediately to avoid drift.
- Validate new primitives by importing them inside a throwaway route (e.g., `/sandbox/shadcn`) and running `pnpm dev` to confirm Radix peer deps are satisfied before using them in production screens.

## Non-Goals
- Rewriting or deleting the `beta/` SPA.
- Introducing alternative component libraries (MUI, Chakra, etc.).
- Changing Supabase data flows; this effort is purely UI.

## Inventory Snapshot
| Area | Files | Already Using shadcn | Notes |
| --- | --- | --- | --- |
| `components/` (excluding `ui`) | 42 | 30 | Missing: `web-vitals`, `audit-metadata`, `fleet-calendar`, `dashboard-page-shell`, `app-surface-placeholder`, `driver-*`, `parameter-list`, `sales-client-ai-panel`, `icons`. |
| `app/` routes/layouts | 35 | 8 | Core dashboard layout, driver pages, booking/analytics routes still rely on bespoke wrappers. |
| Global styles | `app/globals.css` | n/a | Contains ~200 lines of component-specific CSS that should collapse once calendar/filters move to shadcn primitives. |

## Workstreams & Backlog
1. **Tooling & Registry Hygiene**
   - [x] Document shadcn CLI usage (`pnpm dlx shadcn@latest add …`), including HTTPS-only registries and token rotation (per shadcn best practice for authenticated registries).
   - [x] Configure additional primitives: `tabs`, `toggle-group`, `table`, `tooltip`, `popover`, `accordion`, `textarea`, `form`, `calendar`, `avatar`, `progress`, `sonner`.
   - [x] Confirm Tailwind plugin order (imports → plugins → utilities) in any future `components.json` registry items.

2. **Layout & Shell Refactors**
   - [ ] Replace `DashboardPageShell` + header markup with shadcn equivalents (e.g., `Section`, `Card`, `Separator`, `Breadcrumb`).
   - [ ] Rebuild `DriverPageShell`/`DriverPage` components using shadcn `Card`, `Badge`, `ToggleGroup`, `Button` to standardise driver experience.
   - [ ] Update `app/(dashboard)/layout.tsx` sidebar/nav to use shadcn `Sidebar`, `NavigationMenu`, and `DropdownMenu` patterns (keeps existing `ProfileMenu` but aligns styling).

3. **Component Refactors (High Priority)**
   - [ ] `DriverTaskList` & `DriverTaskDetail`: swap manual buttons/badges/checklists for shadcn `ToggleGroup`, `Badge`, `Checkbox`, `Card`.
   - [ ] `FleetCalendar`: decompose into toolbar (Tabs + ToggleGroup), grid (Table + ScrollArea), and events (Popover + Badge), deleting `.fleet-calendar-*` CSS once complete.
   - [ ] `ParameterList` & `AuditMetadata`: rebuild on top of a shared shadcn-based description list + pills; remove ad-hoc uppercase styling.
   - [ ] `SalesClientAiPanel`, `AppSurfacePlaceholder`: convert to shadcn `Card`, `Alert`, or `Callout` patterns.

4. **Global Styles Cleanup**
   - [ ] After each component refactor, prune corresponding selectors from `app/globals.css`, keeping only tokens and critical layout helpers.
   - [ ] Validate visuals in the light theme (no alternative theme modes).

5. **Verification & Documentation**
   - [ ] Update `docs/ui-gaps.md` (or add a new entry) after each refactor to track remaining bespoke UI.
   - [ ] Run `pnpm lint && pnpm test && pnpm typecheck` before merging each milestone.
   - [ ] Capture before/after screenshots for major dashboards per PR checklist.

## Sequencing & Milestones
1. **Milestone A – Tooling Ready (1 day)**
   - Install missing primitives, update docs on shadcn CLI usage.
   - Baseline visual regression screenshots for key dashboards.
2. **Milestone B – Layout Foundations (2–3 days)**
   - Rebuild dashboard/driver shells on shadcn components.
   - Ensure at least 50% of `app/` routes now indirectly use shadcn primitives.
3. **Milestone C – Feature Components (3+ days)**
   - Complete Driver UI, Fleet Calendar, Parameter/Audit widgets.
   - Remove obsolete CSS from `app/globals.css`.
4. **Milestone D – Polish & Verification (ongoing)**
   - Accessibility sweep (focus states, keyboard flows).
   - Update documentation/screenshots, close remaining tasks in this plan.

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Large PRs touching many screens | Hard to review/regress | Ship per component/workstream, keep branches short. |
| Tailwind 4 regression after CSS cleanup | Broken styles | Use Storybook-style manual checks or happy-path scripts after each batch. |
| Missing primitive coverage (e.g., for calendar) | Blocks refactor | Install Radix-compatible primitives first (“Tooling & Registry Hygiene” stream). |
| Divergent locales/Canadian English copy | UI inconsistency | Centralise copy updates while refactoring components. |

## Next Actions
1. Land this plan (design-first requirement satisfied).
2. Execute “Tooling & Registry Hygiene” tasks: document CLI usage, add needed primitives via `pnpm dlx shadcn@latest add`.
3. Begin Milestone B with `DashboardPageShell` rewrite, ensuring affected pages gain shadcn primitives automatically.

## Implementation Checkpoints
1. **Dashboard Shell Refresh**
   - Deliverables: new shadcn-based page header, shell wrapper, and breadcrumb utilities; update `app/(dashboard)` pages to the new shell; snapshot comparison for `/bookings` and `/clients`.
   - Acceptance: zero visual regressions in the light theme; lint/test/typecheck all green.
2. **Driver Experience Upgrade**
   - Deliverables: `DriverPageShell`, `DriverTaskList`, `DriverTaskDetail` rebuilt on `Card`, `ToggleGroup`, `Badge`, `Checkbox`; add story or screenshot for `/driver/tasks`.
   - Acceptance: keyboard navigation for filter toggles and checklist items; no custom CSS in these components.
3. **Fleet Calendar Modernisation**
   - Deliverables: toolbar components (`Tabs`, `ToggleGroup`), scrollable grid using `Table` + `ScrollArea`, event interactions via `Tooltip`/`Popover`.
   - Acceptance: delete `.fleet-calendar-*` selectors from `app/globals.css`; confirm horizontal scroll works on trackpad and keyboard.
