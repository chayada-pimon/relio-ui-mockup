/**
 * Tcher Live Variant Mode - Browser Script
 *
 * Injected into the user's page via <script src="http://localhost:PORT/live.js">.
 * The server prepends window.__TCHER_TOKEN__ and window.__TCHER_PORT__
 * before this code.
 *
 * UI: a single floating bar that morphs between three states -
 * configure (pick action + go), generating (progressive dots), and cycling
 * (prev/next + accept/discard). Feels like Spotlight, not a modal.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  // Guard against double-init. Bun's HTML loader may process the <script> tag
  // and create a bundled copy alongside the external load, or HMR may re-execute.
  // Check BEFORE reading token/port to catch all cases.
  if (window.__TCHER_LIVE_INIT__) return;
  window.__TCHER_LIVE_INIT__ = true;

  const TOKEN = window.__TCHER_TOKEN__;
  const PORT = window.__TCHER_PORT__;
  if (!TOKEN || !PORT) {
    window.__TCHER_LIVE_INIT__ = false; // reset so the real load can init
    return;
  }

  //
  // Design tokens
  //

  // tcher-kit mono palette. The live chrome is brand-stable black & white:
  // white accents on a deep black surface, no host-page theme adaptation.
  // On-page marks (selection outline, strokes, pins, insert lines) lead
  // with brand ink plus a white halo so they read on light and dark pages
  // alike. Keep in sync with the live-bar entry in .tcher/design.json by
  // hand.
  const C = {
    brand:     'oklch(97% 0 0)',          // brand white (accent on dark chrome)
    brandHov:  'oklch(100% 0 0)',         // pure white (hover lift)
    brandSoft: 'oklch(97% 0 0 / 0.16)',   // soft white wash
    ink:       'oklch(4% 0 0)',           // deep black chrome surface
    mark:      'oklch(20% 0 0)',          // on-page annotation ink (#171717 brand black)
    markHalo:  'drop-shadow(0 0 1.5px oklch(99% 0 0 / 0.9))', // keeps ink marks legible on dark pages
    ash:       'oklch(55% 0 0)',          // muted gray text
    paper:     'oklch(98% 0 0 / 0.92)',   // light overlay on user pages
    paperSolid:'oklch(98% 0 0)',
    mist:      'oklch(90% 0 0 / 0.6)',    // light hairline
    white:     'oklch(99% 0 0)',
  };
  // Picker bar chrome - mirrors .live-demo-gbar / .live-demo-ctx in tcher-kit.
  // Quiet neutral elevation: no halo ring on the container; the bright accent
  // is reserved for the brand mark and the active control.
  const PICKER_SHADOW =
    '0 16px 36px -12px oklch(0% 0 0 / 0.6)';
  const FONT = 'system-ui, -apple-system, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  // z-index: detect overlays use 99999, so our UI must be above them
  const Z = { highlight: 100001, bar: 100005, picker: 100007, toast: 100010 };
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // ease-out-quint
  const PREFIX = 'tcher-live';
  const MANUAL_APPLY_STATE_TTL_MS = 15 * 60 * 1000;
  const sessionState = window.__TCHER_LIVE_SESSION__?.createLiveBrowserSessionState({
    prefix: PREFIX,
    storage: localStorage,
    idFactory: () => crypto.randomUUID().replace(/-/g, '').slice(0, 8),
  });
  if (!sessionState) {
    console.error('[tcher] live-browser-session.js was not loaded. Live mode cannot start safely.');
    window.__TCHER_LIVE_INIT__ = false;
    return;
  }
  const HIGHLIGHT_TRANSITION =
    'top 140ms ' + EASE +
    ', left 140ms ' + EASE +
    ', width 140ms ' + EASE +
    ', height 140ms ' + EASE +
    ', opacity 150ms ease';
  const TOOLTIP_TRANSITION =
    'top 140ms ' + EASE + ', left 140ms ' + EASE + ', opacity 150ms ease';

  const SKIP_TAGS = new Set([
    'html', 'head', 'body', 'script', 'style', 'link', 'meta', 'noscript', 'br', 'wbr',
  ]);

  // Command vocabulary (values + labels + icons) comes from the canonical source,
  // skill/scripts/live-vocabulary.mjs, which live-server.mjs serializes into
  // window.__TCHER_VOCAB__ when it serves /live.js (same injection path as
  // the token/port above, so it is always present here). The icons stack above
  // each chip label and recolor to C.brand when selected (strokes use
  // currentColor). ACTIONS drives the picker grid; ICONS maps value -> svg.
  const VOCAB = Array.isArray(window.__TCHER_VOCAB__) ? window.__TCHER_VOCAB__ : [];
  const ICONS = {};
  const ACTIONS = VOCAB.map((c) => {
    ICONS[c.value] = c.icon;
    return { value: c.value, label: c.label };
  });

  const LIVE_CHROME_MOUNT_CONTRACT = ['root', 'transport', 'state', 'actions'];
  const LIVE_UI_SURFACES = [
    { key: 'global-bottom-bar', ids: [PREFIX + '-global-bar', PREFIX + '-global-bar-brand', PREFIX + '-pick-toggle', PREFIX + '-insert-toggle', PREFIX + '-detect-toggle', PREFIX + '-detect-badge', PREFIX + '-design-toggle', PREFIX + '-page-chat', PREFIX + '-page-chat-input'] },
    { key: 'pending-copy-edit-dock', ids: [PREFIX + '-pending-dock'] },
    { key: 'element-selection-chrome', ids: [PREFIX + '-highlight', PREFIX + '-tooltip', PREFIX + '-bar', PREFIX + '-configure-input-wrap', PREFIX + '-input'] },
    { key: 'action-picker', ids: [PREFIX + '-picker'] },
    { key: 'edit-chrome', ids: [PREFIX + '-edit-badge'] },
    { key: 'generating-row', ids: [PREFIX + '-bar', PREFIX + '-shader'] },
    { key: 'variant-cycling-row', ids: [PREFIX + '-bar', PREFIX + '-params-panel'] },
    { key: 'variant-params-panel', ids: [PREFIX + '-params-panel'] },
    { key: 'saving-confirmed-rows', ids: [PREFIX + '-bar'] },
    { key: 'insert-mode-chrome', ids: [PREFIX + '-insert-line', PREFIX + '-insert-placeholder', PREFIX + '-annot', PREFIX + '-placeholder-resize', PREFIX + '-insert-input', PREFIX + '-insert-create', PREFIX + '-insert-create-tooltip'] },
    { key: 'design-system-panel', ids: [PREFIX + '-design-host'] },
    { key: 'toasts-and-errors', ids: [PREFIX + '-toast'] },
    { key: 'css-isolation-boundary', ids: [PREFIX + '-root'] },
  ];
  const LIVE_UI_COMPONENT_IDS = [...new Set(LIVE_UI_SURFACES.flatMap((surface) => surface.ids))];

  //
  // State
  //

  let state = 'IDLE';
  let hoveredElement = null;
  let selectedElement = null;
  let currentSessionId = null;
  let expectedVariants = 0;
  let arrivedVariants = 0;
  let visibleVariant = 0;
  let svelteComponentSession = null;
  let svelteRuntimePromise = null;
  let pendingSvelteComponentRetryObserver = null;
  let currentSourceFile = null;
  let currentPreviewFile = null;
  let currentPreviewMode = null;
  let recoveryWaitingForAnchor = false;
  let pendingAcceptedSession = null;
  let variantObserver = null;
  let variantSelectionInFlight = false;
  let variantSelectionPromise = null;
  let recoveringEmptyCycling = false;
  let hasProjectContext = false;
  let selectedAction = 'tcher';
  let selectedCount = 2;
  const browserOwner = sessionState.owner;
  let checkpointTimer = null;

  // Scroll lock - holds window.scrollY at a fixed value while the session is
  // active, so HMR DOM patches and variant swaps can't drift the page. See
  // startScrollLock / stopScrollLock below.
  let scrollLockObserver = null;
  let scrollLockTargetY = null;
  let scrollLockRaf = null;
  let scrollLockAbort = null;

  // Dedicated key for scroll position - SEPARATE from LS_KEY so that
  // saveSession's state updates don't clobber a carefully-captured scrollY.
  // (Previously: saveSession wrote scrollY alongside state, so every call
  // during resume overwrote the pre-reload value with whatever the browser
  // had landed on, typically 0.)
  function writeScrollY(y) { sessionState.writeScrollY(y); }
  function readScrollY() { return sessionState.readScrollY(); }
  function clearScrollY() { sessionState.clearScrollY(); }

  // Pre-empt the browser: apply manual scroll restoration and jump to the
  // saved scrollY at script-parse time. Retries on fonts.ready and load
  // are essential: scrollTo(y) clamps to the current document.scrollHeight,
  // which is often hundreds of pixels short of the final value until
  // async-loaded fonts swap in and reflow.
  try {
    history.scrollRestoration = 'manual';
    const savedY = readScrollY();
    if (savedY != null) {
      const apply = () => {
        if (Math.abs(window.scrollY - savedY) > 0.5) {
          window.scrollTo(0, savedY);
        }
      };
      apply();
      if (document.fonts?.ready) document.fonts.ready.then(apply).catch(() => {});
      window.addEventListener('load', apply, { once: true });
    }
  } catch {}

  // UI refs
  let highlightEl = null;
  let tooltipEl = null;
  let barEl = null;
  let barHideSeq = 0;
  let pickerEl = null;
  let toastEl = null;
  let scrollRaf = null;
  let editBadgeEl = null;
  let editBadgeProxyRoot = null;
  let editBadgeProxyByTarget = new Map();

  //
  // Helpers
  //

  function own(el) {
    return el && (el.id?.startsWith(PREFIX) || el.closest?.('[id^="' + PREFIX + '"]'));
  }

  function pickable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS.has(el.tagName.toLowerCase())) return false;
    if (own(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 20 && r.height >= 20;
  }

  function desc(el) {
    if (!el) return '';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.classList.length) s += '.' + [...el.classList].slice(0, 2).join('.');
    return s;
  }

  function rectIsUsableAnchor(rect) {
    return !!rect && rect.width > 0.5 && rect.height > 0.5;
  }

  function makeFrozenAnchor(el) {
    if (!el || !el.getBoundingClientRect) return null;
    const r = el.getBoundingClientRect();
    if (!rectIsUsableAnchor(r)) return null;
    const rect = {
      x: r.x, y: r.y,
      top: r.top, left: r.left,
      right: r.right, bottom: r.bottom,
      width: r.width, height: r.height,
    };
    return {
      __tcherFrozenAnchor: true,
      tagName: el.tagName || 'DIV',
      id: el.id || '',
      classList: el.classList ? [...el.classList] : [],
      hasAttribute: () => false,
      getBoundingClientRect: () => rect,
    };
  }

  function id8() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

  function cssId(id) {
    if (window.CSS?.escape) return CSS.escape(id);
    return String(id).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  function liveUiRoot() {
    const root = window.__TCHER_LIVE_UI_ROOT__;
    if (root && typeof root.appendChild === 'function') return root;
    return document.body;
  }

  function uiAppend(el) {
    liveUiRoot().appendChild(el);
    return el;
  }

  function uiAppendStyle(styleEl) {
    const root = liveUiRoot();
    if (root && root !== document.body) root.appendChild(styleEl);
    else document.head.appendChild(styleEl);
    return styleEl;
  }

  function uiGetById(id) {
    const root = liveUiRoot();
    if (root?.getElementById) {
      const found = root.getElementById(id);
      if (found) return found;
    }
    if (root?.querySelector) {
      const found = root.querySelector('#' + cssId(id));
      if (found) return found;
    }
    return document.getElementById(id);
  }

  function activeElementDeep() {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active;
  }

  window.__TCHER_LIVE_CHROME_CORE__ = {
    version: 1,
    adapter: window.__TCHER_LIVE_ADAPTER__ || 'dom',
    mountContract: LIVE_CHROME_MOUNT_CONTRACT,
    surfaces: LIVE_UI_SURFACES,
    componentIds: LIVE_UI_COMPONENT_IDS,
    root: liveUiRoot,
    append: uiAppend,
    appendStyle: uiAppendStyle,
    getById: uiGetById,
    activeElementDeep,
    debugState: () => ({
      state,
      currentSessionId,
      expectedVariants,
      arrivedVariants,
      visibleVariant,
      savedSession: loadSession(),
      sourceFile: currentSourceFile,
      previewFile: currentPreviewFile,
      previewMode: currentPreviewMode,
      barText: barEl?.textContent || null,
      barConnected: !!barEl?.isConnected,
      hasSvelteComponentSession: !!svelteComponentSession,
      mountedSvelteVariant: svelteComponentSession?.mountedVariant || 0,
      pendingSvelteComponentRetry: !!pendingSvelteComponentRetryObserver,
      recoveryWaitingForAnchor,
      evtSourceReadyState: evtSource ? evtSource.readyState : null,
    }),
  };

  // Modal-aware chrome: keep our floating UI clickable inside Radix /
  // Headless UI / vaul portals.
  //
  // Two host-page behaviors break us when the picked element lives inside a
  // modal dialog:
  //
  //   1. Modal scroll-lock disables outside pointer events. Radix's
  //      `DismissableLayer` sets `document.body.style.pointerEvents = 'none'`
  //      while a modal is open and only restores `auto` on the layer. Our
  //      chrome inherits `none` from <body> and becomes unclickable.
  //   2. The dialog's outside-interaction handler (Radix's
  //      `usePointerDownOutside`) listens at document level and dismisses
  //      the dialog whenever a `pointerdown` lands outside the layer node.
  //      Our chrome is a sibling of <body>, so Radix classifies our clicks
  //      as outside and tears the dialog down mid-task.
  //
  // We can't reliably re-parent our chrome into the dialog subtree (z-index
  // stacking, scroll containers, theming all become host-page concerns), so
  // we defang both behaviors at our root:
  //
  //   - `pointer-events: auto !important` overrides the inherited `none`.
  //   - Stop `pointerdown` / `mousedown` propagation so the document-level
  //     dismiss listener never fires for our clicks.
  //   - Stop `focusin` propagation so any focus shifts inside our chrome
  //     don't read as "focus moved outside the dialog" to focus traps.
  //
  // Click events still bubble normally - only the early pointer/focus
  // signals that drive outside-interaction detection are silenced.
  function defangOutsideHandlers(rootEl, { setPointerEvents = true } = {}) {
    if (!rootEl) return;
    if (setPointerEvents) {
      rootEl.style.setProperty('pointer-events', 'auto', 'important');
    }
    const stop = (e) => e.stopPropagation();
    rootEl.addEventListener('pointerdown', stop);
    rootEl.addEventListener('mousedown', stop);
    rootEl.addEventListener('focusin', stop);
  }

  //
  // Highlight overlay
  //

  function initHighlight() {
    highlightEl = document.createElement('div');
    highlightEl.id = PREFIX + '-highlight';
    Object.assign(highlightEl.style, {
      position: 'fixed', top: '0', left: '0', width: '0', height: '0',
      border: '2px solid ' + C.mark, borderRadius: '3px',
      boxShadow: '0 0 0 1px oklch(99% 0 0 / 0.75)',
      pointerEvents: 'none', zIndex: Z.highlight, boxSizing: 'border-box',
      transition: HIGHLIGHT_TRANSITION,
      display: 'none', opacity: '0',
    });
    uiAppend(highlightEl);

    tooltipEl = document.createElement('div');
    tooltipEl.id = PREFIX + '-tooltip';
    Object.assign(tooltipEl.style, {
      position: 'fixed',
      background: C.ink, color: C.white,
      fontFamily: MONO, fontSize: '10px', fontWeight: '500',
      padding: '2px 6px', borderRadius: '3px',
      zIndex: Z.highlight + 1, pointerEvents: 'none',
      whiteSpace: 'nowrap', display: 'none',
      letterSpacing: '0.02em',
      transition: TOOLTIP_TRANSITION,
    });
    uiAppend(tooltipEl);
  }

  function showHighlight(el) {
    if (!el || !highlightEl) return;
    if (el.hasAttribute?.('data-tcher-insert-placeholder')) return;
    const r = el.getBoundingClientRect();
    const top = (r.top - 2) + 'px', left = (r.left - 2) + 'px';
    const width = (r.width + 4) + 'px', height = (r.height + 4) + 'px';
    const tipTop = r.top - 20;
    const tipY = (tipTop < 4 ? r.bottom + 4 : tipTop) + 'px';
    const tipX = Math.max(4, r.left) + 'px';
    tooltipEl.textContent = desc(el);

    const hiWasHidden = highlightEl.style.display === 'none' || highlightEl.style.opacity === '0';
    if (hiWasHidden) {
      // Snap to first target without animating from (0,0), then fade in.
      highlightEl.style.transition = 'none';
      Object.assign(highlightEl.style, { top, left, width, height, display: 'block' });
      tooltipEl.style.transition = 'none';
      Object.assign(tooltipEl.style, { top: tipY, left: tipX, display: 'block' });
      void highlightEl.offsetWidth;
      highlightEl.style.transition = HIGHLIGHT_TRANSITION;
      highlightEl.style.opacity = '1';
      tooltipEl.style.transition = TOOLTIP_TRANSITION;
      tooltipEl.style.opacity = '1';
    } else {
      Object.assign(highlightEl.style, { top, left, width, height, display: 'block', opacity: '1' });
      Object.assign(tooltipEl.style, { top: tipY, left: tipX, display: 'block', opacity: '1' });
    }
  }

  function hideHighlight() {
    if (highlightEl) { highlightEl.style.opacity = '0'; highlightEl.style.display = 'none'; }
    if (tooltipEl) { tooltipEl.style.opacity = '0'; tooltipEl.style.display = 'none'; }
  }

  //
  // Insert overlay (placeholder-resize surface)
  //
  // Active while state === 'CONFIGURING'. The overlay is a fixed-positioned
  // sibling of <body> mirroring selectedElement's bounding rect. Its only job
  // is to host the insert placeholder's edge-resize handles; pointer events on
  // it are routed to the placeholder-resize drag.
  //

  let annotOverlayEl = null;
  let annotActive = false;
  let placeholderResizeLayerEl = null;
  let placeholderResizeDrag = null;

  function initAnnotOverlay() {
    annotOverlayEl = document.createElement('div');
    annotOverlayEl.id = PREFIX + '-annot';
    Object.assign(annotOverlayEl.style, {
      position: 'fixed', top: '0', left: '0', width: '0', height: '0',
      pointerEvents: 'auto', zIndex: Z.highlight + 2,
      display: 'none', overflow: 'visible',
      touchAction: 'none',
    });

    placeholderResizeLayerEl = document.createElement('div');
    placeholderResizeLayerEl.id = PREFIX + '-placeholder-resize';
    Object.assign(placeholderResizeLayerEl.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '2',
    });
    annotOverlayEl.appendChild(placeholderResizeLayerEl);

    annotOverlayEl.addEventListener('pointerdown', onAnnotDown);
    annotOverlayEl.addEventListener('pointermove', onAnnotMove);
    annotOverlayEl.addEventListener('pointerup', onAnnotUp);
    annotOverlayEl.addEventListener('pointercancel', onAnnotUp);
    uiAppend(annotOverlayEl);
    // Modal-host friendliness: pointer-events is already 'auto' on this
    // overlay; we only need to silence the host's outside-interaction
    // listeners. Don't override pointer-events here (the overlay toggles
    // visibility via display:none, which is fine).
    defangOutsideHandlers(annotOverlayEl, { setPointerEvents: false });
  }

  function showAnnotOverlay(el) {
    if (!annotOverlayEl || !el) return;
    annotActive = true;
    positionAnnotOverlay(el);
    annotOverlayEl.style.display = 'block';
    syncPlaceholderResizeHandles();
  }

  function hideAnnotOverlay() {
    annotActive = false;
    placeholderResizeDrag = null;
    if (annotOverlayEl) annotOverlayEl.style.display = 'none';
    syncPlaceholderResizeHandles();
  }

  function positionAnnotOverlay(el) {
    if (!annotOverlayEl || !el) return;
    const r = el.getBoundingClientRect();
    Object.assign(annotOverlayEl.style, {
      top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
    });
    syncPlaceholderResizeHandles();
  }

  function onAnnotDown(e) {
    if (!annotActive) return;

    // Insert placeholder edge resize is the only interaction this overlay hosts.
    const resizeEdge = e.target.closest?.('[data-tcher-placeholder-resize]')?.dataset.tcherPlaceholderResize;
    if (resizeEdge && configureKind === 'insert' && placeholderElement) {
      startPlaceholderEdgeResize(resizeEdge, e);
      return;
    }
  }

  function onAnnotMove(e) {
    if (!annotActive) return;

    if (placeholderResizeDrag) {
      const d = placeholderResizeDrag;
      const next = resizePlaceholderFromEdge(
        d.start,
        d.edge,
        e.clientX - d.startX,
        e.clientY - d.startY,
        d.parentWidth,
      );
      applyPlaceholderDimensions(next);
      e.stopPropagation();
      return;
    }
  }

  function onAnnotUp(e) {
    if (placeholderResizeDrag) {
      try { annotOverlayEl.releasePointerCapture(e.pointerId); } catch {}
      placeholderResizeDrag = null;
      e.stopPropagation();
      return;
    }
  }

  //
  // Element context extraction
  //

  function stripManualEditRuntimeState(root) {
    if (!root || root.nodeType !== 1) return;
    unwrapMixedContentTextNodes(root);
    const nodes = [root, ...root.querySelectorAll('[data-tcher-editable], [data-tcher-original-text], [data-tcher-text-wrap]')];
    for (const node of nodes) {
      const runtimeEditable = node.hasAttribute('data-tcher-editable')
        || node.hasAttribute('data-tcher-original-text');
      node.removeAttribute('data-tcher-editable');
      node.removeAttribute('data-tcher-original-text');
      node.removeAttribute('data-tcher-text-wrap');
      if (runtimeEditable) {
        node.removeAttribute('contenteditable');
        if (node.style) {
          node.style.userSelect = '';
          node.style.cursor = '';
          node.style.outline = '';
          node.style.webkitUserModify = '';
          if (!node.getAttribute('style')?.trim()) node.removeAttribute('style');
        }
      }
    }
  }

  function sanitizedContextOuterHTML(el, maxLength) {
    if (!el || !el.cloneNode) return '';
    const clone = el.cloneNode(true);
    stripManualEditRuntimeState(clone);
    return clone.outerHTML ? clone.outerHTML.slice(0, maxLength) : '';
  }

  function extractContext(el) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const props = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.style) for (let i = 0; i < rule.style.length; i++) {
            const p = rule.style[i];
            if (p.startsWith('--') && !props[p]) {
              const v = cs.getPropertyValue(p).trim();
              if (v) props[p] = v;
            }
          }
        }
      } catch { /* cross-origin */ }
    }
    return {
      tagName: el.tagName.toLowerCase(), id: el.id || null,
      classes: [...el.classList],
      textContent: (el.textContent || '').slice(0, 500),
      outerHTML: sanitizedContextOuterHTML(el, 10000),
      computedStyles: {
        'font-family': cs.fontFamily, 'font-size': cs.fontSize,
        'font-weight': cs.fontWeight, 'line-height': cs.lineHeight,
        'color': cs.color, 'background': cs.background,
        'background-color': cs.backgroundColor,
        'padding': cs.padding, 'margin': cs.margin,
        'display': cs.display, 'position': cs.position,
        'gap': cs.gap, 'border-radius': cs.borderRadius,
        'box-shadow': cs.boxShadow,
      },
      cssCustomProperties: props,
      parentContext: el.parentElement
        ? '<' + el.parentElement.tagName.toLowerCase()
          + (el.parentElement.id ? ' id="' + el.parentElement.id + '"' : '')
          + (el.parentElement.className ? ' class="' + el.parentElement.className + '"' : '')
          + '>'
        : null,
      boundingRect: { width: Math.round(r.width), height: Math.round(r.height) },
    };
  }

  const MANUAL_CONTEXT_SKIP = { script: 1, style: 1, template: 1, noscript: 1, svg: 1, code: 1, pre: 1 };

  function contextElementForManualEdit(selectedEl, rows, ops) {
    if (!selectedEl) return selectedEl;
    const leafOnly =
      rows && rows.length === 1 && rows[0] && rows[0].el === selectedEl;
    if (!leafOnly) return selectedEl;

    const editedTexts = new Set();
    for (const row of rows || []) addManualContextText(editedTexts, row.text);
    for (const op of ops || []) {
      addManualContextText(editedTexts, op.originalText);
      addManualContextText(editedTexts, op.newText);
    }

    let cur = selectedEl.parentElement;
    let depth = 0;
    while (cur && cur !== document.body && cur !== document.documentElement && depth < 4) {
      if (own(cur)) break;
      if (isUsefulManualEditContext(cur, selectedEl, editedTexts)) return cur;
      cur = cur.parentElement;
      depth++;
    }
    return selectedEl;
  }

  function isUsefulManualEditContext(candidate, leafEl, editedTexts) {
    if (!candidate || !candidate.contains(leafEl)) return false;
    if (!candidate.id && candidate.classList.length === 0 && candidate.children.length < 2) return false;
    return collectManualContextPieces(candidate, editedTexts).length > 0;
  }

  function collectManualContextPieces(rootEl, editedTexts) {
    const pieces = [];
    function walk(node) {
      if (!node) return;
      if (node.nodeType === 3) {
        const text = normalizeManualContextText(node.nodeValue);
        if (isMeaningfulManualContextPiece(text, editedTexts)) pieces.push(text);
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();
      if (MANUAL_CONTEXT_SKIP[tag]) return;
      if (node !== rootEl && own(node)) return;
      for (const child of node.childNodes) walk(child);
    }
    walk(rootEl);
    return pieces.slice(0, 12);
  }

  function addManualContextText(set, value) {
    const text = normalizeManualContextText(value);
    if (text) set.add(text);
  }

  function isMeaningfulManualContextPiece(text, editedTexts) {
    if (!text || text.length < 3 || text.length > 160) return false;
    if (/^[\d.,+\-%\s]+$/.test(text)) return false;
    return !editedTexts.has(text);
  }

  function normalizeManualContextText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  //
  // The Bar - one floating element, three modes
  //

  // Contextual-bar palette. Cached at init so every build*Row reads a
  // consistent set of colors; detectPageTheme runs once rather than on every
  // phase transition.
  let BP = null;

  // Bar shadow variants. The default projects down + subtle around. When
  // the Tune popover opens below the bar, a downward shadow lands on the
  // dark popover and reads as a bright ghost line. We swap to UP-only while
  // tune is open below so the popover's top edge is clean.
  const BAR_SHADOW_DEFAULT = '0 4px 20px oklch(0% 0 0 / 0.08), 0 1px 3px oklch(0% 0 0 / 0.06)';
  const BAR_SHADOW_UP = '0 -4px 20px oklch(0% 0 0 / 0.08), 0 -1px 3px oklch(0% 0 0 / 0.06)';
  const BAR_SHADOW_DOWN = BAR_SHADOW_DEFAULT;

  function initBar() {
    BP = barPaletteForTheme(detectPageTheme());
    barEl = document.createElement('div');
    barEl.id = PREFIX + '-bar';
    Object.assign(barEl.style, {
      position: 'fixed', zIndex: Z.bar,
      display: 'none', opacity: '0',
      transform: 'translateY(6px)',
      transition: 'opacity 0.25s ' + EASE + ', transform 0.3s ' + EASE,
      background: BP.surface,
      border: '1px solid ' + BP.border,
      borderRadius: '8px',
      boxShadow: BP.shadow,
      transition: 'box-shadow 0.2s ease, opacity 0.25s ' + EASE + ', transform 0.3s ' + EASE,
      fontFamily: FONT, fontSize: '13px', color: BP.text,
      padding: '6px',
      maxWidth: 'min(840px, calc(100vw - 16px))', minWidth: '320px',
    });
    uiAppend(barEl);
    defangOutsideHandlers(barEl);
  }

  function positionBar() {
    if (!barEl) return;
    const anchor = resolveBarAnchor();
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const barH = barEl.offsetHeight || 44;
    const barW = barEl.offsetWidth || 380;
    const GLOBAL_BAR_RESERVE = 64; // global bar height + bottom margin + breathing room
    const GAP = 8;

    // Prefer below the element; fall back to above; if neither fits (element
    // taller than viewport), pin to a stable viewport anchor so the bar
    // doesn't teleport between top and bottom as the user scrolls.
    let top;
    const belowTop = r.bottom + GAP;
    const aboveTop = r.top - barH - GAP;
    if (belowTop + barH + GAP <= window.innerHeight - GLOBAL_BAR_RESERVE) {
      top = belowTop;
    } else if (aboveTop >= GAP) {
      top = aboveTop;
    } else {
      top = window.innerHeight - barH - GLOBAL_BAR_RESERVE;
    }

    let left = r.left + (r.width - barW) / 2;
    if (left < GAP) left = GAP;
    if (left + barW > window.innerWidth - GAP) left = window.innerWidth - barW - GAP;
    Object.assign(barEl.style, { top: top + 'px', left: left + 'px' });
  }

  function showBar(mode) {
    barHideSeq += 1;
    if (mode === 'cycling' && !ensureCyclingRenderable('show-bar')) return;
    barEl.innerHTML = '';
    if (mode === 'configure') {
      barEl.appendChild(configureKind === 'insert' ? buildInsertConfigureRow() : buildConfigureRow());
      if (configureKind === 'insert') syncInsertCreateButton();
    } else if (mode === 'generating') barEl.appendChild(buildGeneratingRow());
    else if (mode === 'cycling') barEl.appendChild(buildCyclingRow());
    barEl.style.display = 'block';
    positionBar();
    requestAnimationFrame(() => {
      barEl.style.opacity = '1';
      barEl.style.transform = 'translateY(0)';
      syncPageChatFocus('show-bar');
    });
  }

  function hideBar() {
    if (!barEl) return;
    const hideSeq = ++barHideSeq;    if (configureKind === 'insert') clearInsertPicking();
    barEl.style.opacity = '0';
    barEl.style.transform = 'translateY(6px)';
    setTimeout(() => { if (barEl && hideSeq === barHideSeq) barEl.style.display = 'none'; }, 250);
    hideActionPicker();
    closeTunePopover();
    if (state === 'EDITING') restoreInlineEditDrafts();
    disableInlineEdit();
  }

  function updateBarContent(mode) {
    if (!barEl || barEl.style.display === 'none') return;
    if (mode === 'cycling' && !ensureCyclingRenderable('update-bar')) return;
    barEl.innerHTML = '';
    // Reset bar styling to the tcher-kit picker palette
    barEl.style.background = BP.surface;
    barEl.style.border = '1px solid ' + BP.border;
    barEl.style.boxShadow = BP.shadow;
    if (mode === 'configure') {
      barEl.appendChild(configureKind === 'insert' ? buildInsertConfigureRow() : buildConfigureRow());
      if (configureKind === 'insert') syncInsertCreateButton();
    } else if (mode === 'generating') barEl.appendChild(buildGeneratingRow());
    else if (mode === 'cycling') barEl.appendChild(buildCyclingRow());
    else if (mode === 'saving') barEl.appendChild(buildSavingRow());
    else if (mode === 'confirmed') {
      barEl.appendChild(buildConfirmedRow());
      barEl.style.background = 'oklch(95% 0 0)';
      barEl.style.border = '1px solid oklch(75% 0 0 / 0.4)';
    }
    syncPageChatFocus('update-bar-content');
  }

  // Configure row

  function syncConfigureInputChrome() {
    const wrap = uiGetById(PREFIX + '-configure-input-wrap');
    const input = uiGetById(PREFIX + '-input');
    if (!wrap || !input) return;
    const focused = activeElementDeep() === input;
    wrap.dataset.inputFocused = focused ? 'true' : 'false';
    wrap.style.borderColor = focused ? BP.accentSoft : BP.hairline;
  }

  // Insert mode helpers (mirrors skill/scripts/live-insert-ui.mjs)

  function detectInsertAxisFromStyle(style) {
    const display = style?.display || 'block';
    if (display.includes('flex')) {
      const dir = style.flexDirection || 'row';
      return dir.startsWith('row') ? 'row' : 'column';
    }
    if (display === 'grid' || display === 'inline-grid') {
      const flow = style.gridAutoFlow || 'row';
      if (flow.includes('column')) return 'column';
      const cols = (style.gridTemplateColumns || '').trim();
      if (cols && cols !== 'none') {
        const colCount = cols.split(/\s+/).filter(Boolean).length;
        if (colCount > 1) return 'row';
      }
      return 'row';
    }
    return 'column';
  }

  function detectInsertAxis(parent) {
    if (!parent || parent.nodeType !== 1) return 'column';
    const st = getComputedStyle(parent);
    return detectInsertAxisFromStyle({
      display: st.display,
      flexDirection: st.flexDirection,
      gridTemplateColumns: st.gridTemplateColumns,
      gridAutoFlow: st.gridAutoFlow,
    });
  }

  function layoutFlowChildren(parent) {
    if (!parent) return [];
    return [...parent.children]
      .filter(pickable)
      .map((el) => ({ el, rect: el.getBoundingClientRect() }));
  }

  function computeInsertPosition(clientX, clientY, rect, axis) {
    axis = axis || 'column';
    if (!rect) return 'after';
    if (axis === 'row') {
      if (!Number.isFinite(rect.width) || rect.width <= 0) return 'after';
      return clientX < rect.left + rect.width / 2 ? 'before' : 'after';
    }
    if (!Number.isFinite(rect.height) || rect.height <= 0) return 'after';
    return clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  }

  function groupSiblingRows(siblings, rowThreshold) {
    rowThreshold = rowThreshold ?? 8;
    const sorted = [...siblings].sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    const rows = [];
    for (const entry of sorted) {
      let placed = false;
      for (const row of rows) {
        if (Math.abs(entry.rect.top - row[0].rect.top) <= rowThreshold) {
          row.push(entry);
          placed = true;
          break;
        }
      }
      if (!placed) rows.push([entry]);
    }
    return rows;
  }

  function horizontalOverlap(a, b) {
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    return Math.max(0, right - left);
  }

  function hitSiblingInsertGap(clientX, clientY, siblings, opts) {
    opts = opts || {};
    if (!siblings || siblings.length < 2) return null;
    const slop = opts.slop ?? 12;
    const minOverlap = opts.minOverlap ?? 0.25;

    for (const row of groupSiblingRows(siblings)) {
      if (row.length < 2) continue;
      const sorted = [...row].sort((a, b) => a.rect.left - b.rect.left);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const aRight = a.rect.right;
        const bLeft = b.rect.left;
        if (bLeft <= aRight) continue;
        const top = Math.max(a.rect.top, b.rect.top);
        const bottom = Math.min(a.rect.bottom, b.rect.bottom);
        const span = bottom - top;
        const minH = Math.min(a.rect.height, b.rect.height);
        if (span < minH * minOverlap) continue;
        const inX = clientX >= aRight - slop && clientX <= bLeft + slop;
        const inY = clientY >= top - slop && clientY <= bottom + slop;
        if (!inX || !inY) continue;
        return {
          anchor: b.el,
          position: 'before',
          axis: 'row',
          line: { axis: 'row', left: (aRight + bLeft) / 2, top, width: 0, height: span },
        };
      }
    }

    const sortedCol = [...siblings].sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    for (let i = 0; i < sortedCol.length - 1; i++) {
      const a = sortedCol[i];
      const b = sortedCol[i + 1];
      const overlap = horizontalOverlap(a.rect, b.rect);
      const minW = Math.min(a.rect.width, b.rect.width);
      if (overlap < minW * minOverlap) continue;
      const gapTop = a.rect.bottom;
      const gapBottom = b.rect.top;
      if (gapBottom <= gapTop) continue;
      const overlapLeft = Math.max(a.rect.left, b.rect.left);
      const overlapRight = Math.min(a.rect.right, b.rect.right);
      const inY = clientY >= gapTop - slop && clientY <= gapBottom + slop;
      const inX = clientX >= overlapLeft - slop && clientX <= overlapRight + slop;
      if (!inY || !inX) continue;
      return {
        anchor: b.el,
        position: 'before',
        axis: 'column',
        line: { axis: 'column', top: (gapTop + gapBottom) / 2, left: overlapLeft, width: overlap, height: 0 },
      };
    }
    return null;
  }

  function insertLineCoords(rect, position, axis) {
    axis = axis || 'column';
    if (axis === 'row') {
      const x = position === 'before' ? rect.left - 2 : rect.right + 2;
      return { axis: 'row', top: rect.top, left: x, width: 0, height: rect.height };
    }
    const y = position === 'before' ? rect.top - 2 : rect.bottom + 2;
    return { axis: 'column', top: y, left: rect.left, width: rect.width, height: 0 };
  }

  function resolveInsertHover({ clientX, clientY, target, rect, axis, siblings }) {
    const gap = hitSiblingInsertGap(clientX, clientY, siblings);
    if (gap) return gap;
    const position = computeInsertPosition(clientX, clientY, rect, axis);
    const line = insertLineCoords(rect, position, axis);
    return { anchor: target, position, axis, line };
  }

  function cursorForInsertAxis(axis) {
    return axis === 'row' ? 'ew-resize' : 'ns-resize';
  }

  function placeholderSizing({ axis, parentDisplay, parentWidth, anchorFlex }) {
    const display = parentDisplay || 'block';
    const w = Number.isFinite(parentWidth) ? parentWidth : 0;
    if (axis === 'row') {
      if (display.includes('flex')) {
        const flex = anchorFlex && anchorFlex !== 'none' && anchorFlex !== '0 1 auto'
          ? anchorFlex
          : '1 1 0';
        return { kind: 'flex', flex, minWidth: 0 };
      }
      if (display === 'grid' || display === 'inline-grid') return { kind: 'auto' };
    }
    if (w >= PLACEHOLDER_MIN_WIDTH) return { kind: 'percent' };
    return {
      kind: 'explicit',
      width: Math.max(PLACEHOLDER_MIN_WIDTH, w || PLACEHOLDER_MIN_WIDTH),
    };
  }

  function placeholderWidthIsImplicit(kind) {
    return kind === 'flex' || kind === 'percent' || kind === 'auto';
  }

  function applyPlaceholderSizingStyles(placeholder, sizing) {
    placeholder.dataset.tcherPlaceholderWidth = sizing.kind;
    placeholder.style.flex = '';
    placeholder.style.minWidth = '';
    placeholder.style.maxWidth = '';
    placeholder.style.width = '';
    if (sizing.kind === 'flex') {
      placeholder.style.flex = sizing.flex;
      placeholder.style.minWidth = sizing.minWidth + 'px';
    } else if (sizing.kind === 'percent') {
      placeholder.style.width = '100%';
      placeholder.style.maxWidth = '100%';
    } else if (sizing.kind === 'explicit') {
      placeholder.style.width = sizing.width + 'px';
    }
  }

  function materializePlaceholderWidth(placeholder) {
    if (!placeholder) return;
    const kind = placeholder.dataset.tcherPlaceholderWidth;
    if (!placeholderWidthIsImplicit(kind)) return;
    const w = Math.max(PLACEHOLDER_MIN_WIDTH, Math.round(placeholder.offsetWidth));
    placeholder.style.flex = '';
    placeholder.style.minWidth = '';
    placeholder.style.maxWidth = '';
    placeholder.style.width = w + 'px';
    placeholder.dataset.tcherPlaceholderWidth = 'explicit';
  }

  function canCreateInsert({ prompt }) {
    return typeof prompt === 'string' && prompt.trim().length > 0;
  }

  function insertCreateDisabledReason({ prompt }) {
    if (canCreateInsert({ prompt })) return null;
    return 'Add a prompt to create';
  }

  function clampPlaceholderSize(width, height, parentWidth) {
    const maxW = Math.max(PLACEHOLDER_MIN_WIDTH, parentWidth || PLACEHOLDER_MIN_WIDTH);
    return {
      width: Math.min(maxW, Math.max(PLACEHOLDER_MIN_WIDTH, Math.round(width))),
      height: Math.max(PLACEHOLDER_MIN_HEIGHT, Math.round(height)),
    };
  }

  function cursorForPlaceholderEdge(edge) {
    if (edge === 'n' || edge === 's') return 'ns-resize';
    if (edge === 'e' || edge === 'w') return 'ew-resize';
    return 'default';
  }

  function resizePlaceholderFromEdge(start, edge, dx, dy, parentWidth) {
    const base = {
      width: start.width,
      height: start.height,
      marginLeft: start.marginLeft ?? 0,
      marginTop: start.marginTop ?? 0,
    };
    if (edge === 'e') base.width = start.width + dx;
    else if (edge === 'w') {
      base.width = start.width - dx;
      base.marginLeft = start.marginLeft + dx;
    } else if (edge === 's') base.height = start.height + dy;
    else if (edge === 'n') {
      base.height = start.height - dy;
      base.marginTop = start.marginTop + dy;
    }
    const clamped = clampPlaceholderSize(base.width, base.height, parentWidth);
    if (edge === 'w') base.marginLeft = start.marginLeft + start.width - clamped.width;
    else if (edge === 'n') base.marginTop = start.marginTop + start.height - clamped.height;
    return {
      width: clamped.width,
      height: clamped.height,
      marginLeft: Math.round(base.marginLeft),
      marginTop: Math.round(base.marginTop),
    };
  }

  function ensureInsertLine() {
    if (insertLineEl) return insertLineEl;
    insertLineEl = document.createElement('div');
    insertLineEl.id = PREFIX + '-insert-line';
    Object.assign(insertLineEl.style, {
      position: 'fixed',
      zIndex: String(Z.highlight),
      height: '0',
      borderTop: '2px dotted ' + C.mark,
      filter: C.markHalo,
      pointerEvents: 'none',
      display: 'none',
      opacity: '0.9',
    });
    uiAppend(insertLineEl);
    defangOutsideHandlers(insertLineEl);
    return insertLineEl;
  }

  function showInsertLine(resolved) {
    if (!resolved?.anchor || !resolved.line) return;
    const line = ensureInsertLine();
    const coords = resolved.line;
    if (coords.axis === 'row') {
      Object.assign(line.style, {
        display: 'block',
        top: coords.top + 'px',
        left: coords.left + 'px',
        width: '0',
        height: coords.height + 'px',
        borderTop: 'none',
        borderLeft: '2px dotted ' + C.mark,
      });
    } else {
      Object.assign(line.style, {
        display: 'block',
        top: coords.top + 'px',
        left: coords.left + 'px',
        width: coords.width + 'px',
        height: '0',
        borderLeft: 'none',
        borderTop: '2px dotted ' + C.mark,
      });
    }
    insertHoverAnchor = resolved.anchor;
    insertHoverPosition = resolved.position;
    insertHoverAxis = resolved.axis || 'column';
  }

  function hideInsertLine() {
    if (!insertLineEl) return;
    insertLineEl.style.display = 'none';
    insertHoverAnchor = null;
    insertHoverPosition = null;
    insertHoverAxis = null;
    syncPageInteractionCursor();
  }

  let pageInteractionCursorActive = false;

  /** Page-level cursor while insert mode is choosing a before/after edge. */
  function syncPageInteractionCursor() {
    let next = '';
    if (state === 'PICKING' && insertActive) {
      next = insertHoverAnchor ? cursorForInsertAxis(insertHoverAxis || 'column') : '';
    }
    if (next) {
      document.documentElement.style.cursor = next;
      pageInteractionCursorActive = true;
    } else if (pageInteractionCursorActive) {
      document.documentElement.style.cursor = '';
      pageInteractionCursorActive = false;
    }
  }

  /** Element used to position the floating bar / shader during a session. */
  function resolveBarAnchor() {
    if (svelteComponentSession?.sessionId === currentSessionId && (state === 'GENERATING' || state === 'CYCLING')) {
      const anchor = resolveSvelteComponentAnchor();
      if (anchor) return anchor;
    }
    if (currentSessionId && (state === 'GENERATING' || state === 'CYCLING')) {
      const wrapper = document.querySelector('[data-tcher-variants="' + currentSessionId + '"]');
      if (wrapper) {
        const variantCount = wrapper.querySelectorAll('[data-tcher-variant]:not([data-tcher-variant="original"])').length;
        if (variantCount > 0 && visibleVariant > 0) {
          const visEl = pickVariantContent(wrapper, visibleVariant);
          if (visEl) return visEl;
        }
        if (state === 'GENERATING') {
          const ph = ensureInsertPlaceholder();
          if (ph) return ph;
          if (insertAnchorElement && document.body.contains(insertAnchorElement)) return insertAnchorElement;
        }
      }
    }
    if (selectedElement && document.body.contains(selectedElement)) return selectedElement;
    if (placeholderElement && document.body.contains(placeholderElement)) return placeholderElement;
    if (insertAnchorElement && document.body.contains(insertAnchorElement)) return insertAnchorElement;
    return null;
  }

  function removeInsertPlaceholderDom() {
    if (placeholderElement) {
      placeholderElement.remove();
      placeholderElement = null;
    }
    placeholderResizeDrag = null;
    syncPlaceholderResizeHandles();
  }

  function finalizeInsertSession() {
    removeInsertPlaceholderDom();
    insertAnchorElement = null;
    insertAnchorPosition = null;
    insertAnchorLayoutAxis = null;
    insertPlaceholderSnapshot = null;
    if (configureKind === 'insert') configureKind = 'replace';
  }

  function buildInsertPlaceholderSnapshotFromDom(anchor, placeholder) {
    return {
      width: Math.round(placeholder.offsetWidth || 0),
      height: Math.round(placeholder.offsetHeight || PLACEHOLDER_DEFAULT_HEIGHT),
      marginLeft: parseFloat(placeholder.style.marginLeft) || 0,
      marginTop: parseFloat(placeholder.style.marginTop) || 0,
      position: insertAnchorPosition || 'before',
      layoutAxis: insertAnchorLayoutAxis || 'column',
      anchorTag: anchor.tagName || 'DIV',
      anchorClasses: anchor.className || '',
      anchorText: (anchor.textContent || '').trim().slice(0, 120),
    };
  }

  function findInsertAnchorInDom() {
    if (insertAnchorElement && document.body.contains(insertAnchorElement)) return insertAnchorElement;
    const snap = insertPlaceholderSnapshot;
    if (!snap) return null;
    const tag = (snap.anchorTag || 'div').toLowerCase();
    const cls = (snap.anchorClasses || '').split(/\s+/).filter(Boolean)[0];
    const needle = snap.anchorText || '';
    const sel = cls ? tag + '.' + cls : tag;
    const candidates = document.querySelectorAll(sel);
    for (const candidate of candidates) {
      if (own(candidate)) continue;
      if (needle && !(candidate.textContent || '').includes(needle.slice(0, 40))) continue;
      return candidate;
    }
    return null;
  }

  function isInsertGeneratingSession() {
    if (state !== 'GENERATING' || !currentSessionId) return false;
    const wrapper = document.querySelector('[data-tcher-variants="' + currentSessionId + '"]');
    return !!wrapper && wrapper.dataset.tcherMode === 'insert';
  }

  /** Recreate the dotted placeholder if Astro/Vite HMR removed it mid-generation. */
  function ensureInsertPlaceholder() {
    if (!isInsertGeneratingSession()) return placeholderElement;
    const wrapper = document.querySelector('[data-tcher-variants="' + currentSessionId + '"]');
    const variantCount = wrapper.querySelectorAll('[data-tcher-variant]:not([data-tcher-variant="original"])').length;
    if (variantCount > 0) return placeholderElement;
    if (placeholderElement && document.body.contains(placeholderElement)) return placeholderElement;

    const anchor = findInsertAnchorInDom();
    if (!anchor) return null;

    insertAnchorElement = anchor;
    const position = insertPlaceholderSnapshot?.position || insertAnchorPosition || 'before';
    const axis = insertPlaceholderSnapshot?.layoutAxis || insertAnchorLayoutAxis;
    const ph = createInsertPlaceholder(anchor, position, axis);
    if (!ph) return null;

    if (insertPlaceholderSnapshot) {
      applyPlaceholderDimensions({
        width: insertPlaceholderSnapshot.width,
        height: insertPlaceholderSnapshot.height,
        marginLeft: insertPlaceholderSnapshot.marginLeft,
        marginTop: insertPlaceholderSnapshot.marginTop,
      });
    }
    selectedElement = ph;
    return ph;
  }

  function applyPlaceholderDimensions({ width, height, marginLeft, marginTop }) {
    const ph = placeholderElement;
    if (!ph) return;
    materializePlaceholderWidth(ph);
    ph.style.width = width + 'px';
    ph.style.height = height + 'px';
    ph.style.marginLeft = marginLeft ? marginLeft + 'px' : '';
    ph.style.marginTop = marginTop ? marginTop + 'px' : '';
    positionAnnotOverlay(ph);
    positionBar();
  }

  function showOrUpdateCyclingBar() {
    if (barEl && barEl.style.display !== 'none') updateBarContent('cycling');
    else showBar('cycling');
  }

  function buildPlaceholderResizeHandles() {
    if (!placeholderResizeLayerEl) return;
    placeholderResizeLayerEl.innerHTML = '';
    const hit = 10;
    const half = hit / 2;
    const specs = [
      { edge: 'n', top: -half, left: 0, right: 0, height: hit },
      { edge: 's', bottom: -half, left: 0, right: 0, height: hit },
      { edge: 'e', top: 0, bottom: 0, right: -half, width: hit },
      { edge: 'w', top: 0, bottom: 0, left: -half, width: hit },
    ];
    for (const spec of specs) {
      const handle = el('div', {
        position: 'absolute',
        pointerEvents: 'auto',
        cursor: cursorForPlaceholderEdge(spec.edge),
      });
      if (spec.top != null) handle.style.top = spec.top + 'px';
      if (spec.bottom != null) handle.style.bottom = spec.bottom + 'px';
      if (spec.left != null) handle.style.left = spec.left + 'px';
      if (spec.right != null) handle.style.right = spec.right + 'px';
      if (spec.width != null) handle.style.width = spec.width + 'px';
      if (spec.height != null) handle.style.height = spec.height + 'px';
      handle.dataset.tcherPlaceholderResize = spec.edge;
      handle.setAttribute('aria-label', 'Resize placeholder');
      handle.title = 'Drag to resize';
      placeholderResizeLayerEl.appendChild(handle);
    }
  }

  function syncPlaceholderResizeHandles() {
    if (!placeholderResizeLayerEl) return;
    const show = configureKind === 'insert' && annotActive && !!placeholderElement && state === 'CONFIGURING';
    placeholderResizeLayerEl.style.display = show ? 'block' : 'none';
    if (!show) {
      placeholderResizeLayerEl.innerHTML = '';
      return;
    }
    if (!placeholderResizeLayerEl.childElementCount) buildPlaceholderResizeHandles();
  }

  function startPlaceholderEdgeResize(edge, e) {
    const ph = placeholderElement;
    if (!ph || configureKind !== 'insert') return;
    materializePlaceholderWidth(ph);
    placeholderResizeDrag = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      start: {
        width: ph.offsetWidth,
        height: ph.offsetHeight,
        marginLeft: parseFloat(ph.style.marginLeft) || 0,
        marginTop: parseFloat(ph.style.marginTop) || 0,
      },
      parentWidth: ph.parentNode?.getBoundingClientRect().width || PLACEHOLDER_MIN_WIDTH,
      pointerId: e.pointerId,
    };
    try { annotOverlayEl.setPointerCapture(e.pointerId); } catch {}
    e.stopPropagation();
    e.preventDefault();
  }

  function createInsertPlaceholder(anchor, position, layoutAxis) {
    removeInsertPlaceholderDom();
    const parent = anchor.parentNode;
    if (!parent) return null;
    const axis = layoutAxis || detectInsertAxis(parent);
    const pst = getComputedStyle(parent);
    const ast = getComputedStyle(anchor);
    const sizing = placeholderSizing({
      axis,
      parentDisplay: pst.display,
      parentWidth: parent.getBoundingClientRect().width,
      anchorFlex: ast.flex,
    });
    const placeholder = document.createElement('div');
    placeholder.id = PREFIX + '-insert-placeholder';
    placeholder.setAttribute('data-tcher-insert-placeholder', 'true');
    placeholder.setAttribute('aria-hidden', 'true');
    Object.assign(placeholder.style, {
      boxSizing: 'border-box',
      height: PLACEHOLDER_DEFAULT_HEIGHT + 'px',
      minHeight: PLACEHOLDER_MIN_HEIGHT + 'px',
      border: '2px dotted ' + BP.accent,
      borderRadius: '0',
      background: 'transparent',
      opacity: '1',
      position: 'relative',
      marginLeft: '',
      marginTop: '',
    });
    applyPlaceholderSizingStyles(placeholder, sizing);
    if (position === 'before') parent.insertBefore(placeholder, anchor);
    else parent.insertBefore(placeholder, anchor.nextSibling);
    placeholderElement = placeholder;
    insertAnchorElement = anchor;
    insertAnchorPosition = position;
    insertAnchorLayoutAxis = axis;
    return placeholder;
  }

  function clearInsertPicking() {
    hideInsertLine();
    finalizeInsertSession();
  }

  function isInsertCreateEnabled(btn) {
    btn = btn || uiGetById(PREFIX + '-insert-create');
    return !!btn && btn.getAttribute('aria-disabled') !== 'true';
  }

  let insertCreateTooltipEl = null;

  function ensureInsertCreateTooltip() {
    if (insertCreateTooltipEl) return insertCreateTooltipEl;
    insertCreateTooltipEl = el('div', {
      position: 'fixed',
      display: 'none',
      zIndex: String(Z.bar + 7),
      pointerEvents: 'none',
      maxWidth: '240px',
      padding: '6px 9px',
      borderRadius: '7px',
      background: BP.chatSurface,
      border: '1px solid ' + BP.hairline,
      boxShadow: BP.shadow,
      color: BP.text,
      fontFamily: FONT,
      fontSize: '11px',
      fontWeight: '500',
      lineHeight: '1.35',
    });
    insertCreateTooltipEl.id = PREFIX + '-insert-create-tooltip';
    uiAppend(insertCreateTooltipEl);
    return insertCreateTooltipEl;
  }

  function showInsertCreateTooltip(anchor, message) {
    if (!anchor || !message) return;
    const tip = ensureInsertCreateTooltip();
    tip.textContent = message;
    tip.style.display = 'block';
    const r = anchor.getBoundingClientRect();
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - tipW - 8, r.left + r.width / 2 - tipW / 2));
    const top = Math.max(8, r.top - tipH - 8);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideInsertCreateTooltip() {
    if (!insertCreateTooltipEl) return;
    insertCreateTooltipEl.style.display = 'none';
  }

  function insertCreateGateState(input) {
    return {
      prompt: input?.value ?? '',
    };
  }

  function syncInsertCreateButton(btn, input) {
    btn = btn || uiGetById(PREFIX + '-insert-create');
    input = input || uiGetById(PREFIX + '-insert-input');
    if (!btn || !input) return;
    const gate = insertCreateGateState(input);
    const ok = canCreateInsert(gate);
    const reason = ok ? 'Create variants' : insertCreateDisabledReason(gate);
    btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    btn.setAttribute('aria-label', reason);
    if (ok) {
      hideInsertCreateTooltip();
      btn.style.background = BP.accent;
      btn.style.color = C.ink;
      btn.style.border = 'none';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = BP.textDim;
      btn.style.border = '1px solid ' + BP.hairline;
      btn.style.opacity = '0.72';
      btn.style.cursor = 'not-allowed';
    }
  }

  function buildConfigureRow() {
    const controlsLocked = pendingApplyInFlight === true;
    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '6px',
    });

    // Action pill - dark graphite chip (matches tcher-kit .live-demo-ctx-pill)
    const pill = el('button', {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '5px 10px', borderRadius: '6px',
      background: BP.chatSurface, color: BP.text,
      fontFamily: FONT, fontSize: '12px', fontWeight: '500',
      border: '1px solid ' + BP.hairline, cursor: 'pointer',
      transition: 'background 0.12s ease, border-color 0.12s ease, transform 0.1s ease',
      whiteSpace: 'nowrap', flexShrink: '0',
    });
    pill.textContent = actionLabel() + ' \u25BE';
    pill.disabled = controlsLocked;
    pill.style.cursor = controlsLocked ? 'not-allowed' : 'pointer';
    pill.style.opacity = controlsLocked ? '0.58' : '1';
    if (controlsLocked) pill.title = 'Apply is still running';
    pill.addEventListener('mouseenter', () => {
      if (controlsLocked) return;
      pill.style.background = BP.accentSoft;
      pill.style.borderColor = BP.accent;
    });
    pill.addEventListener('mouseleave', () => {
      if (controlsLocked) return;
      pill.style.background = BP.chatSurface;
      pill.style.borderColor = BP.hairline;
    });
    pill.addEventListener('mousedown', () => { if (!controlsLocked) pill.style.transform = 'scale(0.97)'; });
    pill.addEventListener('mouseup', () => pill.style.transform = 'scale(1)');
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      if (controlsLocked) { showManualApplyBusyToast(); return; }
      toggleActionPicker();
    });
    row.appendChild(pill);

    // Prompt field - same chat-surface chrome as the bottom Steer bar
    const inputWrap = el('div', {
      display: 'inline-flex', alignItems: 'center',
      // Real minimum so the shrink-to-fit bar opens up a long typing area
      // (an <input> alone only contributes ~20ch of intrinsic width).
      flex: '1', minWidth: 'min(400px, 50vw)', height: '28px',
      borderRadius: '7px',
      background: BP.chatSurface,
      border: '1px solid ' + BP.hairline,
      overflow: 'hidden',
      transition: 'border-color 0.15s ease',
    });
    inputWrap.id = PREFIX + '-configure-input-wrap';

    const input = document.createElement('input');
    input.id = PREFIX + '-input';
    input.type = 'text';
    input.placeholder = selectedAction === 'tcher' ? 'Describe what you need.' : 'refine further (optional)…';
    input.setAttribute('aria-label', 'Describe the change');
    Object.assign(input.style, {
      flex: '1', minWidth: '0', width: '100%',
      padding: '0 6px', border: 'none', background: 'transparent',
      fontFamily: FONT, fontSize: '11.5px', color: BP.text,
      outline: 'none',
    });
    input.disabled = controlsLocked;
    if (controlsLocked) {
      input.placeholder = 'apply is running...';
      input.style.cursor = 'not-allowed';
      input.style.opacity = '0.58';
    }

    if (!uiGetById(PREFIX + '-configure-input-style')) {
      const s = document.createElement('style');
      s.id = PREFIX + '-configure-input-style';
      s.textContent =
        '#' + PREFIX + '-input::placeholder { color: ' + BP.textDim + '; opacity: 1; }';
      uiAppendStyle(s);
    }

    input.addEventListener('focus', () => syncConfigureInputChrome());
    input.addEventListener('blur', () => syncConfigureInputChrome());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); handleGo(); return; }
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        input.blur();
        disableInlineEdit();
        hideBar();
        renderEditBadge('hidden');
        state = 'PICKING';
        syncPageChatFocus('configure-input-escape');
        return;
      }
      // Let arrow keys pass through to the element picker when the input is empty
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !input.value) return;
      e.stopPropagation();
    });

    inputWrap.appendChild(input);
    row.appendChild(inputWrap);
    syncConfigureInputChrome();

    // Variant count toggle
    const count = el('button', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxSizing: 'border-box', height: '28px', padding: '0 6px',
      borderRadius: '5px',
      border: '1px solid ' + BP.hairline, background: 'transparent',
      fontFamily: MONO, fontSize: '11px', fontWeight: '600',
      color: BP.textDim, cursor: 'pointer',
      transition: 'color 0.12s ease, border-color 0.12s ease',
      flexShrink: '0', whiteSpace: 'nowrap',
    });
    count.textContent = 'Variations \u00D7' + selectedCount;
    count.title = 'Variants: click to change';
    count.disabled = controlsLocked;
    count.style.cursor = controlsLocked ? 'not-allowed' : 'pointer';
    count.style.opacity = controlsLocked ? '0.58' : '1';
    if (controlsLocked) count.title = 'Apply is still running';
    count.addEventListener('mouseenter', () => { if (!controlsLocked) { count.style.color = BP.text; count.style.borderColor = BP.text; } });
    count.addEventListener('mouseleave', () => { if (!controlsLocked) { count.style.color = BP.textDim; count.style.borderColor = BP.hairline; } });
    count.addEventListener('click', (e) => {
      e.stopPropagation();
      if (controlsLocked) { showManualApplyBusyToast(); return; }
      selectedCount = selectedCount >= 4 ? 2 : selectedCount + 1;
      count.textContent = 'Variations \u00D7' + selectedCount;
    });
    row.appendChild(count);

    // Go button
    const go = el('button', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: '6px',
      boxSizing: 'border-box', height: '28px', padding: '0 12px',
      borderRadius: '6px',
      border: 'none', background: BP.accent, color: C.ink,
      fontFamily: FONT, fontSize: '12px', fontWeight: '600',
      cursor: 'pointer',
      transition: 'filter 0.12s ease, transform 0.1s ease',
      flexShrink: '0', whiteSpace: 'nowrap',
    });
    go.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0" aria-hidden="true"><path d="M19.4999 2.00098C20.0944 2.00063 20.6989 2.15072 21.2499 2.46875C22.924 3.43525 23.4977 5.57598 22.5312 7.25001L15.0311 20.2403C14.0646 21.9142 11.9238 22.488 10.2498 21.5215C9.41372 21.0387 8.85157 20.2605 8.61994 19.3975L7.1209 13.8028L15.8905 8.73927C16.3687 8.46311 16.5327 7.85126 16.2567 7.37306C15.9805 6.89505 15.3686 6.73096 14.8905 7.00685L6.12089 12.0713L2.02515 7.97462C0.658428 6.60771 0.658787 4.39204 2.02515 3.02539C2.65731 2.39319 3.53383 2.00021 4.49978 2L19.4999 2.00098Z"/></svg>Enter';
    go.disabled = controlsLocked;
    go.style.cursor = controlsLocked ? 'not-allowed' : 'pointer';
    go.style.opacity = controlsLocked ? '0.58' : '1';
    if (controlsLocked) go.title = 'Apply is still running';
    go.addEventListener('mouseenter', () => { if (!controlsLocked) go.style.filter = 'brightness(1.1)'; });
    go.addEventListener('mouseleave', () => go.style.filter = 'none');
    go.addEventListener('mousedown', () => { if (!controlsLocked) go.style.transform = 'scale(0.97)'; });
    go.addEventListener('mouseup', () => go.style.transform = 'scale(1)');
    go.addEventListener('click', (e) => { e.stopPropagation(); handleGo(); });
    row.appendChild(go);

    // Auto-focus input after a beat
    if (!controlsLocked) setTimeout(() => input.focus(), 60);

    return row;
  }

  function buildInsertConfigureRow() {
    const controlsLocked = pendingApplyInFlight === true;
    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '6px',
    });

    const inputWrap = el('div', {
      display: 'inline-flex', alignItems: 'center',
      // Real minimum so the shrink-to-fit bar opens up a long typing area
      // (an <input> alone only contributes ~20ch of intrinsic width).
      flex: '1', minWidth: 'min(400px, 50vw)', height: '28px',
      borderRadius: '7px',
      background: BP.chatSurface,
      border: '1px solid ' + BP.hairline,
      overflow: 'hidden',
      transition: 'border-color 0.15s ease',
    });
    inputWrap.id = PREFIX + '-insert-input-wrap';
    inputWrap.addEventListener('pointerdown', (e) => e.stopPropagation());
    inputWrap.addEventListener('mousedown', (e) => e.stopPropagation());
    inputWrap.addEventListener('click', (e) => e.stopPropagation());

    const input = document.createElement('input');
    input.id = PREFIX + '-insert-input';
    input.type = 'text';
    input.placeholder = 'describe what to insert…';
    input.setAttribute('aria-label', 'Describe the new element');
    Object.assign(input.style, {
      flex: '1', minWidth: '0', width: '100%',
      padding: '0 6px', border: 'none', background: 'transparent',
      fontFamily: FONT, fontSize: '11.5px', color: BP.text,
      outline: 'none',
    });
    input.disabled = controlsLocked;
    if (controlsLocked) {
      input.placeholder = 'apply is running...';
      input.style.cursor = 'not-allowed';
      input.style.opacity = '0.58';
    }

    input.addEventListener('input', () => syncInsertCreateButton());
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('click', (e) => {
      e.stopPropagation();
      try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.stopPropagation(); e.preventDefault();
        if (isInsertCreateEnabled()) handleInsertCreate();
        return;
      }
      if (e.key === 'Escape') {
        e.stopPropagation(); e.preventDefault();
        cancelInsertConfigure();
        return;
      }
      e.stopPropagation();
    });
    inputWrap.appendChild(input);
    row.appendChild(inputWrap);

    const count = el('button', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxSizing: 'border-box', height: '28px', padding: '0 6px',
      borderRadius: '5px',
      border: '1px solid ' + BP.hairline, background: 'transparent',
      fontFamily: MONO, fontSize: '11px', fontWeight: '600',
      color: BP.textDim, cursor: 'pointer', flexShrink: '0', whiteSpace: 'nowrap',
    });
    count.textContent = 'Variations \u00D7' + selectedCount;
    count.disabled = controlsLocked;
    count.style.cursor = controlsLocked ? 'not-allowed' : 'pointer';
    count.style.opacity = controlsLocked ? '0.58' : '1';
    count.addEventListener('click', (e) => {
      e.stopPropagation();
      if (controlsLocked) { showManualApplyBusyToast(); return; }
      selectedCount = selectedCount >= 4 ? 2 : selectedCount + 1;
      count.textContent = 'Variations \u00D7' + selectedCount;
    });
    row.appendChild(count);

    const create = el('button', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxSizing: 'border-box', height: '28px', padding: '0 12px',
      borderRadius: '6px',
      border: 'none', background: BP.accent, color: C.ink,
      fontFamily: FONT, fontSize: '12px', fontWeight: '600',
      flexShrink: '0', whiteSpace: 'nowrap',
    });
    create.id = PREFIX + '-insert-create';
    create.textContent = 'Create \u2192';
    create.disabled = controlsLocked;
    create.addEventListener('mouseenter', () => {
      if (controlsLocked) return;
      if (isInsertCreateEnabled(create)) {
        hideInsertCreateTooltip();
        return;
      }
      showInsertCreateTooltip(create, insertCreateDisabledReason(insertCreateGateState(input)));
    });
    create.addEventListener('mouseleave', hideInsertCreateTooltip);
    create.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (controlsLocked) { showManualApplyBusyToast(); return; }
      if (!isInsertCreateEnabled(create)) return;
      handleInsertCreate();
    });
    row.appendChild(create);
    syncInsertCreateButton(create, input);
    if (!controlsLocked) setTimeout(() => input.focus(), 60);
    return row;
  }

  // Generating row

  function buildGeneratingRow() {
    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '2px 4px',
    });

    // Action label
    const label = el('span', {
      fontWeight: '600', fontSize: '12px', color: BP.text,
      flexShrink: '0', whiteSpace: 'nowrap',
    });
    label.textContent = configureKind === 'insert' ? 'Insert' : actionLabel();
    row.appendChild(label);

    // Dots
    row.appendChild(buildDots(false));

    // Status
    const status = el('span', {
      fontSize: '11px', color: BP.textDim, whiteSpace: 'nowrap',
      marginLeft: 'auto',
    });
    // Variants currently arrive atomically in a single file edit, so a
    // per-variant counter would lie. Say what's true.
    status.textContent = recoveryWaitingForAnchor
      ? 'Variants ready. Reveal the selected element to resume.'
      : (arrivedVariants < expectedVariants
        ? 'Generating ' + expectedVariants + ' variants...'
        : 'Done');
    row.appendChild(status);

    return row;
  }

  // Cycling row

  const TUNE_ICON_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="flex-shrink:0"><line x1="4" y1="8" x2="20" y2="8"/><circle cx="14" cy="8" r="2.4" fill="currentColor" stroke="none"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="10" cy="16" r="2.4" fill="currentColor" stroke="none"/></svg>';

  function buildCyclingRow() {
    if (!ensureCyclingRenderable('build-cycling-row')) {
      return el('div', { display: 'none' });
    }
    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '1px 2px',
    });

    // Prev
    const prev = navBtn('\u2190');
    prev.id = PREFIX + '-variant-prev';
    prev.addEventListener('click', (e) => { e.stopPropagation(); cycleVariant(-1); });
    if (visibleVariant <= 1) prev.style.opacity = '0.3';
    row.appendChild(prev);

    // Dots (clickable)
    row.appendChild(buildDots(true));

    // Counter
    const counter = el('span', {
      fontFamily: MONO, fontSize: '11px', fontWeight: '500',
      color: BP.textDim, minWidth: '24px', textAlign: 'center',
    });
    counter.id = PREFIX + '-variant-counter';
    counter.textContent = visibleVariant + '/' + arrivedVariants;
    row.appendChild(counter);

    // Next
    const next = navBtn('\u2192');
    next.id = PREFIX + '-variant-next';
    next.addEventListener('click', (e) => { e.stopPropagation(); cycleVariant(1); });
    if (visibleVariant >= arrivedVariants) next.style.opacity = '0.3';
    row.appendChild(next);

    // Tune chip - only when the visible variant exposes params
    const visParams = parseVariantParams(getVisibleVariantEl());
    const hasParams = visParams.length > 0;
    if (hasParams) {
      const tune = el('button', {
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '5px',
        border: '1px solid transparent',
        background: tuneOpen ? BP.accentSoft : 'transparent',
        color: tuneOpen ? BP.accent : BP.text,
        fontFamily: FONT, fontSize: '11px', fontWeight: '500',
        cursor: 'pointer',
        transition: 'color 0.12s ease, background 0.12s ease',
        whiteSpace: 'nowrap',
      });
      tune.innerHTML = TUNE_ICON_SVG;
      const tuneLabel = document.createElement('span');
      tuneLabel.textContent = 'Tune';
      tune.appendChild(tuneLabel);
      const tuneBadge = document.createElement('span');
      Object.assign(tuneBadge.style, {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: '16px', height: '16px', padding: '0 4px',
        borderRadius: '999px',
        background: tuneOpen ? C.brand : BP.hairline,
        color: tuneOpen ? 'oklch(98% 0 0)' : 'inherit',
        fontFamily: MONO, fontSize: '9.5px', fontWeight: '600',
        lineHeight: '1',
        boxSizing: 'border-box',
      });
      tuneBadge.textContent = String(visParams.length);
      tune.appendChild(tuneBadge);
      tune.title = 'Tune this variant (' + visParams.length + ' knob' + (visParams.length === 1 ? '' : 's') + ')';
      tune.addEventListener('mouseenter', () => {
        if (!tuneOpen) tune.style.background = BP.accentSoft;
      });
      tune.addEventListener('mouseleave', () => {
        if (!tuneOpen) tune.style.background = 'transparent';
      });
      tune.addEventListener('click', (e) => { e.stopPropagation(); toggleTunePopover(); });
      tune.dataset.iceqTune = '1';
      row.appendChild(tune);
    }

    // Spacer
    row.appendChild(el('div', { flex: '1' }));

    // Accept - primary action, brand white + deep ink (matches demo .live-demo-ctx-accept)
    const accept = el('button', {
      padding: '5px 14px', borderRadius: '5px',
      border: 'none', background: C.brand, color: C.ink,
      fontFamily: FONT, fontSize: '11px', fontWeight: '600',
      cursor: 'pointer', transition: 'filter 0.12s ease, transform 0.1s ease',
      whiteSpace: 'nowrap',
    });
    accept.textContent = '\u2713 Accept';
    accept.addEventListener('mouseenter', () => accept.style.filter = 'brightness(1.08)');
    accept.addEventListener('mouseleave', () => accept.style.filter = 'none');
    accept.addEventListener('mousedown', () => accept.style.transform = 'scale(0.97)');
    accept.addEventListener('mouseup', () => accept.style.transform = 'scale(1)');
    accept.addEventListener('click', (e) => { e.stopPropagation(); handleAccept(); });
    if (arrivedVariants === 0) { accept.style.opacity = '0.3'; accept.style.pointerEvents = 'none'; }
    row.appendChild(accept);

    // Discard
    const discard = el('button', {
      padding: '4px 6px', borderRadius: '5px',
      border: '1px solid ' + BP.hairline, background: 'transparent',
      fontFamily: FONT, fontSize: '11px', color: BP.textDim,
      cursor: 'pointer', transition: 'color 0.12s ease, border-color 0.12s ease',
    });
    discard.textContent = '\u2715';
    discard.title = 'Discard all variants';
    discard.addEventListener('mouseenter', () => { discard.style.color = BP.text; discard.style.borderColor = BP.text; });
    discard.addEventListener('mouseleave', () => { discard.style.color = BP.textDim; discard.style.borderColor = BP.hairline; });
    discard.addEventListener('click', (e) => { e.stopPropagation(); handleDiscard(); });
    row.appendChild(discard);

    return row;
  }

  // Shared UI builders

  // Saving row (waiting for agent to process accept/discard)

  function buildSavingRow() {
    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '2px 8px',
    });
    const spinner = el('div', {
      width: '14px', height: '14px', borderRadius: '50%',
      border: '2px solid ' + BP.hairline,
      borderTopColor: BP.accent,
      animation: 'tcher-spin 0.6s linear infinite',
      flexShrink: '0',
    });
    row.appendChild(spinner);
    const label = el('span', {
      fontSize: '12px', color: BP.textDim, fontWeight: '500',
    });
    label.textContent = 'Applying variant...';
    row.appendChild(label);

    ensureSpinKeyframes();
    return row;
  }

  // Confirmed row (green success, auto-dismisses)

  function buildConfirmedRow() {
    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '2px 8px',
    });
    const check = el('span', {
      fontSize: '15px', lineHeight: '1', flexShrink: '0',
      color: 'oklch(25% 0 0)',
    });
    check.textContent = '\u2713';
    row.appendChild(check);
    const label = el('span', {
      fontSize: '12px', color: 'oklch(25% 0 0)', fontWeight: '600',
    });
    label.textContent = 'Variant applied';
    row.appendChild(label);
    return row;
  }

  // Shared UI builders

  function buildDots(clickable) {
    const container = el('div', {
      display: 'flex', alignItems: 'center', gap: '4px',
    });
    for (let i = 1; i <= expectedVariants; i++) {
      const arrived = i <= arrivedVariants;
      const active = i === visibleVariant;
      // active: solid brand-white dot. arrived+inactive: muted neutral.
      // pending (not yet arrived): faint outline ring. No borders on arrived
      // dots - the previous "accent ring + ash fill" combo read as noisy
      // accent chips, especially when all variants had arrived and every
      // dot wore an accent ring.
      const dotBg = active ? C.brand
        : arrived ? BP.textDim
        : 'transparent';
      const dotBorder = arrived ? 'none' : '1.5px solid ' + BP.hairline;
      const dot = el('div', {
        width: active ? '8px' : '6px',
        height: active ? '8px' : '6px',
        borderRadius: '50%',
        background: dotBg,
        border: dotBorder,
        boxSizing: 'border-box',
        transition: 'all 0.2s ' + EASE,
        cursor: (clickable && arrived) ? 'pointer' : 'default',
        transform: arrived ? 'scale(1)' : 'scale(0.85)',
        opacity: arrived ? (active ? '1' : '0.6') : '0.4',
      });
      if (clickable && arrived) {
        const idx = i;
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          selectVariant(idx, 'variant_changed');
        });
      }
      container.appendChild(dot);
    }
    return container;
  }

  function navBtn(text) {
    const b = el('button', {
      width: '26px', height: '26px', borderRadius: '5px',
      border: '1px solid ' + BP.hairline, background: 'transparent',
      color: BP.text, fontFamily: FONT, fontSize: '13px',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'border-color 0.12s ease, background 0.12s ease',
      padding: '0', lineHeight: '1',
    });
    b.textContent = text;
    b.addEventListener('mouseenter', () => { b.style.borderColor = BP.text; });
    b.addEventListener('mouseleave', () => { b.style.borderColor = BP.hairline; });
    return b;
  }

  function actionLabel() {
    const a = ACTIONS.find(a => a.value === selectedAction);
    return a ? a.label : 'Idea';
  }

  function el(tag, styles) {
    const e = document.createElement(tag);
    if (String(tag).toLowerCase() === 'button') e.type = 'button';
    if (styles) Object.assign(e.style, styles);
    return e;
  }

  //
  // Action picker popover
  //

  function initActionPicker() {
    const P = barPaletteForTheme(detectPageTheme());
    pickerEl = document.createElement('div');
    pickerEl.id = PREFIX + '-picker';
    Object.assign(pickerEl.style, {
      position: 'fixed', zIndex: Z.picker,
      display: 'none', opacity: '0',
      transform: 'scale(0.96) translateY(4px)',
      transformOrigin: 'bottom left',
      transition: 'opacity 0.18s ' + EASE + ', transform 0.2s ' + EASE,
      background: P.surface,
      border: '1px solid ' + P.border,
      borderRadius: '8px',
      boxShadow: P.shadow,
      padding: '6px',
      fontFamily: FONT,
    });

    // Build the chip grid
    const grid = el('div', {
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px',
    });

    ACTIONS.forEach(action => {
      const chip = el('button', {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '4px',
        padding: '8px 6px', borderRadius: '6px',
        border: 'none',
        background: action.value === selectedAction ? P.accentSoft : 'transparent',
        color: action.value === selectedAction ? P.accent : P.text,
        fontFamily: FONT, fontSize: '11px', fontWeight: '500',
        cursor: 'pointer',
        transition: 'background 0.1s ease, color 0.1s ease',
        textAlign: 'center', whiteSpace: 'nowrap',
      });
      const iconWrap = el('span', {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '20px', opacity: '0.9',
      });
      iconWrap.innerHTML = ICONS[action.value] || '';
      const labelEl = el('span', { lineHeight: '1' });
      labelEl.textContent = action.label;
      chip.appendChild(iconWrap);
      chip.appendChild(labelEl);
      chip.dataset.action = action.value;
      chip.addEventListener('mouseenter', () => {
        if (action.value !== selectedAction) chip.style.background = P.accentSoft;
      });
      chip.addEventListener('mouseleave', () => {
        chip.style.background = action.value === selectedAction ? P.accentSoft : 'transparent';
      });
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prompt = uiGetById(PREFIX + '-input')?.value || '';
        selectedAction = action.value;
        hideActionPicker();
        updateBarContent('configure');
        const input = uiGetById(PREFIX + '-input');
        if (input && prompt) input.value = prompt;
      });
      grid.appendChild(chip);
    });

    pickerEl.appendChild(grid);
    uiAppend(pickerEl);
    defangOutsideHandlers(pickerEl);

    // Cache the palette on the picker so toggleActionPicker's state refresh
    // uses the same theme-aware colors when it repaints chips.
    pickerEl.__iceq_palette = P;
  }

  function toggleActionPicker() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    if (pickerEl.style.display !== 'none') { hideActionPicker(); return; }
    // Rebuild chips to reflect current selection
    const P = pickerEl.__iceq_palette || barPaletteForTheme(detectPageTheme());
    pickerEl.querySelectorAll('button').forEach(chip => {
      const isActive = chip.dataset.action === selectedAction;
      chip.style.background = isActive ? P.accentSoft : 'transparent';
      chip.style.color = isActive ? P.accent : P.text;
    });
    // Position above the bar
    const barRect = barEl.getBoundingClientRect();
    const pickerH = 170; // approximate; grows with icon + label rows
    let top = barRect.top - pickerH - 6;
    if (top < 8) top = barRect.bottom + 6;
    Object.assign(pickerEl.style, {
      top: top + 'px', left: barRect.left + 'px',
      display: 'block',
    });
    requestAnimationFrame(() => {
      pickerEl.style.opacity = '1';
      pickerEl.style.transform = 'scale(1) translateY(0)';
    });
  }

  function hideActionPicker() {
    if (!pickerEl) return;
    pickerEl.style.opacity = '0';
    pickerEl.style.transform = 'scale(0.96) translateY(4px)';
    setTimeout(() => { if (pickerEl) pickerEl.style.display = 'none'; }, 180);
  }

  function ensureCyclingRenderable(reason) {
    if (arrivedVariants > 0) {
      if (visibleVariant < 1 || visibleVariant > arrivedVariants) visibleVariant = 1;
      return true;
    }
    recoverEmptyCycling(reason);
    return false;
  }

  function recoverEmptyCycling(reason) {
    if (recoveringEmptyCycling) return;
    recoveringEmptyCycling = true;
    try {
      console.warn('[tcher] Refusing to render empty variant cycling state:', reason);
      const message = 'No variants were mounted. Please try again.';
      if (svelteComponentSession?.sessionId === currentSessionId) {
        abortSvelteComponentInjection(currentSessionId, message);
        return;
      }
      cleanup();
      showToast(message, 5000);
    } finally {
      recoveringEmptyCycling = false;
    }
  }

  //
  // Params panel (per-variant coarse controls)
  //
  // Variants may declare a parameter manifest via a JSON attribute on the
  // variant wrapper:
  //
  //   <div data-tcher-variant="1"
  //        data-tcher-params='[{"id":"density","kind":"steps",...}]'>
  //
  // The panel docks to the right edge of the outline during CYCLING and
  // exposes 2-5 coarse knobs. Values apply to the variant wrapper so scoped
  // CSS can respond instantly without regeneration:
  //
  //   range  / numeric toggle  -> CSS custom property used by variant styles
  //   steps  / boolean toggle  → data-p-<id> attribute  used via :scope[data-p-foo="..."]
  //
  // On variant switch, values reset to that variant's declared defaults.
  // On accept, current values are sent in the event payload so the agent
  // can bake them into the source-file write.
  //

  let paramsPanelEl = null;     // outer wrapper (overflow:hidden, clips the slide)
  let paramsPanelInner = null;  // translating content (carries bg, padding, knobs)
  let paramsPanelBody = null;   // grid holding the knob cells
  let paramsCurrentValues = {}; // {paramId: value} - mirror of the visible variant's live values
  let tuneOpen = false;         // whether the Tune popover is open right now

  // Theme-aware Tune popover. Appears as a drawer that slides out from the
  // contextual bar's bar-facing edge (below if the bar sits below the
  // element, above otherwise). Same width as the bar. Auto-wraps to extra
  // rows when the knobs exceed one row. The bar's border-radius on the
  // popover side goes flat while open so the two shapes read as one.
  let paramsPanelPalette = null;

  function initParamsPanel() {
    paramsPanelPalette = barPaletteForTheme(detectPageTheme());
    const P = paramsPanelPalette;

    // Single element, always in the DOM. The slide animation is a CSS mask
    // with mask-size growing from 0% to 100% along the bar-facing axis - no
    // display toggle, no opacity toggle, no transform trickery. The mask
    // hides everything initially; as it grows, content is revealed from
    // the bar edge outward.
    paramsPanelEl = document.createElement('div');
    paramsPanelEl.id = PREFIX + '-params-panel';
    Object.assign(paramsPanelEl.style, {
      position: 'fixed', zIndex: String(Z.bar - 1),
      background: P.surfaceDeep,
      color: P.text,
      fontFamily: FONT,
      padding: '14px 18px',
      boxSizing: 'border-box',
      borderRadius: '0 0 10px 10px',
      pointerEvents: 'none',

      // clip-path is the same conceptual reveal as mask but with rock-solid
      // transition support across engines. Closed state clips from the far
      // edge; open = inset(0) shows everything.
      clipPath: 'inset(0 0 100% 0)',
      transition: 'clip-path 0.44s ' + EASE,

      // Park off-screen until positionParamsPanel places it. These are NOT
      // in the transition list, so they snap instantly - no fly-in from the
      // top-left when first shown.
      top: '-9999px', left: '-9999px', width: '0',
    });

    paramsPanelBody = el('div', {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px 16px',
    });

    paramsPanelEl.appendChild(paramsPanelBody);
    uiAppend(paramsPanelEl);
    // Don't override pointer-events: the panel toggles between 'none' (closed,
    // click-through) and 'auto' (open) on its own. Just silence the host's
    // outside-interaction listeners while the panel is open.
    defangOutsideHandlers(paramsPanelEl, { setPointerEvents: false });
    paramsPanelInner = paramsPanelEl; // compatibility alias for the rest of the code
  }


  function getMountedSvelteComponentAnchor(session = svelteComponentSession) {
    const el = session?.mountTargetEl?.firstElementChild || null;
    if (!el || !document.body.contains(el)) return null;
    return rectIsUsableAnchor(el.getBoundingClientRect()) ? el : null;
  }

  function resolveSvelteComponentAnchor(session = svelteComponentSession) {
    return getMountedSvelteComponentAnchor(session)
      || session?.swapAnchor
      || null;
  }

  function getVisibleVariantEl() {
    if (!currentSessionId) return null;
    if (svelteComponentSession?.sessionId === currentSessionId) {
      return resolveSvelteComponentAnchor()
        || svelteComponentSession.wrapperEl
        || null;
    }
    const wrapper = document.querySelector('[data-tcher-variants="' + currentSessionId + '"]');
    if (!wrapper) return null;
    return wrapper.querySelector('[data-tcher-variant="' + visibleVariant + '"]');
  }

  function parseVariantParams(variantEl) {
    // Svelte component variants can't carry a `data-tcher-params` attribute:
    // the compiler reads `{` inside attribute values as expression delimiters, so
    // JSON-with-braces breaks the build. For that path the params live in a sidecar
    // params.json keyed by variant number, loaded into the session at mount time.
    if (svelteComponentSession?.sessionId === currentSessionId) {
      const byVariant = svelteComponentSession.paramsByVariant || {};
      const params = byVariant[String(visibleVariant)] || byVariant[visibleVariant];
      return Array.isArray(params) ? params : [];
    }
    if (!variantEl) return [];
    const raw = variantEl.getAttribute('data-tcher-params');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[tcher] Invalid data-tcher-params JSON:', err.message);
      return [];
    }
  }

  function applyParamValue(variantEl, param, value) {
    if (!variantEl) return;
    const attr = 'data-p-' + param.id;
    if (param.kind === 'range') {
      variantEl.style.setProperty('--p-' + param.id, String(value));
    } else if (param.kind === 'toggle') {
      const on = !!value;
      variantEl.style.setProperty('--p-' + param.id, on ? '1' : '0');
      if (on) variantEl.setAttribute(attr, 'on');
      else variantEl.removeAttribute(attr);
    } else if (param.kind === 'steps') {
      variantEl.setAttribute(attr, String(value));
    }
  }

  function applyParamDefaults(variantEl, params) {
    paramsCurrentValues = {};
    for (const p of params) {
      paramsCurrentValues[p.id] = p.default;
      applyParamValue(variantEl, p, p.default);
    }
  }

  function formatRangeValue(input) {
    const max = parseFloat(input.max), min = parseFloat(input.min);
    const v = parseFloat(input.value);
    if (!isFinite(v)) return input.value;
    return (max - min) <= 2 ? v.toFixed(2) : String(Math.round(v));
  }

  function buildParamsPanel(variantEl, params) {
    const P = paramsPanelPalette || barPaletteForTheme(detectPageTheme());
    paramsPanelBody.innerHTML = '';
    for (const p of params) {
      const row = el('div', { display: 'flex', flexDirection: 'column', gap: '6px' });
      const labelRow = el('div', {
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', gap: '8px',
      });
      const lbl = el('span', {
        fontSize: '10.5px', fontWeight: '600', color: P.text,
        letterSpacing: '0.03em',
      });
      lbl.textContent = p.label || p.id;
      labelRow.appendChild(lbl);
      const readout = el('span', {
        fontSize: '10.5px', color: P.textDim,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      labelRow.appendChild(readout);
      row.appendChild(labelRow);

      if (p.kind === 'range') {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(p.min != null ? p.min : 0);
        input.max = String(p.max != null ? p.max : 1);
        input.step = String(p.step != null ? p.step : 0.05);
        input.value = String(p.default);
        Object.assign(input.style, {
          width: '100%', accentColor: C.brand, cursor: 'pointer',
        });
        readout.textContent = formatRangeValue(input);
        input.addEventListener('input', (e) => {
          e.stopPropagation();
          const v = parseFloat(input.value);
          paramsCurrentValues[p.id] = v;
          readout.textContent = formatRangeValue(input);
          applyParamValue(variantEl, p, v);
          queueCheckpoint('param_changed');
        });
        row.appendChild(input);
      } else if (p.kind === 'toggle') {
        const initial = !!p.default;
        readout.textContent = initial ? 'On' : 'Off';
        const track = el('button', {
          position: 'relative', width: '36px', height: '20px',
          borderRadius: '10px', border: 'none', padding: '0',
          cursor: 'pointer',
          background: initial ? C.brand : P.hairline,
          transition: 'background 0.15s ease',
          alignSelf: 'flex-start',
        });
        const knob = el('span', {
          position: 'absolute', top: '2px',
          left: initial ? '18px' : '2px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: 'oklch(98% 0 0)',
          transition: 'left 0.18s ' + EASE,
          boxShadow: '0 1px 2px oklch(0% 0 0 / 0.2)',
        });
        track.appendChild(knob);
        track.addEventListener('click', (e) => {
          e.stopPropagation();
          const next = !paramsCurrentValues[p.id];
          paramsCurrentValues[p.id] = next;
          track.style.background = next ? C.brand : P.hairline;
          knob.style.left = next ? '18px' : '2px';
          readout.textContent = next ? 'On' : 'Off';
          applyParamValue(variantEl, p, next);
          queueCheckpoint('param_changed');
        });
        row.appendChild(track);
      } else if (p.kind === 'steps') {
        const opts = (p.options || []).map(o =>
          typeof o === 'string' ? { value: o, label: o } : o
        );
        const activeOpt = opts.find(o => o.value === p.default) || opts[0];
        readout.textContent = activeOpt ? activeOpt.label : String(p.default);
        const segRow = el('div', {
          display: 'grid',
          gridTemplateColumns: 'repeat(' + opts.length + ', 1fr)',
          gap: '1px', padding: '2px',
          background: P.hairline, borderRadius: '5px',
        });
        const segBtns = [];
        opts.forEach(o => {
          const active = o.value === p.default;
          const b = el('button', {
            padding: '5px 4px', border: 'none', borderRadius: '3px',
            background: active ? C.brand : 'transparent',
            color: active ? 'oklch(98% 0 0)' : P.text,
            fontFamily: FONT, fontSize: '10.5px', fontWeight: '500',
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'background 0.1s ease, color 0.1s ease',
          });
          b.textContent = o.label;
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            paramsCurrentValues[p.id] = o.value;
            readout.textContent = o.label;
            segBtns.forEach(({ btn, val }) => {
              const on = val === o.value;
              btn.style.background = on ? C.brand : 'transparent';
              btn.style.color = on ? 'oklch(98% 0 0)' : P.text;
            });
            applyParamValue(variantEl, p, o.value);
            queueCheckpoint('param_changed');
          });
          segRow.appendChild(b);
          segBtns.push({ btn: b, val: o.value });
        });
        row.appendChild(segRow);
      }

      paramsPanelBody.appendChild(row);
    }
  }

  //
  // Inline text editing - makes pure-text descendants of the picked element
  // directly contenteditable. Save stages copy edits in the live buffer; the
  // Apply copy edits dock later asks the AI to apply the staged batch.
  //

  let inlineEditRows = [];
  let inlineEditDrafts = new Map();

  // Mixed-content elements (e.g. <p>text<code>x</code>text</p>) skip the row
  // walker's "all-children-are-text-nodes" rule. Wrap each non-whitespace direct
  // text-node child in a marker span so the walker emits a row for it. The
  // wrappers are inline display by default and inherit styles, so the page
  // shouldn't visually shift. We unwrap in disableInlineEdit.
  const MIXED_WRAP_SKIP = { script: 1, style: 1, template: 1, noscript: 1, svg: 1, code: 1, pre: 1 };

  function collectEditableTextRows(rootEl, opts) {
    if (!rootEl || rootEl.nodeType !== 1) return [];
    const isOwn = (opts && opts.isOwn) || (() => false);
    const rows = [];

    function visit(el) {
      if (!el || el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      if (MIXED_WRAP_SKIP[tag]) return;
      if (el.hasAttribute && el.hasAttribute('contenteditable')) return;
      if (el !== rootEl && isOwn(el)) return;

      const children = Array.from(el.childNodes);
      const textNodes = [];
      let allText = children.length > 0;
      let hasNonWhitespaceText = false;
      for (const node of children) {
        if (node.nodeType === 3) {
          textNodes.push(node);
          if (node.nodeValue && /\S/.test(node.nodeValue)) hasNonWhitespaceText = true;
        } else {
          allText = false;
        }
      }
      if (allText && hasNonWhitespaceText) {
        rows.push({
          el,
          ref: documentRefForElement(el) || el.tagName.toLowerCase(),
          text: textNodes.map((node) => node.nodeValue).join(''),
          textNodes,
        });
      }

      for (const child of children) {
        if (child.nodeType === 1) visit(child);
      }
    }

    visit(rootEl);
    return rows;
  }

  function wrapMixedContentTextNodes(rootEl) {
    if (!rootEl || rootEl.nodeType !== 1) return;
    const tag = rootEl.tagName.toLowerCase();
    if (MIXED_WRAP_SKIP[tag]) return;
    if (rootEl.hasAttribute('contenteditable')) return;
    const children = Array.from(rootEl.childNodes);
    const hasText = children.some((n) => n.nodeType === 3 && /\S/.test(n.nodeValue || ''));
    const hasElement = children.some((n) => n.nodeType === 1);
    if (hasText && hasElement) {
      for (const node of children) {
        if (node.nodeType === 3 && /\S/.test(node.nodeValue || '')) {
          const wrap = document.createElement('span');
          wrap.dataset.tcherTextWrap = 'true';
          wrap.textContent = node.nodeValue;
          rootEl.insertBefore(wrap, node);
          rootEl.removeChild(node);
        }
      }
    }
    for (const child of Array.from(rootEl.children)) {
      if (!child.dataset || !child.dataset.tcherTextWrap) {
        wrapMixedContentTextNodes(child);
      }
    }
  }
  function unwrapMixedContentTextNodes(rootEl) {
    if (!rootEl || rootEl.nodeType !== 1) return;
    const wraps = rootEl.querySelectorAll('[data-tcher-text-wrap="true"]');
    for (const wrap of wraps) {
      const parent = wrap.parentNode;
      if (!parent) continue;
      const textNode = document.createTextNode(wrap.textContent);
      parent.replaceChild(textNode, wrap);
      parent.normalize();
    }
  }
  let inlineEditRoot = null;

  function enableInlineEdit(targetEl) {
    if (!targetEl) return;
    inlineEditRoot = targetEl;
    wrapMixedContentTextNodes(targetEl);
    const rows = collectEditableTextRows(targetEl, { isOwn: own });
    inlineEditRows = rows;
    inlineEditDrafts = new Map();
    for (const row of rows) {
      row.inlineWhiteSpace = row.el.style.whiteSpace;
      row.el.style.whiteSpace = getComputedStyle(row.el).whiteSpace;
      row.el.setAttribute('contenteditable', 'true');
      row.el.dataset.tcherEditable = 'true';
      row.el.dataset.tcherOriginalText = row.text;
      row.el.style.userSelect = 'text';
      row.el.style.cursor = 'text';
      row.el.style.outline = 'none';
      row.el.addEventListener('input', onInlineInput);
    }
  }

  function disableInlineEdit(opts = {}) {
    for (const row of inlineEditRows) {
      if (activeElementDeep() === row.el) row.el.blur();
      row.el.removeAttribute('contenteditable');
      delete row.el.dataset.tcherEditable;
      delete row.el.dataset.tcherOriginalText;
      row.el.style.whiteSpace = row.inlineWhiteSpace || '';
      row.el.style.userSelect = '';
      row.el.style.cursor = '';
      row.el.style.outline = '';
      row.el.removeEventListener('input', onInlineInput);
    }
    inlineEditRows = [];
    inlineEditDrafts = new Map();
    if (inlineEditRoot && !opts.preserveMixedWraps) {
      unwrapMixedContentTextNodes(inlineEditRoot);
      inlineEditRoot = null;
    }
  }

  function onInlineInput(e) {
    inlineEditDrafts.set(e.currentTarget, e.currentTarget.textContent);
  }

  function hasTextRows(el) {
    if (!el) return false;
    // Lightweight: any descendant outside SKIP_SUBTREE_TAGS with at least one
    // non-whitespace direct text-node child means we have something editable
    // (mixed-content paragraphs included). Mirrors what the wrap+walk path
    // will produce in enableInlineEdit.
    function check(node) {
      if (!node || node.nodeType !== 1) return false;
      const tag = node.tagName.toLowerCase();
      if (MIXED_WRAP_SKIP[tag]) return false;
      if (node !== el && own(node)) return false;
      for (const child of node.childNodes) {
        if (child.nodeType === 3 && /\S/.test(child.nodeValue || '')) return true;
      }
      for (const child of node.children) {
        if (check(child)) return true;
      }
      return false;
    }
    return check(el);
  }

  function enterEditingMode() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    state = 'EDITING';
    hideBar();
    hideAnnotOverlay();
    renderEditBadge('editing');
    enableInlineEdit(selectedElement);
    // Focus first editable element and position cursor at end
    if (inlineEditRows.length > 0) {
      const firstEditable = inlineEditRows[0] && inlineEditRows[0].el;
      setTimeout(() => {
        const el = firstEditable;
        if (!el || !el.isConnected || state !== 'EDITING') return;
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }, 50);
    }
  }

  function restoreInlineEditDrafts() {
    for (const row of inlineEditRows) {
      if (inlineEditDrafts.has(row.el)) {
        row.el.textContent = row.el.dataset.tcherOriginalText;
      }
    }
  }

  function cancelEditing() {
    restoreInlineEditDrafts();
    disableInlineEdit();
    state = 'CONFIGURING';
    showBar('configure');
    showAnnotOverlay(selectedElement);
    renderEditBadge('idle');
  }

  function cancelEditingToPicking() {
    restoreInlineEditDrafts();
    disableInlineEdit();
    hideBar();
    stopScrollTracking();
    hideAnnotOverlay();
    renderEditBadge('hidden');
    state = 'PICKING';
    hoveredElement = null;
    hideHighlight();
    syncPageChatFocus('editing-outside-click');
  }

  // Prefer the leaf's own id/class; if it has neither (e.g. a bare <em>),
  // climb to the nearest ancestor with one. The CLI uses tag+class together,
  // so tag must come from the same node as the locator.
  function buildLocatorForLeaf(leafEl, fallbackEl) {
    if (leafEl && (leafEl.id || leafEl.classList.length > 0)) {
      return {
        tag: leafEl.tagName.toLowerCase(),
        elementId: leafEl.id || null,
        classes: [...leafEl.classList],
      };
    }
    let cur = leafEl?.parentElement;
    while (cur && cur !== document.body) {
      if (cur.id || cur.classList.length > 0) {
        return {
          tag: cur.tagName.toLowerCase(),
          elementId: cur.id || null,
          classes: [...cur.classList],
        };
      }
      cur = cur.parentElement;
    }
    return {
      tag: (fallbackEl || leafEl).tagName.toLowerCase(),
      elementId: (fallbackEl || leafEl).id || null,
      classes: [...((fallbackEl || leafEl).classList || [])],
    };
  }

  function sourceHintForElement(el) {
    if (!el || !el.getAttribute) return null;
    const file = el.getAttribute('data-astro-source-file');
    const loc = el.getAttribute('data-astro-source-loc');
    if (file || loc) {
      const parsed = parseSourceLoc(loc);
      return {
        file: file || '',
        loc: loc || '',
        line: parsed.line,
        column: parsed.column,
      };
    }
    return null;
  }

  function parseSourceLoc(loc) {
    const match = String(loc || '').match(/^(\d+)(?::(\d+))?/);
    return {
      line: match ? Number(match[1]) : null,
      column: match && match[2] ? Number(match[2]) : null,
    };
  }

  function documentRefForElement(el) {
    if (!el || el.nodeType !== 1) return null;
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const tag = cur.tagName.toLowerCase();
      if (tag === 'html') break;
      if (tag === 'body') {
        parts.unshift('body');
        break;
      }
      parts.unshift(documentRefSegment(cur));
      cur = cur.parentElement;
    }
    return parts.join('>') || null;
  }

  function documentRefSegment(el) {
    const tag = el.tagName.toLowerCase();
    return tag + documentRefIdSuffix(el) + documentRefClassSuffix(el) + ':nth-of-type(' + indexAmongSameTag(el) + ')';
  }

  function documentRefIdSuffix(el) {
    return el.id ? '#' + normalizeDocumentRefToken(el.id) : '';
  }

  function documentRefClassSuffix(el) {
    if (!el.classList || el.classList.length === 0) return '';
    const classes = [];
    for (const cls of el.classList) {
      if (!cls || cls.indexOf('tcher-') === 0) continue;
      classes.push(normalizeDocumentRefToken(cls));
      if (classes.length === 2) break;
    }
    return classes.length ? '.' + classes.join('.') : '';
  }

  function normalizeDocumentRefToken(value) {
    return String(value || '').replace(/[>\s]+/g, '_');
  }

  function indexAmongSameTag(el) {
    const parent = el.parentElement;
    if (!parent) return 1;
    const tag = el.tagName.toLowerCase();
    let n = 0;
    for (const sib of parent.children) {
      if (sib.tagName.toLowerCase() === tag) {
        n++;
        if (sib === el) return n;
      }
    }
    return 1;
  }

  function copyEditLeafContext(el, originalText, newText) {
    if (!el) return null;
    return {
      ref: documentRefForElement(el),
      tagName: el.tagName ? el.tagName.toLowerCase() : null,
      id: el.id || null,
      classes: el.classList ? [...el.classList].filter((cls) => cls.indexOf('tcher-') !== 0) : [],
      originalText,
      newText,
      textContent: (el.textContent || '').slice(0, 500),
      outerHTML: sanitizedContextOuterHTML(el, 3000) || null,
    };
  }

  function nearbyEditableTextsForManualEdit(rows, activeEl, originalText, newText) {
    const out = [];
    const seen = new Set();
    const skip = new Set([normalizeManualContextText(originalText), normalizeManualContextText(newText)]);
    for (const row of rows || []) {
      if (!row || row.el === activeEl) continue;
      const text = normalizeManualContextText(row.text);
      if (!text || text.length < 2 || seen.has(text) || skip.has(text)) continue;
      seen.add(text);
      out.push({
        ref: documentRefForElement(row.el),
        tag: row.el?.tagName ? row.el.tagName.toLowerCase() : null,
        classes: row.el?.classList ? [...row.el.classList].filter((cls) => cls.indexOf('tcher-') !== 0) : [],
        text,
      });
      if (out.length >= 12) break;
    }
    return out;
  }

  function copyEditContainerContext(el) {
    if (!el) return null;
    return {
      ref: documentRefForElement(el),
      tagName: el.tagName ? el.tagName.toLowerCase() : null,
      id: el.id || null,
      classes: el.classList ? [...el.classList].filter((cls) => cls.indexOf('tcher-') !== 0) : [],
      textContent: (el.textContent || '').slice(0, 1000),
      outerHTML: sanitizedContextOuterHTML(el, 10000) || null,
    };
  }

  function forbiddenManualTextChars(text) {
    const out = [];
    for (const ch of ['<', '{', '}', '`']) {
      if (String(text || '').includes(ch)) out.push(ch);
    }
    return out;
  }

  async function applyEditing() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    const ops = [];
    for (const row of inlineEditRows) {
      const newText = inlineEditDrafts.get(row.el);
      if (newText !== undefined && newText !== row.text) {
        if (String(newText || '').trim() === '') {
          showToast('Save rejected: copy edits cannot be empty.', 5500);
          return;
        }
        const forbidden = forbiddenManualTextChars(newText);
        if (forbidden.length > 0) {
          showToast('Save rejected: newText cannot contain ' + forbidden.join(' ') + ' (plain text only; ask the AI to insert markup)', 5500);
          return;
        }
        const locator = buildLocatorForLeaf(row.el, selectedElement);
        const op = {
          ref: row.ref,
          tag: locator.tag,
          elementId: locator.elementId,
          classes: locator.classes,
          originalText: row.text,
          newText,
        };
        op.leaf = copyEditLeafContext(row.el, row.text, newText);
        op.nearbyEditableTexts = nearbyEditableTextsForManualEdit(inlineEditRows, row.el, row.text, newText);
        const restoreHint = mixedTextWrapRestoreHint(row.el);
        if (restoreHint) op.restore = restoreHint;
        const sourceHint = sourceHintForElement(row.el);
        if (sourceHint) op.sourceHint = sourceHint;
        ops.push(op);
      }
    }
    if (ops.length === 0) { cancelEditing(); return; }
    const contextElement = contextElementForManualEdit(selectedElement, inlineEditRows, ops);
    const contextRef = documentRefForElement(contextElement);
    if (contextRef) for (const op of ops) op.contextRef = contextRef;
    const container = copyEditContainerContext(contextElement);
    if (container) for (const op of ops) op.container = container;
    try {
      const res = await fetch('http://localhost:' + PORT + '/manual-edit-stash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: TOKEN,
          id: id8(),
          pageUrl: location.pathname,
          element: extractContext(contextElement),
          ops,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || ('HTTP ' + res.status));
      }
      const stashResult = await res.json();
      updatePendingCounter(stashResult.pendingCount || 0);
      maybeShowFirstSaveToast();
      disableInlineEdit();
      state = 'CONFIGURING';
      showBar('configure');
      showAnnotOverlay(selectedElement);
      renderEditBadge('idle');
    } catch (err) {
      console.error('[tcher] manual edit stash failed:', err);
      const detail = String(err?.message || '');
      if (detail.includes('newText cannot contain') || detail.includes('newText cannot be empty')) {
        showToast('Save rejected: ' + detail.replace(/^manual_edits:\s*/, ''), 5500);
      } else {
        showToast('Save failed - retry or cancel', 4000);
      }
    }
  }

  function schedulePendingDockPosition() {
    if (!pendingDockEl || !globalBarEl) return;
    requestAnimationFrame(positionPendingDock);
  }

  function positionPendingDock() {
    if (!pendingDockEl || !globalBarEl) return;
    const width = globalBarEl.offsetWidth;
    const height = globalBarEl.offsetHeight;
    if (!width || !height) return;
    pendingDockEl.style.left = Math.round((window.innerWidth / 2) - (width / 2) - 18) + 'px';
    pendingDockEl.style.top = 'auto';
    pendingDockEl.style.bottom = Math.round(14 + (height / 2)) + 'px';
  }

  function playPendingIntroAnimation() {
    if (!pendingPillEl || !pendingPillEl.animate || (matchMedia?.('(prefers-reduced-motion: reduce)').matches)) return;
    if (pendingIntroAnimation) pendingIntroAnimation.cancel();
    pendingIntroAnimation = pendingPillEl.animate([
      {
        opacity: 0,
        transform: 'scale(0.82)',
        filter: 'brightness(1.2)',
        boxShadow: '0 0 0 0 oklch(97% 0 0 / 0.45), 0 8px 24px oklch(0% 0 0 / 0.16)',
      },
      {
        opacity: 1,
        transform: 'scale(1.08)',
        filter: 'brightness(1.15)',
        boxShadow: '0 0 0 12px oklch(97% 0 0 / 0), 0 12px 34px oklch(0% 0 0 / 0.22)',
        offset: 0.55,
      },
      {
        opacity: 1,
        transform: 'scale(1)',
        filter: 'none',
        boxShadow: '0 4px 16px oklch(0% 0 0 / 0.16), 0 1px 3px oklch(0% 0 0 / 0.1)',
      },
    ], { duration: 620, easing: EASE });
    pendingIntroAnimation.addEventListener('finish', () => { pendingIntroAnimation = null; }, { once: true });
  }

  function ensureSpinKeyframes() {
    if (uiGetById(PREFIX + '-keyframes')) return;
    const style = document.createElement('style');
    style.id = PREFIX + '-keyframes';
    style.textContent = '@keyframes tcher-spin { to { transform: rotate(360deg); } }';
    uiAppendStyle(style);
  }

  function pendingApplyLabel(count) {
    return count === 1 ? 'Apply copy edit' : 'Apply copy edits';
  }

  function showManualApplyBusyToast() {
    showToast('Apply is still running. Wait for it to finish.', 2800);
  }

  function manualApplyStateKey() {
    return PREFIX + ':manual-apply:' + PORT + ':' + TOKEN + ':' + location.pathname;
  }

  function readStoredManualApplyState() {
    try {
      const raw = sessionStorage.getItem(manualApplyStateKey());
      if (!raw) return null;
      const storedState = JSON.parse(raw);
      if (!storedState || storedState.pageUrl !== location.pathname || Date.now() > Number(storedState.expiresAt || 0)) {
        sessionStorage.removeItem(manualApplyStateKey());
        return null;
      }
      return storedState;
    } catch {
      return null;
    }
  }

  function writeManualApplyState(applyState) {
    try {
      sessionStorage.setItem(manualApplyStateKey(), JSON.stringify({
        ...applyState,
        pageUrl: location.pathname,
        updatedAt: Date.now(),
        expiresAt: Date.now() + MANUAL_APPLY_STATE_TTL_MS,
      }));
    } catch {
      // Best-effort only. The in-memory flag still covers non-reload flows.
    }
  }

  function storeManualApplyState(count, patch) {
    const currentCount = Number(count) || 0;
    const existing = readStoredManualApplyState() || {};
    const totalOps = Number(existing.totalOps) || Number(existing.count) || currentCount;
    if (totalOps <= 0 && currentCount <= 0) return;
    writeManualApplyState({
      count: Number(existing.count) || currentCount || totalOps,
      totalOps: totalOps || currentCount,
      completedOps: Number(existing.completedOps) || 0,
      remainingCount: Number.isFinite(Number(existing.remainingCount)) ? Number(existing.remainingCount) : currentCount,
      phase: existing.phase || 'applying',
      startedAt: Number(existing.startedAt) || Date.now(),
      ...(patch || {}),
    });
  }

  function clearStoredManualApplyState() {
    try {
      sessionStorage.removeItem(manualApplyStateKey());
    } catch {
      // Ignore storage failures; UI state can still clear in memory.
    }
  }

  function shouldResumeManualApplyLoading(count) {
    return Number(count) > 0 && readStoredManualApplyState() !== null;
  }

  function manualApplyLoadingText(fallbackCount) {
    const stored = readStoredManualApplyState();
    if (stored?.phase === 'repair-decision') return 'Apply needs attention';
    if (stored?.phase === 'repairing') {
      const attempt = Number(stored.repairAttempt) || 1;
      const max = Number(stored.repairMaxAttempts) || 3;
      return 'Fixing apply issue, attempt ' + attempt + '/' + max;
    }
    if (stored?.phase === 'verifying') return 'Verifying copy edits';
    const remaining = Number.isFinite(Number(stored?.remainingCount))
      ? Number(stored.remainingCount)
      : Number(fallbackCount) || 0;
    return remaining > 0
      ? 'Applying ' + remaining + ' copy edit' + (remaining === 1 ? '' : 's')
      : 'Verifying copy edits';
  }

  function resetManualApplyProgress(count) {
    const total = Number(count) || 0;
    if (total <= 0) return;
    writeManualApplyState({
      count: total,
      totalOps: total,
      completedOps: 0,
      remainingCount: total,
      phase: 'applying',
      startedAt: Date.now(),
    });
  }

  function updateManualApplyProgressFromChunk(chunk) {
    if (!chunk || !pendingApplyInFlight) return;
    const stored = readStoredManualApplyState() || {};
    const totalOps = Number(chunk.totalOpCount) || Number(stored.totalOps) || Number(stored.count) || parseInt(pendingPillEl?.dataset.count || '0', 10) || 0;
    const completedOps = Math.min(totalOps, (Number(stored.completedOps) || 0) + (Number(chunk.opCount) || 0));
    const remainingCount = Math.max(0, totalOps - completedOps);
    storeManualApplyState(Number(stored.count) || totalOps, {
      totalOps,
      completedOps,
      remainingCount,
      phase: remainingCount > 0 ? 'applying' : 'verifying',
    });
    setPendingApplyLoading(true, remainingCount);
  }

  function updateManualApplyRepairState(repair, phase) {
    const count = parseInt(pendingPillEl?.dataset.count || '0', 10) || Number(readStoredManualApplyState()?.count) || 0;
    if (count <= 0) return;
    storeManualApplyState(count, {
      phase,
      repairAttempt: Number(repair?.attempt || repair?.attempts) || 1,
      repairMaxAttempts: Number(repair?.maxAttempts) || 3,
    });
    setPendingApplyLoading(true, count);
  }

  function refreshLiveControlsForManualApply() {
    if (pendingApplyInFlight) {
      hideActionPicker();
      closeTunePopover();
    }
    if (barEl && barEl.style.display !== 'none' && state === 'CONFIGURING') {
      const input = uiGetById(PREFIX + '-input');
      const prompt = input ? input.value : '';
      updateBarContent('configure');
      const nextInput = uiGetById(PREFIX + '-input');
      if (nextInput) nextInput.value = prompt;
    }
    if (editBadgeEl && editBadgeEl.style.display !== 'none') {
      if (pendingApplyInFlight) renderEditBadge('idle-disabled');
      else if (state === 'CONFIGURING' && selectedElement && hasTextRows(selectedElement)) renderEditBadge('idle');
    }
    updateGlobalBarState();
  }

  function hidePendingApplyDock() {
    pendingApplyInFlight = false;
    clearStoredManualApplyState();
    if (pendingIntroAnimation) { pendingIntroAnimation.cancel(); pendingIntroAnimation = null; }
    if (pendingDockEl) pendingDockEl.style.display = 'none';
    if (pendingPillEl) {
      pendingPillEl.dataset.count = '0';
      pendingPillEl.style.display = 'none';
      pendingPillEl.disabled = false;
      pendingPillEl.setAttribute('aria-busy', 'false');
      pendingPillEl.setAttribute('aria-label', 'Apply copy edits to source');
      pendingPillEl.style.cursor = 'pointer';
      pendingPillEl.style.filter = 'none';
      pendingPillEl.style.transform = 'scale(1)';
    }
    if (pendingPillSpinnerEl) pendingPillSpinnerEl.style.display = 'none';
    if (pendingPillLabelEl) pendingPillLabelEl.textContent = pendingApplyLabel(0);
    if (pendingPillCountEl) {
      pendingPillCountEl.textContent = '0';
      pendingPillCountEl.style.display = 'inline-flex';
    }
    if (pendingTrashBtn) {
      pendingTrashBtn.style.display = 'none';
      pendingTrashBtn.disabled = false;
      pendingTrashBtn.style.cursor = 'pointer';
      pendingTrashBtn.style.opacity = '1';
    }
    if (pendingKeepFixingBtn) pendingKeepFixingBtn.style.display = 'none';
    if (pendingRollbackBtn) pendingRollbackBtn.style.display = 'none';
    refreshLiveControlsForManualApply();
  }

  function setPendingApplyLoading(loading, count) {
    if (!pendingPillEl || !pendingPillLabelEl || !pendingPillCountEl || !pendingTrashBtn) return;
    pendingApplyInFlight = loading === true;
    const currentCount = count || parseInt(pendingPillEl.dataset.count || '0', 10) || 0;
    if (pendingApplyInFlight) storeManualApplyState(currentCount);
    else clearStoredManualApplyState();
    if (pendingPillSpinnerEl) pendingPillSpinnerEl.style.display = pendingApplyInFlight ? 'inline-block' : 'none';
    pendingPillLabelEl.textContent = pendingApplyInFlight
      ? manualApplyLoadingText(currentCount)
      : pendingApplyLabel(currentCount);
    pendingPillCountEl.style.display = pendingApplyInFlight ? 'none' : 'inline-flex';
    pendingPillEl.disabled = pendingApplyInFlight;
    pendingPillEl.setAttribute('aria-busy', pendingApplyInFlight ? 'true' : 'false');
    pendingPillEl.style.cursor = pendingApplyInFlight ? 'wait' : 'pointer';
    pendingPillEl.style.filter = pendingApplyInFlight ? 'brightness(0.98)' : 'none';
    pendingPillEl.style.transform = 'scale(1)';
    pendingTrashBtn.disabled = pendingApplyInFlight;
    pendingTrashBtn.style.cursor = pendingApplyInFlight ? 'not-allowed' : 'pointer';
    pendingTrashBtn.style.opacity = pendingApplyInFlight ? '0.58' : '1';
    if (pendingApplyInFlight) {
      if (pendingKeepFixingBtn) pendingKeepFixingBtn.style.display = 'none';
      if (pendingRollbackBtn) pendingRollbackBtn.style.display = 'none';
      pendingTrashBtn.style.display = 'inline-flex';
    }
    schedulePendingDockPosition();
    refreshLiveControlsForManualApply();
  }

  function updatePendingCounter(currentPageCount) {
    if (!pendingDockEl || !pendingPillEl || !pendingPillLabelEl || !pendingPillCountEl || !pendingTrashBtn) return;
    const previousCount = parseInt(pendingPillEl.dataset.count || '0', 10);
    if (!currentPageCount || currentPageCount <= 0) {
      hidePendingApplyDock();
      return;
    }
    pendingPillLabelEl.textContent = pendingApplyLabel(currentPageCount);
    pendingPillCountEl.textContent = String(currentPageCount);
    pendingPillEl.setAttribute('aria-label', 'Apply ' + currentPageCount + ' copy edit' + (currentPageCount === 1 ? '' : 's') + ' to source');
    pendingPillEl.style.display = 'inline-flex';
    pendingTrashBtn.style.display = 'inline-flex';
    pendingDockEl.style.display = 'inline-flex';
    pendingPillEl.dataset.count = String(currentPageCount);
    if (pendingApplyInFlight || shouldResumeManualApplyLoading(currentPageCount)) setPendingApplyLoading(true, currentPageCount);
    schedulePendingDockPosition();
    if (previousCount <= 0) playPendingIntroAnimation();
  }

  function maybeShowFirstSaveToast() {
    if (!firstSaveOfSession) return;
    firstSaveOfSession = false;
    showToast('Saved. Click "Apply copy edits" to write changes.', 4500);
  }

  async function fetchPendingCount() {
    try {
      const res = await fetch(
        'http://localhost:' + PORT + '/manual-edit-stash?token=' + encodeURIComponent(TOKEN) + '&pageUrl=' + encodeURIComponent(location.pathname),
      );
      if (!res.ok) return;
      const data = await res.json();
      updatePendingCounter(data.count || 0);
    } catch (err) {
      console.warn('[tcher] failed to fetch pending count:', err);
    }
  }

  async function onPendingPillClick() {
    const count = parseInt(pendingPillEl?.dataset.count || '0', 10);
    if (count <= 0 || pendingApplyInFlight) return;
    const ok = confirm('Apply ' + count + ' copy edit' + (count === 1 ? '' : 's') + ' to source?');
    if (!ok) return;
    let waitForSseCompletion = false;
    resetManualApplyProgress(count);
    setPendingApplyLoading(true, count);
    try {
      const res = await fetch(
        'http://localhost:' + PORT + '/manual-edit-commit?token=' + encodeURIComponent(TOKEN) + '&pageUrl=' + encodeURIComponent(location.pathname) + '&async=1',
        { method: 'POST', keepalive: true },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || ('HTTP ' + res.status));
      }
      const result = await res.json();
      if (res.status === 202 || result.status === 'started') {
        waitForSseCompletion = true;
        return;
      }
      const remaining = remainingManualEditCount(result);
      updatePendingCounter(remaining);
      if (result.failed && result.failed.length > 0) {
        console.warn('[tcher] some copy edits failed:', result.failed);
        showToast('Applied ' + (result.applied?.length || 0) + ', ' + result.failed.length + ' failed - see console', 5000);
      } else {
        const n = Array.isArray(result.applied) ? result.applied.length : (result.cleared || 0);
        if (n > 0) {
          showToast('Applied ' + n + ' edit' + (n === 1 ? '' : 's'), 2500);
        } else {
          console.warn('[tcher] apply returned no verified edits:', result);
          showToast('No edits applied - see console', 4000);
        }
      }
    } catch (err) {
      console.error('[tcher] commit failed:', err);
      showToast('Apply failed - see console', 4000);
    } finally {
      if (waitForSseCompletion) return;
      const remainingCount = parseInt(pendingPillEl?.dataset.count || '0', 10) || 0;
      if (remainingCount > 0) setPendingApplyLoading(false);
      else hidePendingApplyDock();
    }
  }

  async function onPendingTrashClick() {
    const count = parseInt(pendingPillEl?.dataset.count || '0', 10);
    if (count <= 0 || pendingApplyInFlight) return;
    const ok = confirm('Discard ' + count + ' copy edit' + (count === 1 ? '' : 's') + ' on this page?');
    if (!ok) return;
    try {
      const res = await fetch(
        'http://localhost:' + PORT + '/manual-edit-discard?token=' + encodeURIComponent(TOKEN) + '&pageUrl=' + encodeURIComponent(location.pathname),
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const result = await res.json().catch(() => ({}));
      const restoreFailures = restoreDiscardedManualEdits(result.entries || []);
      updatePendingCounter(0);
      if (restoreFailures > 0) {
        showToast('Discarded ' + count + ' copy edit' + (count === 1 ? '' : 's') + ' - refresh to reset ' + restoreFailures, 4000);
      } else {
        showToast('Discarded ' + count + ' copy edit' + (count === 1 ? '' : 's'), 2500);
      }
    } catch (err) {
      console.error('[tcher] discard failed:', err);
      showToast('Discard failed - see console', 4000);
    }
  }

  function showManualApplyDecision(msg) {
    const count = parseInt(pendingPillEl?.dataset.count || '0', 10) || numberOrNull(msg?.remainingCount) || 0;
    pendingApplyInFlight = false;
    storeManualApplyState(count, {
      phase: 'repair-decision',
      repairAttempt: numberOrNull(msg?.repair?.attempts) || numberOrNull(msg?.repair?.attempt) || 3,
      repairMaxAttempts: numberOrNull(msg?.repair?.maxAttempts) || 3,
    });
    if (pendingPillSpinnerEl) pendingPillSpinnerEl.style.display = 'none';
    if (pendingPillLabelEl) pendingPillLabelEl.textContent = 'Apply needs attention';
    if (pendingPillCountEl) pendingPillCountEl.style.display = 'none';
    if (pendingPillEl) {
      pendingPillEl.disabled = true;
      pendingPillEl.setAttribute('aria-busy', 'false');
      pendingPillEl.style.cursor = 'default';
      pendingPillEl.style.display = 'inline-flex';
    }
    if (pendingTrashBtn) pendingTrashBtn.style.display = 'none';
    if (pendingKeepFixingBtn) pendingKeepFixingBtn.style.display = 'inline-flex';
    if (pendingRollbackBtn) pendingRollbackBtn.style.display = 'inline-flex';
    if (pendingDockEl) pendingDockEl.style.display = 'inline-flex';
    schedulePendingDockPosition();
    refreshLiveControlsForManualApply();
  }

  async function onPendingKeepFixingClick() {
    const count = parseInt(pendingPillEl?.dataset.count || '0', 10) || numberOrNull(readStoredManualApplyState()?.count) || 0;
    if (count <= 0) return;
    updateManualApplyRepairState({ attempt: 1, maxAttempts: 3 }, 'repairing');
    try {
      const res = await fetch(
        'http://localhost:' + PORT + '/manual-edit-commit?token=' + encodeURIComponent(TOKEN) + '&pageUrl=' + encodeURIComponent(location.pathname) + '&async=1&repair=1',
        { method: 'POST', keepalive: true },
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (pendingKeepFixingBtn) pendingKeepFixingBtn.style.display = 'none';
      if (pendingRollbackBtn) pendingRollbackBtn.style.display = 'none';
      if (pendingTrashBtn) pendingTrashBtn.style.display = 'inline-flex';
    } catch (err) {
      console.error('[tcher] repair retry failed:', err);
      showToast('Repair retry failed - see console', 4000);
      showManualApplyDecision({ remainingCount: count, repair: readStoredManualApplyState() });
    }
  }

  async function onPendingRollbackClick() {
    const ok = confirm('Rollback source files to before this Apply and keep the edits staged?');
    if (!ok) return;
    try {
      const res = await fetch(
        'http://localhost:' + PORT + '/manual-edit-repair-decision?token=' + encodeURIComponent(TOKEN) + '&pageUrl=' + encodeURIComponent(location.pathname),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: TOKEN, pageUrl: location.pathname, action: 'rollback' }),
        },
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const result = await res.json().catch(() => ({}));
      clearStoredManualApplyState();
      updatePendingCounter(numberOrNull(result.remainingCount) || 0);
      showToast('Rolled back source; copy edits are still staged.', 3500);
    } catch (err) {
      console.error('[tcher] manual Apply rollback failed:', err);
      showToast('Rollback failed - see console', 4000);
    }
  }

  function manualEditEventForCurrentPage(msg) {
    return !msg?.pageUrl || msg.pageUrl === location.pathname;
  }

  function numberOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function remainingManualEditCount(payload) {
    const perPageCount = numberOrNull(payload?.perPage?.[location.pathname]);
    if (perPageCount !== null) return perPageCount;
    const remainingCount = numberOrNull(payload?.remainingCount);
    if (remainingCount !== null) return remainingCount;
    const totalCount = numberOrNull(payload?.totalCount);
    if (totalCount === 0) return 0;
    return null;
  }

  function handleManualEditActivity(msg) {
    if (!manualEditEventForCurrentPage(msg)) return;

    if (msg.type === 'manual_edit_stashed') {
      const pendingCount = numberOrNull(msg.pendingCount);
      if (pendingCount !== null) updatePendingCounter(pendingCount);
      return;
    }

    if (msg.type === 'manual_edit_commit_started') {
      const pendingCount = numberOrNull(msg.pendingCount);
      if (pendingCount !== null && pendingCount > 0) updatePendingCounter(pendingCount);
      if (!msg.repairOnly && pendingCount !== null && pendingCount > 0) resetManualApplyProgress(pendingCount);
      if (msg.repairOnly) updateManualApplyRepairState({ attempt: 1, maxAttempts: 3 }, 'repairing');
      setPendingApplyLoading(true, pendingCount || undefined);
      return;
    }

    if (msg.type === 'manual_edit_apply_reply_received') {
      if (msg.chunk) updateManualApplyProgressFromChunk(msg.chunk);
      if (msg.repair) updateManualApplyRepairState(msg.repair, 'repairing');
      return;
    }

    if (msg.type === 'manual_edit_apply_dispatched' && msg.repair) {
      updateManualApplyRepairState(msg.repair, 'repairing');
      return;
    }

    if (msg.type === 'manual_edit_repair_needs_decision') {
      showManualApplyDecision(msg);
      return;
    }

    if (msg.type === 'manual_edit_repair_rollback_done') {
      clearStoredManualApplyState();
      fetchPendingCount();
      return;
    }

    if (msg.type === 'manual_edit_commit_done') {
      if (msg.reason === 'manual_edit_repair_needs_decision' || msg.needsManualDecision === true) {
        showManualApplyDecision(msg);
        return;
      }
      // Clear the in-flight flag BEFORE updating the counter. updatePendingCounter
      // re-asserts setPendingApplyLoading(true) whenever the flag is still set and
      // edits remain (failed entries stay staged), which would otherwise leave the
      // picker frozen forever after a partial/failed apply.
      const wasApplying = pendingApplyInFlight;
      setPendingApplyLoading(false);
      const remainingCount = remainingManualEditCount(msg);
      updatePendingCounter(remainingCount === null ? 0 : remainingCount);
      if (wasApplying) {
        const failedCount = numberOrNull(msg.failedCount) || 0;
        const appliedCount = numberOrNull(msg.appliedCount) || numberOrNull(msg.cleared) || 0;
        if (failedCount > 0) {
          showToast('Applied ' + appliedCount + ', ' + failedCount + ' failed - see console', 5000);
        } else if (appliedCount > 0) {
          showToast('Applied ' + appliedCount + ' edit' + (appliedCount === 1 ? '' : 's'), 2500);
        }
      }
      return;
    }

    if (msg.type === 'manual_edit_commit_failed') {
      setPendingApplyLoading(false);
      fetchPendingCount();
      return;
    }

    if (msg.type === 'manual_edit_discarded') {
      fetchPendingCount();
    }
  }

  function restoreDiscardedManualEdits(entries) {
    let failures = 0;
    for (const entry of entries || []) {
      for (const op of entry.ops || []) {
        if (restoreMixedTextNodeManualEdit(op)) continue;
        const el = findManualEditRestoreElement(op);
        if (!el || typeof op.originalText !== 'string' || !canRestoreManualEditElement(el, op)) {
          failures += 1;
          continue;
        }
        el.textContent = op.originalText;
      }
    }
    if (failures > 0) {
      console.warn('[tcher] skipped unsafe copy edit DOM restore for', failures, 'edit(s). Refresh to reset the page DOM.');
    }
    return failures;
  }

  function canRestoreManualEditElement(el, op) {
    if (!el || typeof op?.originalText !== 'string') return false;
    if (el.children && el.children.length > 0) return false;
    return normalizeManualContextText(el.textContent) === normalizeManualContextText(op.newText);
  }

  function mixedTextWrapRestoreHint(el) {
    if (!el || !el.dataset || el.dataset.tcherTextWrap !== 'true' || !el.parentElement) return null;
    const siblings = directMixedTextRestoreNodes(el.parentElement);
    const textIndex = siblings.indexOf(el);
    return {
      kind: 'mixedTextNode',
      parentRef: documentRefForElement(el.parentElement),
      textIndex,
    };
  }

  function restoreMixedTextNodeManualEdit(op) {
    const restore = op?.restore;
    if (!restore || restore.kind !== 'mixedTextNode' || typeof op?.originalText !== 'string') return false;
    const parent = queryManualEditRef(restore.parentRef);
    if (!parent) return false;
    const textNodes = directMixedTextRestoreNodes(parent).filter((node) => node.nodeType === 3);
    const newText = normalizeManualContextText(op.newText);
    const byIndex = textNodes[Number(restore.textIndex)];
    if (byIndex && normalizeManualContextText(byIndex.nodeValue) === newText) {
      byIndex.nodeValue = op.originalText;
      return true;
    }
    const matches = textNodes.filter((node) => normalizeManualContextText(node.nodeValue) === newText);
    if (matches.length !== 1) return false;
    matches[0].nodeValue = op.originalText;
    return true;
  }

  function directMixedTextRestoreNodes(parent) {
    return Array.from(parent?.childNodes || []).filter((node) => {
      if (node.nodeType === 3) return /\S/.test(node.nodeValue || '');
      return node.nodeType === 1
        && node.dataset
        && node.dataset.tcherTextWrap === 'true'
        && /\S/.test(node.textContent || '');
    });
  }

  function findManualEditRestoreElement(op) {
    for (const ref of [op?.ref, op?.leaf?.ref]) {
      const byRef = queryManualEditRef(ref);
      if (byRef) return byRef;
    }
    const tag = op?.tag || op?.leaf?.tagName || '*';
    const classes = Array.isArray(op?.classes) ? op.classes : (Array.isArray(op?.leaf?.classes) ? op.leaf.classes : []);
    const selector = (tag === '*' ? '' : tag) + classes.map((cls) => '.' + cssIdent(cls)).join('') || '*';
    let matches = [];
    try {
      matches = Array.from(document.querySelectorAll(selector));
    } catch {
      matches = [];
    }
    const newText = normalizeManualContextText(op?.newText);
    const filtered = matches.filter((el) => normalizeManualContextText(el.textContent) === newText);
    return filtered.length === 1 ? filtered[0] : null;
  }

  function queryManualEditRef(ref) {
    if (!ref || typeof ref !== 'string') return null;
    const parts = ref.split('>').map((part) => part.trim()).filter(Boolean);
    let current = null;
    for (let index = 0; index < parts.length; index += 1) {
      const segment = parseManualEditRefSegment(parts[index]);
      if (!segment) return null;
      if (index === 0 && segment.tag === 'body') {
        current = document.body;
        if (!elementMatchesManualRefSegment(current, segment)) return null;
        continue;
      }
      const scope = current || document.body;
      const children = Array.from(scope.children || []);
      current = children.find((child) => elementMatchesManualRefSegment(child, segment)) || null;
      if (!current) return null;
    }
    return current;
  }

  function parseManualEditRefSegment(segment) {
    const nthMatch = String(segment || '').match(/:nth-of-type\((\d+)\)$/);
    const nth = nthMatch ? Number(nthMatch[1]) : null;
    const base = nthMatch ? segment.slice(0, nthMatch.index) : segment;
    const tagMatch = base.match(/^[^#.:\s]+/);
    const tag = tagMatch ? tagMatch[0].toLowerCase() : null;
    if (!tag) return null;
    const idMatch = base.match(/#([^#.]+)/);
    const classes = base
      .slice(tag.length)
      .replace(/#[^#.]+/, '')
      .split('.')
      .filter(Boolean);
    return { tag, id: idMatch ? idMatch[1] : null, classes, nth };
  }

  function elementMatchesManualRefSegment(el, segment) {
    if (!el || !segment) return false;
    if (el.tagName.toLowerCase() !== segment.tag) return false;
    if (segment.id && el.id !== segment.id) return false;
    for (const cls of segment.classes) {
      if (!el.classList || !el.classList.contains(cls)) return false;
    }
    if (segment.nth && indexAmongSameTag(el) !== segment.nth) return false;
    return true;
  }

  function cssIdent(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  //
  // Edit content badge - floating button at element top-right to enter EDITING mode
  //

  function usesShadowChromeRoot() {
    const root = liveUiRoot();
    return root && root !== document.body && root.host && root.host.id === PREFIX + '-root';
  }

  function setImportantStyle(el, name, value) {
    el.style.setProperty(name, value, 'important');
  }

  function initEditBadgeHitProxies() {
    if (!usesShadowChromeRoot() || editBadgeProxyRoot) return;
    editBadgeProxyRoot = document.createElement('div');
    editBadgeProxyRoot.id = PREFIX + '-edit-badge-hit-proxies';
    editBadgeProxyRoot.setAttribute('aria-hidden', 'true');
    const styles = {
      all: 'initial',
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      zIndex: String(Z.toast + 1),
      pointerEvents: 'none',
      background: 'transparent',
      overflow: 'visible',
    };
    for (const [name, value] of Object.entries(styles)) {
      setImportantStyle(editBadgeProxyRoot, name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), value);
    }
    document.body.appendChild(editBadgeProxyRoot);
  }

  function styleEditBadgeProxy(proxy, target) {
    const rect = target.getBoundingClientRect();
    const cursor = getComputedStyle(target).cursor || 'pointer';
    const styles = {
      all: 'initial',
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      margin: '0',
      padding: '0',
      border: '0',
      borderRadius: '0',
      background: 'transparent',
      color: 'transparent',
      opacity: '0.001',
      pointerEvents: 'auto',
      cursor,
      zIndex: String(Z.toast + 2),
    };
    for (const [name, value] of Object.entries(styles)) {
      setImportantStyle(proxy, name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), value);
    }
  }

  function proxyMouseEvent(type, source, target) {
    let event;
    try {
      event = new MouseEvent(type, {
        bubbles: type !== 'mouseenter' && type !== 'mouseleave',
        cancelable: true,
        composed: true,
        clientX: source.clientX,
        clientY: source.clientY,
        screenX: source.screenX,
        screenY: source.screenY,
        button: source.button || 0,
        buttons: source.buttons || 0,
        ctrlKey: source.ctrlKey,
        metaKey: source.metaKey,
        shiftKey: source.shiftKey,
        altKey: source.altKey,
      });
      target.dispatchEvent(event);
    } catch {}
  }

  function bindEditBadgeProxy(proxy, target) {
    const stop = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    proxy.addEventListener('mouseenter', (event) => {
      stop(event);
      proxyMouseEvent('mouseenter', event, target);
      proxyMouseEvent('mouseover', event, target);
    });
    proxy.addEventListener('mouseleave', (event) => {
      stop(event);
      proxyMouseEvent('mouseleave', event, target);
      proxyMouseEvent('mouseout', event, target);
    });
    proxy.addEventListener('mousedown', (event) => {
      stop(event);
      target.focus?.({ preventScroll: true });
      proxyMouseEvent('mousedown', event, target);
    });
    proxy.addEventListener('mouseup', (event) => {
      stop(event);
      proxyMouseEvent('mouseup', event, target);
    });
    proxy.addEventListener('click', (event) => {
      stop(event);
      target.click();
      syncEditBadgeHitProxies();
    });
  }

  function editBadgeProxyTargets() {
    if (!usesShadowChromeRoot() || !editBadgeEl || editBadgeEl.style.display === 'none') return [];
    return [...editBadgeEl.querySelectorAll('button')].filter((target) => {
      if (target.disabled) return false;
      const rect = target.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      const style = getComputedStyle(target);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function syncEditBadgeHitProxies() {
    if (!usesShadowChromeRoot()) {
      if (editBadgeProxyRoot) editBadgeProxyRoot.remove();
      editBadgeProxyRoot = null;
      editBadgeProxyByTarget = new Map();
      return;
    }
    initEditBadgeHitProxies();
    if (!editBadgeProxyRoot) return;
    const targets = editBadgeProxyTargets();
    const active = new Set(targets);
    for (const [target, proxy] of editBadgeProxyByTarget) {
      if (!active.has(target) || !target.isConnected) {
        proxy.remove();
        editBadgeProxyByTarget.delete(target);
      }
    }
    for (const target of targets) {
      let proxy = editBadgeProxyByTarget.get(target);
      if (!proxy) {
        proxy = document.createElement('button');
        proxy.type = 'button';
        proxy.tabIndex = -1;
        proxy.dataset.tcherEditBadgeProxy = 'true';
        proxy.setAttribute('aria-hidden', 'true');
        bindEditBadgeProxy(proxy, target);
        editBadgeProxyRoot.appendChild(proxy);
        editBadgeProxyByTarget.set(target, proxy);
      }
      proxy.title = target.title || target.textContent || 'Edit copy';
      styleEditBadgeProxy(proxy, target);
    }
  }

  function initEditBadge() {
    editBadgeEl = document.createElement('div');
    editBadgeEl.id = PREFIX + '-edit-badge';
    Object.assign(editBadgeEl.style, {
      position: 'fixed',
      zIndex: String(Z.highlight + 1),
      cursor: 'default',
      display: 'none',
      userSelect: 'none',
    });
    uiAppend(editBadgeEl);
    initEditBadgeHitProxies();

    // Remove focus rings on edit badge buttons + contenteditable elements
    if (!uiGetById(PREFIX + '-edit-badge-focus-style')) {
      const s = document.createElement('style');
      s.id = PREFIX + '-edit-badge-focus-style';
      s.textContent =
        '#' + PREFIX + '-edit-badge button { outline: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important; }' +
        '#' + PREFIX + '-edit-badge button:focus { outline: none !important; }' +
        '#' + PREFIX + '-edit-badge button:focus-visible { outline: none !important; }' +
        '[data-tcher-editable="true"] { outline: none !important; box-shadow: none !important; }' +
        '[data-tcher-editable="true"]:focus { outline: none !important; box-shadow: none !important; }' +
        '[data-tcher-editable="true"]:focus-visible { outline: none !important; box-shadow: none !important; }';
      uiAppendStyle(s);
    }
  }

  function positionEditBadge() {
    if (!selectedElement || !editBadgeEl || editBadgeEl.style.display === 'none') {
      syncEditBadgeHitProxies();
      return;
    }
    const r = selectedElement.getBoundingClientRect();
    const bw = editBadgeEl.offsetWidth;
    editBadgeEl.style.top = Math.max(4, r.top - 28) + 'px';
    editBadgeEl.style.left = Math.min(window.innerWidth - bw - 4, r.right - bw) + 'px';
    syncEditBadgeHitProxies();
  }

  function renderEditBadge(mode) {
    if (mode === 'hidden' || !editBadgeEl) {
      if (editBadgeEl) editBadgeEl.style.display = 'none';
      syncEditBadgeHitProxies();
      return;
    }
    editBadgeEl.style.display = 'flex';
    editBadgeEl.style.alignItems = 'center';
    editBadgeEl.style.cursor = 'default';
    const P = BP || barPaletteForTheme(detectPageTheme());
    const ACCENT = P.accent;
    const PRIMARY_TEXT = C.ink;
    const SURFACE = P.chatSurface;
    const MUTED = P.textDim;
    const HAIRLINE = P.hairline;
    const calloutStyle = (color, borderColor) => ({
      fontFamily: FONT,
      fontSize: '10px',
      fontWeight: '600',
      lineHeight: '16px',
      letterSpacing: '0.06em',
      color: color,
      background: SURFACE,
      padding: '2px 8px',
      border: '1px solid ' + (borderColor || color),
      borderRadius: '6px',
      boxSizing: 'border-box',
      minHeight: '22px',
      margin: '0',
      appearance: 'none',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px oklch(0% 0 0 / 0.16), 0 1px 3px oklch(0% 0 0 / 0.08)',
      cursor: 'pointer',
      transition: 'background 0.18s ease, color 0.18s ease, border-color 0.18s ease, filter 0.18s ease',
    });
    if (mode === 'idle' || mode === 'idle-disabled') {
      const disabled = mode === 'idle-disabled';
      editBadgeEl.innerHTML = '';
      const btn = document.createElement('button');
      btn.textContent = 'Edit copy';
      Object.assign(btn.style, calloutStyle(disabled ? MUTED : ACCENT, disabled ? HAIRLINE : ACCENT));
      if (disabled) {
        btn.style.cursor = 'not-allowed';
        btn.style.opacity = '0.55';
        btn.disabled = true;
        btn.title = 'Edit copy is disabled while the current copy edit is applying';
      } else {
        btn.addEventListener('mouseenter', () => { btn.style.background = ACCENT; btn.style.color = PRIMARY_TEXT; });
        btn.addEventListener('mouseleave', () => { btn.style.background = SURFACE; btn.style.color = ACCENT; });
        btn.onclick = enterEditingMode;
      }
      editBadgeEl.appendChild(btn);
    } else {
      // 'editing' - show Cancel + Save separated
      editBadgeEl.innerHTML = '';
      editBadgeEl.style.gap = '8px';
      const cancel = document.createElement('button');
      cancel.textContent = 'Cancel';
      Object.assign(cancel.style, calloutStyle(MUTED, HAIRLINE));
      cancel.addEventListener('mouseenter', () => { cancel.style.color = P.text; });
      cancel.addEventListener('mouseleave', () => { cancel.style.color = P.textDim; });
      cancel.onclick = cancelEditing;
      const save = document.createElement('button');
      save.textContent = 'Save';
      Object.assign(save.style, calloutStyle(ACCENT));
      save.addEventListener('mouseenter', () => { save.style.background = ACCENT; save.style.color = PRIMARY_TEXT; });
      save.addEventListener('mouseleave', () => { save.style.background = SURFACE; save.style.color = ACCENT; });
      save.onclick = applyEditing;
      editBadgeEl.append(cancel, save);
    }
    positionEditBadge();
  }

  // Decide which way the popover opens: away from the picked element. If the
  // bar landed below the element, popover slides DOWN from the bar's bottom.
  // If the bar landed above, popover slides UP from the bar's top.
  function popoverDirection() {
    if (!barEl || !selectedElement) return 'below';
    const br = barEl.getBoundingClientRect();
    const er = selectedElement.getBoundingClientRect();
    return br.top >= er.bottom - 4 ? 'below' : 'above';
  }

  // The popover overlaps the bar by OVERLAP px on the bar-facing side. With
  // popover z-index below bar, that overlap sits behind bar (invisible) and
  // reinforces the "tucked behind" feel. Padding compensates so the real
  // content starts flush with bar's outer edge.
  const TUNE_OVERLAP = 6;

  // Closed clip-path depends on direction: for 'below' clip from the far
  // (bottom) edge so the reveal grows downward from the bar; for 'above'
  // clip from the top edge so the reveal grows upward from the bar.
  function closedClipPath(direction) {
    return direction === 'below' ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)';
  }

  function setClipPath(value, withTransition) {
    const saved = paramsPanelEl.style.transition;
    if (!withTransition) paramsPanelEl.style.transition = 'none';
    paramsPanelEl.style.clipPath = value;
    if (!withTransition) {
      void paramsPanelEl.offsetHeight;
      paramsPanelEl.style.transition = saved;
    }
  }

  function positionParamsPanel() {
    if (!paramsPanelEl || !barEl || barEl.style.display === 'none') return;
    const br = barEl.getBoundingClientRect();
    const direction = popoverDirection();
    const prevDirection = paramsPanelEl.dataset.tuneDirection;

    // top/left/width are NOT in the transition list, so they snap instantly.
    paramsPanelEl.style.left = br.left + 'px';
    paramsPanelEl.style.width = br.width + 'px';

    if (direction === 'below') {
      paramsPanelEl.style.top = (br.bottom - TUNE_OVERLAP) + 'px';
      paramsPanelEl.style.borderRadius = '0 0 10px 10px';
      paramsPanelEl.style.paddingTop = (14 + TUNE_OVERLAP) + 'px';
      paramsPanelEl.style.paddingBottom = '14px';
    } else {
      const ih = paramsPanelEl.offsetHeight || 80;
      paramsPanelEl.style.top = (br.top - ih + TUNE_OVERLAP) + 'px';
      paramsPanelEl.style.borderRadius = '10px 10px 0 0';
      paramsPanelEl.style.paddingTop = '14px';
      paramsPanelEl.style.paddingBottom = (14 + TUNE_OVERLAP) + 'px';
    }
    paramsPanelEl.dataset.tuneDirection = direction;

    // If currently closed and direction flipped (or first-time setup),
    // snap the clip-path to the new direction's closed pose without
    // transitioning (so the clip doesn't slide across the element).
    if (!tuneOpen && (!prevDirection || prevDirection !== direction)) {
      setClipPath(closedClipPath(direction), false);
    }
  }

  function showParamsPanel() {
    if (!paramsPanelEl) return;
    positionParamsPanel();
    paramsPanelEl.style.pointerEvents = 'auto';
    // rAF so the positioning paint commits before the transition fires.
    requestAnimationFrame(() => {
      setClipPath('inset(0 0 0 0)', true);
    });
  }

  function hideParamsPanel() {
    if (!paramsPanelEl) return;
    paramsPanelEl.style.pointerEvents = 'none';
    const direction = paramsPanelEl.dataset.tuneDirection || 'below';
    setClipPath(closedClipPath(direction), true);
  }

  // Build/rebuild the panel's contents for the current variant AND apply
  // its defaults to the variant wrapper (so scoped CSS responds even before
  // the user opens the popover). Visibility is governed by tuneOpen.
  function refreshParamsPanel() {
    if (state !== 'CYCLING') {
      paramsCurrentValues = {};
      tuneOpen = false;
      hideParamsPanel();
      return;
    }
    const variantEl = getVisibleVariantEl();
    const params = parseVariantParams(variantEl);
    if (!variantEl || params.length === 0) {
      paramsCurrentValues = {};
      tuneOpen = false;
      hideParamsPanel();
      return;
    }
    applyParamDefaults(variantEl, params);
    buildParamsPanel(variantEl, params);
    if (tuneOpen) {
      // If already visible (variant cycled while open), refresh in place
      // instead of re-running the clip-path animation.
      const alreadyVisible = paramsPanelEl.style.display === 'block'
        && paramsPanelEl.style.opacity === '1';
      if (alreadyVisible) positionParamsPanel();
      else showParamsPanel();
    } else {
      hideParamsPanel();
    }
  }

  function toggleTunePopover() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    if (tuneOpen) { closeTunePopover(); return; }
    openTunePopover();
  }

  function openTunePopover() {
    if (state !== 'CYCLING') return;
    const variantEl = getVisibleVariantEl();
    const params = parseVariantParams(variantEl);
    if (!variantEl || params.length === 0) return;
    // Build fresh to ensure the current variant's controls are shown.
    applyParamDefaults(variantEl, params);
    buildParamsPanel(variantEl, params);
    tuneOpen = true;
    showParamsPanel();
    // Kill the bar's shadow on the popover-facing side so the dark popover
    // doesn't pick up a bright glow line.
    if (barEl) {
      const direction = paramsPanelEl?.dataset.tuneDirection || 'below';
      barEl.style.boxShadow = direction === 'below' ? BAR_SHADOW_UP : BAR_SHADOW_DOWN;
    }
    // Re-render the bar so the Tune chip picks up the active styling.
    showOrUpdateCyclingBar();
  }

  function closeTunePopover() {
    tuneOpen = false;
    hideParamsPanel();
    if (barEl) barEl.style.boxShadow = BAR_SHADOW_DEFAULT;
    if (barEl && barEl.style.display !== 'none' && state === 'CYCLING') {
      showOrUpdateCyclingBar();
    }
  }

  //
  // Variant cycling in DOM
  //

  function isVariantShown(el) {
    if (!el) return false;
    if (el.hidden) return false;
    if (el.style?.display === 'none') return false;
    return true;
  }

  function setVariantShown(el, shown) {
    if (!el) return;
    if (shown) {
      el.removeAttribute('hidden');
      el.style.display = '';
    } else {
      el.setAttribute('hidden', '');
      el.style.display = 'none';
    }
  }

  function scheduleCyclingBarSync(sessionId, variantNum) {
    requestAnimationFrame(() => {
      if (state !== 'CYCLING') return;
      if (currentSessionId !== sessionId) return;
      if (visibleVariant !== variantNum) return;
      showOrUpdateCyclingBar();
      syncCyclingControls();
      positionBar();
    });
  }

  function syncCyclingControls() {
    const shown = svelteComponentSession?.sessionId === currentSessionId && svelteComponentSession.mountedVariant > 0
      ? svelteComponentSession.mountedVariant
      : visibleVariant;
    const counter = uiGetById(PREFIX + '-variant-counter');
    if (counter && arrivedVariants > 0) counter.textContent = shown + '/' + arrivedVariants;
    const prev = uiGetById(PREFIX + '-variant-prev');
    const next = uiGetById(PREFIX + '-variant-next');
    if (prev) prev.style.opacity = shown <= 1 ? '0.3' : '1';
    if (next) next.style.opacity = shown >= arrivedVariants ? '0.3' : '1';
    if (currentSessionId && state === 'CYCLING') saveSession();
  }

  async function showVariantInDOM(sessionId, num) {
    if (svelteComponentSession?.sessionId === sessionId) {
      visibleVariant = num;
      const mounted = await mountSvelteComponentVariant(num);
      if (!mounted) return false;
      updateSelectedElement();
      refreshParamsPanel();
      scheduleCyclingBarSync(sessionId, num);
      return true;
    }
    const wrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
    if (!wrapper) return false;
    for (const child of wrapper.children) {
      const v = child.dataset ? child.dataset.tcherVariant : null;
      if (!v) continue;
      setVariantShown(child, v === String(num));
    }
    // Unconditional refresh - covers first-reveal (no-op if state isn't
    // CYCLING yet, the subsequent CYCLING transition triggers its own
    // refresh) and every cycle step.
    refreshParamsPanel();
    return true;
  }

  function isSvelteComponentManifestPath(filePath) {
    return String(filePath || '').endsWith('manifest.json');
  }

  function parseOriginalMarkupElement(originalMarkup) {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div id="tcher-anchor">' + originalMarkup + '</div>', 'text/html');
    return doc.getElementById('tcher-anchor')?.firstElementChild || null;
  }

  function findLiveElementForOriginalMarkup(originalMarkup) {
    const origContent = parseOriginalMarkupElement(originalMarkup);
    if (!origContent) return null;

    const tag = origContent.tagName.toLowerCase();
    const cls = origContent.className;
    let liveEl = null;
    if (origContent.id) {
      liveEl = document.getElementById(origContent.id);
    } else if (cls) {
      const candidates = document.querySelectorAll(tag + '.' + cls.split(' ')[0]);
      for (const c of candidates) {
        if (c.className === cls && !own(c)) { liveEl = c; break; }
      }
      if (!liveEl) {
        const expectedClasses = String(cls).split(/\s+/).filter(Boolean);
        for (const c of candidates) {
          if (own(c)) continue;
          if (expectedClasses.every((name) => c.classList.contains(name))) { liveEl = c; break; }
        }
      }
    }
    return liveEl;
  }

  function isSvelteInsertManifest(manifest) {
    return manifest?.previewMode === 'svelte-component' && manifest?.mode === 'insert';
  }

  function findLiveElementForSvelteManifest(manifest) {
    if (isSvelteInsertManifest(manifest)) {
      const anchor = findInsertAnchorInDom();
      if (anchor?.parentElement) return anchor;
    }
    return findLiveElementForOriginalMarkup(manifest?.originalMarkup || manifest?.anchorMarkup || '');
  }

  function loadSvelteRuntime(runtimeModule) {
    const modulePath = runtimeModule || '/src/lib/tcher/__runtime.js';
    const url = new URL(modulePath, location.origin).href;
    if (!svelteRuntimePromise) {
      svelteRuntimePromise = import(/* @vite-ignore */ url);
    }
    return svelteRuntimePromise;
  }

  // Svelte component variants declare their params in a sidecar params.json under
  // componentDir (keyed by variant number), because a `data-tcher-params`
  // attribute with JSON braces can't survive the Svelte compiler. Returns a map of
  // { "1": [...params], "2": [...] }; an empty object when the agent declared none.
  async function loadSvelteComponentParams(manifest) {
    const dir = String(manifest?.componentDir || '').replace(/^\/+/, '');
    if (!dir) return {};
    const paramsPath = dir + '/params.json';
    const url = 'http://localhost:' + PORT + '/source?token=' + TOKEN + '&path=' + encodeURIComponent(paramsPath);
    try {
      const res = await fetch(url);
      if (!res.ok) return {};
      const parsed = JSON.parse(await res.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const out = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) out[String(key)] = value;
      }
      return out;
    } catch {
      return {};
    }
  }

  function buildSveltePropValuesFromLiveElement(liveEl, manifest) {
    const contract = manifest?.propContract || [];
    const values = {};
    if (!liveEl || contract.length === 0) return values;
    const sourceOriginal = parseOriginalMarkupElement(manifest.originalMarkup || '');
    if (!sourceOriginal) return values;
    const map = buildSvelteExpressionTextMap(sourceOriginal, liveEl);
    for (const entry of contract) {
      const token = '{' + entry.expr + '}';
      values[entry.prop] = map.get(token) || '';
    }
    return values;
  }

  async function mountSvelteComponentVariant(variantNum) {
    if (!svelteComponentSession || !variantNum) return false;
    const { manifest, mountTargetEl, sessionId } = svelteComponentSession;
    try {
      const previousAnchor = getMountedSvelteComponentAnchor(svelteComponentSession) || selectedElement;
      svelteComponentSession.swapAnchor = makeFrozenAnchor(previousAnchor) || svelteComponentSession.swapAnchor || null;
      const runtime = await loadSvelteRuntime(manifest.runtimeModule);
      const modulePath = '/' + String(manifest.componentDir || '').replace(/^\/+/, '') + '/v' + variantNum + '.svelte';
      const moduleUrl = new URL(modulePath, location.origin).href + '?t=' + Date.now();
      const mod = await import(/* @vite-ignore */ moduleUrl);
      const Component = mod.default;
      if (svelteComponentSession.mountedInstance && runtime.unmount) {
        await runtime.unmount(svelteComponentSession.mountedInstance);
        svelteComponentSession.mountedInstance = null;
      }
      svelteComponentSession.mountedInstance = runtime.mount(Component, {
        target: mountTargetEl,
        props: { ...svelteComponentSession.propValues },
        intro: false,
      });
      svelteComponentSession.mountedVariant = variantNum;
      svelteComponentSession.runtime = runtime;
      if (state === 'CYCLING') syncCyclingControls();
      const nextAnchor = getMountedSvelteComponentAnchor(svelteComponentSession);
      if (nextAnchor) {
        if (!isSvelteInsertManifest(manifest)) {
          applyOriginalAttrsToSvelteAnchor(nextAnchor, manifest.originalMarkup || '');
        }
        svelteComponentSession.swapAnchor = null;
        selectedElement = nextAnchor;
      } else {
        requestAnimationFrame(() => {
          if (svelteComponentSession?.sessionId !== sessionId) return;
          const settledAnchor = getMountedSvelteComponentAnchor(svelteComponentSession);
          if (!settledAnchor) return;
          if (!isSvelteInsertManifest(manifest)) {
            applyOriginalAttrsToSvelteAnchor(settledAnchor, manifest.originalMarkup || '');
          }
          svelteComponentSession.swapAnchor = null;
          selectedElement = settledAnchor;
        });
      }
      return true;
    } catch (err) {
      if (svelteComponentSession?.sessionId === sessionId) {
        svelteComponentSession.swapAnchor = null;
      }
      console.error('[tcher] Failed to mount Svelte variant ' + variantNum + ' for ' + sessionId + ':', err);
      return false;
    }
  }

  function teardownSvelteComponentSession(restoreOriginal) {
    if (!svelteComponentSession) return;
    const { wrapperEl, detachedOriginal, runtime, mountedInstance } = svelteComponentSession;
    if (mountedInstance && runtime?.unmount) {
      try { runtime.unmount(mountedInstance); } catch { /* non-fatal */ }
    }
    if (restoreOriginal && detachedOriginal && wrapperEl?.parentElement) {
      wrapperEl.parentElement.replaceChild(detachedOriginal, wrapperEl);
    } else if (wrapperEl?.parentElement) {
      wrapperEl.remove();
    }
    svelteComponentSession = null;
    svelteRuntimePromise = null;
  }

  function applyOriginalAttrsToSvelteAnchor(el, originalMarkup) {
    if (!el || !originalMarkup) return;
    const original = parseOriginalMarkupElement(originalMarkup);
    if (!original || original.tagName !== el.tagName) return;
    for (const attr of original.attributes) {
      if (attr.name === 'class') {
        for (const className of attr.value.split(/\s+/).filter(Boolean)) {
          el.classList.add(className);
        }
      } else if (!el.hasAttribute(attr.name)) {
        el.setAttribute(attr.name, attr.value);
      }
    }
  }

  function commitAcceptedSvelteComponentToDom(sessionId) {
    if (!svelteComponentSession || svelteComponentSession.sessionId !== sessionId) return false;
    const { wrapperEl, runtime, mountedInstance, manifest } = svelteComponentSession;
    const anchor = getMountedSvelteComponentAnchor(svelteComponentSession);
    if (!anchor || !wrapperEl?.parentElement) return false;
    const committed = anchor.cloneNode(true);
    if (!isSvelteInsertManifest(manifest)) {
      applyOriginalAttrsToSvelteAnchor(committed, manifest.originalMarkup || '');
    }
    if (mountedInstance && runtime?.unmount) {
      try { runtime.unmount(mountedInstance); } catch { /* non-fatal */ }
    }
    wrapperEl.parentElement.replaceChild(committed, wrapperEl);
    svelteComponentSession = null;
    svelteRuntimePromise = null;
    selectedElement = committed;
    return true;
  }

  async function injectSvelteComponentsFromManifest(manifestPath, sessionId) {
    const url = 'http://localhost:' + PORT + '/source?token=' + TOKEN + '&path=' + encodeURIComponent(manifestPath);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const manifest = JSON.parse(await res.text());
      if (manifest.id !== sessionId) return;

      const paramsByVariant = await loadSvelteComponentParams(manifest);
      currentSessionId = sessionId;
      expectedVariants = Number(manifest.count) || expectedVariants || 1;
      rememberSessionFileMeta({
        sourceFile: manifest.sourceFile,
        previewFile: manifestPath,
        previewMode: 'svelte-component',
      });
      if (state !== 'CYCLING') state = 'GENERATING';

      const existingWrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
      if (existingWrapper && svelteComponentSession?.sessionId === sessionId) {
        recoveryWaitingForAnchor = false;
        svelteComponentSession.paramsByVariant = paramsByVariant;
        arrivedVariants = Number(manifest.count) || expectedVariants || 1;
        expectedVariants = arrivedVariants;
        visibleVariant = visibleVariant > 0 && visibleVariant <= arrivedVariants ? visibleVariant : 1;
        await mountSvelteComponentVariant(visibleVariant || 1);
        state = 'CYCLING';
        showOrUpdateCyclingBar();
        saveSession();
        return;
      }

      const liveEl = findLiveElementForSvelteManifest(manifest);
      if (!liveEl?.parentElement) {
        console.warn('[tcher] Could not find original element in live DOM.');
        arrivedVariants = Number(manifest.count) || expectedVariants || 1;
        expectedVariants = arrivedVariants;
        const saved = loadSession();
        const savedVisibleVariant = saved && saved.id === sessionId ? saved.visible : 0;
        visibleVariant = visibleVariant > 0 && visibleVariant <= arrivedVariants
          ? visibleVariant
          : (savedVisibleVariant > 0 && savedVisibleVariant <= arrivedVariants ? savedVisibleVariant : 1);
        selectedElement = document.body;
        state = 'GENERATING';
        recoveryWaitingForAnchor = true;
        showBar('generating');
        startScrollTracking();
        saveSession();
        queueCheckpoint('svelte_component_anchor_missing');
        waitForSvelteComponentTargetAndRetry({ manifestPath, sessionId, manifest });
        showToast('Variants ready. Reveal the selected element to resume.', 15000);
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.dataset.tcherVariants = sessionId;
      wrapper.dataset.tcherVariantCount = String(manifest.count || expectedVariants || 1);
      wrapper.dataset.tcherPreview = 'svelte-component';
      wrapper.style.display = 'contents';

      const mountTarget = document.createElement('div');
      mountTarget.dataset.tcherComponentMount = sessionId;
      mountTarget.style.display = 'contents';
      wrapper.appendChild(mountTarget);

      const insertMode = isSvelteInsertManifest(manifest);
      const detachedOriginal = insertMode ? null : liveEl;
      if (insertMode) {
        removeInsertPlaceholderDom();
        if (manifest.position === 'before') liveEl.parentElement.insertBefore(wrapper, liveEl);
        else liveEl.parentElement.insertBefore(wrapper, liveEl.nextSibling);
      } else {
        liveEl.parentElement.replaceChild(wrapper, liveEl);
      }

      svelteComponentSession = {
        sessionId,
        manifest,
        insertMode,
        wrapperEl: wrapper,
        mountTargetEl: mountTarget,
        detachedOriginal,
        mountedInstance: null,
        mountedVariant: 0,
        runtime: null,
        propValues: buildSveltePropValuesFromLiveElement(detachedOriginal, manifest),
        paramsByVariant,
      };
      if (pendingSvelteComponentRetryObserver) {
        pendingSvelteComponentRetryObserver.disconnect();
        pendingSvelteComponentRetryObserver = null;
      }
      recoveryWaitingForAnchor = false;

      const previousVisibleVariant = currentSessionId === sessionId ? visibleVariant : 0;
      arrivedVariants = Number(manifest.count) || expectedVariants || 1;
      expectedVariants = arrivedVariants;
      const saved = loadSession();
      const savedVisibleVariant = saved && saved.id === sessionId ? saved.visible : 0;
      visibleVariant = previousVisibleVariant > 0 && previousVisibleVariant <= arrivedVariants
        ? previousVisibleVariant
        : (savedVisibleVariant > 0 && savedVisibleVariant <= arrivedVariants ? savedVisibleVariant : 1);

      const mounted = await mountSvelteComponentVariant(visibleVariant);
      if (!mounted) {
        // The compiled component threw (e.g. a Svelte compile error in the
        // variant file). Don't strand the bar in an empty CYCLING state; restore
        // the original element and reset to PICKING so the user can retry.
        abortSvelteComponentInjection(sessionId, 'A variant failed to compile. Fix the component and re-run.');
        return;
      }

      selectedElement = mountTarget.firstElementChild || mountTarget;
      state = 'CYCLING';
      recoveryWaitingForAnchor = false;
      hideShaderOverlay();
      showOrUpdateCyclingBar();
      disableInlineEdit();
      refreshParamsPanel();
      positionBar();
      saveSession();
      console.log('[tcher] Mounted ' + arrivedVariants + ' Svelte component variants.');
    } catch (err) {
      console.error('[tcher] Failed to mount Svelte component variants:', err);
      abortSvelteComponentInjection(sessionId, 'Could not load variants. Fix the error and re-run.');
    }
  }

  function waitForSvelteComponentTargetAndRetry({ manifestPath, sessionId, manifest }) {
    if (pendingSvelteComponentRetryObserver) pendingSvelteComponentRetryObserver.disconnect();
    pendingSvelteComponentRetryObserver = new MutationObserver(() => {
      if (svelteComponentSession?.sessionId === sessionId) {
        pendingSvelteComponentRetryObserver.disconnect();
        pendingSvelteComponentRetryObserver = null;
        return;
      }
      const liveEl = findLiveElementForSvelteManifest(manifest);
      if (!liveEl?.parentElement) return;
      pendingSvelteComponentRetryObserver.disconnect();
      pendingSvelteComponentRetryObserver = null;
      injectSvelteComponentsFromManifest(manifestPath, sessionId);
    });
    pendingSvelteComponentRetryObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Reset cleanly when a Svelte component session can't mount: tear the wrapper
  // down (restoring the original element), clear persisted session state, and
  // return the bar to PICKING. Avoids the stuck 0/0 CYCLING bar.
  function abortSvelteComponentInjection(sessionId, message) {
    try {
      if (svelteComponentSession?.sessionId === sessionId) {
        teardownSvelteComponentSession(true);
      } else {
        const orphan = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
        if (orphan) orphan.remove();
      }
    } catch (err) {
      console.warn('[tcher] Svelte component abort cleanup failed:', err);
    }
    hideShaderOverlay();
    if (variantObserver) { variantObserver.disconnect(); variantObserver = null; }
    if (pendingSvelteComponentRetryObserver) { pendingSvelteComponentRetryObserver.disconnect(); pendingSvelteComponentRetryObserver = null; }
    stopScrollLock();
    clearSession();
    clearHandled();
    resetSessionFileMeta();
    currentSessionId = null;
    expectedVariants = 0;
    arrivedVariants = 0;
    visibleVariant = 0;
    selectedElement = null;
    state = 'PICKING';
    hideBar();
    if (message) showToast(message, 5000);
  }

  /**
   * No-HMR fallback: fetch the raw source file from the live server,
   * parse it, extract the variant wrapper, and inject it into the live DOM.
   * This works even when the dev server caches HTML (Bun, static servers).
   */
  function injectVariantsFromSource(filePath, sessionId) {
    if (isSvelteComponentManifestPath(filePath)) {
      injectSvelteComponentsFromManifest(filePath, sessionId);
      return;
    }
    rememberSessionFileMeta({ file: filePath });
    const url = 'http://localhost:' + PORT + '/source?token=' + TOKEN + '&path=' + encodeURIComponent(filePath);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(html => {
        const parser = new DOMParser();
        let srcWrapper = null;

        // Full-file parse works for HTML/JSX; Astro/Vue sources need marker extraction.
        const startMark = '<!-- tcher-variants-start ' + sessionId + ' -->';
        const endMark = '<!-- tcher-variants-end ' + sessionId + ' -->';
        const startIdx = html.indexOf(startMark);
        const endIdx = html.indexOf(endMark);
        const block = startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
          ? html.slice(startIdx + startMark.length, endIdx).trim()
          : html;
        const doc = parser.parseFromString(block, 'text/html');
        srcWrapper = doc.querySelector('[data-tcher-variants="' + sessionId + '"]');
        if (!srcWrapper) {
          console.warn('[tcher] Variant wrapper not found in source file.');
          return;
        }

        const previousVisibleVariant = currentSessionId === sessionId ? visibleVariant : 0;
        const wrapper = srcWrapper.cloneNode(true);

        // Wrapper already in DOM (wrap HMR landed, variant insert did not).
        const existingWrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
        if (existingWrapper) {
          existingWrapper.parentElement.replaceChild(wrapper, existingWrapper);
        } else {
          const origContent = srcWrapper.querySelector('[data-tcher-variant="original"] > :first-child');
          if (!origContent) return;

          const liveEl = findLiveElementForOriginalMarkup(origContent.outerHTML);
          if (!liveEl) {
            console.warn('[tcher] Could not find original element in live DOM.');
            selectedElement = document.body;
            recoveryWaitingForAnchor = true;
            state = 'GENERATING';
            showBar('generating');
            saveSession();
            showToast('Variants ready. Reveal the selected element to resume.', 15000);
            return;
          }

          liveEl.parentElement.replaceChild(wrapper, liveEl);
        }
        recoveryWaitingForAnchor = false;

        // Update state: count variants, preserving the user's current variant
        // when a late HMR/source reinjection lands after they have cycled.
        const variants = wrapper.querySelectorAll('[data-tcher-variant]:not([data-tcher-variant="original"])');
        arrivedVariants = variants.length;
        expectedVariants = parseInt(wrapper.dataset.tcherVariantCount || arrivedVariants);
        if (arrivedVariants <= 0) {
          recoverEmptyCycling('source-fallback-empty');
          return;
        }
        const saved = loadSession();
        const savedVisibleVariant = saved && saved.id === sessionId ? saved.visible : 0;
        visibleVariant = previousVisibleVariant > 0 && previousVisibleVariant <= arrivedVariants
          ? previousVisibleVariant
          : (savedVisibleVariant > 0 && savedVisibleVariant <= arrivedVariants ? savedVisibleVariant : 1);
        showVariantInDOM(sessionId, visibleVariant);

        // Update selectedElement to the visible variant's content
        selectedElement = pickVariantContent(wrapper, visibleVariant) || wrapper.parentElement;

        state = 'CYCLING';
        recoveryWaitingForAnchor = false;
        hideShaderOverlay();
        showOrUpdateCyclingBar();
        disableInlineEdit();
        refreshParamsPanel();
        positionBar();
        saveSession();
        console.log('[tcher] Injected ' + arrivedVariants + ' variants from source file.');
      })
      .catch(err => {
        console.error('[tcher] Failed to fetch source:', err);
        showToast('Could not load variants. Try refreshing the page.', 5000);
      });
  }

  function buildSvelteExpressionTextMap(sourceOriginal, liveOriginal) {
    const map = new Map();
    if (!sourceOriginal || !liveOriginal) return map;

    const sourceNodes = collectTextNodes(sourceOriginal)
      .filter((node) => /\{[^{}]+\}/.test(node.nodeValue || ''));
    const liveTexts = collectTextNodes(liveOriginal)
      .map((node) => normalizePreviewText(node.nodeValue || ''))
      .filter(Boolean);
    let liveIndex = 0;

    for (const sourceNode of sourceNodes) {
      const sourceText = sourceNode.nodeValue || '';
      const tokens = sourceText.match(/\{[^{}]+\}/g) || [];
      if (tokens.length === 0) continue;

      const liveText = liveTexts[liveIndex++] || '';
      if (!liveText) continue;

      if (tokens.length === 1) {
        const token = tokens[0];
        const normalizedSource = normalizePreviewText(sourceText);
        if (normalizedSource === token) {
          map.set(token, liveText);
          continue;
        }

        const match = liveText.match(expressionTextMatcher(sourceText, [token]));
        if (match && match[1]) map.set(token, match[1].trim());
        continue;
      }

      if (normalizePreviewText(sourceText) === tokens.join(' ')) {
        for (const token of tokens) {
          const tokenLiveText = liveTexts[liveIndex - 1] || '';
          if (tokenLiveText) map.set(token, tokenLiveText);
        }
      }
    }

    return map;
  }

  function expressionTextMatcher(sourceText, tokens) {
    let pattern = '^';
    let cursor = 0;
    for (const token of tokens) {
      const index = sourceText.indexOf(token, cursor);
      if (index === -1) continue;
      pattern += escapeRegExp(sourceText.slice(cursor, index)).replace(/\s+/g, '\\s*');
      pattern += '(.*?)';
      cursor = index + token.length;
    }
    pattern += escapeRegExp(sourceText.slice(cursor)).replace(/\s+/g, '\\s*') + '$';
    return new RegExp(pattern);
  }

  function collectTextNodes(root) {
    if (!root) return [];
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }
    return nodes;
  }

  function normalizePreviewText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function selectVariant(next, checkpointReason) {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    if (variantSelectionInFlight) return;
    if (next < 1 || next > arrivedVariants) return;
    if (next === visibleVariant) return;

    const previous = visibleVariant;
    variantSelectionInFlight = true;
    const selectionPromise = (async () => {
      visibleVariant = next;
      showOrUpdateCyclingBar();
      saveSession();
      const shown = await showVariantInDOM(currentSessionId, next); // calls refreshParamsPanel itself
      if (!shown) {
        visibleVariant = previous;
        await showVariantInDOM(currentSessionId, previous);
        showOrUpdateCyclingBar();
        saveSession();
        return;
      }
      updateSelectedElement();
      showOrUpdateCyclingBar();
      positionBar();
      saveSession();
      if (checkpointReason) queueCheckpoint(checkpointReason);
    })();
    variantSelectionPromise = selectionPromise;
    try {
      await selectionPromise;
    } finally {
      if (variantSelectionPromise === selectionPromise) variantSelectionPromise = null;
      variantSelectionInFlight = false;
    }
  }

  function cycleVariant(dir) {
    selectVariant(visibleVariant + dir, 'variant_changed');
  }

  function updateSelectedElement() {
    if (!currentSessionId) return;
    if (svelteComponentSession?.sessionId === currentSessionId) {
      const anchor = resolveSvelteComponentAnchor();
      if (anchor && !anchor.__tcherFrozenAnchor) selectedElement = anchor;
      return;
    }
    const wrapper = document.querySelector('[data-tcher-variants="' + currentSessionId + '"]');
    if (!wrapper) return;
    const visEl = pickVariantContent(wrapper, visibleVariant);
    if (visEl) selectedElement = visEl;
  }

  function readVisibleVariantFromDOM(sessionId) {
    if (svelteComponentSession?.sessionId === sessionId && svelteComponentSession.mountedVariant > 0) {
      return svelteComponentSession.mountedVariant;
    }
    const wrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
    if (!wrapper) return 0;
    const variants = wrapper.querySelectorAll('[data-tcher-variant]:not([data-tcher-variant="original"])');
    for (const variant of variants) {
      if (!isVariantShown(variant)) continue;
      const idx = parseInt(variant.dataset.tcherVariant || '0', 10);
      if (idx > 0) return idx;
    }
    return 0;
  }

  // Resolve the element that represents the variant's visible content.
  // Contract: each variant div should contain exactly one top-level element
  // (the full replacement). In practice a model may ship loose siblings or
  // lead with <style>/<script>. Be defensive: skip non-visual elements, and
  // if the variant has multiple element children, use the variant div itself
  // (it wraps all of them and gets correct bounds).
  function pickVariantContent(wrapper, index) {
    if (!wrapper) return null;
    const variantDiv = wrapper.querySelector('[data-tcher-variant="' + index + '"]');
    if (!variantDiv) return null;
    const NON_VISUAL = new Set(['STYLE', 'SCRIPT', 'LINK', 'META', 'TEMPLATE']);
    const visual = [];
    for (const child of variantDiv.children) {
      if (!NON_VISUAL.has(child.tagName)) visual.push(child);
    }
    if (visual.length === 1) return visual[0];
    return variantDiv;
  }

  // Hold window.scrollY at a fixed value across DOM mutations inside the
  // session's wrapper (HMR patches, variant inserts, cycle swaps).
  function startScrollLock(sessionId, initialTargetY) {
    stopScrollLock();
    scrollLockTargetY = typeof initialTargetY === 'number' && isFinite(initialTargetY)
      ? initialTargetY
      : window.scrollY;

    try { history.scrollRestoration = 'manual'; } catch {}

    const prevHtmlAnchor = document.documentElement.style.overflowAnchor;
    const prevBodyAnchor = document.body.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = 'none';
    document.body.style.overflowAnchor = 'none';

    const correct = (why) => {
      scrollLockRaf = null;
      if (scrollLockTargetY == null) return;
      const before = window.scrollY;
      const delta = before - scrollLockTargetY;
      if (Math.abs(delta) < 0.5) {
        return;
      }
      window.scrollTo({ top: scrollLockTargetY, left: window.scrollX, behavior: 'instant' });
    };
    const schedule = (why) => {
      if (scrollLockRaf != null) return;
      scrollLockRaf = requestAnimationFrame(() => correct(why));
    };

    scrollLockObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.target?.closest?.('[data-tcher-variants="' + sessionId + '"]')) {
          schedule('mutation-in-wrapper');
          return;
        }
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && (n.matches?.('[data-tcher-variants="' + sessionId + '"]') || n.querySelector?.('[data-tcher-variants="' + sessionId + '"]'))) {
            schedule('wrapper-added');
            return;
          }
        }
      }
    });
    scrollLockObserver.observe(document.body, { childList: true, subtree: true });

    scrollLockAbort = new AbortController();
    scrollLockAbort.signal.addEventListener('abort', () => {
      document.documentElement.style.overflowAnchor = prevHtmlAnchor;
      document.body.style.overflowAnchor = prevBodyAnchor;
    }, { once: true });
    const sig = { signal: scrollLockAbort.signal };
    // Track whether the most recent scroll came from a user gesture. We
    // gate user-scroll re-anchoring on this flag so programmatic smooth
    // scrolls (browser reload-restore, scrollIntoView from other scripts)
    // don't accidentally update our target.
    let userGestureAt = 0;
    const USER_GESTURE_WINDOW_MS = 250;

    const reanchor = (why) => {
      if (scrollLockRaf != null) { cancelAnimationFrame(scrollLockRaf); scrollLockRaf = null; }
      const prevTarget = scrollLockTargetY;
      scrollLockTargetY = window.scrollY;
      writeScrollY(scrollLockTargetY);
    };
    const markGesture = (why) => {
      userGestureAt = performance.now();
      reanchor(why);
    };
    window.addEventListener('wheel', () => markGesture('wheel'), { passive: true, ...sig });
    window.addEventListener('touchstart', () => markGesture('touchstart'), { passive: true, ...sig });
    window.addEventListener('touchmove', () => markGesture('touchmove'), { passive: true, ...sig });
    window.addEventListener('keydown', (e) => {
      if (['PageDown', 'PageUp', ' ', 'End', 'Home', 'ArrowDown', 'ArrowUp'].includes(e.key)) markGesture('key:' + e.key);
    }, sig);

    // Correct on EVERY scroll event: whether it's the browser's
    // post-reload animated restore or some other script calling
    // scrollIntoView, we want to snap back immediately. Only skip if a
    // user gesture fired in the last 250ms.
    window.addEventListener('scroll', () => {
      const now = window.scrollY;
      if (scrollLockTargetY == null) return;
      if (performance.now() - userGestureAt < USER_GESTURE_WINDOW_MS) return;
      if (Math.abs(now - scrollLockTargetY) < 0.5) return;
      window.scrollTo({ top: scrollLockTargetY, left: window.scrollX, behavior: 'instant' });
    }, { passive: true, ...sig });

    // Apply target synchronously, not via rAF - racing the browser's
    // restore or a smooth-scroll animation means we want to win now.
    if (Math.abs(window.scrollY - scrollLockTargetY) > 0.5) {
      window.scrollTo({ top: scrollLockTargetY, left: window.scrollX, behavior: 'instant' });
    }
  }

  function stopScrollLock() {
    if (scrollLockObserver) { scrollLockObserver.disconnect(); scrollLockObserver = null; }
    if (scrollLockRaf != null) { cancelAnimationFrame(scrollLockRaf); scrollLockRaf = null; }
    if (scrollLockAbort) { scrollLockAbort.abort(); scrollLockAbort = null; }
    scrollLockTargetY = null;
    // NOTE: do NOT clear the persistent scroll key here. startScrollLock
    // calls us as a reset, and clearing the key would nuke the Go-time
    // scrollY that the next resume needs to read.
  }

  //
  // MutationObserver for progressive variant reveal
  //

  function startVariantObserver(sessionId) {
    let updating = false; // re-entrancy guard

    const obs = new MutationObserver((mutations) => {
      if (updating) return;

      // Only react to mutations that add nodes with data-tcher-variant,
      // or mutations inside the variant wrapper. Ignore our own bar/UI changes.
      let dominated = false;
      for (const m of mutations) {
        if (m.target.closest?.('[data-tcher-variants]')) { dominated = true; break; }
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          // Direct hit: the added node itself is the wrapper or a variant.
          if (n.dataset?.tcherVariants || n.dataset?.tcherVariant) {
            dominated = true; break;
          }
          // Subtree hit: framework HMR (notably SvelteKit) sometimes replaces
          // a whole subtree where the wrapper is a descendant of the added
          // node. Without this check, the observer ignores those mutations
          // and the session stays in GENERATING forever.
          if (n.querySelector?.('[data-tcher-variants],[data-tcher-variant]')) {
            dominated = true; break;
          }
        }
        if (dominated) break;
      }
      if (!dominated) return;

      const wrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
      if (!wrapper) return;

      const variants = wrapper.querySelectorAll('[data-tcher-variant]:not([data-tcher-variant="original"])');
      const count = variants.length;

      // Re-anchor selectedElement if it was detached by live-wrap's HMR swap.
      // Without this, the shader / highlight / bar track a zero-rect phantom
      // and the overlay appears frozen.
      if (selectedElement && !document.body.contains(selectedElement)) {
        const isInsert = wrapper.dataset.tcherMode === 'insert';
        if (isInsert) {
          const visEl = count > 0 ? pickVariantContent(wrapper, visibleVariant || 1) : null;
          if (visEl) {
            selectedElement = visEl;
            if (count > 0) removeInsertPlaceholderDom();
          } else {
            const ph = ensureInsertPlaceholder();
            if (ph) selectedElement = ph;
            else if (insertAnchorElement && document.body.contains(insertAnchorElement)) {
              selectedElement = insertAnchorElement;
            }
          }
        } else {
          selectedElement = pickVariantContent(wrapper, 'original') || wrapper;
        }
      } else if (isInsertGeneratingSession() && count === 0) {
        ensureInsertPlaceholder();
      }

      // Nothing new
      if (count <= arrivedVariants) return;

      updating = true;
      arrivedVariants = count;
      if (visibleVariant === 0 && arrivedVariants > 0) {
        const saved = loadSession();
        const savedVisibleVariant = saved && saved.id === sessionId ? saved.visible : 0;
        visibleVariant = savedVisibleVariant > 0 && savedVisibleVariant <= arrivedVariants ? savedVisibleVariant : 1;
        showVariantInDOM(sessionId, visibleVariant);
        // showVariantInDOM hid the original (display:none); if we were still
        // anchored to the original's content, its boundingRect is now zero
        // and the bar snaps to (0,0). Re-point at the visible variant instead.
        const visEl = pickVariantContent(wrapper, visibleVariant);
        if (visEl) selectedElement = visEl;
      }

      const expected = parseInt(wrapper.dataset.tcherVariantCount || '0');
      if (expected > 0) expectedVariants = expected;

      if (arrivedVariants >= expectedVariants && expectedVariants > 0) {
        state = 'CYCLING';
        recoveryWaitingForAnchor = false;
        hideShaderOverlay();
        if (wrapper.dataset.tcherMode === 'insert') finalizeInsertSession();
        updateSelectedElement();
        showOrUpdateCyclingBar();
        disableInlineEdit();
        refreshParamsPanel();
        positionBar();
      } else if (state === 'GENERATING') {
        updateBarContent('generating');
      }
      saveSession();
      queueCheckpoint(state === 'CYCLING' ? 'variants_ready' : 'variants_progress');
      updating = false;
    });

    obs.observe(document.body, { childList: true, subtree: true });
    return obs;
  }

  //
  // Bar scroll tracking
  //

  function startScrollTracking() {
    function tick() {
      if (state === 'CONFIGURING' || state === 'GENERATING' || state === 'CYCLING') {
        if (isInsertGeneratingSession()) ensureInsertPlaceholder();
        positionBar();
        if (state === 'CONFIGURING') positionEditBadge();
        const hiTarget = resolveBarAnchor();
        if (hiTarget && !hiTarget.hasAttribute?.('data-tcher-insert-placeholder')) {
          showHighlight(hiTarget);
        } else {
          hideHighlight();
        }
        if (tuneOpen) positionParamsPanel();
      }
      if (state === 'EDITING') {
        positionEditBadge();
        showHighlight(selectedElement);
      }
      if (annotActive) {
        const annotTarget = resolveBarAnchor();
        if (annotTarget) positionAnnotOverlay(annotTarget);
      }
      // Shader overlay (via debug P toggle or generation) is repositioned
      // by its own branch below; debug no longer has a separate overlay.
      if (shaderState) positionShaderOverlay();
      scrollRaf = requestAnimationFrame(tick);
    }
    scrollRaf = requestAnimationFrame(tick);
  }

  function stopScrollTracking() {
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = null; }
  }

  //
  // SSE (server→browser) + fetch POST (browser→server)
  // Zero-dependency replacement for WebSocket.
  //

  let evtSource = null;
  let sseRetries = 0;
  const SSE_MAX_RETRIES = 20;  // generous: heartbeats keep the connection alive, so retries mean real trouble

  function connectSSE() {
    evtSource = new EventSource('http://localhost:' + PORT + '/events?token=' + TOKEN);

    evtSource.onopen = () => {
      sseRetries = 0; // reset on successful (re)connect
    };

    evtSource.onmessage = (e) => {
      sseRetries = 0; // reset on any successful message
      let msg; try { msg = JSON.parse(e.data); } catch { return; }
      switch (msg.type) {
        case 'connected':
          hasProjectContext = !!msg.hasProjectContext;
          if (!hasProjectContext) showToast('No PRODUCT.md found. Variants will be brand-agnostic. Run /tcher init to generate one.', 7000);
          console.log('[tcher] Live mode connected.');
          syncAgentPollingUi(!!msg.agentPolling);
          startAgentStatusPoll();
          restoreFromActiveSessions(msg.activeSessions, 'sse_connected');
          if (state === 'IDLE' && (pickActive || insertActive)) state = 'PICKING';
          syncPageChatFocus('sse-connected');
          break;
        case 'agent_polling':
          syncAgentPollingUi(!!msg.connected);
          break;
        case 'steer_done':
          maybeCompleteSteer(msg);
          break;
        case 'manual_edit_stashed':
        case 'manual_edit_discarded':
        case 'manual_edit_commit_started':
        case 'manual_edit_apply_reply_received':
        case 'manual_edit_apply_dispatched':
        case 'manual_edit_repair_needs_decision':
        case 'manual_edit_repair_rollback_done':
        case 'manual_edit_commit_done':
        case 'manual_edit_commit_failed':
          handleManualEditActivity(msg);
          break;
        case 'done':
          if (maybeCompleteSteer(msg)) break;
          rememberSessionFileMeta(msg);
          // Variants already arrived via HMR → normal transition.
          if (arrivedVariants >= expectedVariants && expectedVariants > 0) {
            if (state === 'GENERATING') {
              state = 'CYCLING';
              showOrUpdateCyclingBar();
              disableInlineEdit();
              refreshParamsPanel();
            }
            break;
          }
          // Source fallback when HMR did not land variants in this tab.
          if (msg.file && msg.id && state === 'GENERATING' && msg.id === currentSessionId) {
            injectVariantsFromSource(msg.file, msg.id);
            break;
          }
          // Variants are in source but not in the DOM yet. Common when the
          // picked element lived inside conditional render (closed modal,
          // hidden tab, a route the user navigated away from). The variant
          // MutationObserver stays armed and auto-transitions to CYCLING
          // the moment the wrapper actually mounts. Nudge the user toward
          // that path with a toast - better than the prior force-reload
          // which reset framework state and left the session stuck.
          setTimeout(() => {
            if (arrivedVariants >= expectedVariants && expectedVariants > 0) return;
            if (state !== 'GENERATING') return;
            showToast(
              "Variants ready. If the picked element isn't visible, retrace the path that revealed it - they'll appear automatically.",
              15000,
            );
          }, 2000);
          break;
        case 'complete':
        case 'accept':
          if (maybeCompleteAcceptedSession(msg)) break;
          break;
        case 'agent_done':
          // Carbonize accepts are not terminal until live-complete.mjs sends
          // the final complete event. Keep the browser in its recoverable
          // saving state while the source cleanup is still in flight.
          break;
        case 'discarded':
          if (msg.id && msg.id === currentSessionId) {
            markSessionHandled();
            cleanup();
          }
          break;
        case 'error':
          if (pendingAcceptedSession?.id && msg.id === pendingAcceptedSession.id) {
            pendingAcceptedSession = null;
            state = 'CYCLING';
            updateBarContent('cycling');
            showToast('Could not complete accept cleanup. Try Accept again.', 5000);
            break;
          }
          if (maybeCompleteSteer(msg)) break;
          console.error('[tcher] Error:', msg.message);
          showToast('Error: ' + msg.message, 5000);
          hideBar();
          renderEditBadge('hidden');
          state = 'PICKING';
          break;
      }
    };

    evtSource.onerror = () => {
      sseRetries++;
      if (sseRetries <= SSE_MAX_RETRIES) {
        console.log('[tcher] SSE connection lost. Retry ' + sseRetries + '/' + SSE_MAX_RETRIES + '...');
        return; // EventSource auto-reconnects
      }
      // Server is gone. Clean up gracefully.
      console.log('[tcher] Live server unreachable. Cleaning up UI.');
      evtSource.close();
      evtSource = null;
      handleServerLost();
    };
  }

  /** Server died or became unreachable. Reset UI to a clean state. */
  function handleServerLost() {
    const recoveryState = currentSessionId ? state : 'IDLE';
    if (state === 'GENERATING' || state === 'CYCLING' || state === 'SAVING') {
      showToast('Live server disconnected. Session ended.', 5000);
    }
    hideBar();
    hideHighlight();
    hideShaderOverlay();
    hideAnnotOverlay();
    stopScrollTracking();
    if (variantObserver) { variantObserver.disconnect(); variantObserver = null; }
    stopScrollLock();
    // Preserve local session state on server loss. The durable journal is the
    // source of truth, but localStorage plus the variant wrapper lets the UI
    // resume after a helper restart or page reload instead of treating a
    // transient disconnect as an explicit discard.
    selectedElement = null;
    selectedAction = 'tcher';
    state = recoveryState;
    if (currentSessionId) saveSession();
  }

  function sendEvent(msg, opts) {
    msg.token = TOKEN;
    function handleFailure(err) {
      console.error('[tcher] Failed to send event:', err);
      if (opts && opts.throwOnError) throw err;
      return null;
    }
    return fetch('http://localhost:' + PORT + '/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    }).then(async res => {
      if (res.ok) return res;
      const body = await res.json().catch(() => ({}));
      return handleFailure(new Error(body.error || ('HTTP ' + res.status + ' ' + res.statusText)));
    }).catch(handleFailure);
  }

  function checkpointPayload(reason) {
    return {
      type: 'checkpoint',
      id: currentSessionId,
      revision: sessionState.nextCheckpointRevision(),
      owner: browserOwner,
      phase: String(state || '').toLowerCase(),
      reason,
      pageUrl: location.pathname,
      expectedVariants,
      arrivedVariants,
      visibleVariant,
      sourceFile: currentSourceFile || undefined,
      previewFile: currentPreviewFile || undefined,
      previewMode: currentPreviewMode || undefined,
      paramValues: { ...paramsCurrentValues },
    };
  }

  function sendCheckpoint(reason) {
    if (!currentSessionId) return Promise.resolve(null);
    return sendEvent(checkpointPayload(reason)).catch(() => null);
  }

  function sendSteerCheckpoint(id, reason, extra) {
    if (!id) return Promise.resolve(null);
    return sendEvent({
      type: 'checkpoint',
      id,
      revision: sessionState.nextCheckpointRevision(),
      owner: browserOwner,
      phase: 'steer',
      reason,
      pageUrl: location.pathname,
      ...(extra || {}),
    }).catch(() => null);
  }

  function queueCheckpoint(reason) {
    if (!currentSessionId) return;
    if (checkpointTimer) clearTimeout(checkpointTimer);
    checkpointTimer = setTimeout(() => {
      checkpointTimer = null;
      sendCheckpoint(reason);
    }, 120);
  }

  //
  // Event handlers
  //

  function handleMouseMove(e) {
    if (pendingApplyInFlight) return;
    if (state === 'PICKING' && insertActive) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || own(target) || !pickable(target)) {
        hideInsertLine();
        return;
      }
      const parent = target.parentElement;
      const axis = detectInsertAxis(parent);
      const siblings = layoutFlowChildren(parent);
      const rect = target.getBoundingClientRect();
      const resolved = resolveInsertHover({
        clientX: e.clientX,
        clientY: e.clientY,
        target,
        rect,
        axis,
        siblings,
      });
      if (
        resolved.anchor !== insertHoverAnchor
        || resolved.position !== insertHoverPosition
        || resolved.axis !== insertHoverAxis
      ) {
        showInsertLine(resolved);
      }
      syncPageInteractionCursor();
      return;
    }
    if (state !== 'PICKING' || !pickActive) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || !pickable(target) || target === hoveredElement) return;
    hoveredElement = target;
    showHighlight(target);
  }

  function handleClick(e) {
    if (pendingApplyInFlight && !pendingDockEl?.contains(e.target)) {
      if (pickerEl?.style.display !== 'none') hideActionPicker();
      if (own(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        showManualApplyBusyToast();
      }
      return;
    }
    // Close action picker on any outside click
    if (pickerEl?.style.display !== 'none' && !own(e.target)) {
      hideActionPicker();
    }
    // Close Tune popover on outside click (anything outside panel + bar)
    if (tuneOpen && paramsPanelEl && !paramsPanelEl.contains(e.target) && barEl && !barEl.contains(e.target)) {
      closeTunePopover();
    }
    // In EDITING: click outside exits the text edit flow without rebuilding configure UI first.
    if (state === 'EDITING' && !own(e.target) && selectedElement && !selectedElement.contains(e.target)) {
      cancelEditingToPicking();
      return;
    }
    // In CONFIGURING: click outside the bar and selected element returns to PICKING.
    if (
      state === 'CONFIGURING' && !own(e.target) && selectedElement
      && !selectedElement.contains(e.target)
    ) {
      if (configureKind === 'insert') { cancelInsertConfigure(); return; }
      hideBar();
      stopScrollTracking();
      hideAnnotOverlay();
      renderEditBadge('hidden');
      state = 'PICKING';
      hoveredElement = null;
      hideHighlight();
      syncPageChatFocus('configure-outside-click');
      return;
    }
    if (state === 'PICKING' && insertActive) {
      if (own(e.target)) return;
      if (!insertHoverAnchor || !insertHoverPosition) return;
      e.preventDefault();
      e.stopPropagation();
      const placeholder = createInsertPlaceholder(
        insertHoverAnchor,
        insertHoverPosition,
        insertHoverAxis,
      );
      if (!placeholder) return;
      hideInsertLine();
      configureKind = 'insert';
      selectedElement = placeholder;
      state = 'CONFIGURING';
      hideHighlight();
      showAnnotOverlay(placeholder);
      showBar('configure');
      startScrollTracking();
      syncPageInteractionCursor();
      return;
    }
    if (state !== 'PICKING' || !pickActive) return;
    if (own(e.target)) return;
    if (pagePickSkipClick || pageHasHostTextSelection()) {
      pagePickSkipClick = false;
      return;
    }
    if (!hoveredElement || !pickable(hoveredElement)) return;
    e.preventDefault();
    e.stopPropagation();
    selectedElement = hoveredElement;
    state = 'CONFIGURING';
    showHighlight(selectedElement);
    showAnnotOverlay(selectedElement);
    showBar('configure');
    renderEditBadge(hasTextRows(selectedElement) ? 'idle' : 'hidden');
    startScrollTracking();
    maybePrefetchPage();
    maybeWarnConditionalAncestor(selectedElement);
  }

  /**
   * Surface a brief, non-blocking heads-up when the picked element lives
   * inside a container whose visibility is gated by ephemeral state - modals,
   * collapsible panels, popovers, off-screen tab panels. If HMR remounts the
   * parent during generation (Vite Fast Refresh, SvelteKit page reload), the
   * variants land in source but stay invisible until the user re-opens the
   * container. Telling the user upfront is much friendlier than the silent
   * timeout-then-toast that they'd otherwise hit.
   *
   * Heuristic, intentionally narrow - only fires for unambiguous cases so
   * we don't cry wolf on every nested element.
   */
  function maybeWarnConditionalAncestor(el) {
    let node = el?.parentElement;
    let depth = 0;
    while (node && depth < 12) {
      // 1. Active dialog / modal
      if (node.getAttribute && node.getAttribute('role') === 'dialog'
          && node.getAttribute('aria-modal') === 'true') {
        showToast('Heads up: this element lives inside a dialog. If state resets during generation, you may need to re-open it.', 6000);
        return;
      }
      // 2. Common Radix / shadcn / headless-ui open-state attribute
      if (node.dataset && node.dataset.state === 'open') {
        showToast('Heads up: this element lives inside an open panel. If state resets during generation, you may need to re-open it.', 6000);
        return;
      }
      // 3. Tab panel - only meaningful when the page also shows ANOTHER
      // tab as selected. A single tabpanel with no tablist is just a static
      // section in disguise and isn't conditional.
      if (node.getAttribute && node.getAttribute('role') === 'tabpanel') {
        const list = document.querySelector('[role="tablist"]');
        if (list) {
          const tabs = list.querySelectorAll('[role="tab"]');
          if (tabs.length > 1) {
            showToast('Heads up: this element lives in a tab panel. If state resets during generation, switch back to this tab.', 6000);
            return;
          }
        }
      }
      // 4. Collapsible: aria-expanded sibling. Look for the trigger button.
      if (node.id) {
        const trigger = document.querySelector(`[aria-controls="${CSS.escape(node.id)}"][aria-expanded="true"]`);
        if (trigger) {
          showToast('Heads up: this element lives inside an expandable section. If state resets during generation, re-expand it.', 6000);
          return;
        }
      }
      node = node.parentElement;
      depth++;
    }
  }

  // Fire a lightweight prefetch event the first time the user selects an
  // element on a given route. The agent uses this to Read the underlying file
  // into context before Go is hit, shaving the read off the critical path.
  // Dedupe per session by pathname - clicking around on the same page doesn't
  // re-fire.
  //
  // DISABLED: quick-Go workflows pay an extra harness round trip because
  // prefetch + generate arrive as two events instead of one. Re-enable with
  // a browser-side debounce (~800-1000ms, cancelled on Go) if we want to
  // resurrect this. Server validator and skill dispatch remain in place so
  // flipping this flag is the only change needed.
  const PREFETCH_ENABLED = false;
  const prefetchedPaths = new Set();
  function maybePrefetchPage() {
    if (!PREFETCH_ENABLED) return;
    const path = location.pathname;
    if (prefetchedPaths.has(path)) return;
    prefetchedPaths.add(path);
    sendEvent({ type: 'prefetch', pageUrl: path });
  }

  function handleKeyDown(e) {
    const deepActive = activeElementDeep();
    if (
      deepActive
      && own(deepActive)
      && /^(INPUT|TEXTAREA|SELECT)$/.test(deepActive.tagName || '')
    ) {
      return;
    }
    // While a contenteditable text-leaf is focused, let the browser handle
    // all keys except Escape. Escape cancels the current edit (restores
    // original text) and blurs without saving, staying in CONFIGURING.
    if (e.target.isContentEditable && inlineEditRows.some((r) => r.el === e.target)) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      const original = e.target.dataset.tcherOriginalText;
      if (original !== undefined) e.target.textContent = original;
      // Programmatic textContent doesn't fire the 'input' event, so the draft
      // map would otherwise hold the pre-cancel value and Apply would commit
      // changes the user explicitly undid.
      inlineEditDrafts.delete(e.target);
      e.target.blur();
      return;
    }
    if (pendingApplyInFlight) {
      const liveNavKey = e.key === 'Enter'
        || e.key === 'ArrowUp'
        || e.key === 'ArrowDown'
        || e.key === 'ArrowLeft'
        || e.key === 'ArrowRight';
      if (liveNavKey && (state === 'PICKING' || state === 'CONFIGURING' || state === 'CYCLING')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Enter') showManualApplyBusyToast();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (pickerEl?.style.display !== 'none') { hideActionPicker(); return; }
      if (state === 'EDITING') { cancelEditing(); return; }
      if (state === 'CONFIGURING') {
        if (configureKind === 'insert') { cancelInsertConfigure(); return; }
        disableInlineEdit(); hideBar(); stopScrollTracking(); hideAnnotOverlay(); renderEditBadge('hidden'); state = 'PICKING'; syncPageChatFocus('escape-from-configure'); return;
      }
      if (state === 'CYCLING') { handleDiscard(); return; }
      if (state === 'SAVING' || state === 'CONFIRMED') return; // don't interrupt
      if (state === 'PICKING') {
        if (insertActive) toggleInsert();
        else if (pickActive) togglePick();
        else { hideHighlight(); state = 'IDLE'; }
        return;
      }
    }

    // Arrow/Enter nav works in PICKING (hover) and CONFIGURING (selected, input empty)
    var navEl = (state === 'PICKING') ? hoveredElement : (state === 'CONFIGURING') ? selectedElement : null;
    if (navEl && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || (e.key === 'Enter' && state === 'PICKING'))) {
      let next = null;
      if (e.key === 'ArrowDown' && !e.shiftKey) {
        next = navEl.nextElementSibling;
        while (next && !pickable(next)) next = next.nextElementSibling;
      } else if (e.key === 'ArrowUp' && !e.shiftKey) {
        next = navEl.previousElementSibling;
        while (next && !pickable(next)) next = next.previousElementSibling;
      } else if (e.key === 'ArrowUp' && e.shiftKey) {
        next = navEl.parentElement;
        if (next && !pickable(next)) next = null;
      } else if (e.key === 'ArrowDown' && e.shiftKey) {
        next = navEl.firstElementChild;
        while (next && !pickable(next)) next = next.nextElementSibling;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectedElement = hoveredElement;
        state = 'CONFIGURING';
        showHighlight(selectedElement);
        showAnnotOverlay(selectedElement);
        showBar('configure');
        renderEditBadge(hasTextRows(selectedElement) ? 'idle' : 'hidden');
        startScrollTracking();
        return;
      }
      if (next) {
        e.preventDefault();
        if (state === 'PICKING') {
          hoveredElement = next;
        } else {
          // CONFIGURING: re-select the new element
          selectedElement = next;
          showAnnotOverlay(next);
          showBar('configure');
          disableInlineEdit();
          renderEditBadge(hasTextRows(selectedElement) ? 'idle' : 'hidden');
          startScrollTracking();
        }
        showHighlight(next);
        next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      return;
    }

    if (state === 'CYCLING') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); cycleVariant(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); cycleVariant(1); }
      if (e.key === 'Enter') { e.preventDefault(); handleAccept(); }
    }
  }

  function handleGo() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    if (!selectedElement || state !== 'CONFIGURING') return;    const input = uiGetById(PREFIX + '-input');
    const prompt = input ? input.value.trim() : '';

    // Go captures page content, not manual-edit runtime state.
    disableInlineEdit();
    stripManualEditRuntimeState(selectedElement);

    pendingAcceptedSession = null;
    currentSessionId = id8();
    expectedVariants = selectedCount;
    arrivedVariants = 0;
    visibleVariant = 0;
    resetSessionFileMeta();

    // Flip to GENERATING immediately so the bar morphs without waiting on
    // capture. The event is emitted from captureAndEmit() once capture finishes
    // (or fails - we still emit either way).
    const elForCapture = selectedElement;
    const captureRect = elForCapture.getBoundingClientRect();
    const basePayload = {
      type: 'generate', id: currentSessionId,
      action: selectedAction,
      freeformPrompt: prompt || undefined,
      count: selectedCount,
      pageUrl: location.pathname,
      element: extractContext(elForCapture),
    };

    // Hide the overlay so it doesn't linger during generation.
    hideAnnotOverlay();

    state = 'GENERATING';
    // Disable the Edit badge: starting a manual text edit mid-generation would
    // conflict with the variant wrap that's about to land in the same DOM
    // region. Only swap if the badge was visible - picked elements with no
    // text rows have it hidden already.
    if (editBadgeEl && editBadgeEl.style.display !== 'none') renderEditBadge('idle-disabled');
    showBar('generating');
    saveSession();
    sendCheckpoint('generate_started');
    writeScrollY(window.scrollY);
    if (variantObserver) variantObserver.disconnect();
    variantObserver = startVariantObserver(currentSessionId);
    startScrollLock(currentSessionId);

    captureAndEmit(elForCapture, basePayload, captureRect);
  }

  function cancelInsertConfigure() {
    hideBar();
    stopScrollTracking();
    hideAnnotOverlay();
    clearInsertPicking();
    configureKind = 'replace';
    selectedElement = null;
    state = insertActive ? 'PICKING' : 'IDLE';
    hideHighlight();
    syncPageChatFocus('insert-configure-cancel');
  }

  function handleInsertCreate() {
    if (!placeholderElement || !insertAnchorElement || state !== 'CONFIGURING' || configureKind !== 'insert') return;
    const input = uiGetById(PREFIX + '-insert-input');
    const prompt = input ? input.value.trim() : '';
    if (!canCreateInsert({ prompt })) return;
    pendingAcceptedSession = null;
    currentSessionId = id8();
    expectedVariants = selectedCount;
    arrivedVariants = 0;
    visibleVariant = 0;
    resetSessionFileMeta();
    selectedElement = placeholderElement;
    insertPlaceholderSnapshot = buildInsertPlaceholderSnapshotFromDom(insertAnchorElement, placeholderElement);

    const elForCapture = placeholderElement;
    const captureRect = elForCapture.getBoundingClientRect();
    const basePayload = {
      type: 'generate',
      mode: 'insert',
      id: currentSessionId,
      count: selectedCount,
      pageUrl: location.pathname,
      insert: {
        position: insertAnchorPosition,
        anchor: extractContext(insertAnchorElement),
      },
      placeholder: {
        width: Math.round(captureRect.width),
        height: Math.round(captureRect.height),
      },
      freeformPrompt: prompt || undefined,
    };

    hideAnnotOverlay();

    state = 'GENERATING';
    showBar('generating');
    startScrollTracking();
    saveSession();
    sendCheckpoint('generate_started');
    writeScrollY(window.scrollY);
    if (variantObserver) variantObserver.disconnect();
    variantObserver = startVariantObserver(currentSessionId);
    startScrollLock(currentSessionId);
    captureAndEmit(elForCapture, basePayload, captureRect);
  }

  //
  // Screenshot capture + upload
  //

  let msLoadPromise = null;
  function loadModernScreenshot() {
    if (window.modernScreenshot) return Promise.resolve(window.modernScreenshot);
    if (msLoadPromise) return msLoadPromise;
    msLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'http://localhost:' + PORT + '/modern-screenshot.js';
      s.onload = () => resolve(window.modernScreenshot);
      s.onerror = () => { msLoadPromise = null; reject(new Error('modern-screenshot failed to load')); };
      uiAppendStyle(s);
    });
    return msLoadPromise;
  }

  // Collect @font-face rules from every stylesheet on the page. Cross-origin
  // sheets (Google Fonts, Typekit, etc.) throw SecurityError on .cssRules
  // access, so modern-screenshot can't embed them on its own - the resulting
  // SVG falls back to system fonts and text re-wraps + renders with different
  // weight. We fetch the raw CSS text (CORS-permitted for these providers),
  // extract @font-face blocks, inline the referenced font files as base64
  // data URIs (SVGs rasterized via canvas can't fetch external resources,
  // so URLs inside the SVG silently fail without this), and pass the result
  // to modern-screenshot as font.cssText.
  const FONT_EXT_RE = /\.(woff2?|ttf|otf|eot)(\?.*)?$/i;
  const FONT_MIME = {
    woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  };
  function bufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }
  async function inlineFontUrls(cssText) {
    const urlRe = /url\((['"]?)(https?:\/\/[^'")\s]+)\1\)/g;
    const urls = new Set();
    let m;
    while ((m = urlRe.exec(cssText))) {
      if (FONT_EXT_RE.test(m[2])) urls.add(m[2]);
    }
    const map = new Map();
    await Promise.all([...urls].map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        const ext = url.toLowerCase().match(FONT_EXT_RE)?.[1] || 'woff2';
        const mime = FONT_MIME[ext] || 'application/octet-stream';
        map.set(url, 'data:' + mime + ';base64,' + bufferToBase64(buf));
      } catch { /* skip; fall through to URL */ }
    }));
    return cssText.replace(urlRe, (orig, q, url) => {
      const data = map.get(url);
      return data ? 'url(' + q + data + q + ')' : orig;
    });
  }
  async function collectFontCssText() {
    const chunks = [];
    const fontFaceRe = /@font-face\s*\{[^}]*\}/g;
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules;
        for (const rule of rules) {
          if (rule.constructor.name === 'CSSFontFaceRule' || rule.cssText?.startsWith('@font-face')) {
            chunks.push(rule.cssText);
          }
        }
      } catch {
        if (!sheet.href) continue;
        try {
          const res = await fetch(sheet.href);
          if (!res.ok) continue;
          const text = await res.text();
          let m2;
          while ((m2 = fontFaceRe.exec(text))) chunks.push(m2[0]);
        } catch { /* ignore; capture is best-effort */ }
      }
    }
    if (chunks.length === 0) return '';
    return inlineFontUrls(chunks.join('\n'));
  }

  // True if `s` is a computed color string that renders as nothing
  // (explicit `transparent`, or `rgba(...)` with alpha 0).
  function isTransparentColor(s) {
    if (!s) return true;
    if (s === 'transparent') return true;
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return false;
    const parts = m[1].split(',').map((p) => p.trim());
    if (parts.length === 4) return parseFloat(parts[3]) === 0;
    return false;
  }

  // modern-screenshot force-sets `background-color: X !important` on the
  // cloned root whenever `backgroundColor` is passed, clobbering the
  // element's own background. So we only pass it when the element is
  // genuinely transparent (no own color, no own image) - in that case
  // we resolve up the DOM to the nearest opaque ancestor so the capture
  // sits on the page's real background instead of rendering black.
  function resolveCanvasBackground(el) {
    const own = getComputedStyle(el);
    if (!isTransparentColor(own.backgroundColor)) return null;
    if (own.backgroundImage && own.backgroundImage !== 'none') return null;
    let node = el.parentElement;
    while (node) {
      const cs = getComputedStyle(node);
      if (!isTransparentColor(cs.backgroundColor)) return cs.backgroundColor;
      node = node.parentElement;
    }
    // The walk already passed through <body> and <html>; if they had been
    // opaque we would have returned. Falling through with the previous
    // `getComputedStyle(body).backgroundColor || …` chain is a trap: that
    // call returns the literal string `"rgba(0, 0, 0, 0)"` for a page that
    // never set its own bg, which is truthy and short-circuits the chain to
    // transparent-black - modern-screenshot then renders the capture on a
    // black canvas and the shader overlay flashes solid black during load.
    // The browser canvas defaults to white, so we do too.
    return '#ffffff';
  }

  function captureChromeNodes() {
    const nodes = [];
    const add = (node) => {
      if (!node || node === document.body || nodes.includes(node)) return;
      nodes.push(node);
    };
    add(document.getElementById(PREFIX + '-root'));
    [
      PREFIX + '-highlight',
      PREFIX + '-tooltip',
      PREFIX + '-bar',
      PREFIX + '-picker',
      PREFIX + '-params-panel',
      PREFIX + '-insert-line',
      PREFIX + '-insert-placeholder',
      PREFIX + '-insert-create-tooltip',
      PREFIX + '-annot',
      PREFIX + '-design-host',
      PREFIX + '-toast',
      PREFIX + '-shader',
    ].forEach((id) => add(uiGetById(id)));
    return nodes;
  }

  async function hideCaptureChromeForShaderProxy(fn) {
    const saved = captureChromeNodes().map((node) => ({
      node,
      visibility: node.style.visibility,
      priority: node.style.getPropertyPriority('visibility'),
    }));
    for (const { node } of saved) {
      node.style.setProperty('visibility', 'hidden', 'important');
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      return await fn();
    } finally {
      for (const { node, visibility, priority } of saved) {
        node.style.setProperty('visibility', visibility, priority);
      }
    }
  }

  function shouldUseAncestorCropShaderProxy(el) {
    // TODO: Enable this proxy for React/Vue/etc. adapters once their live
    // preview mounts are covered by the same shader regression checks.
    const adapter = String(window.__TCHER_LIVE_ADAPTER__ || '').toLowerCase();
    if (adapter === 'svelte' || adapter === 'sveltekit') return true;
    if (currentPreviewMode === 'svelte-component' || svelteComponentSession) return true;
    const wrapper = el?.closest?.('[data-tcher-variants]');
    return wrapper?.dataset?.tcherPreview === 'svelte-component';
  }

  function paintsShaderProxySurface(node) {
    const s = getComputedStyle(node);
    return !isTransparentColor(s.backgroundColor)
      || (s.backgroundImage && s.backgroundImage !== 'none')
      || paintsBackdrop(node);
  }

  function findShaderProxyCaptureRoot(el) {
    const doc = el.ownerDocument || document;
    const er = el.getBoundingClientRect();
    let node = el.parentElement;
    while (node && node !== doc.documentElement) {
      const nr = node.getBoundingClientRect();
      const containsElement =
        nr.width > 0 && nr.height > 0 &&
        nr.left <= er.left + 0.5 &&
        nr.top <= er.top + 0.5 &&
        nr.right >= er.right - 0.5 &&
        nr.bottom >= er.bottom - 0.5;
      if (containsElement && paintsShaderProxySurface(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Capture the element (with current annotations baked in) and return
  // { blob, paper }: the PNG Blob, plus the representative backdrop tone for the
  // shader's halftone ground (so capture, upload, and shader all agree on what
  // sits behind the element). Shared between the Go flow (uploads the blob) and
  // the shader-resume path.
  async function captureElementFromRenderedAncestor(ms, el, opts) {
    const doc = el.ownerDocument || document;
    const captureRoot = findShaderProxyCaptureRoot(el);
    if (!captureRoot) throw new Error('No painted ancestor for Svelte shader proxy');
    const rootCanvas = await ms.domToCanvas(captureRoot, opts);
    const S = opts.scale;
    const er = el.getBoundingClientRect();
    const rr = captureRoot.getBoundingClientRect();
    const sx = (er.left - rr.left) * S;
    const sy = (er.top - rr.top) * S;
    const sw = er.width * S;
    const sh = er.height * S;
    if (sw <= 0 || sh <= 0) throw new Error('Selected element has no visible capture rect');
    const crop = doc.createElement('canvas');
    crop.width = Math.max(1, Math.round(sw));
    crop.height = Math.max(1, Math.round(sh));
    const cctx = crop.getContext('2d', { willReadFrequently: true });
    cctx.drawImage(rootCanvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
    const paper = dominantRgb01(cctx, crop.width, crop.height) || averageRgb01(cctx, crop.width, crop.height);
    const blob = await new Promise((res) => crop.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Ancestor crop failed to produce a PNG blob');
    return { blob, paper };
  }

  async function captureElementToBlob(el) {
    try { if (document.fonts?.ready) await document.fonts.ready; } catch {}
    const ms = await loadModernScreenshot();
    const fontCssText = await collectFontCssText();
    const opts = {
      scale: Math.min(window.devicePixelRatio || 1, 2),
      font: fontCssText ? { cssText: fontCssText } : undefined,
    };
    if (shouldUseAncestorCropShaderProxy(el)) {
      try {
        return await hideCaptureChromeForShaderProxy(() => captureElementFromRenderedAncestor(ms, el, opts));
      } catch (err) {
        console.warn('[tcher] Svelte ancestor crop capture failed, falling back to element capture:', err);
      }
    }
    const bg = resolveCanvasBackground(el);
    // Fast path: the element paints its own background, or an opaque ancestor
    // color was found. modern-screenshot bakes that color; paper matches it.
    if (bg !== '#ffffff') {
      const blob = await ms.domToBlob(el, { ...opts, ...(bg ? { backgroundColor: bg } : {}) });
      return { blob, paper: bg ? cssColorToRgb01(bg) : resolvePaperRgb(el) };
    }
    // Transparent up to the root. The visible backdrop may still come from an
    // ancestor's background-image or a covering positioned layer (e.g. a hero
    // art div) that the color walk can't see. Capture that ancestor and crop
    // to the element so the real backdrop is embedded - correct for both the
    // shader and the screenshot sent to the model. Fall back to white only
    // when nothing is actually painted behind the element.
    const backdrop = findBackdropAncestor(el);
    if (!backdrop) {
      const blob = await ms.domToBlob(el, { ...opts, backgroundColor: '#ffffff' });
      return { blob, paper: SHADER_PAPER_FALLBACK };
    }
    const ancestorCanvas = await ms.domToCanvas(backdrop, opts);
    const S = opts.scale;
    const er = el.getBoundingClientRect();
    const ar = backdrop.getBoundingClientRect();
    const sx = (er.left - ar.left) * S, sy = (er.top - ar.top) * S;
    const sw = er.width * S, sh = er.height * S;
    const crop = document.createElement('canvas');
    crop.width = Math.max(1, Math.round(sw));
    crop.height = Math.max(1, Math.round(sh));
    const cctx = crop.getContext('2d', { willReadFrequently: true });
    cctx.drawImage(ancestorCanvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
    // Ground = backdrop sampled around the element, falling back to the crop
    // mean only if the surround is fully transparent.
    const actx = ancestorCanvas.getContext('2d', { willReadFrequently: true });
    const paper = sampleSurroundingRgb(actx, sx, sy, sw, sh, ancestorCanvas.width, ancestorCanvas.height)
      || averageRgb01(cctx, crop.width, crop.height);
    const blob = await new Promise((res) => crop.toBlob(res, 'image/png'));
    return { blob, paper };
  }

  async function captureAndEmit(el, basePayload, rect) {
    let blob;
    let paper;
    try {
      ({ blob, paper } = await captureElementToBlob(el));
    } catch (err) {
      console.warn('[tcher] capture failed, proceeding without screenshot:', err);
    }
    // Light up the shader overlay the moment capture is ready so the user sees
    // something alive while the model works. The capture is never sent to the
    // model: it would anchor it on the current rendering and fight the
    // three-distinct-directions brief.
    if (blob && state === 'GENERATING') {
      showShaderOverlay(el, blob, rect, paper);
    }
    sendEvent(basePayload);
  }

  //
  // Shader overlay - renders the captured screenshot as a WebGL texture and
  // runs an editorial "ink-wash" fragment shader over it during generation.
  // A single rolling band sweeps top-to-bottom, desaturating + tinting brand ink
  // and leaving a soft trail. Makes the wait feel like a letterpress scan
  // instead of a dead spinner.
  //

  const SHADER_VS = `attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const SHADER_FS = `precision highp float;
uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_accent;
uniform vec3 u_paper;
varying vec2 v_uv;

// Asymmetric roller band. Product of two one-sided smoothsteps - peaks at
// d=0 with a short sharp leading ramp and a longer soft trailing tail. Clean
// outside the [-leadW, trailW] range (no rogue "trail=1 everywhere below"
// failure that reversed-edge smoothstep would give).
float bandAt(float d, float leadW, float trailW) {
  float above = smoothstep(-leadW, 0.0, d);
  float below = 1.0 - smoothstep(0.0, trailW, d);
  return above * below;
}

void main() {
  vec2 uv = v_uv;
  // Roller sweeps top-to-bottom with small overshoot so each cycle enters
  // and exits the element cleanly.
  float phase = fract(u_time / 3.4);
  float y = phase * 1.25 - 0.12;
  float band = bandAt(uv.y - y, 0.05, 0.32);

  // Halftone cell grid (fixed ~10 px pitch).
  float cellPx = 10.0;
  vec2 gridUv = uv * u_resolution / cellPx;
  vec2 cellId = floor(gridUv);
  vec2 cellUv = fract(gridUv) - 0.5;
  vec2 sampleCenter = (cellId + 0.5) * cellPx / u_resolution;
  vec3 cellImg = texture2D(u_texture, sampleCenter).rgb;
  // Dot size tracks how much the cell DIFFERS from the element's own ground
  // (u_paper), not absolute darkness. So the content - text, buttons, anything
  // that deviates from the background - always becomes the dots, on light AND
  // dark surfaces. A plain darkness curve inverts on dark elements: the dark
  // background fills with ink and the lighter content punches holes instead.
  // Capped below the cell half-width so dense content stays separated dots.
  float contrast = clamp(length(cellImg - u_paper) / 1.732, 0.0, 1.0);
  float radius = min(sqrt(contrast) * 0.6, 0.38);
  float dotMask = smoothstep(radius + 0.06, radius, length(cellUv));
  // Two-stage dissolve as the roller passes, so the element is rebuilt purely
  // from dot size (its own halftone) and never bleeds through as raw pixels
  // behind the dots:
  //   1. cover  - the element flattens to the uniform paper ground first.
  //   2. dotAmt - brand-ink dots then emerge, sized by each cell's luma.
  // A plain mix(base, halftone, band) instead left the raw element visible
  // through the band's soft core/trail. The paper ground is u_paper (the
  // element's own bg tone) rather than a fixed white, so the dissolve reads the
  // same over light and dark surfaces.
  vec4 tex = texture2D(u_texture, uv);
  vec3 base = tex.rgb;
  float cover = smoothstep(0.0, 0.35, band);
  float dotAmt = dotMask * smoothstep(0.15, 0.6, band);
  vec3 ground = mix(base, u_paper, cover);
  // Carry the capture's own alpha through, so a rounded corner or any genuinely
  // transparent region stays transparent (the live backdrop shows through the
  // canvas) instead of rendering as solid black.
  gl_FragColor = vec4(mix(ground, u_accent, dotAmt), tex.a);
}`;

  // Brand ink converted to sRGB 0-1 (matches #171717 brand black)
  const SHADER_ACCENT = [0.09, 0.09, 0.09];
  // Fallback ground when an element and all its ancestors are transparent -
  // matches the original off-white risograph paper.
  const SHADER_PAPER_FALLBACK = [0.975, 0.965, 0.955];
  let shaderState = null; // { canvas, gl, program, texture, rafId, startTime }

  // The element's effective background tone, used as the uniform halftone
  // ground so content dissolves into dots over it. Unlike resolveCanvasBackground
  // (which returns null when the element paints its own bg), this always returns
  // a usable color: the element's own background if any, else the nearest opaque
  // ancestor, else the paper fallback.
  // Rasterize any CSS color (oklch, color(), named, hex, rgb) through a 1x1
  // canvas and read back the sRGB pixel. String-parsing computed colors is a
  // trap: Chrome returns backgroundColor as oklch()/color() for oklch inputs,
  // which a hex/rgb regex misses - every site token would fall back to white.
  let colorParseCtx = null;
  function cssColorToRgb01(str) {
    if (!colorParseCtx) {
      colorParseCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    }
    // Clear first: the ctx is cached across calls, so a semi-transparent color
    // would otherwise blend (source-over) with the previous call's leftover
    // pixel, making the result depend on call history.
    colorParseCtx.clearRect(0, 0, 1, 1);
    colorParseCtx.fillStyle = '#000'; // invalid input leaves this default
    colorParseCtx.fillStyle = str;
    colorParseCtx.fillRect(0, 0, 1, 1);
    const d = colorParseCtx.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }
  function resolvePaperRgb(el) {
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      if (!isTransparentColor(bg)) return cssColorToRgb01(bg);
      node = node.parentElement;
    }
    return SHADER_PAPER_FALLBACK;
  }

  // When an element is transparent up to the root, its visible backdrop can
  // still come from an ancestor's background-image or a covering positioned
  // layer that is a *child* of an ancestor (e.g. a hero's absolute art div) -
  // neither of which the ancestor background-COLOR walk can see. Return the
  // nearest such ancestor so we can capture it and crop, embedding the real
  // backdrop. Returns null when nothing is actually painted behind the element
  // (genuinely transparent → white is correct).
  function paintsBackdrop(node) {
    const s = getComputedStyle(node);
    if (s.backgroundImage && s.backgroundImage !== 'none') return true;
    const nr = node.getBoundingClientRect();
    for (const child of node.children) {
      const ccs = getComputedStyle(child);
      if (ccs.position !== 'absolute' && ccs.position !== 'fixed') continue;
      const paints = !isTransparentColor(ccs.backgroundColor)
        || (ccs.backgroundImage && ccs.backgroundImage !== 'none');
      if (!paints) continue;
      const cr = child.getBoundingClientRect();
      if (cr.width >= nr.width * 0.9 && cr.height >= nr.height * 0.9) return true;
    }
    return false;
  }
  function findBackdropAncestor(el) {
    let node = el.parentElement;
    while (node && node !== node.ownerDocument.documentElement) {
      if (paintsBackdrop(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Mean sRGB (0-1) of a canvas region, used as the halftone ground when the
  // backdrop was captured from an ancestor rather than read from a CSS color.
  function averageRgb01(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    let r = 0, g = 0, b = 0, n = 0;
    // Stride a few pixels for speed; exact average is unnecessary for a ground.
    for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    return n ? [r / n / 255, g / n / 255, b / n / 255] : SHADER_PAPER_FALLBACK;
  }

  // Pick the most common visible color cluster from a crop. A straight average
  // gets pulled by text and icons; the dominant bucket usually represents the
  // surface the shader should dissolve into.
  function dominantRgb01(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    const stride = Math.max(1, Math.floor((w * h) / 6000));
    const buckets = new Map();
    for (let p = 0; p < w * h; p += stride) {
      const i = p * 4;
      if (data[i + 3] < 16) continue;
      const key = (data[i] >> 4) + ',' + (data[i + 1] >> 4) + ',' + (data[i + 2] >> 4);
      const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
      buckets.set(key, bucket);
    }
    let best = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket;
    }
    return best ? [best.r / best.count / 255, best.g / best.count / 255, best.b / best.count / 255] : null;
  }

  // Average the backdrop sampled just OUTSIDE an element's rect within a larger
  // canvas. The ground tone for the dissolve must be the real backdrop, not the
  // mean of the element's own crop - averaging the crop folds in the element's
  // content (e.g. bright heading text), pulling the ground toward muddy gray.
  function sampleSurroundingRgb(ctx, sx, sy, sw, sh, W, H) {
    const pad = Math.max(2, Math.round(Math.min(sw, sh) * 0.12));
    const fx = [0.2, 0.5, 0.8].map((f) => sx + sw * f);
    const fy = [0.2, 0.5, 0.8].map((f) => sy + sh * f);
    const pts = [];
    for (const x of fx) { pts.push([x, sy - pad], [x, sy + sh + pad]); }
    for (const y of fy) { pts.push([sx - pad, y], [sx + sw + pad, y]); }
    let r = 0, g = 0, b = 0, n = 0;
    for (const [px, py] of pts) {
      const cx = Math.max(0, Math.min(W - 1, Math.round(px)));
      const cy = Math.max(0, Math.min(H - 1, Math.round(py)));
      const d = ctx.getImageData(cx, cy, 1, 1).data;
      if (d[3] === 0) continue; // outside the ancestor's paint
      r += d[0]; g += d[1]; b += d[2]; n++;
    }
    return n ? [r / n / 255, g / n / 255, b / n / 255] : null;
  }

  function compileShader(gl, type, source) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('shader compile failed: ' + info);
    }
    return sh;
  }

  function positionShaderOverlay() {
    if (!shaderState) return;
    const anchor = resolveBarAnchor();
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    Object.assign(shaderState.canvas.style, {
      top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
    });
  }

  function hideShaderOverlay() {
    if (!shaderState) return;
    if (shaderState.rafId) cancelAnimationFrame(shaderState.rafId);
    if (shaderState.canvas) shaderState.canvas.remove();
    if (shaderState.objectUrl) URL.revokeObjectURL(shaderState.objectUrl);
    const lose = shaderState.gl?.getExtension?.('WEBGL_lose_context');
    try { lose?.loseContext(); } catch {}
    shaderState = null;
  }

  function showShaderBitmapFallback(canvas, blob) {
    canvas.remove();
    const objectUrl = URL.createObjectURL(blob);
    const fallback = document.createElement('div');
    fallback.id = PREFIX + '-shader';
    // Copy positioning via cssText. Object.assign across CSSStyleDeclaration
    // throws in modern Chromium because the source's indexed properties
    // (style[0], [1], ...) are read-only and the engine forbids writing
    // them on the destination.
    fallback.style.cssText = canvas.style.cssText;
    fallback.style.backgroundImage = 'url("' + objectUrl + '")';
    fallback.style.backgroundSize = '100% 100%';
    fallback.style.backgroundRepeat = 'no-repeat';
    fallback.style.outline = '2px dashed ' + C.mark;
    fallback.style.outlineOffset = '-2px';
    uiAppend(fallback);
    shaderState = { canvas: fallback, gl: null, program: null, texture: null, rafId: 0, startTime: 0, objectUrl };
  }

  async function showShaderOverlay(el, blob, rect, paper) {
    hideShaderOverlay();
    if (!blob || !el) return;
    const canvas = document.createElement('canvas');
    canvas.id = PREFIX + '-shader';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const radius = getComputedStyle(el).borderRadius;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    Object.assign(canvas.style, {
      position: 'fixed',
      top: rect.top + 'px', left: rect.left + 'px',
      width: rect.width + 'px', height: rect.height + 'px',
      borderRadius: radius,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: Z.bar - 1,
    });
    uiAppend(canvas);

    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: false })
            || canvas.getContext('experimental-webgl');
    if (!gl) {
      // WebGL unavailable: use the captured bitmap as a background overlay so
      // the user still sees something meaningful during generation.
      showShaderBitmapFallback(canvas, blob);
      return;
    }

    let program, texture;
    try {
      const vs = compileShader(gl, gl.VERTEX_SHADER, SHADER_VS);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, SHADER_FS);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('program link failed: ' + gl.getProgramInfoLog(program));
      }
      // Full-screen quad
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 1,
         1, -1, 1, 1,
        -1,  1, 0, 0,
        -1,  1, 0, 0,
         1, -1, 1, 1,
         1,  1, 1, 0,
      ]), gl.STATIC_DRAW);
      const posLoc = gl.getAttribLocation(program, 'a_position');
      const uvLoc = gl.getAttribLocation(program, 'a_uv');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);
    } catch (err) {
      console.warn('[tcher] shader setup failed:', err);
      canvas.remove();
      return;
    }

    // Upload the screenshot as a texture
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch (err) {
      console.warn('[tcher] shader bitmap decode failed:', err);
      const lose = gl.getExtension?.('WEBGL_lose_context');
      try { lose?.loseContext(); } catch {}
      showShaderBitmapFallback(canvas, blob);
      return;
    }
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    if (bitmap.close) bitmap.close();

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uAccent = gl.getUniformLocation(program, 'u_accent');
    const uPaper = gl.getUniformLocation(program, 'u_paper');
    const uTex = gl.getUniformLocation(program, 'u_texture');
    const paperRgb = paper || resolvePaperRgb(el);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    shaderState = { canvas, gl, program, texture, rafId: 0, startTime: performance.now(), reduced };
    function frame() {
      if (!shaderState) return;
      const elapsed = (performance.now() - shaderState.startTime) / 1000;
      const t = shaderState.reduced ? 0.0 : elapsed;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTex, 0);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform3f(uAccent, SHADER_ACCENT[0], SHADER_ACCENT[1], SHADER_ACCENT[2]);
      gl.uniform3f(uPaper, paperRgb[0], paperRgb[1], paperRgb[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      shaderState.rafId = requestAnimationFrame(frame);
    }
    frame();
  }

  async function handleAccept() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    if (pendingAcceptedSession || state === 'SAVING') return;
    if (variantSelectionPromise) {
      try { await variantSelectionPromise; } catch { /* failed selection falls back below */ }
    }
    if (!currentSessionId || arrivedVariants === 0) return;
    const domVisibleVariant = readVisibleVariantFromDOM(currentSessionId);
    if (domVisibleVariant > 0) visibleVariant = domVisibleVariant;
    const acceptPayload = {
      type: 'accept',
      id: currentSessionId,
      variantId: String(visibleVariant),
      pageUrl: location.pathname,
    };
    const acceptWrapper = document.querySelector('[data-tcher-variants="' + currentSessionId + '"]');
    if (Object.keys(paramsCurrentValues).length > 0) {
      acceptPayload.paramValues = { ...paramsCurrentValues };
    }
    // The accepted variant is already the only visible child of the wrapper
    // (all other variants are display:none). HMR from the source rewrite will
    // replace the wrapper imminently. Don't eagerly replaceChild here - React
    // reconciliation races with our mutation and throws NotFoundError in Next
    // 16 / Turbopack. Schedule a fallback that runs the manual swap only if
    // HMR hasn't cleaned up by then (keeps static-server flows working).
    const acceptedSessionId = currentSessionId;
    const acceptedVariant = visibleVariant;
    const acceptedIsSvelteComponent = svelteComponentSession?.sessionId === acceptedSessionId
      || acceptWrapper?.dataset?.tcherPreview === 'svelte-component';
    const acceptedSnapshot = snapshotAcceptedVariantDom(acceptedSessionId, acceptedVariant);

    state = 'SAVING';
    updateBarContent('saving');
    pendingAcceptedSession = {
      id: acceptedSessionId,
      variant: String(acceptedVariant),
      isSvelteComponent: acceptedIsSvelteComponent,
      ...acceptedSnapshot,
      finalizing: false,
    };
    saveSession();

    sendEvent(acceptPayload, { throwOnError: true })
      .then(() => {})
      .catch(() => {
        if (pendingAcceptedSession?.id === acceptedSessionId) pendingAcceptedSession = null;
        state = 'CYCLING';
        showOrUpdateCyclingBar();
        showToast('Could not confirm accept with the live server. Session kept for recovery; try Accept again.', 5000);
      });
  }

  function maybeCompleteAcceptedSession(msg) {
    const pending = pendingAcceptedSession;
    if (!pending || !msg?.id || msg.id !== pending.id) return false;
    if (currentSessionId && currentSessionId !== pending.id) {
      pendingAcceptedSession = null;
      return false;
    }
    if (pending.finalizing) return true;
    pending.finalizing = true;
    markSessionHandled();
    if (pending.isSvelteComponent) {
      commitAcceptedSvelteComponentToDom(pending.id);
    }
    state = 'CONFIRMED';
    updateBarContent('confirmed');
    scheduleAcceptCleanup(pending);
    return true;
  }

  function scheduleAcceptCleanup(accepted) {
    setTimeout(function() {
      if (!accepted?.isSvelteComponent) ensureAcceptedDomClean(accepted);
      cleanupAcceptedSession();
    }, 1200);
  }

  function snapshotAcceptedVariantDom(sessionId, variantId) {
    const wrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
    const accepted = wrapper?.querySelector?.('[data-tcher-variant="' + variantId + '"]');
    const root = accepted?.firstElementChild || null;
    return {
      acceptedHtml: accepted ? accepted.innerHTML : '',
      acceptedSelector: selectorForAcceptedRoot(root),
      parentElement: wrapper?.parentElement || null,
      parentSelector: selectorForAcceptedRoot(wrapper?.parentElement || null),
      nextSibling: wrapper?.nextSibling || null,
    };
  }

  function selectorForAcceptedRoot(root) {
    if (!root || !root.tagName) return '';
    const tag = root.tagName.toLowerCase();
    const classes = [...(root.classList || [])].filter(Boolean);
    if (classes.length === 0) return tag;
    return tag + classes.map((cls) => '.' + cssIdent(cls)).join('');
  }

  function acceptedDomAlreadyClean(pending) {
    if (!pending?.acceptedSelector) return false;
    const matches = [...document.querySelectorAll(pending.acceptedSelector)];
    return matches.some((el) => !el.closest('[data-tcher-variants],[data-tcher-variant]'));
  }

  function ensureAcceptedDomClean(pending) {
    const sessionId = pending?.id;
    const variantId = pending?.variant;
    const wrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
    const accepted = wrapper?.querySelector?.('[data-tcher-variant="' + variantId + '"]');
    if (!wrapper) {
      restoreAcceptedDomFromSnapshot(pending);
      return;
    }
    if (!accepted) {
      wrapper.remove();
      restoreAcceptedDomFromSnapshot(pending);
      return;
    }
    const parent = wrapper.parentElement;
    if (!parent) return;
    while (accepted.firstChild) {
      parent.insertBefore(accepted.firstChild, wrapper);
    }
    wrapper.remove();
  }

  function restoreAcceptedDomFromSnapshot(pending) {
    if (acceptedDomAlreadyClean(pending)) return;
    if (!pending?.acceptedHtml) {
      reloadAfterMissingAcceptedDom(pending);
      return;
    }
    const parent = pending.parentElement?.isConnected
      ? pending.parentElement
      : (pending.parentSelector ? document.querySelector(pending.parentSelector) : null);
    if (!parent) {
      reloadAfterMissingAcceptedDom(pending);
      return;
    }
    const template = document.createElement('template');
    template.innerHTML = pending.acceptedHtml;
    const anchor = pending.nextSibling?.isConnected && pending.nextSibling.parentElement === parent
      ? pending.nextSibling
      : null;
    parent.insertBefore(template.content, anchor);
    if (!acceptedDomAlreadyClean(pending)) reloadAfterMissingAcceptedDom(pending);
  }

  function reloadAfterMissingAcceptedDom(pending) {
    if (acceptedDomAlreadyClean(pending)) return;
    if (pending?.id && document.querySelector('[data-tcher-variants="' + pending.id + '"]')) return;
    location.reload();
  }

  function cleanupAcceptedSession() {
    hideBar();
    hideHighlight();
    stopScrollTracking();
    if (variantObserver) { variantObserver.disconnect(); variantObserver = null; }
    stopScrollLock();
    clearScrollY();
    clearSession();
    resetSessionFileMeta();
    selectedElement = null;
    currentSessionId = null;
    selectedAction = 'tcher';
    pendingAcceptedSession = null;
    renderEditBadge('hidden');
    state = 'PICKING';
  }

  function commitAcceptedVariantToDom(sessionId, variantId) {
    const wrapper = document.querySelector('[data-tcher-variants="' + sessionId + '"]');
    if (!wrapper) return false;
    const accepted = wrapper.querySelector('[data-tcher-variant="' + variantId + '"]');
    if (!accepted || !accepted.firstElementChild) return false;
    const parent = wrapper.parentElement;
    if (!parent) return false;

    const style = wrapper.querySelector('style[data-tcher-css]');
    if (style && !document.querySelector('style[data-tcher-accepted-css="' + sessionId + '"]')) {
      const promotedStyle = style.cloneNode(true);
      promotedStyle.setAttribute('data-tcher-accepted-css', sessionId);
      parent.insertBefore(promotedStyle, wrapper);
    }

    const committed = accepted.cloneNode(true);
    committed.removeAttribute('hidden');
    committed.style.display = 'contents';
    parent.replaceChild(committed, wrapper);
    return true;
  }

  function handleDiscard() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    if (!currentSessionId) return;
    sendEvent({ type: 'discard', id: currentSessionId }, { throwOnError: true })
      .then(() => {
        markSessionHandled();
        cleanup();
      })
      .catch(() => showToast('Could not confirm discard with the live server. Session kept for recovery.', 5000));
  }

  //
  // Session persistence via live-browser-session.js
  //
  // Survives page reloads, browser close/reopen, HMR, and accidental refreshes.

  function normalizeSessionPath(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.replace(/\\/g, '/') : null;
  }

  function resetSessionFileMeta() {
    currentSourceFile = null;
    currentPreviewFile = null;
    currentPreviewMode = null;
    recoveryWaitingForAnchor = false;
  }

  function rememberSessionFileMeta(meta = {}) {
    const file = normalizeSessionPath(meta.file);
    const sourceFile = normalizeSessionPath(meta.sourceFile);
    const previewFile = normalizeSessionPath(meta.previewFile);
    const previewMode = meta.previewMode || (isSvelteComponentManifestPath(previewFile || file) ? 'svelte-component' : null);

    if (previewMode === 'svelte-component' || isSvelteComponentManifestPath(file)) {
      currentPreviewMode = 'svelte-component';
      currentPreviewFile = previewFile || (isSvelteComponentManifestPath(file) ? file : currentPreviewFile);
      currentSourceFile = sourceFile || currentSourceFile;
      return;
    }

    if (sourceFile || file) currentSourceFile = sourceFile || file;
    if (previewFile) currentPreviewFile = previewFile;
    if (previewMode) currentPreviewMode = previewMode;
  }

  function applySavedSessionMeta(saved) {
    if (!saved) return;
    rememberSessionFileMeta(saved);
    if (saved.insertPlaceholder) insertPlaceholderSnapshot = saved.insertPlaceholder;
    if (saved.action) selectedAction = saved.action;
    if (saved.count) selectedCount = saved.count;
    if (saved.previewMode) currentPreviewMode = saved.previewMode;
    if (saved.paramValues && typeof saved.paramValues === 'object') {
      paramsCurrentValues = { ...saved.paramValues };
    }
  }

  function normalizePagePath(value) {
    if (!value || typeof value !== 'string') return null;
    try {
      return new URL(value, location.origin).pathname;
    } catch {
      return value.split(/[?#]/)[0] || null;
    }
  }

  function pageMatchesCurrent(value) {
    const path = normalizePagePath(value);
    return !path || path === location.pathname;
  }

  function isTerminalSessionSummary(session) {
    return /^(completed|discarded|discard_requested|accept_requested)$/.test(String(session?.phase || ''));
  }

  function findActiveSessionSummary(saved, activeSessions) {
    if (!saved?.id || !Array.isArray(activeSessions)) return null;
    return activeSessions.find((session) =>
      session?.id === saved.id
      && pageMatchesCurrent(session.pageUrl || saved.pageUrl)
      && !isTerminalSessionSummary(session)
    ) || null;
  }

  function clampVariantIndex(value, count) {
    const num = Number(value);
    const max = Number(count);
    if (!Number.isFinite(num) || num < 1) return 0;
    if (Number.isFinite(max) && max > 0 && num > max) return 0;
    return Math.floor(num);
  }

  function restoreSessionWithoutWrapper(reason, activeSessions) {
    const saved = loadSession();
    if (!saved?.id || isSessionHandled(saved.id)) return false;
    const savedState = String(saved.state || '').toUpperCase();
    if (savedState !== 'GENERATING' && savedState !== 'CYCLING') return false;

    const serverSession = findActiveSessionSummary(saved, activeSessions);
    if (Array.isArray(activeSessions) && activeSessions.length > 0 && !serverSession) {
      return false;
    }

    currentSessionId = saved.id;
    applySavedSessionMeta(serverSession);
    applySavedSessionMeta(saved);

    expectedVariants = Number(saved.expected || serverSession?.expectedVariants || selectedCount || 0);
    arrivedVariants = Number(saved.arrived || serverSession?.arrivedVariants || 0);
    if (arrivedVariants <= 0 && currentPreviewFile) arrivedVariants = Number(serverSession?.expectedVariants || saved.expected || selectedCount || 0);
    if (expectedVariants <= 0) expectedVariants = Number(serverSession?.expectedVariants || arrivedVariants || selectedCount || 0);
    visibleVariant = clampVariantIndex(saved.visible, arrivedVariants || expectedVariants)
      || clampVariantIndex(serverSession?.visibleVariant, arrivedVariants || expectedVariants)
      || (arrivedVariants > 0 ? 1 : 0);

    selectedElement = document.body;
    state = 'GENERATING';
    recoveryWaitingForAnchor = true;
    showBar('generating');
    startScrollTracking();
    if (variantObserver) variantObserver.disconnect();
    variantObserver = startVariantObserver(currentSessionId);
    saveSession();
    queueCheckpoint(reason || 'browser_restore_without_wrapper');

    const restoreFile = currentPreviewMode === 'svelte-component'
      ? currentPreviewFile
      : (currentSourceFile || currentPreviewFile);
    if (restoreFile) {
      injectVariantsFromSource(restoreFile, currentSessionId);
      return true;
    }

    showToast('Variants ready. Reveal the selected element to resume.', 15000);
    return true;
  }

  function restoreFromActiveSessions(activeSessions, reason) {
    const wrapper = document.querySelector('[data-tcher-variants]');
    if (wrapper && wrapper.dataset.tcherPreview !== 'svelte-component') return false;
    if (svelteComponentSession?.sessionId === currentSessionId) return false;
    return restoreSessionWithoutWrapper(reason || 'sse_connected', activeSessions);
  }

  function saveSession() {
    if (!currentSessionId) return;
    // NOTE: scrollY is stored under a separate key (writeScrollY). Storing
    // it here would overwrite the Go-time value every time state changes.
    sessionState.saveSession({
      id: currentSessionId,
      state,
      action: selectedAction,
      count: selectedCount,
      expected: expectedVariants,
      arrived: arrivedVariants,
      visible: visibleVariant,
      sourceFile: currentSourceFile || undefined,
      previewFile: currentPreviewFile || undefined,
      previewMode: currentPreviewMode || undefined,
      pageUrl: location.pathname,
      paramValues: { ...paramsCurrentValues },
      insertPlaceholder: insertPlaceholderSnapshot || undefined,
    });
  }

  function loadSession() {
    return sessionState.loadSession();
  }

  function clearSession() {
    sessionState.clearSession();
  }

  /** Mark session as handled (accepted/discarded). The agent will clean up
   *  the source, but until it does the wrapper is still in the HTML. This
   *  prevents resumeSession from picking it up again after reload. */
  function markSessionHandled() {
    if (!currentSessionId) return;
    sessionState.markHandled(currentSessionId);
  }

  function isSessionHandled(id) {
    return sessionState.isHandled(id);
  }

  function clearHandled() {
    sessionState.clearHandled();
  }

  function cleanup() {
    const cleanupSessionId = currentSessionId;
    if (svelteComponentSession?.sessionId === cleanupSessionId) {
      teardownSvelteComponentSession(true);
    } else if (cleanupSessionId) {
      // Hide the wrapper immediately so variants disappear. DON'T structurally
      // mutate the DOM yet - HMR from the agent's source rewrite is on its way,
      // and a manual replaceChild under React causes NotFoundError when the
      // reconciler later tries to remove a wrapper we already removed.
      // Schedule a 2s fallback that does the manual swap only if HMR hasn't
      // replaced the wrapper by then (keeps static-server / no-HMR flows alive).
      const wrapper = document.querySelector('[data-tcher-variants="' + cleanupSessionId + '"]');
      if (wrapper) wrapper.style.display = 'none';
      setTimeout(function() {
        if (!cleanupSessionId) return;
        const lateWrapper = document.querySelector('[data-tcher-variants="' + cleanupSessionId + '"]');
        if (!lateWrapper) return;
        const orig = lateWrapper.querySelector('[data-tcher-variant="original"]');
        if (orig) {
          const content = orig.firstElementChild;
          if (content) {
            lateWrapper.parentElement.replaceChild(content, lateWrapper);
            return;
          }
        }
        lateWrapper.remove();
      }, 2000);
    }
    hideBar();
    hideHighlight();
    stopScrollTracking();
    if (variantObserver) { variantObserver.disconnect(); variantObserver = null; }
    stopScrollLock();
    clearScrollY();
    finalizeInsertSession();
    clearSession();
    resetSessionFileMeta();
    selectedElement = null;
    currentSessionId = null;
    selectedAction = 'tcher';
    renderEditBadge('hidden');
    state = 'PICKING';
  }

  //
  // Toast
  //

  function showToast(message, duration) {
    if (toastEl) toastEl.remove();
    // Stack the toast above the global bar (which sits at bottom:14px) so
    // the two never overlap. Read the bar's actual rect - its height varies
    // with hover-expanded labels - and fall back to a sensible default
    // when the bar isn't mounted yet.
    const toastBottom = () => {
      const barRect = globalBarEl?.getBoundingClientRect();
      // When the bar hasn't mounted/laid out yet (early boot toasts), fall
      // back to a height that clears a typical bar (bottom 14 + ~44 + gap)
      // instead of 16px, which sat exactly on top of the pill.
      return barRect && barRect.height > 0
        ? Math.max(16, window.innerHeight - barRect.top + 12)
        : 72;
    };
    toastEl = el('div', {
      position: 'fixed', bottom: toastBottom() + 'px', left: '50%',
      transform: 'translateX(-50%) translateY(8px)',
      background: C.ink, color: C.white,
      fontFamily: FONT, fontSize: '12px',
      padding: '8px 16px', borderRadius: '8px',
      zIndex: Z.toast, opacity: '0',
      transition: 'opacity 0.25s ' + EASE + ', transform 0.25s ' + EASE,
      // Wide enough that the common one-sentence toasts (e.g. the missing
      // PRODUCT.md notice) stay on a single line; very long errors still wrap.
      pointerEvents: 'none', maxWidth: 'min(680px, calc(100vw - 24px))', textAlign: 'center',
    });
    toastEl.id = PREFIX + '-toast';
    toastEl.textContent = message;
    uiAppend(toastEl);
    const repositionToast = () => { if (toastEl) toastEl.style.bottom = toastBottom() + 'px'; };
    requestAnimationFrame(() => {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateX(-50%) translateY(0)';
      repositionToast();
    });
    // The global bar can mount a beat after an early boot toast; re-anchor
    // once it has real geometry so the toast never overlaps the pill.
    setTimeout(repositionToast, 300);
    setTimeout(() => {
      if (toastEl) {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateX(-50%) translateY(8px)';
        setTimeout(() => { if (toastEl) { toastEl.remove(); toastEl = null; } }, 250);
      }
    }, duration);
  }

  //
  // Init
  //

  // Resume an active variant session after HMR/page reload.
  // If a [data-tcher-variants] wrapper exists in the DOM, the agent wrote
  // variants before HMR fired. Pick up where we left off.
  function resumeSession() {
    const wrapper = document.querySelector('[data-tcher-variants]');
    if (!wrapper) {
      if (restoreSessionWithoutWrapper('browser_resumed_without_wrapper')) return true;
      clearSession();
      clearHandled();
      return false;
    }

    const sessionId = wrapper.dataset.tcherVariants;

    // Don't resume if this session was already accepted/discarded
    if (isSessionHandled(sessionId)) return false;

    // Svelte component sessions can't be resumed by counting DOM children: the
    // wrapper holds a single mount target, not [data-tcher-variant] nodes,
    // and a page reload unmounts every compiled variant. Counting children here
    // would strand the bar in CYCLING at 0/0. If there's no live in-memory mount
    // for this wrapper, it's an orphan (reload / failed mount): drop it and let
    // the live-server's SSE re-inject the manifest if the session is still live.
    if (wrapper.dataset.tcherPreview === 'svelte-component'
        && svelteComponentSession?.sessionId !== sessionId) {
      wrapper.remove();
      if (restoreSessionWithoutWrapper('browser_resumed_svelte_orphan_wrapper')) return true;
      clearSession();
      clearHandled();
      return false;
    }

    if (wrapper.dataset.tcherPreview === 'svelte-component') {
      if (!(svelteComponentSession?.mountedVariant > 0)) {
        // The in-memory session matches this wrapper but nothing is mounted:
        // the initial mount failed or was torn down. Returning "handled"
        // here used to strand the bar (CYCLING 0/0, issue-150 handoff);
        // abort instead, which restores the original element, clears the
        // session, and resets to PICKING.
        abortSvelteComponentInjection(sessionId, 'Live variants could not be restored. Pick the element again.');
        return true;
      }
      currentSessionId = sessionId;
      expectedVariants = Number(wrapper.dataset.tcherVariantCount)
        || Number(svelteComponentSession.manifest?.count)
        || expectedVariants
        || 1;
      arrivedVariants = expectedVariants;
      const saved = loadSession();
      applySavedSessionMeta(saved);
      const savedVisibleVariant = saved && saved.id === sessionId ? saved.visible : 0;
      visibleVariant = svelteComponentSession.mountedVariant > 0 && svelteComponentSession.mountedVariant <= arrivedVariants
        ? svelteComponentSession.mountedVariant
        : (savedVisibleVariant > 0 && savedVisibleVariant <= arrivedVariants ? savedVisibleVariant : 1);
      selectedElement = resolveSvelteComponentAnchor()
        || wrapper.parentElement;
      state = 'CYCLING';
      hideShaderOverlay();
      showBar('cycling');
      startScrollTracking();
      refreshParamsPanel();
      saveSession();
      queueCheckpoint('browser_resumed_svelte_component');
      return true;
    }

    currentSessionId = sessionId;
    expectedVariants = parseInt(wrapper.dataset.tcherVariantCount || '0');
    const variants = wrapper.querySelectorAll('[data-tcher-variant]:not([data-tcher-variant="original"])');
    arrivedVariants = variants.length;

    // Restore state from localStorage if available
    const saved = loadSession();
    if (saved && saved.id === sessionId) {
      applySavedSessionMeta(saved);
      visibleVariant = (saved.visible > 0 && saved.visible <= arrivedVariants) ? saved.visible : (arrivedVariants > 0 ? 1 : 0);
      if (saved.action) selectedAction = saved.action;
      if (saved.count) selectedCount = saved.count;
    } else {
      visibleVariant = arrivedVariants > 0 ? 1 : 0;
    }

    if (saved && saved.id === sessionId && saved.insertPlaceholder) {
      insertPlaceholderSnapshot = saved.insertPlaceholder;
    }

    const resumedState = arrivedVariants >= expectedVariants ? 'CYCLING' : 'GENERATING';

    // Find the visible variant's content element for highlight positioning.
    const isInsert = wrapper.dataset.tcherMode === 'insert';
    const visEl = visibleVariant > 0 ? pickVariantContent(wrapper, visibleVariant) : null;
    const origEl = pickVariantContent(wrapper, 'original');
    state = resumedState;
    if (isInsert && resumedState === 'GENERATING' && arrivedVariants === 0) {
      selectedElement = ensureInsertPlaceholder() || findInsertAnchorInDom() || wrapper;
    } else {
      selectedElement = visEl || origEl || (isInsert ? findInsertAnchorInDom() : null) || wrapper.parentElement;
    }

    // Set display state BEFORE starting observer (avoid triggering it)
    if (visibleVariant > 0) showVariantInDOM(currentSessionId, visibleVariant);

    showBar(state === 'CYCLING' ? 'cycling' : 'generating');
    startScrollTracking();
    // Build the params panel for the restored visible variant. Previously
    // this was missed on page-reload resume: showVariantInDOM above fires
    // refreshParamsPanel, but state was still IDLE at that moment so it
    // hid. Now that state is CYCLING, re-fire.
    if (state === 'CYCLING') refreshParamsPanel();
    saveSession();
    queueCheckpoint('browser_resumed');

    // Start observing for more variants AFTER initial setup
    if (variantObserver) variantObserver.disconnect();
    variantObserver = startVariantObserver(currentSessionId);

    // Hold the target at its saved viewport top through any subsequent
    // HMR patches, variant inserts, or cycle swaps.
    startScrollLock(currentSessionId, readScrollY());

    // If we reloaded mid-generation (Bun's HTML HMR destroys the shader
    // canvas), re-capture the original's content and restart the shader so
    // the wait doesn't go dead.
    if (state === 'GENERATING') {
      const shaderTarget = isInsert
        ? (ensureInsertPlaceholder() || findInsertAnchorInDom())
        : origEl;
      if (shaderTarget) {
        (async () => {
          try {
            const rect = shaderTarget.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const { blob, paper } = await captureElementToBlob(shaderTarget);
            if (blob && state === 'GENERATING') {
              showShaderOverlay(shaderTarget, blob, rect, paper);
            }
          } catch (err) {
            console.warn('[tcher] shader resume failed:', err);
          }
        })();
      }
    }
    return true;
  }

  //
  // Global bar (always visible at bottom)
  //

  let globalBarEl = null;
  let globalBarBrandEl = null;
  let agentPollTooltipEl = null;
  let agentPollingConnected = false;
  let agentStatusPollTimer = null;
  let steerFocusSuspended = false;
  let steerFocusPauseUntil = 0;
  let pagePointerGesture = null;
  let pagePickSkipClick = false;
  let steerFocusRecoverTimer = null;
  const STEER_PAGE_FOCUS_PAUSE_MS = 500;
  let detectActive = false;
  let detectScanSeq = 0;
  let activeDetectScanId = null;
  let pendingDetectScanId = null;
  const DETECT_EMPTY_MESSAGE = 'No detector issues found.';
  const PICK_PREFS_KEY = 'tcher-live-pick';
  const INTERACTION_PREFS_KEY = 'tcher-live-interaction';
  const PLACEHOLDER_DEFAULT_HEIGHT = 80;
  const PLACEHOLDER_MIN_HEIGHT = 48;
  const PLACEHOLDER_MIN_WIDTH = 120;

  function loadInteractionPrefs() {
    try {
      const raw = localStorage.getItem(INTERACTION_PREFS_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);
        return {
          pickActive: !!prefs.pickActive,
          insertActive: !!prefs.insertActive,
        };
      }
      const legacy = localStorage.getItem(PICK_PREFS_KEY);
      if (legacy) {
        const prefs = JSON.parse(legacy);
        return { pickActive: !!prefs.pickActive, insertActive: false };
      }
    } catch { /* ignore */ }
    return { pickActive: false, insertActive: false };
  }

  function saveInteractionPrefs() {
    try {
      localStorage.setItem(INTERACTION_PREFS_KEY, JSON.stringify({ pickActive, insertActive }));
    } catch { /* ignore */ }
  }

  function loadPickPref() {
    return loadInteractionPrefs().pickActive;
  }

  function savePickPref() {
    saveInteractionPrefs();
  }

  let pickActive = loadInteractionPrefs().pickActive;
  let insertActive = loadInteractionPrefs().insertActive;
  let configureKind = 'replace';
  let insertLineEl = null;
  let insertHoverAnchor = null;
  let insertHoverPosition = null;
  let insertHoverAxis = null;
  let insertAnchorElement = null;
  let insertAnchorPosition = null;
  let insertAnchorLayoutAxis = null;
  let insertPlaceholderSnapshot = null;
  let placeholderElement = null;
  let detectCount = 0;
  let detectScriptLoaded = false;
  let pendingDockEl = null;
  let pendingPillEl = null;
  let pendingPillSpinnerEl = null;
  let pendingPillLabelEl = null;
  let pendingPillCountEl = null;
  let pendingTrashBtn = null;
  let pendingKeepFixingBtn = null;
  let pendingRollbackBtn = null;
  let pendingDockResizeObserver = null;
  let pendingIntroAnimation = null;
  let pendingApplyInFlight = false;
  let firstSaveOfSession = true;

  // Steer - collapsed pill in the global bar; expands while typing for page-level chat.
  let pageChatEl = null;
  let pageChatInput = null;
  let pageChatHint = null;
  let pageChatExpanded = false;
  let steerLocked = false;
  let steerRequestId = null;
  let steerPendingMessage = '';
  let steerInputWasFocused = false;
  let pageChatDotsEl = null;
  let steerAwaitTimer = null;
  const PAGE_CHAT_COLLAPSED_W = '112px';
  const PAGE_CHAT_PROCESSING_W = '76px';
  const STEER_AWAIT_TIMEOUT_MS = 120000;
  const AGENT_STATUS_POLL_MS = 5000;
  const AGENT_DISCONNECTED_MARK = 'oklch(56% 0 0 / 0.78)';
  const AGENT_DISCONNECTED_TIP = 'Agent disconnected - run live-poll.mjs to connect';
  const GLOBAL_BAR_SECTION_GAP = 8;
  const GLOBAL_BAR_INNER_GAP = 2;
  const GLOBAL_BAR_INNER_PAD_LEFT = 2;
  const PAGE_CHAT_EXPANDED_W = 'min(280px, 38vw)';
  const ICON_PAGE_CHAT =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.7134 8.12811L20.4668 8.69379C20.2864 9.10792 19.7136 9.10792 19.5331 8.69379L19.2866 8.12811C18.8471 7.11947 18.0555 6.31641 17.0677 5.87708L16.308 5.53922C15.8973 5.35653 15.8973 4.75881 16.308 4.57612L17.0252 4.25714C18.0384 3.80651 18.8442 2.97373 19.2761 1.93083L19.5293 1.31953C19.7058 0.893489 20.2942 0.893489 20.4706 1.31953L20.7238 1.93083C21.1558 2.97373 21.9616 3.80651 22.9748 4.25714L23.6919 4.57612C24.1027 4.75881 24.1027 5.35653 23.6919 5.53922L22.9323 5.87708C21.9445 6.31641 21.1529 7.11947 20.7134 8.12811ZM10 3H14V5H10C6.68629 5 4 7.68629 4 11C4 14.61 6.46208 16.9656 12 19.4798V17H14C17.3137 17 20 14.3137 20 11H22C22 15.4183 18.4183 19 14 19V22.5C9 20.5 2 17.5 2 11C2 6.58172 5.58172 3 10 3Z"/></svg>';

  // Theme-aware color palette for the global bar. We detect the page's
  // ambient background and invert - dark bar on light pages, light bar on
  // dark pages. This keeps the bar from fighting with the host design.
  function detectPageTheme() {
    try {
      // Dev override: set localStorage 'tcher-dev-theme' to 'light' or
      // 'dark' to preview the opposite palette without actually changing the
      // page bg. Used for screenshots and theme QA.
      const override = localStorage.getItem('tcher-dev-theme');
      if (override === 'light' || override === 'dark') return override;

      // Walk body → html, taking the first opaque background. The browser's
      // default body / html background is `rgba(0, 0, 0, 0)`, which a naive
      // regex would read as black and mislabel a perfectly white page as
      // dark. Honoring alpha avoids that - and falling through to <html>
      // catches the common pattern of a bg only on <html> (or only on body).
      function readOpaque(el) {
        if (!el) return null;
        const bg = getComputedStyle(el).backgroundColor;
        const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
        if (!m) return null;
        const alpha = m[4] == null ? 1 : parseFloat(m[4]);
        if (alpha < 0.5) return null; // transparent / nearly transparent → skip
        return [+m[1], +m[2], +m[3]];
      }

      const rgb = readOpaque(document.body) || readOpaque(document.documentElement);
      // Both transparent → fall back to the browser's effective canvas color.
      // White is the universal default; only one in a thousand sites swaps it
      // via `color-scheme: dark` on <html>, and `prefers-color-scheme` lets
      // us catch that case.
      if (!rgb) {
        return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      const [r, g, b] = rgb;
      // Perceptual luminance (Rec. 709)
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return L > 0.55 ? 'light' : 'dark';
    } catch { return 'light'; }
  }

  function barPaletteForTheme(_theme) {
    // Picker chrome always uses tcher-kit mono styling, regardless of host
    // page light/dark theme: deep black surface, white accents, gray states.
    return {
      surface: C.ink,
      surfaceDeep: C.ink,
      // Quiet neutral hairline; the bright accent lives on the brand mark
      // and the active control instead of the container outline.
      border: 'oklch(92% 0 0 / 0.13)',
      // Crisp graphite pill behind the active toggle; the white text/icon
      // carries the "selected" signal.
      toggleActive: 'oklch(27% 0 0)',
      // Neutral hairline for internal control borders / dividers.
      hairline: 'oklch(92% 0 0 / 0.12)',
      text: 'oklch(92% 0 0)',
      textDim: 'oklch(63% 0 0)',
      accent: C.brand,
      accentSoft: C.brandSoft,
      exitHover: 'oklch(98% 0 0 / 0.14)',
      shadow: PICKER_SHADOW,
      chatSurface: 'oklch(20% 0 0)',
      // Secondary "processing / steer" state - mid gray (was verdigris patina).
      patina: 'oklch(75% 0 0)',
      patinaPale: 'oklch(88% 0 0)',
      patinaSoft: 'oklch(75% 0 0 / 0.28)',
    };
  }

  function pageChatPalette() {
    return barPaletteForTheme(globalBarEl?.dataset.theme || detectPageTheme());
  }

  function syncPageChatChrome() {
    if (!pageChatEl) return;
    const P = pageChatPalette();
    pageChatEl.style.background = P.chatSurface;
    pageChatEl.style.borderColor = steerLocked
      ? P.patinaSoft
      : (pageChatExpanded ? P.accentSoft : P.hairline);
    if (pageChatHint) pageChatHint.style.color = steerLocked ? P.patinaPale : P.textDim;
    const chatIcon = pageChatEl?.firstElementChild;
    if (chatIcon) chatIcon.style.color = steerLocked ? P.patinaPale : P.textDim;
    if (pageChatInput) pageChatInput.style.color = P.text;
  }

  function syncPageChatVisual() {
    if (!pageChatInput || steerLocked) return;
    const hasText = pageChatInput.value.length > 0;
    if (hasText && !pageChatExpanded) expandPageChat({ focus: false });
    else if (!hasText && pageChatExpanded) collapsePageChat();
  }

  function shouldFocusSteerChat() {
    return state !== 'CONFIGURING'
      && state !== 'EDITING'
      && !steerLocked;
  }

  function pageHasHostTextSelection() {
    const sel = window.getSelection?.();
    if (!sel || sel.isCollapsed) return false;
    if (!(sel.toString() || '').trim()) return false;
    const node = sel.anchorNode;
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    if (el && own(el)) return false;
    return true;
  }

  function shouldSteerAutoFocus() {
    return shouldFocusSteerChat()
      && !steerFocusSuspended
      && performance.now() >= steerFocusPauseUntil;
  }

  function clearSteerFocusRecoverTimer() {
    if (steerFocusRecoverTimer) {
      clearTimeout(steerFocusRecoverTimer);
      steerFocusRecoverTimer = null;
    }
  }

  function scheduleSteerFocusRecover(reason) {
    clearSteerFocusRecoverTimer();
    const attempt = () => {
      steerFocusRecoverTimer = null;
      if (state === 'CONFIGURING' || steerLocked) return;
      if (pageChatEl?.contains(activeElementDeep())) return;
      if (pageHasHostTextSelection()) {
        steerFocusRecoverTimer = setTimeout(attempt, 120);
        return;
      }
      const pauseLeft = steerFocusPauseUntil - performance.now();
      if (pauseLeft > 0) {
        steerFocusRecoverTimer = setTimeout(attempt, pauseLeft);
        return;
      }
      if (!shouldFocusSteerChat()) return;
      syncPageChatFocus(reason);
    };
    steerFocusRecoverTimer = setTimeout(attempt, 0);
  }

  function notePagePointerDown(e) {
    if (!shouldFocusSteerChat() || own(e.target)) return;
    steerFocusSuspended = true;
    steerFocusPauseUntil = performance.now() + STEER_PAGE_FOCUS_PAUSE_MS;
    pagePointerGesture = { x: e.clientX, y: e.clientY, dragged: false };
    if (pageChatInput && activeElementDeep() === pageChatInput) {
      pageChatInput.blur();
    }
  }

  function attachSteerFocusGuard() {
    if (window.__TCHER_STEER_FOCUS_GUARD__) return;
    window.__TCHER_STEER_FOCUS_GUARD__ = true;

    document.addEventListener('mousedown', (e) => {
      notePagePointerDown(e);
    }, true);

    document.addEventListener('mousemove', (e) => {
      if (!pagePointerGesture || pagePointerGesture.dragged) return;
      const dx = e.clientX - pagePointerGesture.x;
      const dy = e.clientY - pagePointerGesture.y;
      if (Math.hypot(dx, dy) > 4) pagePointerGesture.dragged = true;
    }, true);

    document.addEventListener('mouseup', () => {
      if (!shouldFocusSteerChat()) return;
      pagePickSkipClick = !!(pagePointerGesture?.dragged || pageHasHostTextSelection());
      if (pageHasHostTextSelection()) {
        steerFocusSuspended = true;
      } else {
        steerFocusSuspended = false;
        scheduleSteerFocusRecover('page-mouseup-recover');
      }
      pagePointerGesture = null;
    }, true);

    document.addEventListener('selectionchange', () => {
      if (!shouldFocusSteerChat()) return;
      const wasSuspended = steerFocusSuspended;
      steerFocusSuspended = pageHasHostTextSelection();
      if (wasSuspended && !steerFocusSuspended) {
        scheduleSteerFocusRecover('selection-cleared');
      }
    });
  }

  function steerFocusTargetLabel(el) {
    if (!el || el === document.body) return 'body';
    if (el === document.documentElement) return 'html';
    if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
    return el.tagName?.toLowerCase() || String(el);
  }

  function steerFocusDebugEnabled() {
    try { return localStorage.getItem('tcher-steer-debug') === '1'; } catch { return false; }
  }

  function steerFocusLog(reason, extra) {
    if (!steerFocusDebugEnabled()) return;
    console.log('[tcher.steer]', reason, {
      state,
      pickActive,
      pageChatReady: !!pageChatInput,
      pageChatExpanded,
      active: steerFocusTargetLabel(activeElementDeep()),
      shouldSteer: shouldFocusSteerChat(),
      ...(extra || {}),
    });
  }

  function attachSteerFocusDebug() {
    if (!steerFocusDebugEnabled()) return;
    if (window.__TCHER_STEER_FOCUS_DEBUG__) return;
    window.__TCHER_STEER_FOCUS_DEBUG__ = true;
    document.addEventListener('focusin', (e) => {
      if (!pageChatInput) return;
      steerFocusLog('focusin', { target: steerFocusTargetLabel(e.target) });
    }, true);
  }

  function focusConfigureInput(reason) {
    steerFocusLog('focusConfigureInput', { reason });
    const inputId = configureKind === 'insert' ? PREFIX + '-insert-input' : PREFIX + '-input';
    const input = uiGetById(inputId);
    if (!input) {
      steerFocusLog('focusConfigureInput missing', { reason });
      return;
    }
    setTimeout(() => {
      const before = activeElementDeep();
      input.focus();
      steerFocusLog('focusConfigureInput result', {
        reason,
        before: steerFocusTargetLabel(before),
        after: steerFocusTargetLabel(activeElementDeep()),
        stuck: activeElementDeep() !== input,
      });
    }, 60);
  }

  function syncPageChatFocusRing() {
    if (!pageChatEl || !pageChatInput) return;
    const focused = activeElementDeep() === pageChatInput;
    pageChatEl.dataset.inputFocused = focused ? 'true' : 'false';
    const P = pageChatPalette();
    pageChatEl.style.borderColor = steerLocked
      ? P.patinaSoft
      : (pageChatExpanded ? P.accentSoft : P.hairline);
    pageChatEl.style.boxShadow = 'none';
    if (pageChatHint) {
      pageChatHint.style.color = steerLocked
        ? P.patinaPale
        : ((!pageChatExpanded && focused) ? P.patinaPale : P.textDim);
    }
    if (!pageChatExpanded) {
      pageChatInput.style.width = '0';
      pageChatInput.style.padding = '0';
      pageChatInput.style.opacity = '0';
      pageChatInput.style.pointerEvents = focused ? 'auto' : 'none';
      if (pageChatHint) pageChatHint.style.visibility = '';
    }
  }

  function focusSteerChat(reason) {
    steerFocusLog('focusSteerChat called', { reason });
    if (!pageChatInput || !shouldSteerAutoFocus()) {
      steerFocusLog('focusSteerChat skipped', {
        reason,
        hasInput: !!pageChatInput,
        shouldSteer: shouldFocusSteerChat(),
        suspended: steerFocusSuspended,
      });
      return;
    }
    syncPageChatVisual();
    pageChatInput.style.pointerEvents = 'auto';
    const before = activeElementDeep();
    try { window.focus(); } catch { /* embed may block */ }
    try { pageChatInput.focus({ preventScroll: true }); } catch { pageChatInput.focus(); }
    syncPageChatFocusRing();
    steerFocusLog('focusSteerChat result', {
      reason,
      before: steerFocusTargetLabel(before),
      after: steerFocusTargetLabel(activeElementDeep()),
      stuck: activeElementDeep() !== pageChatInput,
    });
  }

  function syncPageChatFocus(reason) {
    steerFocusLog('syncPageChatFocus', { reason });
    if (state === 'CONFIGURING') focusConfigureInput(reason);
    else if (shouldSteerAutoFocus()) focusSteerChat(reason);
  }

  function buildSteerProcessingDots() {
    const P = pageChatPalette();
    const wrap = el('span', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: '5px', flex: '1', minWidth: '0',
      padding: '0 12px 0 2px',
      pointerEvents: 'none',
    });
    wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      wrap.appendChild(el('span', {
        display: 'inline-block',
        width: '4px', height: '4px', borderRadius: '50%',
        background: P.patinaPale,
        boxShadow: '0 0 6px ' + P.patinaSoft,
        animation: 'tcher-steer-dot 1.05s ease-in-out ' + (i * 0.14) + 's infinite',
      }));
    }
    return wrap;
  }

  function keepSteerPointerInside(e, opts = {}) {
    e.stopPropagation();
    if (opts.preventDefault !== false) e.preventDefault();
  }

  function preparePageChatInputForTyping() {
    if (!pageChatEl || !pageChatInput) return false;
    pageChatExpanded = true;
    pageChatEl.dataset.expanded = 'true';
    pageChatEl.style.width = PAGE_CHAT_EXPANDED_W;
    pageChatEl.style.cursor = steerLocked ? 'default' : 'text';
    if (pageChatHint) {
      pageChatHint.style.display = 'none';
      pageChatHint.style.opacity = '0';
    }
    pageChatInput.style.width = '';
    pageChatInput.style.padding = '0 6px';
    pageChatInput.style.opacity = steerLocked ? '0.72' : '1';
    pageChatInput.style.pointerEvents = steerLocked ? 'none' : 'auto';
    return true;
  }

  function focusPageChatInput(reason) {
    if (!preparePageChatInputForTyping() || steerLocked) return false;
    try { pageChatInput.focus({ preventScroll: true }); } catch { pageChatInput.focus(); }
    const focused = activeElementDeep() === pageChatInput;
    if (focused) steerInputWasFocused = true;
    syncPageChatFocusRing();
    return focused;
  }

  function clearSteerAwaitTimer() {
    if (steerAwaitTimer) {
      clearTimeout(steerAwaitTimer);
      steerAwaitTimer = null;
    }
  }

  function scheduleSteerAwaitTimeout(id) {
    clearSteerAwaitTimer();
    steerAwaitTimer = setTimeout(() => {
      if (!steerLocked || steerRequestId !== id) return;
      unlockSteerChat({
        error: 'Steer timed out waiting for the agent. Check that live-poll is running and replies with steer_done.',
        restoreMessage: steerPendingMessage,
      });
    }, STEER_AWAIT_TIMEOUT_MS);
  }

  function lockSteerChat() {
    if (!pageChatEl || !pageChatInput) return;    steerLocked = true;
    pageChatEl.dataset.processing = 'true';
    pageChatInput.disabled = true;
    preparePageChatInputForTyping();
    pageChatEl.style.cursor = 'default';
    pageChatInput.style.pointerEvents = 'none';
    if (pageChatHint) {
      pageChatHint.style.display = 'none';
      pageChatHint.style.visibility = 'hidden';
    }
    pageChatEl.setAttribute('aria-busy', 'true');
    pageChatEl.setAttribute('aria-label', 'Processing steer request');
    if (!pageChatDotsEl) {
      pageChatDotsEl = buildSteerProcessingDots();
      pageChatEl.appendChild(pageChatDotsEl);
    }
    syncPageChatFocusRing();
    syncPageChatChrome();
  }

  function unlockSteerChat(opts) {
    clearSteerAwaitTimer();
    const restoreMessage = typeof opts?.restoreMessage === 'string' ? opts.restoreMessage : '';
    const keepExpanded = Boolean(opts?.error && restoreMessage);
    steerLocked = false;
    const completedId = steerRequestId;
    steerRequestId = null;
    if (!pageChatEl) return;
    pageChatEl.dataset.processing = 'false';
    pageChatEl.removeAttribute('aria-busy');
    pageChatEl.setAttribute('aria-label', 'What needs to be changed?');
    pageChatExpanded = keepExpanded;
    pageChatEl.dataset.expanded = keepExpanded ? 'true' : 'false';
    pageChatEl.style.width = keepExpanded ? PAGE_CHAT_EXPANDED_W : PAGE_CHAT_COLLAPSED_W;
    pageChatEl.style.cursor = 'pointer';
    if (pageChatInput) {
      pageChatInput.disabled = false;
      pageChatInput.value = keepExpanded ? restoreMessage : '';
      pageChatInput.style.width = keepExpanded ? '' : '0';
      pageChatInput.style.padding = keepExpanded ? '0 6px' : '0';
      pageChatInput.style.opacity = keepExpanded ? '1' : '0';
      pageChatInput.style.pointerEvents = 'auto';
    }
    if (pageChatHint) {
      pageChatHint.textContent = 'Type Here';
      pageChatHint.style.display = keepExpanded ? 'none' : '';
      pageChatHint.style.visibility = keepExpanded ? 'hidden' : '';
      pageChatHint.style.opacity = keepExpanded ? '0' : '1';
    }
    if (pageChatDotsEl?.parentNode) {
      pageChatDotsEl.remove();
      pageChatDotsEl = null;
    }
    steerPendingMessage = keepExpanded ? restoreMessage : '';
    steerInputWasFocused = false;
    syncPageChatChrome();
    syncPageChatFocusRing();
    if (opts?.error) showToast(String(opts.error), 5000);
    else if (opts?.message) showToast(String(opts.message), 4000);
    if (completedId) {
      sendSteerCheckpoint(completedId, opts?.error ? 'steer_error' : 'steer_done', {
        message: opts?.message || opts?.error || '',
        file: opts?.file || '',
      });
    }
    if (keepExpanded) focusPageChatInput('steer-error-restore');
    else syncPageChatFocus('steer-unlock');
  }

  function submitSteerMessage() {    const text = pageChatInput?.value.trim();
    if (!text || steerLocked) return;
    const id = id8();
    steerRequestId = id;
    steerPendingMessage = text;
    if (steerInputWasFocused) sendSteerCheckpoint(id, 'steer_input_focused', { focused: true });
    lockSteerChat();
    scheduleSteerAwaitTimeout(id);
    sendSteerCheckpoint(id, 'steer_submitted', { message: text, pageUrl: location.href });
    sendEvent({
      type: 'steer',
      id,
      message: text,
      pageUrl: location.href,
    }).then((res) => {
      if (!res) {
        sendSteerCheckpoint(id, 'steer_send_failed', { message: text });
        unlockSteerChat({ error: 'Could not reach live server', restoreMessage: text });
      }
    });
  }

  function maybeCompleteSteer(msg) {
    if (!steerRequestId || msg.id !== steerRequestId) return false;
    if (msg.type === 'steer_done') {
      unlockSteerChat({ message: msg.message, file: msg.file });
      if (msg.file && /\.svelte(?:$|\?)/.test(String(msg.file))) {
        setTimeout(() => {
          if (!steerLocked) showToast('Steer applied. Reload if the page has not refreshed yet.', 5000);
        }, 4500);
      }
      return true;
    }
    if (msg.type === 'error') {
      unlockSteerChat({ error: msg.message || 'Steer failed', restoreMessage: steerPendingMessage });
      return true;
    }
    return false;
  }

  function expandPageChat(opts) {
    const focus = !opts || opts.focus !== false;
    if (!pageChatEl || !pageChatInput || steerLocked) return;
    preparePageChatInputForTyping();
    syncPageChatChrome();
    syncPageChatFocusRing();
    if (focus) focusPageChatInput('expand-page-chat');
  }

  function collapsePageChat(opts) {
    const blur = opts && opts.blur === true;
    if (!pageChatEl || !pageChatInput) return;
    pageChatExpanded = false;
    pageChatEl.dataset.expanded = 'false';
    pageChatEl.style.width = PAGE_CHAT_COLLAPSED_W;
    pageChatEl.style.cursor = 'pointer';
    if (blur) {
      pageChatInput.blur();
      pageChatInput.style.pointerEvents = 'none';
    } else {
      pageChatInput.style.pointerEvents = 'auto';
    }
    if (pageChatHint && activeElementDeep() !== pageChatInput) {
      pageChatHint.style.display = '';
      pageChatHint.style.opacity = '1';
    }
    syncPageChatChrome();
    syncPageChatFocusRing();
  }

  function initPageChat(parent, P) {
    pageChatEl = el('div', {
      display: 'inline-flex', alignItems: 'center',
      height: '28px', margin: '0 4px 0 ' + (GLOBAL_BAR_SECTION_GAP - GLOBAL_BAR_INNER_GAP) + 'px',
      borderRadius: '7px',
      background: P.chatSurface,
      border: '1px solid ' + P.hairline,
      overflow: 'hidden',
      cursor: 'pointer',
      flexShrink: '0',
      width: PAGE_CHAT_COLLAPSED_W,
      transition: 'border-color 0.15s ease',
    });
    pageChatEl.id = PREFIX + '-page-chat';
    pageChatEl.dataset.expanded = 'false';
    pageChatEl.title = 'What needs to be changed?';

    const chatIcon = el('span', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '28px', height: '28px', flexShrink: '0',
      color: P.textDim, pointerEvents: 'none',
    });
    chatIcon.innerHTML = ICON_PAGE_CHAT;

    pageChatHint = el('span', {
      fontSize: '11.5px', fontWeight: '500',
      color: P.textDim,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      flex: '1', minWidth: '0',
      pointerEvents: 'none',
      transition: 'opacity 0.15s ease',
    });
    pageChatHint.textContent = 'Type Here';

    pageChatInput = document.createElement('input');
    pageChatInput.id = PREFIX + '-page-chat-input';
    pageChatInput.type = 'text';
    pageChatInput.placeholder = 'What needs to be changed?';
    pageChatInput.setAttribute('aria-label', 'What needs to be changed?');
    Object.assign(pageChatInput.style, {
      flex: '1', minWidth: '0', width: '0',
      padding: '0', border: 'none', background: 'transparent',
      fontFamily: FONT, fontSize: '11.5px', color: P.text,
      outline: 'none', opacity: '0', pointerEvents: 'none',
      transition: 'opacity 0.15s ease',
    });

    pageChatEl.appendChild(chatIcon);
    pageChatEl.appendChild(pageChatHint);
    pageChatEl.appendChild(pageChatInput);

    if (!uiGetById(PREFIX + '-page-chat-style')) {
      const s = document.createElement('style');
      s.id = PREFIX + '-page-chat-style';
      s.textContent =
        '@keyframes tcher-steer-dot { 0%, 70%, 100% { opacity: 0.28; transform: scale(0.82); } 35% { opacity: 1; transform: scale(1); } }' +
        '@keyframes tcher-steer-processing { 0%, 100% { border-color: oklch(75% 0 0 / 0.28); box-shadow: 0 0 0 0 oklch(75% 0 0 / 0); } 50% { border-color: oklch(88% 0 0 / 0.55); box-shadow: 0 0 14px oklch(75% 0 0 / 0.18); } }' +
        '#' + PREFIX + '-page-chat[data-processing="true"] { animation: tcher-steer-processing 1.6s ease-in-out infinite; }' +
        '@media (prefers-reduced-motion: reduce) { #' + PREFIX + '-page-chat[data-processing="true"] { animation: none; border-color: oklch(75% 0 0 / 0.45); } #' + PREFIX + '-page-chat[data-processing="true"] [aria-hidden="true"] span { animation: none; opacity: 0.85; } }' +
        '#' + PREFIX + '-page-chat-input::placeholder { color: oklch(63% 0 0); opacity: 1; }';
      uiAppendStyle(s);
    }

    pageChatEl.addEventListener('pointerdown', keepSteerPointerInside);
    pageChatEl.addEventListener('mousedown', keepSteerPointerInside);
    pageChatEl.addEventListener('click', (e) => {
      keepSteerPointerInside(e);
      if (steerLocked) return;
      expandPageChat({ focus: false });
      focusPageChatInput('page-chat-click');
    });

    pageChatInput.addEventListener('pointerdown', keepSteerPointerInside);
    pageChatInput.addEventListener('mousedown', keepSteerPointerInside);
    pageChatInput.addEventListener('click', (e) => {
      keepSteerPointerInside(e);
      if (!steerLocked) focusPageChatInput('page-chat-input-click');
    });

    pageChatInput.addEventListener('input', () => {
      syncPageChatVisual();
    });

    pageChatInput.addEventListener('focus', () => {
      syncPageChatFocusRing();
    });

    pageChatInput.addEventListener('blur', () => {
      syncPageChatFocusRing();
      setTimeout(() => {
        if (state === 'CONFIGURING' || steerLocked) return;
        if (pageChatEl?.contains(activeElementDeep())) return;
        if (!pageChatInput.value.trim()) collapsePageChat();
        scheduleSteerFocusRecover('steer-blur-recover');
      }, 120);
    });

    pageChatInput.addEventListener('keydown', (e) => {
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !pageChatInput.value) return;
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        if (pageChatInput.value) {
          pageChatInput.value = '';
          syncPageChatVisual();
        } else {
          collapsePageChat();
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        submitSteerMessage();
      }
    });

    parent.appendChild(pageChatEl);
    steerFocusLog('page-chat-mounted', {});
  }

  // Tcher mark - same artwork as brand.svg (repo root): dark rounded tile +
  // the Tcher glyph. `color` tints the glyph only; the tile stays brand-dark
  // so the mark reads on both light and dark bar surfaces.
  function brandMarkSvg(color = '#fff', size = 18) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M31.9 0H12.1C5.41735 0 0 5.41735 0 12.1V31.9C0 38.5826 5.41735 44 12.1 44H31.9C38.5826 44 44 38.5826 44 31.9V12.1C44 5.41735 38.5826 0 31.9 0Z" fill="#171717"/>
      <path d="M12.7169 18.3021L15.744 16.6701L14.0543 13.9357H29.9457L22.0026 26.8008L20.3128 24.0618L17.2857 25.6985L22.0026 33.3337L36 10.667H8L12.7169 18.3021Z" fill="${color}"/>
    </svg>`;
  }

  function syncAgentPollingUi(connected) {
    agentPollingConnected = !!connected;
    if (!globalBarBrandEl) return;
    globalBarBrandEl.dataset.agentConnected = connected ? 'true' : 'false';
    globalBarBrandEl.setAttribute('aria-label', connected
      ? 'Tcher live mode'
      : 'Tcher live mode - agent not polling');
    globalBarBrandEl.removeAttribute('title');
    globalBarBrandEl.style.cursor = connected ? 'default' : 'help';
    const mark = globalBarBrandEl.querySelector('[data-brand-mark]');
    if (mark) {
      mark.innerHTML = brandMarkSvg(connected ? '#fff' : AGENT_DISCONNECTED_MARK, 18);
      mark.style.opacity = '1';
    }
    const dot = globalBarBrandEl.querySelector('[data-agent-dot]');
    if (dot) dot.style.display = connected ? 'none' : 'block';
    if (connected) hideAgentPollTooltip();
  }

  function ensureAgentPollTooltip() {
    if (agentPollTooltipEl) return agentPollTooltipEl;
    const P = barPaletteForTheme(globalBarEl?.dataset.theme || detectPageTheme());
    agentPollTooltipEl = el('div', {
      position: 'fixed',
      display: 'none',
      opacity: '0',
      zIndex: String(Z.bar + 6),
      pointerEvents: 'none',
      maxWidth: '220px',
      padding: '6px 9px',
      borderRadius: '7px',
      background: P.chatSurface,
      border: '1px solid ' + P.hairline,
      boxShadow: P.shadow,
      color: P.text,
      fontFamily: FONT,
      fontSize: '11px',
      fontWeight: '500',
      lineHeight: '1.35',
      letterSpacing: '0.01em',
      whiteSpace: 'normal',
    });
    agentPollTooltipEl.id = PREFIX + '-agent-poll-tooltip';
    agentPollTooltipEl.textContent = AGENT_DISCONNECTED_TIP;
    uiAppend(agentPollTooltipEl);
    return agentPollTooltipEl;
  }

  function showAgentPollTooltip(anchor) {
    if (agentPollingConnected || !anchor) return;
    const tip = ensureAgentPollTooltip();
    tip.style.transition = 'none';
    tip.style.display = 'block';
    tip.style.opacity = '1';
    const r = anchor.getBoundingClientRect();
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - tipW - 8, r.left + r.width / 2 - tipW / 2));
    const top = Math.max(8, r.top - tipH - 8);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideAgentPollTooltip() {
    if (!agentPollTooltipEl) return;
    agentPollTooltipEl.style.display = 'none';
    agentPollTooltipEl.style.opacity = '0';
  }

  function stopAgentStatusPoll() {
    if (agentStatusPollTimer) {
      clearInterval(agentStatusPollTimer);
      agentStatusPollTimer = null;
    }
  }

  function fetchAgentPollingStatus() {
    fetch('http://localhost:' + PORT + '/status?token=' + TOKEN, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.agentPolling === 'boolean') syncAgentPollingUi(data.agentPolling);
      })
      .catch(() => { /* server loss handled elsewhere */ });
  }

  function startAgentStatusPoll() {
    stopAgentStatusPoll();
    fetchAgentPollingStatus();
    agentStatusPollTimer = setInterval(fetchAgentPollingStatus, AGENT_STATUS_POLL_MS);
  }

  function initGlobalBar() {
    const theme = detectPageTheme();
    const P = barPaletteForTheme(theme);

    // Custom focus-visible for bar buttons. Browser default is a heavy
    // blue ring that looks jarring on the dark capsule. Replace with a
    // soft accent-tinted inner ring that respects the bar's palette.
    if (!uiGetById(PREFIX + '-bar-focus-style')) {
      const s = document.createElement('style');
      s.id = PREFIX + '-bar-focus-style';
      s.textContent =
        '#' + PREFIX + '-global-bar button:focus { outline: none; }' +
        '#' + PREFIX + '-global-bar button:focus-visible {' +
        '  outline: none;' +
        '  box-shadow: 0 0 0 2px ' + P.accentSoft + ', 0 0 0 3px ' + P.accent + ';' +
        '}' +
        '@keyframes tcher-agent-dot { 0%, 100% { opacity: 0.45; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }' +
        '#' + PREFIX + '-global-bar-brand[data-agent-connected="false"] [data-agent-dot] { animation: tcher-agent-dot 1.4s ease-in-out infinite; }' +
        '@media (prefers-reduced-motion: reduce) { #' + PREFIX + '-global-bar-brand[data-agent-connected="false"] [data-agent-dot] { animation: none; opacity: 0.9; } }';
      uiAppendStyle(s);
    }

    globalBarEl = el('div', {
      position: 'fixed', bottom: '14px', left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      zIndex: Z.bar + 5,
      display: 'flex', alignItems: 'stretch',
      gap: '0',
      background: P.surface,
      border: '1px solid ' + P.border,
      borderRadius: '8px',
      boxShadow: P.shadow,
      fontFamily: FONT, fontSize: '12px', lineHeight: '1',
      opacity: '0',
      overflow: 'hidden',          // clip the full-bleed brand mark to the bar radius
      transition: 'opacity 0.3s ' + EASE + ', transform 0.3s ' + EASE,
    });
    globalBarEl.id = PREFIX + '-global-bar';
    globalBarEl.dataset.theme = theme;

    // Brand mark - tcher tile icon (brand.svg).
    const brand = el('span', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      alignSelf: 'stretch', position: 'relative',
      padding: '0 ' + (GLOBAL_BAR_SECTION_GAP - GLOBAL_BAR_INNER_PAD_LEFT) + 'px 0 14px',
      background: 'transparent',
      color: P.accent,
      flexShrink: '0',
    });
    brand.id = PREFIX + '-global-bar-brand';
    brand.dataset.agentConnected = 'false';
    brand.setAttribute('role', 'img');
    brand.setAttribute('aria-label', 'Tcher live mode - agent not polling');

    const brandMark = el('span', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    });
    brandMark.dataset.brandMark = 'true';
    brandMark.innerHTML = brandMarkSvg('#fff', 18);

    const agentDot = el('span', {
      // Corner badge on the brand tile (the old offsets nested the dot
      // inside the slash mark's diagonal gap).
      position: 'absolute', right: '-2px', bottom: '-2px',
      width: '6px', height: '6px', borderRadius: '50%',
      background: 'oklch(96% 0 0)',
      boxShadow: '0 0 0 2px ' + P.surface,
      display: 'none', pointerEvents: 'none',
    });
    agentDot.dataset.agentDot = 'true';
    agentDot.setAttribute('aria-hidden', 'true');

    brandMark.appendChild(agentDot);
    brand.appendChild(brandMark);
    brand.addEventListener('mouseenter', () => showAgentPollTooltip(brand));
    brand.addEventListener('mouseleave', hideAgentPollTooltip);
    globalBarBrandEl = brand;
    globalBarEl.appendChild(brand);
    syncAgentPollingUi(false);

    // Inner wrapper: holds the toggles with normal bar padding.
    const inner = el('div', {
      display: 'flex', alignItems: 'center',
      padding: '4px 5px 4px ' + GLOBAL_BAR_INNER_PAD_LEFT + 'px', gap: GLOBAL_BAR_INNER_GAP + 'px',
    });
    inner.id = PREFIX + '-global-bar-inner';
    globalBarEl.appendChild(inner);

    // Button factory: icon-only at rest, label slides in on hover/active.
    function makeIconBtn({ id, svg, label, ariaLabel, labelFont, onClick }) {
      const b = el('button', {
        position: 'relative',
        display: 'inline-flex', alignItems: 'center',
        padding: '6px 8px', borderRadius: '7px',
        border: 'none', background: 'transparent',
        color: P.textDim, fontFamily: FONT, fontSize: '11.5px', fontWeight: '500',
        cursor: 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease',
        whiteSpace: 'nowrap', overflow: 'hidden',
      });
      b.id = id;
      b.title = ariaLabel || label || '';
      b.setAttribute('aria-label', ariaLabel || label || '');
      b.innerHTML = svg + (label
        ? `<span class="icon-btn-label" style="display:inline-block;max-width:0;opacity:0;margin-left:0;overflow:hidden;font-family:${labelFont || FONT};transform:translateX(-4px);transition:opacity 0.2s ease, transform 0.25s ${EASE};">${label}</span>`
        : '');
      const labelEl = b.querySelector('.icon-btn-label');
      const expand = () => {
        if (!labelEl) return;
        labelEl.style.maxWidth = '120px'; labelEl.style.opacity = '1'; labelEl.style.marginLeft = '6px'; labelEl.style.transform = 'translateX(0)';
      };
      const collapse = () => {
        if (!labelEl || b.dataset.active === 'true') return;
        labelEl.style.maxWidth = '0'; labelEl.style.opacity = '0'; labelEl.style.marginLeft = '0'; labelEl.style.transform = 'translateX(-4px)';
      };
      // Per-button hover only changes color (no layout). The label expand/
      // collapse is driven by the bar-level mouseenter/mouseleave so moving
      // the mouse between adjacent buttons doesn't trigger per-button width
      // thrashing - the whole bar grows once and shrinks once.
      b.addEventListener('mouseenter', () => { if (b.dataset.active !== 'true') b.style.color = P.text; });
      b.addEventListener('mouseleave', () => { if (b.dataset.active !== 'true') b.style.color = P.textDim; });
      b.addEventListener('click', onClick);
      b._expandLabel = expand;
      b._collapseLabel = collapse;
      return b;
    }

    // Select toggle - restored from localStorage; both select and insert may be off.
    const pickBtn = makeIconBtn({
      id: PREFIX + '-pick-toggle',
      svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 1.99999C12.5523 1.99999 13 2.4477 13 2.99999C12.9999 3.55224 12.5522 3.99999 12 3.99999C7.58172 3.99999 4 7.58171 4 12C4.00004 16.4182 7.58174 20 12 20C16.4182 20 19.9999 16.4182 20 12C20 11.4477 20.4477 11 21 11C21.5523 11 22 11.4477 22 12C21.9999 17.5228 17.5228 22 12 22C6.47717 22 2.00004 17.5228 2 12C2 6.47714 6.47715 1.99999 12 1.99999ZM12 5.99999C12.5523 5.99999 13 6.4477 13 6.99999C12.9999 7.55224 12.5522 7.99999 12 7.99999C9.79085 7.99999 7.99999 9.79085 7.99999 12C8.00004 14.2091 9.79088 16 12 16C14.2091 16 15.9999 14.2091 16 12C16 11.4477 16.4477 11 17 11C17.5523 11 18 11.4477 18 12C17.9999 15.3137 15.3137 18 12 18C8.68631 18 6.00004 15.3137 6 12C6 8.68628 8.68629 5.99999 12 5.99999ZM17.6562 2.10057C18.0468 1.71005 18.6807 1.71005 19.0713 2.10057C19.4614 2.49105 19.4615 3.12419 19.0713 3.51463L18.3633 4.22069L18.3642 4.22167C17.9737 4.61219 17.9737 5.2452 18.3642 5.63573C18.7548 6.02612 19.3878 6.02621 19.7783 5.63573L20.4853 4.9287C20.8759 4.53839 21.5089 4.53826 21.8994 4.9287C22.2899 5.31915 22.2897 5.95222 21.8994 6.34276L19.7783 8.46483C19.5909 8.65223 19.3363 8.75671 19.0713 8.75682H16.6572L12.707 12.707C12.3165 13.0974 11.6834 13.0974 11.293 12.707C10.9025 12.3165 10.9026 11.6835 11.293 11.293L15.2422 7.34374V4.9287C15.2422 4.66356 15.3477 4.40916 15.5351 4.22167L17.6562 2.10057Z"/></svg>',
      label: 'Select',
      ariaLabel: 'Select element',
      onClick: () => togglePick(),
    });
    inner.appendChild(pickBtn);

    const insertBtn = makeIconBtn({
      id: PREFIX + '-insert-toggle',
      svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
      label: 'Insert',
      ariaLabel: 'Insert new element',
      onClick: () => toggleInsert(),
    });
    inner.appendChild(insertBtn);

    // UX check toggle (the detect overlay; severity-coded red/orange/yellow)
    const detectBtn = makeIconBtn({
      id: PREFIX + '-detect-toggle',
      svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M5 19H9V21H3V16H5V19ZM21 21H15V19H19V16H21V21ZM21 13H3V11H21V13ZM18.5293 1.31934C18.7058 0.893559 19.2942 0.893545 19.4707 1.31934L19.7236 1.93067C20.1555 2.97348 20.9615 3.80618 21.9746 4.25685L22.6914 4.57619C23.1022 4.75887 23.1022 5.3564 22.6914 5.53908L21.9326 5.87697C20.945 6.31625 20.1534 7.11948 19.7139 8.12795L19.4668 8.69338C19.2863 9.10751 18.7136 9.10751 18.5332 8.69338L18.2861 8.12795C17.8466 7.11947 17.0551 6.31625 16.0674 5.87697L15.3076 5.53908C14.8974 5.35622 14.8974 4.75899 15.3076 4.57619L16.0254 4.25685C17.0384 3.80618 17.8445 2.97348 18.2764 1.93067L18.5293 1.31934ZM9 5.00001H5V8.00002H3V3.00001H9V5.00001Z"/></svg>',
      label: 'Detect UX',
      ariaLabel: 'Run UX check (findings color-coded by severity)',
      onClick: () => toggleDetect(),
    });
    const detectBadge = el('span', {
      fontSize: '10px', fontWeight: '600',
      padding: '0px 5px', borderRadius: '7px', lineHeight: '16px',
      background: P.accent, color: C.ink,
      display: 'none', fontFamily: MONO, marginLeft: '4px',
    });
    detectBadge.id = PREFIX + '-detect-badge';
    detectBtn.appendChild(detectBadge);
    inner.appendChild(detectBtn);

    // DESIGN.md panel toggle - quartet of color squares as the mark.
    const designBtn = makeIconBtn({
      id: PREFIX + '-design-toggle',
      svg: `<span style="display:inline-grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;width:14px;height:14px;border-radius:3px;overflow:hidden;box-shadow:inset 0 0 0 1px oklch(58% 0 0 / 0.55);flex-shrink:0">
        <span style="background:oklch(96% 0 0)"></span>
        <span style="background:oklch(70% 0 0)"></span>
        <span style="background:oklch(45% 0 0)"></span>
        <span style="background:oklch(20% 0 0)"></span>
      </span>`,
      label: 'DESIGN.md',
      ariaLabel: 'Toggle DESIGN.md panel',
      labelFont: MONO,
      onClick: () => toggleDesignPanel(),
    });
    inner.appendChild(designBtn);

    initPageChat(inner, P);

    // Pending manual edits live outside the bar so applying staged copy edits
    // reads as a distinct next step instead of another chrome toggle.
    pendingDockEl = el('div', {
      position: 'fixed',
      left: '0',
      bottom: '0',
      transform: 'translate(-100%, 50%)',
      zIndex: String(Z.bar + 6),
      display: 'none',
      alignItems: 'center',
      gap: '6px',
      fontFamily: FONT,
      pointerEvents: 'auto',
    });
    pendingDockEl.id = PREFIX + '-pending-dock';

    pendingPillEl = el('button', {
      display: 'none',
      alignItems: 'center',
      gap: '8px',
      fontFamily: FONT,
      fontSize: '12px',
      fontWeight: '600',
      letterSpacing: '0',
      color: C.ink,
      background: P.accent,
      padding: '7px 12px 7px 14px',
      border: 'none',
      borderRadius: '999px',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      boxShadow: '0 4px 16px oklch(0% 0 0 / 0.16), 0 1px 3px oklch(0% 0 0 / 0.1)',
      transition: 'filter 0.12s ease, transform 0.1s ease, box-shadow 0.18s ease',
    });
    pendingPillEl.title = 'Apply copy edits to source';
    pendingPillSpinnerEl = el('span', {
      display: 'none',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      color: C.ink,
      opacity: '0.9',
      animation: 'tcher-spin 0.6s linear infinite',
      flex: '0 0 auto',
      boxSizing: 'border-box',
    });
    pendingPillLabelEl = el('span', { lineHeight: '1', whiteSpace: 'nowrap' });
    pendingPillLabelEl.textContent = 'Apply copy edits';
    pendingPillCountEl = el('span', {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '17px',
      height: '17px',
      padding: '0 5px',
      borderRadius: '999px',
      background: 'oklch(4% 0.004 95 / 0.18)',
      color: C.ink,
      fontFamily: MONO,
      fontSize: '10px',
      fontWeight: '700',
      lineHeight: '1',
    });
    ensureSpinKeyframes();
    pendingPillEl.appendChild(pendingPillSpinnerEl);
    pendingPillEl.appendChild(pendingPillLabelEl);
    pendingPillEl.appendChild(pendingPillCountEl);
    pendingPillEl.addEventListener('mouseenter', () => {
      if (pendingApplyInFlight) return;
      pendingPillEl.style.filter = 'brightness(1.1)';
      pendingPillEl.style.boxShadow = '0 7px 22px oklch(0% 0 0 / 0.18), 0 2px 5px oklch(0% 0 0 / 0.12)';
    });
    pendingPillEl.addEventListener('mouseleave', () => {
      if (pendingApplyInFlight) return;
      pendingPillEl.style.filter = 'none';
      pendingPillEl.style.transform = 'scale(1)';
      pendingPillEl.style.boxShadow = '0 4px 16px oklch(0% 0 0 / 0.16), 0 1px 3px oklch(0% 0 0 / 0.1)';
    });
    pendingPillEl.addEventListener('mousedown', () => { if (!pendingApplyInFlight) pendingPillEl.style.transform = 'scale(0.97)'; });
    pendingPillEl.addEventListener('mouseup', () => { pendingPillEl.style.transform = 'scale(1)'; });
    pendingPillEl.addEventListener('click', onPendingPillClick);

    pendingTrashBtn = el('button', {
      position: 'relative',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0', boxSizing: 'border-box',
      width: '30px', height: '30px', borderRadius: '999px',
      border: '1px solid ' + P.hairline,
      background: P.chatSurface,
      color: P.textDim,
      overflow: 'visible',
      boxShadow: '0 4px 16px oklch(0% 0 0 / 0.12), 0 1px 3px oklch(0% 0 0 / 0.08)',
      cursor: 'pointer',
      transition: 'color 0.12s ease, background 0.12s ease, box-shadow 0.18s ease',
    });
    pendingTrashBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M3 4h8"/><path d="M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"/><path d="M4 4l.5 7a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L10 4"/></svg>';
    const pendingTrashTooltipEl = el('span', {
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%) translateY(4px)',
      opacity: '0',
      pointerEvents: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      background: C.ink,
      color: C.white,
      fontFamily: FONT,
      fontSize: '12px',
      fontWeight: '400',
      lineHeight: '1',
      whiteSpace: 'nowrap',
      textAlign: 'center',
      transition: 'opacity 0.16s ease, transform 0.18s ' + EASE,
    });
    pendingTrashTooltipEl.textContent = 'Discard copy edits';
    pendingTrashTooltipEl.setAttribute('role', 'tooltip');
    pendingTrashBtn.appendChild(pendingTrashTooltipEl);
    pendingTrashBtn.setAttribute('aria-label', 'Discard copy edits on this page');
    const showTrashTooltip = () => {
      pendingTrashBtn.style.color = P.accent;
      pendingTrashBtn.style.boxShadow = '0 7px 22px oklch(0% 0 0 / 0.16), 0 2px 5px oklch(0% 0 0 / 0.1)';
      pendingTrashTooltipEl.style.opacity = '1';
      pendingTrashTooltipEl.style.transform = 'translateX(-50%) translateY(0)';
    };
    const hideTrashTooltip = () => {
      pendingTrashBtn.style.color = P.textDim;
      pendingTrashBtn.style.background = P.chatSurface;
      pendingTrashBtn.style.boxShadow = '0 4px 16px oklch(0% 0 0 / 0.12), 0 1px 3px oklch(0% 0 0 / 0.08)';
      pendingTrashTooltipEl.style.opacity = '0';
      pendingTrashTooltipEl.style.transform = 'translateX(-50%) translateY(4px)';
    };
    pendingTrashBtn.addEventListener('mouseenter', showTrashTooltip);
    pendingTrashBtn.addEventListener('mouseleave', hideTrashTooltip);
    pendingTrashBtn.addEventListener('focus', showTrashTooltip);
    pendingTrashBtn.addEventListener('blur', hideTrashTooltip);
    pendingTrashBtn.addEventListener('click', onPendingTrashClick);

    const makePendingDecisionBtn = (label, accent) => {
      const btn = el('button', {
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        height: '30px',
        padding: '0 12px',
        borderRadius: '999px',
        border: '1px solid ' + (accent ? P.accent : P.hairline),
        background: accent ? P.accent : P.chatSurface,
        color: accent ? C.ink : P.textDim,
        fontFamily: FONT,
        fontSize: '12px',
        fontWeight: '600',
        letterSpacing: '0',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px oklch(0% 0 0 / 0.12), 0 1px 3px oklch(0% 0 0 / 0.08)',
      });
      btn.textContent = label;
      return btn;
    };
    pendingKeepFixingBtn = makePendingDecisionBtn('Keep fixing', true);
    pendingKeepFixingBtn.setAttribute('aria-label', 'Ask the agent to keep fixing Apply errors');
    pendingKeepFixingBtn.addEventListener('click', onPendingKeepFixingClick);
    pendingRollbackBtn = makePendingDecisionBtn('Rollback', false);
    pendingRollbackBtn.setAttribute('aria-label', 'Rollback source and keep copy edits staged');
    pendingRollbackBtn.addEventListener('click', onPendingRollbackClick);

    pendingDockEl.appendChild(pendingPillEl);
    pendingDockEl.appendChild(pendingTrashBtn);
    pendingDockEl.appendChild(pendingKeepFixingBtn);
    pendingDockEl.appendChild(pendingRollbackBtn);

    // Thin divider before the exit button
    const divider = el('span', {
      width: '1px', height: '18px',
      background: P.hairline,
      margin: '0 4px 0 2px',
    });
    inner.appendChild(divider);

    // Exit × on the right - intentionally subtle (textDim at rest, text on
    // hover) so it sits behind the active toggles in visual hierarchy.
    //
    // Explicit padding + box-sizing here is load-bearing: a host page like
    // `button { padding: 0.5rem 1rem; }` (very common in resets) would
    // otherwise inflate this 24x24 button into 56x40 and push the SVG out
    // of the visible bar - the X stays invisible even though the styles in
    // DevTools look fine. Every other chrome button sets padding inline;
    // this one needed it too.
    const exitBtn = el('button', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '0', boxSizing: 'border-box',
      width: '24px', height: '24px', borderRadius: '6px',
      border: 'none', background: 'transparent',
      color: P.textDim, fontFamily: FONT, fontSize: '0', lineHeight: '0',
      cursor: 'pointer', transition: 'color 0.12s ease, background 0.12s ease',
    });
    exitBtn.id = PREFIX + '-exit';
    exitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>';
    exitBtn.title = 'Exit live mode';
    exitBtn.addEventListener('mouseenter', () => { exitBtn.style.color = 'oklch(98% 0 0)'; exitBtn.style.background = P.exitHover; });
    exitBtn.addEventListener('mouseleave', () => { exitBtn.style.color = P.textDim; exitBtn.style.background = 'transparent'; });
    exitBtn.addEventListener('click', () => { sendEvent({ type: 'exit' }); teardown(); });
    inner.appendChild(exitBtn);

    // Bar-level hover: expand every toggle's label at once; collapse on leave.
    // Buttons with dataset.active="true" ignore collapse (their label stays).
    const toggles = [pickBtn, insertBtn, detectBtn, designBtn];
    globalBarEl.addEventListener('mouseenter', () => {
      toggles.forEach((t) => t._expandLabel && t._expandLabel());
      schedulePendingDockPosition();
      setTimeout(schedulePendingDockPosition, 260);
    });
    globalBarEl.addEventListener('mouseleave', () => {
      toggles.forEach((t) => t._collapseLabel && t._collapseLabel());
      schedulePendingDockPosition();
      setTimeout(schedulePendingDockPosition, 260);
    });
    globalBarEl.addEventListener('pointerdown', () => {
      try { window.focus(); } catch { /* in-app preview may block */ }
    }, true);

    uiAppend(pendingDockEl);
    uiAppend(globalBarEl);
    defangOutsideHandlers(pendingDockEl);
    defangOutsideHandlers(globalBarEl);

    if (window.ResizeObserver) {
      pendingDockResizeObserver = new ResizeObserver(schedulePendingDockPosition);
      pendingDockResizeObserver.observe(globalBarEl);
    }
    window.addEventListener('resize', positionPendingDock);

    requestAnimationFrame(() => {
      globalBarEl.style.opacity = '1';
      globalBarEl.style.transform = 'translateX(-50%) translateY(0)';
      syncPageChatFocus('global-bar-visible');
    });

    // Listen for detection results AND ready signal
    window.addEventListener('message', onDetectMessage);
    updateGlobalBarState();
  }

  function updateGlobalBarState() {
    const detectToggle = uiGetById(PREFIX + '-detect-toggle');
    const detectBadge = uiGetById(PREFIX + '-detect-badge');
    const pickToggle = uiGetById(PREFIX + '-pick-toggle');
    const insertToggle = uiGetById(PREFIX + '-insert-toggle');
    const designToggle = uiGetById(PREFIX + '-design-toggle');
    const theme = globalBarEl?.dataset.theme || 'light';
    const P = barPaletteForTheme(theme);

    // Sync one toggle's active state, colors, and slide-label visibility.
    function sync(btn, active) {
      if (!btn) return;
      btn.style.background = active ? P.toggleActive : 'transparent';
      btn.style.color = active ? P.accent : P.textDim;
      btn.dataset.active = active ? 'true' : 'false';
      if (active && btn._expandLabel) btn._expandLabel();
      else if (!active && btn._collapseLabel) btn._collapseLabel();
    }
    sync(pickToggle, pickActive);
    sync(insertToggle, insertActive);
    sync(detectToggle, detectActive);
    sync(designToggle, designState.open);

    const controlsLocked = pendingApplyInFlight === true;
    [pickToggle, insertToggle, detectToggle, designToggle].forEach((btn) => {
      if (!btn) return;
      btn.disabled = controlsLocked;
      btn.style.cursor = controlsLocked ? 'not-allowed' : 'pointer';
      btn.style.opacity = controlsLocked ? '0.55' : '1';
    });

    // If the bar is currently under the cursor, keep all labels expanded -
    // otherwise clicking a toggle that deactivates (e.g. closing DESIGN.md)
    // would collapse its label while the user's mouse is still on the bar.
    if (globalBarEl && globalBarEl.matches(':hover')) {
      [pickToggle, insertToggle, detectToggle, designToggle].forEach((t) => t?._expandLabel?.());
    }

    if (detectBadge) {
      detectBadge.style.display = (detectActive && detectCount > 0) ? 'inline' : 'none';
      detectBadge.textContent = detectCount;
    }

    // When pick/insert is active, make detect overlays click-through
    document.querySelectorAll('.tcher-overlay').forEach(o => {
      o.style.pointerEvents = (pickActive || insertActive) ? 'none' : '';
    });
    syncPageInteractionCursor();
  }

  let detectReady = false; // true once detect script posts 'tcher-ready'
  let detectPendingScan = false; // scan requested before script was ready

  function requestDetectScan() {
    const scanId = String(++detectScanSeq);
    activeDetectScanId = scanId;
    pendingDetectScanId = scanId;
    window.postMessage({
      source: 'tcher-command',
      action: 'scan',
      config: { scanId },
    }, '*');
  }

  function toggleDetect() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    detectActive = !detectActive;
    updateGlobalBarState();

    if (detectActive) {
      if (!detectScriptLoaded) {
        detectPendingScan = true;
        loadDetectScript();
      } else if (detectReady) {
        requestDetectScan();
      } else {
        detectPendingScan = true;
      }
    } else {
      window.postMessage({ source: 'tcher-command', action: 'remove' }, '*');
      activeDetectScanId = null;
      pendingDetectScanId = null;
      detectCount = 0;
      updateGlobalBarState();
    }
  }

  function togglePick() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    pickActive = !pickActive;
    if (pickActive) {
      insertActive = false;
      clearInsertPicking();
    }
    saveInteractionPrefs();
    updateGlobalBarState();

    if (!pickActive) {
      if (configureKind === 'insert' && state === 'CONFIGURING') {
        cancelInsertConfigure();
        return;
      }
      hideHighlight();
      hideBar();
      hideActionPicker();
      selectedElement = null;
      configureKind = 'replace';
      if (state === 'PICKING' || state === 'CONFIGURING') state = 'IDLE';
    } else {
      if (state === 'IDLE') state = 'PICKING';
    }
    syncPageChatFocus('toggle-pick');
  }

  function toggleInsert() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    insertActive = !insertActive;
    if (insertActive) {
      pickActive = false;
      hideHighlight();
      hideBar();
      hideActionPicker();
      selectedElement = null;
      configureKind = 'replace';
      if (state === 'CONFIGURING') cancelInsertConfigure();
      else if (state === 'IDLE' || state === 'PICKING') state = 'PICKING';
    } else {
      clearInsertPicking();
      if (state === 'PICKING' && !pickActive) state = 'IDLE';
    }
    saveInteractionPrefs();
    updateGlobalBarState();
    syncPageChatFocus('toggle-insert');
  }

  function loadDetectScript() {
    if (detectScriptLoaded) return;
    detectScriptLoaded = true;
    const s = document.createElement('script');
    // Cache-bust: the overlay must never run a stale cached bundle.
    s.src = 'http://localhost:' + PORT + '/detect.js?v=' + Date.now();
    s.dataset.tcherExtension = 'true';
    document.head.appendChild(s);
  }

  function onDetectMessage(e) {
    if (!e.data || typeof e.data.source !== 'string') return;
    // Detection script is loaded and ready
    if (e.data.source === 'tcher-ready') {
      detectReady = true;
      if (detectPendingScan && detectActive) {
        detectPendingScan = false;
        requestDetectScan();
      }
    }
    // Scan results arrived
    if (e.data.source === 'tcher-results') {
      if (!detectActive) return;
      if (activeDetectScanId && e.data.scanId !== activeDetectScanId) return;
      detectCount = e.data.count || 0;
      if (detectActive && pendingDetectScanId && detectCount === 0) {
        showToast(DETECT_EMPTY_MESSAGE, 3200);
      }
      pendingDetectScanId = null;
      updateGlobalBarState();
    }
  }

  /** Full teardown: remove all UI, disconnect SSE, clean up. */
  function teardown() {
    stopAgentStatusPoll();
    hideAgentPollTooltip();
    if (agentPollTooltipEl) {
      agentPollTooltipEl.remove();
      agentPollTooltipEl = null;
    }    clearSteerFocusRecoverTimer();
    steerFocusSuspended = false;
    steerFocusPauseUntil = 0;
    pagePointerGesture = null;
    pagePickSkipClick = false;
    cleanup();
    hideBar();
    if (pendingDockResizeObserver) { pendingDockResizeObserver.disconnect(); pendingDockResizeObserver = null; }
    window.removeEventListener('resize', positionPendingDock);
    if (pendingIntroAnimation) { pendingIntroAnimation.cancel(); pendingIntroAnimation = null; }
    if (pendingDockEl) {
      pendingDockEl.remove();
      pendingDockEl = null;
      pendingPillEl = null;
      pendingPillSpinnerEl = null;
      pendingPillLabelEl = null;
      pendingPillCountEl = null;
      pendingTrashBtn = null;
      pendingKeepFixingBtn = null;
      pendingRollbackBtn = null;
      pendingApplyInFlight = false;
    }
    if (globalBarEl) {
      globalBarEl.style.transition = 'none';
      globalBarEl.remove();
      globalBarEl = null;
    }
    pageChatEl = null;
    pageChatInput = null;
    pageChatHint = null;
    pageChatExpanded = false;
    if (insertCreateTooltipEl) { insertCreateTooltipEl.remove(); insertCreateTooltipEl = null; }
    if (highlightEl) { highlightEl.remove(); highlightEl = null; }
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (barEl) { barEl.remove(); barEl = null; }
    if (pickerEl) { pickerEl.remove(); pickerEl = null; }
    if (paramsPanelEl) { paramsPanelEl.remove(); paramsPanelEl = null; paramsPanelInner = null; paramsPanelBody = null; }
    if (editBadgeProxyRoot) { editBadgeProxyRoot.remove(); editBadgeProxyRoot = null; editBadgeProxyByTarget = new Map(); }
    if (evtSource) { evtSource.close(); evtSource = null; }
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('message', onDetectMessage);
    // Remove detection overlays
    window.postMessage({ source: 'tcher-command', action: 'remove' }, '*');
    state = 'IDLE';
    window.__TCHER_LIVE_INIT__ = false;
    console.log('[tcher] Live mode exited.');
  }

  //
  // Design System Panel - visualizes the project's .tcher/design.json sidecar
  //

  const DESIGN_PREFS_KEY = 'tcher-live-design-panel';
  const DESIGN_PANEL_WIDTH = 440;

  let designHost = null;
  let designShadow = null;
  let designState = {
    open: false,
    tab: 'visual',          // 'visual' | 'raw'
    parsed: null,           // parseDesignMd output (frontmatter + body sections)
    sidecar: null,          // .tcher/design.json v2 payload (extensions + components + narrative)
    hasMd: false,
    hasSidecar: false,
    present: null,          // true/false once fetch resolves
    raw: null,              // raw DESIGN.md for the raw tab
    mdNewerThanJson: false, // stale-hint flag
    loading: false,
    error: null,
    collapsed: {            // narrative-section accordion state
      rules: true, dosdonts: true, overview: true,
    },
  };

  function loadDesignPrefs() {
    // `open` is intentionally NOT persisted - the panel always starts closed
    // so live mode doesn't auto-slide a big panel over the page on startup.
    try {
      const raw = localStorage.getItem(DESIGN_PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (prefs.tab === 'visual' || prefs.tab === 'raw') designState.tab = prefs.tab;
      if (prefs.collapsed && typeof prefs.collapsed === 'object') {
        Object.assign(designState.collapsed, prefs.collapsed);
      }
    } catch { /* ignore */ }
  }

  function saveDesignPrefs() {
    try {
      localStorage.setItem(DESIGN_PREFS_KEY, JSON.stringify({
        tab: designState.tab,
        collapsed: designState.collapsed,
      }));
    } catch { /* ignore */ }
  }

  function initDesignPanel() {
    designHost = document.createElement('div');
    designHost.id = PREFIX + '-design-host';
    Object.assign(designHost.style, {
      position: 'fixed', top: '0', left: '0',
      width: '0', height: '0',
      zIndex: String(Z.bar + 10),
      pointerEvents: 'none',
    });
    designShadow = designHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    // Theme-match the bar: dark chrome on light pages, light chrome on dark pages.
    const theme = detectPageTheme();
    style.textContent = designPanelCss(barPaletteForTheme(theme));
    designShadow.appendChild(style);

    const root = document.createElement('div');
    root.className = 'root';
    designShadow.appendChild(root);

    uiAppend(designHost);
    // The host is pointer-events: none; the panel inside the shadow DOM
    // manages its own auto/none. Events bubble through the shadow boundary,
    // so attaching here silences host-page outside-interaction handlers
    // without touching the host's click-through behavior.
    defangOutsideHandlers(designHost, { setPointerEvents: false });

    loadDesignPrefs();
    renderDesignChrome();
    if (designState.open) {
      fetchDesignSystem();
    }
  }

  // Neutral panel palette - deliberately NOT Tcher-branded. The panel is
  // a viewer of the project's design system, not an Tcher surface.
  const DP = {
    canvas:   'oklch(94% 0 0)',            // panel background
    tile:     'oklch(98.5% 0 0)',          // card-on-canvas
    tileAlt:  'oklch(96% 0 0)',            // subtler tile for inner surfaces
    ink:      'oklch(15% 0 0)',
    ink2:     'oklch(35% 0 0)',
    meta:     'oklch(55% 0 0)',
    hairline: 'oklch(88% 0 0)',
    hairlineSoft: 'oklch(92% 0 0)',
    amber:    'oklch(45% 0 0)',             // stale-hint accent (mono)
    amberBg:  'oklch(95% 0 0)',
  };

  function designPanelCss(BP) {
    // BP = bar palette (theme-aware, matches the global bar).
    // DP = internal content palette (neutral, so tiles render colors true).
    return `
      :host, .root { all: initial; }
      .root {
        font-family: ${FONT};
        color: ${DP.ink};
        pointer-events: none;
      }
      .root * { box-sizing: border-box; }
      button { font: inherit; color: inherit; }

      /* Panel shell: chrome matches the bar; body canvas stays neutral */
      .panel {
        position: fixed; top: 12px; bottom: 72px; right: 12px;
        width: ${DESIGN_PANEL_WIDTH}px; max-width: calc(100vw - 24px);
        background: ${BP.surface};
        border: 1.5px solid ${BP.border};
        border-radius: 14px;
        box-shadow: ${BP.shadow};
        display: flex; flex-direction: column;
        transform: translateX(calc(100% + 24px));
        opacity: 0;
        transition: transform 0.35s ${EASE}, opacity 0.25s ${EASE};
        pointer-events: none;
        overflow: hidden;
      }
      .panel[data-open="true"] { transform: translateX(0); opacity: 1; pointer-events: auto; }

      .panel-header {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 10px 10px 14px;
        background: transparent;
        border-bottom: 1px solid ${BP.hairline};
      }
      .panel-title {
        flex: 1; min-width: 0;
        font-family: ${MONO};
        font-size: 11.5px; font-weight: 600;
        letter-spacing: 0.02em;
        color: ${BP.text};
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .panel-close {
        border: none; background: transparent; color: ${BP.textDim};
        width: 26px; height: 26px; border-radius: 7px;
        display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; transition: background 0.15s ease, color 0.15s ease;
      }
      .panel-close:hover { background: ${BP.hairline}; color: ${BP.text}; }

      .tabs {
        display: inline-flex; padding: 2px;
        background: ${BP.hairline};
        border-radius: 7px;
        gap: 2px;
      }
      .tab {
        border: none; background: transparent;
        padding: 4px 10px; border-radius: 5px;
        font-family: ${MONO};
        font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
        text-transform: uppercase;
        color: ${BP.textDim}; cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .tab[data-active="true"] { background: ${BP.surface}; color: ${BP.text}; }

      .panel-body {
        flex: 1; overflow-y: auto;
        padding: 12px 12px 20px;
        background: ${DP.canvas};
        scrollbar-width: thin;
        scrollbar-color: ${DP.hairline} transparent;
      }
      .panel-body::-webkit-scrollbar { width: 8px; }
      .panel-body::-webkit-scrollbar-thumb { background: ${DP.hairline}; border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }

      /* States */
      .empty, .loading, .error {
        margin: 16px 4px;
        padding: 28px 20px; text-align: center;
        background: ${DP.tile}; border-radius: 14px;
        color: ${DP.ink2}; font-size: 13px; line-height: 1.55;
      }
      .empty strong { color: ${DP.ink}; display: block; margin-bottom: 6px; font-size: 14px; }
      .empty code { font-family: ${MONO}; background: ${DP.canvas}; padding: 1px 6px; border-radius: 4px; font-size: 12px; color: ${DP.ink}; }
      .error { color: oklch(30% 0 0); }

      /* Stale hint */
      .stale {
        display: flex; align-items: center; gap: 8px;
        margin: 8px 4px 12px;
        padding: 8px 12px;
        background: ${DP.amberBg};
        border-radius: 10px;
        font-size: 11.5px; color: ${DP.ink2};
      }
      .stale-dot { width: 8px; height: 8px; border-radius: 50%; background: ${DP.amber}; flex-shrink: 0; }
      .stale-text { flex: 1; min-width: 0; }
      .stale-text strong { color: ${DP.ink}; font-weight: 600; }

      /* Parsed-md fallback banner */
      .parsed-md-cta {
        margin: 8px 4px 14px;
        padding: 14px 16px;
        background: ${DP.tile};
        border: 1px dashed ${DP.hairline};
        border-radius: 12px;
        font-size: 12px; color: ${DP.ink2}; line-height: 1.55;
      }
      .parsed-md-cta strong { color: ${DP.ink}; display: block; margin-bottom: 4px; font-size: 13px; font-weight: 600; }
      .parsed-md-cta code { font-family: ${MONO}; background: ${DP.canvas}; padding: 1px 5px; border-radius: 4px; font-size: 11.5px; color: ${DP.ink}; }

      /* Tile primitives */
      .tile {
        position: relative;
        background: ${DP.tile};
        border-radius: 16px;
        padding: 16px;
        margin: 0 4px 10px;
      }
      .tile-row { margin: 0 4px 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .tile-row .tile { margin: 0; }
      .tile-meta {
        display: flex; align-items: baseline; justify-content: space-between;
        gap: 10px;
        font-family: ${MONO};
        font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;
        color: ${DP.meta};
      }
      .tile-meta .name { color: ${DP.ink}; font-weight: 600; letter-spacing: 0.05em; text-transform: none; font-family: ${FONT}; font-size: 12.5px; }

      /* Color tile */
      .c-tile { cursor: pointer; transition: transform 0.2s ${EASE}; }
      .c-tile:hover { transform: translateY(-1px); }
      .c-hero {
        height: 72px; border-radius: 10px; margin-top: 10px;
        box-shadow: inset 0 0 0 1px oklch(0% 0 0 / 0.05);
      }
      .c-ramp {
        display: flex; gap: 0; height: 14px; border-radius: 4px; overflow: hidden;
        margin-top: 8px;
        box-shadow: inset 0 0 0 1px oklch(0% 0 0 / 0.04);
      }
      .c-ramp > span { flex: 1; }
      .c-desc { margin-top: 8px; font-size: 11.5px; line-height: 1.45; color: ${DP.ink2}; }

      /* Type tile */
      .t-tile { }
      .t-specimen {
        margin: 4px 0 6px;
        color: ${DP.ink};
        line-height: 0.9;
      }
      .t-family { margin-top: 4px; font-size: 12px; font-weight: 600; color: ${DP.ink}; }
      .t-purpose { margin-top: 4px; font-size: 11px; line-height: 1.45; color: ${DP.ink2}; }

      /* Shadow tile */
      .s-tile { }
      .s-surface {
        height: 60px; margin: 8px 2px 10px;
        background: ${DP.tile};
        border-radius: 10px;
      }
      .s-value { font-family: ${MONO}; font-size: 10px; color: ${DP.meta}; word-break: break-all; line-height: 1.4; }
      .s-purpose { margin-top: 4px; font-size: 11px; color: ${DP.ink2}; line-height: 1.45; }

      /* Radii strip */
      .r-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
      .r-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 60px; }
      .r-sample { width: 44px; height: 44px; background: ${DP.canvas}; box-shadow: inset 0 0 0 1px oklch(0% 0 0 / 0.08); }
      .r-label { font-family: ${MONO}; font-size: 10px; color: ${DP.meta}; letter-spacing: 0.05em; text-transform: uppercase; }
      .r-val { font-family: ${MONO}; font-size: 10px; color: ${DP.ink}; }

      /* Component tile (hosts live primitives) */
      .cmp-tile { }
      .cmp-stage {
        margin: 12px -4px 0;
        padding: 18px 16px 10px;
        border-top: 1px solid ${DP.hairlineSoft};
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 14px;
        min-height: 68px;
      }
      .cmp-stage + .cmp-stage { border-top: 1px dashed ${DP.hairlineSoft}; }
      .cmp-sublabel { font-family: ${MONO}; font-size: 10px; color: ${DP.meta}; letter-spacing: 0.06em; }
      .cmp-kind { font-family: ${MONO}; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: ${DP.meta}; }

      /* Collapsible */
      .coll {
        margin: 0 4px 8px;
        background: ${DP.tile};
        border-radius: 12px;
        overflow: hidden;
      }
      .coll-head {
        display: flex; align-items: center; gap: 10px;
        width: 100%;
        padding: 12px 14px;
        background: transparent; border: none;
        cursor: pointer; text-align: left;
        font-family: ${FONT}; font-size: 12.5px; font-weight: 600; color: ${DP.ink};
        transition: background 0.12s ease;
      }
      .coll-head:hover { background: ${DP.tileAlt}; }
      .coll-chev {
        width: 12px; height: 12px; flex-shrink: 0;
        color: ${DP.meta};
        transition: transform 0.2s ${EASE};
      }
      .coll[data-open="true"] .coll-chev { transform: rotate(90deg); }
      .coll-count { margin-left: auto; font-family: ${MONO}; font-size: 10px; color: ${DP.meta}; letter-spacing: 0.05em; }
      .coll-body { padding: 0 14px 14px; display: none; }
      .coll[data-open="true"] .coll-body { display: block; }

      .rule-card {
        padding: 10px 0;
        border-top: 1px solid ${DP.hairlineSoft};
      }
      .rule-card:first-child { border-top: none; padding-top: 2px; }
      .rule-card .name { font-size: 11.5px; font-weight: 700; color: ${DP.ink}; margin-bottom: 3px; }
      .rule-card .name .section { font-family: ${MONO}; font-size: 9px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: ${DP.meta}; margin-left: 8px; }
      .rule-card .body { font-size: 11.5px; color: ${DP.ink2}; line-height: 1.5; }

      .coll .dos { display: grid; gap: 0; margin-top: 2px; }
      .coll .do, .coll .dont {
        position: relative;
        padding: 8px 0 8px 22px;
        font-size: 11.5px; line-height: 1.5; color: ${DP.ink2};
        border-top: 1px solid ${DP.hairlineSoft};
      }
      .coll .do:first-child, .coll .dont:first-child,
      .coll .do:first-of-type { border-top: none; }
      .coll .do + .dont { border-top: 1px solid ${DP.hairlineSoft}; }
      .coll .do::before, .coll .dont::before {
        content: ''; position: absolute; left: 4px; top: 13px;
        width: 8px; height: 8px; border-radius: 50%;
      }
      .coll .do::before { background: oklch(20% 0 0); }
      .coll .dont::before { background: oklch(70% 0 0); }

      .coll .overview-body {
        font-size: 12px; line-height: 1.55; color: ${DP.ink2};
      }
      .coll .overview-body .north-star {
        display: block; font-family: ${FONT}; font-style: italic;
        font-size: 15px; line-height: 1.3; color: ${DP.ink};
        margin-bottom: 8px;
      }
      .coll .overview-body p { margin: 0 0 8px; }
      .coll .overview-body ul { margin: 6px 0 0; padding-left: 16px; font-size: 11.5px; }
      .coll .overview-body li { margin-bottom: 3px; }

      /* raw tab markdown (unchanged layout, neutralized palette) */
      .md { padding: 4px 10px 20px; font-size: 13px; line-height: 1.6; color: ${DP.ink}; }
      .md h1, .md h2, .md h3, .md h4 { margin: 20px 0 8px; color: ${DP.ink}; font-weight: 600; }
      .md h1 { font-size: 18px; }
      .md h2 { font-size: 15px; padding-bottom: 4px; border-bottom: 1px solid ${DP.hairlineSoft}; }
      .md h3 { font-size: 13px; }
      .md h4 { font-size: 12px; color: ${DP.meta}; }
      .md p { margin: 0 0 10px; }
      .md ul, .md ol { margin: 0 0 10px; padding-left: 20px; }
      .md li { margin-bottom: 4px; }
      .md code { font-family: ${MONO}; font-size: 12px; background: ${DP.canvas}; padding: 1px 5px; border-radius: 4px; }
      .md pre { font-family: ${MONO}; font-size: 12px; background: ${DP.canvas}; padding: 10px 12px; border-radius: 8px; overflow-x: auto; margin: 0 0 10px; }
      .md pre code { background: none; padding: 0; }
      .md strong { font-weight: 700; }
      .md em { font-style: italic; }
      .md a { color: ${DP.ink}; text-decoration: underline; }
      .md hr { border: none; border-top: 1px solid ${DP.hairlineSoft}; margin: 16px 0; }
    `;
  }

  function renderDesignChrome() {
    const root = designShadow.querySelector('.root');
    root.innerHTML = '';

    // (Panel toggle lives in the global bar - no floating FAB.)
    // Panel
    const panel = document.createElement('aside');
    panel.className = 'panel';
    panel.setAttribute('data-open', designState.open ? 'true' : 'false');
    panel.appendChild(buildDesignHeader());
    const body = document.createElement('div');
    body.className = 'panel-body';
    body.id = 'panel-body';
    panel.appendChild(body);
    root.appendChild(panel);

    renderDesignBody();
  }

  function buildDesignHeader() {
    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'DESIGN.md';
    header.appendChild(title);

    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    for (const t of [['visual', 'Visual'], ['raw', 'Raw']]) {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.textContent = t[1];
      btn.setAttribute('data-active', designState.tab === t[0] ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (designState.tab === t[0]) return;
        designState.tab = t[0];
        saveDesignPrefs();
        renderDesignChrome();
        if (t[0] === 'raw' && designState.raw === null && !designState.loading) {
          fetchDesignSystem(); // raw is part of the same fetch pair
        }
      });
      tabs.appendChild(btn);
    }
    header.appendChild(tabs);

    const close = document.createElement('button');
    close.className = 'panel-close';
    close.innerHTML = '&#x2715;';
    close.setAttribute('aria-label', 'Close panel');
    close.addEventListener('click', toggleDesignPanel);
    header.appendChild(close);

    return header;
  }

  function toggleDesignPanel() {
    if (pendingApplyInFlight) { showManualApplyBusyToast(); return; }
    designState.open = !designState.open;
    renderDesignChrome();
    updateGlobalBarState();
    if (designState.open && designState.present === null && !designState.loading) {
      fetchDesignSystem();
    }
  }

  async function fetchDesignSystem() {
    designState.loading = true;
    designState.error = null;
    renderDesignBody();
    try {
      const [jsonRes, rawRes] = await Promise.all([
        fetch(`http://localhost:${PORT}/design-system.json?token=${TOKEN}`, { cache: 'no-store' }),
        fetch(`http://localhost:${PORT}/design-system/raw?token=${TOKEN}`, { cache: 'no-store' }),
      ]);
      const jsonData = await jsonRes.json();
      designState.present = jsonData.present === true;
      designState.parsed = jsonData.parsed || null;
      designState.sidecar = jsonData.sidecar || null;
      designState.hasMd = !!jsonData.hasMd;
      designState.hasSidecar = !!jsonData.hasSidecar;
      designState.mdNewerThanJson = !!jsonData.mdNewerThanJson;
      designState.raw = designState.present && rawRes.ok ? await rawRes.text() : null;
      designState.error = jsonData.parseError || jsonData.sidecarError || null;
    } catch (err) {
      designState.error = err?.message || 'Failed to load design system.';
    } finally {
      designState.loading = false;
      renderDesignChrome(); // refresh title from data
    }
  }

  function renderDesignBody() {
    const body = designShadow.querySelector('#panel-body');
    if (!body) return;
    body.innerHTML = '';

    if (designState.loading) {
      body.appendChild(msgDiv('loading', 'Loading design system…'));
      return;
    }
    if (designState.error) {
      body.appendChild(msgDiv('error', designState.error));
      return;
    }
    if (designState.present === false) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.innerHTML = `<strong>No DESIGN.md yet</strong>Create one by running <code>/tcher document</code> in your terminal, then re-open this panel.`;
      body.appendChild(empty);
      return;
    }

    if (designState.tab === 'raw') {
      renderRawTab(body, designState.raw || '');
      return;
    }

    // Visual tab - single unified render path.
    if (designState.mdNewerThanJson) body.appendChild(renderStaleHint());
    if (designState.hasMd && !designState.hasSidecar) {
      body.appendChild(renderParsedMdCta());
    }
    renderDesignVisual(body, designState.parsed, designState.sidecar);
  }

  function msgDiv(cls, text) {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    return d;
  }

  function renderStaleHint() {
    const box = document.createElement('div');
    box.className = 'stale';
    box.innerHTML = `
      <span class="stale-dot"></span>
      <span class="stale-text"><strong>DESIGN.md is newer than .tcher/design.json.</strong> Run <code>/tcher document</code> to refresh the sidecar.</span>
    `;
    return box;
  }

  function renderParsedMdCta() {
    const box = document.createElement('div');
    box.className = 'parsed-md-cta';
    box.innerHTML = `<strong>Basic view</strong>This panel reads the tokens in your <code>DESIGN.md</code> frontmatter. Running <code>/tcher document</code> also generates a <code>.tcher/design.json</code> sidecar with your project's actual component snippets (button, input, nav) and tonal ramps, rendered live below the tokens.`;
    return box;
  }

  // Unified render: merge parsed DESIGN.md frontmatter with sidecar v2

  function renderDesignVisual(body, parsed, sidecar) {
    const frontmatter = parsed?.frontmatter || {};
    const extensions = sidecar?.extensions || {};
    const proseColors = parsed?.colors || null;

    const colors = buildColorModels(frontmatter.colors, extensions.colorMeta, proseColors);
    if (colors.length) renderColorTiles(body, colors);

    const types = buildTypographyModels(frontmatter.typography, extensions.typographyMeta);
    if (types.length) renderTypeTiles(body, types);

    const radii = buildRadiiModels(frontmatter.rounded);
    if (radii.length) renderRadiiTile(body, radii);

    if (extensions.shadows?.length) renderShadowTiles(body, extensions.shadows);

    const components = sidecar?.components || [];
    if (components.length) renderComponentTiles(body, components);

    // Narrative: sidecar wins if present (richer, agent-curated). Otherwise
    // synthesize from prose sections.
    const narrative = sidecar?.narrative || synthesizeNarrative(parsed);
    if (narrative.rules?.length) body.appendChild(renderRulesCollapsible(narrative.rules));
    if ((narrative.dos?.length || narrative.donts?.length)) body.appendChild(renderDosDontsCollapsible(narrative));
    if (narrative.overview || narrative.northStar || narrative.keyCharacteristics?.length) {
      body.appendChild(renderOverviewCollapsible(narrative));
    }

    if (body.childElementCount === 0) {
      body.appendChild(msgDiv('empty', 'No design system data available.'));
    }
  }

  // Frontmatter primitives + sidecar colorMeta → tile-ready color models.
  // A matching prose bullet (when the slug sits in the bullet text) supplies
  // description as a last-resort fallback.
  function buildColorModels(fmColors, colorMeta, proseColors) {
    if (!fmColors) return [];
    const meta = colorMeta || {};
    return Object.entries(fmColors).map(([key, value]) => {
      const m = meta[key] || {};
      return {
        role: m.role || humanizeKey(key),
        name: m.displayName || humanizeKey(key),
        value: normalizeCssColor(m.canonical || value),
        canonical: m.canonical || null,
        description: m.description || findProseDescription(proseColors, key, m.displayName),
        tonalRamp: m.tonalRamp || null,
      };
    });
  }

  function buildTypographyModels(fmTypography, typographyMeta) {
    if (!fmTypography) return [];
    const meta = typographyMeta || {};
    return Object.entries(fmTypography).map(([key, spec]) => {
      const m = meta[key] || {};
      const { family, fallback } = splitFontFamily(spec?.fontFamily);
      return {
        role: key,
        name: m.displayName || humanizeKey(key),
        family,
        fallback,
        weight: spec?.fontWeight ?? 400,
        // fontStyle isn't in Stitch's frontmatter schema; the sidecar carries
        // it when a role is rendered in italic (e.g. display italic).
        style: m.style || 'normal',
        sampleSize: spec?.fontSize || '1rem',
        lineHeight: spec?.lineHeight != null ? String(spec.lineHeight) : '',
        letterSpacing: spec?.letterSpacing,
        purpose: m.purpose,
      };
    });
  }

  function buildRadiiModels(fmRounded) {
    if (!fmRounded) return [];
    return Object.entries(fmRounded).map(([name, value]) => ({ name, value }));
  }

  function splitFontFamily(stack) {
    if (!stack || typeof stack !== 'string') return { family: '', fallback: '' };
    const parts = stack.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    return { family: parts[0] || '', fallback: parts.slice(1).join(', ') };
  }

  function humanizeKey(k) {
    return String(k || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function findProseDescription(proseColors, key, displayName) {
    if (!proseColors || !proseColors.groups) return null;
    const needles = [key, displayName].filter(Boolean).map((s) => s.toLowerCase());
    for (const g of proseColors.groups) {
      for (const c of g.colors || []) {
        const hay = String(c.name || '').toLowerCase();
        if (hay && needles.some((n) => hay.includes(n) || n.includes(hay))) {
          return c.description || null;
        }
      }
    }
    return null;
  }

  function synthesizeNarrative(parsed) {
    if (!parsed) return {};
    const md = parsed;
    return {
      northStar: md.overview?.creativeNorthStar,
      overview: (md.overview?.philosophy || []).join(' '),
      keyCharacteristics: md.overview?.keyCharacteristics || [],
      rules: [
        ...(md.colors?.rules || []).map((r) => ({ ...r, section: 'colors' })),
        ...(md.typography?.rules || []).map((r) => ({ ...r, section: 'typography' })),
        ...(md.elevation?.rules || []).map((r) => ({ ...r, section: 'elevation' })),
      ],
      dos: md.dosDonts?.dos || [],
      donts: md.dosDonts?.donts || [],
    };
  }

  function renderColorTiles(body, colors) {
    for (const c of colors) {
      const tile = document.createElement('div');
      tile.className = 'tile c-tile';
      tile.title = 'Click to copy';
      tile.addEventListener('click', () => copyToClipboard(c.value));

      const meta = document.createElement('div');
      meta.className = 'tile-meta';
      meta.innerHTML = `<span class="name">${escapeHtml(c.name || c.role || 'Color')}</span><span>${escapeHtml(c.value || '')}</span>`;
      tile.appendChild(meta);

      const hero = document.createElement('div');
      hero.className = 'c-hero';
      hero.style.background = cssSafe(c.value || '');
      tile.appendChild(hero);

      const ramp = synthesizeRamp(c);
      if (ramp.length) {
        const r = document.createElement('div');
        r.className = 'c-ramp';
        r.innerHTML = ramp.map((v) => `<span style="background:${cssSafe(v)}"></span>`).join('');
        tile.appendChild(r);
      }

      if (c.description) {
        const d = document.createElement('div');
        d.className = 'c-desc';
        d.textContent = c.description;
        tile.appendChild(d);
      }
      body.appendChild(tile);
    }
  }

  function synthesizeRamp(c) {
    if (c.tonalRamp?.length) return c.tonalRamp;
    // If base value is OKLCH, synthesize an 8-step ramp across lightness.
    const m = typeof c.value === 'string' && c.value.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/i);
    if (!m) return [];
    const [, , chroma, hue] = m;
    const steps = [20, 32, 44, 56, 68, 80, 90, 96];
    return steps.map((l) => `oklch(${l}% ${chroma} ${hue})`);
  }

  function renderTypeTiles(body, types) {
    for (const t of types) {
      const tile = document.createElement('div');
      tile.className = 'tile t-tile';

      const meta = document.createElement('div');
      meta.className = 'tile-meta';
      meta.innerHTML = `<span>${escapeHtml(t.role || '')}</span><span>${escapeHtml(t.weight || '')} ${escapeHtml(t.style === 'italic' ? 'italic' : '')}</span>`;
      tile.appendChild(meta);

      const specimen = document.createElement('div');
      specimen.className = 't-specimen';
      specimen.textContent = 'Aa';
      specimen.style.fontFamily = fontStack(t);
      specimen.style.fontWeight = String(t.weight || 400);
      specimen.style.fontStyle = t.style || 'normal';
      specimen.style.fontSize = '56px';  // Fixed specimen size - compare faces, not scales.
      specimen.style.letterSpacing = 'normal';
      specimen.style.textTransform = 'none';
      tile.appendChild(specimen);

      // The system's actual sample size for this role, shown as small mono meta below.
      if (t.sampleSize) {
        const scale = document.createElement('div');
        scale.style.cssText = 'font-family:' + MONO + '; font-size: 10px; color:' + DP.meta + '; margin-top: 2px;';
        scale.textContent = t.sampleSize;
        tile.appendChild(scale);
      }

      const family = document.createElement('div');
      family.className = 't-family';
      family.textContent = t.family || t.name || '';
      tile.appendChild(family);

      if (t.purpose) {
        const p = document.createElement('div');
        p.className = 't-purpose';
        p.textContent = t.purpose;
        tile.appendChild(p);
      }
      body.appendChild(tile);
    }
  }

  function fontStack(t) {
    const fam = t.family || '';
    const fb = t.fallback || '';
    if (fam && /[,\s]/.test(fam) && !fam.includes("'") && !fam.includes('"')) {
      return `"${fam}", ${fb}`;
    }
    return fam && fb ? `"${fam}", ${fb}` : (fam || fb);
  }

  function renderRadiiTile(body, radii) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    const meta = document.createElement('div');
    meta.className = 'tile-meta';
    meta.innerHTML = `<span class="name">Corner Radii</span><span>${radii.length}</span>`;
    tile.appendChild(meta);

    const strip = document.createElement('div');
    strip.className = 'r-strip';
    for (const r of radii) {
      const item = document.createElement('div');
      item.className = 'r-item';
      const s = document.createElement('div');
      s.className = 'r-sample';
      s.style.borderRadius = r.value || '0';
      item.appendChild(s);
      const lbl = document.createElement('div');
      lbl.className = 'r-label';
      lbl.textContent = r.name || '';
      item.appendChild(lbl);
      const val = document.createElement('div');
      val.className = 'r-val';
      val.textContent = r.value || '';
      item.appendChild(val);
      strip.appendChild(item);
    }
    tile.appendChild(strip);
    body.appendChild(tile);
  }

  function renderShadowTiles(body, shadows) {
    for (const sh of shadows) {
      const tile = document.createElement('div');
      tile.className = 'tile s-tile';

      const meta = document.createElement('div');
      meta.className = 'tile-meta';
      meta.innerHTML = `<span class="name">${escapeHtml(sh.name || 'Shadow')}</span><span>Elevation</span>`;
      tile.appendChild(meta);

      const surface = document.createElement('div');
      surface.className = 's-surface';
      surface.style.boxShadow = sh.value || 'none';
      tile.appendChild(surface);

      const val = document.createElement('div');
      val.className = 's-value';
      val.textContent = sh.value || '';
      tile.appendChild(val);

      if (sh.purpose) {
        const p = document.createElement('div');
        p.className = 's-purpose';
        p.textContent = sh.purpose;
        tile.appendChild(p);
      }
      body.appendChild(tile);
    }
  }

  function renderComponentTiles(body, components) {
    // Group consecutive components that share a kind into one tile. This avoids
    // a pile of one-component tiles (e.g., three button variants = three tiles)
    // and reads more like a proper category.
    const groups = groupByKind(components);

    for (const group of groups) {
      const tile = document.createElement('div');
      tile.className = 'tile cmp-tile';

      const meta = document.createElement('div');
      meta.className = 'tile-meta';
      const groupTitle = group.length === 1
        ? (group[0].name || group[0].kind || 'Component')
        : titleForKind(group[0].kind, group.length);
      meta.innerHTML = `<span class="name">${escapeHtml(groupTitle)}</span><span class="cmp-kind">${escapeHtml(group[0].kind || '')}</span>`;
      tile.appendChild(meta);

      for (const c of group) {
        const stage = document.createElement('div');
        stage.className = 'cmp-stage';

        // Render the component in its own shadow root so its CSS can't bleed.
        const host = document.createElement('div');
        const sub = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = c.css || '';
        sub.appendChild(style);
        const container = document.createElement('div');
        container.innerHTML = c.html || '';
        sub.appendChild(container);
        stage.appendChild(host);

        // Show component name as a sublabel only when the tile groups >1 item,
        // or when the component's display name differs from its kind.
        const showSublabel = group.length > 1;
        if (showSublabel) {
          const lbl = document.createElement('div');
          lbl.className = 'cmp-sublabel';
          lbl.textContent = c.name || '';
          stage.appendChild(lbl);
        }
        tile.appendChild(stage);
      }

      // Single shared description if all items carry the same one; otherwise
      // skip - per-item descriptions clutter a grouped tile.
      if (group.length === 1 && group[0].description) {
        const d = document.createElement('div');
        d.className = 'c-desc';
        d.textContent = group[0].description;
        tile.appendChild(d);
      }
      body.appendChild(tile);
    }
  }

  function groupByKind(components) {
    const groups = [];
    for (const c of components) {
      const last = groups[groups.length - 1];
      if (last && last[0].kind && c.kind === last[0].kind) {
        last.push(c);
      } else {
        groups.push([c]);
      }
    }
    return groups;
  }

  function titleForKind(kind, count) {
    const labels = {
      button: 'Buttons',
      input: 'Inputs',
      nav: 'Navigation',
      chip: 'Chips',
      card: 'Cards',
      custom: 'Components',
    };
    return labels[kind] || (kind ? kind.charAt(0).toUpperCase() + kind.slice(1) + 's' : 'Components');
  }

  // Collapsibles.

  function buildCollapsible(key, label, count) {
    const wrap = document.createElement('div');
    wrap.className = 'coll';
    wrap.setAttribute('data-open', designState.collapsed[key] ? 'false' : 'true');

    const head = document.createElement('button');
    head.className = 'coll-head';
    head.innerHTML = `
      <svg class="coll-chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.5L8 6 4 9.5"/></svg>
      <span>${escapeHtml(label)}</span>
      ${count != null ? `<span class="coll-count">${escapeHtml(String(count))}</span>` : ''}
    `;
    head.addEventListener('click', () => {
      designState.collapsed[key] = !designState.collapsed[key];
      saveDesignPrefs();
      renderDesignBody();
    });
    wrap.appendChild(head);

    const body = document.createElement('div');
    body.className = 'coll-body';
    wrap.appendChild(body);
    return { wrap, body };
  }

  function renderRulesCollapsible(rules) {
    const { wrap, body } = buildCollapsible('rules', 'Named Rules', rules.length);
    for (const r of rules) {
      const card = document.createElement('div');
      card.className = 'rule-card';
      const name = document.createElement('div');
      name.className = 'name';
      name.innerHTML = `${escapeHtml(r.name)}${r.section ? `<span class="section">${escapeHtml(r.section)}</span>` : ''}`;
      card.appendChild(name);
      const b = document.createElement('div');
      b.className = 'body';
      b.textContent = r.body || '';
      card.appendChild(b);
      body.appendChild(card);
    }
    return wrap;
  }

  function renderDosDontsCollapsible(n) {
    const total = (n.dos?.length || 0) + (n.donts?.length || 0);
    const { wrap, body } = buildCollapsible('dosdonts', "Do's and Don'ts", total);
    const grid = document.createElement('div');
    grid.className = 'dos';
    for (const d of n.dos || []) {
      const el = document.createElement('div');
      el.className = 'do';
      el.innerHTML = inlineMd(d);
      grid.appendChild(el);
    }
    for (const d of n.donts || []) {
      const el = document.createElement('div');
      el.className = 'dont';
      el.innerHTML = inlineMd(d);
      grid.appendChild(el);
    }
    body.appendChild(grid);
    return wrap;
  }

  function renderOverviewCollapsible(n) {
    const { wrap, body } = buildCollapsible('overview', 'Overview', null);
    const ov = document.createElement('div');
    ov.className = 'overview-body';
    if (n.northStar) {
      const star = document.createElement('span');
      star.className = 'north-star';
      star.textContent = '“' + n.northStar + '”';
      ov.appendChild(star);
    }
    if (n.overview) {
      const p = document.createElement('p');
      p.innerHTML = inlineMd(n.overview);
      ov.appendChild(p);
    }
    if (n.keyCharacteristics?.length) {
      const ul = document.createElement('ul');
      ul.innerHTML = n.keyCharacteristics.map((k) => `<li>${inlineMd(k)}</li>`).join('');
      ov.appendChild(ul);
    }
    body.appendChild(ov);
    return wrap;
  }

  function cssSafe(v) {
    // Strip anything outside valid CSS value chars to prevent injection via
    // .tcher/design.json values rendered into inline style strings.
    return String(v).replace(/[<>"'`\n]/g, '');
  }

  function normalizeCssColor(v) {
    if (!v || typeof v !== 'string') return v;
    const s = v.trim();
    const oklch = s.match(/oklch\([^)]+\)/i);
    if (oklch) return oklch[0];
    const hex = s.match(/#[0-9a-fA-F]{3,8}\b/);
    if (hex) return hex[0];
    const rgb = s.match(/rgba?\([^)]+\)/i);
    if (rgb) return rgb[0];
    return s.replace(/\s+#.*$/, '').trim();
  }

  // Raw tab: minimal markdown renderer (subset)

  function renderRawTab(body, md) {
    const wrap = document.createElement('div');
    wrap.className = 'md';
    wrap.innerHTML = renderMarkdown(md);
    body.appendChild(wrap);
  }

  function renderMarkdown(md) {
    const lines = md.split(/\r?\n/);
    const out = [];
    let i = 0;
    let inCode = false;
    let codeBuf = [];
    let paraBuf = [];
    let listBuf = [];  // array of { indent, html }
    let listType = null; // 'ul' | 'ol'

    const flushPara = () => {
      if (paraBuf.length) {
        out.push(`<p>${inlineMd(paraBuf.join(' '))}</p>`);
        paraBuf = [];
      }
    };
    const flushList = () => {
      if (listBuf.length) {
        out.push(buildListHtml(listBuf, listType));
        listBuf = [];
        listType = null;
      }
    };
    const flushAll = () => { flushPara(); flushList(); };

    for (; i < lines.length; i++) {
      const line = lines[i];

      // Code fence
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        if (!inCode) { flushAll(); inCode = true; codeBuf = []; }
        else {
          out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
          inCode = false;
        }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      if (line.trim() === '') { flushAll(); continue; }

      const hr = line.match(/^\s*(?:---+|\*\*\*+)\s*$/);
      if (hr) { flushAll(); out.push('<hr />'); continue; }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        flushAll();
        const lvl = heading[1].length;
        out.push(`<h${lvl}>${inlineMd(heading[2])}</h${lvl}>`);
        continue;
      }

      const bullet = line.match(/^(\s*)([-*])\s+(.+)$/);
      const ordered = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
      if (bullet || ordered) {
        flushPara();
        const m = bullet || ordered;
        const indent = Math.floor(m[1].length / 2);
        const t = bullet ? 'ul' : 'ol';
        if (listType && listType !== t) flushList();
        listType = t;
        listBuf.push({ indent, html: inlineMd(m[3]) });
        continue;
      }

      paraBuf.push(line);
    }
    flushAll();
    if (inCode && codeBuf.length) {
      out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
    }
    return out.join('\n');
  }

  function buildListHtml(items, type) {
    // Nest by indent (one level deep is plenty for DESIGN.md).
    let html = `<${type}>`;
    let lastIndent = 0;
    for (const it of items) {
      if (it.indent > lastIndent) html += `<${type}>`;
      else if (it.indent < lastIndent) html += `</${type}>`.repeat(lastIndent - it.indent);
      html += `<li>${it.html}</li>`;
      lastIndent = it.indent;
    }
    html += `</${type}>`.repeat(lastIndent + 1);
    return html;
  }

  function inlineMd(text) {
    // Order matters: escape first, then re-inject tags.
    let s = escapeHtml(text);
    // Code spans
    s = s.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
    // Links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
    // Bold
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic (only single *…*, skip if inside bold already handled)
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    return s;
  }

  function highlightBold(text) {
    return inlineMd(text);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function copyToClipboard(text) {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      showToast('Copied: ' + text);
    } catch { /* ignore */ }
  }

  //
  // Init
  //

  function init() {
    try { history.scrollRestoration = 'manual'; } catch {}
    initHighlight();
    initEditBadge();
    initAnnotOverlay();
    initBar();
    initActionPicker();
    initParamsPanel();
    initGlobalBar();
    attachSteerFocusDebug();
    attachSteerFocusGuard();
    initDesignPanel();
    fetchPendingCount();
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    connectSSE();

    // Check for an active session to resume (variant wrapper already in DOM after HMR)
    if (!resumeSession()) {
      console.log('[tcher] Live variant mode ready. Hover over elements to pick one.');
      // SvelteKit (and any framework that hydrates after HTML parse) may add
      // the variant wrapper AFTER init runs. Watch for it and retry resume
      // once it appears. Disconnect on first hit.
      const scout = new MutationObserver(() => {
        const wrapper = document.querySelector('[data-tcher-variants]');
        if (!wrapper) return;
        scout.disconnect();
        if (resumeSession()) {
          console.log('[tcher] Resumed deferred session ' + currentSessionId + ' (post-hydration).');
        }
      });
      scout.observe(document.body, { childList: true, subtree: true });
    } else {
      console.log('[tcher] Resumed active variant session ' + currentSessionId + ' (' + arrivedVariants + '/' + expectedVariants + ' variants).');
    }

    syncPageChatFocus('init-complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
