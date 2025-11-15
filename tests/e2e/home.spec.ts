import nextPlaywright from "next/experimental/testmode/playwright.js"

const { test, expect } = nextPlaywright

test.describe("Landing page", () => {
  test("shows hero and primary navigation", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: /Automation-first operations hub/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /skyLuxse erp/i })).toHaveAttribute("href", "/")
    await expect(page.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login")
  })
})
