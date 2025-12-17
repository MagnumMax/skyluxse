import nextPlaywright from "next/experimental/testmode/playwright.js"

import { registerSupabaseMocks } from "./utils/supabase-mock"

const { test, expect } = nextPlaywright

test.describe("Fleet calendar sticky sidebar", () => {
  test("keeps vehicle column pinned while scrolling timeline", async ({ page, next }) => {
    await page.setViewportSize({ width: 980, height: 720 })
    registerSupabaseMocks(next, {
      tables: {
        vehicles: [
          {
            id: "vehicle-1",
            name: "Test Vehicle One",
            plate_number: "TST-001",
            status: "Available",
          },
        ],
        bookings: [],
        calendar_events_expanded: [],
        maintenance_jobs: [],
      },
    })

    await page.goto("/login")
    await page.getByRole("combobox", { name: /role/i }).click()
    await page.getByRole("option", { name: "Sales" }).click()

    await Promise.all([
      page.waitForURL("**/fleet-calendar"),
      page.getByRole("button", { name: "Sign in" }).click(),
    ])

    const vehicleLink = page.getByRole("link", { name: "Test Vehicle One" })
    await expect(vehicleLink).toBeVisible()

    await page.getByRole("button", { name: "Period presets" }).click()
    await page.getByRole("button", { name: "Next period" }).click()
    await page.getByRole("button", { name: "Next period" }).click()
    await page.getByRole("button", { name: "Next period" }).click()
    await page.keyboard.press("Escape")

    const scrollBody = page.locator(".fleet-calendar-scroll-body")
    await expect(scrollBody).toBeVisible()

    const before = await vehicleLink.boundingBox()
    expect(before).not.toBeNull()

    const scrollMetrics = await scrollBody.evaluate((element) => {
      const maxLeft = Math.max(600, element.scrollWidth - element.clientWidth - 1)
      element.scrollLeft = maxLeft
      return { left: element.scrollLeft, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }
    })
    expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth)
    expect(scrollMetrics.left).toBeGreaterThan(0)

    await page.waitForTimeout(50)

    const after = await vehicleLink.boundingBox()
    expect(after).not.toBeNull()

    // Sticky left column should not drift with horizontal scrolling.
    expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(2)
  })
})
