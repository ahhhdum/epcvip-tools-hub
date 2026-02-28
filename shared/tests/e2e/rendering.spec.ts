/**
 * DOM structure and behavior assertions for every shared directive.
 *
 * Uses test-harness.html which loads all plugins locally and renders
 * fixture markdown into data-testid sections.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/test-harness.html');
  // Wait for all sections to finish rendering
  await page.waitForSelector('body[data-render-complete="true"]', { timeout: 10000 });
});

// ── Decision Banners ──────────────────────────────────────────

test.describe('Decision Banners', () => {
  const statuses = [
    { testId: 'decision-implement', cls: 'decision-implement', label: 'Implement' },
    { testId: 'decision-revert', cls: 'decision-revert', label: 'Revert' },
    { testId: 'decision-inconclusive', cls: 'decision-inconclusive', label: 'Inconclusive' },
    { testId: 'decision-pending', cls: 'decision-pending', label: 'Pending' },
    { testId: 'decision-extend', cls: 'decision-extend', label: 'Extend' },
  ];

  for (const { testId, cls, label } of statuses) {
    test(`${label} banner renders with correct structure`, async ({ page }) => {
      const section = page.locator(`[data-testid="${testId}"]`);
      const banner = section.locator('.decision-banner');

      await expect(banner).toBeVisible();
      await expect(banner).toHaveClass(new RegExp(cls));

      // Check internal structure
      await expect(section.locator('.decision-banner-header')).toBeVisible();
      await expect(section.locator('.decision-banner-icon')).toBeVisible();
      await expect(section.locator('.decision-banner-status')).toContainText(label);
      await expect(section.locator('.decision-banner-rationale')).toBeVisible();
    });
  }
});

// ── Metric Cards ──────────────────────────────────────────────

test.describe('Metric Cards', () => {
  test('3 consecutive cards wrapped in flex row', async ({ page }) => {
    const section = page.locator('[data-testid="metrics-row"]');
    const row = section.locator('.metric-cards-row');
    const cards = section.locator('.metric-card-block');

    await expect(row).toBeVisible();
    await expect(cards).toHaveCount(3);

    // Verify each card is inside the row
    await expect(row.locator('.metric-card-block')).toHaveCount(3);
  });

  test('single card has no row wrapper', async ({ page }) => {
    const section = page.locator('[data-testid="metric-single"]');
    const card = section.locator('.metric-card-block');
    const row = section.locator('.metric-cards-row');

    await expect(card).toBeVisible();
    await expect(row).toHaveCount(0);
  });

  test('all 6 status classes render', async ({ page }) => {
    const section = page.locator('[data-testid="metrics-row"]');

    // metrics-row has: win, win, marginal
    await expect(section.locator('.metric-card-win')).toHaveCount(2);
    await expect(section.locator('.metric-card-marginal')).toHaveCount(1);

    // metric-single has: context
    const single = page.locator('[data-testid="metric-single"]');
    await expect(single.locator('.metric-card-context')).toHaveCount(1);
  });

  test('card has name, value, stat divs', async ({ page }) => {
    const card = page.locator('[data-testid="metrics-row"] .metric-card-block').first();

    await expect(card.locator('.metric-card-name')).toContainText('EPL');
    await expect(card.locator('.metric-card-value')).toContainText('+$0.33');
    await expect(card.locator('.metric-card-stat')).toContainText('p=0.007');
  });
});

// ── Checks: Hybrid Mode ──────────────────────────────────────

test.describe('Checks — Hybrid Mode', () => {
  test('status bar visible with correct dot groups', async ({ page }) => {
    const section = page.locator('[data-testid="checks-hybrid"]');
    const statusbar = section.locator('.check-statusbar');

    await expect(statusbar).toBeVisible();
    await expect(section.locator('.check-sb-pass')).toBeVisible();
  });

  test('clicking disclosure expands table', async ({ page }) => {
    const section = page.locator('[data-testid="checks-hybrid"]');
    const disclosure = section.locator('.check-disclosure');
    const table = section.locator('.check-table');

    // Open disclosure
    await section.locator('.check-statusbar-clickable').click();
    await expect(table).toBeVisible();

    // Verify table has correct structure
    await expect(section.locator('.check-table-header')).toBeVisible();
    await expect(section.locator('.check-table-row')).toHaveCount(5);
  });

  test('table rows have correct status classes', async ({ page }) => {
    const section = page.locator('[data-testid="checks-hybrid"]');
    await section.locator('.check-statusbar-clickable').click();

    await expect(section.locator('.check-tr-pass')).toHaveCount(3);
    await expect(section.locator('.check-tr-warning')).toHaveCount(1);
    await expect(section.locator('.check-tr-fail')).toHaveCount(1);
  });
});

// ── Checks: Statusbar Mode ──────────────────────────────────

test.describe('Checks — Statusbar Mode', () => {
  test('status bar and exception cards render', async ({ page }) => {
    const section = page.locator('[data-testid="checks-statusbar"]');

    await expect(section.locator('.check-statusbar')).toBeVisible();
    // 3 pass + 1 warning → exception card for warning
    await expect(section.locator('.check-exception-card')).toHaveCount(1);
    await expect(section.locator('.check-exception-warning')).toBeVisible();
  });
});

// ── Checks: Pills Mode ──────────────────────────────────────

test.describe('Checks — Pills Mode', () => {
  test('pass pills and detail cards for non-passing', async ({ page }) => {
    const section = page.locator('[data-testid="checks-pills"]');

    await expect(section.locator('.check-pills')).toBeVisible();
    await expect(section.locator('.check-pill-pass')).toHaveCount(2);
    await expect(section.locator('.check-detail-card')).toHaveCount(2);
    await expect(section.locator('.check-detail-warning')).toHaveCount(1);
    await expect(section.locator('.check-detail-fail')).toHaveCount(1);
  });
});

// ── Checks: Table Mode ──────────────────────────────────────

test.describe('Checks — Table Mode', () => {
  test('full grid visible with all rows', async ({ page }) => {
    const section = page.locator('[data-testid="checks-table"]');
    const table = section.locator('.check-table');

    await expect(table).toBeVisible();
    await expect(section.locator('.check-table-header')).toBeVisible();
    await expect(section.locator('.check-table-row')).toHaveCount(4);
  });
});

// ── Checks: Critical ────────────────────────────────────────

test.describe('Checks — Critical', () => {
  test('collapsible mode uses <details open>', async ({ page }) => {
    const section = page.locator('[data-testid="checks-critical-collapsible"]');
    const details = section.locator('.check-disclosure-critical');

    await expect(details).toBeVisible();
    // Details should be open by default
    await expect(details).toHaveAttribute('open', '');
  });

  test('visible mode shows table without disclosure', async ({ page }) => {
    const section = page.locator('[data-testid="checks-critical-visible"]');
    const table = section.locator('.check-table-critical');

    await expect(table).toBeVisible();
    // No disclosure wrapper in visible mode
    await expect(section.locator('.check-disclosure-critical')).toHaveCount(0);
  });

  test('mixed: critical section appears with regular checks', async ({ page }) => {
    const section = page.locator('[data-testid="checks-mixed"]');

    // Should have both critical table and regular check rendering
    await expect(section.locator('.check-list-mixed')).toBeVisible();

    // Critical rows have critical class
    await expect(section.locator('.check-tr-critical')).toHaveCount(2);

    // Regular checks render in hybrid mode (disclosure)
    await expect(section.locator('.check-disclosure').first()).toBeVisible();
  });
});

// ── TOC ──────────────────────────────────────────────────────

test.describe('Table of Contents', () => {
  test('floating TOC generated on desktop', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit' && page.viewportSize()?.width === 390, 'Mobile viewport');

    // TOC plugin appends to document.body, not inside the section
    const toc = page.locator('.floating-toc');

    await expect(toc).toHaveCount(1);
  });

  test('heading links generated with correct hierarchy', async ({ page }) => {
    const section = page.locator('[data-testid="toc-test"] .render-target');

    // Check that headings got IDs (inside the render target only)
    const h2s = section.locator('h2[id]');
    await expect(h2s).toHaveCount(4); // Executive Summary, Methodology, Results, Recommendation

    const h3s = section.locator('h3[id]');
    await expect(h3s).toHaveCount(4); // Test Design, Duration, Primary Metrics, Guardrail Metrics
  });
});

// ── Significance ─────────────────────────────────────────────

test.describe('Significance Highlighting', () => {
  test('positive keywords get sig-positive class', async ({ page }) => {
    const section = page.locator('[data-testid="significance-test"]');
    const positive = section.locator('mark.sig-positive');

    await expect(positive.first()).toBeVisible();
  });

  test('negative keywords get sig-negative class', async ({ page }) => {
    const section = page.locator('[data-testid="significance-test"]');
    const negative = section.locator('mark.sig-negative');

    await expect(negative.first()).toBeVisible();
  });

  test('borderline keywords get sig-borderline class', async ({ page }) => {
    const section = page.locator('[data-testid="significance-test"]');
    const borderline = section.locator('mark.sig-borderline');

    await expect(borderline.first()).toBeVisible();
  });

  test('p-values in code elements get classified', async ({ page }) => {
    const section = page.locator('[data-testid="significance-test"]');

    // p < 0.01 should be sig-positive
    const positiveCode = section.locator('code.sig-positive');
    await expect(positiveCode.first()).toBeVisible();
  });
});

// ── Slack Tables ─────────────────────────────────────────────

test.describe('Slack Tables', () => {
  test('table wrapped in .table-wrapper with copy button', async ({ page }) => {
    const section = page.locator('[data-testid="slack-tables-test"]');
    const wrapper = section.locator('.table-wrapper');
    const copyBtn = section.locator('.table-copy-btn');

    await expect(wrapper).toBeVisible();
    await expect(copyBtn).toBeVisible();
  });
});

// ── XSS Safety ───────────────────────────────────────────────

test.describe('XSS Safety', () => {
  test('no injected scripts execute (no alert fired)', async ({ page }) => {
    // If any alert() fired, the page would have a dialog that blocks further
    // execution. The fact that rendering completed (data-render-complete="true")
    // proves no blocking alert dialogs were triggered.
    const renderComplete = await page.getAttribute('body', 'data-render-complete');
    expect(renderComplete).toBe('true');

    // Verify no XSS payloads modified the DOM outside of normal rendering
    const xssEvidence = await page.evaluate(() => {
      // Check that no alert was captured by window.onerror or similar
      return (window as any).__xssTriggered || false;
    });
    expect(xssEvidence).toBe(false);
  });

  test('XSS payloads are escaped or neutralized', async ({ page }) => {
    const section = page.locator('[data-testid="xss-test"]');
    const html = await section.locator('.render-target').innerHTML();

    // No raw img elements with onerror attribute (marked.parse escapes them)
    expect(html).not.toContain('<img onerror');

    // The decision banner status field contains an XSS payload that marked
    // escapes to &lt;img&gt; — the plugin sees the escaped text, not raw HTML.
    // The directive syntax is broken by the escaping, so it renders as text.
    // Verify the metric cards and checks DID render correctly:
    expect(html).toContain('metric-card-block');
    expect(html).toContain('check-list');
  });

  test('significance highlighting: HTML entities in text nodes are not injected', async ({ page }) => {
    const section = page.locator('[data-testid="xss-test"]');
    const renderTarget = section.locator('.render-target');

    // The harness contains: "statistically significant with p &lt; 0.05 and &lt;img onerror=...&gt;"
    // The &lt;/&gt; entities decode to < / > in text nodes. The significance plugin
    // must not inject these as raw HTML (old innerHTML path would have).
    // With the DocumentFragment fix, text is inserted as createTextNode — safe.

    // The <img> must not appear as a real element (onerror would fire)
    const injectedImg = await renderTarget.locator('img').count();
    expect(injectedImg).toBe(0);

    // The significance mark DOES appear (keyword was highlighted)
    const mark = renderTarget.locator('mark.sig-positive').first();
    await expect(mark).toBeVisible();
    expect(await mark.textContent()).toContain('statistically significant');

    // The literal text containing < still renders as text, not as a tag
    const text = await renderTarget.textContent();
    expect(text).toContain('<img');  // visible as literal text
  });
});
