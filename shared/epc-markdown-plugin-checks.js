/**
 * Unified Check Plugin for epc-markdown
 *
 * Renders :::check[name|expected|observed|status] and
 * :::check[name|expected|observed|status|critical] blocks.
 *
 * Also supports :::guardrail[name|expected|observed|status] as a
 * backward-compatible alias — guardrails are treated as critical checks.
 *
 * Syntax:
 *   :::check[Traffic Balance | 50/50 | 49.97/50.03 | pass]
 *   :::check[EPL — Bootstrap CI | CI excludes 0 | 95% CI [$0.06, $0.60] | pass | critical]
 *   :::guardrail[EPL — Bootstrap CI | CI excludes 0 | 95% CI [$0.06, $0.60] | pass]
 *
 * Fields (pipe-delimited):
 *   1. name     — Check name
 *   2. expected — Expected value
 *   3. observed — Observed value
 *   4. status   — pass|fail|warning|pending
 *   5. level    — "critical" (optional) — always-visible guardrail-style row
 *
 * Critical checks render inside a collapsible <details open> disclosure with a
 * status bar summary (same pattern as health checks). They start expanded.
 * Set data-check-critical-mode="visible" on a parent to disable collapsing.
 *
 * Regular checks render in one of four modes (set via data-check-mode on a parent):
 *   - "hybrid"     — Status bar summary + expandable data table (default)
 *   - "statusbar"  — Compact status bar + exception cards
 *   - "pills"      — Pill tags for passes, detail cards for exceptions
 *   - "table"      — CSS grid data table with status stripe
 *
 * Configuration attributes (set on any ancestor element):
 *   data-check-mode="hybrid|statusbar|pills|table"  — rendering mode for regular checks
 *   data-check-critical-mode="collapsible|visible"   — rendering mode for critical checks
 *
 * CSS: load epc-markdown-plugin-blocks.css alongside this script.
 */
(function () {
  'use strict';

  var STATUS_ICONS = {
    pass:    '\u2713',
    fail:    '\u2717',
    warning: '\u26A0',
    pending: '\u23F3',
  };

  // Matches both :::check[...] and :::guardrail[...] — allows nested brackets
  var PATTERN = /:::(check|guardrail)\[((?:[^\[\]]|\[[^\]]*\])*)\]/g;

  // ── Check Catalog (progressive enhancement — tooltips) ──
  var catalog = null;

  function loadCatalog() {
    if (typeof fetch !== 'function') return;
    fetch('/static/js/data/check-catalog.json')
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) {
        catalog = data;
        // Retroactively apply tooltips to any already-rendered check names
        var existing = document.querySelectorAll('.check-td-name');
        for (var i = 0; i < existing.length; i++) {
          var text = existing[i].textContent.trim();
          var tip = getTooltip(text);
          if (tip) existing[i].setAttribute('title', tip);
        }
      })
      .catch(function () { /* silent — tooltips degrade gracefully */ });
  }

  loadCatalog();

  var VALID_STATUSES = { pass: 1, fail: 1, warning: 1, pending: 1 };

  function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseFields(raw, isCritical) {
    var parts = raw.split('|').map(function (s) { return s.trim(); });
    return {
      name:     parts[0] || '',
      expected: parts[1] || '',
      observed: parts[2] || '',
      status:   (parts[3] || 'pending').toLowerCase(),
      critical: isCritical || (parts[4] && parts[4].toLowerCase() === 'critical'),
    };
  }

  /**
   * afterParse: convert blocks to placeholder divs with data attributes.
   * The actual visual rendering happens in afterRender based on mode + critical flag.
   */
  function buildPlaceholder(fields) {
    return (
      '<div class="check-item"' +
        ' data-check-status="' + esc(fields.status) + '"' +
        ' data-check-name="' + esc(fields.name) + '"' +
        ' data-check-expected="' + esc(fields.expected) + '"' +
        ' data-check-observed="' + esc(fields.observed) + '"' +
        (fields.critical ? ' data-check-critical="true"' : '') +
      '></div>'
    );
  }

  function transformChecks(html) {
    PATTERN.lastIndex = 0;
    var result = html.replace(PATTERN, function (_match, type, raw) {
      var isCritical = (type === 'guardrail');
      return buildPlaceholder(parseFields(raw, isCritical));
    });

    // Clean up <p> wrappers around check placeholders (allow <br> between them)
    result = result.replace(
      /<p>((?:(?:\s|<br\s*\/?>)*<div class="check-item"[^>]*><\/div>(?:\s|<br\s*\/?>)*)+)<\/p>/g,
      '$1'
    );

    return result;
  }

  /**
   * Read fields from a placeholder element.
   */
  function readFields(el) {
    var rawStatus = el.getAttribute('data-check-status') || 'pending';
    return {
      name:     el.getAttribute('data-check-name') || '',
      expected: el.getAttribute('data-check-expected') || '',
      observed: el.getAttribute('data-check-observed') || '',
      status:   VALID_STATUSES[rawStatus] ? rawStatus : 'pending',
      critical: el.getAttribute('data-check-critical') === 'true',
    };
  }

  /**
   * Count statuses from an array of field objects.
   */
  function countStatuses(items) {
    var counts = { pass: 0, fail: 0, warning: 0, pending: 0, total: 0 };
    for (var i = 0; i < items.length; i++) {
      var s = items[i].status;
      if (counts[s] !== undefined) counts[s]++;
      counts.total++;
    }
    return counts;
  }

  /**
   * Build dot-cluster HTML for a status bar. Shared by statusbar and hybrid modes.
   */
  function buildDotsHtml(counts) {
    var html = '';
    var groups = [
      { key: 'pass',    label: 'passed'  },
      { key: 'warning', label: 'warning' },
      { key: 'fail',    label: 'failed'  },
      { key: 'pending', label: 'pending' },
    ];
    for (var g = 0; g < groups.length; g++) {
      var count = counts[groups[g].key];
      if (count > 0) {
        html += '<span class="check-sb-group check-sb-' + groups[g].key + '">';
        for (var d = 0; d < count; d++) html += '<span class="check-sb-dot"></span>';
        html += '<span class="check-sb-count">' + count + ' ' + groups[g].label + '</span></span>';
      }
    }
    return html;
  }

  // ── Critical Rows (guardrail-level, same grid as health check table) ───

  /**
   * Build a critical-check table (same grid as health check table).
   * When collapsible is true, wraps in <details open> with a status bar summary.
   * When false, appends the table directly (always visible).
   */
  function renderCriticalRows(container, items, collapsible) {
    var table = document.createElement('div');
    table.className = 'check-table check-table-critical';

    // Header row (same structure as health check table)
    var header = document.createElement('div');
    header.className = 'check-table-header';
    header.innerHTML =
      '<span class="check-th-stripe"></span>' +
      '<span class="check-th-name">Check</span>' +
      '<span class="check-th-expected">Expected</span>' +
      '<span class="check-th-arrow"></span>' +
      '<span class="check-th-observed">Observed</span>' +
      '<span class="check-th-status"></span>';
    table.appendChild(header);

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var row = document.createElement('div');
      row.className = 'check-table-row check-tr-' + item.status + ' check-tr-critical';
      row.innerHTML =
        '<span class="check-td-stripe"></span>' +
        '<span class="check-td-name">' + esc(item.name) + '</span>' +
        '<span class="check-td-expected">' + esc(item.expected) + '</span>' +
        '<span class="check-td-arrow">\u2192</span>' +
        '<span class="check-td-observed">' + esc(item.observed) + '</span>' +
        '<span class="check-td-status">' + (STATUS_ICONS[item.status] || '') + '</span>';
      table.appendChild(row);
    }

    if (collapsible) {
      var counts = countStatuses(items);
      var details = document.createElement('details');
      details.className = 'check-disclosure check-disclosure-critical';
      details.setAttribute('open', '');

      var summary = document.createElement('summary');
      summary.className = 'check-statusbar check-statusbar-clickable';
      summary.innerHTML = buildDotsHtml(counts) + '<span class="check-sb-chevron"></span>';
      details.appendChild(summary);

      var body = document.createElement('div');
      body.className = 'check-disclosure-body';
      body.appendChild(table);
      details.appendChild(body);

      container.appendChild(details);
    } else {
      container.appendChild(table);
    }
  }

  // ── Mode A: Status Bar ──────────────────────────────────

  function renderStatusBar(list, items) {
    var counts = countStatuses(items);
    var nonPassing = items.filter(function (f) { return f.status !== 'pass'; });

    // Build status bar
    var bar = document.createElement('div');
    bar.className = 'check-statusbar';
    bar.innerHTML = buildDotsHtml(counts);
    list.appendChild(bar);

    // Exception cards (only non-passing)
    if (nonPassing.length > 0) {
      var exList = document.createElement('div');
      exList.className = 'check-exceptions';

      for (var e = 0; e < nonPassing.length; e++) {
        var item = nonPassing[e];
        var card = document.createElement('div');
        card.className = 'check-exception-card check-exception-' + item.status;
        card.innerHTML =
          '<div class="check-ex-header">' +
            '<span class="check-ex-icon">' + (STATUS_ICONS[item.status] || '') + '</span>' +
            '<span class="check-ex-name">' + esc(item.name) + '</span>' +
          '</div>' +
          '<div class="check-ex-detail">' +
            '<span class="check-ex-label">Expected</span>' +
            '<span class="check-ex-value">' + esc(item.expected) + '</span>' +
          '</div>' +
          '<div class="check-ex-detail">' +
            '<span class="check-ex-label">Observed</span>' +
            '<span class="check-ex-value check-ex-observed">' + esc(item.observed) + '</span>' +
          '</div>';
        exList.appendChild(card);
      }

      list.appendChild(exList);
    }
  }

  // ── Mode B: Pill Grid ───────────────────────────────────

  function renderPillGrid(list, items) {
    var passing = items.filter(function (f) { return f.status === 'pass'; });
    var nonPassing = items.filter(function (f) { return f.status !== 'pass'; });

    // Pill row for passing items
    if (passing.length > 0) {
      var pillRow = document.createElement('div');
      pillRow.className = 'check-pills';

      for (var p = 0; p < passing.length; p++) {
        var pill = document.createElement('span');
        pill.className = 'check-pill check-pill-pass';
        pill.innerHTML = '<span class="check-pill-icon">' + STATUS_ICONS.pass + '</span>' + esc(passing[p].name);
        pillRow.appendChild(pill);
      }

      list.appendChild(pillRow);
    }

    // Detail cards for non-passing items
    for (var n = 0; n < nonPassing.length; n++) {
      var item = nonPassing[n];
      var card = document.createElement('div');
      card.className = 'check-detail-card check-detail-' + item.status;
      card.innerHTML =
        '<div class="check-dc-header">' +
          '<span class="check-dc-icon">' + (STATUS_ICONS[item.status] || '') + '</span>' +
          '<span class="check-dc-name">' + esc(item.name) + '</span>' +
        '</div>' +
        '<div class="check-dc-values">' +
          '<span class="check-dc-expected">' + esc(item.expected) + '</span>' +
          '<span class="check-dc-arrow">\u2192</span>' +
          '<span class="check-dc-observed">' + esc(item.observed) + '</span>' +
        '</div>';
      list.appendChild(card);
    }
  }

  // ── Mode C: Data Table ──────────────────────────────────

  /**
   * Build the table DOM (shared between standalone table mode and hybrid).
   */
  function buildTableElement(items) {
    var table = document.createElement('div');
    table.className = 'check-table';

    // Header row
    var header = document.createElement('div');
    header.className = 'check-table-header';
    header.innerHTML =
      '<span class="check-th-stripe"></span>' +
      '<span class="check-th-name">Check</span>' +
      '<span class="check-th-expected">Expected</span>' +
      '<span class="check-th-arrow"></span>' +
      '<span class="check-th-observed">Observed</span>' +
      '<span class="check-th-status"></span>';
    table.appendChild(header);

    // Data rows
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var row = document.createElement('div');
      row.className = 'check-table-row check-tr-' + item.status;
      row.innerHTML =
        '<span class="check-td-stripe"></span>' +
        '<span class="check-td-name">' + esc(item.name) + '</span>' +
        '<span class="check-td-expected">' + esc(item.expected) + '</span>' +
        '<span class="check-td-arrow">\u2192</span>' +
        '<span class="check-td-observed">' + esc(item.observed) + '</span>' +
        '<span class="check-td-status">' + (STATUS_ICONS[item.status] || '') + '</span>';
      table.appendChild(row);
    }

    return table;
  }

  function renderDataTable(list, items) {
    list.appendChild(buildTableElement(items));
  }

  // ── Mode D: Hybrid (Status Bar + Expandable Table) ─────

  function renderHybrid(list, items) {
    var counts = countStatuses(items);

    // <details> is the disclosure wrapper
    var details = document.createElement('details');
    details.className = 'check-disclosure';

    // <summary> contains the status bar
    var summary = document.createElement('summary');
    summary.className = 'check-statusbar check-statusbar-clickable';
    summary.innerHTML = buildDotsHtml(counts) + '<span class="check-sb-chevron"></span>';
    details.appendChild(summary);

    // Expandable content: the data table
    var tableWrap = document.createElement('div');
    tableWrap.className = 'check-disclosure-body';
    tableWrap.appendChild(buildTableElement(items));
    details.appendChild(tableWrap);

    list.appendChild(details);
  }

  // ── Grouping & Dispatch ─────────────────────────────────

  function groupAndRender(container, mode) {
    var placeholders = container.querySelectorAll('.check-item');
    if (!placeholders.length) return;

    // Find groups of consecutive placeholders
    var groups = [];
    var currentGroup = [placeholders[0]];

    for (var i = 1; i < placeholders.length; i++) {
      var prev = currentGroup[currentGroup.length - 1];
      var curr = placeholders[i];

      var isConsecutive = false;
      var node = prev.nextSibling;
      while (node && node !== curr) {
        if (node.nodeType === 1) {
          if (node.classList && node.classList.contains('check-item')) {
            isConsecutive = true;
            break;
          }
          // Skip <br> elements (artifact of marked.js breaks:true)
          if (node.nodeName === 'BR') {
            node = node.nextSibling;
            continue;
          }
          break;
        }
        if (node.nodeType === 3 && node.textContent.trim() !== '') break;
        node = node.nextSibling;
      }
      if (node === curr) isConsecutive = true;

      if (isConsecutive) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    groups.push(currentGroup);

    // Process each group
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var allItems = group.map(readFields);

      // Separate critical (guardrail-level) from regular checks
      var criticalItems = allItems.filter(function (f) { return f.critical; });
      var regularItems = allItems.filter(function (f) { return !f.critical; });

      // Determine container class
      var list = document.createElement('div');
      if (criticalItems.length > 0 && regularItems.length === 0) {
        list.className = 'check-list';
      } else if (criticalItems.length > 0 && regularItems.length > 0) {
        list.className = 'check-list check-list-mixed check-mode-' + mode;
      } else {
        list.className = 'check-list check-mode-' + mode;
      }
      group[0].parentNode.insertBefore(list, group[0]);

      // Remove placeholders from DOM
      for (var r = 0; r < group.length; r++) {
        if (group[r].parentNode) group[r].parentNode.removeChild(group[r]);
      }

      // Render critical items (collapsible by default, expanded)
      if (criticalItems.length > 0) {
        var criticalMode = detectCriticalMode(container);
        renderCriticalRows(list, criticalItems, criticalMode === 'collapsible');
      }

      // Render regular items in the detected mode
      if (regularItems.length > 0) {
        if (mode === 'hybrid') {
          renderHybrid(list, regularItems);
        } else if (mode === 'statusbar') {
          renderStatusBar(list, regularItems);
        } else if (mode === 'pills') {
          renderPillGrid(list, regularItems);
        } else {
          renderDataTable(list, regularItems);
        }
      }
    }
  }

  function detectMode(container) {
    var el = container;
    while (el) {
      if (el.dataset && el.dataset.checkMode) {
        return el.dataset.checkMode;
      }
      el = el.parentElement;
    }
    return 'hybrid'; // default
  }

  /**
   * Detect critical-check display mode from data-check-critical-mode on a parent.
   *   "collapsible" (default) — <details open> with status bar summary
   *   "visible"               — always visible, no disclosure wrapper
   */
  function detectCriticalMode(container) {
    var el = container;
    while (el) {
      if (el.dataset && el.dataset.checkCriticalMode) {
        return el.dataset.checkCriticalMode;
      }
      el = el.parentElement;
    }
    return 'collapsible'; // default: expanded, collapsible
  }

  // ── Catalog Tooltips ───────────────────────────────────

  function getTooltip(name) {
    if (!catalog) return '';

    // Try compound pattern: "Metric — Type" (em dash with spaces)
    var parts = name.split(/\s+\u2014\s+/);
    if (parts.length === 2) {
      var metricDesc = (catalog.metrics && catalog.metrics[parts[0]]) || '';
      var typeDesc = (catalog.checkTypes && catalog.checkTypes[parts[1]]) || '';
      if (metricDesc && typeDesc) return parts[0] + ': ' + metricDesc + '\n' + parts[1] + ': ' + typeDesc;
      if (metricDesc) return metricDesc;
      if (typeDesc) return typeDesc;
    }

    // Try direct lookup in metrics
    if (catalog.metrics && catalog.metrics[name]) return catalog.metrics[name];

    return '';
  }

  function applyTooltips(container) {
    if (!catalog) return;
    var nameEls = container.querySelectorAll('.check-td-name');
    for (var i = 0; i < nameEls.length; i++) {
      var text = nameEls[i].textContent.trim();
      var tip = getTooltip(text);
      if (tip) nameEls[i].setAttribute('title', tip);
    }
  }

  // ── Plugin Registration ───────────────────────────────

  var plugin = {
    name: 'xp-checks',
    afterParse: function (html) {
      return transformChecks(html);
    },
    afterRender: function (container) {
      var mode = detectMode(container);
      groupAndRender(container, mode);
      applyTooltips(container);
    },
  };

  if (window.epcMarkdown && window.epcMarkdown.use) {
    window.epcMarkdown.use(plugin);
  } else {
    window.epcMarkdown = window.epcMarkdown || {};
    window.epcMarkdown._pending = window.epcMarkdown._pending || [];
    window.epcMarkdown._pending.push(plugin);
  }
})();
