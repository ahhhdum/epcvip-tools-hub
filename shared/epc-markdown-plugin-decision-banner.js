/**
 * Decision Banner Plugin for epc-markdown
 *
 * Renders :::decision[STATUS] blocks as styled full-width banners.
 *
 * Syntax:
 *   :::decision[IMPLEMENT]
 *   Rationale text goes here.
 *   :::
 *
 * Status values and colors:
 *   IMPLEMENT    → green    (checkmark icon)
 *   REVERT       → red      (X icon)
 *   INCONCLUSIVE → amber    (? icon)
 *   PENDING      → grey     (clock icon)
 *   EXTEND       → blue     (arrow icon)
 *
 * Fallback: On renderers without this plugin, the raw text
 * ":::decision[IMPLEMENT]" is still readable.
 *
 * CSS: load epc-markdown-plugin-blocks.css alongside this script.
 */
(function () {
  'use strict';

  var STATUS_CONFIG = {
    implement: { icon: '\u2713', label: 'Implement', cls: 'decision-implement' },
    revert:    { icon: '\u2717', label: 'Revert',    cls: 'decision-revert' },
    inconclusive: { icon: '?', label: 'Inconclusive', cls: 'decision-inconclusive' },
    pending:   { icon: '\u23F3', label: 'Pending',   cls: 'decision-pending' },
    extend:    { icon: '\u2192', label: 'Extend',    cls: 'decision-extend' },
  };

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Newline-or-br: marked.js with breaks:true converts \n → <br>, so match either
  var BR = '(?:<br\\s*/?>|\\n)';

  // Match :::decision[STATUS] <br|nl> content <br|nl> :::
  var BLOCK_PATTERN = new RegExp(':::decision\\[([^\\]]+)\\]\\s*' + BR + '([\\s\\S]*?)' + BR + ':::', 'gi');
  // Fallback: unclosed blocks (content runs to next ::: or end)
  var INLINE_PATTERN = new RegExp(':::decision\\[([^\\]]+)\\]\\s*' + BR + '([\\s\\S]*?)(?=' + BR + ':::(?:[^a-z]|$)|$)', 'gi');

  function transformBanners(html) {
    // Reset stateful /gi regexes before each render pass
    BLOCK_PATTERN.lastIndex = 0;
    INLINE_PATTERN.lastIndex = 0;

    // Try block pattern first (with closing :::)
    var result = html.replace(BLOCK_PATTERN, function (match, status, content) {
      return buildBanner(status, content);
    });

    // Then try inline pattern for unclosed blocks
    if (result === html) {
      INLINE_PATTERN.lastIndex = 0;
      result = html.replace(INLINE_PATTERN, function (match, status, content) {
        return buildBanner(status, content.trim());
      });
    }

    // Clean up <p> wrappers around block-level banner divs
    result = result.replace(
      /<p>\s*(<div class="decision-banner[\s\S]*?<\/div>)\s*<\/p>/g,
      '$1'
    );

    return result;
  }

  function buildBanner(status, content) {
    var key = status.trim().toLowerCase();
    var config = STATUS_CONFIG[key] || {
      icon: '\u2139',
      label: esc(status.trim()),
      cls: 'decision-pending',
    };

    // Strip leading/trailing <br> from content (artifact of breaks:true)
    var cleaned = content.replace(/^(?:\s*<br\s*\/?>)+|(?:<br\s*\/?>)+\s*$/gi, '').trim();

    return (
      '<div class="decision-banner ' + config.cls + '">' +
        '<div class="decision-banner-header">' +
          '<span class="decision-banner-icon">' + config.icon + '</span>' +
          '<span class="decision-banner-status">' + config.label + '</span>' +
        '</div>' +
        (cleaned
          ? '<div class="decision-banner-rationale">' + cleaned + '</div>'
          : '') +
      '</div>'
    );
  }

  var plugin = {
    name: 'xp-decision-banner',
    afterParse: function (html) {
      return transformBanners(html);
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
