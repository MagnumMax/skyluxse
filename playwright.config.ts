import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60 * 1000, // Increased timeout for local testing
  use: {
    baseURL: 'http://localhost:6768',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'PORT=6768 KOMMO_BASE_URL=http://localhost:9999 npm run dev',
    url: 'http://localhost:6768',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: {
        KOMMO_BASE_URL: 'http://localhost:9999',
        KOMMO_ACCESS_TOKEN: 'mock-token',
        ZOHO_BOOKS_API_URL: 'http://localhost:9999/zoho',
        ZOHO_ORG_ID: 'test-org-123',
    }
  },
});
