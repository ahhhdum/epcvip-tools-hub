/**
 * Metric Cards Plugin for epc-markdown
 *
 * Renders :::metric[name|value|stat|status] blocks as styled inline cards.
 *
 * Syntax:
 *   :::metric[EPL | +$0.33 (+3.51%) | p=0.007 | win]
 *
 * Fields (pipe-delimited):
 *   1. name   — Metric label (e.g., "EPL", "Win Rate")
 *   2. value  — The metric value (e.g., "+$0.33 (+3.51%)")
 *   3. stat   — Secondary stat detail (e.g., "p=0.007", "32 of 52 days") — optional
 *   4. status — Color indicator: win|loss|flat|context|marginal|pending — optional
 *
 * Status colors:
 *   win      → green
 *   loss     → red
 *   flat     → grey
 *   context  → neutral (no highlight)
 *   marginal → amber
 *   pending  → grey dashed
 *
 * Cards flow horizontally (flexbox) and wrap. Consecutive metric blocks
 * are grouped into a single flex container via DOM manipulation (afterRender).
 *
 * CSS: load epc-markdown-plugin-blocks.css alongside this script.
 */
(function () {
  'use strict';

  // Match :::metric[fields] — allows nested brackets like [$0.06, $0.60]
  var METRIC_PATTERN = /:::metric\[((?:[^\[\]]|\[[^\]]*\])*)\]/g;

  var VALID_STATUSES = { win: 1, loss: 1, flat: 1, context: 1, marginal: 1, pending: 1 };

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseFields(raw) {
    var parts = raw.split('|').map(function (s) { return s.trim(); });
    var rawStatus = (parts[3] || 'context').toLowerCase();
    return {
      name:   parts[0] || '',
      value:  parts[1] || '',
      stat:   parts[2] || '',
      status: VALID_STATUSES[rawStatus] ? rawStatus : 'context',
    };
  }

  function buildCard(fields) {
    var statusCls = 'metric-card-' + fields.status;

    // Strip HTML tags for the title attribute (plain text tooltip)
    var statPlain = fields.stat.replace(/<[^>]+>/g, '').replace(/`/g, '');

    return (
      '<div class="metric-card-block ' + statusCls + '"' +
        (fields.stat ? ' title="' + esc(statPlain) + '"' : '') +
      '>' +
        '<div class="metric-card-name">' + fields.name + '</div>' +
        '<div class="metric-card-value">' + fields.value + '</div>' +
        (fields.stat
          ? '<div class="metric-card-stat">' + fields.stat + '</div>'
          : '') +
      '</div>'
    );
  }

  function transformMetrics(html) {
    METRIC_PATTERN.lastIndex = 0;
    // Replace :::metric[...] patterns with card HTML
    var result = html.replace(METRIC_PATTERN, function (match, raw) {
      var fields = parseFields(raw);
      return buildCard(fields);
    });

    // Clean up <p> wrappers that marked.js adds around block-level elements.
    // A <p> containing only metric cards (and whitespace/<br>) should be unwrapped.
    result = result.replace(
      /<p>((?:(?:\s|<br\s*\/?>)*<div class="metric-card-block[^"]*">[\s\S]*?<\/div>(?:\s|<br\s*\/?>)*)+)<\/p>/g,
      '$1'
    );

    return result;
  }

  function groupCards(container) {
    // Find all metric cards and group consecutive siblings into flex rows.
    // This uses DOM manipulation which reliably handles nested elements.
    var cards = container.querySelectorAll('.metric-card-block');
    if (!cards.length) return;

    var groups = [];
    var currentGroup = [cards[0]];

    for (var i = 1; i < cards.length; i++) {
      var prev = currentGroup[currentGroup.length - 1];
      var curr = cards[i];

      // Check if this card immediately follows the previous one
      // (only whitespace/text nodes between them, no block elements)
      var isConsecutive = false;
      var node = prev.nextSibling;
      while (node && node !== curr) {
        if (node.nodeType === 1) {
          // Element node — check if it's another metric card
          if (node.classList && node.classList.contains('metric-card-block')) {
            isConsecutive = true;
            break;
          }
          // Skip <br> elements (artifact of marked.js breaks:true)
          if (node.nodeName === 'BR') {
            node = node.nextSibling;
            continue;
          }
          // Any other element breaks the sequence
          break;
        }
        // Text/comment nodes — skip whitespace
        if (node.nodeType === 3 && node.textContent.trim() !== '') {
          break; // Non-whitespace text breaks the sequence
        }
        node = node.nextSibling;
      }

      if (node === curr) {
        isConsecutive = true;
      }

      if (isConsecutive) {
        currentGroup.push(curr);
      } else {
        if (currentGroup.length >= 1) groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    if (currentGroup.length >= 1) groups.push(currentGroup);

    // Wrap each group of 2+ cards in a flex row
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      if (group.length < 2) continue;

      var row = document.createElement('div');
      row.className = 'metric-cards-row';
      group[0].parentNode.insertBefore(row, group[0]);
      for (var c = 0; c < group.length; c++) {
        row.appendChild(group[c]);
      }
    }
  }

  var plugin = {
    name: 'xp-metric-cards',
    afterParse: function (html) {
      return transformMetrics(html);
    },
    afterRender: function (container) {
      groupCards(container);
    },
  };

  if (window.epcMarkdown && window.epcMarkdown.use) {
    window.epcMarkdown.use(plugin);
  } else {
    window.epcMarkdown = window.epcMarkdown || {};
    window.epcMarkdown._pending = window.epcMarkdown._pending || [];
    window.epcMarkdown._pending.push(plugin);
  }
})();
