import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Wordle Battle E2E tests.
 *
 * Run with:
 *   npx playwright test
 *   npx playwright test --headed  (watch mode)
 *   npx playwright test --ui      (UI mode)
 */
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:2567',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'cd server && npm start',
    url: 'http://localhost:2567/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
