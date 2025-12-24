I have identified the cause of the duplicate notifications.

**The Problem:**
The system received two webhooks from Kommo in very quick succession (likely due to a status update followed immediately by another update, e.g., price change).
The current code in `app/actions/zoho.ts` checks if a sync is "in progress" by reading the database status, and *then* writing the new status. This creates a "race condition":
1.  **Request A** (3958 AED) reads status -> "Not started".
2.  **Request B** (4129 AED) reads status -> "Not started" (before A finishes writing).
3.  **Request A** writes "In Progress" and creates Sales Order 1.
4.  **Request B** writes "In Progress" and creates Sales Order 2.
5.  Both send a "Sales Order Created" notification.

**The Fix:**
I will implement an **atomic database lock** in `app/actions/zoho.ts`.
Instead of "Read then Write", I will use a single "Conditional Write" operation:
*"Update status to 'In Progress' ONLY IF it is currently 'None' or 'Failed'."*

If the second request tries to update, the database will report that 0 rows were updated (because the first request already locked it), and the second request will safely abort without creating a duplicate order.

**Planned Changes:**
*   Modify `app/actions/zoho.ts`: Update `createSalesOrderForBooking` to use a conditional `update` query that atomically checks and sets `zoho_sync_status`.

**Note on Amounts:**
The first request (3958 AED) will likely win the lock. The second request (4129 AED) will be blocked to prevent duplication. This means the Sales Order will be created with the first amount. The Booking in your database will still update to the correct final amount (4129 AED) because the webhook handler updates the booking before triggering the sales order logic. To sync the new amount to Zoho, a separate update trigger would be needed later (e.g., manual sync or another status change), but this ensures you don't get duplicate orders.