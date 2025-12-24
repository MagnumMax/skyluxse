I agree, `GET /api/cars` is more consistent with REST conventions and aligns better with the other endpoints (`/api/cars/{id}`).

Here is the updated plan:

### 1. Database Schema Updates
*   **Action**: Create a migration to add a `rental_prices` column (JSONB) to the `vehicles` table.
    *   This will store the pricing configuration: `{ daily: number, weekly: number, monthly: number, minimumDays: number }`

### 2. API Implementation
I will create the following Route Handlers:

#### A. **GET /api/cars** (`app/api/cars/route.ts`)
*   *Replaces `/api/fleet` from the original TЗ.*
*   **Functionality**: Returns a list of vehicles with filters (`car`, `model`, `year`, `seats`, `price`, `type`).
*   **Default**: Returns top 10 popular available cars (using `utilization_pct` for popularity).

#### B. **GET /api/cars/[id]** (`app/api/cars/[id]/route.ts`)
*   **Functionality**: Returns detailed specs, pricing, and availability for a specific vehicle.

#### C. **GET /api/cars/available** (`app/api/cars/available/route.ts`)
*   **Functionality**: Returns cars available for a specific date range (`date_from`, `date_to`).
*   **Logic**: filters out vehicles that have bookings overlapping with the requested period.

### 3. Execution Steps
1.  Create and apply the database migration.
2.  Implement the API routes.
3.  Verify the endpoints with test requests.

**Shall I proceed with this structure?**