I have identified the cause of the slow loading times on the `/driver/tasks` page.

### Root Cause
The `getDriverTasks` function performs an extremely expensive "waterfall" of database queries. After fetching the tasks, it calls `getLiveBookingsByIds`, which triggers a cascade of separate requests to fetch:
1.  All full booking details
2.  All related clients
3.  All related vehicles
4.  All related invoices
5.  All related staff accounts
6.  All sales pipeline stages

This fetches megabytes of unnecessary data just to display a simple list of tasks.

### Proposed Solution
I will optimize the data fetching to retrieve exactly what is needed in a single database query.

1.  **Modify `lib/data/tasks.ts`**:
    *   Update `fetchTaskRows` to directly join the `bookings` and `vehicles` tables.
    *   Select only the specific fields required for the UI (booking code, amounts, vehicle name, plate number).
    *   Update the `TaskRow` type definition to include these joined fields.

2.  **Refactor `getDriverTasks`**:
    *   Remove the heavy `getLiveBookingsByIds` call entirely.
    *   Use the joined data from `fetchTaskRows` to populate the `Task` objects.
    *   Calculate `outstandingAmount` directly from the booking fields (`total_amount - paid`).

3.  **Refactor `toBaseTask`**:
    *   Update the mapping logic to use the pre-fetched data instead of relying on external maps.

This change will reduce the number of database queries from ~6+ heavy ones to just 1 optimized query, resulting in near-instant page loads.