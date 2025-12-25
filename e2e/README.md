# E2E Tests

This directory contains End-to-End tests using Playwright.

## Setup

1.  Ensure dependencies are installed:
    ```bash
    npm install
    ```
2.  Ensure `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Running Tests

To run the tests:

```bash
npx playwright test
```

To run with UI mode:

```bash
npx playwright test --ui
```

## Test Files

-   `e2e/tasks.spec.ts`: Covers the Task Creation flow (via API) and verification on the Driver Task Board and Booking Detail page.
-   `e2e/fixtures/supabase.ts`: Helper functions to create/cleanup test data in Supabase directly.

## Notes

-   Tests create real data in the database (Clients, Vehicles, Bookings, Users) and clean it up afterwards.
-   The tests use a programmatic login approach to bypass the UI login form for reliability.
