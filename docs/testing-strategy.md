# Testing Strategy

This document captures how we keep release confidence high before each deployment.

## Layers

| Layer | Tooling | Scope |
| --- | --- | --- |
| Unit | `node:test` via `tsx --test` | Pure functions, date helpers, domain entities |
| Component | Vitest + Testing Library + happy-dom | Client components, hooks, UI atoms |
| End-to-end | Playwright with Next.js test mode | Critical journeys such as landing page, dashboard navigation |

We start with fast unit checks, then render-driven component specs, and finish with browser flows.

## Unit Tests (`tests/unit`)

- Runner: `npm run test:unit` (`tsx --test --project tsconfig.json --import ./tests/setup.ts tests/unit`).
- Files live in `tests/unit/**` with `.test.ts` or `.test.mjs` extensions.
- `tests/setup.ts` locks the timezone to UTC and provides a web crypto polyfill so results are deterministic.
- Add new suites close to the domain being verified; e.g. `tests/unit/fleet/derive-booking-highlights.test.ts`.

## Component Tests (`tests/component`)

- Runner: `npm run test:component` (Vitest + happy-dom).
- Common utilities live in `tests/setup-dom.ts`. Import `@testing-library/jest-dom/vitest`, clear mocks, and configure timers.
- Write files as `tests/component/<feature>.test.tsx` or alongside components with the `.component.test.tsx` suffix.
- Prefer Testing Library queries (`getByRole`, `getByText`) and simulate user journeys via `@testing-library/user-event`.
- `vitest.config.ts` mirrors Next.js path aliases so imports like `@/components/ui/button` keep working.

## End-to-End (`tests/e2e`)

- Runner: `npm run test:e2e` (Playwright derived from `next/experimental/testmode/playwright`).
- `playwright.config.ts` boots the dev server automatically and reuses it locally.
- Tests sit under `tests/e2e/*.spec.ts` and import `test`/`expect` from `next/experimental/testmode/playwright` to unlock `next.onFetch`, MSW helpers, and loopback mocks.
- Install browsers once per machine with `npx playwright install` (CI caches them).
- Mock external APIs at the edge of the system, never the UI interactions.

## Deployment Gate (`npm run predeploy`)

Before shipping to production or triggering Vercel builds run:

```sh
npm run lint && npm run typecheck
npm run test:unit
npm run test:component
npm run test:e2e
```

The shortcut `npm run predeploy` encapsulates this sequence. CI should call `npm run check` (lint, types, unit+component) followed by `npm run test:e2e`.

## Adding New Coverage

1. Decide which layer matches the change (pure logic → unit, React wiring → component, user journeys → e2e).
2. Create or update fixtures under `tests/**/*` keeping names descriptive.
3. Extend Playwright specs when fixing or implementing a regression-prone user flow.
4. Update this document whenever we add a new layer, tool, or mandatory command.
