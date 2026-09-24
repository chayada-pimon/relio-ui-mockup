const IS_BROWSER = typeof window !== 'undefined';

// ─── Section 7: Browser UI (IS_BROWSER only) ────────────────────────────────

if (IS_BROWSER) {
  // Detect extension mode via the script tag's data attribute or the document element fallback.
  // currentScript is reliable for synchronously-executing scripts (which our IIFE is).
  const _myScript = document.currentScript;
  const EXTENSION_MODE = (_myScript && _myScript.dataset.tcherExtension === 'true')
    || document.documentElement.dataset.tcherExtension === 'true';

  // Detect overlay signal colors — coded by finding severity so urgency is
  // readable at a glance (the live picker chrome itself is tcher-kit mono):
  //   critical (red)    breaks readability/usability; fix first
  //   major    (orange) clearly hurts quality or is a loud AI tell
  //   minor    (yellow) stylistic tell worth a look
  // The outline is a 2px marker gesture, not body text, so it doesn't need
  // WCAG AA against the page; the label ink IS tuned per tier (white on
  // red, near-black on orange/yellow). Hover deepens each tier's color
  // while preserving chroma.
  const SEVERITY_RANK = { critical: 3, major: 2, minor: 1, advisory: 0 };
  const SEVERITY_COLORS = {
    critical: { base: 'oklch(56.1% 0.213 21.07)', hover: 'oklch(48% 0.2 21.07)', ink: 'oklch(98% 0.01 21.07)' },
    major: { base: 'oklch(74.86% 0.129 61.02)', hover: 'oklch(67% 0.135 61.02)', ink: 'oklch(16% 0.03 61.02)' },
    minor: { base: 'oklch(88.88% 0.147 90.7)', hover: 'oklch(81% 0.15 90.7)', ink: 'oklch(18% 0.04 90.7)' },
    // Lowest tier: heads-up rules; a muted yellow so it never outshouts minor.
    advisory: { base: 'oklch(88% 0.045 90.7)', hover: 'oklch(80% 0.05 90.7)', ink: 'oklch(25% 0.01 90.7)' },
  };
  const OUTLINE_COLOR = SEVERITY_COLORS.minor.base;

  // Inject hover styles via CSS (more reliable than JS event listeners)
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes tcher-reveal {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .tcher-overlay:not(.tcher-banner) {
      pointer-events: none;
      outline: 2px solid ${OUTLINE_COLOR};
      border-radius: 4px;
      transition: outline-color 0.15s ease;
      animation: tcher-reveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      animation-play-state: paused;
      border-top-left-radius: 0;
    }
    .tcher-overlay.tcher-visible {
      animation-play-state: running;
    }
    .tcher-overlay.tcher-hover {
      z-index: 100001 !important;
    }
    .tcher-overlay.tcher-spotlight {
      z-index: 100002 !important;
    }
    .tcher-overlay.tcher-spotlight-dimmed {
      opacity: 0.15 !important;
      animation: none !important;
      filter: blur(3px);
    }
    .tcher-spotlight-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      backdrop-filter: blur(3px) brightness(0.6);
      -webkit-backdrop-filter: blur(3px) brightness(0.6);
      pointer-events: none;
      z-index: 99998;
      opacity: 0;
      outline: none !important;
      animation: none !important;
    }
    .tcher-spotlight-backdrop.tcher-visible {
      opacity: 1;
    }
    .tcher-hidden .tcher-overlay${EXTENSION_MODE ? '' : ':not(.tcher-banner)'} {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  // Spotlight backdrop element (created lazily on first use)
  let spotlightBackdrop = null;
  let spotlightTarget = null;

  function getSpotlightBackdrop() {
    if (!spotlightBackdrop) {
      spotlightBackdrop = document.createElement('div');
      spotlightBackdrop.className = 'tcher-spotlight-backdrop';
      document.body.appendChild(spotlightBackdrop);
    }
    return spotlightBackdrop;
  }

  function updateSpotlightClipPath() {
    if (!spotlightBackdrop || !spotlightTarget) return;
    const r = spotlightTarget.getBoundingClientRect();
    // Match the overlay's outer edge: element rect + 4px (2px overlay offset + 2px outline width)
    const inset = 4;
    const radius = 6; // outline border-radius (4) + outline width (2)
    const x1 = r.left - inset;
    const y1 = r.top - inset;
    const x2 = r.right + inset;
    const y2 = r.bottom + inset;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Outer rect + rounded inner rect (evenodd creates a hole)
    const path = `M0 0H${vw}V${vh}H0Z M${x1 + radius} ${y1}H${x2 - radius}A${radius} ${radius} 0 0 1 ${x2} ${y1 + radius}V${y2 - radius}A${radius} ${radius} 0 0 1 ${x2 - radius} ${y2}H${x1 + radius}A${radius} ${radius} 0 0 1 ${x1} ${y2 - radius}V${y1 + radius}A${radius} ${radius} 0 0 1 ${x1 + radius} ${y1}Z`;
    spotlightBackdrop.style.clipPath = `path(evenodd, "${path}")`;
  }

  function showSpotlight(target) {
    if (!target || !target.getBoundingClientRect) return;
    // Respect the spotlightBlur setting: if disabled, don't show the backdrop
    if (window.__TCHER_CONFIG__?.spotlightBlur === false) {
      spotlightTarget = target;
      return;
    }
    spotlightTarget = target;
    const bd = getSpotlightBackdrop();
    updateSpotlightClipPath();
    bd.classList.add('tcher-visible');
  }

  function hideSpotlight() {
    spotlightTarget = null;
    if (spotlightBackdrop) spotlightBackdrop.classList.remove('tcher-visible');
  }

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
  }

  // Reposition spotlight on scroll/resize
  window.addEventListener('scroll', () => {
    if (spotlightTarget) updateSpotlightClipPath();
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (spotlightTarget) updateSpotlightClipPath();
  });

  const overlays = [];
  const TYPE_LABELS = {};
  const RULE_CATEGORY = {};
  const RULE_SEVERITY = {};
  const RULE_LAW = {};
  for (const ap of ANTIPATTERNS) {
    TYPE_LABELS[ap.id] = ap.name.toLowerCase();
    RULE_CATEGORY[ap.id] = ap.category || 'quality';
    RULE_SEVERITY[ap.id] = ap.severity || 'minor';
    if (ap.law) RULE_LAW[ap.id] = ap.law;
  }

  // The strongest severity among a set of findings decides the marker color.
  function topSeverity(findings) {
    let top = 'advisory';
    for (const f of findings) {
      const s = RULE_SEVERITY[f.type || f.id] || 'minor';
      if (SEVERITY_RANK[s] > SEVERITY_RANK[top]) top = s;
    }
    return top;
  }

  function isInFixedContext(el) {
    let p = el;
    while (p && p !== document.body) {
      if (getComputedStyle(p).position === 'fixed') return true;
      p = p.parentElement;
    }
    return false;
  }

  function positionOverlay(overlay) {
    const el = overlay._targetEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (overlay._isFixed) {
      // Viewport-relative coords for fixed targets
      overlay.style.top = `${rect.top - 2}px`;
      overlay.style.left = `${rect.left - 2}px`;
    } else {
      // Document-relative coords for normal targets
      overlay.style.top = `${rect.top + scrollY - 2}px`;
      overlay.style.left = `${rect.left + scrollX - 2}px`;
    }
    overlay.style.width = `${rect.width + 4}px`;
    overlay.style.height = `${rect.height + 4}px`;
  }

  function repositionOverlays() {
    for (const o of overlays) {
      if (!o._targetEl || o.classList.contains('tcher-banner')) continue;
      // Skip overlays whose target is currently hidden (display: none on the overlay)
      if (o.style.display === 'none') continue;
      positionOverlay(o);
    }
  }

  let resizeRAF;
  const onResize = () => {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(repositionOverlays);
  };
  window.addEventListener('resize', onResize);
  // Reposition on scroll too -- catches sticky/parallax shifts
  window.addEventListener('scroll', onResize, { passive: true });
  // Reposition when body resizes (lazy-loaded images, dynamic content, fonts loading)
  if (typeof ResizeObserver !== 'undefined') {
    const bodyResizeObserver = new ResizeObserver(onResize);
    bodyResizeObserver.observe(document.body);
  }

  // Track target element visibility via IntersectionObserver.
  // Uses a huge rootMargin so all *rendered* elements count as intersecting,
  // while display:none / closed <details> / hidden modals etc. do not.
  // This is event-driven -- no polling needed.
  let overlayIndex = 0;
  const visibilityObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const overlay = entry.target._tcherOverlay;
      if (!overlay) continue;
      if (entry.isIntersecting) {
        overlay.style.display = '';
        positionOverlay(overlay);
        if (!overlay._revealed) {
          overlay._revealed = true;
          if (firstScanDone) {
            // Subsequent reveals (re-scans, scroll-into-view): instant, no animation
            overlay.style.animation = 'none';
          } else {
            // Initial scan: staggered cascade reveal
            overlay.style.animationDelay = `${Math.min((overlay._staggerIndex || 0) * 60, 600)}ms`;
          }
          requestAnimationFrame(() => {
            overlay.classList.add('tcher-visible');
            if (overlay._checkLabel) overlay._checkLabel();
          });
        }
      } else {
        overlay.style.display = 'none';
      }
    }
  }, { rootMargin: '99999px' });

  function detachOverlay(overlay) {
    if (!overlay) return;
    if (typeof overlay._cleanup === 'function') {
      try { overlay._cleanup(); } catch { /* best effort overlay teardown */ }
    }
    if (overlay._targetEl && overlay._targetEl._tcherOverlay === overlay) {
      visibilityObserver.unobserve(overlay._targetEl);
      delete overlay._targetEl._tcherOverlay;
    }
    const idx = overlays.indexOf(overlay);
    if (idx >= 0) overlays.splice(idx, 1);
    overlay.remove();
  }

  // Reposition overlays after CSS transitions end (e.g. reveal animations).
  // Listens at document level so it catches transitions on ancestor elements
  // (the transform may be on a parent, not the flagged element itself).
  document.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'transform') return;
    for (const o of overlays) {
      if (!o._targetEl || o.classList.contains('tcher-banner') || o.style.display === 'none') continue;
      if (e.target === o._targetEl || e.target.contains(o._targetEl)) {
        positionOverlay(o);
      }
    }
  });

  const highlight = function(el, findings) {
    if (el._tcherOverlay) detachOverlay(el._tcherOverlay);
    const hasSlop = findings.some(f => RULE_CATEGORY[f.type || f.id] === 'slop');
    // Marker color follows the most severe finding on this element.
    const SC = SEVERITY_COLORS[topSeverity(findings)];

    const fixed = isInFixedContext(el);
    const rect = el.getBoundingClientRect();
    const outline = document.createElement('div');
    outline.className = 'tcher-overlay';
    outline._targetEl = el;
    outline._isFixed = fixed;
    Object.assign(outline.style, {
      position: fixed ? 'fixed' : 'absolute',
      top: fixed ? `${rect.top - 2}px` : `${rect.top + scrollY - 2}px`,
      left: fixed ? `${rect.left - 2}px` : `${rect.left + scrollX - 2}px`,
      width: `${rect.width + 4}px`, height: `${rect.height + 4}px`,
      zIndex: '99999', boxSizing: 'border-box',
      outlineColor: SC.base,
    });

    // Build per-finding label entries: ✦ prefix for slop
    const entries = findings.map(f => {
      const name = TYPE_LABELS[f.type || f.id] || f.type || f.id;
      const prefix = RULE_CATEGORY[f.type || f.id] === 'slop' ? '\u2726 ' : '';
      return { name: prefix + name, detail: f.detail || f.snippet };
    });
    const allText = entries.map(e => e.name).join(', ');

    const label = document.createElement('div');
    label.className = 'tcher-label';
    Object.assign(label.style, {
      position: 'absolute', bottom: '100%', left: '-2px',
      display: 'flex', alignItems: 'center',
      whiteSpace: 'nowrap',
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.02em',
      color: SC.ink, lineHeight: '14px',
      background: SC.base,
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '4px 4px 0 0',
    });

    const textSpan = document.createElement('span');
    textSpan.style.padding = '3px 8px';
    textSpan.textContent = allText;
    label.appendChild(textSpan);

    // State for cycling mode
    let cycleMode = false;
    let cycleIndex = 0;
    let isHovered = false;
    let prevBtn, nextBtn;

    function updateCycleText() {
      const e = entries[cycleIndex];
      textSpan.textContent = isHovered ? e.detail : e.name;
    }

    function enableCycleMode() {
      if (cycleMode || entries.length < 2) return;
      cycleMode = true;

      const btnStyle = {
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
        fontSize: '11px', cursor: 'pointer', padding: '3px 4px',
        fontFamily: 'system-ui, sans-serif', lineHeight: '14px',
        pointerEvents: 'auto',
      };

      const navGroup = document.createElement('span');
      Object.assign(navGroup.style, {
        display: 'inline-flex', alignItems: 'center', flexShrink: '0',
      });

      prevBtn = document.createElement('button');
      prevBtn.textContent = '\u2039';
      Object.assign(prevBtn.style, btnStyle);
      prevBtn.style.paddingLeft = '6px';
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleIndex = (cycleIndex - 1 + entries.length) % entries.length;
        updateCycleText();
      });

      nextBtn = document.createElement('button');
      nextBtn.textContent = '\u203A';
      Object.assign(nextBtn.style, btnStyle);
      nextBtn.style.paddingRight = '2px';
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleIndex = (cycleIndex + 1) % entries.length;
        updateCycleText();
      });

      navGroup.appendChild(prevBtn);
      navGroup.appendChild(nextBtn);
      label.insertBefore(navGroup, textSpan);
      textSpan.style.padding = '3px 8px 3px 4px';
      updateCycleText();
    }

    outline.appendChild(label);

    // Start hidden; the IntersectionObserver will show it once the target is rendered
    outline.style.display = 'none';
    outline._staggerIndex = overlayIndex++;
    el._tcherOverlay = outline;
    visibilityObserver.observe(el);

    // After first paint, check label width vs outline
    outline._checkLabel = () => {
      if (entries.length > 1 && label.offsetWidth > outline.offsetWidth) {
        enableCycleMode();
      }
    };

    // Hover: show detail text, darken
    const onMouseEnter = () => {
      isHovered = true;
      outline.classList.add('tcher-hover');
      outline.style.outlineColor = SC.hover;
      label.style.background = SC.hover;
      if (cycleMode) {
        updateCycleText();
      } else {
        textSpan.textContent = entries.map(e => e.detail).join(' | ');
      }
    };
    const onMouseLeave = () => {
      isHovered = false;
      outline.classList.remove('tcher-hover');
      outline.style.outlineColor = SC.base;
      label.style.background = SC.base;
      if (cycleMode) {
        updateCycleText();
      } else {
        textSpan.textContent = allText;
      }
    };
    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    outline._cleanup = () => {
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
    };

    document.body.appendChild(outline);
    overlays.push(outline);
  };

  const showPageBanner = function(findings, allForSummary, groups) {
    const summaryFindings = (allForSummary && allForSummary.length) ? allForSummary : findings;
    if (!summaryFindings.length) return;

    // Neutral chrome in the spirit of the live design panel: the severity
    // signal lives on the badges, not a full-width colored strip.
    const INK = 'oklch(15% 0 0)';
    const DIM = 'oklch(45% 0 0)';
    const SURFACE = 'oklch(98.5% 0 0 / 0.97)';
    const HAIRLINE = 'oklch(88% 0 0)';
    const TIERS = ['critical', 'major', 'minor', 'advisory'];

    const counts = { critical: 0, major: 0, minor: 0, advisory: 0 };
    for (const f of summaryFindings) counts[RULE_SEVERITY[f.type] || 'minor'] += 1;

    const makeBadge = (tier, count) => {
      const c = SEVERITY_COLORS[tier];
      const b = document.createElement('span');
      b.textContent = `${count} ${tier}`;
      Object.assign(b.style, {
        background: c.base, color: c.ink,
        padding: '2px 10px', borderRadius: '999px',
        fontSize: '11.5px', fontWeight: '650', whiteSpace: 'nowrap',
        boxShadow: 'inset 0 0 0 1px oklch(0% 0 0 / 0.10)',
        flexShrink: '0',
      });
      return b;
    };

    const banner = document.createElement('div');
    banner.className = 'tcher-overlay tcher-banner';
    Object.assign(banner.style, {
      position: 'fixed', top: '0', left: '0', right: '0', zIndex: '100000',
      background: SURFACE, color: INK,
      backdropFilter: 'blur(8px)',
      fontFamily: 'system-ui, sans-serif', fontSize: '13px',
      borderBottom: '1px solid ' + HAIRLINE,
      boxShadow: '0 8px 24px oklch(0% 0 0 / 0.10)',
      pointerEvents: 'auto', maxWidth: '100vw',
      transform: 'translateY(-100%)',
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
    }));

    // \u2500\u2500 Summary row: "UX check" + one status badge per tier \u2500\u2500
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', gap: '8px',
      height: '40px', padding: '0 12px',
    });
    const title = document.createElement('span');
    title.textContent = 'UX check';
    Object.assign(title.style, {
      fontWeight: '700', fontSize: '12.5px', letterSpacing: '0.01em',
      whiteSpace: 'nowrap', flexShrink: '0',
    });
    row.appendChild(title);
    for (const tier of TIERS) {
      if (counts[tier]) row.appendChild(makeBadge(tier, counts[tier]));
    }
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    row.appendChild(spacer);

    // \u2500\u2500 Details panel (hidden until "View details") \u2500\u2500
    // Left-docked popover (the live DESIGN.md panel's mirror image, which
    // docks right): tiers stack vertically and the popover scrolls itself.
    const panel = document.createElement('div');
    panel.id = 'tcher-banner-panel';
    // Mounted on document.body, NOT inside the banner: the banner's slide-in
    // transform would otherwise become this fixed panel's containing block
    // and collapse it to the banner's 40px box. Deliberately NOT given the
    // `tcher-overlay` class: that selector pauses a reveal animation at
    // opacity 0 and disables pointer events (it is meant for finding
    // outlines), which made the open panel invisible and unclickable. It is
    // still pushed into `overlays` so clearOverlays() removes it.
    panel.className = 'tcher-banner-panel';
    const PANEL_OPEN_DISPLAY = 'block';
    Object.assign(panel.style, {
      display: 'none',
      position: 'fixed', left: '12px', top: '52px', bottom: '12px',
      width: 'min(380px, calc(100vw - 24px))',
      background: 'oklch(99% 0 0)',
      border: '1px solid ' + HAIRLINE, borderRadius: '12px',
      boxShadow: '0 18px 48px oklch(0% 0 0 / 0.16)',
      overflowY: 'auto', padding: '12px',
      zIndex: '100001',
    });

    // Popover header
    const panelHead = document.createElement('div');
    Object.assign(panelHead.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      margin: '0 0 10px',
    });
    const panelTitle = document.createElement('span');
    panelTitle.textContent = 'UX findings';
    Object.assign(panelTitle.style, { fontWeight: '700', fontSize: '12.5px' });
    const panelClose = document.createElement('button');
    panelClose.textContent = '×';
    panelClose.title = 'Close findings';
    Object.assign(panelClose.style, {
      background: 'none', border: 'none', color: INK, opacity: '0.6',
      fontSize: '18px', cursor: 'pointer', padding: '0 2px', lineHeight: '1',
    });
    panelClose.addEventListener('click', () => closePanel());
    panelHead.appendChild(panelTitle);
    panelHead.appendChild(panelClose);
    panel.appendChild(panelHead);

    // Fixed sky-blue flash: a tier-colored flash can vanish against the
    // outline's own color, so the jump highlight uses a contrast hue.
    const FLASH_COLOR = 'oklch(74.79% 0.137 239.13)';
    const flashTarget = (el) => {
      if (!el || el === document.body) return;
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* noop */ }
      const o = el._tcherOverlay;
      if (!o) return;
      const prev = o.style.boxShadow;
      o.style.boxShadow = '0 0 0 5px ' + FLASH_COLOR;
      setTimeout(() => { o.style.boxShadow = prev; }, 1200);
    };

    // Assigned once the details button exists; clicking a finding collapses
    // the panel first so the 60vh sheet doesn't cover the spot it jumps to.
    let closePanel = () => {};

    // \u2500\u2500 Mode tabs: All / Design / UX \u2500\u2500
    // design = slop + quality rules (AI tells and craft); ux = the
    // deterministic usability set (Laws of UX + WCAG-adjacent checks).
    const MODES = [
      { key: 'all', label: 'All', match: () => true },
      { key: 'design', label: 'Design', match: (cat) => cat === 'slop' || cat === 'quality' },
      { key: 'ux', label: 'UX', match: (cat) => cat === 'ux' },
    ];
    let activeMode = 'all';
    const modeCount = (mode) => {
      let n = 0;
      for (const g of (groups || [])) {
        for (const f of g.findings) {
          if (mode.match(RULE_CATEGORY[f.type] || 'quality')) n++;
        }
      }
      return n;
    };
    const tabStrip = document.createElement('div');
    Object.assign(tabStrip.style, {
      display: 'flex', gap: '4px', margin: '0 0 12px',
      background: 'oklch(96% 0 0)', border: '1px solid ' + HAIRLINE,
      borderRadius: '8px', padding: '3px',
    });
    const tabBtns = new Map();
    for (const mode of MODES) {
      const tb = document.createElement('button');
      tb.textContent = `${mode.label} ${modeCount(mode)}`;
      Object.assign(tb.style, {
        flex: '1', border: 'none', borderRadius: '6px', padding: '4px 0',
        fontSize: '11.5px', fontWeight: '600', fontFamily: 'inherit',
        cursor: 'pointer', background: 'transparent', color: DIM,
        transition: 'background 0.12s ease, color 0.12s ease',
      });
      tb.addEventListener('click', () => { activeMode = mode.key; renderPanelRows(); });
      tabBtns.set(mode.key, tb);
      tabStrip.appendChild(tb);
    }
    panel.appendChild(tabStrip);

    const panelList = document.createElement('div');
    panel.appendChild(panelList);

    const renderPanelRows = () => {
      for (const [key, tb] of tabBtns) {
        const active = key === activeMode;
        tb.style.background = active ? 'oklch(100% 0 0)' : 'transparent';
        tb.style.color = active ? INK : DIM;
        tb.style.boxShadow = active ? '0 1px 2px oklch(0% 0 0 / 0.08), inset 0 0 0 1px ' + HAIRLINE : 'none';
      }
      const mode = MODES.find(m => m.key === activeMode) || MODES[0];
      panelList.textContent = '';

      for (const tier of TIERS) {
        const rows = [];
        for (const g of (groups || [])) {
          for (const f of g.findings) {
            if ((RULE_SEVERITY[f.type] || 'minor') !== tier) continue;
            if (!mode.match(RULE_CATEGORY[f.type] || 'quality')) continue;
            rows.push({ el: g.el, f });
          }
        }
        if (!rows.length) continue;

        const head = document.createElement('div');
        Object.assign(head.style, {
          display: 'flex', alignItems: 'center', gap: '8px',
          margin: '14px 0 8px',
        });
        head.appendChild(makeBadge(tier, rows.length));
        panelList.appendChild(head);

        for (const { el, f } of rows) {
          const item = document.createElement('div');
          const clickable = el && el !== document.body;
          Object.assign(item.style, {
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            padding: '7px 10px', margin: '0 0 6px',
            border: '1px solid ' + HAIRLINE, borderRadius: '8px',
            background: 'oklch(100% 0 0)',
            cursor: clickable ? 'pointer' : 'default',
            transition: 'border-color 0.12s ease',
          });
          const dot = document.createElement('span');
          Object.assign(dot.style, {
            width: '8px', height: '8px', borderRadius: '50%',
            background: SEVERITY_COLORS[tier].base, flexShrink: '0',
            marginTop: '5px', boxShadow: 'inset 0 0 0 1px oklch(0% 0 0 / 0.12)',
          });
          item.appendChild(dot);
          const text = document.createElement('div');
          text.style.minWidth = '0';
          const name = document.createElement('div');
          const prefix = RULE_CATEGORY[f.type] === 'slop' ? '\u2726 ' : '';
          name.textContent = prefix + (TYPE_LABELS[f.type] || f.type);
          Object.assign(name.style, { fontWeight: '600', fontSize: '12.5px' });
          const detail = document.createElement('div');
          // ux rules cite their Laws of UX principle ahead of the detail.
          const law = RULE_LAW[f.type];
          detail.textContent = (law ? law + ' \u00b7 ' : '') + (f.detail || '');
          Object.assign(detail.style, {
            color: DIM, fontFamily: 'ui-monospace, monospace',
            fontSize: '11.5px', lineHeight: '1.45', wordBreak: 'break-word',
          });
          text.appendChild(name);
          text.appendChild(detail);
          item.appendChild(text);
          if (clickable) {
            item.addEventListener('mouseenter', () => { item.style.borderColor = SEVERITY_COLORS[tier].base; });
            item.addEventListener('mouseleave', () => { item.style.borderColor = HAIRLINE; });
            item.addEventListener('click', () => {
              closePanel();
              requestAnimationFrame(() => flashTarget(el));
            });
          }
          panelList.appendChild(item);
        }
      }

      if (!panelList.children.length) {
        const empty = document.createElement('div');
        empty.textContent = 'No findings in this set.';
        Object.assign(empty.style, { color: DIM, fontSize: '12px', padding: '8px 2px' });
        panelList.appendChild(empty);
      }
    };
    renderPanelRows();

    // "View details" toggle
    const detailsBtn = document.createElement('button');
    detailsBtn.id = 'tcher-banner-details';
    const CHEVRON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0; transition: transform 0.15s ease" aria-hidden="true"><path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"/></svg>';
    const setDetailsLabel = (open) => {
      detailsBtn.innerHTML = (open ? 'Hide details' : 'View details') + CHEVRON_SVG;
      const svg = detailsBtn.querySelector('svg');
      if (svg && open) svg.style.transform = 'rotate(180deg)';
    };
    setDetailsLabel(false);
    Object.assign(detailsBtn.style, {
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: 'oklch(100% 0 0)', color: INK,
      border: '1px solid ' + HAIRLINE, borderRadius: '6px',
      padding: '3px 10px', fontSize: '11.5px', fontWeight: '600',
      fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
      flexShrink: '0', transition: 'border-color 0.12s ease',
    });
    detailsBtn.addEventListener('mouseenter', () => { detailsBtn.style.borderColor = DIM; });
    detailsBtn.addEventListener('mouseleave', () => { detailsBtn.style.borderColor = HAIRLINE; });
    let panelOpen = false;
    detailsBtn.addEventListener('click', () => {
      panelOpen = !panelOpen;
      panel.style.display = panelOpen ? PANEL_OPEN_DISPLAY : 'none';
      setDetailsLabel(panelOpen);
    });
    closePanel = () => {
      if (!panelOpen) return;
      panelOpen = false;
      panel.style.display = 'none';
      setDetailsLabel(false);
    };
    row.appendChild(detailsBtn);

    // Controls (standalone mode only, not extension)
    if (!EXTENSION_MODE) {
      // Toggle visibility button
      const toggle = document.createElement('button');
      toggle.textContent = '\u25C9'; // circle with dot (visible state)
      toggle.title = 'Toggle overlay visibility';
      Object.assign(toggle.style, {
        background: 'none', border: 'none',
        color: INK, fontSize: '16px', cursor: 'pointer', padding: '0 4px',
        opacity: '0.6', transition: 'opacity 0.15s',
      });
      let overlaysVisible = true;
      toggle.addEventListener('click', () => {
        overlaysVisible = !overlaysVisible;
        document.body.classList.toggle('tcher-hidden', !overlaysVisible);
        toggle.textContent = overlaysVisible ? '\u25C9' : '\u25CB'; // filled vs empty circle
        toggle.style.opacity = overlaysVisible ? '0.6' : '0.35';
      });
      row.appendChild(toggle);

      // Close button
      const close = document.createElement('button');
      close.textContent = '\u00d7';
      close.title = 'Dismiss banner';
      Object.assign(close.style, {
        background: 'none', border: 'none',
        color: INK, fontSize: '18px', cursor: 'pointer', padding: '0 4px',
        opacity: '0.6',
      });
      close.addEventListener('click', () => { banner.remove(); panel.remove(); });
      row.appendChild(close);
    }

    banner.appendChild(row);
    document.body.appendChild(banner);
    document.body.appendChild(panel);
    overlays.push(banner);
    overlays.push(panel);
  };

  // Heuristic for skipping CSS-in-JS hashed class names like "css-1a2b3c" or "_2x4hG_".
  // These change between builds and produce brittle, ugly selectors.
  function isLikelyHashedClass(c) {
    if (!c) return true;
    if (/^(css|sc|emotion|jsx|module)-[\w-]{4,}$/i.test(c)) return true;
    if (/^_[\w-]{5,}$/.test(c)) return true;
    if (/^[a-z0-9]{6,}$/i.test(c) && /\d/.test(c)) return true;
    return false;
  }

  function buildSelectorSegment(el) {
    const tag = el.tagName.toLowerCase();
    let sel = tag;

    if (el.classList && el.classList.length > 0) {
      const classes = [...el.classList]
        .filter(c => !c.startsWith('tcher-') && !isLikelyHashedClass(c))
        .slice(0, 2);
      if (classes.length > 0) {
        sel += '.' + classes.map(c => CSS.escape(c)).join('.');
      }
    }

    // Disambiguate among siblings only if the parent has multiple matches
    const parent = el.parentElement;
    if (parent) {
      try {
        const matching = parent.querySelectorAll(':scope > ' + sel);
        if (matching.length > 1) {
          const sameType = [...parent.children].filter(c => c.tagName === el.tagName);
          const idx = sameType.indexOf(el) + 1;
          sel += `:nth-of-type(${idx})`;
        }
      } catch {
        const idx = [...parent.children].indexOf(el) + 1;
        sel = `${tag}:nth-child(${idx})`;
      }
    }
    return sel;
  }

  function generateSelector(el) {
    if (el === document.body) return 'body';
    if (el === document.documentElement) return 'html';
    if (el.id) return '#' + CSS.escape(el.id);

    const parts = [];
    let current = el;
    let depth = 0;
    const MAX_DEPTH = 10;

    while (current && current !== document.body && current !== document.documentElement && depth < MAX_DEPTH) {
      parts.unshift(buildSelectorSegment(current));

      // Anchor on an ancestor's ID and stop walking up
      if (current.id) {
        parts[0] = '#' + CSS.escape(current.id);
        break;
      }

      // Stop as soon as the partial selector uniquely identifies the target
      const trySelector = parts.join(' > ');
      try {
        const matches = document.querySelectorAll(trySelector);
        if (matches.length === 1 && matches[0] === el) {
          return trySelector;
        }
      } catch { /* invalid selector — keep walking */ }

      current = current.parentElement;
      depth++;
    }

    return parts.join(' > ');
  }

  function getDirectText(el) {
    return [...el.childNodes]
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent || '')
      .join('');
  }

  function getDirectTextRect(el) {
    const rects = [];
    for (const node of el.childNodes) {
      if (node.nodeType !== 3 || !(node.textContent || '').trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width >= 1 && rect.height >= 1) rects.push(rect);
      }
      range.detach?.();
    }
    if (rects.length === 0) return null;
    const left = Math.min(...rects.map(r => r.left));
    const top = Math.min(...rects.map(r => r.top));
    const right = Math.max(...rects.map(r => r.right));
    const bottom = Math.max(...rects.map(r => r.bottom));
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
      x: left,
      y: top,
    };
  }

  function collectVisualContrastReasons(el, style) {
    const reasons = new Set();
    const bgClip = style.webkitBackgroundClip || style.backgroundClip || '';
    const ownBgImage = style.backgroundImage || '';
    if (bgClip === 'text' && ownBgImage && ownBgImage !== 'none') {
      reasons.add('background-clip text');
    }
    if (style.textShadow && style.textShadow !== 'none') reasons.add('text shadow');

    let current = el;
    while (current && current.nodeType === 1) {
      const tag = current.tagName?.toLowerCase();
      const currentStyle = getComputedStyle(current);
      const bgImage = currentStyle.backgroundImage || '';
      const isDocumentSurface = tag === 'body' || tag === 'html';

      if (!isDocumentSurface && bgImage && bgImage !== 'none') {
        if (/url\s*\(/i.test(bgImage)) reasons.add('image background');
        if (/gradient/i.test(bgImage)) reasons.add('gradient background');
      }
      if (parseFloat(currentStyle.opacity) < 0.99) reasons.add('opacity stack');
      if (currentStyle.mixBlendMode && currentStyle.mixBlendMode !== 'normal') reasons.add('blend mode');
      if (currentStyle.filter && currentStyle.filter !== 'none') reasons.add('filter');
      if (currentStyle.backdropFilter && currentStyle.backdropFilter !== 'none') reasons.add('backdrop filter');

      const solidBg = parseRgb(currentStyle.backgroundColor);
      if (solidBg && solidBg.a >= 0.95 && (!bgImage || bgImage === 'none')) break;
      current = current.parentElement;
    }

    const sampleRect = getDirectTextRect(el) || el.getBoundingClientRect();
    if (sampleRect && document.elementsFromPoint) {
      const points = [
        [sampleRect.left + sampleRect.width / 2, sampleRect.top + sampleRect.height / 2],
        [sampleRect.left + Math.min(sampleRect.width - 1, Math.max(1, sampleRect.width * 0.25)), sampleRect.top + sampleRect.height / 2],
        [sampleRect.left + Math.min(sampleRect.width - 1, Math.max(1, sampleRect.width * 0.75)), sampleRect.top + sampleRect.height / 2],
      ];
      for (const [x, y] of points) {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
        const stack = document.elementsFromPoint(x, y);
        const selfIndex = stack.findIndex(node => node === el || el.contains(node) || node.contains?.(el));
        if (selfIndex < 0) continue;
        for (const node of stack.slice(selfIndex + 1)) {
          const nodeTag = node.tagName?.toLowerCase();
          if (nodeTag === 'img' || nodeTag === 'picture' || nodeTag === 'video' || nodeTag === 'canvas' || nodeTag === 'svg') {
            reasons.add(`${nodeTag} underlay`);
            break;
          }
        }
      }
    }

    return [...reasons];
  }

  function collectVisualContrastCandidates(options = {}) {
    const maxCandidates = Number.isFinite(options.maxCandidates) ? options.maxCandidates : 12;
    const candidates = [];
    for (const el of document.querySelectorAll('*')) {
      if (candidates.length >= maxCandidates) break;
      if (el.closest('.tcher-overlay, .tcher-label, .tcher-banner, .tcher-tooltip')) continue;
      if (el.closest('[id^="tcher-live-"]')) continue;
      if (el === document.body || el === document.documentElement) continue;

      const tag = el.tagName.toLowerCase();
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const directText = getDirectText(el);
      const hasDirectText = directText.trim().length > 0;
      if (!hasDirectText || isEmojiOnlyText(directText)) continue;

      const bgColor = readOwnBackgroundColor(el, style);
      const isStyledButton = (tag === 'a' || tag === 'button')
        && bgColor && bgColor.a > 0.5;
      if (SAFE_TAGS.has(tag) && !isStyledButton) continue;

      const rect = getDirectTextRect(el) || el.getBoundingClientRect();
      if (!rect || rect.width < 4 || rect.height < 4) continue;

      const reasons = collectVisualContrastReasons(el, style);
      if (reasons.length === 0) continue;

      const textColor = parseRgb(style.color);
      const fontSize = parseFloat(style.fontSize) || 16;
      const fontWeight = parseInt(style.fontWeight) || 400;
      const isLargeText = fontSize >= WCAG_LARGE_TEXT_PX || (fontSize >= WCAG_LARGE_BOLD_TEXT_PX && fontWeight >= 700);
      const threshold = isLargeText ? 3.0 : 4.5;
      const clip = {
        x: Math.max(0, Math.floor(rect.left + window.scrollX - 2)),
        y: Math.max(0, Math.floor(rect.top + window.scrollY - 2)),
        width: Math.max(1, Math.ceil(rect.width + 4)),
        height: Math.max(1, Math.ceil(rect.height + 4)),
      };

      candidates.push({
        selector: generateSelector(el),
        tagName: tag,
        text: directText.trim().replace(/\s+/g, ' ').slice(0, 80),
        threshold,
        reasons,
        clip,
        textColor,
        preferRenderedForeground: !textColor || textColor.a < 0.99 || reasons.some(reason =>
          reason === 'opacity stack' ||
          reason === 'blend mode' ||
          reason === 'filter' ||
          reason === 'backdrop filter' ||
          reason === 'background-clip text'
        ),
        backgroundClipText: reasons.includes('background-clip text'),
      });
    }
    return candidates;
  }

  const visualContrastImageCache = new Map();
  const visualContrastRasterCache = new WeakMap();

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function blendRgba(fg, bg) {
    if (!fg) return bg || null;
    if (!bg || fg.a == null || fg.a >= 0.999) {
      return { r: clampByte(fg.r), g: clampByte(fg.g), b: clampByte(fg.b), a: fg.a == null ? 1 : fg.a };
    }
    const alpha = Math.max(0, Math.min(1, fg.a));
    return {
      r: clampByte(fg.r * alpha + bg.r * (1 - alpha)),
      g: clampByte(fg.g * alpha + bg.g * (1 - alpha)),
      b: clampByte(fg.b * alpha + bg.b * (1 - alpha)),
      a: 1,
    };
  }

  function pickWorstContrastColor(textColor, colors) {
    const usable = (colors || []).filter(Boolean);
    if (!usable.length) return null;
    let worst = usable[0];
    let worstRatio = contrastRatio(textColor, worst);
    for (const color of usable.slice(1)) {
      const ratio = contrastRatio(textColor, color);
      if (ratio < worstRatio) {
        worst = color;
        worstRatio = ratio;
      }
    }
    return worst;
  }

  function firstCssUrl(value) {
    const match = String(value || '').match(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/i);
    if (!match) return '';
    return (match[1] || match[2] || match[3] || '').trim();
  }

  function getLayerValue(value, index = 0) {
    return String(value || '').split(',')[index]?.trim() || '';
  }

  function parsePositionToken(token, container, painted) {
    if (!token || token === 'center') return (container - painted) / 2;
    if (token === 'left' || token === 'top') return 0;
    if (token === 'right' || token === 'bottom') return container - painted;
    if (/%$/.test(token)) {
      const pct = parseFloat(token) / 100;
      return (container - painted) * pct;
    }
    if (/px$/.test(token)) return parseFloat(token) || 0;
    return (container - painted) / 2;
  }

  function parsePositionPair(positionValue) {
    const tokens = String(positionValue || '50% 50%').trim().split(/\s+/).filter(Boolean);
    const first = tokens[0] || '50%';
    if (tokens.length < 2) {
      if (first === 'top' || first === 'bottom') return ['50%', first];
      return [first, '50%'];
    }
    return [first, tokens[1] || '50%'];
  }

  function resolvePaintedImageRect(containerRect, image, sizeValue, positionValue) {
    const intrinsicWidth = image.naturalWidth || image.videoWidth || image.width || 1;
    const intrinsicHeight = image.naturalHeight || image.videoHeight || image.height || 1;
    let paintedWidth = intrinsicWidth;
    let paintedHeight = intrinsicHeight;
    const size = String(sizeValue || 'auto').trim();

    if (size === 'cover' || size === 'contain') {
      const scale = size === 'cover'
        ? Math.max(containerRect.width / intrinsicWidth, containerRect.height / intrinsicHeight)
        : Math.min(containerRect.width / intrinsicWidth, containerRect.height / intrinsicHeight);
      paintedWidth = intrinsicWidth * scale;
      paintedHeight = intrinsicHeight * scale;
    } else if (size && size !== 'auto') {
      const parts = size.split(/\s+/);
      const widthToken = parts[0];
      const heightToken = parts[1] || 'auto';
      if (/%$/.test(widthToken)) paintedWidth = containerRect.width * (parseFloat(widthToken) / 100);
      else if (/px$/.test(widthToken)) paintedWidth = parseFloat(widthToken) || paintedWidth;
      if (heightToken === 'auto') paintedHeight = paintedWidth * (intrinsicHeight / intrinsicWidth);
      else if (/%$/.test(heightToken)) paintedHeight = containerRect.height * (parseFloat(heightToken) / 100);
      else if (/px$/.test(heightToken)) paintedHeight = parseFloat(heightToken) || paintedHeight;
    }

    const [xToken, yToken] = parsePositionPair(positionValue);
    const positionX = parsePositionToken(xToken, containerRect.width, paintedWidth);
    const positionY = parsePositionToken(yToken, containerRect.height, paintedHeight);
    return {
      left: containerRect.left + positionX,
      top: containerRect.top + positionY,
      width: paintedWidth,
      height: paintedHeight,
      intrinsicWidth,
      intrinsicHeight,
    };
  }

  function parseObjectPosition(positionValue) {
    return parsePositionPair(positionValue);
  }

  function resolveObjectImageRect(containerRect, image, style) {
    const intrinsicWidth = image.naturalWidth || image.videoWidth || image.width || 1;
    const intrinsicHeight = image.naturalHeight || image.videoHeight || image.height || 1;
    const fit = style.objectFit || 'fill';
    let paintedWidth = containerRect.width;
    let paintedHeight = containerRect.height;
    if (fit === 'contain' || fit === 'cover') {
      const scale = fit === 'cover'
        ? Math.max(containerRect.width / intrinsicWidth, containerRect.height / intrinsicHeight)
        : Math.min(containerRect.width / intrinsicWidth, containerRect.height / intrinsicHeight);
      paintedWidth = intrinsicWidth * scale;
      paintedHeight = intrinsicHeight * scale;
    } else if (fit === 'none') {
      paintedWidth = intrinsicWidth;
      paintedHeight = intrinsicHeight;
    } else if (fit === 'scale-down') {
      const containScale = Math.min(containerRect.width / intrinsicWidth, containerRect.height / intrinsicHeight, 1);
      paintedWidth = intrinsicWidth * containScale;
      paintedHeight = intrinsicHeight * containScale;
    }
    const [xToken, yToken] = parseObjectPosition(style.objectPosition);
    return {
      left: containerRect.left + parsePositionToken(xToken, containerRect.width, paintedWidth),
      top: containerRect.top + parsePositionToken(yToken, containerRect.height, paintedHeight),
      width: paintedWidth,
      height: paintedHeight,
      intrinsicWidth,
      intrinsicHeight,
    };
  }

  function pointToImageSource(point, paintedRect) {
    if (
      point.x < paintedRect.left ||
      point.y < paintedRect.top ||
      point.x > paintedRect.left + paintedRect.width ||
      point.y > paintedRect.top + paintedRect.height
    ) {
      return null;
    }
    return {
      x: Math.max(0, Math.min(paintedRect.intrinsicWidth - 1, ((point.x - paintedRect.left) / paintedRect.width) * paintedRect.intrinsicWidth)),
      y: Math.max(0, Math.min(paintedRect.intrinsicHeight - 1, ((point.y - paintedRect.top) / paintedRect.height) * paintedRect.intrinsicHeight)),
    };
  }

  async function loadVisualContrastImage(src) {
    if (!src) return null;
    if (visualContrastImageCache.has(src)) return visualContrastImageCache.get(src);
    const promise = new Promise(resolve => {
      const img = new Image();
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 800);
      try {
        const absolute = new URL(src, location.href);
        if (absolute.origin !== location.origin && absolute.protocol !== 'data:' && absolute.protocol !== 'blob:') {
          img.crossOrigin = 'anonymous';
        }
      } catch {
        // Let the browser resolve unusual URLs itself.
      }
      img.onload = () => finish(img);
      img.onerror = () => finish(null);
      img.src = src;
    });
    visualContrastImageCache.set(src, promise);
    return promise;
  }

  function sampleDrawablePixel(drawable, sourcePoint) {
    if (visualContrastRasterCache.has(drawable)) {
      const cached = visualContrastRasterCache.get(drawable);
      if (!cached || !cached.ctx) return { status: 'unresolved', reason: cached?.reason || 'image sample failed' };
      try {
        const x = Math.max(0, Math.min(cached.width - 1, Math.floor(sourcePoint.x * cached.scaleX)));
        const y = Math.max(0, Math.min(cached.height - 1, Math.floor(sourcePoint.y * cached.scaleY)));
        const data = cached.ctx.getImageData(x, y, 1, 1).data;
        return {
          status: 'sampled',
          color: { r: data[0], g: data[1], b: data[2], a: data[3] / 255 },
        };
      } catch (err) {
        return {
          status: 'unresolved',
          reason: /taint|cross-origin|Security/i.test(err?.message || '') ? 'tainted image' : 'image sample failed',
        };
      }
    }

    const canvas = document.createElement('canvas');
    const intrinsicWidth = drawable.naturalWidth || drawable.videoWidth || drawable.width || 1;
    const intrinsicHeight = drawable.naturalHeight || drawable.videoHeight || drawable.height || 1;
    const maxRasterSide = 640;
    const scale = Math.min(1, maxRasterSide / Math.max(intrinsicWidth, intrinsicHeight));
    canvas.width = Math.max(1, Math.round(intrinsicWidth * scale));
    canvas.height = Math.max(1, Math.round(intrinsicHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { status: 'unresolved', reason: 'canvas unavailable' };
    try {
      ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
      const cached = {
        ctx,
        width: canvas.width,
        height: canvas.height,
        scaleX: canvas.width / intrinsicWidth,
        scaleY: canvas.height / intrinsicHeight,
      };
      visualContrastRasterCache.set(drawable, cached);
      const x = Math.max(0, Math.min(cached.width - 1, Math.floor(sourcePoint.x * cached.scaleX)));
      const y = Math.max(0, Math.min(cached.height - 1, Math.floor(sourcePoint.y * cached.scaleY)));
      const data = ctx.getImageData(x, y, 1, 1).data;
      return {
        status: 'sampled',
        color: { r: data[0], g: data[1], b: data[2], a: data[3] / 255 },
      };
    } catch (err) {
      const reason = /taint|cross-origin|Security/i.test(err?.message || '') ? 'tainted image' : 'image sample failed';
      visualContrastRasterCache.set(drawable, { ctx: null, reason });
      return {
        status: 'unresolved',
        reason,
      };
    }
  }

  async function sampleCssBackground(el, style, point, textColor) {
    const rect = el.getBoundingClientRect();
    const bgImage = style.backgroundImage || '';
    if (bgImage && bgImage !== 'none') {
      if (/gradient/i.test(bgImage)) {
        const color = pickWorstContrastColor(textColor, parseGradientColors(bgImage));
        if (color) return { status: 'sampled', color, method: 'analytic-gradient' };
      }
      if (/url\s*\(/i.test(bgImage)) {
        const img = await loadVisualContrastImage(firstCssUrl(bgImage));
        if (!img) return { status: 'unresolved', reason: 'image unavailable' };
        const paintedRect = resolvePaintedImageRect(
          rect,
          img,
          getLayerValue(style.backgroundSize) || 'auto',
          getLayerValue(style.backgroundPosition) || '50% 50%',
        );
        const sourcePoint = pointToImageSource(point, paintedRect);
        if (!sourcePoint) return { status: 'unresolved', reason: 'point outside background image' };
        const sample = sampleDrawablePixel(img, sourcePoint);
        if (sample.status === 'sampled') return { ...sample, method: 'canvas-background-image' };
        return sample;
      }
    }
    const bg = parseRgb(style.backgroundColor);
    if (bg && bg.a > 0.05) return { status: 'sampled', color: bg, method: 'solid-background' };
    return { status: 'unresolved', reason: 'no readable background' };
  }

  async function sampleImageElement(img, point) {
    const rect = img.getBoundingClientRect();
    const style = getComputedStyle(img);
    const paintedRect = resolveObjectImageRect(rect, img, style);
    const sourcePoint = pointToImageSource(point, paintedRect);
    if (!sourcePoint) return { status: 'unresolved', reason: 'point outside image' };
    const sample = sampleDrawablePixel(img, sourcePoint);
    if (sample.status === 'sampled') return { ...sample, method: 'canvas-img-underlay' };

    if (img.currentSrc || img.src) {
      const loaded = await loadVisualContrastImage(img.currentSrc || img.src);
      if (loaded) {
        const loadedRect = { ...paintedRect, intrinsicWidth: loaded.naturalWidth || loaded.width || paintedRect.intrinsicWidth, intrinsicHeight: loaded.naturalHeight || loaded.height || paintedRect.intrinsicHeight };
        const loadedPoint = pointToImageSource(point, loadedRect);
        if (loadedPoint) {
          const loadedSample = sampleDrawablePixel(loaded, loadedPoint);
          if (loadedSample.status === 'sampled') return { ...loadedSample, method: 'canvas-img-underlay' };
        }
      }
    }
    return sample;
  }

  function textSamplePoints(rect) {
    const insetX = Math.min(12, Math.max(1, rect.width * 0.12));
    const insetY = Math.min(8, Math.max(1, rect.height * 0.22));
    const xs = rect.width < 28
      ? [rect.left + rect.width / 2]
      : [rect.left + insetX, rect.left + rect.width / 2, rect.right - insetX];
    const ys = rect.height < 22
      ? [rect.top + rect.height / 2]
      : [rect.top + insetY, rect.top + rect.height / 2, rect.bottom - insetY];
    const points = [];
    for (const y of ys) {
      for (const x of xs) {
        if (x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight) points.push({ x, y });
      }
    }
    return points;
  }

  async function sampleVisualBackgroundAtPoint(el, point, textColor, depth = 0) {
    if (depth > 8) {
      return { status: 'unresolved', reason: 'background stack too deep' };
    }
    const stack = typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(point.x, point.y)
      : [];
    const selfIndex = stack.findIndex(node => node === el || el.contains(node));
    const nodes = selfIndex >= 0 ? stack.slice(selfIndex) : [el, ...stack];
    const unresolved = [];

    for (const node of nodes) {
      if (!node || node.nodeType !== 1) continue;
      if (node.closest?.('.tcher-overlay, .tcher-label, .tcher-banner, .tcher-tooltip')) continue;
      const tag = node.tagName?.toLowerCase();
      if (tag === 'img') {
        const sample = await sampleImageElement(node, point);
        if (sample.status === 'sampled') return sample;
        unresolved.push(sample.reason);
        continue;
      }
      if (tag === 'canvas' || tag === 'video') {
        const rect = node.getBoundingClientRect();
        const sourcePoint = pointToImageSource(point, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          intrinsicWidth: node.width || node.videoWidth || rect.width,
          intrinsicHeight: node.height || node.videoHeight || rect.height,
        });
        if (sourcePoint) {
          const sample = sampleDrawablePixel(node, sourcePoint);
          if (sample.status === 'sampled') return { ...sample, method: `canvas-${tag}-underlay` };
          unresolved.push(sample.reason);
        }
        continue;
      }
      const style = getComputedStyle(node);
      const sample = await sampleCssBackground(node, style, point, textColor);
      if (sample.status === 'sampled') {
        if (!sample.color || sample.color.a == null || sample.color.a >= 0.95) return sample;
        const under = await sampleVisualBackgroundAtPoint(node.parentElement || document.body, point, textColor, depth + 1);
        if (under.status === 'sampled') {
          return {
            status: 'sampled',
            color: blendRgba(sample.color, under.color),
            method: `${sample.method}+alpha`,
          };
        }
        return sample;
      }
      unresolved.push(sample.reason);
    }

    return {
      status: 'unresolved',
      reason: [...new Set(unresolved.filter(Boolean))].slice(0, 3).join(', ') || 'no readable visual background',
    };
  }

  async function analyzeVisualContrastCandidate(candidate) {
    let el;
    try {
      el = document.querySelector(candidate.selector);
    } catch {
      return { ...candidate, status: 'unresolved', confidence: 'none', reason: 'stale selector' };
    }
    if (!el) return { ...candidate, status: 'unresolved', confidence: 'none', reason: 'missing element' };

    const blockingReason = (candidate.reasons || []).find(reason =>
      reason === 'background-clip text' ||
      reason === 'blend mode' ||
      reason === 'filter' ||
      reason === 'backdrop filter' ||
      reason === 'opacity stack' ||
      reason === 'text shadow'
    );
    if (blockingReason) {
      return { ...candidate, status: 'unresolved', confidence: 'none', reason: `${blockingReason} needs screenshot pixels` };
    }

    const style = getComputedStyle(el);
    const textColor = parseRgb(style.color) || candidate.textColor;
    if (!textColor) return { ...candidate, status: 'unresolved', confidence: 'none', reason: 'unreadable text color' };

    const rect = getDirectTextRect(el) || el.getBoundingClientRect();
    if (!rect || rect.width < 4 || rect.height < 4) {
      return { ...candidate, status: 'unresolved', confidence: 'none', reason: 'missing text rect' };
    }

    const points = textSamplePoints(rect);
    if (points.length === 0) {
      return { ...candidate, status: 'unresolved', confidence: 'none', reason: 'text outside viewport' };
    }

    const ratios = [];
    const methods = new Set();
    const unresolved = [];
    for (const point of points) {
      const sample = await sampleVisualBackgroundAtPoint(el, point, textColor);
      if (sample.status !== 'sampled' || !sample.color) {
        unresolved.push(sample.reason);
        continue;
      }
      const fg = blendRgba(textColor, sample.color);
      ratios.push(contrastRatio(fg, sample.color));
      if (sample.method) methods.add(sample.method);
    }

    if (ratios.length < Math.min(3, points.length)) {
      return {
        ...candidate,
        status: 'unresolved',
        confidence: 'none',
        samples: ratios.length,
        reason: [...new Set(unresolved.filter(Boolean))].slice(0, 3).join(', ') || 'not enough readable samples',
      };
    }

    ratios.sort((a, b) => a - b);
    const pick = pct => ratios[Math.min(ratios.length - 1, Math.max(0, Math.floor((pct / 100) * ratios.length)))];
    const measuredRatio = pick(10);
    const medianRatio = pick(50);
    const status = measuredRatio < candidate.threshold ? 'fail' : 'pass';
    const method = [...methods].sort().join(', ') || 'browser-visual';
    const textLabel = candidate.text ? ` "${candidate.text}"` : '';
    const detail = `browser contrast ${measuredRatio.toFixed(1)}:1 median ${medianRatio.toFixed(1)}:1 (need ${candidate.threshold}:1) via ${method}${textLabel}`;
    return {
      ...candidate,
      status,
      confidence: method.includes('canvas-') ? 'high' : 'medium',
      method,
      ratio: measuredRatio,
      medianRatio,
      samples: ratios.length,
      finding: status === 'fail' ? { id: 'low-contrast', snippet: detail } : null,
    };
  }

  function waitForVisualPaint() {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  async function analyzeVisualContrast(options = {}) {
    const candidates = collectVisualContrastCandidates(options);
    const results = [];
    const shouldScrollOffscreen = options.scrollOffscreen === true;
    const restoreScroll = { x: window.scrollX, y: window.scrollY };
    for (const candidate of candidates) {
      if (shouldScrollOffscreen && (window.scrollX !== restoreScroll.x || window.scrollY !== restoreScroll.y)) {
        window.scrollTo(restoreScroll.x, restoreScroll.y);
        await waitForVisualPaint();
      }
      let result = await analyzeVisualContrastCandidate(candidate);
      if (shouldScrollOffscreen && result.status === 'unresolved' && result.reason === 'text outside viewport') {
        let el = null;
        try {
          el = document.querySelector(candidate.selector);
        } catch {
          el = null;
        }
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
          await waitForVisualPaint();
          result = await analyzeVisualContrastCandidate(candidate);
        }
      }
      results.push(result);
    }
    if (shouldScrollOffscreen && (window.scrollX !== restoreScroll.x || window.scrollY !== restoreScroll.y)) {
      window.scrollTo(restoreScroll.x, restoreScroll.y);
    }
    return results;
  }

  function isElementHidden(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (typeof el.checkVisibility === 'function') return !el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
    // Fallback: zero size or no offsetParent (covers display:none and detached subtrees)
    return el.offsetWidth === 0 && el.offsetHeight === 0;
  }

  function serializeFindings(allFindings) {
    return allFindings.map(({ el, findings }) => ({
      selector: generateSelector(el),
      tagName: el.tagName?.toLowerCase() || 'unknown',
      rect: (el !== document.body && el !== document.documentElement && el.getBoundingClientRect)
        ? el.getBoundingClientRect().toJSON() : null,
      isPageLevel: el === document.body || el === document.documentElement,
      isHidden: isElementHidden(el),
      findings: findings.map(f => {
        const ap = ANTIPATTERNS.find(a => a.id === (f.type || f.id));
        return {
          type: f.type || f.id,
          category: ap ? ap.category : 'quality',
          severity: ap?.severity || 'warning',
          detail: f.detail || f.snippet,
          name: ap ? ap.name : (f.type || f.id),
          description: ap ? ap.description : '',
        };
      }),
    }));
  }

  const printSummary = function(allFindings) {
    if (allFindings.length === 0) {
      console.log('%c[tcher] No anti-patterns found.', 'color: #22c55e; font-weight: bold');
      return;
    }
    console.group(
      `%c[tcher] ${allFindings.length} anti-pattern${allFindings.length === 1 ? '' : 's'} found`,
      'color: oklch(84% 0.19 80.46); font-weight: bold'
    );
    for (const { el, findings } of allFindings) {
      for (const f of findings) {
        console.log(`%c${f.type || f.id}%c ${f.detail || f.snippet}`,
          'color: oklch(84% 0.19 80.46); font-weight: bold', 'color: inherit', el);
      }
    }
    console.groupEnd();
  };

  function addBrowserFindings(groupMap, el, findings) {
    if (!findings || findings.length === 0) return;
    const existing = groupMap.get(el);
    if (existing) existing.push(...findings);
    else groupMap.set(el, [...findings]);
  }

  function browserFindingsFromMap(groupMap) {
    return [...groupMap.entries()].map(([el, findings]) => ({ el, findings }));
  }

  function collectBrowserFindings() {
    const groupMap = new Map();
    const _disabled = EXTENSION_MODE ? (window.__TCHER_CONFIG__?.disabledRules || []) : [];
    const _ruleOk = (id) => !_disabled.length || !_disabled.includes(id);
    // Note: provider-gated rules (--gpt / --gemini) are NOT filtered here. In a
    // real browser env (detector page, live overlay, extension) running every
    // check is free, so we always surface them; the gating is purely a CLI
    // output concern, applied in the Node engines' detect* return paths.

    for (const el of document.querySelectorAll('*')) {
      // Skip tcher's own elements and any descendants (overlays, labels, banner, nav buttons)
      if (el.closest('.tcher-overlay, .tcher-label, .tcher-banner, .tcher-banner-panel, .tcher-tooltip')) continue;
      // Skip browser extension elements (Claude, etc.)
      const elId = el.id || '';
      if (elId.startsWith('claude-') || elId.startsWith('cic-')) continue;
      // Skip the tcher live-mode overlay (highlight, tooltip, bar, picker, toast).
      // These are inspector chrome, not part of the user's design.
      if (el.closest('[id^="tcher-live-"]')) continue;
      // Skip html/body -- page-level findings go in the banner, not a full-page overlay
      if (el === document.body || el === document.documentElement) continue;

      const findings = [
        ...checkElementBordersDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementColorsDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementMotionDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementGlowDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementAIPaletteDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementIconTileDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementItalicSerifDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementQualityDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementOversizedH1DOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementClippedOverflowDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementGptBorderShadowDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementTextOverflowDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementBrokenImageDOM(el).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementEmojiUi(el, el.tagName.toLowerCase()).map(f => ({ type: f.id, detail: f.snippet })),
        // ux rules (shared adapters with the static engine; tap-target
        // sizing runs as a page pass below — it needs every neighbor)
        ...checkElementMissingAlt(el, el.tagName.toLowerCase()).map(f => ({ type: f.id, detail: f.snippet })),
        ...checkElementIconButtonName(el, el.tagName.toLowerCase()).map(f => ({ type: f.id, detail: f.snippet })),
        ...(el.tagName === 'A'
          ? checkElementLinkAffordance(el, 'a', getComputedStyle(el), window).map(f => ({ type: f.id, detail: f.snippet }))
          : []),
      ].filter(f => _ruleOk(f.type));

      addBrowserFindings(groupMap, el, findings);

      // Hero eyebrow: the offending element is the eyebrow above the heading,
      // not the heading itself — highlight the previous sibling instead.
      const eyebrowFindings = checkElementHeroEyebrowDOM(el)
        .map(f => ({ type: f.id, detail: f.snippet }))
        .filter(f => _ruleOk(f.type));
      if (eyebrowFindings.length > 0 && el.previousElementSibling) {
        addBrowserFindings(groupMap, el.previousElementSibling, eyebrowFindings);
      }
    }

    const pageLevelFindings = [];

    const typoFindings = checkTypography().filter(f => _ruleOk(f.type));
    if (typoFindings.length > 0) {
      pageLevelFindings.push(...typoFindings);
      addBrowserFindings(groupMap, document.body, typoFindings);
    }

    const sectionKickerFindings = checkRepeatedSectionKickersDOM()
      .map(f => ({ type: f.id, detail: f.snippet }))
      .filter(f => _ruleOk(f.type));
    if (sectionKickerFindings.length > 0) {
      pageLevelFindings.push(...sectionKickerFindings);
      addBrowserFindings(groupMap, document.body, sectionKickerFindings);
    }

    // Page-text passes (em-dash cadence, marketing buzzwords) — mirrors the
    // regex engine so text tells show up in the live overlay too.
    const pageTextFindings = checkPageTextDOM()
      .map(f => ({ type: f.id, detail: f.snippet }))
      .filter(f => _ruleOk(f.type));
    if (pageTextFindings.length > 0) {
      pageLevelFindings.push(...pageTextFindings);
      addBrowserFindings(groupMap, document.body, pageTextFindings);
    }

    // Emoji-bullet lists: attach each finding to its actual <ul>/<ol> so the
    // list gets an on-page outline + a clickable popover row (per-element
    // emoji headings/buttons run in the element loop above).
    for (const f of checkEmojiBulletsFromDoc(document)) {
      if (!_ruleOk(f.id)) continue;
      addBrowserFindings(groupMap, f.el || document.body, [{ type: f.id, detail: f.snippet }]);
    }

    // ux page rules (shared adapter with the static engine): viewport meta,
    // nav/select/form overload, header logo link, autocomplete, input labels.
    // Findings carry their concrete element where one exists; page-wide ones
    // (viewport meta) land in the banner via pageLevelFindings.
    for (const f of checkUxPageFromDoc(document, (n) => getComputedStyle(n))) {
      if (!_ruleOk(f.id)) continue;
      const target = f.el && f.el.nodeType === 1 ? f.el : document.body;
      if (target === document.body) pageLevelFindings.push({ type: f.id, detail: f.snippet });
      addBrowserFindings(groupMap, target, [{ type: f.id, detail: f.snippet }]);
    }

    // quality: Thai typography — shared page pass with the static engine.
    // Each finding carries its concrete element so the overlay outlines it;
    // silent on pages with no Thai text.
    for (const f of checkThaiTypographyFromDoc(document, (n) => getComputedStyle(n))) {
      if (!_ruleOk(f.id)) continue;
      const target = f.el && f.el.nodeType === 1 ? f.el : document.body;
      addBrowserFindings(groupMap, target, [{ type: f.id, detail: f.snippet }]);
    }

    // ux: focus-outline-removed — page pass over same-origin stylesheet text.
    // tcher's own chrome styles are excluded by owner id/ancestry.
    const focusCssChunks = [];
    for (const sheet of document.styleSheets) {
      const owner = sheet.ownerNode;
      if (owner && owner.id && String(owner.id).startsWith('tcher-')) continue;
      if (owner && owner.closest && owner.closest('.tcher-overlay, .tcher-banner, .tcher-banner-panel, [id^="tcher-live-"]')) continue;
      try {
        for (const rule of sheet.cssRules) focusCssChunks.push(rule.cssText);
      } catch { /* cross-origin stylesheet; skip */ }
    }
    const focusFindings = checkFocusOutlineCss(focusCssChunks.join('\n'))
      .map(f => ({ type: f.id, detail: f.snippet }))
      .filter(f => _ruleOk(f.type));
    if (focusFindings.length > 0) {
      pageLevelFindings.push(...focusFindings);
      addBrowserFindings(groupMap, document.body, focusFindings);
    }

    // ux: oversized-image-payload — browser-only (needs natural sizes; the
    // static engine cannot know what file actually shipped).
    for (const img of document.querySelectorAll('img')) {
      if (img.closest('.tcher-overlay, .tcher-banner, .tcher-banner-panel, [id^="tcher-live-"]')) continue;
      const rect = img.getBoundingClientRect();
      const oversize = checkOversizedImage({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: rect.width,
        displayHeight: rect.height,
        src: img.currentSrc || img.src || '',
        dpr: window.devicePixelRatio || 1,
      }).filter(f => _ruleOk(f.id));
      if (oversize.length > 0) {
        addBrowserFindings(groupMap, img, oversize.map(f => ({ type: f.id, detail: f.snippet })));
      }
    }

    // ux: tap-target sizing + crowding — browser-only (needs real layout).
    // One rect collection feeds both: sizing applies the WCAG 2.5.8 spacing
    // alternative (small is fine when isolated), crowding finds packed
    // clusters. Wrappers containing another target are skipped so a linked
    // card doesn't collide with its own inner button.
    const targetRects = [];
    for (const t of document.querySelectorAll('a[href], button, input, select, [role="button"]')) {
      if (t.querySelector('a[href], button, input, select, [role="button"]')) continue;
      const rect = uxCollectTargetRect(t);
      if (rect) targetRects.push(rect);
    }
    for (const f of [...checkTapTargetSpacing(targetRects), ...checkTapTargetsCrowded(targetRects)]) {
      if (!_ruleOk(f.id)) continue;
      addBrowserFindings(groupMap, f.el || document.body, [{ type: f.id, detail: f.snippet }]);
    }

    const layoutFindings = checkLayout().filter(f => _ruleOk(f.type));
    for (const f of layoutFindings) {
      const el = f.el || document.body;
      addBrowserFindings(groupMap, el, [{ type: f.type, detail: f.detail || f.snippet }]);
    }

    // Page-level quality checks (headings, etc.)
    const qualityFindings = checkPageQualityDOM().filter(f => _ruleOk(f.type));
    if (qualityFindings.length > 0) {
      pageLevelFindings.push(...qualityFindings);
      addBrowserFindings(groupMap, document.body, qualityFindings);
    }

    const creamFindings = checkCreamPalette(document)
      .map(f => ({ type: f.id, detail: f.snippet }))
      .filter(f => _ruleOk(f.type));
    if (creamFindings.length > 0) {
      pageLevelFindings.push(...creamFindings);
      addBrowserFindings(groupMap, document.body, creamFindings);
    }

    // Regex-on-HTML checks (shared with Node)
    // Clone the document and strip tcher-live overlay nodes before the
    // regex scan, so the inspector's own inline styles (transitions on top/
    // left/width/height, etc.) don't register as page anti-patterns.
    const docClone = document.documentElement.cloneNode(true);
    for (const node of docClone.querySelectorAll('[id^="tcher-live-"]')) {
      node.remove();
    }
    const htmlPatternFindings = checkHtmlPatterns(docClone.outerHTML);
    if (htmlPatternFindings.length > 0) {
      const mapped = htmlPatternFindings.map(f => ({ type: f.id, detail: f.snippet })).filter(f => _ruleOk(f.type));
      pageLevelFindings.push(...mapped);
      addBrowserFindings(groupMap, document.body, mapped);
    }

    return {
      groupMap,
      allFindings: browserFindingsFromMap(groupMap),
      pageLevelFindings,
    };
  }

  function shouldRunVisualContrast(options = {}) {
    return options.visualContrast === true || window.__TCHER_CONFIG__?.visualContrast === true;
  }

  function visualContrastOptions(options = {}) {
    const config = window.__TCHER_CONFIG__ || {};
    const scrollOffscreen = typeof options.scrollOffscreen === 'boolean'
      ? options.scrollOffscreen
      : typeof options.visualContrastScrollOffscreen === 'boolean'
        ? options.visualContrastScrollOffscreen
        : typeof config.visualContrastScrollOffscreen === 'boolean'
          ? config.visualContrastScrollOffscreen
          : false;
    return {
      ...options,
      maxCandidates: Number.isFinite(options.visualContrastMaxCandidates)
        ? options.visualContrastMaxCandidates
        : Number.isFinite(options.maxCandidates)
          ? options.maxCandidates
          : Number.isFinite(config.visualContrastMaxCandidates)
            ? config.visualContrastMaxCandidates
            : undefined,
      scrollOffscreen,
    };
  }

  let lastVisualContrastAnalyses = [];
  let lazyVisualContrastObserver = null;
  let lazyVisualContrastPending = new WeakMap();
  const lazyVisualContrastResolving = new WeakSet();
  let scanGeneration = 0;

  function rememberVisualContrastAnalysis(result) {
    if (!result?.selector) {
      lastVisualContrastAnalyses.push(result);
      return;
    }
    const idx = lastVisualContrastAnalyses.findIndex(item => item.selector === result.selector);
    if (idx >= 0) lastVisualContrastAnalyses[idx] = result;
    else lastVisualContrastAnalyses.push(result);
  }

  function disconnectLazyVisualContrastObserver() {
    if (lazyVisualContrastObserver) {
      lazyVisualContrastObserver.disconnect();
      lazyVisualContrastObserver = null;
    }
    lazyVisualContrastPending = new WeakMap();
  }

  function addVisualContrastResult(groupMap, result, options = {}) {
    if (result.status !== 'fail' || !result.finding || !result.selector) return false;
    let el = null;
    try {
      el = document.querySelector(result.selector);
    } catch {
      el = null;
    }
    if (!el) return false;
    const findingType = result.finding.type || result.finding.id || 'low-contrast';
    const existing = groupMap.get(el) || [];
    if (existing.some(f => (f.type || f.id) === findingType)) return false;
    addBrowserFindings(groupMap, el, [{
      type: findingType,
      detail: result.finding.detail || result.finding.snippet,
    }]);
    if (options.decorate && el !== document.body && el !== document.documentElement) {
      highlight(el, groupMap.get(el) || []);
    }
    return true;
  }

  function scanResultMeta(options = {}) {
    const scanId = options.scanId;
    if (typeof scanId !== 'string' && typeof scanId !== 'number') return {};
    return { scanId: String(scanId) };
  }

  function postSerializedFindings(groupMap, options = {}) {
    if (!EXTENSION_MODE) return;
    const allFindings = browserFindingsFromMap(groupMap);
    window.postMessage({
      source: 'tcher-results',
      findings: serializeFindings(allFindings),
      count: allFindings.length,
      ...scanResultMeta(options),
    }, '*');
  }

  function postExtensionError(err) {
    if (!EXTENSION_MODE) return;
    window.postMessage({
      source: 'tcher-error',
      message: err?.message || String(err),
    }, '*');
  }

  function reportVisualContrastError(err, detail = {}) {
    window.dispatchEvent(new CustomEvent('tcher-visual-contrast-error', {
      detail: {
        ...detail,
        message: err?.message || String(err),
      },
    }));
    if (EXTENSION_MODE) {
      postExtensionError(err);
    } else {
      console.warn('[tcher] visual contrast scan failed', err);
    }
  }

  function scheduleLazyVisualContrast(groupMap, analyses, options = {}, runtime = {}) {
    disconnectLazyVisualContrastObserver();
    if (options.visualContrastLazy === false || options.scrollOffscreen !== false) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const unresolved = (analyses || []).filter(result =>
      result?.status === 'unresolved' &&
      result.reason === 'text outside viewport' &&
      result.selector
    );
    if (unresolved.length === 0) return;
    const generation = runtime.generation || scanGeneration;

    lazyVisualContrastObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        const candidate = lazyVisualContrastPending.get(el);
        if (!candidate || lazyVisualContrastResolving.has(el)) continue;
        lazyVisualContrastObserver?.unobserve(el);
        lazyVisualContrastPending.delete(el);
        lazyVisualContrastResolving.add(el);
        waitForVisualPaint()
          .then(() => analyzeVisualContrastCandidate(candidate))
          .then(result => {
            if (generation !== scanGeneration) return;
            rememberVisualContrastAnalysis(result);
            const added = addVisualContrastResult(groupMap, result, { decorate: true });
            if (added) {
              postSerializedFindings(groupMap, options);
              window.dispatchEvent(new CustomEvent('tcher-visual-contrast-resolved', {
                detail: {
                  selector: result.selector,
                  status: result.status,
                  finding: result.finding || null,
                },
              }));
            }
          })
          .catch(err => {
            reportVisualContrastError(err, { selector: candidate.selector });
          })
          .finally(() => {
            lazyVisualContrastResolving.delete(el);
          });
      }
    }, { threshold: 0.5 });

    for (const candidate of unresolved) {
      let el = null;
      try {
        el = document.querySelector(candidate.selector);
      } catch {
        el = null;
      }
      if (!el) continue;
      lazyVisualContrastPending.set(el, candidate);
      lazyVisualContrastObserver.observe(el);
    }
  }

  async function addVisualContrastFindings(groupMap, options = {}, runtime = {}) {
    if (!shouldRunVisualContrast(options)) {
      lastVisualContrastAnalyses = [];
      disconnectLazyVisualContrastObserver();
      return [];
    }
    const resolvedOptions = visualContrastOptions(options);
    const analyses = await analyzeVisualContrast(resolvedOptions);
    if (runtime.generation && runtime.generation !== scanGeneration) return analyses;
    lastVisualContrastAnalyses = analyses;
    for (const result of analyses) {
      addVisualContrastResult(groupMap, result, { decorate: runtime.decorate });
    }
    if (runtime.decorate || runtime.scheduleLazy) scheduleLazyVisualContrast(groupMap, analyses, resolvedOptions, runtime);
    return analyses;
  }

  async function collectBrowserFindingsAsync(options = {}, runtime = {}) {
    const collected = collectBrowserFindings();
    await addVisualContrastFindings(collected.groupMap, options, runtime);
    return {
      ...collected,
      allFindings: browserFindingsFromMap(collected.groupMap),
      visualContrastAnalyses: lastVisualContrastAnalyses,
    };
  }

  function clearOverlays() {
    scanGeneration += 1;
    disconnectLazyVisualContrastObserver();
    for (const o of [...overlays]) detachOverlay(o);
    overlays.length = 0;
    visibilityObserver.disconnect();
    overlayIndex = 0;
  }

  function renderBrowserFindings(collected, options = {}) {
    const { allFindings, pageLevelFindings } = collected;

    for (const { el, findings } of allFindings) {
      if (el === document.body || el === document.documentElement) continue;
      highlight(el, findings);
    }

    // The banner's severity summary counts EVERY finding on the page.
    // allFindings already contains the page-level ones (they are grouped
    // under document.body), so count from it alone; the banner's tag list
    // stays page-level only, since element findings wear their own outlines.
    const summarySource = allFindings.flatMap(g => g.findings);
    if (summarySource.length > 0) {
      showPageBanner(pageLevelFindings, summarySource, allFindings);
    }

    if (!EXTENSION_MODE) printSummary(allFindings);

    // In extension mode, post serialized results for the DevTools panel
    if (EXTENSION_MODE) {
      window.postMessage({
        source: 'tcher-results',
        findings: serializeFindings(allFindings),
        count: allFindings.length,
        ...scanResultMeta(options),
      }, '*');
    }

    // After this scan completes, all subsequent reveals are instant (no stagger, no animation)
    setTimeout(() => { firstScanDone = true; }, 1000);

    return allFindings;
  }

  let firstScanDone = false;
  const scan = function(options = {}) {
    clearOverlays();
    const generation = scanGeneration;
    const collected = collectBrowserFindings();
    const allFindings = renderBrowserFindings(collected, options);
    if (shouldRunVisualContrast(options)) {
      addVisualContrastFindings(collected.groupMap, options, { decorate: true, generation })
        .then(() => {
          if (generation === scanGeneration) postSerializedFindings(collected.groupMap, options);
        })
        .catch(err => {
          reportVisualContrastError(err);
        });
    }
    return allFindings;
  };

  const scanAsync = async function(options = {}) {
    clearOverlays();
    const generation = scanGeneration;
    if (shouldRunVisualContrast(options)) {
      const collected = await collectBrowserFindingsAsync(options, { generation, scheduleLazy: true });
      if (generation !== scanGeneration) return [];
      return renderBrowserFindings(collected, options);
    }
    lastVisualContrastAnalyses = [];
    return renderBrowserFindings(collectBrowserFindings(), options);
  };

  const detect = function(options = {}) {
    lastVisualContrastAnalyses = [];
    const { allFindings } = collectBrowserFindings();
    return options.serialize === false ? allFindings : serializeFindings(allFindings);
  };

  const detectAsync = async function(options = {}) {
    if (shouldRunVisualContrast(options)) {
      const { allFindings } = await collectBrowserFindingsAsync(options);
      return options.serialize === false ? allFindings : serializeFindings(allFindings);
    }
    lastVisualContrastAnalyses = [];
    const { allFindings } = collectBrowserFindings();
    return options.serialize === false ? allFindings : serializeFindings(allFindings);
  };

  if (EXTENSION_MODE) {
    // Extension mode: listen for commands, don't auto-scan
    window.addEventListener('message', (e) => {
      if (e.source !== window || !e.data || e.data.source !== 'tcher-command') return;
      if (e.data.action === 'scan') {
        if (e.data.config) window.__TCHER_CONFIG__ = e.data.config;
        try {
          scan(e.data.config || {});
        } catch (err) {
          postExtensionError(err);
        }
      }
      if (e.data.action === 'toggle-overlays') {
        const visible = !document.body.classList.contains('tcher-hidden');
        document.body.classList.toggle('tcher-hidden', visible);
        window.postMessage({ source: 'tcher-overlays-toggled', visible: !visible }, '*');
      }
      if (e.data.action === 'remove') {
        clearOverlays();
        styleEl.remove();
        if (spotlightBackdrop) { spotlightBackdrop.remove(); spotlightBackdrop = null; }
        document.body.classList.remove('tcher-hidden');
      }
      if (e.data.action === 'highlight') {
        try {
          const target = e.data.selector ? document.querySelector(e.data.selector) : null;
          if (target) {
            // Scroll first so positionOverlay reads the post-scroll rect
            if (!isInViewport(target) && target.scrollIntoView) {
              target.scrollIntoView({ behavior: 'instant', block: 'center' });
            }
            for (const o of overlays) {
              if (o.classList.contains('tcher-banner')) continue;
              const isMatch = o._targetEl === target;
              o.classList.toggle('tcher-spotlight', isMatch);
              o.classList.toggle('tcher-spotlight-dimmed', !isMatch);
              if (isMatch) {
                // Force the matching overlay visible immediately, don't wait for IntersectionObserver
                o.style.display = '';
                o.style.animation = 'none';
                o.classList.add('tcher-visible');
                o._revealed = true;
                positionOverlay(o);
              }
            }
            showSpotlight(target);
          }
        } catch { /* invalid selector */ }
      }
      if (e.data.action === 'unhighlight') {
        hideSpotlight();
        for (const o of overlays) {
          o.classList.remove('tcher-spotlight');
          o.classList.remove('tcher-spotlight-dimmed');
        }
      }
    });
    window.postMessage({ source: 'tcher-ready' }, '*');
  } else {
    if (window.__TCHER_CONFIG__?.autoScan !== false) {
      const runAutoScan = () => {
        try {
          scan();
        } catch (err) {
          console.warn('[tcher] scan failed', err);
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(runAutoScan, 100));
      } else {
        setTimeout(runAutoScan, 100);
      }
    }
  }

  window.tcherDetect = detect;
  window.tcherDetectAsync = detectAsync;
  window.tcherScan = scan;
  window.tcherScanAsync = scanAsync;
  window.tcherCollectVisualContrastCandidates = collectVisualContrastCandidates;
  window.tcherAnalyzeVisualContrast = analyzeVisualContrast;
  window.tcherGetLastVisualContrastAnalyses = () => lastVisualContrastAnalyses.slice();
}
