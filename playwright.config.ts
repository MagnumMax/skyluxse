import nextPlaywright from "next/experimental/testmode/playwright.js"

const { defineConfig } = nextPlaywright

const PORT = process.env.PORT ?? "3000"
const BASE_URL = `http://localhost:${PORT}`
const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? "http://supabase.local"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-key"

const config = defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: process.env.CI ? "retain-on-failure" : "off",
    video: process.env.CI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: `PORT=${PORT} NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL} SUPABASE_URL=${SUPABASE_URL} SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY} npm run dev`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
})

config.projects = [
  {
    name: "chromium",
    use: { browserName: "chromium" },
  },
]

export default config
