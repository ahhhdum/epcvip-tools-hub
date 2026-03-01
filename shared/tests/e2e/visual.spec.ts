/**
 * Visual regression screenshots.
 *
 * Captures baseline screenshots of all directive types.
 * Run with --update-snapshots to capture initial baselines:
 *   npx playwright test --config shared/tests/playwright.config.ts visual.spec.ts --update-snapshots
 *
 * Baselines stored in e2e/visual.spec.ts-snapshots/
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/test-harness.html');
  await page.waitForSelector('body[data-render-complete="true"]', { timeout: 10000 });
});

test.describe('Visual Regression', () => {
  // Full-page screenshot is non-deterministic in WSL2 headless Chromium (height varies ±1px
  // between runs, causing dimension mismatch). Individual component tests below cover the same
  // ground with stable, element-scoped screenshots.
  test.skip('full page — all directives', async ({ page }) => {
    await expect(page).toHaveScreenshot('full-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('decision banner — implement', async ({ page }) => {
    const banner = page.locator('[data-testid="decision-implement"] .decision-banner');
    await expect(banner).toHaveScreenshot('decision-implement.png');
  });

  test('metric cards row — 3 cards', async ({ page }) => {
    const row = page.locator('[data-testid="metrics-row"] .metric-cards-row');
    await expect(row).toHaveScreenshot('metric-cards-row.png');
  });

  test('checks hybrid — collapsed', async ({ page }) => {
    const list = page.locator('[data-testid="checks-hybrid"] .check-list');
    await expect(list).toHaveScreenshot('checks-hybrid-collapsed.png');
  });

  test('checks hybrid — expanded', async ({ page }) => {
    const section = page.locator('[data-testid="checks-hybrid"]');
    await section.locator('.check-statusbar-clickable').click();
    // Wait for animation/expansion
    await page.waitForTimeout(300);
    const list = section.locator('.check-list');
    await expect(list).toHaveScreenshot('checks-hybrid-expanded.png');
  });

  test('checks statusbar mode', async ({ page }) => {
    const list = page.locator('[data-testid="checks-statusbar"] .check-list');
    await expect(list).toHaveScreenshot('checks-statusbar.png');
  });

  test('checks table mode', async ({ page }) => {
    const list = page.locator('[data-testid="checks-table"] .check-list');
    await expect(list).toHaveScreenshot('checks-table.png');
  });
});

// Mobile-specific visual tests
test.describe('Mobile Visual Regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Mobile tests on chromium only');

  test('metric cards stack vertically on mobile', async ({ page, browserName }) => {
    // Only run on mobile project
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 500) {
      test.skip();
      return;
    }

    const section = page.locator('[data-testid="metrics-row"]');
    await expect(section).toHaveScreenshot('mobile-metric-cards.png');
  });

  test('checks responsive on mobile', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 500) {
      test.skip();
      return;
    }

    const section = page.locator('[data-testid="checks-hybrid"]');
    await expect(section).toHaveScreenshot('mobile-checks-hybrid.png');
  });
});
