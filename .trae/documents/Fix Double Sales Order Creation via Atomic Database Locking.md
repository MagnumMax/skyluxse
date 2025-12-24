# Analysis of Sales Order Duplication

## 1. Why the first webhook triggered (100 AED)
You asked if the first webhook (`98035992`) should have been skipped.
**Answer:** No, according to the current code, `98035992` (Sales Order sent) is explicitly configured as a trigger status in `lib/constants/bookings.ts`:

```typescript
export const KOMMO_STATUSES_FOR_SALES_ORDER: readonly KommoPipelineStageId[] = [
  "98035992", // Sales Order sent
] as const
```

This explains why the first order (likely a draft with placeholder price 100 AED) was created.

## 2. Why the second webhook triggered (7000 AED)
The second webhook had status `96150292` (Payment Pending).
Currently, `96150292` is **NOT** in the `KOMMO_STATUSES_FOR_SALES_ORDER` list.
If a second order was created with 7000 AED, it means either:
1.  There was a race condition where the first webhook processed "slowly" and picked up the updated price (7000) from Kommo before the second webhook arrived.
2.  Or the second webhook logic found an "Update" path that we need to investigate.

However, based on your logs showing two distinct messages, it's highly likely the first one created the "100 AED" order, and then something else (or a retry) created the second one.

## 3. Recommended Fix
To solve this "double creation" and "wrong price" issue, we should:

1.  **Remove `98035992` (Sales Order Sent)** from the trigger list. This status seems too early in your workflow (price might not be final).
2.  **Add `96150292` (Payment Pending)** and **`75440391` (Confirmed Bookings)** to the trigger list. These statuses imply the deal is finalized and price is set.
3.  **Add Locking**: Implement the atomic lock in `createSalesOrderForBooking` to prevent race conditions if statuses change rapidly.

### Proposed Changes
1.  **Modify `lib/constants/bookings.ts`**:
    - Remove `98035992`.
    - Add `96150292` and `75440391`.

2.  **Modify `app/actions/zoho.ts`**:
    - Implement `zoho_sync_status` locking (update-if-null pattern) to ensure strict serialization.

This will ensure the order is created only when the deal is truly ready (Payment Pending/Confirmed) and only once.