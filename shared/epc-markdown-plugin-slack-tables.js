/**
 * "Copy for Slack" Table Plugin for epc-markdown
 *
 * Adds a "Copy for Slack" button to each table wrapper that copies
 * the table content as a monospaced ASCII table for pasting into Slack.
 * Also detects horizontal overflow and adds the .has-overflow class.
 *
 * Works as both an epcMarkdown plugin (auto-applied) and standalone
 * functions callable from test-detail.js / file-viewer.js.
 */
(function () {
  'use strict';

  function addTableCopyButton(wrapper, table) {
    var btn = document.createElement('button');
    btn.className = 'table-copy-btn';
    btn.innerHTML = '\uD83D\uDCCB Copy for Slack';
    btn.title = 'Copy as monospaced table for Slack';
    btn.onclick = function (e) {
      e.stopPropagation();
      copyTableForSlack(table, btn);
    };
    wrapper.insertBefore(btn, table);
  }

  function copyTableForSlack(table, btn) {
    var ascii = tableToAscii(table);

    if (!navigator.clipboard) {
      btn.innerHTML = '\u26A0 Copy unavailable';
      setTimeout(function () {
        btn.innerHTML = '\uD83D\uDCCB Copy for Slack';
      }, 2000);
      return;
    }

    navigator.clipboard
      .writeText(ascii)
      .then(function () {
        var original = btn.innerHTML;
        btn.innerHTML = '\u2713 Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.innerHTML = original;
          btn.classList.remove('copied');
        }, 2000);
      })
      .catch(function (err) {
        console.error('Failed to copy:', err);
        btn.innerHTML = '\u2717 Failed';
        setTimeout(function () {
          btn.innerHTML = '\uD83D\uDCCB Copy for Slack';
        }, 2000);
      });
  }

  function tableToAscii(table) {
    var headers = [];
    var widths = [];
    var rows = [];

    var headerCells = table.querySelectorAll('th');
    for (var h = 0; h < headerCells.length; h++) {
      var text = headerCells[h].textContent.trim();
      headers.push(text);
      widths[h] = text.length;
    }

    if (headers.length === 0) {
      var firstRow = table.querySelector('tr');
      if (firstRow) {
        var firstCells = firstRow.querySelectorAll('td');
        for (var f = 0; f < firstCells.length; f++) {
          var ft = firstCells[f].textContent.trim();
          headers.push(ft);
          widths[f] = ft.length;
        }
      }
    }

    var bodyRows =
      headers.length > 0 && table.querySelector('th')
        ? table.querySelectorAll('tbody tr')
        : Array.from(table.querySelectorAll('tr')).slice(1);

    for (var b = 0; b < bodyRows.length; b++) {
      var row = [];
      var cells = bodyRows[b].querySelectorAll('td');
      for (var c = 0; c < cells.length; c++) {
        var ct = cells[c].textContent.trim();
        row.push(ct);
        widths[c] = Math.max(widths[c] || 0, ct.length);
      }
      if (row.length > 0) rows.push(row);
    }

    var pad = function (str, len) {
      return (str || '').padEnd(len);
    };
    var separator = widths
      .map(function (w) {
        return '-'.repeat(w || 0);
      })
      .join(' | ');

    var result =
      headers
        .map(function (hdr, i) {
          return pad(hdr, widths[i]);
        })
        .join(' | ') + '\n';
    result += separator + '\n';
    for (var r = 0; r < rows.length; r++) {
      result +=
        rows[r]
          .map(function (cell, i) {
            return pad(cell, widths[i]);
          })
          .join(' | ') + '\n';
    }
    return result;
  }

  function checkTableOverflow(wrapper) {
    requestAnimationFrame(function () {
      if (wrapper.scrollWidth > wrapper.clientWidth) {
        wrapper.classList.add('has-overflow');
      } else {
        wrapper.classList.remove('has-overflow');
      }
    });
  }

  function enhanceTableWrappers(container) {
    var wrappers = container.querySelectorAll('.table-wrapper');
    for (var i = 0; i < wrappers.length; i++) {
      var wrapper = wrappers[i];
      var table = wrapper.querySelector('table');
      if (!table) continue;
      // Skip if already enhanced
      if (wrapper.querySelector('.table-copy-btn')) continue;
      addTableCopyButton(wrapper, table);
      checkTableOverflow(wrapper);
    }
  }

  // Register as epcMarkdown plugin (with queue fallback for load-order safety)
  var plugin = {
    name: 'xp-slack-tables',
    afterRender: function (container) {
      enhanceTableWrappers(container);
    },
  };
  if (window.epcMarkdown && window.epcMarkdown.use) {
    window.epcMarkdown.use(plugin);
  } else {
    window.epcMarkdown = window.epcMarkdown || {};
    window.epcMarkdown._pending = window.epcMarkdown._pending || [];
    window.epcMarkdown._pending.push(plugin);
  }

  // Expose for standalone use (test-detail.js, file-viewer.js)
  window.xpSlackTables = {
    addTableCopyButton: addTableCopyButton,
    tableToAscii: tableToAscii,
    checkTableOverflow: checkTableOverflow,
    enhanceTableWrappers: enhanceTableWrappers,
  };

  // Re-check overflow on resize
  window.addEventListener('resize', function () {
    var wrappers = document.querySelectorAll('.table-wrapper');
    for (var i = 0; i < wrappers.length; i++) {
      checkTableOverflow(wrappers[i]);
    }
  });
})();
