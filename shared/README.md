# EPCVIP Shared Components

Shared UI components used across EPCVIP apps, served from the Tools Hub CDN.

## Architecture

```
epcvip-tools-hub/shared/          ← Canonical source (CDN origin)
        ↓ (Cloudflare CDN)
https://epcvip.vip/shared/        ← Production delivery
        ↓ (fallback if CDN unreachable)
consumer/static/{js,css}/shared/  ← Local fallback copies
```

**How it works:** Tools Hub is deployed to `epcvip.vip` via Railway. The `/shared/` directory is served as static files through Cloudflare's CDN. Consumer apps load from the CDN first, with local fallback copies for when the CDN is unreachable (always the case in local development).

**Cloudflare caching:** After deploying changes, Cloudflare may serve stale assets for up to 4 hours. Purge the cache after deploying shared file changes — see the root `CLAUDE.md` for purge commands.

## Component Inventory

| Component | Files | Purpose |
|-----------|-------|---------|
| **Sidebar** | `epc-sidebar.{css,js,html}` | Cross-tool navigation sidebar |
| **Header** | `epc-header.{css,js,html}` | Shared header with app-switcher |
| **Markdown** | `epc-markdown.{css,js}`, `epc-hljs.css` | Markdown rendering pipeline with plugin architecture |

---

## Sidebar Navigation (`epc-sidebar.*`)

Cross-tool navigation sidebar providing consistent UX across all EPCVIP apps.

### Architecture

| Layer | Source | Delivery |
|-------|--------|----------|
| CSS | `epc-sidebar.css` | CDN (`epcvip.vip/shared/`) with local fallback |
| JS | `epc-sidebar.js` | CDN (`epcvip.vip/shared/`) with local fallback |
| HTML | `epc-sidebar.html` | **Embedded** in each app's `index.html` |

### Apps Using This Sidebar

| App | URL | HTML Location |
|-----|-----|---------------|
| **Tools Hub** | `epcvip.vip` | `index.html` (embedded, special case) |
| Ping Tree Compare | `compare.epcvip.vip` | `static/index.html` |
| Experiments Dashboard | `xp.epcvip.vip` | `static/index.html` |
| Athena Monitor | `athena.epcvip.vip` | `static/index.html` |
| Reports Dashboard | `reports.epcvip.vip` | `validator-api/static/reports.html` |
| Funnel Analyzer | `tools.epcvip.vip` | (separate repo) |

> **Tools Hub Special Case:** Since Tools Hub IS the CDN host, it can't load from itself.
> Its sidebar HTML is embedded directly in `index.html` and must be manually synced.

### Adding a New Nav Item

1. Update `shared/epc-sidebar.html` (the source template)
2. Update `index.html` (Tools Hub's embedded sidebar)
3. Bump version in `shared/version.json`
4. Push Tools Hub to deploy CDN
5. Update each consumer app's embedded HTML + CDN version query param
6. Push each consumer repo to deploy

**Nav item template:**
```html
<a href="https://example.epcvip.vip" class="epc-nav-item" data-tool="tool-id">
  <span class="epc-nav-icon">&#x1F50D;</span>
  <span class="epc-nav-label">Tool Name</span>
</a>
```

### Sidebar Sync Process

Currently, sidebar HTML is manually synced. See `scripts/sync-sidebar.sh` for reference.

**Files to update when adding a nav item** (paths relative to `utilities/`):
- `ping-tree-compare/static/index.html`
- `experiments-dashboard/static/index.html`
- `athena-usage-monitor-fastapi/static/index.html`
- `../tools/data-platform-assistant/validator-api/static/reports.html` (Reports Dashboard)

---

## Markdown Renderer (`epc-markdown.*`)

Shared markdown rendering pipeline with a plugin architecture. Provides consistent markdown styling and behavior across apps that render markdown content.

### Core Files

| File | Purpose | CDN URL |
|------|---------|---------|
| `epc-tokens.css` | Shared CSS custom properties (design tokens) | `epcvip.vip/shared/epc-tokens.css` |
| `epc-markdown.css` | Styles for `.markdown-content` containers | `epcvip.vip/shared/epc-markdown.css` |
| `epc-markdown.js` | Rendering pipeline with plugin hooks | `epcvip.vip/shared/epc-markdown.js` |
| `epc-hljs.css` | Dark theme for highlight.js code blocks | `epcvip.vip/shared/epc-hljs.css` |

### Shared Plugins

Plugins that implement the EPCVIP directive syntax (`:::decision`, `:::metric`, `:::check`). These are the shared rendering layer — any app loading these gets our directive styling.

| File | Plugin Name | Purpose |
|------|-------------|---------|
| `epc-markdown-plugin-blocks.css` | (CSS) | Styles for decision banners, metric cards, check tables |
| `epc-markdown-plugin-significance.css` | (CSS) | Significance highlighting colors |
| `epc-markdown-plugin-significance.js` | `xp-significance` | Text-node significance highlighting |
| `epc-markdown-plugin-decision-banner.js` | `xp-decision-banner` | `:::decision[STATUS]` runtime rendering |
| `epc-markdown-plugin-metric-cards.js` | `xp-metric-cards` | `:::metric[name\|value\|stat\|status]` rendering |
| `epc-markdown-plugin-checks.js` | `xp-checks` | `:::check` / `:::guardrail` rendering (4 display modes) |
| `epc-markdown-plugin-slack-tables.js` | `xp-slack-tables` | Copy-for-Slack button on tables |
| `epc-markdown-plugin-toc.js` | `epc-toc` | Floating TOC (desktop) + mobile accordion |

**Directive syntax spec:** See [`DIRECTIVE_SPEC.md`](DIRECTIVE_SPEC.md) for the full contract.

### App-Specific Plugins (not shared)

| App | Plugin | Why Local |
|-----|--------|-----------|
| experiments-dashboard | `xp-link-handling` | Coupled to XP's file-viewer modal |
| docs-site | `docs-assets` | Coupled to docs-site's asset routing |
| docs-site | `docs-mermaid` | Depends on mermaid.js (docs-site only) |

### Apps Using Markdown

| App | Shared Plugins | App-Specific | Fallback Paths |
|-----|---------------|--------------|----------------|
| **Experiments Dashboard** (`xp.epcvip.vip`) | All 7 shared | link-handling | `static/{js,css}/shared/`, `static/css/hljs-epcvip.css` |
| **Docs Site** (`docs.epcvip.vip`) | All 7 shared | assets, mermaid | `static/js/shared/`, `static/css/markdown.css`, `static/css/hljs-epcvip.css` |
| **VS Code Extension** | None (forked for markdown-it) | All custom | No CDN (offline) |

> **Note:** Fallback filenames differ between consumers (legacy naming). The sync script handles this automatically.

### Public API

```javascript
// Register a plugin (before or after epc-markdown.js loads — see Plugin Authoring)
window.epcMarkdown.use(plugin);

// Render markdown into a container
window.epcMarkdown.render({
  container: document.getElementById('content'),  // required — target element
  markdown: '# Hello world',                       // required — raw markdown string
  // ...any extra properties are forwarded to plugins
});
```

**`render()` pipeline:**
1. Merge plugin `markedConfig` options into `marked.use()`
2. Parse markdown to HTML via `marked.parse()`
3. Run `afterParse` hooks (string transforms)
4. Set `container.innerHTML`
5. Syntax-highlight code blocks via `hljs`
6. Wrap tables in scrollable `.table-wrapper` divs
7. Generate heading IDs with click-to-copy
8. Run `afterRender` hooks (DOM manipulation)

### CSS Design Tokens

`epc-markdown.css` and all plugins reference CSS custom properties. Two options:

1. **Load `epc-tokens.css`** — provides EPCVIP brand defaults (dark theme on `:root`, light via `[data-theme="light"]`)
2. **Define your own `:root`** — override with your app's theme

```css
/* Required by epc-markdown.css + plugins */
--bg-primary, --bg-secondary, --bg-tertiary, --bg-elevated
--text-primary, --text-secondary, --text-muted, --text-disabled
--accent-primary, --accent-primary-hover, --accent-primary-dark
--border-primary, --border-secondary, --border-subtle
--success, --success-bg, --warning, --warning-bg, --error, --error-bg, --info, --info-bg
```

If your app doesn't define these and doesn't load `epc-tokens.css`, the markdown will render without colors.

### Plugin Interface

```javascript
{
  name: 'my-plugin',                          // required — unique identifier
  markedConfig: { breaks: true },             // optional — merged into marked.use()
  afterParse:  function(html, opts) {         // optional — transform HTML string
    return html;
  },
  afterRender: function(container, opts) {    // optional — manipulate rendered DOM
    // Can return a Promise for async work
  },
}
```

### Plugin Authoring Guide

Plugins are app-specific scripts that extend the shared renderer. They live in each consumer's `static/js/plugins/` directory, **not** in the shared module.

**Template for a new plugin:**

```javascript
/**
 * My Plugin for epc-markdown
 * Brief description of what it does.
 */
(function () {
  'use strict';

  var plugin = {
    name: 'my-plugin',
    afterRender: function (container, opts) {
      // Your DOM manipulation here
    },
  };

  // Register with queue fallback for load-order safety.
  // This handles the case where the plugin script loads before
  // epc-markdown.js (common in local dev with CDN fallback).
  if (window.epcMarkdown && window.epcMarkdown.use) {
    window.epcMarkdown.use(plugin);
  } else {
    window.epcMarkdown = window.epcMarkdown || {};
    window.epcMarkdown._pending = window.epcMarkdown._pending || [];
    window.epcMarkdown._pending.push(plugin);
  }
})();
```

**The `_pending` queue pattern is required.** Without it, plugins that load before `epc-markdown.js` (the fallback path in local dev) will silently fail — `window.epcMarkdown.use` doesn't exist yet, the call throws, and the plugin never registers. The queue pattern stores the plugin, and `epc-markdown.js` drains the queue on initialization.

**Plugin inventory:**

| Location | Plugin | Purpose |
|----------|--------|---------|
| **CDN (shared)** | `xp-significance` | Statistical significance text highlighting |
| **CDN (shared)** | `xp-decision-banner` | `:::decision` block rendering |
| **CDN (shared)** | `xp-metric-cards` | `:::metric` card rendering |
| **CDN (shared)** | `xp-checks` | `:::check` / `:::guardrail` rendering |
| **CDN (shared)** | `xp-slack-tables` | Copy-for-Slack table button |
| **CDN (shared)** | `epc-toc` | Floating TOC + mobile accordion |
| experiments-dashboard | `xp-link-handling` | Rewrites relative links for test file viewer |
| docs-site | `docs-mermaid` | Mermaid diagram rendering |
| docs-site | `docs-assets` | Rewrites asset paths for doc images |

---

## CDN Fallback Patterns

Every consumer loads shared files from the CDN first, with a local fallback for when the CDN is unreachable.

### CSS Fallback (inline `onerror`)

```html
<link rel="stylesheet" href="https://epcvip.vip/shared/epc-markdown.css?v=1.4.0"
      onerror="this.onerror=null; this.href='/static/css/shared/epc-markdown.css';">
```

This works because `<link>` `onerror` fires synchronously and swapping `href` triggers a new load.

### JS Fallback (synchronous `document.write`)

```html
<script src="https://epcvip.vip/shared/epc-markdown.js?v=1.4.0"></script>
<script>window.epcMarkdown || document.write('<script src="/static/js/shared/epc-markdown.js"><\/script>');</script>
```

**Why `document.write`?** It inserts a synchronous `<script>` tag into the parsing stream, guaranteeing the fallback loads and executes before any subsequent `<script>` tags (like plugins). This is critical for the plugin registration pattern.

### Broken Pattern (DO NOT USE)

```html
<!-- WRONG: async fallback causes race condition with plugins -->
<script src="CDN_URL"
        onerror="this.onerror=null; var s=document.createElement('script');
                 s.src='/fallback.js'; document.head.appendChild(s);"></script>
```

The `createElement`/`appendChild` approach loads the fallback **asynchronously**. Plugin scripts that follow will execute before the fallback finishes loading, meaning `window.epcMarkdown.use` doesn't exist yet. Even with the `_pending` queue, the IIFE in `epc-markdown.js` hasn't run to drain it. The result: plugins silently fail to register and `render()` produces output without any plugin processing.

---

## Change Workflow

**When you edit any file in `shared/`**, follow this checklist:

1. **Edit the canonical file** in `epcvip-tools-hub/shared/`
2. **Run the sync script** to update consumer fallback copies:
   ```bash
   bash scripts/sync-shared.sh
   ```
3. **Bump version** in `shared/version.json` (patch for fixes, minor for features)
4. **Update version query params** in consumer HTML files that reference `?v=X.Y.Z`
5. **Test locally** in at least one consumer app (use `/dev-server`)
6. **Commit and push** Tools Hub first (deploys CDN source)
7. **Commit and push** each consumer repo (deploys updated fallbacks)
8. **Purge Cloudflare cache** for changed files (see root `CLAUDE.md` for commands)

### Version Query Params

Consumer HTML files reference shared assets with a `?v=X.Y.Z` query parameter for cache busting. After bumping `version.json`, update these references:

| Consumer | Files |
|----------|-------|
| experiments-dashboard | `static/test.html`, `static/guide-markdown.html`, `static/template-sandbox.html`, `static/template-sandbox-checks.html` |
| docs-site | `templates/doc_viewer_markdown.html` |

---

## Adding a New Consumer App

To add markdown rendering to a new EPCVIP app:

1. **Add CSS** to `<head>`:
   ```html
   <link rel="stylesheet" href="https://epcvip.vip/shared/epc-tokens.css?v=1.0.0"
         onerror="this.onerror=null; this.href='/static/css/shared/epc-tokens.css';">
   <link rel="stylesheet" href="https://epcvip.vip/shared/epc-hljs.css?v=2.1.0"
         onerror="this.onerror=null; this.href='/static/css/hljs-epcvip.css';">
   <link rel="stylesheet" href="https://epcvip.vip/shared/epc-markdown.css?v=2.2.0"
         onerror="this.onerror=null; this.href='/static/css/shared/epc-markdown.css';">
   <link rel="stylesheet" href="https://epcvip.vip/shared/epc-markdown-plugin-significance.css?v=1.0.0"
         onerror="this.onerror=null; this.href='/static/css/epc-markdown-plugin-significance.css';">
   <link rel="stylesheet" href="https://epcvip.vip/shared/epc-markdown-plugin-blocks.css?v=1.0.0"
         onerror="this.onerror=null; this.href='/static/css/epc-markdown-plugin-blocks.css';">
   ```

2. **Add JS** before `</body>` (after `marked.js` and `highlight.js`):
   ```html
   <script src="https://epcvip.vip/shared/epc-markdown.js?v=2.2.0"></script>
   <script>window.epcMarkdown || document.write('<script src="/static/js/shared/epc-markdown.js"><\/script>');</script>
   <!-- Add plugins as needed (each with its own fallback) -->
   <script src="https://epcvip.vip/shared/epc-markdown-plugin-checks.js?v=1.0.0"></script>
   <script>(window.epcMarkdown && window.epcMarkdown._plugins['xp-checks']) || document.write('<script src="/static/js/plugins/epc-markdown-plugin-checks.js"><\/script>');</script>
   <!-- Repeat for other plugins: significance, decision-banner, metric-cards, slack-tables, toc -->
   ```

3. **Create fallback copies:**
   ```bash
   mkdir -p static/js/shared static/js/plugins static/css/shared
   cp PATH_TO/epcvip-tools-hub/shared/epc-markdown.js static/js/shared/
   cp PATH_TO/epcvip-tools-hub/shared/epc-markdown.css static/css/shared/
   cp PATH_TO/epcvip-tools-hub/shared/epc-tokens.css static/css/shared/
   cp PATH_TO/epcvip-tools-hub/shared/epc-hljs.css static/css/hljs-epcvip.css
   cp PATH_TO/epcvip-tools-hub/shared/epc-markdown-plugin-*.{css,js} static/js/plugins/
   cp PATH_TO/epcvip-tools-hub/shared/epc-markdown-plugin-*.css static/css/
   ```

4. **Add sync target** in `scripts/sync-shared.sh`

5. **Add a container** with the `markdown-content` class:
   ```html
   <div id="my-content" class="markdown-content"></div>
   ```

6. **Render:**
   ```javascript
   epcMarkdown.render({
     container: document.getElementById('my-content'),
     markdown: myMarkdownString,
   });
   ```

7. **Document** the shared dependency in the new app's `CLAUDE.md`
