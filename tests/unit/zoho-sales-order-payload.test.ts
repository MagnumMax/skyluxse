import test from "node:test"
import assert from "node:assert/strict"

import { buildZohoSalesOrderCustomFields, resolveZohoSalespersonId } from "../../lib/zoho/sales-order-payload"

test("buildZohoSalesOrderCustomFields maps Drop Off to booking start date", () => {
  const customFields = buildZohoSalesOrderCustomFields({
    startDate: "2025-12-01T10:00:00Z",
    endDate: "2025-12-05T10:00:00Z",
    deliveryLocation: "DXB",
    pickupLocation: "AUH",
    mileageLimit: 250,
  })

  const pickUp = customFields.find((field) => field.customfield_id === "6183693000001829012")
  const dropOff = customFields.find((field) => field.customfield_id === "6183693000001829002")

  assert.equal(pickUp?.value, "2025-12-01")
  assert.equal(dropOff?.value, "2025-12-01")
})

test("resolveZohoSalespersonId resolves salesperson by owner name with fallback", () => {
  assert.equal(resolveZohoSalespersonId("Danil Ivanov"), "6183693000000293150")
  assert.equal(resolveZohoSalespersonId("Unknown Person"), "6183693000000293023")
  assert.equal(resolveZohoSalespersonId(undefined), "6183693000000293023")
})
