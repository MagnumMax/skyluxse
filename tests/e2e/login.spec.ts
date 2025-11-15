import nextPlaywright from "next/experimental/testmode/playwright.js"

import { registerSupabaseMocks } from "./utils/supabase-mock"
import { createDriverTaskRow } from "./utils/mock-data"

const { test, expect } = nextPlaywright

test.describe("Login flow", () => {
  test("shows validation error when email is empty", async ({ page, next }) => {
    registerSupabaseMocks(next)
    await page.goto("/login")

    const emailInput = page.getByLabel(/Email\/Phone/i)
    await emailInput.fill("")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page.getByRole("status")).toHaveText("Введите рабочий email")
  })

  test("redirects executive role to dashboard", async ({ page, next }) => {
    registerSupabaseMocks(next)
    await page.goto("/login")

    const roleTrigger = page.getByRole("combobox", { name: /role/i })
    await roleTrigger.click()
    await page.getByRole("option", { name: "Executive team" }).click()

    await Promise.all([
      page.waitForURL("**/exec/dashboard"),
      page.getByRole("button", { name: "Sign in" }).click(),
    ])

    await expect(page.getByText(/Command centre/i)).toBeVisible()
  })

  test("sales role can open bookings board", async ({ page, next }) => {
    registerSupabaseMocks(next)
    await page.goto("/login")

    const roleTrigger = page.getByRole("combobox", { name: /role/i })
    await roleTrigger.click()
    await page.getByRole("option", { name: "Sales manager" }).click()

    await Promise.all([
      page.waitForURL("**/fleet-calendar"),
      page.getByRole("button", { name: "Sign in" }).click(),
    ])

    await expect(page).toHaveURL(/\/fleet-calendar/)
    await page.getByRole("link", { name: "Bookings" }).click()
    await page.waitForURL("**/bookings")
    await expect(page.getByText(/Booking lifecycle board/i)).toBeVisible()
  })

  test("driver role sees assigned tasks", async ({ page, next }) => {
    registerSupabaseMocks(next, {
      tables: {
        tasks: [
          createDriverTaskRow({
            title: "Deliver DEF 123",
            status: "inprogress",
          }),
        ],
      },
    })

    await page.goto("/login")

    const roleTrigger = page.getByRole("combobox", { name: /role/i })
    await roleTrigger.click()
    await page.getByRole("option", { name: "Driver" }).click()

    await Promise.all([
      page.waitForURL("**/driver/tasks"),
      page.getByRole("button", { name: "Sign in" }).click(),
    ])

    await expect(page).toHaveURL(/\/driver\/tasks/)
    await expect(page.getByRole("radio", { name: "All" })).toBeVisible()
    await expect(page.getByText(/Deliver DEF 123/)).toBeVisible()
  })
})
