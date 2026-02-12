/**
 * EPCVIP Shared Markdown Renderer
 * Shared rendering pipeline with plugin architecture.
 *
 * Requires: marked.js and highlight.js loaded before this script.
 *
 * Public API:
 *   window.epcMarkdown.use(plugin)    — register a plugin
 *   window.epcMarkdown.render(opts)   — render markdown into a container
 *
 * Plugin interface:
 *   {
 *     name: 'my-plugin',                       // required
 *     markedConfig: { breaks: true },           // merged into marked.use()
 *     afterParse:  (html, opts) => html,        // transform HTML string after parse
 *     afterRender: (container, opts) => {},     // run after innerHTML is set
 *   }
 *
 * Render options (opts):
 *   {
 *     container: HTMLElement,     // required — target element
 *     markdown:  string,          // required — raw markdown
 *     ...extra                    // forwarded to plugins
 *   }
 *
 * CDN: https://epcvip.vip/shared/epc-markdown.js?v=X.Y.Z
 */
(function () {
  'use strict';

  var plugins = [];

  /* ── Plugin registration ────────────────────────────── */

  function use(plugin) {
    if (!plugin || !plugin.name) {
      console.warn('[epc-markdown] Plugin must have a name');
      return;
    }
    plugins.push(plugin);
  }

  /* ── Core pipeline ──────────────────────────────────── */

  function render(opts) {
    var container = opts.container;
    var markdown  = opts.markdown;

    if (!container) {
      console.error('[epc-markdown] opts.container is required');
      return Promise.resolve();
    }
    if (!markdown) {
      container.innerHTML = '<div class="error">No markdown content available</div>';
      return Promise.resolve();
    }

    // 1. Configure marked.js with merged plugin configs
    configureMark();

    // 2. Parse markdown → HTML
    var html = window.marked ? window.marked.parse(markdown) : markdown;

    // 3. Run afterParse hooks (synchronous string transforms)
    for (var i = 0; i < plugins.length; i++) {
      if (typeof plugins[i].afterParse === 'function') {
        html = plugins[i].afterParse(html, opts) || html;
      }
    }

    // 4. Inject into DOM
    container.innerHTML = html;

    // 5. Syntax highlighting
    highlightCode(container);

    // 6. Wrap tables in scrollable containers
    wrapTables(container);

    // 7. Generate heading IDs + click-to-copy
    linkifyHeadings(container);

    // 8. Run afterRender hooks (DOM manipulation)
    var promises = [];
    for (var j = 0; j < plugins.length; j++) {
      if (typeof plugins[j].afterRender === 'function') {
        var result = plugins[j].afterRender(container, opts);
        if (result && typeof result.then === 'function') {
          promises.push(result);
        }
      }
    }

    return promises.length > 0 ? Promise.all(promises) : Promise.resolve();
  }

  /* ── marked.js configuration ────────────────────────── */

  var configured = false;

  function configureMark() {
    if (configured || !window.marked) return;
    configured = true;

    // Base config
    var baseConfig = {
      gfm: true,
      breaks: false,
    };

    // Merge plugin configs (later plugins win on conflict)
    for (var i = 0; i < plugins.length; i++) {
      var pc = plugins[i].markedConfig;
      if (pc) {
        for (var key in pc) {
          if (pc.hasOwnProperty(key)) {
            baseConfig[key] = pc[key];
          }
        }
      }
    }

    window.marked.use(baseConfig);
  }

  /* ── Syntax highlighting ────────────────────────────── */

  function highlightCode(container) {
    if (!window.hljs) return;
    var blocks = container.querySelectorAll('pre code');
    for (var i = 0; i < blocks.length; i++) {
      window.hljs.highlightElement(blocks[i]);
    }
  }

  /* ── Table wrapping ─────────────────────────────────── */

  function wrapTables(container) {
    var tables = container.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      if (table.parentElement && table.parentElement.classList.contains('table-wrapper')) continue;
      var wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  }

  /* ── Heading IDs + click-to-copy ────────────────────── */

  function linkifyHeadings(container) {
    var headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (var i = 0; i < headings.length; i++) {
      var heading = headings[i];
      var id = heading.textContent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!id) continue;
      heading.id = id;
      heading.style.cursor = 'pointer';
      heading.addEventListener('click', headingClickHandler(id));
    }
  }

  function headingClickHandler(id) {
    return function () {
      window.location.hash = id;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).catch(function () {});
      }
    };
  }

  /* ── Public API ─────────────────────────────────────── */

  window.epcMarkdown = {
    use: use,
    render: render,
    // Expose helpers for plugins that need them
    _highlightCode: highlightCode,
    _wrapTables: wrapTables,
  };
})();
