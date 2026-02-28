/**
 * Core renderer unit tests for epc-markdown.js
 *
 * Tests: use(), _plugins map, _pending queue drain, render() pipeline,
 * invalid plugin handling.
 *
 * Run: node shared/tests/test_core.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var stubs = require('./stubs.cjs');

var coreSrc = fs.readFileSync(
  path.join(__dirname, '..', 'epc-markdown.js'), 'utf8'
);

// Helper: load core into a fresh sandbox
function loadCore(opts) {
  var sandbox = stubs.buildSandbox(opts);
  vm.createContext(sandbox);
  vm.runInNewContext(coreSrc, sandbox);
  return sandbox;
}

// Helper: load a plugin source file into an existing sandbox
function loadPlugin(sandbox, filename) {
  var src = fs.readFileSync(
    path.join(__dirname, '..', filename), 'utf8'
  );
  vm.runInNewContext(src, sandbox);
}


// ── Tests ────────────────────────────────────────────────────

console.log('\n=== Plugin registration via use() ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  md.use({ name: 'test-plugin-a', afterParse: function (h) { return h; } });
  stubs.assert(md._plugins['test-plugin-a'] !== undefined, 'use() populates _plugins map');
  stubs.assert(typeof md._plugins['test-plugin-a'].afterParse === 'function', '_plugins entry has afterParse');
})();

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  md.use({ name: 'alpha' });
  md.use({ name: 'beta' });
  md.use({ name: 'gamma' });

  stubs.assert(md._plugins['alpha'] !== undefined, 'first plugin registered');
  stubs.assert(md._plugins['beta'] !== undefined, 'second plugin registered');
  stubs.assert(md._plugins['gamma'] !== undefined, 'third plugin registered');
})();


console.log('\n=== Duplicate plugin names: last-write wins ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  md.use({ name: 'dup', version: 1 });
  md.use({ name: 'dup', version: 2 });

  stubs.assertEqual(md._plugins['dup'].version, 2, 'last-write wins for duplicate names');
})();


console.log('\n=== _pending queue: plugins registered before core loads ===');

(function () {
  // Simulate plugins that load before epc-markdown.js:
  // They push to window.epcMarkdown._pending
  var sandbox = stubs.buildSandbox({
    epcMarkdown: {
      _pending: [
        { name: 'early-bird-a', afterParse: function (h) { return h + '-A'; } },
        { name: 'early-bird-b', afterParse: function (h) { return h + '-B'; } },
      ]
    }
  });
  // Copy the pending ref to window
  sandbox.window.epcMarkdown = sandbox.window.epcMarkdown;

  vm.createContext(sandbox);
  vm.runInNewContext(coreSrc, sandbox);

  var md = sandbox.window.epcMarkdown;
  stubs.assert(md._plugins['early-bird-a'] !== undefined, 'queued plugin A drained on init');
  stubs.assert(md._plugins['early-bird-b'] !== undefined, 'queued plugin B drained on init');
})();


console.log('\n=== _pending queue: plugins registered after core loads go directly to use() ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  // After core loads, plugins call use() directly
  md.use({ name: 'late-plugin' });
  stubs.assert(md._plugins['late-plugin'] !== undefined, 'post-load plugin registers via use()');
})();


console.log('\n=== _pending queue drain preserves order ===');

(function () {
  var order = [];
  var sandbox = stubs.buildSandbox({
    epcMarkdown: {
      _pending: [
        { name: 'first', afterParse: function (h) { order.push('first'); return h; } },
        { name: 'second', afterParse: function (h) { order.push('second'); return h; } },
        { name: 'third', afterParse: function (h) { order.push('third'); return h; } },
      ]
    }
  });
  sandbox.window.epcMarkdown = sandbox.window.epcMarkdown;

  vm.createContext(sandbox);
  vm.runInNewContext(coreSrc, sandbox);

  var md = sandbox.window.epcMarkdown;
  var container = stubs.makeElement('DIV');
  md.render({ container: container, markdown: 'test' });

  stubs.assertEqual(order.join(','), 'first,second,third', 'pending queue drained in order');
})();


console.log('\n=== render() calls afterParse hooks in registration order ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  md.use({ name: 'p1', afterParse: function (h) { return h + '[p1]'; } });
  md.use({ name: 'p2', afterParse: function (h) { return h + '[p2]'; } });
  md.use({ name: 'p3', afterParse: function (h) { return h + '[p3]'; } });

  var container = stubs.makeElement('DIV');
  md.render({ container: container, markdown: 'base' });

  // marked stub returns input as-is, so the pipeline is:
  // marked.parse('base') → 'base' → afterParse chains → 'base[p1][p2][p3]'
  // Then container.innerHTML is set (which clears children in our stub)
  // We can't read innerHTML after set (stub clears children), but we can
  // verify by capturing in a hook:
  var captured = '';
  md.use({ name: 'p4', afterParse: function (h) { captured = h; return h; } });
  md.render({ container: container, markdown: 'base' });

  // p4 sees the result of p1+p2+p3 applied first
  stubs.assertContains(captured, 'base[p1][p2][p3]', 'afterParse hooks called in registration order');
})();


console.log('\n=== render() passes opts through to plugins ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  var receivedOpts = null;
  md.use({
    name: 'opts-test',
    afterParse: function (h, opts) { receivedOpts = opts; return h; }
  });

  var container = stubs.makeElement('DIV');
  var opts = { container: container, markdown: 'test', customFlag: 'hello' };
  md.render(opts);

  stubs.assert(receivedOpts !== null, 'afterParse receives opts');
  stubs.assertEqual(receivedOpts.customFlag, 'hello', 'custom opts field passed through');
  stubs.assertEqual(receivedOpts.markdown, 'test', 'markdown field present in opts');
})();


console.log('\n=== render() with no markdown shows error div ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  var container = stubs.makeElement('DIV');
  // innerHTML setter in stub clears children — but the production code
  // sets container.innerHTML = '<div class="error">...'
  // We can verify the function doesn't throw
  var result = md.render({ container: container, markdown: '' });
  stubs.assert(result !== undefined, 'render with empty markdown returns promise');
})();

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  var container = stubs.makeElement('DIV');
  var result = md.render({ container: container, markdown: null });
  stubs.assert(result !== undefined, 'render with null markdown returns promise');
})();


console.log('\n=== render() with no container logs error ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  // Should not throw
  var result = md.render({ markdown: 'test' });
  stubs.assert(result !== undefined, 'render with no container returns without throwing');
})();


console.log('\n=== Invalid plugin (no name) logs warning, does not crash ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  // Should not throw
  md.use({ afterParse: function (h) { return h; } });
  md.use(null);
  md.use(undefined);
  md.use({});

  stubs.assert(sandbox._warnings.length > 0, 'warning logged for plugin without name');
  // Verify core still works after bad plugins
  md.use({ name: 'after-bad' });
  stubs.assert(md._plugins['after-bad'] !== undefined, 'core works after invalid plugin attempts');
})();


console.log('\n=== afterParse returning falsy falls back to previous html ===');

(function () {
  var sandbox = loadCore();
  var md = sandbox.window.epcMarkdown;

  // A plugin that returns undefined/null — core should keep the previous HTML
  md.use({ name: 'void-return', afterParse: function () { /* returns undefined */ } });
  md.use({ name: 'checker', afterParse: function (h) { return h + '[checked]'; } });

  var captured = '';
  md.use({ name: 'capturer', afterParse: function (h) { captured = h; return h; } });

  var container = stubs.makeElement('DIV');
  md.render({ container: container, markdown: 'input' });

  // void-return returns undefined, so core uses fallback (previous html 'input')
  // checker then appends [checked]
  stubs.assertContains(captured, 'input[checked]', 'falsy afterParse return preserves previous html');
})();


console.log('\n=== Real plugin loading: decision-banner registers correctly ===');

(function () {
  var sandbox = loadCore();
  loadPlugin(sandbox, 'epc-markdown-plugin-decision-banner.js');

  var md = sandbox.window.epcMarkdown;
  stubs.assert(md._plugins['xp-decision-banner'] !== undefined, 'decision-banner plugin registered');
  stubs.assert(typeof md._plugins['xp-decision-banner'].afterParse === 'function', 'decision-banner has afterParse');
})();


console.log('\n=== Real plugin loading: metric-cards registers correctly ===');

(function () {
  var sandbox = loadCore();
  loadPlugin(sandbox, 'epc-markdown-plugin-metric-cards.js');

  var md = sandbox.window.epcMarkdown;
  stubs.assert(md._plugins['xp-metric-cards'] !== undefined, 'metric-cards plugin registered');
  stubs.assert(typeof md._plugins['xp-metric-cards'].afterParse === 'function', 'metric-cards has afterParse');
  stubs.assert(typeof md._plugins['xp-metric-cards'].afterRender === 'function', 'metric-cards has afterRender');
})();


console.log('\n=== Real plugin loading: checks registers correctly ===');

(function () {
  var sandbox = loadCore();
  // checks plugin calls fetch() on load — need to stub it
  sandbox.fetch = function () { return Promise.resolve({ ok: false }); };
  loadPlugin(sandbox, 'epc-markdown-plugin-checks.js');

  var md = sandbox.window.epcMarkdown;
  stubs.assert(md._plugins['xp-checks'] !== undefined, 'checks plugin registered');
  stubs.assert(typeof md._plugins['xp-checks'].afterParse === 'function', 'checks has afterParse');
  stubs.assert(typeof md._plugins['xp-checks'].afterRender === 'function', 'checks has afterRender');
})();


console.log('\n=== Real plugin loading: slack-tables registers correctly ===');

(function () {
  var sandbox = loadCore();
  loadPlugin(sandbox, 'epc-markdown-plugin-slack-tables.js');

  var md = sandbox.window.epcMarkdown;
  stubs.assert(md._plugins['xp-slack-tables'] !== undefined, 'slack-tables plugin registered');
  stubs.assert(typeof md._plugins['xp-slack-tables'].afterRender === 'function', 'slack-tables has afterRender');
})();


console.log('\n=== Real plugin loading: all plugins coexist ===');

(function () {
  var sandbox = loadCore();
  sandbox.fetch = function () { return Promise.resolve({ ok: false }); };

  loadPlugin(sandbox, 'epc-markdown-plugin-decision-banner.js');
  loadPlugin(sandbox, 'epc-markdown-plugin-metric-cards.js');
  loadPlugin(sandbox, 'epc-markdown-plugin-checks.js');
  loadPlugin(sandbox, 'epc-markdown-plugin-slack-tables.js');

  var md = sandbox.window.epcMarkdown;
  stubs.assertEqual(Object.keys(md._plugins).length, 4, 'all 4 plugins registered');

  // Render with all plugins — should not crash
  var container = stubs.makeElement('DIV');
  md.render({ container: container, markdown: '# Hello\nSome text' });
  stubs.assert(true, 'render with all plugins does not throw');
})();


console.log('\n=== _pending queue: plugin loads before core, then core drains ===');

(function () {
  // Simulate: plugin IIFE runs first, pushes to _pending
  var preSandbox = stubs.buildSandbox();
  vm.createContext(preSandbox);

  // Load decision-banner BEFORE core
  var bannerSrc = fs.readFileSync(
    path.join(__dirname, '..', 'epc-markdown-plugin-decision-banner.js'), 'utf8'
  );
  vm.runInNewContext(bannerSrc, preSandbox);

  // Verify it queued to _pending
  stubs.assert(
    preSandbox.window.epcMarkdown && preSandbox.window.epcMarkdown._pending,
    'plugin creates _pending queue when core absent'
  );
  stubs.assertEqual(
    preSandbox.window.epcMarkdown._pending.length, 1,
    'one plugin in pending queue'
  );

  // Now load core — it should drain the queue
  vm.runInNewContext(coreSrc, preSandbox);

  var md = preSandbox.window.epcMarkdown;
  stubs.assert(md._plugins['xp-decision-banner'] !== undefined, 'pending plugin drained on core load');
  stubs.assert(typeof md.use === 'function', 'core use() available after drain');
})();


// ── Summary ──

stubs.summary();
