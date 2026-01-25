/**
 * EPCVIP Cross-Tool Navigation Sidebar
 * JavaScript controller for toggle, close, and keyboard handling
 */

(function () {
  'use strict';

  // Wait for DOM to be ready
  function init() {
    const sidebar = document.getElementById('epc-sidebar');
    const overlay = document.getElementById('epc-overlay');
    const toggle = document.getElementById('epc-toggle');
    const mobileToggle = document.getElementById('epc-mobile-toggle');

    if (!sidebar) {
      console.warn('EPC Sidebar: #epc-sidebar not found');
      return;
    }

    function openSidebar() {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('visible');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('visible');
    }

    function toggleSidebar() {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }

    // Toggle on hamburger click
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSidebar();
      });
    }

    // Mobile toggle
    if (mobileToggle) {
      mobileToggle.addEventListener('click', openSidebar);
    }

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeSidebar();
      }
    });

    // Highlight current tool based on data-current attribute
    const currentTool = sidebar.dataset.current;
    if (currentTool) {
      document.querySelectorAll('.epc-nav-item').forEach(function (item) {
        item.classList.remove('active');
        if (item.dataset.tool === currentTool) {
          item.classList.add('active');
        }
      });
    }

    // Expose API for programmatic control
    window.epcSidebar = {
      open: openSidebar,
      close: closeSidebar,
      toggle: toggleSidebar,
    };
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
