import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Tools Hub E2E tests.
 *
 * Run with:
 *   npx playwright test
 *   npx playwright test --headed  (watch mode)
 *   npx playwright test --ui      (UI mode)
 *
 * Override base URL:
 *   BASE_URL=https://epcvip.vip npx playwright test
 */

const baseURL = process.env.BASE_URL || 'http://localhost:2567';
const isLocalhost = baseURL.includes('localhost');

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Visual regression settings
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Allow minor anti-aliasing differences
    },
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

  webServer: isLocalhost ? {
    command: 'cd server && npm start',
    url: 'http://localhost:2567/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  } : undefined,
});
