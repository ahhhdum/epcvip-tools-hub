/**
 * Statistical Significance Highlighting Plugin for epc-markdown
 *
 * Highlights keywords like "statistically significant", "p < 0.05", etc.
 * in rendered markdown content. Uses TreeWalker for safe DOM traversal,
 * skipping code blocks, links, and pre elements.
 *
 * Categories:
 *   .sig-positive   (green)  — confirmed statistical significance
 *   .sig-negative   (gray)   — not significant / inconclusive
 *   .sig-borderline  (orange) — marginal / trending
 *
 * Processing order: negative → borderline → positive
 * (Negative first to prevent "not significant" → "significant" false match)
 *
 * CSS: load epc-markdown-plugin-significance.css alongside this script.
 */
(function () {
  'use strict';

  var SIGNIFICANCE_PATTERNS = {
    negative: [
      /\bnot\s+statistically\s+significant\b/gi,
      /\bnot\s+significant\b/gi,
      /\bnot\s+supported\b/gi,
      /\bstatistically\s+identical\b/gi,
      /\bno\s+significant\s+difference\b/gi,
      /\bp\s*[>=≥]\s*0\.\d+/gi,
    ],
    borderline: [
      /\bmarginally\s+significant\b/gi,
      /\bdirectional\s+(signal|trend)\b/gi,
      /\btrending\s+toward\s+significance\b/gi,
    ],
    positive: [
      /\bstatistically\s+significant\b/gi,
      /\bhighly\s+significant\b/gi,
      /\bsupported\b(?!\s+by)/gi,
      /\bp\s*<\s*0\.0[0-5]\d*/gi,
      /\b95%\s*confidence\b/gi,
      /\b99%\s*confidence\b/gi,
    ],
  };

  function highlightCodePValues(container) {
    var codeElements = container.querySelectorAll('code');
    var pValuePattern = /^p\s*([<>=≥≤])\s*(0\.\d+)$/i;

    for (var i = 0; i < codeElements.length; i++) {
      var code = codeElements[i];
      if (code.closest('pre')) continue;

      var text = code.textContent.trim();
      var match = text.match(pValuePattern);
      if (!match) continue;

      var operator = match[1];
      var value = parseFloat(match[2]);
      var cssClass;

      if (operator === '<') {
        cssClass =
          value <= 0.05
            ? 'sig-positive'
            : value <= 0.1
              ? 'sig-borderline'
              : 'sig-negative';
      } else {
        if (value < 0.05) cssClass = 'sig-positive';
        else if (value < 0.1) cssClass = 'sig-borderline';
        else cssClass = 'sig-negative';
      }

      code.classList.add(cssClass);
    }
  }

  function applySignificanceHighlighting(container) {
    if (!container) return;

    highlightCodePValues(container);

    var skipTags = { CODE: 1, PRE: 1, A: 1, SCRIPT: 1, STYLE: 1, MARK: 1 };

    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        while (parent && parent !== container) {
          if (
            skipTags[parent.tagName] ||
            parent.classList.contains('sig-positive') ||
            parent.classList.contains('sig-negative') ||
            parent.classList.contains('sig-borderline')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    var orderedCategories = ['negative', 'borderline', 'positive'];

    for (var t = 0; t < textNodes.length; t++) {
      var textNode = textNodes[t];
      var text = textNode.nodeValue;
      if (!text || !text.trim()) continue;

      var matches = [];
      var result = text;

      for (var c = 0; c < orderedCategories.length; c++) {
        var category = orderedCategories[c];
        var patterns = SIGNIFICANCE_PATTERNS[category];
        var cls = 'sig-' + category;

        for (var p = 0; p < patterns.length; p++) {
          patterns[p].lastIndex = 0;
          result = result.replace(patterns[p], function (m) {
            var placeholder = '\x00' + matches.length + '\x00';
            matches.push({ cls: cls, text: m });
            return placeholder;
          });
        }
      }

      if (matches.length > 0) {
        var fragment = document.createDocumentFragment();
        var parts = result.split(/\x00(\d+)\x00/);
        for (var i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            if (parts[i]) fragment.appendChild(document.createTextNode(parts[i]));
          } else {
            var idx = parseInt(parts[i], 10);
            var mark = document.createElement('mark');
            mark.className = matches[idx].cls;
            mark.appendChild(document.createTextNode(matches[idx].text));
            fragment.appendChild(mark);
          }
        }
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    }
  }

  // Register as epcMarkdown plugin (with queue fallback for load-order safety)
  var plugin = {
    name: 'xp-significance',
    afterRender: function (container) {
      applySignificanceHighlighting(container);
    },
  };
  if (window.epcMarkdown && window.epcMarkdown.use) {
    window.epcMarkdown.use(plugin);
  } else {
    window.epcMarkdown = window.epcMarkdown || {};
    window.epcMarkdown._pending = window.epcMarkdown._pending || [];
    window.epcMarkdown._pending.push(plugin);
  }

  // Also keep available on xpUtils for non-epcMarkdown call sites
  if (window.xpUtils) {
    window.xpUtils.applySignificanceHighlighting = applySignificanceHighlighting;
    window.xpUtils.highlightCodePValues = highlightCodePValues;
    window.xpUtils.SIGNIFICANCE_PATTERNS = SIGNIFICANCE_PATTERNS;
  }
})();
