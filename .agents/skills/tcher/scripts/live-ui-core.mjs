/**
 * Framework-neutral Tcher live chrome contract.
 *
 * The production browser bundle is intentionally plain DOM so Svelte, React,
 * Vue, and static adapters can all mount the same chrome. This module is the
 * testable contract/inventory for that bundle; live-browser.js mirrors these
 * values at runtime because it is served as a standalone script.
 */

export const LIVE_CHROME_MOUNT_CONTRACT = Object.freeze([
  'root',
  'transport',
  'state',
  'actions',
]);

export const LIVE_UI_SURFACES = Object.freeze([
  {
    key: 'global-bottom-bar',
    ids: [
      'tcher-live-global-bar',
      'tcher-live-global-bar-brand',
      'tcher-live-pick-toggle',
      'tcher-live-insert-toggle',
      'tcher-live-detect-toggle',
      'tcher-live-detect-badge',
      'tcher-live-design-toggle',
      'tcher-live-page-chat',
      'tcher-live-page-chat-input',
      'tcher-live-page-chat-voice',
    ],
    states: ['rest', 'hover', 'focus-visible', 'pressed', 'active', 'tooltip'],
  },
  {
    key: 'pending-copy-edit-dock',
    ids: ['tcher-live-pending-dock'],
    states: ['closed', 'open', 'hover', 'pressed', 'loading', 'rollback', 'keep-fixing'],
  },
  {
    key: 'element-selection-chrome',
    ids: [
      'tcher-live-highlight',
      'tcher-live-tooltip',
      'tcher-live-bar',
      'tcher-live-configure-input-wrap',
      'tcher-live-input',
      'tcher-live-configure-voice',
    ],
    states: ['rest', 'hover', 'focus-visible', 'pressed', 'disabled'],
  },
  {
    key: 'action-picker',
    ids: ['tcher-live-picker'],
    states: ['closed', 'open', 'option-hover', 'option-focus'],
  },
  {
    key: 'edit-chrome',
    ids: ['tcher-live-edit-badge'],
    states: ['enabled', 'disabled', 'editing', 'cancel', 'save', 'edited-content'],
  },
  {
    key: 'generating-row',
    ids: ['tcher-live-bar', 'tcher-live-shader'],
    states: ['action-label', 'animated-dots', 'generating', 'done'],
  },
  {
    key: 'variant-cycling-row',
    ids: ['tcher-live-bar', 'tcher-live-params-panel'],
    states: ['variant-1', 'variant-2', 'variant-3', 'left-disabled', 'right-disabled', 'dot-click', 'accept', 'discard'],
  },
  {
    key: 'variant-params-panel',
    ids: ['tcher-live-params-panel'],
    states: ['closed', 'open-above', 'open-below', 'range', 'steps', 'toggle'],
  },
  {
    key: 'saving-confirmed-rows',
    ids: ['tcher-live-bar'],
    states: ['saving', 'applying-variant', 'confirmed'],
  },
  {
    key: 'insert-mode-chrome',
    ids: [
      'tcher-live-insert-line',
      'tcher-live-insert-placeholder',
      'tcher-live-annot',
      'tcher-live-placeholder-resize',
      'tcher-live-insert-input',
      'tcher-live-insert-voice',
      'tcher-live-insert-create',
      'tcher-live-insert-create-tooltip',
    ],
    states: ['toggle-active', 'line', 'placeholder', 'overlay', 'resize', 'enabled', 'disabled', 'tooltip'],
  },
  {
    key: 'design-system-panel',
    ids: ['tcher-live-design-host'],
    states: ['closed', 'open', 'tabs', 'token-tiles', 'copy'],
  },
  {
    key: 'toasts-and-errors',
    ids: ['tcher-live-toast'],
    states: ['normal', 'error', 'no-variants-mounted'],
  },
  {
    key: 'css-isolation-boundary',
    ids: ['tcher-live-root'],
    states: ['shadow-root', 'style-tags', 'hostile-css'],
  },
]);

export const LIVE_UI_COMPONENT_IDS = Object.freeze([
  ...new Set(LIVE_UI_SURFACES.flatMap((surface) => surface.ids)),
]);

export function resolveLiveUiRoot(env = globalThis) {
  const doc = env?.document;
  const explicit = env?.__TCHER_LIVE_UI_ROOT__
    || env?.window?.__TCHER_LIVE_UI_ROOT__;
  if (explicit && typeof explicit.appendChild === 'function') return explicit;
  return doc?.body || null;
}

export function getLiveUiElementById(id, env = globalThis) {
  const doc = env?.document;
  const root = resolveLiveUiRoot(env);
  if (!id) return null;
  if (root?.getElementById) {
    const found = root.getElementById(id);
    if (found) return found;
  }
  if (root?.querySelector) {
    const found = root.querySelector('#' + escapeCssIdent(id));
    if (found) return found;
  }
  return doc?.getElementById?.(id) || null;
}

export function appendToLiveUiRoot(el, env = globalThis) {
  const root = resolveLiveUiRoot(env);
  if (!root) throw new Error('Tcher live UI root is not available');
  root.appendChild(el);
  return el;
}

export function appendStyleToLiveUiRoot(styleEl, env = globalThis) {
  const doc = env?.document;
  const root = resolveLiveUiRoot(env);
  if (root && root !== doc?.body) {
    root.appendChild(styleEl);
  } else {
    (doc?.head || doc?.body || root).appendChild(styleEl);
  }
  return styleEl;
}

export function activeElementDeep(doc = globalThis.document) {
  let active = doc?.activeElement || null;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

function escapeCssIdent(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(String(value));
  }
  return String(value).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}
