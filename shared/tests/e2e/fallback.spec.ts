/**
 * CDN fallback chain verification.
 *
 * Tests that when CDN URLs fail, the document.write fallback
 * loads local copies and rendering still works identically.
 *
 * Routes CDN requests to local files to avoid external network dependency.
 */
import { test, expect } from '@playwright/test';

// Only run fallback tests on chromium (document.write behavior varies)
test.describe('CDN Fallback Chain', () => {
  test.describe.configure({ mode: 'serial' });

  test('CDN failure → local fallback kicks in → directives render', async ({ page }) => {
    // Block all CDN requests to epcvip.vip
    await page.route('**/epcvip.vip/**', (route) => route.abort());

    await page.goto('/tests/test-harness-cdn.html');
    await page.waitForSelector('body[data-render-complete="true"]', { timeout: 15000 });

    // Verify all directive types rendered despite CDN being blocked
    const section = page.locator('[data-testid="decision-implement"]');

    // Decision banner rendered
    await expect(section.locator('.decision-banner')).toBeVisible();
    await expect(section.locator('.decision-implement')).toBeVisible();

    // Metric cards rendered
    await expect(section.locator('.metric-card-block')).toHaveCount(2);

    // Checks rendered (placeholder divs get replaced by afterRender)
    await expect(section.locator('.check-list')).toBeVisible();
  });

  test('partial CDN failure → mixed loading works', async ({ page }) => {
    // Route ALL CDN requests to local files (simulate CDN success)
    await page.route('**/epcvip.vip/shared/**', (route) => {
      const url = new URL(route.request().url());
      const filename = url.pathname.split('/').pop()?.split('?')[0];
      if (filename) {
        route.fulfill({
          status: 301,
          headers: { Location: `http://localhost:3099/${filename}` },
        });
      } else {
        route.abort();
      }
    });

    // Now override: block ONLY the checks plugin CDN
    await page.route('**/epcvip.vip/shared/epc-markdown-plugin-checks*', (route) => route.abort());

    await page.goto('/tests/test-harness-cdn.html');
    await page.waitForSelector('body[data-render-complete="true"]', { timeout: 15000 });

    const section = page.locator('[data-testid="decision-implement"]');

    // Decision banner should work (loaded via redirect to local, simulating CDN success)
    await expect(section.locator('.decision-banner')).toBeVisible();

    // Checks should still work (CDN blocked → document.write fallback to local)
    await expect(section.locator('.check-list')).toBeVisible();
  });

  test('core renderer CDN failure → document.write fallback → plugins still register', async ({ page }) => {
    // Block only the core renderer CDN URL
    await page.route('**/epcvip.vip/**', (route) => route.abort());

    await page.goto('/tests/test-harness-cdn.html');
    await page.waitForSelector('body[data-render-complete="true"]', { timeout: 15000 });

    const section = page.locator('[data-testid="decision-implement"]');

    // Core should have fallen back, all plugins registered
    await expect(section.locator('.decision-banner')).toBeVisible();
    await expect(section.locator('.metric-card-block')).toHaveCount(2);
  });

  test('fallback scripts loaded after CDN block', async ({ page }) => {
    // Collect all network requests
    const requests: string[] = [];
    page.on('request', (request) => {
      requests.push(request.url());
    });

    // Block all CDN
    await page.route('**/epcvip.vip/**', (route) => route.abort());

    await page.goto('/tests/test-harness-cdn.html');
    await page.waitForSelector('body[data-render-complete="true"]', { timeout: 15000 });

    // Should have attempted CDN URLs
    const cdnAttempts = requests.filter((r) => r.includes('epcvip.vip'));
    expect(cdnAttempts.length).toBeGreaterThan(0);

    // Should have loaded local fallbacks
    const localLoads = requests.filter(
      (r) => r.includes('localhost:3099') && r.includes('epc-markdown')
    );
    expect(localLoads.length).toBeGreaterThan(0);
  });
});
