/**
 * EPCVIP Shared Header — Web Component + Legacy Enhancement
 *
 * Usage (new — web component):
 *   <epc-header current="tool-id" app-name="App Name"></epc-header>
 *   The element generates header markup in light DOM on connect.
 *
 * Usage (legacy — existing markup):
 *   <header class="epc-header" id="epc-header">...</header>
 *   <div class="epc-app-switcher-dropdown" id="epc-app-switcher-dropdown" hidden></div>
 *   body[data-current]  — tool id for highlighting
 *   body[data-epc-app]  — display name
 *
 * Custom events dispatched:
 *   "epc-header:sidebar-toggle"  — fired on document when sidebar toggle is clicked
 *
 * Public API:
 *   window.epcHeader.setUser(email, logoutFn)
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
    { id: 'funnel-lab',      appId: 'funnel-step-lab',      icon: '\u{1F9E9}', label: 'Funnel Lab',         url: 'https://lab.epcvip.vip' },
  ];

  /* ── Visibility filtering ───────────────────────── */
  var DEFAULT_APP_IDS = [
    'tools-hub', 'ping-tree-compare', 'experiments-dashboard',
    'athena-monitor', 'reports-dashboard', 'funnel-analyzer'
  ];

  function getVisibleAppIds() {
    var match = document.cookie.match(/(?:^|;\s*)epc_visible_apps=([^;]*)/);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]).split(',');
    } catch (e) {
      return null;
    }
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

  /* ── HTML escape ───────────────────────────────── */
  var _escEl = document.createElement('div');
  function esc(str) {
    _escEl.textContent = str;
    return _escEl.innerHTML;
  }

  /* ── Shared state ──────────────────────────────── */
  var _switcherBtn = null;
  var _dropdown = null;

  /* ── Dropdown ───────────────────────────────────── */
  function populateDropdown(currentTool) {
    if (!_dropdown) return;
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
    _dropdown.innerHTML = html;
  }

  function openSwitcher() {
    if (!_dropdown || !_switcherBtn) return;
    _dropdown.hidden = false;
    _switcherBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSwitcher() {
    if (!_dropdown || !_switcherBtn) return;
    _dropdown.hidden = true;
    _switcherBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleSwitcher() {
    if (!_dropdown) return;
    if (_dropdown.hidden) { openSwitcher(); } else { closeSwitcher(); }
  }

  /* ── Sidebar toggle ────────────────────────────── */
  function toggleSidebar() {
    document.dispatchEvent(new CustomEvent('epc-header:sidebar-toggle'));
  }

  /* ── setUser convenience API ───────────────────── */
  function setUser(email, logoutFn) {
    var el = document.getElementById('userEmail');
    if (el) el.textContent = email || '';
    if (typeof logoutFn === 'function') {
      window.logout = logoutFn;
    }
  }

  /* ── Wire up behavior on existing DOM ──────────── */
  function initBehavior(currentTool) {
    _switcherBtn = document.getElementById('epc-app-switcher');
    _dropdown = document.getElementById('epc-app-switcher-dropdown');

    if (_switcherBtn) {
      _switcherBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSwitcher();
      });
    }

    populateDropdown(currentTool);

    var sidebarToggleBtn = document.getElementById('epc-sidebar-toggle');
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }
  }

  /* ── Web Component: <epc-header> ───────────────── */
  class EpcHeader extends HTMLElement {
    connectedCallback() {
      if (this.querySelector('.epc-header')) return;

      var current = this.getAttribute('current') || '';
      var appName = this.getAttribute('app-name') || '';

      this.innerHTML =
        '<header class="epc-header" id="epc-header">' +
          '<button class="epc-header-app-switcher" id="epc-app-switcher" type="button"' +
          ' aria-label="App switcher" aria-expanded="false">' +
            '<svg viewBox="0 0 24 24" fill="currentColor">' +
              '<rect x="3" y="3" width="7" height="7" rx="1.5"/>' +
              '<rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
              '<rect x="3" y="14" width="7" height="7" rx="1.5"/>' +
              '<rect x="14" y="14" width="7" height="7" rx="1.5"/>' +
            '</svg>' +
          '</button>' +
          '<div class="epc-header-brand">' +
            '<a href="https://epcvip.vip" class="epc-header-logo">EPCVIP</a>' +
            '<span class="epc-header-separator">/</span>' +
            '<span class="epc-header-app-name">' + esc(appName) + '</span>' +
          '</div>' +
          '<div class="epc-header-spacer"></div>' +
          '<div class="epc-header-user">' +
            '<span id="userEmail"></span>' +
            '<a href="#" class="epc-header-signout" onclick="logout(); return false;">Sign out</a>' +
          '</div>' +
        '</header>' +
        '<div class="epc-app-switcher-dropdown" id="epc-app-switcher-dropdown" hidden></div>';

      initBehavior(current);
    }
  }

  /* ── Global event listeners ────────────────────── */
  document.addEventListener('click', function (e) {
    if (!_dropdown || _dropdown.hidden) return;
    if (_switcherBtn && _switcherBtn.contains(e.target)) return;
    if (_dropdown.contains(e.target)) return;
    closeSwitcher();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _dropdown && !_dropdown.hidden) {
      closeSwitcher();
      if (_switcherBtn) _switcherBtn.focus();
    }
  });

  /* ── Register custom element ───────────────────── */
  if (!customElements.get('epc-header')) {
    customElements.define('epc-header', EpcHeader);
  }

  /* ── Legacy path: enhance existing <header class="epc-header"> ── */
  if (!document.querySelector('epc-header')) {
    var currentTool = document.body.dataset.current || '';
    initBehavior(currentTool);
  }

  /* ── Public API ────────────────────────────────── */
  window.epcHeader = {
    setUser: setUser,
    toggleSidebar: toggleSidebar,
    openSwitcher: openSwitcher,
    closeSwitcher: closeSwitcher,
  };
})();
