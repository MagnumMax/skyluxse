# Booking Public Page (/booking/[id])

## Context
- Sales and operations already have `/bookings/[bookingId]` inside the dashboard shell.
- CX and exec teams need a lightweight “public” drill-down accessible from deep links (e.g., shared in chats, bookmarks, or notifications) without the dashboard chrome.
- Reuse the same live-data layer (`getLiveBookingById`, `getLiveClientById`, `getLiveDrivers`) to keep a single source of truth.

## Scope of this iteration
1. New App Router segment `app/booking/[id]` that renders the existing `OperationsBookingDetail` component, defaulting to the sales-friendly variant unless `?view=` overrides it (operations/exec).
2. Dedicated `generateMetadata` for better SEO/share cards (code + variant-specific prefix).
3. Loading/error boundaries local to the route (`loading.tsx`, `error.tsx`) with minimal UX outside the dashboard.
4. Graceful handling when booking/client/driver records are missing: render `notFound()` when the booking is absent, but continue rendering if the driver or client lookup fails.
5. Surface audit metadata (created/updated timestamps + actors) near the booking header so operators can instantly see who touched the record last.

## Non-goals
- No auth/state changes; this iteration trusts the same Supabase service role access already used by live data.
- No additional mutations or actions on the public page.
- No bespoke styling beyond what `OperationsBookingDetail` + root layout already provide.

## Data flow
```
/booking/[id]
  └─ page.tsx
      ├─ getLiveBookingById(params.id)
      ├─ Promise.all([getLiveClientById, getLiveDrivers])
      ├─ resolveVariant(searchParams.view)
      └─ <OperationsBookingDetail booking=... client=... driver=... variant=... />
```
- `dynamic = 'force-dynamic'` keeps the page uncached because live bookings and invoices change frequently.
- `revalidate = 0` implicitly via `force-dynamic`.

## UX states
- **Loading**: centred spinner with booking code placeholder.
- **Happy path**: identical content hierarchy as dashboard detail but inside the root landing layout (no sidebar/header).
- **Error**: friendly retry CTA (links back to `/` and has a retry button calling `useRouter().refresh`).
- **404**: Next.js `notFound()` → fallback `/404` UI.

## Audit trail metadata
- The hero block below the booking code renders two inline chips: `Created <date time> · by <actor>` and `Last updated <date time> · by <actor>`.
- `created_at`/`created_by` come straight from `bookings`; actor falls back to the booking owner when the column is `NULL`.
- `updated_at` mirrors the table column; `updated_by` is optional for now, so the UI shows an em dash when the actor is unknown.
- Formatting: `MMM d, yyyy · HH:mm` in Canadian English locale, so logs align with the rest of the dashboard timestamps.

## Open questions
- Later iterations may inject share tokens or client-safe subsets; for now we expose the same internal fields, assuming authenticated operators.
