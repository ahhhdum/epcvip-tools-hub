# EPCVIP Directive Syntax Specification

**Version:** 1.0.0
**Date:** 2026-02-27
**Status:** Active

## Purpose

This document defines the custom markdown directive syntax used across EPCVIP surfaces. It serves as the shared contract between:

- **Browser JS plugins** (`epc-markdown-plugin-*.js`) — runtime rendering
- **VS Code extension** (`vscode-extension/plugins/`) — markdown-it preview rendering
- **Future Python Markdown extensions** — build-time rendering (e.g., MkDocs `pymdownx.blocks`)

Any renderer that implements this spec produces visually consistent output when paired with the shared CSS (`epc-markdown-plugin-blocks.css`, `epc-markdown-plugin-significance.css`).

---

## Directives

### `:::decision[STATUS]`

Full-width banner showing the outcome of an experiment.

**Syntax:**
```
:::decision[STATUS]
Rationale text (supports inline markdown).
:::
```

**STATUS values:**

| Value | Color | Icon | Use When |
|-------|-------|------|----------|
| `IMPLEMENT` | Green | Checkmark | Treatment wins, deploy it |
| `REVERT` | Red | X | Treatment loses, revert |
| `INCONCLUSIVE` | Amber | ? | Cannot draw conclusion |
| `PENDING` | Grey | Clock | Test is running, no data yet |
| `EXTEND` | Blue | Arrow | Needs more time/data |

**CSS class contract:**
```
.decision-banner
.decision-banner .decision-banner-header
.decision-banner .decision-banner-icon
.decision-banner .decision-banner-status
.decision-banner .decision-banner-rationale
.decision-implement | .decision-revert | .decision-inconclusive | .decision-pending | .decision-extend
```

**Fallback behavior:** On renderers without this plugin, the raw text `:::decision[IMPLEMENT]` is readable as plain text, and the closing `:::` is ignored as a paragraph.

---

### `:::metric[name | value | stat | status]`

Inline card displaying a key metric. Consecutive metrics are grouped into a flex row.

**Syntax:**
```
:::metric[name | value | stat | status]
```

**Fields (pipe-delimited):**

| # | Field | Required | Description |
|---|-------|----------|-------------|
| 1 | name | Yes | Metric label (e.g., "EPL", "Win Rate") |
| 2 | value | Yes | The metric value (e.g., "+$0.33 (+3.51%)") |
| 3 | stat | No | Secondary detail (e.g., "`p=0.007`", "32 of 52 days") |
| 4 | status | No | Color indicator (default: `context`) |

**STATUS values:**

| Value | Color | Use When |
|-------|-------|----------|
| `win` | Green | Statistically significant positive result |
| `loss` | Red | Negative result |
| `flat` | Grey | No change (expected or not) |
| `marginal` | Amber | Borderline significance |
| `context` | Neutral | Informational (no color emphasis) |
| `pending` | Grey dashed | Data not yet available |

**CSS class contract:**
```
.metric-cards-row                  (flex container for consecutive cards)
.metric-card-block                 (individual card)
.metric-card-name
.metric-card-value
.metric-card-stat                  (hover-reveal secondary stat)
.metric-card-win | .metric-card-loss | .metric-card-flat | .metric-card-marginal | .metric-card-context | .metric-card-pending
```

**Nested brackets:** Bracket content inside fields is supported: `:::metric[EPL | +$0.33 | 95% CI [$0.06, $0.60] | win]`

---

### `:::check[name | expected | observed | status]`

Health check row rendered in one of several display modes (statusbar, pills, table, hybrid).

**Syntax:**
```
:::check[name | expected | observed | status]
:::check[name | expected | observed | status | critical]
```

**Fields (pipe-delimited):**

| # | Field | Required | Description |
|---|-------|----------|-------------|
| 1 | name | Yes | Check name (e.g., "Traffic Balance") |
| 2 | expected | Yes | Expected value (e.g., "50/50") |
| 3 | observed | Yes | Observed value (e.g., "49.97/50.03") |
| 4 | status | Yes | `pass`, `fail`, `warning`, or `pending` |
| 5 | level | No | `critical` for guardrail-level emphasis |

**STATUS values:**

| Value | Icon | Color | Meaning |
|-------|------|-------|---------|
| `pass` | Checkmark | Green | Within expected range |
| `fail` | X | Red | Outside acceptable range |
| `warning` | Warning | Amber | Near boundary / needs attention |
| `pending` | Clock | Grey | Not yet measured |

**Display modes** (set via `data-check-mode` on a parent element):

| Mode | Description | Default |
|------|-------------|---------|
| `hybrid` | Status bar summary + expandable data table | Yes |
| `statusbar` | Compact dot clusters + exception cards |  |
| `pills` | Pill tags for passes, detail cards for exceptions |  |
| `table` | Full CSS grid data table |  |

**Critical checks** (guardrails):
- Always rendered as a data table with stronger row emphasis
- By default wrapped in `<details open>` (collapsible but starts expanded)
- Set `data-check-critical-mode="visible"` on a parent to disable collapsing

**CSS class contract:**
```
.check-list                        (container)
.check-mode-hybrid | .check-mode-statusbar | .check-mode-pills | .check-mode-table

Status bar:
.check-statusbar, .check-sb-group, .check-sb-dot, .check-sb-count
.check-sb-pass | .check-sb-warning | .check-sb-fail | .check-sb-pending

Data table:
.check-table, .check-table-header, .check-table-row
.check-td-stripe, .check-td-name, .check-td-expected, .check-td-arrow, .check-td-observed, .check-td-status
.check-tr-pass | .check-tr-warning | .check-tr-fail | .check-tr-pending
.check-tr-critical                 (guardrail-level row)

Hybrid disclosure:
.check-disclosure, .check-disclosure-body, .check-statusbar-clickable, .check-sb-chevron

Pills:
.check-pills, .check-pill, .check-pill-pass
.check-detail-card, .check-detail-warning, .check-detail-fail

Exception cards:
.check-exceptions, .check-exception-card, .check-exception-warning, .check-exception-fail
```

**Backward compatibility:** `:::guardrail[name | expected | observed | status]` is treated as `:::check[name | expected | observed | status | critical]`.

---

### `:::check[...]` — Alias: `:::guardrail[...]`

Deprecated alias. Use `:::check[...|critical]` instead. Maintained for backward compatibility with existing test READMEs.

---

## Significance Highlighting

Not a directive syntax, but a text-node post-processor that applies to all rendered content.

**Patterns matched:**

| Category | Examples | CSS Class |
|----------|----------|-----------|
| Positive | "statistically significant", "p < 0.05", "95% confidence" | `.sig-positive` |
| Negative | "not significant", "p >= 0.05", "no significant difference" | `.sig-negative` |
| Borderline | "marginally significant", "trending toward significance" | `.sig-borderline` |

**Inline code p-values:** `p=0.033` in backticks gets classified by threshold: `<0.05` = positive, `0.05-0.1` = borderline, `>=0.1` = negative.

---

## Design Tokens

All directives reference CSS custom properties from `epc-tokens.css`:

```css
/* Backgrounds */
--bg-primary, --bg-secondary, --bg-tertiary, --bg-elevated

/* Text */
--text-primary, --text-secondary, --text-muted, --text-disabled

/* Accent */
--accent-primary, --accent-primary-hover, --accent-primary-dark

/* Borders */
--border-primary, --border-secondary, --border-subtle

/* Semantic */
--success, --success-bg, --warning, --warning-bg, --error, --error-bg, --info, --info-bg
```

Consumers that define these properties in their own `:root` get full styling. Consumers without them can load `epc-tokens.css` for EPCVIP-brand defaults.

---

## Consuming This Spec

### MkDocs / Static Site Generators

1. Add to `mkdocs.yml`:
   ```yaml
   extra_css:
     - https://epcvip.vip/shared/epc-tokens.css?v=1.0.0
     - https://epcvip.vip/shared/epc-markdown-plugin-blocks.css?v=1.0.0
     - https://epcvip.vip/shared/epc-markdown-plugin-significance.css?v=1.0.0
   ```
2. Directives render as raw text unless a `pymdownx.blocks` extension is written to parse them into HTML with the CSS classes above

### Custom Apps (Runtime)

1. Load CSS from CDN (tokens + blocks + significance)
2. Load `epc-markdown.js` + desired plugins from CDN
3. Call `epcMarkdown.render({ container, markdown })`

### Any Platform

The CSS class contracts above are the interface. If your renderer produces HTML with these class names, the shared CSS styles it correctly regardless of how it was generated.
