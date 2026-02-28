/**
 * Floating Table of Contents Plugin for epc-markdown
 * v1.0.0
 *
 * Desktop (>768px): Floating TOC panel on the right side of the viewport
 * with collapsed bars and an expanded panel on hover/focus.
 *
 * Mobile (<=768px): Inline collapsible "On This Page" accordion above
 * the article content using a <details> element.
 *
 * Both share the same heading data and IntersectionObserver for active tracking.
 *
 * Merged from:
 *   - experiments-dashboard xp-toc (clean observer scoping, prevObserver teardown)
 *   - docs-site docs-toc (mobile accordion, accessibility attributes)
 *
 * CSS: floating TOC styles live in each consumer's CSS (not shared),
 * since layout integration varies by app.
 *
 * CDN: https://epcvip.vip/shared/epc-markdown-plugin-toc.js?v=1.0.0
 */
(function () {
  'use strict';

  var prevObserver = null;

  var plugin = {
    name: 'epc-toc',

    afterRender: function (container) {
      // Tear down previous observer
      if (prevObserver) { prevObserver.disconnect(); prevObserver = null; }

      // Remove any existing TOC elements
      var existingNav = document.querySelector('.floating-toc');
      if (existingNav) existingNav.remove();
      var existingMobile = document.querySelector('.mobile-toc');
      if (existingMobile) existingMobile.remove();

      var headings = container.querySelectorAll('h2, h3');
      if (headings.length < 2) return;

      // ── Desktop: Floating TOC ──────────────────────────────

      var nav = document.createElement('nav');
      nav.className = 'floating-toc';
      nav.id = 'floating-toc';

      var barsDiv = document.createElement('div');
      barsDiv.className = 'floating-toc-bars';
      barsDiv.setAttribute('tabindex', '0');
      barsDiv.setAttribute('aria-label', 'Table of contents');

      var panel = document.createElement('div');
      panel.className = 'floating-toc-panel';

      var title = document.createElement('h4');
      title.className = 'floating-toc-title';
      title.textContent = 'On This Page';
      panel.appendChild(title);

      var ul = document.createElement('ul');

      for (var i = 0; i < headings.length; i++) {
        var h = headings[i];
        if (!h.id) continue;

        // Bar
        var bar = document.createElement('span');
        bar.className = 'toc-bar toc-bar--' + h.tagName.toLowerCase();
        bar.dataset.target = h.id;
        barsDiv.appendChild(bar);

        // Panel link
        var li = document.createElement('li');
        if (h.tagName === 'H3') li.className = 'toc-indent';

        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        a.dataset.target = h.id;
        a.addEventListener('click', makeTocClickHandler(h.id));
        li.appendChild(a);
        ul.appendChild(li);
      }

      panel.appendChild(ul);
      nav.appendChild(barsDiv);
      nav.appendChild(panel);
      document.body.appendChild(nav);

      // ── Mobile: Inline collapsible accordion ────────────────

      var details = document.createElement('details');
      details.className = 'mobile-toc';
      details.id = 'mobile-toc';

      var summary = document.createElement('summary');
      summary.className = 'mobile-toc-summary';
      summary.textContent = 'On This Page';
      details.appendChild(summary);

      var mobileUl = document.createElement('ul');
      mobileUl.className = 'mobile-toc-list';

      for (var m = 0; m < headings.length; m++) {
        var mh = headings[m];
        if (!mh.id) continue;

        var mli = document.createElement('li');
        if (mh.tagName === 'H3') mli.className = 'toc-indent';
        var ma = document.createElement('a');
        ma.href = '#' + mh.id;
        ma.textContent = mh.textContent;
        ma.dataset.target = mh.id;
        ma.addEventListener('click', makeTocClickHandler(mh.id));
        mli.appendChild(ma);
        mobileUl.appendChild(mli);
      }

      details.appendChild(mobileUl);

      // Insert above the first heading in the content
      var firstHeading = container.querySelector('h1, h2');
      if (firstHeading) {
        firstHeading.parentNode.insertBefore(details, firstHeading);
      } else {
        container.insertBefore(details, container.firstChild);
      }

      // ── IntersectionObserver (shared) ─────────────────────

      var setActive = function (id) {
        // Desktop bars
        var bars = nav.querySelectorAll('.toc-bar');
        for (var b = 0; b < bars.length; b++) {
          bars[b].classList.toggle('is-active', bars[b].dataset.target === id);
        }
        // Desktop panel links
        var links = nav.querySelectorAll('.floating-toc-panel a');
        for (var l = 0; l < links.length; l++) {
          links[l].classList.toggle('is-active', links[l].dataset.target === id);
        }
        // Mobile links
        var mobileLinks = details.querySelectorAll('.mobile-toc-list a');
        for (var ml = 0; ml < mobileLinks.length; ml++) {
          mobileLinks[ml].classList.toggle('is-active', mobileLinks[ml].dataset.target === id);
        }
      };

      var observer = new IntersectionObserver(
        function (entries) {
          for (var e = 0; e < entries.length; e++) {
            if (entries[e].isIntersecting) {
              setActive(entries[e].target.id);
              break;
            }
          }
        },
        { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
      );

      for (var j = 0; j < headings.length; j++) {
        if (headings[j].id) observer.observe(headings[j]);
      }
      prevObserver = observer;

      // ── Visibility by viewport width ──────────────────────

      var mql = window.matchMedia('(max-width: 768px)');
      var handleWidth = function (e) {
        nav.style.display = e.matches ? 'none' : '';
        details.style.display = e.matches ? 'block' : 'none';
      };
      mql.addEventListener('change', handleWidth);
      handleWidth(mql);
    },
  };

  function makeTocClickHandler(targetId) {
    return function (e) {
      e.preventDefault();
      var el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', '#' + targetId);
    };
  }

  if (window.epcMarkdown && window.epcMarkdown.use) {
    window.epcMarkdown.use(plugin);
  } else {
    window.epcMarkdown = window.epcMarkdown || {};
    window.epcMarkdown._pending = window.epcMarkdown._pending || [];
    window.epcMarkdown._pending.push(plugin);
  }
})();
