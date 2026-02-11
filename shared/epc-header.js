/**
 * EPCVIP Shared Header
 * App switcher dropdown, sidebar toggle event dispatch, current app detection.
 *
 * Configuration:
 *   body[data-epc-app]   — display name for the current app (e.g. "Documentation")
 *   body[data-current]   — tool id for highlighting in the switcher (e.g. "docs")
 *
 * Custom events dispatched:
 *   "epc-header:sidebar-toggle"  — fired on document when sidebar toggle is clicked
 *
 * Public API:
 *   window.epcHeader.toggleSidebar()
 *   window.epcHeader.openSwitcher()
 *   window.epcHeader.closeSwitcher()
 */
(function () {
  'use strict';

  /* ── Nav items (single source of truth) ───────── */
  var NAV_ITEMS = [
    { id: 'tools-hub',       appId: 'tools-hub',            icon: '\u{1F3E0}', label: 'Tools Hub',          url: 'https://epcvip.vip' },
    { id: 'ping-tree',       appId: 'ping-tree-compare',    icon: '\u{1F333}', label: 'Ping Tree Compare',  url: 'https://compare.epcvip.vip' },
    { id: 'experiments',     appId: 'experiments-dashboard', icon: '\u{1F9EA}', label: 'Experiments',         url: 'https://xp.epcvip.vip' },
    { id: 'athena',          appId: 'athena-monitor',       icon: '\u26A1',     label: 'Athena Monitor',     url: 'https://athena.epcvip.vip' },
    { id: 'reports',         appId: 'reports-dashboard',    icon: '\u{1F4CA}', label: 'Reports Dashboard',   url: 'https://reports.epcvip.vip' },
    { id: 'funnel-analyzer', appId: 'funnel-analyzer',      icon: '\u{1F50D}', label: 'Funnel Analyzer',    url: 'https://tools.epcvip.vip' },
    { id: 'docs',            appId: 'docs-site',            icon: '\u{1F4D6}', label: 'Documentation',      url: 'https://docs.epcvip.vip' },
    { id: 'admin',           appId: 'epcvip-admin',         icon: '\u{1F527}', label: 'Admin',              url: 'https://admin.epcvip.vip' },
    { id: 'funnel-lab',      appId: 'funnel-step-lab',      icon: '\u{1F9E9}', label: 'Funnel Lab',         url: 'https://funnel-lab.epcvip.vip' },
  ];

  /* ── Visibility filtering ───────────────────────── */
  var DEFAULT_APP_IDS = [
    'tools-hub', 'ping-tree-compare', 'experiments-dashboard',
    'athena-monitor', 'reports-dashboard', 'funnel-analyzer'
  ];

  function getVisibleAppIds() {
    var match = document.cookie.match(/(?:^|;\s*)epc_visible_apps=([^;]*)/);
    if (!match) return null;
    return decodeURIComponent(match[1]).split(',');
  }

  function getFilteredNavItems() {
    var visible = getVisibleAppIds();
    if (!visible) {
      return NAV_ITEMS.filter(function(item) {
        return DEFAULT_APP_IDS.indexOf(item.appId) !== -1;
      });
    }
    return NAV_ITEMS.filter(function(item) {
      return visible.indexOf(item.appId) !== -1;
    });
  }

  var currentTool = document.body.dataset.current || '';

  /* ── App switcher dropdown ────────────────────── */
  var switcherBtn = document.getElementById('epc-app-switcher');
  var dropdown = document.getElementById('epc-app-switcher-dropdown');

  function populateDropdown() {
    if (!dropdown) return;
    var items = getFilteredNavItems();
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var isCurrent = item.id === currentTool;
      html +=
        '<a class="epc-switcher-item' + (isCurrent ? ' is-current' : '') + '"' +
        ' href="' + item.url + '"' +
        ' data-tool="' + item.id + '">' +
        '<span class="epc-switcher-icon">' + item.icon + '</span>' +
        '<span class="epc-switcher-label">' + item.label + '</span>' +
        (isCurrent ? '<span class="epc-switcher-current" aria-label="Current app"></span>' : '') +
        '</a>';
    }
    dropdown.innerHTML = html;
  }

  function openSwitcher() {
    if (!dropdown || !switcherBtn) return;
    dropdown.hidden = false;
    switcherBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSwitcher() {
    if (!dropdown || !switcherBtn) return;
    dropdown.hidden = true;
    switcherBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleSwitcher() {
    if (!dropdown) return;
    if (dropdown.hidden) {
      openSwitcher();
    } else {
      closeSwitcher();
    }
  }

  if (switcherBtn) {
    switcherBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSwitcher();
    });
  }

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!dropdown || dropdown.hidden) return;
    if (switcherBtn && switcherBtn.contains(e.target)) return;
    if (dropdown.contains(e.target)) return;
    closeSwitcher();
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dropdown && !dropdown.hidden) {
      closeSwitcher();
      if (switcherBtn) switcherBtn.focus();
    }
  });

  populateDropdown();

  /* ── Sidebar toggle ───────────────────────────── */
  var sidebarToggleBtn = document.getElementById('epc-sidebar-toggle');

  function toggleSidebar() {
    document.dispatchEvent(new CustomEvent('epc-header:sidebar-toggle'));
  }

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
  }

  /* ── Public API ───────────────────────────────── */
  window.epcHeader = {
    toggleSidebar: toggleSidebar,
    openSwitcher: openSwitcher,
    closeSwitcher: closeSwitcher,
  };
})();
