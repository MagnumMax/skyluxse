# Vehicle Spec Data Model Extension (2025-11-10)

## Context
- Operations shared a 30-vehicle inventory extract with the following headers: Car (brand), Model, VIN, Year, Exterior Colour, Interior Colour, Plate Number, Body Style, Seating, Engine Capacity (L), HPW, Cylinders, 0-100 km/h, Transmission.
- The current `public.vehicles` table in 0001 schema stores only `name`, `plate_number`, `status`, `class`, `segment`, and topline utilisation metrics, which is not enough to ingest or analyse the new data set.

## Best-Practice Alignment
- Continue using declarative SQL migrations tracked in git (`migrations/*.sql`) per Supabase guidance on declarative schemas. This keeps reviewable history and mirrors production.
- Prefer explicit data types over free-form JSON to keep analytics performant; add lightweight CHECK constraints for units that have natural bounds (year, seating, cylinders, acceleration).
- Keep nullable columns for optional metadata to avoid blocking imports while still allowing future validation.

## Field Mapping & Decisions
| Spreadsheet Column | New/Updated Column | Data Type | Notes |
| --- | --- | --- | --- |
| Car | `make` | `text` | OEM badge (Audi, BMW, etc.). |
| Model | `model` | `text` | Trim-friendly label (Q8, X6, etc.). |
| VIN | `vin` | `text unique` | Optional unique VIN constraint; allows multiple `NULL`s for unknown VINs. |
| Year | `model_year` | `smallint` with `CHECK (model_year between 1980 and 2100)` | Covers historic + near-future allocations. |
| Color | `exterior_color` | `text` | Free-text for marketing palettes (e.g., Mango Blue). |
| Interier Color | `interior_color` | `text` | Free-text; note intentional Canadian spelling elsewhere. |
| Plate Number | existing `plate_number` | `text` | Already present; no change. |
| Body column (SUV/Sedan/Convertible) | `body_style` | `text` | Aligns with marketing categories; keeps existing `class` free for pricing tiers if needed. |
| Seats | `seating_capacity` | `smallint` with `CHECK (seating_capacity between 1 and 20)` | Normalised to numeric count. |
| Engine capacity | `engine_displacement_l` | `numeric(4,2)` | Store litres with dot decimal; parser will strip comma. |
| HPW | `power_hp` | `smallint` with `CHECK (power_hp between 50 and 1200)` | Column label in sheet, treated as horsepower. |
| Cylinders | `cylinders` | `smallint` with `CHECK (cylinders between 2 and 16)` | Covers EV exception with `NULL`. |
| 0-100 Km/h | `zero_to_hundred_sec` | `numeric(4,2)` with `CHECK (> 0)` | Store seconds; decimal dot. |
| Transmisstoin | `transmission` | `text` | Free-form (Automatic, Dual-clutch, etc.). |
| Kommo select item ID | `kommo_vehicle_id` | `text unique` | Nullable external ID coming from Kommo dropdowns; enforces one-to-one sync when populated. |

## Implementation Steps
1. Create migration `0004_vehicle_specs.sql` adding the above columns to `public.vehicles`, setting sensible defaults to `NULL`, and updating `updated_at` trigger unaffected.
2. Extend the schema with `kommo_vehicle_id` (migration `0005_vehicle_kommo_id.sql`) so CRM imports can round-trip IDs without relying on fuzzy plate matches; enforce uniqueness to mirror Kommo's select options.
3. Apply the same SQL to the Supabase project via MCP once reviewed.
4. Update `docs/schemas/database-schema.md` and `docs/schemas/CHANGELOG.md` to document the new structure.
5. Prepare import tooling (next task) to map spreadsheet headers to the new columns, normalising commas in decimal fields, extracting numeric seat counts, and attaching Kommo IDs whenever provided.
