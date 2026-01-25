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

| App | URL | Status |
|-----|-----|--------|
| Ping Tree Compare | `compare.epcvip.vip` | Deployed |
| Experiments Dashboard | `xp.epcvip.vip` | Deployed |
| Athena Monitor | `athena.epcvip.vip` | Deployed |
| Reports Dashboard | `reports.epcvip.vip` | Deployed |
| Funnel Analyzer | `tools.epcvip.vip` | Planned |

### Adding a New Nav Item

1. Update `epc-sidebar.html` (the source template)
2. Copy the nav item HTML to each app's `index.html`
3. Push each repo to deploy

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
   <link rel="stylesheet" href="https://epcvip.vip/shared/epc-sidebar.css?v=1.0.1"
         onerror="this.onerror=null; this.href='/static/css/shared/epc-sidebar.css';">
   ```

2. Copy HTML from `epc-sidebar.html`, set `data-current="your-tool-id"`

3. Add JS with fallback before `</body>`:
   ```html
   <script src="https://epcvip.vip/shared/epc-sidebar.js?v=1.0.1"
           onerror="this.onerror=null; var s=document.createElement('script'); s.src='/static/js/shared/epc-sidebar.js'; document.head.appendChild(s);"></script>
   ```

4. Add `epc-content-offset` class to main content container
