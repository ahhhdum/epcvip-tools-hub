/**
 * Shared DOM stubs for Node.js vm-based unit tests.
 *
 * Extracted from experiments-dashboard/tests/js/test_significance_xss.js
 * and extended for epc-markdown core + plugin testing.
 *
 * Run: require('./stubs') → { buildSandbox, makeElement, ... }
 */
'use strict';

// ── Element stub ──────────────────────────────────────────────

function makeElement(tag) {
  var children = [];
  var attrs = {};
  var element = {
    nodeType: 1,
    tagName: (tag || 'DIV').toUpperCase(),
    className: '',
    children: children,
    childNodes: children,
    id: '',
    style: {},
    dataset: {},
    appendChild: function (child) {
      children.push(child);
      child.parentNode = element;
      child.parentElement = element;
      return child;
    },
    insertBefore: function (newChild, refChild) {
      var idx = children.indexOf(refChild);
      if (idx === -1) { children.push(newChild); } else { children.splice(idx, 0, newChild); }
      newChild.parentNode = element;
      newChild.parentElement = element;
      return newChild;
    },
    removeChild: function (child) {
      var idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      child.parentNode = null;
      child.parentElement = null;
      return child;
    },
    replaceChild: function (newChild, oldChild) {
      var idx = children.indexOf(oldChild);
      if (idx === -1) return oldChild;
      if (newChild.nodeType === 11) {
        var fragChildren = newChild.childNodes.slice();
        children.splice.apply(children, [idx, 1].concat(fragChildren));
        fragChildren.forEach(function (c) { c.parentNode = element; c.parentElement = element; });
      } else {
        children[idx] = newChild;
        newChild.parentNode = element;
        newChild.parentElement = element;
      }
      return oldChild;
    },
    setAttribute: function (k, v) { attrs[k] = v; },
    getAttribute: function (k) { return attrs[k] !== undefined ? attrs[k] : null; },
    hasAttribute: function (k) { return attrs[k] !== undefined; },
    addEventListener: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    closest: function () { return null; },
    parentElement: null,
    parentNode: null,
    nextSibling: null,
    classList: {
      _classes: [],
      add: function (c) { if (this._classes.indexOf(c) === -1) this._classes.push(c); },
      remove: function (c) { this._classes = this._classes.filter(function (x) { return x !== c; }); },
      contains: function (c) { return this._classes.indexOf(c) !== -1; },
      toggle: function (c) { if (this.contains(c)) { this.remove(c); } else { this.add(c); } }
    },
    get textContent() {
      return children.map(function (c) {
        if (c._isTextNode) return c.nodeValue;
        if (c.textContent !== undefined) return c.textContent;
        return '';
      }).join('');
    },
    get innerHTML() {
      return children.map(function (c) {
        if (c._isTextNode) {
          return c.nodeValue
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }
        if (c.nodeType === 1) {
          var cls = c.className ? ' class="' + c.className + '"' : '';
          return '<' + c.tagName.toLowerCase() + cls + '>' + c.innerHTML + '</' + c.tagName.toLowerCase() + '>';
        }
        return '';
      }).join('');
    },
    set innerHTML(val) {
      children.length = 0;
    }
  };
  return element;
}

// ── Text node stub ────────────────────────────────────────────

function createTextNode(text) {
  return { nodeType: 3, nodeName: '#text', nodeValue: text, _isTextNode: true, parentNode: null, parentElement: null };
}

// ── Document fragment stub ────────────────────────────────────

function createDocumentFragment() {
  var children = [];
  return {
    nodeType: 11,
    childNodes: children,
    appendChild: function (child) { children.push(child); return child; }
  };
}

// ── TreeWalker stub ───────────────────────────────────────────

function createTreeWalker(root, whatToShow, filter) {
  var textNodes = [];
  function walk(node) {
    if (!node) return;
    var kids = node.childNodes || node.children || [];
    for (var i = 0; i < kids.length; i++) {
      var child = kids[i];
      if (child._isTextNode) {
        var result = filter && filter.acceptNode ? filter.acceptNode(child) : 1;
        if (result === 1) textNodes.push(child);
      } else {
        walk(child);
      }
    }
  }
  walk(root);
  var idx = -1;
  return {
    nextNode: function () {
      idx++;
      return idx < textNodes.length ? textNodes[idx] : null;
    }
  };
}

// ── Full document stub ────────────────────────────────────────

function buildDocumentStub() {
  var bodyElement = makeElement('BODY');
  return {
    createElement: function (tag) { return makeElement(tag); },
    createTextNode: createTextNode,
    createDocumentFragment: createDocumentFragment,
    createTreeWalker: createTreeWalker,
    body: bodyElement,
    readyState: 'complete',
    querySelector: function (sel) {
      if (sel === '.markdown-body') return bodyElement;
      return null;
    },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}
  };
}

// ── Marked.js stub ────────────────────────────────────────────
// Returns input as-is (afterParse tests don't need real markdown parsing)

function buildMarkedStub() {
  var config = {};
  return {
    parse: function (md) { return md; },
    use: function (opts) {
      for (var key in opts) {
        if (opts.hasOwnProperty(key)) config[key] = opts[key];
      }
    },
    _config: config
  };
}

// ── Full sandbox builder ──────────────────────────────────────
// Creates a vm-ready sandbox with all stubs wired together.

function buildSandbox(opts) {
  opts = opts || {};
  var doc = buildDocumentStub();
  var marked = opts.marked || buildMarkedStub();
  var warnings = [];

  var windowStub = {
    marked: marked,
    epcMarkdown: opts.epcMarkdown || undefined,
    addEventListener: function () {},
    matchMedia: function () { return { matches: false, addEventListener: function () {} }; },
    location: { hash: '', href: 'http://localhost/' },
  };

  // If no epcMarkdown provided, leave it undefined so the IIFE
  // creates it (or uses _pending queue depending on load order)

  return {
    document: doc,
    window: windowStub,
    navigator: { clipboard: null },
    NodeFilter: { FILTER_ACCEPT: 1, FILTER_REJECT: 2, SHOW_TEXT: 4 },
    MutationObserver: function () { return { observe: function () {}, disconnect: function () {} }; },
    IntersectionObserver: function () { return { observe: function () {}, disconnect: function () {} }; },
    requestAnimationFrame: function (fn) { fn(); },
    setTimeout: function (fn) { fn(); },
    Object: Object,
    Array: Array,
    Math: Math,
    RegExp: RegExp,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    Promise: Promise,
    console: {
      log: function () {},
      warn: function () { warnings.push(Array.prototype.slice.call(arguments).join(' ')); },
      error: function () {}
    },
    _warnings: warnings
  };
}

// ── Test runner helpers ───────────────────────────────────────

var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + message);
  } else {
    failed++;
    console.error('  FAIL: ' + message);
  }
}

function assertContains(haystack, needle, message) {
  assert(haystack.indexOf(needle) !== -1, message + ' (contains "' + needle + '")');
}

function assertNotContains(haystack, needle, message) {
  assert(haystack.indexOf(needle) === -1, message + ' (must not contain "' + needle + '")');
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, message + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

function summary() {
  console.log('\n---');
  console.log('Passed: ' + passed + '  Failed: ' + failed);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All tests passed.\n');
    process.exit(0);
  }
}

function resetCounters() {
  passed = 0;
  failed = 0;
}

// ── Exports ───────────────────────────────────────────────────

module.exports = {
  makeElement: makeElement,
  createTextNode: createTextNode,
  createDocumentFragment: createDocumentFragment,
  createTreeWalker: createTreeWalker,
  buildDocumentStub: buildDocumentStub,
  buildMarkedStub: buildMarkedStub,
  buildSandbox: buildSandbox,
  assert: assert,
  assertContains: assertContains,
  assertNotContains: assertNotContains,
  assertEqual: assertEqual,
  summary: summary,
  resetCounters: resetCounters,
  get passed() { return passed; },
  get failed() { return failed; },
};
