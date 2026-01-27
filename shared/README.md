# EPCVIP Shared Components

Shared UI components used across EPCVIP tools.

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

### Sync Process (Manual)

Currently, sidebar HTML is manually synced. See `scripts/sync-sidebar.sh` for reference.

**Files to update when adding a nav item** (paths relative to `utilities/`):
- `ping-tree-compare/static/index.html`
- `experiments-dashboard/static/index.html`
- `athena-usage-monitor-fastapi/static/index.html`
- `../tools/data-platform-assistant/validator-api/static/reports.html` (Reports Dashboard)

### Future Improvement

See backlog item "Sidebar Sync Automation" in `_BACKLOG.md` for long-term solutions:
- Dynamic JS injection
- Build-time templating
- Web Component (`<epc-sidebar>`)

### Usage in a New App

1. Add CSS link with fallback:
   ```html
   <link rel="stylesheet" href="https://epcvip.vip/shared/epc-sidebar.css?v=1.0.2"
         onerror="this.onerror=null; this.href='/static/css/shared/epc-sidebar.css';">
   ```

2. Copy HTML from `epc-sidebar.html`, set `data-current="your-tool-id"`

3. Add JS with fallback before `</body>`:
   ```html
   <script src="https://epcvip.vip/shared/epc-sidebar.js?v=1.0.2"
           onerror="this.onerror=null; var s=document.createElement('script'); s.src='/static/js/shared/epc-sidebar.js'; document.head.appendChild(s);"></script>
   ```

4. Add `epc-content-offset` class to main content container
