/**
 * Anti-Pattern Browser Detector for Tcher
 * Copyright (c) 2026 Paul Bakaus
 * SPDX-License-Identifier: Apache-2.0
 *
 * GENERATED -- do not edit. Source: cli/engine/browser/injected/index.mjs
 * Rebuild: node scripts/build-browser-detector.js
 *
 * Usage: <script src="detect-antipatterns-browser.js"></script>
 * Re-scan: window.tcherScan()
 */
(function () {
if (typeof window === 'undefined') return;
// --- cli/engine/shared/constants.mjs ---
// ─── Section 1: Constants ───────────────────────────────────────────────────

const SAFE_TAGS = new Set([
  'blockquote', 'nav', 'a', 'input', 'textarea', 'select',
  'pre', 'code', 'span', 'th', 'td', 'tr', 'li', 'label',
  'button', 'hr', 'html', 'head', 'body', 'script', 'style',
  'link', 'meta', 'title', 'br', 'img', 'svg', 'path', 'circle',
  'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'use',
]);

// Per-check safe-tags override for the border (side-tab / border-accent)
// rule. We intentionally re-allow <label> here because card-shaped clickable
// labels (e.g. .checklist-item wrapping a checkbox + content) are one of the
// canonical side-tab anti-pattern shapes and must be detected. The rule's
// other preconditions (non-neutral color, width >= 2px on a single side,
// radius > 0 or width >= 3, element size >= 20x20 in the browser path)
// already filter out plain inline form labels so this does not introduce
// false positives. See modern-color-borders.html for the test matrix.
const BORDER_SAFE_TAGS = new Set(
  [...SAFE_TAGS].filter(t => t !== 'label')
);

const OVERUSED_FONTS = new Set([
  // Older monoculture (still ubiquitous):
  'inter', 'roboto', 'open sans', 'lato', 'montserrat', 'arial', 'helvetica',
  // Newer monoculture (the Anthropic-skill / Vercel / GitHub default wave):
  'fraunces', 'instrument sans', 'instrument serif',
  'geist', 'geist sans', 'geist mono',
  'mona sans',
  'plus jakarta sans', 'space grotesk', 'recoleta',
]);

// Brand-associated fonts: don't flag these as "overused" on the brand's own domains.
// Keys are font names, values are arrays of hostname suffixes where the font is allowed.
const GOOGLE_DOMAINS = [
  'google.com', 'youtube.com', 'android.com', 'chromium.org',
  'chrome.com', 'web.dev', 'gstatic.com', 'firebase.google.com',
];
const VERCEL_DOMAINS = ['vercel.com', 'nextjs.org', 'v0.app'];
const GITHUB_DOMAINS = ['github.com', 'githubnext.com'];
const BRAND_FONT_DOMAINS = {
  'roboto': GOOGLE_DOMAINS,
  'google sans': GOOGLE_DOMAINS,
  'product sans': GOOGLE_DOMAINS,
  'geist': VERCEL_DOMAINS,
  'geist sans': VERCEL_DOMAINS,
  'geist mono': VERCEL_DOMAINS,
  'mona sans': GITHUB_DOMAINS,
};

function isBrandFontOnOwnDomain(font) {
  if (typeof location === 'undefined') return false;
  const allowed = BRAND_FONT_DOMAINS[font];
  if (!allowed) return false;
  const host = location.hostname.toLowerCase();
  return allowed.some(suffix => host === suffix || host.endsWith('.' + suffix));
}

const GENERIC_FONTS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui',
  'inherit', 'initial', 'unset', 'revert',
]);

// WCAG large text thresholds are defined in points: 18pt normal text and
// 14pt bold text. Browsers expose font-size in CSS pixels at 96px per inch.
const WCAG_LARGE_TEXT_PX = 18 * (96 / 72);
const WCAG_LARGE_BOLD_TEXT_PX = 14 * (96 / 72);

// Serif faces that show up in italic-display heroes. The rule also fires when
// the primary face is unknown but the stack ends in the generic `serif` token,
// which catches custom/private faces with a serif fallback.
const KNOWN_SERIF_FONTS = new Set([
  'fraunces', 'recoleta', 'newsreader', 'playfair display', 'playfair',
  'cormorant', 'cormorant garamond', 'garamond', 'eb garamond',
  'tiempos', 'tiempos headline', 'tiempos text',
  'lora', 'vollkorn', 'spectral',
  'source serif pro', 'source serif 4', 'source serif',
  'ibm plex serif', 'merriweather',
  'libre caslon', 'libre baskerville', 'baskerville',
  'georgia', 'times new roman', 'times',
  'dm serif display', 'dm serif text',
  'instrument serif', 'gt sectra', 'ogg', 'canela',
  'freight display', 'freight text',
]);

// --- cli/engine/registry/antipatterns.mjs ---
const ANTIPATTERNS = [
  // ── AI slop: tells that something was AI-generated ──
  {
    id: 'side-tab',
    category: 'slop',
    name: 'Side-tab accent border',
    description:
      'Thick colored border on one side of a card — the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it entirely.',
    skillSection: 'Visual Details',
    skillGuideline: 'colored accent stripe',
  },
  {
    id: 'border-accent-on-rounded',
    category: 'slop',
    name: 'Border accent on rounded element',
    description:
      'Thick accent border on a rounded card — the border clashes with the rounded corners. Remove the border or the border-radius.',
    skillSection: 'Visual Details',
    skillGuideline: 'colored accent stripe',
  },
  {
    id: 'overused-font',
    category: 'slop',
    name: 'Overused font',
    description:
      'Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, and Space Grotesk are used on so many sites they no longer feel distinctive. Each new wave of AI-generated UIs converges on the same handful of faces. Choose a face that gives your interface personality.',
    skillSection: 'Typography',
    skillGuideline: 'overused fonts like Inter',
  },
  {
    id: 'single-font',
    category: 'slop',
    name: 'Single font for everything',
    description:
      'Only one font family is used for the entire page. Pair a distinctive display font with a refined body font to create typographic hierarchy.',
    skillSection: 'Typography',
    skillGuideline: 'only one font family for the entire page',
  },
  {
    id: 'flat-type-hierarchy',
    category: 'slop',
    name: 'Flat type hierarchy',
    description:
      'Font sizes are too close together — no clear visual hierarchy. Use fewer sizes with more contrast (aim for at least a 1.25 ratio between steps).',
    skillSection: 'Typography',
    skillGuideline: 'flat type hierarchy',
  },
  {
    id: 'gradient-text',
    category: 'slop',
    name: 'Gradient text',
    description:
      'Gradient text is decorative rather than meaningful — a common AI tell, especially on headings and metrics. Use solid colors for text.',
    skillSection: 'Color & Contrast',
    skillGuideline: 'gradient text for',
  },
  {
    id: 'ai-color-palette',
    category: 'slop',
    name: 'AI color palette',
    description:
      'Purple/violet gradients and cyan-on-dark are the most recognizable tells of AI-generated UIs. Choose a distinctive, intentional palette.',
    skillSection: 'Color & Contrast',
    skillGuideline: 'AI color palette',
  },
  {
    id: 'cream-palette',
    category: 'slop',
    name: 'Cream / beige palette',
    description:
      'A warm cream or beige page background has become the default "tasteful" AI surface, reached for by reflex. Choose a background that comes from a deliberate palette, not the safe warm off-white.',
    skillSection: 'Color & Contrast',
    skillGuideline: 'cream and beige as the default surface',
  },
  {
    id: 'nested-cards',
    category: 'slop',
    name: 'Nested cards',
    description:
      'Cards inside cards create visual noise and excessive depth. Flatten the hierarchy — use spacing, typography, and dividers instead of nesting containers.',
    skillSection: 'Layout & Space',
    skillGuideline: 'Nest cards inside cards',
  },
  {
    id: 'monotonous-spacing',
    category: 'slop',
    name: 'Monotonous spacing',
    description:
      'The same spacing value used everywhere — no rhythm, no variation. Use tight groupings for related items and generous separations between sections.',
    skillSection: 'Layout & Space',
    skillGuideline: 'same spacing everywhere',
  },
  {
    id: 'bounce-easing',
    category: 'slop',
    name: 'Bounce or elastic easing',
    description:
      'Bounce and elastic easing feel dated and tacky. Real objects decelerate smoothly — use exponential easing (ease-out-quart/quint/expo) instead.',
    skillSection: 'Motion',
    skillGuideline: 'bounce or elastic easing',
  },
  {
    id: 'dark-glow',
    category: 'slop',
    name: 'Dark mode with glowing accents',
    description:
      'Dark backgrounds with colored box-shadow glows are the default "cool" look of AI-generated UIs. Use subtle, purposeful lighting instead — or skip the dark theme entirely.',
    skillSection: 'Color & Contrast',
    skillGuideline: 'dark mode with glowing accents',
  },
  {
    id: 'icon-tile-stack',
    category: 'slop',
    name: 'Icon tile stacked above heading',
    description:
      'A small rounded-square icon container above a heading is the universal AI feature-card template — every generator outputs this exact shape. Try a side-by-side icon and heading, or let the icon sit in flow without its own container.',
    skillSection: 'Typography',
    skillGuideline: 'large icons with rounded corners above every heading',
  },
  {
    id: 'italic-serif-display',
    category: 'slop',
    name: 'Italic serif display headline',
    description:
      'Oversized italic serif (Fraunces, Recoleta, Playfair, Newsreader-italic) as the primary hero headline reads as taste in isolation but has become the universal AI-startup landing page hero. Set roman, or move to a non-serif display face. Editorial / magazine register may legitimately want this — judge by context.',
    skillSection: 'Typography',
    skillGuideline: 'oversized italic serif as the hero headline',
  },
  {
    id: 'hero-eyebrow-chip',
    category: 'slop',
    name: 'Hero eyebrow / pill chip',
    description:
      'A tiny uppercase letter-spaced label sitting immediately above an oversized hero headline — or the same shape rendered as a pill chip — is now the default AI SaaS hero. Drop the eyebrow, integrate the kicker into the headline, or run it as a navigation breadcrumb instead.',
    skillSection: 'Typography',
    skillGuideline: 'tiny uppercase tracked label above the hero headline',
  },
  {
    id: 'repeated-section-kickers',
    category: 'slop',
    severity: 'advisory',
    name: 'Repeated section kicker labels',
    description:
      'Repeating tiny uppercase tracked labels above section headings turns a brand page into AI editorial scaffolding. Replace them with stronger structure, artifacts, imagery, or a deliberate brand system.',
    skillSection: 'Typography',
    skillGuideline: 'repeated eyebrow or kicker labels as section scaffolding',
  },
  {
    id: 'numbered-section-markers',
    category: 'slop',
    severity: 'advisory',
    name: 'Numbered section markers (01 / 02 / 03)',
    description:
      'Numbered display markers as section labels (01, 02, 03) are the AI editorial scaffold one tier deeper than tracked eyebrow chips. If you find yourself reaching for them, choose a different section cadence.',
    skillSection: 'Layout & Space',
    skillGuideline: 'numbered section markers',
  },
  {
    id: 'em-dash-overuse',
    category: 'slop',
    name: 'Em-dash overuse',
    description:
      'More than two em-dashes (— or --) in body copy is an AI cadence tell. Use commas, colons, periods, or parentheses instead.',
    skillSection: 'Copy',
    skillGuideline: 'no em dashes',
  },
  {
    id: 'marketing-buzzword',
    category: 'slop',
    name: 'Marketing buzzword',
    description:
      'Generic SaaS phrases (streamline / empower / supercharge / world-class / enterprise-grade / next-generation / cutting-edge / etc) are instant AI tells. Pick a specific verb and noun that says what the product literally does.',
    skillSection: 'Copy',
    skillGuideline: 'marketing buzzwords',
  },
  {
    id: 'aphoristic-cadence',
    category: 'slop',
    name: 'Aphoristic-cadence copy',
    description:
      'Three or more sections landing on a short rebuttal sentence ("X. No Y." / "X. Just Y.") or a manufactured-contrast aphorism ("Not a feature. A platform.") reads as AI cadence, not voice. Once is fine; the pattern is the tell.',
    skillSection: 'Copy',
    skillGuideline: 'aphoristic cadence',
  },
  {
    id: 'oversized-h1',
    category: 'slop',
    name: 'Oversized hero headline',
    description:
      'A full-sentence headline set at display size ends up dominating the viewport, leaving no room for anything else above the fold. A punchy one- or two-word headline at that size is fine — the problem is a long headline blown up too large. Set long headlines smaller, or tighten the copy.',
    skillSection: 'Typography',
    skillGuideline: 'long headline set at display size',
  },
  {
    id: 'extreme-negative-tracking',
    category: 'slop',
    name: 'Crushed letter spacing',
    description:
      'Letter-spacing pulled tighter than the point where characters keep their own shapes costs legibility. Tighten display type optically, not destructively.',
    skillSection: 'Typography',
    skillGuideline: 'letter spacing crushed past legibility',
  },
  {
    id: 'broken-image',
    category: 'quality',
    name: 'Broken or placeholder image',
    description:
      '<img> tags with empty src, missing src, or placeholder values ship as broken-image boxes. Use real images, generated assets, or remove the tag.',
    skillSection: 'Imagery',
    skillGuideline: 'broken image references',
  },

  // ── Quality: general design and accessibility issues ──
  {
    id: 'gray-on-color',
    category: 'quality',
    name: 'Gray text on colored background',
    description:
      'Gray text looks washed out on colored backgrounds. Use a darker shade of the background color instead, or white/near-white for contrast.',
    skillSection: 'Color & Contrast',
    skillGuideline: 'gray text on colored backgrounds',
  },
  {
    id: 'low-contrast',
    category: 'quality',
    name: 'Low contrast text',
    description:
      'Text does not meet WCAG AA contrast requirements (4.5:1 for body, 3:1 for large text). Increase the contrast between text and background.',
  },
  {
    id: 'layout-transition',
    category: 'quality',
    name: 'Layout property animation',
    description:
      'Animating width, height, padding, or margin causes layout thrash and janky performance. Use transform and opacity instead, or grid-template-rows for height animations.',
    skillSection: 'Motion',
    skillGuideline: 'Animate layout properties',
  },
  {
    id: 'line-length',
    category: 'quality',
    name: 'Line length too long',
    description:
      'Text lines wider than ~80 characters are hard to read. The eye loses its place tracking back to the start of the next line. Add a max-width (65ch to 75ch) to text containers.',
    skillSection: 'Layout & Space',
    skillGuideline: 'wrap beyond ~80 characters',
  },
  {
    id: 'cramped-padding',
    category: 'quality',
    name: 'Cramped padding',
    description:
      'Text is too close to the edge of its container. Two shapes: (1) an element with its own text where the padding is too low for the font size, and (2) a wrapper with text-bearing children and near-zero padding against a visible boundary (border, outline, or non-transparent background) — children land flush against the boundary line. Add at least 8px (ideally 12–16px) of padding inside bordered, outlined, or colored containers.',
    skillSection: 'Layout & Space',
    skillGuideline: 'inside bordered or colored containers',
  },
  {
    id: 'body-text-viewport-edge',
    category: 'quality',
    name: 'Body text touching viewport edge',
    description:
      'Body paragraphs render flush against the left or right viewport edge with no container providing horizontal padding. Wrap content in a container with at least 16px (ideally 24-32px) of horizontal padding, or apply max-width with mx-auto.',
  },
  {
    id: 'tight-leading',
    category: 'quality',
    name: 'Tight line height',
    description:
      'Line height below 1.3x the font size makes multi-line text hard to read. Use 1.5 to 1.7 for body text so lines have room to breathe.',
  },
  {
    id: 'skipped-heading',
    category: 'quality',
    name: 'Skipped heading level',
    description:
      'Heading levels should not skip (e.g. h1 then h3 with no h2). Screen readers use heading hierarchy for navigation. Skipping levels breaks the document outline.',
  },
  {
    id: 'justified-text',
    category: 'quality',
    name: 'Justified text',
    description:
      'Justified text without hyphenation creates uneven word spacing ("rivers of white"). Use text-align: left for body text, or enable hyphens: auto if you must justify.',
  },
  {
    id: 'tiny-text',
    category: 'quality',
    name: 'Tiny body text',
    description:
      'Body text below 12px is hard to read, especially on high-DPI screens. Use at least 14px for body content, 16px is ideal.',
  },
  {
    id: 'all-caps-body',
    category: 'quality',
    name: 'All-caps body text',
    description:
      'Long passages in uppercase are hard to read. We recognize words by shape (ascenders and descenders), which all-caps removes. Reserve uppercase for short labels and headings.',
    skillSection: 'Typography',
    skillGuideline: 'long body passages in uppercase',
  },
  {
    id: 'wide-tracking',
    category: 'quality',
    name: 'Wide letter spacing on body text',
    description:
      'Letter spacing above 0.05em on body text disrupts natural character groupings and slows reading. Reserve wide tracking for short uppercase labels only.',
  },
  {
    id: 'text-overflow',
    category: 'quality',
    name: 'Content overflowing its container',
    description:
      'Content renders wider than its container, spilling out or forcing a horizontal scrollbar. Let text wrap, constrain widths, or give the region a deliberate scroll affordance.',
    skillSection: 'Layout & Space',
    skillGuideline: 'content wider than its container',
  },
  {
    id: 'clipped-overflow-container',
    category: 'quality',
    name: 'Positioned child clipped by overflow container',
    description:
      'A clipping container (overflow hidden or clip) wrapping an absolutely-positioned child cuts off tooltips, menus, and popovers that need to escape. Let the overflow be visible, or move the positioned layer out of the clip.',
    skillSection: 'Layout & Space',
    skillGuideline: 'overflow container clipping positioned children',
  },

  // ── Thai typography: faults Latin-tuned defaults inflict on Thai script ──
  // These fire only on elements whose OWN text holds a Thai run, so non-Thai
  // pages stay silent. line-height and font-size gate on a prose-length run;
  // letter-spacing fires on any Thai run (positive tracking breaks syllables).
  {
    id: 'thai-line-height-cramped',
    category: 'quality',
    name: 'Cramped line-height on Thai text',
    description:
      'Thai prose with line-height below 1.5x. Thai stacks upper vowels and tone marks above the base letter, so Latin-tuned leading lets the marks of one line collide with the line above. Use at least 1.6, ideally 1.75-2.0 for long-form Thai.',
    skillSection: 'Typography',
    skillGuideline: 'Thai line-height below 1.6',
  },
  {
    id: 'thai-letter-spacing',
    category: 'quality',
    severity: 'minor',
    name: 'Letter-spacing on Thai text',
    description:
      'Positive letter-spacing on Thai text. Thai has no word spaces and no uppercase, so tracking copied from Latin labels pushes vowels and tone marks off their base letters and breaks the syllable. Leave Thai at the default (normal) tracking.',
    skillSection: 'Typography',
    skillGuideline: 'positive letter-spacing on Thai',
  },
  {
    id: 'thai-font-size-small',
    category: 'quality',
    severity: 'advisory',
    name: 'Thai body text too small',
    description:
      'Thai prose below 14px. Thai letters are told apart by small loops that vanish at small sizes faster than Latin does, so Thai needs a larger floor. Use at least 16px (17-18px for loopless faces) for Thai body text.',
    skillSection: 'Typography',
    skillGuideline: 'Thai body text below 16px',
  },

  // ── Provider tells: opt-in via --gpt / --gemini (gated off by default) ──
  {
    id: 'gpt-thin-border-wide-shadow',
    category: 'slop',
    severity: 'advisory',
    gated: 'gpt',
    name: 'Hairline border with wide shadow',
    description:
      'A hairline border paired with a wide, diffuse shadow is a recurring generated-UI signature. Commit to one — a defined edge or a soft elevation — rather than both at once.',
    skillSection: 'Visual Details',
    skillGuideline: 'hairline border plus wide diffuse shadow',
  },
  {
    id: 'repeating-stripes-gradient',
    category: 'slop',
    severity: 'advisory',
    gated: 'gpt',
    name: 'Repeating-gradient stripes',
    description:
      'Repeating-gradient stripes used as surface decoration are a recurring generated-UI signature. Reach for a deliberate texture or leave the surface plain.',
    skillSection: 'Visual Details',
    skillGuideline: 'repeating-gradient decorative stripes',
  },
  {
    id: 'theater-slop-phrase',
    category: 'slop',
    severity: 'advisory',
    gated: 'gpt',
    name: 'Theater framing copy',
    description:
      'Dismissing something as "theater" is a recurring generated-copy tic. Say plainly what the thing does or does not do.',
    skillSection: 'Copy',
    skillGuideline: 'theater framing copy',
  },
  {
    id: 'image-hover-transform',
    category: 'slop',
    severity: 'advisory',
    gated: 'gemini',
    name: 'Image hover transform',
    description:
      'Scaling or rotating an image on hover is a recurring generated-UI signature. Let imagery sit still, or use a subtler, purposeful interaction.',
    skillSection: 'Motion',
    skillGuideline: 'image scale or rotate on hover',
  },
  {
    id: 'emoji-in-ui',
    category: 'slop',
    severity: 'advisory',
    name: 'Emoji as UI ornament',
    description:
      'Emoji in headings, buttons, or as list bullets is a recognizable generated-UI tell — the playful-emoji reflex. Advisory because some brands use emoji as a deliberate voice decision; keep it only when it is a choice, not a default.',
    skillSection: 'Visual Details',
    skillGuideline: 'emoji as interface ornament',
  },

  // ── UX: usability rules the engine can measure deterministically ──
  // The `law` field names the Laws of UX principle (lawsofux.com, Jon
  // Yablonski) a rule operationalizes; descriptions are our own wording.
  // Rules without a `law` are core usability/WCAG checks.
  {
    id: 'tap-target-too-small',
    category: 'ux',
    severity: 'critical',
    law: "Fitts's Law",
    name: 'Tap target too small',
    description:
      'Interactive element smaller than 24×24px. Small targets take longer to acquire and cause mis-taps, especially on touch screens. WCAG 2.2 sets 24×24 as the floor; 44×44 is the comfortable target.',
  },
  {
    id: 'tap-targets-crowded',
    category: 'ux',
    severity: 'major',
    law: "Fitts's Law",
    name: 'Tap targets crowded',
    description:
      'Small interactive elements packed closer than 8px apart. Adjacent targets without breathing room turn every tap into a precision task and cause wrong-action errors.',
  },
  {
    id: 'input-without-label',
    category: 'ux',
    severity: 'critical',
    name: 'Input without a label',
    description:
      'Form field with no label, aria-label, or aria-labelledby. A placeholder is not a label: it vanishes on focus, screen readers may skip it, and users forget what the half-filled field asked for.',
  },
  {
    id: 'icon-button-no-name',
    category: 'ux',
    severity: 'critical',
    name: 'Icon button without a name',
    description:
      'Icon-only button or link with no accessible name (aria-label, title, or img alt). Screen readers announce it as "button", and the action is a guess.',
  },
  {
    id: 'missing-alt',
    category: 'ux',
    severity: 'critical',
    name: 'Image missing alt attribute',
    description:
      'Content <img> with no alt attribute at all. Screen readers fall back to the filename. Use alt="" for decorative images and a real description for content images.',
  },
  {
    id: 'focus-outline-removed',
    category: 'ux',
    severity: 'critical',
    name: 'Focus outline removed',
    description:
      'A stylesheet sets outline: none on :focus without any replacement cue (box-shadow, border, or a new outline). Keyboard users lose their position on the page entirely.',
  },
  {
    id: 'no-viewport-meta',
    category: 'ux',
    severity: 'major',
    name: 'Missing viewport meta tag',
    description:
      'Page has no <meta name="viewport">. Mobile browsers will render it at desktop width and shrink it, making text unreadable and targets untappable.',
  },
  {
    id: 'link-no-affordance',
    category: 'ux',
    severity: 'major',
    law: 'Law of Similarity',
    name: 'Link indistinguishable from text',
    description:
      'Link inside prose styled with the body text color and no underline, weight, or border cue. Readers cannot tell what is clickable; links must look different from the text around them.',
  },
  {
    id: 'choice-overload-nav',
    category: 'ux',
    severity: 'minor',
    law: "Hick's Law",
    name: 'Too many navigation choices',
    description:
      'Top-level navigation with more than 8 items. Decision time grows with every added choice; group secondary destinations under a parent or move them to the footer.',
  },
  {
    id: 'select-overload',
    category: 'ux',
    severity: 'advisory',
    law: 'Choice Overload',
    name: 'Select with too many options',
    description:
      'Dropdown with more than 25 ungrouped options. Long flat lists force linear scanning; group with optgroup, or switch to a searchable combobox. Country, year, and similar canonical lists are exempt.',
  },
  {
    id: 'logo-not-home-link',
    category: 'ux',
    severity: 'advisory',
    law: "Jakob's Law",
    name: 'Header logo is not a home link',
    description:
      'The site logo in the header is not wrapped in a link to home. Users expect the logo to take them back; the convention is universal enough that breaking it reads as broken.',
  },
  {
    id: 'autocomplete-missing',
    category: 'ux',
    severity: 'advisory',
    law: "Postel's Law",
    name: 'Autofillable field without autocomplete',
    description:
      'Email, phone, name, or address field in a form without an autocomplete attribute. The browser already knows these values; one attribute saves the user the whole field.',
  },
  {
    id: 'form-field-overload',
    category: 'ux',
    severity: 'minor',
    law: "Miller's Law",
    name: 'Form fields without grouping',
    description:
      'More than 7 text fields in one form with no fieldset or section headings. Working memory holds about 7 items; chunk long forms into labelled groups or steps.',
  },
  {
    id: 'oversized-image-payload',
    category: 'ux',
    severity: 'major',
    law: 'Doherty Threshold',
    name: 'Oversized image payload',
    description:
      'Image whose natural size is far larger than its rendered size (beyond 2.5× even on a high-density screen). The wasted bytes delay load past the 400ms feedback window for no visual gain.',
  },
];

const SEVERITY_OVERRIDES = {
  // quality → critical
  'broken-image': 'critical',
  'gray-on-color': 'critical',
  'low-contrast': 'critical',
  'tiny-text': 'critical',
  'skipped-heading': 'critical',
  'text-overflow': 'critical',
  'clipped-overflow-container': 'critical',
  // slop → major (the loudest AI tells)
  'side-tab': 'major',
  'border-accent-on-rounded': 'major',
  'ai-color-palette': 'major',
  'gradient-text': 'major',
  'icon-tile-stack': 'major',
  'bounce-easing': 'major',
  'dark-glow': 'major',
  'flat-type-hierarchy': 'major',
  'nested-cards': 'major',
};

for (const ap of ANTIPATTERNS) {
  if (!ap.severity) {
    ap.severity = SEVERITY_OVERRIDES[ap.id] || (ap.category === 'slop' ? 'minor' : 'major');
  }
}

// --- cli/engine/shared/color.mjs ---
// ─── Section 2: Color Utilities ─────────────────────────────────────────────

function isNeutralColor(color) {
  if (!color || color === 'transparent') return true;

  // rgb/rgba — use channel spread. Threshold 30 ≈ 11.7% of the 0–255 range.
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return (Math.max(+rgb[1], +rgb[2], +rgb[3]) - Math.min(+rgb[1], +rgb[2], +rgb[3])) < 30;
  }

  // oklch()/lch() — chroma is the second numeric component.
  // oklch chroma is ~0–0.4 in sRGB gamut; >= 0.02 reads as tinted, not gray.
  // lch chroma is ~0–150; >= 3 reads as tinted. jsdom emits both formats
  // literally (it does NOT convert them to rgb).
  const oklch = color.match(/oklch\(\s*[\d.]+%?\s*([\d.-]+)/i);
  if (oklch) return parseFloat(oklch[1]) < 0.02;
  const lch = color.match(/lch\(\s*[\d.]+%?\s*([\d.-]+)/i);
  if (lch) return parseFloat(lch[1]) < 3;

  // oklab()/lab() — a and b are signed axes; chroma = sqrt(a² + b²).
  // oklab a/b are ~-0.4..0.4, threshold 0.02. lab a/b are ~-128..127, threshold 3.
  const oklab = color.match(/oklab\(\s*[\d.]+%?\s*([\d.-]+)\s+([\d.-]+)/i);
  if (oklab) {
    const a = parseFloat(oklab[1]), b = parseFloat(oklab[2]);
    return Math.hypot(a, b) < 0.02;
  }
  const lab = color.match(/lab\(\s*[\d.]+%?\s*([\d.-]+)\s+([\d.-]+)/i);
  if (lab) {
    const a = parseFloat(lab[1]), b = parseFloat(lab[2]);
    return Math.hypot(a, b) < 3;
  }

  // hsl/hsla — saturation is the second numeric component (percent).
  // Modern jsdom usually converts hsl() to rgb, but handle it directly for
  // safety across versions and for any engine that preserves the format.
  const hsl = color.match(/hsla?\(\s*[\d.-]+\s*,?\s*([\d.]+)%/i);
  if (hsl) return parseFloat(hsl[1]) < 10;

  // hwb(hue whiteness% blackness%) — a pixel is fully gray when
  // whiteness + blackness >= 100; chroma-like saturation = 1 - (w+b)/100.
  const hwb = color.match(/hwb\(\s*[\d.-]+\s+([\d.]+)%\s+([\d.]+)%/i);
  if (hwb) {
    const w = parseFloat(hwb[1]), b = parseFloat(hwb[2]);
    return (1 - Math.min(100, w + b) / 100) < 0.1;
  }

  // Unknown / unrecognized format — err on the side of DETECTING rather
  // than silently skipping. This is the opposite of the previous default,
  // which was the root cause of the oklch bug.
  return false;
}

function parseRgb(color) {
  if (!color || color === 'transparent') return null;
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseGradientColors(bgImage) {
  if (!bgImage || !bgImage.includes('gradient')) return [];
  const colors = [];
  for (const m of bgImage.matchAll(/rgba?\([^)]+\)/g)) {
    const c = parseRgb(m[0]);
    if (c) colors.push(c);
  }
  for (const m of bgImage.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const h = m[1];
    if (h.length === 6) {
      colors.push({ r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16), a: 1 });
    } else {
      colors.push({ r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16), a: 1 });
    }
  }
  return colors;
}

function hasChroma(c, threshold = 30) {
  if (!c) return false;
  return (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) >= threshold;
}

function getHue(c) {
  if (!c) return 0;
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return Math.round(h * 360);
}

function colorToHex(c) {
  if (!c) return '?';
  return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// --- cli/engine/rules/checks.mjs ---
const DETECTOR_IS_BROWSER = typeof window !== 'undefined';

// ─── Section 3: Pure Detection ──────────────────────────────────────────────

function checkBorders(tag, widths, colors, radius) {
  if (BORDER_SAFE_TAGS.has(tag)) return [];
  const findings = [];
  const sides = ['Top', 'Right', 'Bottom', 'Left'];

  for (const side of sides) {
    const w = widths[side];
    if (w < 1 || isNeutralColor(colors[side])) continue;

    const otherSides = sides.filter(s => s !== side);
    const maxOther = Math.max(...otherSides.map(s => widths[s]));
    if (!(w >= 2 && (maxOther <= 1 || w >= maxOther * 2))) continue;

    const sn = side.toLowerCase();
    const isSide = side === 'Left' || side === 'Right';

    if (isSide) {
      if (radius > 0) findings.push({ id: 'side-tab', snippet: `border-${sn}: ${w}px + border-radius: ${radius}px` });
      else if (w >= 3) findings.push({ id: 'side-tab', snippet: `border-${sn}: ${w}px` });
    } else {
      if (radius > 0 && w >= 2) findings.push({ id: 'border-accent-on-rounded', snippet: `border-${sn}: ${w}px + border-radius: ${radius}px` });
    }
  }

  return findings;
}

// Returns true if the given text is composed entirely of emoji characters
// (plus whitespace / variation selectors). Emojis render as multicolor glyphs
// regardless of CSS `color`, so contrast checks against the element's text
// color are meaningless for these nodes.
const EMOJI_CHAR_RE = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/u;
const EMOJI_CHARS_GLOBAL = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu;
function isEmojiOnlyText(text) {
  if (!text) return false;
  if (!EMOJI_CHAR_RE.test(text)) return false;
  return text.replace(EMOJI_CHARS_GLOBAL, '').trim() === '';
}

function checkColors(opts) {
  const { tag, textColor, bgColor, effectiveBg, effectiveBgStops, fontSize, fontWeight, hasDirectText, isEmojiOnly, bgClip, bgImage, classList } = opts;
  if (SAFE_TAGS.has(tag)) {
    // Exception for <a> and <button> elements styled as buttons. SAFE_TAGS
    // exists to suppress contrast noise on inline links and unstyled controls,
    // where the element has no own background and the contrast against the
    // ancestor surface is already the intended visual. When the element has
    // its own opaque background and direct text, it is a styled button — and
    // contrast on its own surface is a real, frequent bug worth flagging.
    const isStyledButton = (tag === 'a' || tag === 'button')
      && hasDirectText
      && bgColor && bgColor.a > 0.5;
    if (!isStyledButton) return [];
  }
  const findings = [];

  if (hasDirectText && textColor && !isEmojiOnly) {
    // Run background-dependent checks against either a solid bg or, if the
    // ancestor is a gradient, against every gradient stop (use the worst case).
    const bgs = effectiveBg ? [effectiveBg] : (effectiveBgStops && effectiveBgStops.length ? effectiveBgStops : null);
    if (bgs) {
      // Gray on colored background — flag if every stop is chromatic
      const textLum = relativeLuminance(textColor);
      const isGray = !hasChroma(textColor, 20) && textLum > 0.05 && textLum < 0.85;
      if (isGray && bgs.every(b => hasChroma(b, 40))) {
        const bgLabel = effectiveBg ? colorToHex(effectiveBg) : `gradient(${bgs.map(colorToHex).join(', ')})`;
        findings.push({ id: 'gray-on-color', snippet: `text ${colorToHex(textColor)} on bg ${bgLabel}` });
      }

      // Low contrast (WCAG AA) — worst case across all bg stops
      const ratios = bgs.map(b => contrastRatio(textColor, b));
      let worstIdx = 0;
      for (let i = 1; i < ratios.length; i++) if (ratios[i] < ratios[worstIdx]) worstIdx = i;
      const ratio = ratios[worstIdx];
      const isLargeText = fontSize >= WCAG_LARGE_TEXT_PX || (fontSize >= WCAG_LARGE_BOLD_TEXT_PX && fontWeight >= 700);
      const threshold = isLargeText ? 3.0 : 4.5;
      if (ratio < threshold) {
        // Skip the false-positive class where text has alpha < 1 AND we
        // couldn't find an opaque ancestor (effectiveBg is null, we're
        // comparing against gradient-stop fallback). In jsdom mode the
        // detector can't resolve `var(--X)` color tokens, so a dark
        // section sitting between the text and the body's decorative
        // gradient is invisible to us — we end up measuring contrast
        // against the body's paper-grain noise instead of the real
        // local bg. Real low-contrast bugs use alpha=1 and have a
        // resolvable opaque ancestor; semi-transparent Tailwind tokens
        // like `text-paper/60` on `bg-ink` sections are the FP pattern.
        const isAlphaFallbackFP = !DETECTOR_IS_BROWSER && !effectiveBg && (textColor.a != null && textColor.a < 1);
        if (!isAlphaFallbackFP) {
          findings.push({ id: 'low-contrast', snippet: `${ratio.toFixed(1)}:1 (need ${threshold}:1) — text ${colorToHex(textColor)} on ${colorToHex(bgs[worstIdx])}` });
        }
      }
    }

    // AI palette: purple/violet on headings
    if (hasChroma(textColor, 50)) {
      const hue = getHue(textColor);
      if (hue >= 260 && hue <= 310 && (['h1', 'h2', 'h3'].includes(tag) || fontSize >= 20)) {
        findings.push({ id: 'ai-color-palette', snippet: `Purple/violet text (${colorToHex(textColor)}) on heading` });
      }
    }
  }

  // Gradient text
  if (bgClip === 'text' && bgImage && bgImage.includes('gradient')) {
    findings.push({ id: 'gradient-text', snippet: 'background-clip: text + gradient' });
  }

  // Tailwind class checks
  if (classList) {
    const classStr = typeof classList === 'string' ? classList : Array.from(classList).join(' ');

    const grayMatch = classStr.match(/\btext-(?:gray|slate|zinc|neutral|stone)-\d+\b/);
    const colorBgMatch = classStr.match(/\bbg-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/);
    if (grayMatch && colorBgMatch) {
      findings.push({ id: 'gray-on-color', snippet: `${grayMatch[0]} on ${colorBgMatch[0]}` });
    }

    if (/\bbg-clip-text\b/.test(classStr) && /\bbg-gradient-to-/.test(classStr)) {
      findings.push({ id: 'gradient-text', snippet: 'bg-clip-text + bg-gradient (Tailwind)' });
    }

    const purpleText = classStr.match(/\btext-(?:purple|violet|indigo)-\d+\b/);
    if (purpleText && (['h1', 'h2', 'h3'].includes(tag) || /\btext-(?:[2-9]xl)\b/.test(classStr))) {
      findings.push({ id: 'ai-color-palette', snippet: `${purpleText[0]} on heading` });
    }

    if (/\bfrom-(?:purple|violet|indigo)-\d+\b/.test(classStr) && /\bto-(?:purple|violet|indigo|blue|cyan|pink|fuchsia)-\d+\b/.test(classStr)) {
      findings.push({ id: 'ai-color-palette', snippet: 'Purple/violet gradient (Tailwind)' });
    }
  }

  return findings;
}

function isCardLikeFromProps(hasShadow, hasBorder, hasRadius, hasBg) {
  if (!hasShadow && !hasBorder) return false;
  return hasRadius || hasBg;
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// Pure check: given a heading and metrics about its previousElementSibling,
// decide if the sibling is the canonical "icon-tile-stacked-above-heading" shape.
//
// Triggers when ALL of the following hold for the sibling:
//   • size 32–128px on both axes (not too small, not a hero image)
//   • aspect ratio 0.7–1.4 (squarish — excludes wide thumbnails / pill badges)
//   • has a non-transparent background-color, background-image, OR a visible border
//     (covers solid colors, white-with-border, gradients — anything that visually
//      defines a tile)
//   • border-radius < width/2 (excludes round avatars; rounded squares pass)
//   • contains an <svg> or icon-class <i> element that's smaller than the tile
//   • the tile sits above the heading (its bottom is above the heading's top)
function checkIconTile(opts) {
  const { headingTag, headingText, headingTop,
          siblingTag, siblingWidth, siblingHeight, siblingBottom,
          siblingBgColor, siblingBgImage, siblingBorderWidth, siblingBorderRadius,
          hasIconChild, iconChildWidth } = opts;
  if (!HEADING_TAGS.has(headingTag)) return [];
  if (!siblingTag) return [];
  // Don't recurse into nested headings (e.g. h2 above h3 in a section header)
  if (HEADING_TAGS.has(siblingTag)) return [];

  // Size window: 32–128px on each axis
  if (!(siblingWidth >= 32 && siblingWidth <= 128)) return [];
  if (!(siblingHeight >= 32 && siblingHeight <= 128)) return [];

  // Squarish aspect ratio
  const ratio = siblingWidth / siblingHeight;
  if (ratio < 0.7 || ratio > 1.4) return [];

  // Must have something that visually defines the tile
  const bgVisible = (siblingBgColor && siblingBgColor.a > 0.1)
    || (siblingBgImage && siblingBgImage !== 'none' && siblingBgImage !== '');
  const borderVisible = siblingBorderWidth > 0;
  if (!bgVisible && !borderVisible) return [];

  // Exclude circles (avatars). Rounded squares pass.
  if (siblingBorderRadius >= siblingWidth / 2) return [];

  // Must contain an icon element smaller than the tile
  if (!hasIconChild) return [];
  if (iconChildWidth && iconChildWidth >= siblingWidth * 0.95) return [];

  // Vertical stacking: tile must end above where the heading starts.
  // (Allow the check to skip when both top/bottom are 0 — jsdom layout case.)
  if (headingTop && siblingBottom && siblingBottom > headingTop + 4) return [];

  const text = (headingText || '').trim().slice(0, 60);
  return [{
    id: 'icon-tile-stack',
    snippet: `${Math.round(siblingWidth)}x${Math.round(siblingHeight)}px icon tile above ${headingTag} "${text}"`,
  }];
}

// Resolve the primary (non-generic) face from a font-family string and return
// whether the resolved primary is serif. Two paths:
//   1. Primary face is in KNOWN_SERIF_FONTS → serif.
//   2. Primary face is unknown but the stack ends in the generic `serif`
//      token → treat as serif. Authors who declare `font-family: 'X', serif`
//      almost always have a serif primary; a sans declared with a serif
//      fallback is a code smell, not the common case.
// Returns { primary, isSerif } so the snippet can name the face.
function resolveSerif(fontFamily) {
  if (!fontFamily) return { primary: null, isSerif: false };
  const tokens = fontFamily.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase());
  const primary = tokens.find(f => f && !GENERIC_FONTS.has(f)) || null;
  if (!primary) return { primary: null, isSerif: false };
  if (KNOWN_SERIF_FONTS.has(primary)) return { primary, isSerif: true };
  if (tokens.includes('serif')) return { primary, isSerif: true };
  return { primary, isSerif: false };
}

function checkItalicSerif(opts) {
  const { tag, fontStyle, fontFamily, fontSize, headingText } = opts;
  if (fontStyle !== 'italic') return [];
  // Anchor the rule on hero-scale text. h1 is the canonical hero element;
  // h2 ≥ 48px catches the cases where the design demotes the visual hero
  // to an h2 but keeps the size.
  if (tag !== 'h1' && !(tag === 'h2' && fontSize >= 48)) return [];
  if (fontSize < 48) return [];
  const { primary, isSerif } = resolveSerif(fontFamily);
  if (!isSerif) return [];

  const text = (headingText || '').trim().slice(0, 60);
  return [{
    id: 'italic-serif-display',
    snippet: `italic serif ${tag} (${primary || 'serif'}) at ${Math.round(fontSize)}px "${text}"`,
  }];
}

// Color saturation check. Returns true when the color has visible
// chroma — i.e., it's an "accent color" rather than near-neutral.
// Handles rgb()/rgba(), #hex, oklch(), and hsl(). var() refs are
// expected to be pre-resolved by the caller.
function isAccentColor(cssColor) {
  if (!cssColor) return false;
  const s = String(cssColor).trim();
  // rgb / rgba — direct channel-distance check.
  const rgbM = /rgba?\(\s*(\d+)\s*,?\s+|\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s.replace(/rgba?\(\s*/, 'rgb(').replace(/,/g, ', '));
  const rgbStrict = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
  if (rgbStrict) {
    const r = +rgbStrict[1], g = +rgbStrict[2], b = +rgbStrict[3];
    return (Math.max(r, g, b) - Math.min(r, g, b)) >= 40;
  }
  // #hex — 3, 4, 6, or 8 digit.
  const hexM = /^#([0-9a-f]{3,8})\b/i.exec(s);
  if (hexM) {
    let h = hexM[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('').slice(0, 6);
    else h = h.slice(0, 6);
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return (Math.max(r, g, b) - Math.min(r, g, b)) >= 40;
    }
  }
  // oklch(L C H) — chroma C is what matters. Typical neutral grays
  // have C < 0.02; visible accents are 0.05+. CSS minification can
  // collapse spaces between L% and C ("oklch(43%.15 34)"), so we
  // extract all numbers and take the second rather than matching a
  // strict L-then-whitespace-then-C pattern.
  if (/^oklch\(/i.test(s)) {
    const nums = s.match(/\d*\.\d+|\d+/g);
    if (nums && nums.length >= 2) {
      const c = parseFloat(nums[1]);
      return !Number.isNaN(c) && c >= 0.05;
    }
  }
  // hsl(H, S%, L%) — saturation > 20% reads as accent.
  const hslM = /hsla?\(\s*[\d.]+\s*,\s*([\d.]+)%/i.exec(s);
  if (hslM) {
    const sat = parseFloat(hslM[1]);
    return !Number.isNaN(sat) && sat >= 20;
  }
  return false;
}

// Sibling-relationship rule. Anchor on a hero-scale h1, look at the
// previousElementSibling, and gate on EITHER the classic tracked-
// uppercase eyebrow OR the modern accent-colored bold eyebrow.
function checkHeroEyebrow(opts) {
  const {
    headingTag, headingText, headingFontSize,
    siblingTag, siblingText, siblingTextTransform,
    siblingFontSize, siblingLetterSpacing,
    siblingFontWeight, siblingColor,
  } = opts;
  if (headingTag !== 'h1') return [];
  // We previously gated on headingFontSize >= 48 to anchor "hero scale".
  // But modern hero h1s use clamp() / vw / var(--text-*), none of which
  // jsdom can resolve — the computed value comes back as "2em" or
  // "var(--text-9xl)" and parseFloat returns 2 or NaN. The gate fails
  // on virtually every Tailwind v4 / framework build. The other gates
  // (sibling text 2-60 chars, font-size ≤ 14px, accent-bold OR
  // tracked-caps) are tight enough to avoid false positives on non-
  // hero h1s — a tiny tan label directly above any h1 is the
  // antipattern regardless of how big the h1 ends up.
  if (!siblingTag) return [];
  // An h2 above an h1 is a different anti-pattern (heading hierarchy / dual
  // headings) — never an eyebrow.
  if (HEADING_TAGS.has(siblingTag)) return [];

  const text = (siblingText || '').trim();
  if (text.length < 2 || text.length > 60) return [];
  if (!(siblingFontSize > 0 && siblingFontSize <= 14)) return [];

  // Branch A: classic tracked-uppercase eyebrow.
  const isUppercased = siblingTextTransform === 'uppercase'
    || (/[A-Z]/.test(text) && !/[a-z]/.test(text));
  const isClassicTracked = isUppercased && siblingLetterSpacing >= 1.6;

  // Branch B: modern accent-bold eyebrow — sentence case, low
  // tracking, but bold + accent-colored. The style choices changed;
  // the pattern is the same kicker-above-headline anti-pattern.
  const weight = Number(siblingFontWeight) || 400;
  const isAccentBold = weight >= 700 && isAccentColor(siblingColor || '');

  if (!isClassicTracked && !isAccentBold) return [];

  const headingTextSnippet = (headingText || '').trim().slice(0, 60);
  const eyebrowSnippet = text.slice(0, 40);
  const style = isClassicTracked ? 'tracked-caps' : 'accent-bold';
  return [{
    id: 'hero-eyebrow-chip',
    snippet: `eyebrow chip (${style}) "${eyebrowSnippet}" above ${headingTag} "${headingTextSnippet}"`,
  }];
}

function checkRepeatedSectionKickers(opts) {
  const { candidates, minCount = 3 } = opts;
  if (!Array.isArray(candidates) || candidates.length < minCount) return [];
  return candidates.map(candidate => ({
    id: 'repeated-section-kickers',
    snippet: `repeated section kicker "${candidate.kickerText}" before ${candidate.headingTag} "${candidate.headingText}" (${candidates.length} on page)`,
  }));
}

const LAYOUT_TRANSITION_PROPS = new Set([
  'width', 'height', 'padding', 'margin',
  'max-height', 'max-width', 'min-height', 'min-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
]);

function checkMotion(opts) {
  const { tag, transitionProperty, animationName, timingFunctions, classList } = opts;
  if (SAFE_TAGS.has(tag)) return [];
  const findings = [];

  // --- Bounce/elastic easing ---
  if (animationName && animationName !== 'none' && /bounce|elastic|wobble|jiggle|spring/i.test(animationName)) {
    findings.push({ id: 'bounce-easing', snippet: `animation: ${animationName}` });
  }
  if (classList && /\banimate-bounce\b/.test(classList)) {
    findings.push({ id: 'bounce-easing', snippet: 'animate-bounce (Tailwind)' });
  }

  // Check timing functions for overshoot cubic-bezier (y values outside [0, 1])
  if (timingFunctions) {
    const bezierRe = /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/g;
    let m;
    while ((m = bezierRe.exec(timingFunctions)) !== null) {
      const y1 = parseFloat(m[2]), y2 = parseFloat(m[4]);
      if (y1 < -0.1 || y1 > 1.1 || y2 < -0.1 || y2 > 1.1) {
        findings.push({ id: 'bounce-easing', snippet: `cubic-bezier(${m[1]}, ${m[2]}, ${m[3]}, ${m[4]})` });
        break;
      }
    }
  }

  // --- Layout property transition ---
  if (transitionProperty && transitionProperty !== 'all' && transitionProperty !== 'none') {
    const props = transitionProperty.split(',').map(p => p.trim().toLowerCase());
    const layoutFound = props.filter(p => LAYOUT_TRANSITION_PROPS.has(p));
    if (layoutFound.length > 0) {
      findings.push({ id: 'layout-transition', snippet: `transition: ${layoutFound.join(', ')}` });
    }
  }

  return findings;
}

function checkGlow(opts) {
  const { boxShadow, effectiveBg } = opts;
  if (!boxShadow || boxShadow === 'none') return [];
  if (!effectiveBg) return [];

  // Only flag on dark backgrounds (luminance < 0.1)
  const bgLum = relativeLuminance(effectiveBg);
  if (bgLum >= 0.1) return [];

  // Split multiple shadows (commas not inside parentheses)
  const parts = boxShadow.split(/,(?![^(]*\))/);
  for (const shadow of parts) {
    const colorMatch = shadow.match(/rgba?\([^)]+\)/);
    if (!colorMatch) continue;
    const color = parseRgb(colorMatch[0]);
    if (!color || !hasChroma(color, 30)) continue;

    // Extract px values — in computed style: "color Xpx Ypx BLURpx [SPREADpx]"
    const afterColor = shadow.substring(shadow.indexOf(colorMatch[0]) + colorMatch[0].length);
    const beforeColor = shadow.substring(0, shadow.indexOf(colorMatch[0]));
    const pxVals = [...beforeColor.matchAll(/([\d.]+)px/g), ...afterColor.matchAll(/([\d.]+)px/g)]
      .map(m => parseFloat(m[1]));

    // Third value is blur (offset-x, offset-y, blur, [spread])
    if (pxVals.length >= 3 && pxVals[2] > 4) {
      return [{ id: 'dark-glow', snippet: `Colored glow (${colorToHex(color)}) on dark background` }];
    }
  }

  return [];
}

/**
 * Regex-on-HTML checks shared between browser and Node page-level detection.
 * These don't need DOM access, just the raw HTML string.
 */
function checkHtmlPatterns(html) {
  const findings = [];

  // --- Color ---

  // AI color palette: purple/violet
  const purpleHexRe = /#(?:7c3aed|8b5cf6|a855f7|9333ea|7e22ce|6d28d9|6366f1|764ba2|667eea)\b/gi;
  if (purpleHexRe.test(html)) {
    const purpleTextRe = /(?:(?:^|;)\s*color\s*:\s*(?:.*?)(?:#(?:7c3aed|8b5cf6|a855f7|9333ea|7e22ce|6d28d9))|gradient.*?#(?:7c3aed|8b5cf6|a855f7|764ba2|667eea))/gi;
    if (purpleTextRe.test(html)) {
      findings.push({ id: 'ai-color-palette', snippet: 'Purple/violet accent colors detected' });
    }
  }

  // Gradient text (background-clip: text + gradient)
  const gradientRe = /(?:-webkit-)?background-clip\s*:\s*text/gi;
  let gm;
  while ((gm = gradientRe.exec(html)) !== null) {
    const start = Math.max(0, gm.index - 200);
    const context = html.substring(start, gm.index + gm[0].length + 200);
    if (/gradient/i.test(context)) {
      findings.push({ id: 'gradient-text', snippet: 'background-clip: text + gradient' });
      break;
    }
  }
  if (/\bbg-clip-text\b/.test(html) && /\bbg-gradient-to-/.test(html)) {
    findings.push({ id: 'gradient-text', snippet: 'bg-clip-text + bg-gradient (Tailwind)' });
  }

  // --- Layout ---

  // Monotonous spacing
  const spacingValues = [];
  const spacingRe = /(?:padding|margin)(?:-(?:top|right|bottom|left))?\s*:\s*(\d+)px/gi;
  let sm;
  while ((sm = spacingRe.exec(html)) !== null) {
    const v = parseInt(sm[1], 10);
    if (v > 0 && v < 200) spacingValues.push(v);
  }
  const gapRe = /gap\s*:\s*(\d+)px/gi;
  while ((sm = gapRe.exec(html)) !== null) {
    spacingValues.push(parseInt(sm[1], 10));
  }
  const twSpaceRe = /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(\d+)\b/g;
  while ((sm = twSpaceRe.exec(html)) !== null) {
    spacingValues.push(parseInt(sm[1], 10) * 4);
  }
  const remSpacingRe = /(?:padding|margin)(?:-(?:top|right|bottom|left))?\s*:\s*([\d.]+)rem/gi;
  while ((sm = remSpacingRe.exec(html)) !== null) {
    const v = Math.round(parseFloat(sm[1]) * 16);
    if (v > 0 && v < 200) spacingValues.push(v);
  }
  const roundedSpacing = spacingValues.map(v => Math.round(v / 4) * 4);
  if (roundedSpacing.length >= 10) {
    const counts = {};
    for (const v of roundedSpacing) counts[v] = (counts[v] || 0) + 1;
    const maxCount = Math.max(...Object.values(counts));
    const dominantPct = maxCount / roundedSpacing.length;
    const unique = [...new Set(roundedSpacing)].filter(v => v > 0);
    if (dominantPct > 0.6 && unique.length <= 3) {
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      findings.push({
        id: 'monotonous-spacing',
        snippet: `~${dominant}px used ${maxCount}/${roundedSpacing.length} times (${Math.round(dominantPct * 100)}%)`,
      });
    }
  }

  // --- Motion ---

  // Bounce/elastic animation names
  const bounceRe = /animation(?:-name)?\s*:\s*[^;]*\b(bounce|elastic|wobble|jiggle|spring)\b/gi;
  if (bounceRe.test(html)) {
    findings.push({ id: 'bounce-easing', snippet: 'Bounce/elastic animation in CSS' });
  }

  // Overshoot cubic-bezier
  const bezierRe = /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/g;
  let bm;
  while ((bm = bezierRe.exec(html)) !== null) {
    const y1 = parseFloat(bm[2]), y2 = parseFloat(bm[4]);
    if (y1 < -0.1 || y1 > 1.1 || y2 < -0.1 || y2 > 1.1) {
      findings.push({ id: 'bounce-easing', snippet: `cubic-bezier(${bm[1]}, ${bm[2]}, ${bm[3]}, ${bm[4]})` });
      break;
    }
  }

  // Layout property transitions
  const transRe = /transition(?:-property)?\s*:\s*([^;{}]+)/gi;
  let tm;
  while ((tm = transRe.exec(html)) !== null) {
    const val = tm[1].toLowerCase();
    if (/\ball\b/.test(val)) continue;
    const found = val.match(/\b(?:(?:max|min)-)?(?:width|height)\b|\bpadding(?:-(?:top|right|bottom|left))?\b|\bmargin(?:-(?:top|right|bottom|left))?\b/gi);
    if (found) {
      findings.push({ id: 'layout-transition', snippet: `transition: ${found.join(', ')}` });
      break;
    }
  }

  // --- Dark glow ---

  const darkBgRe = /background(?:-color)?\s*:\s*(?:#(?:0[0-9a-f]|1[0-9a-f]|2[0-3])[0-9a-f]{4}\b|#(?:0|1)[0-9a-f]{2}\b|rgb\(\s*(\d{1,2})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*\))/gi;
  const twDarkBg = /\bbg-(?:gray|slate|zinc|neutral|stone)-(?:9\d{2}|800)\b/;
  if (darkBgRe.test(html) || twDarkBg.test(html)) {
    const shadowRe = /box-shadow\s*:\s*([^;{}]+)/gi;
    let shm;
    while ((shm = shadowRe.exec(html)) !== null) {
      const val = shm[1];
      const colorMatch = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (!colorMatch) continue;
      const [r, g, b] = [+colorMatch[1], +colorMatch[2], +colorMatch[3]];
      if ((Math.max(r, g, b) - Math.min(r, g, b)) < 30) continue;
      const pxVals = [...val.matchAll(/(\d+)px|(?<![.\d])\b(0)\b(?![.\d])/g)].map(p => +(p[1] || p[2]));
      if (pxVals.length >= 3 && pxVals[2] > 4) {
        findings.push({ id: 'dark-glow', snippet: `Colored glow (rgb(${r},${g},${b})) on dark page` });
        break;
      }
    }
  }

  // --- Provider tells (gated): repeating-gradient stripes (GPT) ---
  if (/repeating-(?:linear|radial|conic)-gradient\s*\(/i.test(html)) {
    findings.push({ id: 'repeating-stripes-gradient', snippet: 'repeating-gradient decorative stripes' });
  }

  // --- Provider tells (gated): "X theater" framing copy (GPT) ---
  // Lives here (regex-on-HTML) rather than in the text-content analyzers so it
  // runs in the bundled browser path too, not just the CLI/static path.
  {
    const bodyText = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    const tm = /\b(\w+)\s+theater\b/i.exec(bodyText);
    if (tm) findings.push({ id: 'theater-slop-phrase', snippet: `"${tm[0].trim()}"` });
  }

  // --- Provider tells (gated): image hover transform (Gemini) ---
  // A CSS `img...:hover { transform: ... }` rule, or a Tailwind hover:scale /
  // hover:rotate / hover:translate utility on an <img>. Each distinct
  // mechanism is its own finding.
  const imgHoverCss = /\bimg\b[^,{}]*:hover\b[^{}]*\{[^}]*\btransform\s*:\s*(?:scale|rotate|translate|matrix|skew)/i;
  if (imgHoverCss.test(html)) {
    findings.push({ id: 'image-hover-transform', snippet: 'img:hover { transform } rule' });
  }
  const imgTagRe = /<img\b[^>]*\bclass\s*=\s*"([^"]*)"/gi;
  let im;
  while ((im = imgTagRe.exec(html)) !== null) {
    if (/\bhover:(?:scale|rotate|translate|skew)-/.test(im[1])) {
      findings.push({ id: 'image-hover-transform', snippet: 'Tailwind hover transform on <img>' });
    }
  }

  return findings;
}

// ─── Section 4: resolveBackground (unified) ─────────────────────────────────

// Read the element's own background color, computed-style first, with a
// jsdom-friendly fallback that parses the inline `background:` shorthand
// from the raw style attribute. jsdom (~v29) does not decompose the
// shorthand into `backgroundColor`, so without this fallback the CLI silently
// returns null for any element styled via `background: rgb(...)` or
// `background: #abc`. Real browsers always decompose, so the fallback is
// a no-op there.
function readOwnBackgroundColor(el, computedStyle) {
  const bg = parseRgb(computedStyle.backgroundColor);
  if (DETECTOR_IS_BROWSER || (bg && bg.a >= 0.1)) return bg;
  const rawStyle = el.getAttribute?.('style') || '';
  const bgMatch = rawStyle.match(/background(?:-color)?\s*:\s*([^;]+)/i);
  const inlineBg = bgMatch ? bgMatch[1].trim() : '';
  if (!inlineBg) return bg;
  if (/gradient/i.test(inlineBg) || /url\s*\(/i.test(inlineBg)) return bg;
  const fromRgb = parseRgb(inlineBg);
  if (fromRgb) return fromRgb;
  const hexMatch = inlineBg.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (hexMatch) {
    const h = hexMatch[1];
    if (h.length === 6) {
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    }
    return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 };
  }
  return bg;
}

function resolveBackground(el, win, customPropMap) {
  let current = el;
  while (current && current.nodeType === 1) {
    const style = DETECTOR_IS_BROWSER ? getComputedStyle(current) : win.getComputedStyle(current);
    const bgImage = style.backgroundImage || '';
    const hasGradientOrUrl = bgImage && bgImage !== 'none' && (/gradient/i.test(bgImage) || /url\s*\(/i.test(bgImage));

    // Try the solid bg-color FIRST. If the element has both a solid color
    // and a gradient/url overlay (a common pattern: `background: var(--paper)
    // radial-gradient(...)` for paper-grain texture), the solid color is the
    // dominant visible surface for contrast purposes; the overlay is
    // decorative. The old behavior bailed on any gradient ancestor, which
    // caused massive false-positive contrast findings on grain-textured
    // body backgrounds.
    let bg = parseRgb(style.backgroundColor);
    if (!DETECTOR_IS_BROWSER && (!bg || bg.a < 0.1)) {
      // jsdom returns literal "var(--X)" / "oklch(...)" strings. Resolve
      // through customPropMap so Tailwind v4 color tokens become RGB.
      if (customPropMap) {
        bg = parseColorResolved(style.backgroundColor, customPropMap);
      }
      if (!bg || bg.a < 0.1) {
        // Inline-style fallback. jsdom doesn't decompose background
        // shorthand, so colors set via inline style are otherwise invisible.
        const rawStyle = current.getAttribute?.('style') || '';
        const bgMatch = rawStyle.match(/background(?:-color)?\s*:\s*([^;]+)/i);
        const inlineBg = bgMatch ? bgMatch[1].trim() : '';
        if (inlineBg && !/gradient/i.test(inlineBg) && !/url\s*\(/i.test(inlineBg)) {
          bg = parseColorResolved(inlineBg, customPropMap) || parseAnyColor(inlineBg);
        }
      }
    }

    if (bg && bg.a > 0.1) {
      if (DETECTOR_IS_BROWSER || bg.a >= 0.5) return bg;
    }
    // No solid bg-color at this level. If THIS level has a gradient/url
    // with no underlying solid color we can read:
    //   • on body/html: assume white. Body-level gradients are almost
    //     always decorative texture (paper grain, noise) on top of a
    //     solid bg-color the page set via `background: var(--paper)`
    //     shorthand — which jsdom can't decompose into bg-color. The
    //     downstream gradient-stops fallback path produces catastrophic
    //     false positives in this case (gradient noise stops have
    //     accidental browns/blacks that look like card backgrounds).
    //   • on other elements: bail to null and let the caller fall back
    //     to gradient stops (gradient buttons / hero sections are real
    //     bgs worth checking against).
    if (hasGradientOrUrl) {
      if (current.tagName === 'BODY' || current.tagName === 'HTML') {
        return { r: 255, g: 255, b: 255, a: 1 };
      }
      return null;
    }
    current = current.parentElement;
  }
  return { r: 255, g: 255, b: 255 };
}

// Walk parents looking for a gradient background and return its color stops.
// Used as a fallback when resolveBackground() returns null because the
// effective background is a gradient (no single solid color to compare against).
function resolveGradientStops(el, win) {
  let current = el;
  while (current && current.nodeType === 1) {
    const style = DETECTOR_IS_BROWSER ? getComputedStyle(current) : win.getComputedStyle(current);
    const bgImage = style.backgroundImage || '';
    if (bgImage && bgImage !== 'none' && /gradient/i.test(bgImage)) {
      const stops = parseGradientColors(bgImage);
      if (stops.length > 0) return stops;
    }
    if (!DETECTOR_IS_BROWSER) {
      // jsdom doesn't decompose `background:` shorthand — peek at the raw inline style
      const rawStyle = current.getAttribute?.('style') || '';
      const bgMatch = rawStyle.match(/background(?:-image)?\s*:\s*([^;]+)/i);
      if (bgMatch && /gradient/i.test(bgMatch[1])) {
        const stops = parseGradientColors(bgMatch[1]);
        if (stops.length > 0) return stops;
      }
    }
    current = current.parentElement;
  }
  return null;
}

// Parse a single CSS length token to pixels. Accepts "12px", "50%", a
// shorthand like "12px 4px" (uses the first value), or empty / null.
// Returns the pixel value, or null when the input is unparseable.
// Percentages convert against `widthPx` when one is supplied. Without a
// usable width (jsdom returns "auto" for many real-world elements,
// which parseFloat collapses to 0), fall back to the raw percentage
// number so callers gating on `> 0` (border-accent-on-rounded,
// isCardLike's hasRadius) still see a positive value, matching the
// original parseFloat("50%") === 50 behavior.
function parseRadiusToPx(value, widthPx) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  const num = parseFloat(first);
  if (Number.isNaN(num)) return null;
  if (/%$/.test(first)) {
    if (widthPx && widthPx > 0) return (num / 100) * widthPx;
    return num;
  }
  return num;
}

function resolveBorderRadiusPx(el, style, widthPx, win) {
  const fromComputed = parseRadiusToPx(style.borderRadius, widthPx);
  if (fromComputed !== null) return fromComputed;
  return 0;
}

// ─── Section 5: Element Adapters ────────────────────────────────────────────

// Browser adapters — call getComputedStyle/getBoundingClientRect on live DOM

function checkElementBordersDOM(el) {
  const tag = el.tagName.toLowerCase();
  if (BORDER_SAFE_TAGS.has(tag)) return [];
  const rect = el.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return [];
  const style = getComputedStyle(el);
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const widths = {}, colors = {};
  for (const s of sides) {
    widths[s] = parseFloat(style[`border${s}Width`]) || 0;
    colors[s] = style[`border${s}Color`] || '';
  }
  return checkBorders(tag, widths, colors, parseFloat(style.borderRadius) || 0);
}

function checkElementColorsDOM(el) {
  const tag = el.tagName.toLowerCase();
  // No early SAFE_TAGS bail here — checkColors() does its own gating that
  // includes the styled-button exception for <a> / <button> with their own
  // opaque background. Bailing here would prevent that exception from firing.
  const rect = el.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return [];
  const style = getComputedStyle(el);
  const directText = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
  const hasDirectText = directText.trim().length > 0;
  const effectiveBg = resolveBackground(el);
  return checkColors({
    tag,
    textColor: parseRgb(style.color),
    bgColor: readOwnBackgroundColor(el, style),
    effectiveBg,
    effectiveBgStops: effectiveBg ? null : resolveGradientStops(el),
    fontSize: parseFloat(style.fontSize) || 16,
    fontWeight: parseInt(style.fontWeight) || 400,
    hasDirectText,
    isEmojiOnly: isEmojiOnlyText(directText),
    bgClip: style.webkitBackgroundClip || style.backgroundClip || '',
    bgImage: style.backgroundImage || '',
    classList: el.getAttribute('class') || '',
  });
}

function checkElementIconTileDOM(el) {
  const tag = el.tagName.toLowerCase();
  if (!HEADING_TAGS.has(tag)) return [];
  const sibling = el.previousElementSibling;
  if (!sibling) return [];

  const sibRect = sibling.getBoundingClientRect();
  const headRect = el.getBoundingClientRect();
  const sibStyle = getComputedStyle(sibling);

  // The tile may either contain an <svg>/<i> icon child, OR the tile itself
  // may contain an emoji/symbol character directly as its only text content
  // (the "card-icon" pattern from many AI-generated demos).
  const iconChild = sibling.querySelector('svg, i[data-lucide], i[class*="fa-"], i[class*="icon"]');
  const iconRect = iconChild?.getBoundingClientRect();
  const sibDirectText = [...sibling.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
  const hasInlineEmojiIcon = sibling.children.length === 0 && isEmojiOnlyText(sibDirectText);

  return checkIconTile({
    headingTag: tag,
    headingText: el.textContent || '',
    headingTop: headRect.top,
    siblingTag: sibling.tagName.toLowerCase(),
    siblingWidth: sibRect.width,
    siblingHeight: sibRect.height,
    siblingBottom: sibRect.bottom,
    siblingBgColor: parseRgb(sibStyle.backgroundColor),
    siblingBgImage: sibStyle.backgroundImage || '',
    siblingBorderWidth: parseFloat(sibStyle.borderTopWidth) || 0,
    siblingBorderRadius: parseFloat(sibStyle.borderRadius) || 0,
    hasIconChild: !!iconChild || hasInlineEmojiIcon,
    iconChildWidth: iconRect?.width || 0,
  });
}

function checkElementItalicSerifDOM(el) {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'h1' && tag !== 'h2') return [];
  const style = getComputedStyle(el);
  return checkItalicSerif({
    tag,
    fontStyle: style.fontStyle || '',
    fontFamily: style.fontFamily || '',
    fontSize: parseFloat(style.fontSize) || 0,
    headingText: el.textContent || '',
  });
}

function checkElementHeroEyebrowDOM(el) {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'h1') return [];
  const sibling = el.previousElementSibling;
  if (!sibling) return [];
  const headStyle = getComputedStyle(el);
  const sibStyle = getComputedStyle(sibling);
  return checkHeroEyebrow({
    headingTag: tag,
    headingText: el.textContent || '',
    headingFontSize: parseFloat(headStyle.fontSize) || 0,
    siblingTag: sibling.tagName.toLowerCase(),
    siblingText: sibling.textContent || '',
    siblingTextTransform: sibStyle.textTransform || '',
    siblingFontSize: parseFloat(sibStyle.fontSize) || 0,
    siblingLetterSpacing: parseFloat(sibStyle.letterSpacing) || 0,
    siblingFontWeight: sibStyle.fontWeight || '',
    siblingColor: sibStyle.color || '',
  });
}

// Build a map of CSS custom properties declared on :root / :host / html.
// Used to resolve var(--X) refs that jsdom returns verbatim in
// getComputedStyle. Tailwind v4 routes every utility class through
// CSS vars (font-weight: var(--font-weight-bold), font-size:
// var(--text-xs), letter-spacing: var(--tracking-widest)), so without
// resolution every style-based check silently fails on Tailwind v4
// builds — the values come back as literal "var(--font-weight-bold)"
// strings and parseFloat returns NaN.
function buildCustomPropMap(document) {
  const map = new Map();
  let sheets;
  try { sheets = Array.from(document.styleSheets || []); }
  catch { return map; }
  for (const sheet of sheets) {
    let rules;
    try { rules = Array.from(sheet.cssRules || []); }
    catch { continue; }
    for (const rule of rules) {
      // Style rules only (type 1). Walk @media / @supports if present.
      if (rule.type === 4 /* MEDIA_RULE */ || rule.type === 12 /* SUPPORTS_RULE */) {
        try { rules.push(...Array.from(rule.cssRules || [])); } catch { /* ignore */ }
        continue;
      }
      if (rule.type !== 1 /* STYLE_RULE */) continue;
      const sel = rule.selectorText || '';
      if (!/(^|,\s*)(:root|html|:host)\b/i.test(sel)) continue;
      const style = rule.style;
      if (!style) continue;
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        if (!prop || !prop.startsWith('--')) continue;
        const val = style.getPropertyValue(prop).trim();
        if (val) map.set(prop, val);
      }
    }
  }
  return map;
}

// Resolve var(--X[, fallback]) refs in a computed-style value string.
// Recurses up to 8 levels for chained refs (--a: var(--b)). Returns
// the original string when no refs are present or the chain doesn't
// resolve. Safe to call on already-resolved values.
function resolveVarRefs(raw, customPropMap, depth = 0) {
  if (typeof raw !== 'string' || !raw.includes('var(')) return raw;
  if (depth > 8) return raw;
  return raw.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\)/g, (_m, name, fallback) => {
    const v = customPropMap.get(name);
    if (v != null) return resolveVarRefs(v, customPropMap, depth + 1);
    return fallback ? resolveVarRefs(fallback.trim(), customPropMap, depth + 1) : _m;
  });
}

// OKLCH → sRGB conversion (Björn Ottosson's matrices). L in 0..1 (or %),
// C in 0..~0.4 typical, H in degrees. Returns clamped {r,g,b,a:1} in 0..255.
// Needed because jsdom doesn't compute oklch() values — getComputedStyle
// returns the literal "oklch(...)" string. Without this, the entire
// Tailwind v4 color palette (which is OKLCH-based) is invisible to the
// detector's contrast / color checks.
function oklchToRgb(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const lc = l_ * l_ * l_, mc = m_ * m_ * m_, sc = s_ * s_ * s_;
  const rLin =  4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const gLin = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const bLin = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;
  const enc = (x) => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return {
    r: Math.round(enc(rLin) * 255),
    g: Math.round(enc(gLin) * 255),
    b: Math.round(enc(bLin) * 255),
    a: 1,
  };
}

// Extended color parser: rgb/rgba/hex/oklch. Returns null on no match.
// Use this when the input might be any CSS color form; use plain parseRgb
// when you only expect computed rgb() values from real browsers.
function parseAnyColor(s) {
  if (!s || typeof s !== 'string') return null;
  const str = s.trim();
  if (str === 'transparent' || str === 'currentcolor' || str === 'inherit') return null;
  let m;
  m = str.match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+))?\s*\)/);
  if (m) return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a: m[4] !== undefined ? +m[4] : 1 };
  m = str.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
        a: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1,
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
  }
  // OKLCH parser. Tailwind v4's CSS minifier squishes the space after
  // `%` ("21.5%.02 50"), so the separator between L and C may be absent.
  // Match L (with optional %), then C and H separated permissively.
  m = str.match(/oklch\(\s*([\d.]+)(%?)\s*[\s,]*\s*([\d.]+)\s*[\s,]+\s*([-\d.]+)(?:deg)?\s*\)/i);
  if (m) {
    const Lnum = parseFloat(m[1]);
    const L = m[2] === '%' ? Lnum / 100 : Lnum;
    return oklchToRgb(L, parseFloat(m[3]), parseFloat(m[4]));
  }
  return null;
}

// Resolve var() refs in a color string (via customPropMap), then parse.
// Returns null on any failure. Used in jsdom-mode paths where
// getComputedStyle returns literal "var(--X)" or "oklch(...)" strings.
function parseColorResolved(str, customPropMap) {
  if (!str) return null;
  const resolved = customPropMap ? resolveVarRefs(str, customPropMap) : str;
  return parseAnyColor(resolved);
}

const REPEATED_KICKER_SKIP_SELECTOR = [
  'nav',
  'form',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'figure',
  'figcaption',
  'ol',
  'ul',
  'li',
  '[role="navigation"]',
  '[aria-label*="breadcrumb" i]',
  '[class*="breadcrumb" i]',
  '[data-tcher-allow-kickers]',
].join(',');

function cleanInlineText(el) {
  return [...el.childNodes]
    .filter(n => n.nodeType === 3)
    .map(n => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRepeatedKickerCandidate(opts) {
  const {
    headingTag,
    headingText,
    headingFontSize,
    kickerTag,
    kickerText,
    kickerTextTransform,
    kickerFontSize,
    kickerLetterSpacing,
  } = opts;
  if (!['h2', 'h3', 'h4'].includes(headingTag)) return false;
  if (!headingText || headingText.length < 3) return false;
  if (!(headingFontSize >= 20)) return false;
  if (!kickerTag || HEADING_TAGS.has(kickerTag)) return false;
  if (!['p', 'span', 'div', 'small'].includes(kickerTag)) return false;
  if (!kickerText || kickerText.length < 2 || kickerText.length > 34) return false;
  if (/^step\s*\d+/i.test(kickerText) || /^\d{1,2}$/.test(kickerText)) return false;

  const isUppercased = kickerTextTransform === 'uppercase'
    || (/[A-Z]/.test(kickerText) && !/[a-z]/.test(kickerText));
  if (!isUppercased) return false;
  if (!(kickerFontSize > 0 && kickerFontSize <= 14)) return false;
  const minTrackedSpacing = Math.max(1, kickerFontSize * 0.08);
  if (!(kickerLetterSpacing >= minTrackedSpacing)) return false;
  return true;
}

function collectRepeatedSectionKickerCandidates(doc, getStyle, resolveLetterSpacing) {
  const candidates = [];
  for (const heading of doc.querySelectorAll('h2, h3, h4')) {
    if (heading.closest?.(REPEATED_KICKER_SKIP_SELECTOR)) continue;
    const kicker = heading.previousElementSibling;
    if (!kicker || kicker.closest?.(REPEATED_KICKER_SKIP_SELECTOR)) continue;

    const headingStyle = getStyle(heading);
    const kickerStyle = getStyle(kicker);
    const headingText = (heading.textContent || '').replace(/\s+/g, ' ').trim();
    const kickerText = cleanInlineText(kicker) || (kicker.textContent || '').replace(/\s+/g, ' ').trim();
    const headingFontSize = resolveLetterSpacing(headingStyle.fontSize || '', 16) || parseFloat(headingStyle.fontSize) || 0;
    const kickerFontSize = resolveLetterSpacing(kickerStyle.fontSize || '', 16) || parseFloat(kickerStyle.fontSize) || 0;
    const kickerLetterSpacing = resolveLetterSpacing(kickerStyle.letterSpacing || '', kickerFontSize);

    if (!isRepeatedKickerCandidate({
      headingTag: heading.tagName.toLowerCase(),
      headingText,
      headingFontSize,
      kickerTag: kicker.tagName.toLowerCase(),
      kickerText,
      kickerTextTransform: kickerStyle.textTransform || '',
      kickerFontSize,
      kickerLetterSpacing,
    })) {
      continue;
    }

    candidates.push({
      headingTag: heading.tagName.toLowerCase(),
      headingText: headingText.replace(/^"|"$/g, '').slice(0, 60),
      kickerText: kickerText.slice(0, 40),
    });
  }
  return candidates;
}

function checkRepeatedSectionKickersDOM() {
  const candidates = collectRepeatedSectionKickerCandidates(
    document,
    (el) => getComputedStyle(el),
    (value, fontSize) => resolveLengthPx(value, fontSize) || 0,
  );
  return checkRepeatedSectionKickers({ candidates });
}

function checkElementMotionDOM(el) {
  const tag = el.tagName.toLowerCase();
  if (SAFE_TAGS.has(tag)) return [];
  const style = getComputedStyle(el);
  return checkMotion({
    tag,
    transitionProperty: style.transitionProperty || '',
    animationName: style.animationName || '',
    timingFunctions: [style.animationTimingFunction, style.transitionTimingFunction].filter(Boolean).join(' '),
    classList: el.getAttribute('class') || '',
  });
}

function checkElementGlowDOM(el) {
  const tag = el.tagName.toLowerCase();
  const style = getComputedStyle(el);
  if (!style.boxShadow || style.boxShadow === 'none') return [];
  // Use parent's background — glow radiates outward, so the surrounding context matters
  // If resolveBackground returns null (gradient), try to infer from the gradient colors
  let parentBg = el.parentElement ? resolveBackground(el.parentElement) : resolveBackground(el);
  if (!parentBg) {
    // Gradient background — sample its colors to determine if it's dark
    let cur = el.parentElement;
    while (cur && cur.nodeType === 1) {
      const bgImage = getComputedStyle(cur).backgroundImage || '';
      const gradColors = parseGradientColors(bgImage);
      if (gradColors.length > 0) {
        // Average the gradient colors
        const avg = { r: 0, g: 0, b: 0 };
        for (const c of gradColors) { avg.r += c.r; avg.g += c.g; avg.b += c.b; }
        avg.r = Math.round(avg.r / gradColors.length);
        avg.g = Math.round(avg.g / gradColors.length);
        avg.b = Math.round(avg.b / gradColors.length);
        parentBg = avg;
        break;
      }
      cur = cur.parentElement;
    }
  }
  return checkGlow({ tag, boxShadow: style.boxShadow, effectiveBg: parentBg });
}

function checkElementAIPaletteDOM(el) {
  const style = getComputedStyle(el);
  const findings = [];

  // Check gradient backgrounds for purple/violet or cyan
  const bgImage = style.backgroundImage || '';
  const gradColors = parseGradientColors(bgImage);
  for (const c of gradColors) {
    if (hasChroma(c, 50)) {
      const hue = getHue(c);
      if (hue >= 260 && hue <= 310) {
        findings.push({ id: 'ai-color-palette', snippet: 'Purple/violet gradient background' });
        break;
      }
      if (hue >= 160 && hue <= 200) {
        findings.push({ id: 'ai-color-palette', snippet: 'Cyan gradient background' });
        break;
      }
    }
  }

  // Check for neon text (vivid cyan/purple color on dark background)
  const textColor = parseRgb(style.color);
  if (textColor && hasChroma(textColor, 80)) {
    const hue = getHue(textColor);
    const isAIPalette = (hue >= 160 && hue <= 200) || (hue >= 260 && hue <= 310);
    if (isAIPalette) {
      const parentBg = el.parentElement ? resolveBackground(el.parentElement) : null;
      // Also check gradient parents
      let effectiveBg = parentBg;
      if (!effectiveBg) {
        let cur = el.parentElement;
        while (cur && cur.nodeType === 1) {
          const gi = getComputedStyle(cur).backgroundImage || '';
          const gc = parseGradientColors(gi);
          if (gc.length > 0) {
            const avg = { r: 0, g: 0, b: 0 };
            for (const c of gc) { avg.r += c.r; avg.g += c.g; avg.b += c.b; }
            avg.r = Math.round(avg.r / gc.length);
            avg.g = Math.round(avg.g / gc.length);
            avg.b = Math.round(avg.b / gc.length);
            effectiveBg = avg;
            break;
          }
          cur = cur.parentElement;
        }
      }
      if (effectiveBg && relativeLuminance(effectiveBg) < 0.1) {
        const label = hue >= 260 ? 'Purple/violet' : 'Cyan';
        findings.push({ id: 'ai-color-palette', snippet: `${label} neon text on dark background` });
      }
    }
  }

  return findings;
}

const QUALITY_TEXT_TAGS = new Set(['p', 'li', 'td', 'th', 'dd', 'blockquote', 'figcaption']);

// Resolve a CSS font-size value to pixels by walking up the parent chain.
// Browsers resolve em/rem/% to px in getComputedStyle, but jsdom returns the
// specified value verbatim — so for the Node path we walk parents ourselves.
function resolveFontSizePx(el, win) {
  const chain = []; // raw font-size strings, leaf → root
  let cur = el;
  while (cur && cur.nodeType === 1) {
    const fs = (win ? win.getComputedStyle(cur) : getComputedStyle(cur)).fontSize;
    chain.push(fs || '');
    cur = cur.parentElement;
  }
  // Walk root → leaf, resolving each value relative to its parent context.
  let px = 16; // root default
  for (let i = chain.length - 1; i >= 0; i--) {
    const v = chain[i];
    if (!v || v === 'inherit') continue;
    const num = parseFloat(v);
    if (isNaN(num)) continue;
    if (v.endsWith('px')) px = num;
    else if (v.endsWith('rem')) px = num * 16;
    else if (v.endsWith('em')) px = num * px;
    else if (v.endsWith('%')) px = (num / 100) * px;
    else px = num; // unitless — already resolved
  }
  return px;
}

// Resolve a CSS length value (line-height, letter-spacing, etc.) given a
// known font-size context. Returns null for "normal" / unparseable values.
function resolveLengthPx(value, fontSizePx) {
  if (!value || value === 'normal' || value === 'auto' || value === 'inherit') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (value.endsWith('px')) return num;
  if (value.endsWith('rem')) return num * 16;
  if (value.endsWith('em')) return num * fontSizePx;
  if (value.endsWith('%')) return (num / 100) * fontSizePx;
  // Unitless line-height = multiplier, return px equivalent
  return num * fontSizePx;
}

// Pure quality checks. Most run on computed CSS and DOM-only inputs (work in
// jsdom and the browser). Two checks (line-length, cramped-padding) gate on
// element rect dimensions, which jsdom can't compute — pass `rect: null` from
// the Node adapter to skip those.
//
// Both adapters resolve font-size, line-height and letter-spacing to pixels
// before calling this so the pure function only deals with numbers.
function checkQuality(opts) {
  const { el, tag, style, hasDirectText, textLen, fontSize, lineHeightPx, letterSpacingPx, rect, lineMax = 80, viewportWidth = 0, win = null } = opts;
  const findings = [];
  // Skip browser extension injected elements
  const elId = el.id || '';
  if (elId.startsWith('claude-') || elId.startsWith('cic-')) return findings;

  // --- Line length too long --- (browser-only: needs rect.width)
  if (rect && hasDirectText && QUALITY_TEXT_TAGS.has(tag) && rect.width > 0 && textLen > lineMax) {
    const charsPerLine = rect.width / (fontSize * 0.5);
    if (charsPerLine > lineMax + 5) {
      findings.push({ id: 'line-length', snippet: `~${Math.round(charsPerLine)} chars/line (aim for <${lineMax})` });
    }
  }

  // --- Cramped padding --- (browser-only: needs rect to skip small badges/labels)
  // Vertical and horizontal thresholds are independent because line-height
  // already provides built-in vertical breathing room (the line box is taller
  // than the cap height), but horizontal has no equivalent. Both scale with
  // font-size — bigger text demands proportionally more padding.
  //   vertical:   max(4px, fontSize × 0.3)
  //   horizontal: max(8px, fontSize × 0.5)
  if (rect && hasDirectText && textLen > 20 && rect.width > 100 && rect.height > 30) {
    const borders = {
      top: parseFloat(style.borderTopWidth) || 0,
      right: parseFloat(style.borderRightWidth) || 0,
      bottom: parseFloat(style.borderBottomWidth) || 0,
      left: parseFloat(style.borderLeftWidth) || 0,
    };
    const borderCount = Object.values(borders).filter(w => w > 0).length;
    const hasBg = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    if (borderCount >= 2 || hasBg) {
      const vPads = [], hPads = [];
      if (hasBg || borders.top > 0) vPads.push(parseFloat(style.paddingTop) || 0);
      if (hasBg || borders.bottom > 0) vPads.push(parseFloat(style.paddingBottom) || 0);
      if (hasBg || borders.left > 0) hPads.push(parseFloat(style.paddingLeft) || 0);
      if (hasBg || borders.right > 0) hPads.push(parseFloat(style.paddingRight) || 0);

      const vMin = vPads.length ? Math.min(...vPads) : Infinity;
      const hMin = hPads.length ? Math.min(...hPads) : Infinity;
      const vThresh = Math.max(4, fontSize * 0.3);
      const hThresh = Math.max(8, fontSize * 0.5);

      // Emit at most one finding per element — pick whichever axis is worse.
      if (vMin < vThresh) {
        findings.push({ id: 'cramped-padding', snippet: `${vMin}px vertical padding (need ≥${vThresh.toFixed(1)}px for ${fontSize}px text)` });
      } else if (hMin < hThresh) {
        findings.push({ id: 'cramped-padding', snippet: `${hMin}px horizontal padding (need ≥${hThresh.toFixed(1)}px for ${fontSize}px text)` });
      }
    }
  }

  // --- Flush against a visible boundary ---
  // Fires when a container has a visible boundary (border, outline, OR a
  // non-transparent background) AND near-zero padding on the bounded
  // side(s) AND text-bearing children land flush against the boundary.
  //
  // Distinct from cramped-padding: that rule needs the element itself to
  // have direct text (hasDirectText). This rule targets the OPPOSITE
  // shape — a container with NO direct text, only children — which is
  // exactly what cramped-padding misses (a section wrapping a label +
  // list lands a free pass).
  //
  // The classic shape: agent writes `padding: 28px 0 0` shorthand on a
  // section that also has a border, zeroing horizontal padding so the
  // text-bearing children touch the side borders. Background and
  // outline count too: a colored card with zero padding has the same
  // visual failure mode.
  {
    const FLUSH_SKIP_TAGS = new Set(['HTML', 'BODY', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'ARTICLE', 'ASIDE', 'BUTTON', 'A', 'LABEL', 'SUMMARY', 'CODE', 'PRE', 'INPUT', 'TEXTAREA', 'SELECT', 'FORM', 'FIGURE', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH']);
    const upperTag = tag ? tag.toUpperCase() : '';
    const elPosition = style.position || '';
    if (
      !FLUSH_SKIP_TAGS.has(upperTag) &&
      !hasDirectText &&
      !['fixed', 'absolute'].includes(elPosition) &&
      el.children && el.children.length > 0
    ) {
      const isTransparent = (c) =>
        !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)' ||
        /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\)$/.test(c);

      const borderW = {
        top:    parseFloat(style.borderTopWidth)    || 0,
        right:  parseFloat(style.borderRightWidth)  || 0,
        bottom: parseFloat(style.borderBottomWidth) || 0,
        left:   parseFloat(style.borderLeftWidth)   || 0,
      };
      const borderVisible = {
        top:    borderW.top    > 0 && !isTransparent(style.borderTopColor),
        right:  borderW.right  > 0 && !isTransparent(style.borderRightColor),
        bottom: borderW.bottom > 0 && !isTransparent(style.borderBottomColor),
        left:   borderW.left   > 0 && !isTransparent(style.borderLeftColor),
      };
      // Outline detection. jsdom decomposes `border` shorthand into
      // border{Top,…}Width/Color but does NOT decompose `outline` —
      // the longhands come back empty when the value was set via the
      // shorthand. Fall back to parsing `style.outline` ourselves.
      let outlineW = parseFloat(style.outlineWidth) || 0;
      let outlineStyleVal = style.outlineStyle || '';
      let outlineColorVal = style.outlineColor || '';
      if (!outlineW && style.outline) {
        const wMatch = style.outline.match(/(\d+(?:\.\d+)?)\s*px/);
        if (wMatch) outlineW = parseFloat(wMatch[1]) || 0;
        if (!outlineStyleVal) {
          outlineStyleVal = /\b(solid|dashed|dotted|double|groove|ridge|inset|outset)\b/.test(style.outline) ? 'solid' : '';
        }
        if (!outlineColorVal) {
          const cMatch = style.outline.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*$/);
          if (cMatch) outlineColorVal = cMatch[1];
        }
      }
      const outlineVisible = outlineW > 0 && !isTransparent(outlineColorVal) && outlineStyleVal && outlineStyleVal !== 'none';
      const bgVisible = !isTransparent(style.backgroundColor);

      const anyVisible = borderVisible.top || borderVisible.right || borderVisible.bottom || borderVisible.left || outlineVisible || bgVisible;
      if (anyVisible) {
        // Resolve padding to px (jsdom returns raw "1.5rem" etc., not the
        // computed px value; parseFloat would strip the unit and treat
        // 1.5rem as 1.5px, false-flagging legitimate insets).
        const pad = {
          top:    resolveLengthPx(style.paddingTop,    fontSize) ?? 0,
          right:  resolveLengthPx(style.paddingRight,  fontSize) ?? 0,
          bottom: resolveLengthPx(style.paddingBottom, fontSize) ?? 0,
          left:   resolveLengthPx(style.paddingLeft,   fontSize) ?? 0,
        };
        const PAD_THRESHOLD = 2;
        // Children-insulate-this-side: a side is insulated if ANY direct
        // child has its own padding ≥ 4px on that side. Rationale: in
        // typical flow, only the first/last (or leftmost/rightmost)
        // children actually sit at the parent's edges. If even one of
        // them has its own padding, the visual flush is broken on that
        // side. Classic example: a column-flow card frame where the
        // top child (header) has padding-top:12 and the bottom child
        // (footer) has padding-bottom:8 — the parent's padding:0 doesn't
        // matter; nothing is actually flush. The `any-child-insulates`
        // heuristic accepts some false negatives (a card with one heavily
        // padded middle child won't flag) for far fewer false positives.
        const CHILD_INSULATE_THRESHOLD = 4;
        const childrenInsulate = { top: false, right: false, bottom: false, left: false };
        for (const child of el.children) {
          let childStyle = null;
          if (win && typeof win.getComputedStyle === 'function') {
            try { childStyle = win.getComputedStyle(child); } catch {}
          }
          if (!childStyle && typeof getComputedStyle === 'function') {
            try { childStyle = getComputedStyle(child); } catch {}
          }
          if (!childStyle) continue;
          const childPad = {
            top:    resolveLengthPx(childStyle.paddingTop,    fontSize) ?? 0,
            right:  resolveLengthPx(childStyle.paddingRight,  fontSize) ?? 0,
            bottom: resolveLengthPx(childStyle.paddingBottom, fontSize) ?? 0,
            left:   resolveLengthPx(childStyle.paddingLeft,   fontSize) ?? 0,
          };
          for (const s of ['top', 'right', 'bottom', 'left']) {
            if (childPad[s] >= CHILD_INSULATE_THRESHOLD) childrenInsulate[s] = true;
          }
        }

        const flushSides = [];
        for (const side of ['top', 'right', 'bottom', 'left']) {
          const sideBounded = borderVisible[side] || outlineVisible || bgVisible;
          if (sideBounded && pad[side] <= PAD_THRESHOLD && !childrenInsulate[side]) {
            flushSides.push(side);
          }
        }

        if (flushSides.length > 0) {
          // Confirm at least one direct child has substantial text content
          // (> 4 chars). Without this, the flush is harmless: e.g. an
          // image-only card.
          let hasTextChild = false;
          for (const child of el.children) {
            const childText = (child.textContent || '').trim();
            if (childText.length > 4) { hasTextChild = true; break; }
          }
          if (hasTextChild) {
            const cls = (typeof el.className === 'string' && el.className.trim())
              ? el.className.trim().split(/\s+/)[0]
              : '';
            const boundaryParts = [];
            const borderSidesVisible = ['top', 'right', 'bottom', 'left'].filter(s => borderVisible[s]);
            if (borderSidesVisible.length === 4) boundaryParts.push('border');
            else if (borderSidesVisible.length > 0) boundaryParts.push(`border-${borderSidesVisible.join('/')}`);
            if (outlineVisible) boundaryParts.push('outline');
            if (bgVisible) boundaryParts.push('bg');
            const sidesLabel = flushSides.length === 4 ? 'all sides' : flushSides.join('/');
            const ident = cls
              ? `<${tag.toLowerCase()}> "${cls}"`
              : `<${tag.toLowerCase()}>`;
            findings.push({
              id: 'cramped-padding',
              snippet: `${ident}: children flush against ${boundaryParts.join('+')} on ${sidesLabel} (no inset)`,
            });
          }
        }
      }
    }
  }

  // --- Body text touching viewport edge --- (browser-only: needs rect)
  // Catches the failure mode where the agent ships body paragraphs
  // with NO container providing horizontal padding — text bleeds
  // directly to the viewport edge. Different from cramped-padding,
  // which requires a colored/bordered container. Here the failure
  // is the absence of the container entirely.
  //
  // Gate aggressively to avoid false positives:
  //   - <p> or <li> only (body content; not headings, not nav, not
  //     wrappers)
  //   - text > 40 chars (paragraph-like, not a label)
  //   - rect.width > 50% of viewport (real body, not a pull-quote)
  //   - rect.left < 16 OR rect.right > viewport - 16 (actually
  //     touching the edge)
  //   - not inside <nav> or <header> (those legitimately bleed)
  //   - element itself has no background-color (intentional full-bleed
  //     sections set a bg-color and provide their own internal padding)
  if (rect && hasDirectText && textLen > 40 && ['P', 'LI'].includes(tag.toUpperCase()) && viewportWidth > 0) {
    const inNavHeader = el.closest && (el.closest('nav') || el.closest('header'));
    const hasOwnBg = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
    const isPositioned = ['fixed', 'absolute'].includes(style.position || '');
    const widthRatio = rect.width / viewportWidth;
    const leftClose = rect.left < 16;
    const rightClose = rect.right > viewportWidth - 16;
    if (!inNavHeader && !hasOwnBg && !isPositioned && widthRatio > 0.5 && (leftClose || rightClose)) {
      const which = leftClose && rightClose
        ? `left ${Math.round(rect.left)}px / right ${Math.round(viewportWidth - rect.right)}px`
        : leftClose
          ? `left ${Math.round(rect.left)}px`
          : `right ${Math.round(viewportWidth - rect.right)}px`;
      findings.push({ id: 'body-text-viewport-edge', snippet: `<${tag.toLowerCase()}> with ${textLen}-char body bleeds to viewport edge (${which})` });
    }
  }

  // --- Tight line height ---
  if (hasDirectText && textLen > 50 && !['h1','h2','h3','h4','h5','h6'].includes(tag)) {
    if (lineHeightPx != null && fontSize > 0) {
      const ratio = lineHeightPx / fontSize;
      if (ratio > 0 && ratio < 1.3) {
        findings.push({ id: 'tight-leading', snippet: `line-height ${ratio.toFixed(2)}x (need >=1.3)` });
      }
    }
  }

  // --- Justified text (without hyphens) ---
  if (hasDirectText && style.textAlign === 'justify') {
    const hyphens = style.hyphens || style.webkitHyphens || '';
    if (hyphens !== 'auto') {
      findings.push({ id: 'justified-text', snippet: 'text-align: justify without hyphens: auto' });
    }
  }

  // --- Tiny body text ---
  // Only flag actual body content, not UI labels (buttons, tabs, badges, captions, footer text, etc.)
  if (hasDirectText && textLen > 20 && fontSize < 12) {
    const skipTags = ['sub', 'sup', 'code', 'kbd', 'samp', 'var', 'caption', 'figcaption'];
    const inUIContext = el.closest && el.closest('button, a, label, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], nav, footer, [class*="badge" i], [class*="chip" i], [class*="pill" i], [class*="tag" i], [class*="label" i], [class*="caption" i]');
    const isUppercase = style.textTransform === 'uppercase';
    if (!skipTags.includes(tag) && !inUIContext && !isUppercase) {
      findings.push({ id: 'tiny-text', snippet: `${fontSize}px body text` });
    }
  }

  // --- All-caps body text ---
  if (hasDirectText && textLen > 30 && style.textTransform === 'uppercase') {
    if (!['h1','h2','h3','h4','h5','h6'].includes(tag)) {
      findings.push({ id: 'all-caps-body', snippet: `text-transform: uppercase on ${textLen} chars of body text` });
    }
  }

  // --- Wide letter spacing on body text ---
  if (hasDirectText && textLen > 20 && style.textTransform !== 'uppercase') {
    if (letterSpacingPx != null && letterSpacingPx > 0 && fontSize > 0) {
      const trackingEm = letterSpacingPx / fontSize;
      if (trackingEm > 0.05) {
        findings.push({ id: 'wide-tracking', snippet: `letter-spacing: ${trackingEm.toFixed(2)}em on body text` });
      }
    }
  }

  // --- Crushed letter spacing (mirror of wide-tracking) ---
  // Tracking pulled tighter than ~-0.05em crushes characters into each other.
  // Optical tightening that display type legitimately wants (around -0.02em)
  // stays well above this floor.
  if (hasDirectText && textLen > 20 && fontSize > 0) {
    if (letterSpacingPx != null && letterSpacingPx < 0) {
      const trackingEm = letterSpacingPx / fontSize;
      if (trackingEm <= -0.05) {
        const excerpt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        findings.push({ id: 'extreme-negative-tracking', snippet: `letter-spacing: ${trackingEm.toFixed(2)}em — "${excerpt}"` });
      }
    }
  }

  return findings;
}

function checkElementQualityDOM(el) {
  const tag = el.tagName.toLowerCase();
  const style = getComputedStyle(el);
  const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 10);
  const textLen = el.textContent?.trim().length || 0;
  // Browser getComputedStyle resolves everything to px — direct parseFloat
  // works.
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeightPx = resolveLengthPx(style.lineHeight, fontSize);
  const letterSpacingPx = resolveLengthPx(style.letterSpacing, fontSize);
  const rect = el.getBoundingClientRect();
  const lineMax = (typeof window !== 'undefined' && window.__TCHER_CONFIG__?.lineLengthMax) || 80;
  const viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 0) || 0;
  return checkQuality({ el, tag, style, hasDirectText, textLen, fontSize, lineHeightPx, letterSpacingPx, rect, lineMax, viewportWidth, win: typeof window !== 'undefined' ? window : null });
}

// Pure page-level skipped-heading walk. Takes a Document so it works in both
// the browser and jsdom.
function checkPageQualityFromDoc(doc) {
  const findings = [];
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let prevLevel = 0;
  let prevText = '';
  for (const h of headings) {
    const level = parseInt(h.tagName[1]);
    const text = (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (prevLevel > 0 && level > prevLevel + 1) {
      findings.push({
        id: 'skipped-heading',
        snippet: `<h${prevLevel}> "${prevText}" followed by <h${level}> "${text}" (missing h${prevLevel + 1})`,
      });
    }
    prevLevel = level;
    prevText = text;
  }
  return findings;
}

// Browser adapter (returns the legacy { type, detail } shape used by the overlay loop)
function checkPageQualityDOM() {
  return checkPageQualityFromDoc(document).map(f => ({ type: f.id, detail: f.snippet }));
}

// Node adapters — take pre-extracted jsdom computed style

// jsdom doesn't lay out OR resolve em/rem/% to px — so we pre-resolve every
// CSS length the rule needs ourselves (walking the parent chain for
// font-size inheritance), and pass `rect: null` to skip the two rules that
// genuinely need element rects (line-length, cramped-padding).
function checkElementQuality(el, style, tag, window) {
  const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 10);
  const textLen = el.textContent?.trim().length || 0;
  const fontSize = resolveFontSizePx(el, window);
  const lineHeightPx = resolveLengthPx(style.lineHeight, fontSize);
  const letterSpacingPx = resolveLengthPx(style.letterSpacing, fontSize);
  return checkQuality({ el, tag, style, hasDirectText, textLen, fontSize, lineHeightPx, letterSpacingPx, rect: null, win: window });
}

function checkElementBorders(tag, style, overrides, resolvedRadius) {
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const widths = {}, colors = {};
  for (const s of sides) {
    widths[s] = parseFloat(style[`border${s}Width`]) || 0;
    colors[s] = style[`border${s}Color`] || '';
    // jsdom silently drops any border shorthand containing var(), leaving
    // both width and color empty on the computed style. When the detectHtml
    // pre-pass pulled a resolved value off the rule, use it to fill in the
    // missing side so the side-tab check can run. Real browsers resolve
    // var() natively, so this fallback is a no-op in the browser path.
    if (widths[s] === 0 && overrides && overrides[s]) {
      widths[s] = overrides[s].width;
      colors[s] = overrides[s].color;
    } else if (colors[s] && colors[s].startsWith('var(') && overrides && overrides[s]) {
      // Longhand case: jsdom kept the width but left the color as the
      // literal `var(...)` string. Substitute the resolved color.
      colors[s] = overrides[s].color;
    }
  }
  // resolvedRadius lets the caller pre-resolve the radius via
  // resolveBorderRadiusPx so the value survives jsdom 29.1.0's broken
  // shorthand serialization. Falls back to the computed value for tests
  // and browser callers that don't pre-resolve.
  const radius = resolvedRadius != null
    ? resolvedRadius
    : (parseFloat(style.borderRadius) || 0);
  return checkBorders(tag, widths, colors, radius);
}

function checkElementColors(el, style, tag, window, customPropMap, hasAnchorInheritRule) {
  const directText = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
  const hasDirectText = directText.trim().length > 0;

  const effectiveBg = resolveBackground(el, window, customPropMap);
  // jsdom returns literal "var(--X)" / "oklch(...)" for color, so plain
  // parseRgb misses Tailwind-tokenized text colors. Resolve through the
  // customPropMap first; fall back to parseRgb for vanilla rgb() pages.
  let textColor = customPropMap ? parseColorResolved(style.color, customPropMap) : null;
  if (!textColor) textColor = parseRgb(style.color);

  // Anchor-inherit FP workaround: jsdom's UA stylesheet has `:link { color:
  // blue }` at high specificity. The page's `a { color: inherit }` rule
  // (Tailwind v4 preflight) loses to jsdom even though it WINS in real
  // browsers (Chrome's UA wraps :link in :where() — zero specificity).
  // When the page declares the inherit rule AND we see jsdom's default
  // link blue on an anchor, walk to the nearest non-anchor ancestor and
  // use its color instead.
  if (
    hasAnchorInheritRule &&
    textColor &&
    textColor.r === 0 && textColor.g === 0 && textColor.b === 238 &&
    (tag === 'a' || el.closest?.('a'))
  ) {
    let cur = el.parentElement;
    while (cur && cur.tagName !== 'HTML') {
      if (cur.tagName !== 'A') {
        const ps = window.getComputedStyle(cur);
        const inh = (customPropMap ? parseColorResolved(ps.color, customPropMap) : null) || parseRgb(ps.color);
        if (inh && !(inh.r === 0 && inh.g === 0 && inh.b === 238)) {
          textColor = inh;
          break;
        }
      }
      cur = cur.parentElement;
    }
  }

  return checkColors({
    tag,
    textColor,
    bgColor: readOwnBackgroundColor(el, style),
    effectiveBg,
    effectiveBgStops: effectiveBg ? null : resolveGradientStops(el, window),
    fontSize: parseFloat(style.fontSize) || 16,
    fontWeight: parseInt(style.fontWeight) || 400,
    hasDirectText,
    isEmojiOnly: isEmojiOnlyText(directText),
    bgClip: style.webkitBackgroundClip || style.backgroundClip || '',
    bgImage: style.backgroundImage || '',
    classList: el.getAttribute?.('class') || el.className || '',
  });
}

function checkElementIconTile(el, tag, window) {
  if (!HEADING_TAGS.has(tag)) return [];
  const sibling = el.previousElementSibling;
  if (!sibling) return [];

  const sibStyle = window.getComputedStyle(sibling);
  // jsdom doesn't lay out — read explicit pixel dimensions from CSS instead.
  const sibWidth = parseFloat(sibStyle.width) || 0;
  const sibHeight = parseFloat(sibStyle.height) || 0;

  const iconChild = sibling.querySelector('svg, i[data-lucide], i[class*="fa-"], i[class*="icon"]');
  let iconWidth = 0;
  if (iconChild) {
    const iconStyle = window.getComputedStyle(iconChild);
    iconWidth = parseFloat(iconStyle.width) || parseFloat(iconChild.getAttribute('width')) || 0;
  }
  // Or: tile contains an emoji/symbol character directly as its only content
  const sibDirectText = [...sibling.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
  const hasInlineEmojiIcon = sibling.children.length === 0 && isEmojiOnlyText(sibDirectText);

  return checkIconTile({
    headingTag: tag,
    headingText: el.textContent || '',
    headingTop: 0, // jsdom: no layout, skip vertical-stacking gate
    siblingTag: sibling.tagName.toLowerCase(),
    siblingWidth: sibWidth,
    siblingHeight: sibHeight,
    siblingBottom: 0,
    siblingBgColor: parseRgb(sibStyle.backgroundColor),
    siblingBgImage: sibStyle.backgroundImage || '',
    siblingBorderWidth: parseFloat(sibStyle.borderTopWidth) || 0,
    siblingBorderRadius: resolveBorderRadiusPx(sibling, sibStyle, sibWidth, window),
    hasIconChild: !!iconChild || hasInlineEmojiIcon,
    iconChildWidth: iconWidth,
  });
}

function checkElementItalicSerif(el, style, tag) {
  if (tag !== 'h1' && tag !== 'h2') return [];
  return checkItalicSerif({
    tag,
    fontStyle: style.fontStyle || '',
    fontFamily: style.fontFamily || '',
    fontSize: parseFloat(style.fontSize) || 0,
    headingText: el.textContent || '',
  });
}

function checkElementHeroEyebrow(el, style, tag, window, customPropMap) {
  if (tag !== 'h1') return [];
  const sibling = el.previousElementSibling;
  if (!sibling) return [];
  const sibStyle = window.getComputedStyle(sibling);
  // Resolve Tailwind v4 CSS-variable wrappers (font-weight:var(--font-weight-bold)
  // etc.) before parsing. jsdom returns these verbatim from getComputedStyle;
  // without resolution every style-based gate fails silently on Tailwind v4 builds.
  const fontSizeRaw = customPropMap ? resolveVarRefs(sibStyle.fontSize, customPropMap) : sibStyle.fontSize;
  const fontWeightRaw = customPropMap ? resolveVarRefs(sibStyle.fontWeight, customPropMap) : sibStyle.fontWeight;
  const letterSpacingRaw = customPropMap ? resolveVarRefs(sibStyle.letterSpacing, customPropMap) : sibStyle.letterSpacing;
  const colorRaw = customPropMap ? resolveVarRefs(sibStyle.color, customPropMap) : sibStyle.color;
  const headingFontSizeRaw = customPropMap ? resolveVarRefs(style.fontSize, customPropMap) : style.fontSize;
  const siblingFontSize = parseFloat(fontSizeRaw) || 0;
  // resolveLengthPx returns null for 'normal' / 'auto'; coerce to 0 so the
  // gate falls through cleanly. jsdom returns letter-spacing verbatim
  // (e.g. '0.15em'), unlike real browsers, so this conversion is required.
  return checkHeroEyebrow({
    headingTag: tag,
    headingText: el.textContent || '',
    headingFontSize: parseFloat(headingFontSizeRaw) || 0,
    siblingTag: sibling.tagName.toLowerCase(),
    siblingText: sibling.textContent || '',
    siblingTextTransform: sibStyle.textTransform || '',
    siblingFontSize,
    siblingLetterSpacing: resolveLengthPx(letterSpacingRaw, siblingFontSize) || 0,
    siblingFontWeight: fontWeightRaw || '',
    siblingColor: colorRaw || '',
  });
}

function checkRepeatedSectionKickersFromDoc(doc, win) {
  const candidates = collectRepeatedSectionKickerCandidates(
    doc,
    (el) => win.getComputedStyle(el),
    (value, fontSize) => resolveLengthPx(value, fontSize) || 0,
  );
  return checkRepeatedSectionKickers({ candidates });
}

function checkElementMotion(tag, style) {
  return checkMotion({
    tag,
    transitionProperty: style.transitionProperty || '',
    animationName: style.animationName || '',
    timingFunctions: [style.animationTimingFunction, style.transitionTimingFunction].filter(Boolean).join(' '),
    classList: '',
  });
}

function checkElementGlow(tag, style, effectiveBg) {
  if (!style.boxShadow || style.boxShadow === 'none') return [];
  return checkGlow({ tag, boxShadow: style.boxShadow, effectiveBg });
}

// ─── Section 6: Page-Level Checks ───────────────────────────────────────────

// Browser page-level checks — use document/getComputedStyle globals

function checkTypography() {
  const findings = [];

  // Walk actual text-bearing elements and tally font usage by *computed style*.
  // This is much more accurate than scanning CSS rules — it ignores rules that
  // exist in the stylesheet but apply to nothing (e.g. demo classes showing
  // anti-patterns), and counts what the user actually sees.
  const fontUsage = new Map(); // primary font name → count of elements
  let totalTextElements = 0;
  for (const el of document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, dd, blockquote, figcaption, a, button, label, span')) {
    // Skip tcher's own elements
    if (el.closest && el.closest('.tcher-overlay, .tcher-label, .tcher-banner, .tcher-tooltip')) continue;
    // Only count elements that actually have visible direct text
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasText) continue;
    const style = getComputedStyle(el);
    const ff = style.fontFamily;
    if (!ff) continue;
    const stack = ff.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase());
    const primary = stack.find(f => f && !GENERIC_FONTS.has(f));
    if (!primary) continue;
    fontUsage.set(primary, (fontUsage.get(primary) || 0) + 1);
    totalTextElements++;
  }

  if (totalTextElements >= 20) {
    // A font is "primary" if it's used by at least 15% of text elements
    const PRIMARY_THRESHOLD = 0.15;
    for (const [font, count] of fontUsage) {
      const share = count / totalTextElements;
      if (share < PRIMARY_THRESHOLD) continue;
      if (!OVERUSED_FONTS.has(font)) continue;
      if (isBrandFontOnOwnDomain(font)) continue;
      findings.push({ type: 'overused-font', detail: `Primary font: ${font} (${Math.round(share * 100)}% of text)` });
    }

    // Single-font check: only one distinct primary font across all text
    if (fontUsage.size === 1) {
      const only = [...fontUsage.keys()][0];
      findings.push({ type: 'single-font', detail: `only font used is ${only}` });
    }
  }

  const sizes = new Set();
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,td,th,label,button,div')) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs > 0 && fs < 200) sizes.add(Math.round(fs * 10) / 10);
  }
  if (sizes.size >= 3) {
    const sorted = [...sizes].sort((a, b) => a - b);
    const ratio = sorted[sorted.length - 1] / sorted[0];
    if (ratio < 2.0) {
      findings.push({ type: 'flat-type-hierarchy', detail: `Sizes: ${sorted.map(s => s + 'px').join(', ')} (ratio ${ratio.toFixed(1)}:1)` });
    }
  }

  return findings;
}

function isCardLikeDOM(el) {
  const tag = el.tagName.toLowerCase();
  if (SAFE_TAGS.has(tag) || ['input','select','textarea','img','video','canvas','picture'].includes(tag)) return false;
  const style = getComputedStyle(el);
  const cls = el.getAttribute('class') || '';
  const hasShadow = (style.boxShadow && style.boxShadow !== 'none') || /\bshadow(?:-sm|-md|-lg|-xl|-2xl)?\b/.test(cls);
  const hasBorder = /\bborder\b/.test(cls);
  const hasRadius = parseFloat(style.borderRadius) > 0 || /\brounded(?:-sm|-md|-lg|-xl|-2xl|-full)?\b/.test(cls);
  const hasBg = (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') || /\bbg-(?:white|gray-\d+|slate-\d+)\b/.test(cls);
  return isCardLikeFromProps(hasShadow, hasBorder, hasRadius, hasBg);
}

function checkLayout() {
  const findings = [];
  const flaggedEls = new Set();

  for (const el of document.querySelectorAll('*')) {
    if (!isCardLikeDOM(el) || flaggedEls.has(el)) continue;
    const cls = el.getAttribute('class') || '';
    const style = getComputedStyle(el);
    if (style.position === 'absolute' || style.position === 'fixed') continue;
    if (/\b(?:dropdown|popover|tooltip|menu|modal|dialog)\b/i.test(cls)) continue;
    if ((el.textContent?.trim().length || 0) < 10) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 30) continue;

    let parent = el.parentElement;
    while (parent) {
      if (isCardLikeDOM(parent)) { flaggedEls.add(el); break; }
      parent = parent.parentElement;
    }
  }

  for (const el of flaggedEls) {
    let isAncestor = false;
    for (const other of flaggedEls) {
      if (other !== el && el.contains(other)) { isAncestor = true; break; }
    }
    if (!isAncestor) findings.push({ type: 'nested-cards', detail: 'Card inside card', el });
  }

  return findings;
}

// Node page-level checks — take document/window as parameters

function checkPageTypography(doc, win) {
  const findings = [];

  const fonts = new Set();
  const overusedFound = new Set();

  for (const sheet of doc.styleSheets) {
    let rules;
    try { rules = sheet.cssRules || sheet.rules; } catch { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.type !== 1) continue;
      const ff = rule.style?.fontFamily;
      if (!ff) continue;
      const stack = ff.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase());
      const primary = stack.find(f => f && !GENERIC_FONTS.has(f));
      if (primary) {
        fonts.add(primary);
        if (OVERUSED_FONTS.has(primary)) overusedFound.add(primary);
      }
    }
  }

  // Check Google Fonts links in HTML
  const html = doc.documentElement?.outerHTML || '';
  const gfRe = /fonts\.googleapis\.com\/css2?\?family=([^&"'\s]+)/gi;
  let m;
  while ((m = gfRe.exec(html)) !== null) {
    const families = m[1].split('|').map(f => f.split(':')[0].replace(/\+/g, ' ').toLowerCase());
    for (const f of families) {
      fonts.add(f);
      if (OVERUSED_FONTS.has(f)) overusedFound.add(f);
    }
  }

  // Also parse raw HTML/style content for font-family (jsdom may not expose all via CSSOM)
  const ffRe = /font-family\s*:\s*([^;}]+)/gi;
  let fm;
  while ((fm = ffRe.exec(html)) !== null) {
    for (const f of fm[1].split(',').map(f => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase())) {
      if (f && !GENERIC_FONTS.has(f)) {
        fonts.add(f);
        if (OVERUSED_FONTS.has(f)) overusedFound.add(f);
      }
    }
  }

  for (const font of overusedFound) {
    findings.push({ id: 'overused-font', snippet: `Primary font: ${font}` });
  }

  // Single font
  if (fonts.size === 1) {
    const els = doc.querySelectorAll('*');
    if (els.length >= 20) {
      findings.push({ id: 'single-font', snippet: `only font used is ${[...fonts][0]}` });
    }
  }

  // Flat type hierarchy
  const sizes = new Set();
  const textEls = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button, div');
  for (const el of textEls) {
    const fontSize = parseFloat(win.getComputedStyle(el).fontSize);
    // Filter out sub-8px values (jsdom doesn't resolve relative units properly)
    if (fontSize >= 8 && fontSize < 200) sizes.add(Math.round(fontSize * 10) / 10);
  }
  if (sizes.size >= 3) {
    const sorted = [...sizes].sort((a, b) => a - b);
    const ratio = sorted[sorted.length - 1] / sorted[0];
    if (ratio < 2.0) {
      findings.push({ id: 'flat-type-hierarchy', snippet: `Sizes: ${sorted.map(s => s + 'px').join(', ')} (ratio ${ratio.toFixed(1)}:1)` });
    }
  }

  return findings;
}

function isCardLike(el, win) {
  const tag = el.tagName.toLowerCase();
  if (SAFE_TAGS.has(tag) || ['input', 'select', 'textarea', 'img', 'video', 'canvas', 'picture'].includes(tag)) return false;

  const style = win.getComputedStyle(el);
  const rawStyle = el.getAttribute?.('style') || '';
  const cls = el.getAttribute?.('class') || '';

  const hasShadow = (style.boxShadow && style.boxShadow !== 'none') ||
    /\bshadow(?:-sm|-md|-lg|-xl|-2xl)?\b/.test(cls) || /box-shadow/i.test(rawStyle);
  const hasBorder = /\bborder\b/.test(cls);
  const widthPx = parseFloat(style.width) || 0;
  const hasRadius = resolveBorderRadiusPx(el, style, widthPx, win) > 0 ||
    /\brounded(?:-sm|-md|-lg|-xl|-2xl|-full)?\b/.test(cls) || /border-radius/i.test(rawStyle);
  const hasBg = /\bbg-(?:white|gray-\d+|slate-\d+)\b/.test(cls) ||
    /background(?:-color)?\s*:\s*(?!transparent)/i.test(rawStyle);

  return isCardLikeFromProps(hasShadow, hasBorder, hasRadius, hasBg);
}

function checkPageLayout(doc, win) {
  const findings = [];

  // Nested cards
  const allEls = doc.querySelectorAll('*');
  const flaggedEls = new Set();
  for (const el of allEls) {
    if (!isCardLike(el, win)) continue;
    if (flaggedEls.has(el)) continue;

    const tag = el.tagName.toLowerCase();
    const cls = el.getAttribute?.('class') || '';
    const rawStyle = el.getAttribute?.('style') || '';

    if (['pre', 'code'].includes(tag)) continue;
    if (/\b(?:absolute|fixed)\b/.test(cls) || /position\s*:\s*(?:absolute|fixed)/i.test(rawStyle)) continue;
    if ((el.textContent?.trim().length || 0) < 10) continue;
    if (/\b(?:dropdown|popover|tooltip|menu|modal|dialog)\b/i.test(cls)) continue;

    // Walk up to find card-like ancestor
    let parent = el.parentElement;
    while (parent) {
      if (isCardLike(parent, win)) {
        flaggedEls.add(el);
        break;
      }
      parent = parent.parentElement;
    }
  }

  // Only report innermost nested cards
  for (const el of flaggedEls) {
    let isAncestorOfFlagged = false;
    for (const other of flaggedEls) {
      if (other !== el && el.contains(other)) {
        isAncestorOfFlagged = true;
        break;
      }
    }
    if (!isAncestorOfFlagged) {
      findings.push({ id: 'nested-cards', snippet: `Card inside card (${el.tagName.toLowerCase()})` });
    }
  }

  return findings;
}

// ─── Cream / beige palette (the default "tasteful" AI surface) ────────────────
// A warm, lightly-tinted off-white page background — light, with R≥G≥B and a
// small warm tint (not white, not a strong color). The current reflex surface.
function isCreamColor(rgb) {
  if (!rgb) return false;
  const { r, g, b } = rgb;
  if (Math.min(r, g, b) < 209) return false;   // must be light
  if (!(r >= g && g >= b)) return false;        // warm ordering
  const warmth = r - b;
  return warmth >= 6 && warmth <= 48;           // tinted, not white, not strong
}

// Tailwind background utilities that render as a warm off-white surface. The
// static engine doesn't fetch Tailwind's CSS, so a `bg-amber-50` on <body>
// resolves to nothing in computed style — catch it from the class list
// instead. Candidate tokens map to their actual Tailwind hex and are still
// filtered through isCreamColor, so neutral grays (stone) and over-saturated
// shades drop out on their own.
const TAILWIND_BG_HEX = {
  'bg-amber-50': '#fffbeb', 'bg-amber-100': '#fef3c7',
  'bg-orange-50': '#fff7ed', 'bg-orange-100': '#ffedd5',
  'bg-yellow-50': '#fefce8',
  'bg-stone-50': '#fafaf9', 'bg-stone-100': '#f5f5f4', 'bg-stone-200': '#e7e5e4',
};

function creamFromClassList(cls) {
  if (!cls) return null;
  // Arbitrary value: bg-[#f5f0e6] / bg-[rgb(245_240_230)] (underscores = spaces).
  const arb = cls.match(/\bbg-\[([^\]]+)\]/);
  if (arb && isCreamColor(parseAnyColor(arb[1].replace(/_/g, ' ')))) return `bg-[${arb[1]}]`;
  // Named warm-light utilities.
  for (const [tok, hex] of Object.entries(TAILWIND_BG_HEX)) {
    if (new RegExp(`(^|\\s)${tok}($|\\s)`).test(cls) && isCreamColor(parseAnyColor(hex))) return tok;
  }
  return null;
}

function checkCreamPalette(doc, win) {
  const findings = [];
  const body = doc.body || (doc.querySelector ? doc.querySelector('body') : null);
  if (!body) return findings;
  const html = doc.documentElement;
  const getCS = (el) => (win ? win.getComputedStyle(el) : getComputedStyle(el));

  // 1. Computed background — covers inline / <style> / linked CSS, and Tailwind
  //    once it's actually rendered (browser path).
  let bg = readOwnBackgroundColor(body, getCS(body));
  if (!bg || bg.a === 0) {
    if (html) bg = readOwnBackgroundColor(html, getCS(html));
  }
  if (isCreamColor(bg)) {
    findings.push({ id: 'cream-palette', snippet: `cream/beige page background rgb(${bg.r}, ${bg.g}, ${bg.b})` });
    return findings;
  }

  // 2. Tailwind class fallback — for the static path, where utility classes
  //    never resolve to computed CSS.
  for (const el of [body, html]) {
    const tok = creamFromClassList(el && el.getAttribute ? el.getAttribute('class') : '');
    if (tok) {
      findings.push({ id: 'cream-palette', snippet: `cream/beige page background (Tailwind ${tok})` });
      break;
    }
  }
  return findings;
}

// ─── Oversized hero headline ────────────────────────────────────────────────
// Fires when a *long* headline is set at display size, so a full sentence ends
// up dominating the viewport. A punchy one- or two-word headline at the same
// size is a legitimate stylistic choice and must pass — length, not size
// alone, is the tell.
const OVERSIZED_H1_FONT_PX = 72;
const OVERSIZED_H1_MIN_CHARS = 40;
function checkOversizedH1({ tag, fontSize, headingText }) {
  if (tag !== 'h1') return [];
  const textLen = headingText.length;
  if (fontSize >= OVERSIZED_H1_FONT_PX && textLen >= OVERSIZED_H1_MIN_CHARS) {
    return [{ id: 'oversized-h1', snippet: `${Math.round(fontSize)}px h1, ${textLen} chars "${headingText.slice(0, 60)}"` }];
  }
  return [];
}

function checkElementOversizedH1(el, style, tag, window) {
  if (tag !== 'h1') return [];
  const fontSize = resolveFontSizePx(el, window);
  const headingText = (el.textContent || '').trim().replace(/\s+/g, ' ');
  return checkOversizedH1({ tag, fontSize, headingText });
}

function checkElementOversizedH1DOM(el) {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'h1') return [];
  const style = getComputedStyle(el);
  const fontSize = parseFloat(style.fontSize) || 0;
  const headingText = (el.textContent || '').trim().replace(/\s+/g, ' ');
  return checkOversizedH1({ tag, fontSize, headingText });
}

// ─── GPT tell: hairline border + wide diffuse shadow (gated --gpt) ────────────
function shadowMaxBlurPx(boxShadow) {
  if (!boxShadow || boxShadow === 'none') return 0;
  let maxBlur = 0;
  // Split into layers on commas not inside parentheses (rgba(...) etc.).
  for (const layer of boxShadow.split(/,(?![^()]*\))/)) {
    // Strip colors and keywords (rgba()/hsl()/hex/named/inset/px), leaving the
    // ordered length tokens: offsetX offsetY blur [spread]. Static jsdom keeps
    // unitless zeros ("0 0 24px"); browsers normalize to px ("0px 0px 24px") —
    // both reduce to the same numbers here.
    const cleaned = layer.replace(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]+|\b[a-z]+\b/gi, ' ');
    const nums = [...cleaned.matchAll(/-?\d*\.?\d+/g)].map(m => parseFloat(m[0]));
    if (nums.length >= 3) maxBlur = Math.max(maxBlur, nums[2]);
  }
  return maxBlur;
}

function checkGptThinBorderWideShadow({ borderWidths, boxShadow }) {
  const maxBorder = Math.max(0, ...borderWidths);
  const hasThinBorder = maxBorder > 0 && maxBorder <= 1.5;
  const blur = shadowMaxBlurPx(boxShadow);
  if (hasThinBorder && blur >= 16) {
    return [{ id: 'gpt-thin-border-wide-shadow', snippet: `${maxBorder}px border + ${Math.round(blur)}px shadow blur` }];
  }
  return [];
}

function borderWidthsFromStyle(style) {
  return [
    parseFloat(style.borderTopWidth) || 0,
    parseFloat(style.borderRightWidth) || 0,
    parseFloat(style.borderBottomWidth) || 0,
    parseFloat(style.borderLeftWidth) || 0,
  ];
}

function checkElementGptBorderShadow(el, style) {
  return checkGptThinBorderWideShadow({ borderWidths: borderWidthsFromStyle(style), boxShadow: style.boxShadow || '' });
}

function checkElementGptBorderShadowDOM(el) {
  const style = getComputedStyle(el);
  return checkGptThinBorderWideShadow({ borderWidths: borderWidthsFromStyle(style), boxShadow: style.boxShadow || '' });
}

// ─── Clipped overflow container ───────────────────────────────────────────────
// A clipping container (overflow hidden/clip, not a scroll region) wrapping an
// absolutely/fixed-positioned descendant clips popovers/menus that must escape.
function classSelector(el) {
  const cls = (el.getAttribute ? el.getAttribute('class') : el.className) || '';
  const tokens = String(cls).trim().split(/\s+/).filter(Boolean);
  const tag = el.tagName ? el.tagName.toLowerCase() : 'el';
  return tokens.length ? `${tag}.${tokens.join('.')}` : tag;
}

function checkClippedOverflow(el, style, getStyle) {
  const clips = (v) => v === 'hidden' || v === 'clip';
  const scrolls = (v) => v === 'auto' || v === 'scroll';
  const ox = style.overflowX || '', oy = style.overflowY || '', ov = style.overflow || '';
  const anyClip = clips(ox) || clips(oy) || clips(ov);
  const anyScroll = scrolls(ox) || scrolls(oy) || scrolls(ov);
  if (!anyClip || anyScroll) return [];
  if (!el.querySelectorAll) return [];
  for (const child of el.querySelectorAll('*')) {
    const pos = (getStyle(child).position) || '';
    if (pos === 'absolute' || pos === 'fixed') {
      return [{ id: 'clipped-overflow-container', snippet: `${classSelector(el)} clips a positioned child` }];
    }
  }
  return [];
}

function checkElementClippedOverflow(el, style, tag, window) {
  return checkClippedOverflow(el, style, (n) => window.getComputedStyle(n));
}

function checkElementClippedOverflowDOM(el) {
  const style = getComputedStyle(el);
  return checkClippedOverflow(el, style, (n) => getComputedStyle(n));
}

// ─── Text overflow (browser-only: needs scrollWidth/clientWidth) ──────────────
const TEXT_OVERFLOW_SKIP_TAGS = new Set(['pre', 'code', 'textarea', 'svg', 'canvas', 'select', 'option', 'marquee']);

function metricLengthPx(value, fontSizePx = 16) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  return resolveLengthPx(value, fontSizePx);
}

function firstMetricLengthPx(fontSizePx, ...values) {
  for (const value of values) {
    const parsed = metricLengthPx(value, fontSizePx);
    if (parsed !== null) return parsed;
  }
  return null;
}

function expandBoxShorthand(parts) {
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

function clippedByInset(clipPath) {
  const match = String(clipPath || '').trim().toLowerCase().match(/^inset\s*\(([^)]*)\)$/);
  if (!match) return false;
  const beforeRound = match[1].split(/\s+round\s+/)[0].trim();
  if (!beforeRound) return false;
  const values = expandBoxShorthand(beforeRound.split(/\s+/).slice(0, 4));
  const percents = values.map(value => String(value).trim().match(/^(-?\d+(?:\.\d+)?)%$/));
  if (percents.some(match => !match)) return false;
  const [top, right, bottom, left] = percents.map(match => parseFloat(match[1]));
  return top + bottom >= 100 || left + right >= 100;
}

function clippedByRect(clip) {
  const match = String(clip || '').trim().toLowerCase().match(/^rect\s*\(([^)]*)\)$/);
  if (!match) return false;
  const values = match[1].split(/[,\s]+/).map(value => value.trim()).filter(Boolean);
  if (values.length !== 4) return false;
  const [top, right, bottom, left] = values.map(value => metricLengthPx(value, 16));
  if ([top, right, bottom, left].some(value => value === null)) return false;
  return bottom <= top || right <= left;
}

function isScreenReaderOnlyTextStyle(style, metrics = {}) {
  if (!style) return false;
  const overflowValues = [style.overflow, style.overflowX, style.overflowY]
    .map(value => String(value || '').toLowerCase());
  const clipsOverflow = overflowValues.some(value => value === 'hidden' || value === 'clip');

  const fontSize = metricLengthPx(style.fontSize, 16) || 16;
  const width = firstMetricLengthPx(fontSize, metrics.width, metrics.clientWidth, style.width, style.inlineSize);
  const height = firstMetricLengthPx(fontSize, metrics.height, metrics.clientHeight, style.height, style.blockSize);
  const isTiny = width !== null && height !== null && width <= 2 && height <= 2;
  const isAbsolutelyHidden = String(style.position || '').toLowerCase() === 'absolute' && isTiny && clipsOverflow;

  const clipPath = String(style.clipPath || style.webkitClipPath || '').trim();
  const clip = String(style.clip || '').trim();
  return isAbsolutelyHidden || clippedByInset(clipPath) || clippedByRect(clip);
}

function checkElementTextOverflowDOM(el) {
  const tag = el.tagName.toLowerCase();
  if (TEXT_OVERFLOW_SKIP_TAGS.has(tag)) return [];
  // Only the element that actually owns overflowing text — not its ancestors,
  // which inherit a wider scrollWidth from the spilling descendant.
  const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
  if (!hasDirectText) return [];
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  if (isScreenReaderOnlyTextStyle(style, {
    width: rect?.width,
    height: rect?.height,
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
  })) return [];
  const isScrollRegion = (s) => /(auto|scroll)/.test(s.overflowX || '') || /(auto|scroll)/.test(s.overflow || '');
  if (isScrollRegion(style)) return [];
  // A scrollable ancestor means this overflow is intentional and scrollable.
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (isScrollRegion(getComputedStyle(p))) return [];
  }
  const delta = el.scrollWidth - el.clientWidth;
  if (el.clientWidth > 0 && delta >= 16) {
    return [{ id: 'text-overflow', snippet: `${classSelector(el)} overflows its box by ${Math.round(delta)}px` }];
  }
  return [];
}

// ─── Emoji as UI ornament ────────────────────────────────────────────────
// ©/®/™ count as Extended_Pictographic but are not the tell we mean.
const EMOJI_UI_RE = /(?![©®™])\p{Extended_Pictographic}/u;
const EMOJI_UI_HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const EMOJI_UI_CTA_TAGS = new Set(['button', 'a', 'summary']);
const EMOJI_UI_ICON_TAGS = new Set(['span', 'div', 'i', 'em', 'strong', 'b']);

function checkEmojiUiElement(opts) {
  const { tag, text, hasElementChildren = false, inProse = false } = opts;
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean || !EMOJI_UI_RE.test(clean)) return [];
  if (EMOJI_UI_HEADINGS.has(tag)) {
    return [{ id: 'emoji-in-ui', snippet: `${tag} "${clean.slice(0, 50)}" uses emoji as UI ornament` }];
  }
  if (EMOJI_UI_CTA_TAGS.has(tag)) {
    // Short link/button text reads as a UI control; emoji inside running
    // prose or long descriptive link text is conversational, not chrome.
    if (inProse || clean.length > 60) return [];
    return [{ id: 'emoji-in-ui', snippet: `${tag} "${clean.slice(0, 50)}" uses emoji as UI ornament` }];
  }
  if (EMOJI_UI_ICON_TAGS.has(tag)) {
    if (inProse || hasElementChildren) return [];
    if (clean.length > 8 || !isEmojiOnlyText(clean)) return [];
    return [{ id: 'emoji-in-ui', snippet: `${tag} "${clean.slice(0, 50)}" used as an emoji icon` }];
  }
  return [];
}

function checkEmojiBullets(opts) {
  const { items, minCount = 3 } = opts;
  if (!Array.isArray(items)) return [];
  const leads = items
    .map(t => (t || '').replace(/\s+/g, ' ').trim())
    .filter(t => t && EMOJI_UI_RE.test(t.slice(0, 4)));
  if (leads.length < minCount) return [];
  return [{ id: 'emoji-in-ui', snippet: `${leads.length} list items use emoji bullets ("${leads[0].slice(0, 40)}")` }];
}

function emojiUiHasProseAncestor(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const t = (p.tagName || '').toLowerCase();
    if (t === 'p' || t === 'blockquote' || t === 'figcaption') return true;
    if (t === 'body' || t === 'html') break;
  }
  return false;
}

// Shared adapter: both the static (jsdom-style) and browser engines expose
// textContent/parentElement, so one element adapter serves both loops.
// `children` differs (htmlparser2 includes text nodes), hence the type check.
function checkElementEmojiUi(el, tag) {
  if (!EMOJI_UI_HEADINGS.has(tag) && !EMOJI_UI_CTA_TAGS.has(tag) && !EMOJI_UI_ICON_TAGS.has(tag)) return [];
  const hasElementChildren = [...(el.children || [])]
    .some(c => c.nodeType === 1 || c.type === 'tag');
  return checkEmojiUiElement({
    tag,
    text: el.textContent || '',
    hasElementChildren,
    inProse: emojiUiHasProseAncestor(el),
  });
}

function checkEmojiBulletsFromDoc(doc) {
  const findings = [];
  for (const list of doc.querySelectorAll('ul, ol')) {
    if (list.closest?.('.tcher-overlay, .tcher-banner, [id^="tcher-live-"]')) continue;
    const items = [...list.children]
      .filter(c => (c.tagName || '').toLowerCase() === 'li')
      .map(li => li.textContent || '');
    // Carry the list element so the browser overlay can outline the actual
    // <ul> (the static engine ignores `el` and just reads id/snippet).
    findings.push(...checkEmojiBullets({ items }).map(f => ({ ...f, el: list })));
  }
  return findings;
}

// ─── Browser-only additions ──────────────────────────────────────────────

// Broken image: only a real browser knows whether the fetch failed, so this
// check is browser-only (the static engine can only flag missing/empty src).
function checkElementBrokenImageDOM(el) {
  if (el.tagName !== 'IMG') return [];
  const src = (el.getAttribute('src') || '').trim();
  if (!src || src === '#') return [{ id: 'broken-image', snippet: '<img> with empty src' }];
  if (el.complete && el.naturalWidth === 0) {
    return [{ id: 'broken-image', snippet: `<img src="${src.slice(0, 60)}"> failed to load` }];
  }
  return [];
}

// Rendered page text, skipping tcher's own overlay chrome (labels and the
// banner quote finding text, which would otherwise feed back into rescans).
function collectPageTextDOM() {
  const SKIP = '.tcher-overlay, .tcher-label, .tcher-banner, .tcher-tooltip, [id^="tcher-live-"]';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let text = '';
  while (walker.nextNode()) text += walker.currentNode.nodeValue + ' ';
  return text.replace(/\s+/g, ' ');
}

// Mirrors the regex engine's em-dash + buzzword passes (see
// engines/regex/detect-text.mjs) over the rendered page, so the live overlay
// surfaces them too. Keep thresholds + the phrase list in sync by hand.
const PAGE_TEXT_BUZZWORDS = [
  'streamline your', 'empower your', 'supercharge your',
  'unleash your', 'unleash the power', 'leverage the power',
  'built for the modern', 'trusted by leading', 'trusted by the world',
  'best-in-class', 'industry-leading', 'world-class', 'enterprise-grade',
  'next-generation', 'cutting-edge', 'transform your business',
  'revolutionize', 'game-changer', 'game changing',
  'mission-critical', 'best of breed', 'future-proof', 'future proof',
  'seamless experience', 'seamlessly integrate',
  'drive engagement', 'drive growth', 'drive results',
  'harness the power',
];

function checkPageTextDOM() {
  const findings = [];
  const text = collectPageTextDOM();
  let dashCount = 0;
  const dashRe = /[—]|--(?=\S)/g;
  while (dashRe.exec(text) !== null) dashCount++;
  if (dashCount >= 5) {
    findings.push({ id: 'em-dash-overuse', snippet: `${dashCount} em-dashes in body text` });
  }
  const lower = text.toLowerCase();
  let buzzCount = 0;
  let firstSample = '';
  for (const phrase of PAGE_TEXT_BUZZWORDS) {
    let from = 0;
    while (true) {
      const idx = lower.indexOf(phrase, from);
      if (idx === -1) break;
      buzzCount += 1;
      if (!firstSample) {
        firstSample = text.slice(Math.max(0, idx - 12), Math.min(text.length, idx + phrase.length + 12)).trim();
      }
      from = idx + phrase.length;
    }
  }
  if (buzzCount > 0) {
    findings.push({ id: 'marketing-buzzword', snippet: `${buzzCount} buzzword phrase${buzzCount === 1 ? '' : 's'}: "${firstSample}"` });
  }
  return findings;
}

// ─── UX rules (category: 'ux') ───────────────────────────────────────────
// Deterministic usability checks; several operationalize a Laws of UX
// principle (the registry's `law` field). Pure functions first, then the
// shared doc/element adapters both engines call.

// Fitts's Law: minimum acquirable size. Inline links in prose are exempt
// (the line box constrains the target, mirroring WCAG 2.5.8's exception).
function checkTapTargetSize(opts) {
  const { width, height, selector = '', hidden = false, inlineProse = false } = opts;
  if (hidden || inlineProse) return [];
  if (!(width > 0) || !(height > 0)) return []; // unmeasurable → stay quiet
  if (width >= 24 && height >= 24) return [];
  return [{
    id: 'tap-target-too-small',
    snippet: `"${selector}" tap target is ${Math.round(width)}×${Math.round(height)}px (24×24 minimum, 44×44 comfortable)`,
  }];
}

function checkInputLabel(opts) {
  const {
    tag, type = '', hasLabel = false, ariaLabel = '', ariaLabelledby = '',
    title = '', ident = '',
  } = opts;
  const t = (type || '').toLowerCase();
  if (tag === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(t)) return [];
  if (hasLabel || ariaLabel.trim() || ariaLabelledby.trim() || title.trim()) return [];
  return [{
    id: 'input-without-label',
    snippet: `${tag}${t ? `[type=${t}]` : ''} "${(ident || '(unnamed)').slice(0, 40)}" has no associated label (a placeholder is not a label)`,
  }];
}

function checkIconButtonName(opts) {
  const {
    tag, text = '', ariaLabel = '', ariaLabelledby = '', title = '',
    imgAlt = '', hasIconChild = false, selector = '',
  } = opts;
  if (!hasIconChild) return [];
  if ((text || '').trim()) return [];
  if (ariaLabel.trim() || ariaLabelledby.trim() || title.trim() || imgAlt.trim()) return [];
  return [{
    id: 'icon-button-no-name',
    snippet: `icon-only ${tag} "${selector}" has no accessible name`,
  }];
}

function checkImgAlt(opts) {
  const { hasAlt, role = '', ariaHidden = '', src = '' } = opts;
  if (hasAlt) return []; // alt present (even alt="") is an explicit decision
  if (role === 'presentation' || role === 'none' || ariaHidden === 'true') return [];
  const name = (String(src).split('/').pop() || String(src)).slice(0, 50);
  return [{ id: 'missing-alt', snippet: `<img src="${name}"> has no alt attribute` }];
}

// Page-level pass over raw CSS text. Walks rule blocks; tolerant of nesting
// (an @media prefix just rides along in the selector string).
function checkFocusOutlineCss(cssText) {
  const findings = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(cssText || '')) !== null) {
    // Strip comments riding along before the selector, then normalize.
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    const body = m[2];
    if (!/:focus(-visible|-within)?\b/.test(selector)) continue;
    if (!/outline\s*:\s*(none|0)(\s*;|\s|$)/.test(body)) continue;
    // A replacement cue in the same block keeps focus visible.
    if (/box-shadow\s*:|\bborder(-bottom|-top|-color|-width)?\s*:|outline\s*:\s*[^n0\s]/.test(body)) continue;
    findings.push({
      id: 'focus-outline-removed',
      snippet: `"${selector.slice(0, 60)}" sets outline: none with no replacement cue`,
    });
  }
  return findings;
}

// Law of Similarity: links must look different from the prose around them.
function checkLinkAffordance(opts) {
  const { inProse, decorationNone, sameColor, hasCue, text = '' } = opts;
  if (!inProse || !decorationNone || !sameColor || hasCue) return [];
  return [{
    id: 'link-no-affordance',
    snippet: `link "${(text || '').trim().slice(0, 40)}" is indistinguishable from the text around it`,
  }];
}

// Hick's Law: top-level choices grow decision time. Footer sitemaps exempt.
function checkNavChoices(opts) {
  const { count, label = '', inFooter = false } = opts;
  if (inFooter || count <= 8) return [];
  return [{ id: 'choice-overload-nav', snippet: `nav "${label}" offers ${count} top-level choices` }];
}

const SELECT_CANONICAL_RE = /(countr|year|month|day|date|state|province|region|timezone|time-zone|currency|locale|language)/i;

// Choice Overload: long flat dropdowns force linear scanning.
function checkSelectChoices(opts) {
  const { optionCount, hasOptgroups = false, label = '', exempt = false } = opts;
  if (exempt || hasOptgroups || optionCount <= 25) return [];
  return [{ id: 'select-overload', snippet: `select "${label}" lists ${optionCount} flat options` }];
}

// Jakob's Law: the logo links home everywhere else, so it must here too.
function checkLogoHomeLink(opts) {
  const { ident = '', linked, sizePx = 0 } = opts;
  if (linked || sizePx < 24) return [];
  return [{ id: 'logo-not-home-link', snippet: `header logo "${ident}" is not a link to home` }];
}

const AUTOCOMPLETE_FIELD_RE = /(^|[\s_-])(email|e-mail|phone|tel|mobile|name|address|street|city|postal|zip)([\s_-]|$)/;

// Postel's Law: the browser already knows these values; accept its help.
function checkAutocomplete(opts) {
  const { type = '', name = '', id = '', ariaLabel = '', hasAutocomplete, inForm } = opts;
  if (!inForm || hasAutocomplete) return [];
  const t = (type || '').toLowerCase();
  const hay = `${name} ${id} ${ariaLabel}`.toLowerCase();
  const wants = t === 'email' || t === 'tel'
    || ((t === '' || t === 'text') && AUTOCOMPLETE_FIELD_RE.test(hay));
  if (!wants) return [];
  const ident = name || id || ariaLabel || t;
  return [{ id: 'autocomplete-missing', snippet: `input "${ident}" could autofill but has no autocomplete attribute` }];
}

// Miller's Law: chunk long forms; ~7 fields is where scanning breaks down.
function checkFormFieldChunking(opts) {
  const { textFieldCount, hasFieldsets = false, hasHeadings = false, label = '' } = opts;
  if (hasFieldsets || hasHeadings || textFieldCount <= 7) return [];
  return [{ id: 'form-field-overload', snippet: `form "${label}" packs ${textFieldCount} fields with no grouping` }];
}

// ─── UX: browser-only pure checks (need real layout / load data) ─────────

// Fitts's Law / WCAG 2.5.8 with the spacing alternative: a sub-24px target
// is fine when every other target's center sits at least 24px away (text
// links in a roomy nav pass); it only flags when small AND crowded. The
// static engine keeps the simpler explicit-dimensions check instead — it
// has no layout, so it cannot know the neighbors.
function checkTapTargetSpacing(targets) {
  const findings = [];
  const list = targets || [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (!(t.width > 0) || !(t.height > 0)) continue;
    if (t.width >= 24 && t.height >= 24) continue;
    if (t.inlineProse) continue;
    const cx = t.left + t.width / 2;
    const cy = t.top + t.height / 2;
    let crowded = false;
    for (let j = 0; j < list.length; j++) {
      if (j === i) continue;
      const o = list[j];
      if (Math.hypot(cx - (o.left + o.width / 2), cy - (o.top + o.height / 2)) < 24) {
        crowded = true;
        break;
      }
    }
    if (!crowded) continue;
    findings.push({
      id: 'tap-target-too-small',
      snippet: `"${t.selector || t.label || 'control'}" tap target is ${Math.round(t.width)}×${Math.round(t.height)}px with a neighbor inside 24px (24×24 minimum, 44×44 comfortable)`,
      el: t.el,
    });
  }
  return findings;
}

// Fitts's Law, crowding half: clusters of small targets packed together.
// Takes measured rects so the math is unit-testable without a DOM.
function checkTapTargetsCrowded(targets, opts = {}) {
  const { minGap = 8, smallMax = 44 } = opts;
  const small = (targets || []).filter(t => t.width > 0 && t.height > 0 && t.width < smallMax && t.height < smallMax);
  const n = small.length;
  if (n < 2) return [];
  const parent = [...Array(n).keys()];
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const dist = (a, b) => {
    const dx = Math.max(a.left - (b.left + b.width), b.left - (a.left + a.width), 0);
    const dy = Math.max(a.top - (b.top + b.height), b.top - (a.top + a.height), 0);
    return Math.hypot(dx, dy);
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist(small[i], small[j]) < minGap) parent[find(i)] = find(j);
    }
  }
  const clusters = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(small[i]);
  }
  const findings = [];
  for (const group of clusters.values()) {
    if (group.length < 2) continue;
    findings.push({
      id: 'tap-targets-crowded',
      snippet: `${group.length} small targets ("${group[0].label || group[0].selector || 'control'}", …) packed closer than ${minGap}px apart`,
      el: group[0].el,
    });
  }
  return findings;
}

// Doherty Threshold: serving multi-thousand-pixel naturals into small slots
// delays first feedback for no visual gain. dpr-aware.
function checkOversizedImage(opts) {
  const { naturalWidth = 0, naturalHeight = 0, displayWidth = 0, displayHeight = 0, src = '', dpr = 1 } = opts;
  if (!(displayWidth > 0) || !(naturalWidth > 0)) return [];
  if (naturalWidth < 1200) return []; // below the floor the payload barely matters
  const budget = displayWidth * Math.max(1, dpr) * 2.5;
  if (naturalWidth <= budget) return [];
  const name = (String(src).split('/').pop() || String(src)).split('?')[0].slice(0, 50);
  return [{
    id: 'oversized-image-payload',
    snippet: `"${name}" ships ${naturalWidth}×${naturalHeight} natural pixels into a ${Math.round(displayWidth)}×${Math.round(displayHeight)} slot`,
  }];
}

// ─── UX: shared doc/element adapters ─────────────────────────────────────
// Both engines expose tagName/getAttribute/parentElement/querySelectorAll,
// so these adapters serve the static loop and the browser loop alike.

const UX_SKIP_SELECTOR = '.tcher-overlay, .tcher-label, .tcher-banner, .tcher-banner-panel, .tcher-tooltip, [id^="tcher-live-"]';

function uxAttr(el, attr) {
  const v = el.getAttribute ? el.getAttribute(attr) : el.attribs?.[attr];
  return v === undefined ? null : v;
}

function uxClassSelector(el) {
  const tag = (el.tagName || '').toLowerCase();
  const cls = String(uxAttr(el, 'class') || '').trim().split(/\s+/).filter(Boolean);
  return cls.length ? `${tag}.${cls[0]}` : tag;
}

function uxAncestor(el, match) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const t = (p.tagName || '').toLowerCase();
    if (match(t, p)) return p;
    if (t === 'body' || t === 'html') break;
  }
  return null;
}

function uxInTcherChrome(el) {
  return Boolean(el.closest?.(UX_SKIP_SELECTOR));
}

function checkElementMissingAlt(el, tag) {
  if (tag !== 'img') return [];
  const alt = uxAttr(el, 'alt');
  return checkImgAlt({
    hasAlt: alt !== null,
    role: uxAttr(el, 'role') || '',
    ariaHidden: uxAttr(el, 'aria-hidden') || '',
    src: uxAttr(el, 'src') || '',
  });
}

function checkElementIconButtonName(el, tag) {
  if (tag !== 'button' && !(tag === 'a' && uxAttr(el, 'href') !== null)) return [];
  if (uxInTcherChrome(el)) return [];
  const text = (el.textContent || '').trim();
  const svgOrImg = el.querySelectorAll ? el.querySelectorAll('svg, img') : [];
  const hasElementChildren = [...(el.children || [])].some(c => c.nodeType === 1 || c.type === 'tag');
  let imgAlt = '';
  for (const child of svgOrImg) {
    imgAlt = imgAlt || (uxAttr(child, 'alt') || '').trim() || (uxAttr(child, 'aria-label') || '').trim();
  }
  return checkIconButtonName({
    tag,
    text,
    ariaLabel: uxAttr(el, 'aria-label') || '',
    ariaLabelledby: uxAttr(el, 'aria-labelledby') || '',
    title: uxAttr(el, 'title') || '',
    imgAlt,
    hasIconChild: svgOrImg.length > 0 || (hasElementChildren && !text),
    selector: uxClassSelector(el),
  });
}

// Static engine variant: jsdom does no layout, so only explicit CSS
// dimensions are measurable. The browser variant reads real rects.
function checkElementTapTargetStatic(el, tag, style) {
  if (tag === 'a' && uxAttr(el, 'href') === null) return [];
  if ((style.display || '') === 'none' || (style.visibility || '') === 'hidden') return [];
  const inlineProse = Boolean(uxAncestor(el, t => t === 'p' || t === 'li' || t === 'blockquote' || t === 'figcaption' || t === 'td'));
  return checkTapTargetSize({
    width: parseFloat(style.width) || 0,
    height: parseFloat(style.height) || 0,
    selector: uxClassSelector(el),
    inlineProse,
  });
}

// Browser tap-target sizing goes through checkTapTargetSpacing (page pass
// over collected rects) rather than a per-element check: the WCAG spacing
// alternative needs every neighbor's position to decide.
function uxCollectTargetRect(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'a' && uxAttr(el, 'href') === null) return null;
  if (uxInTcherChrome(el)) return null;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const inlineProse = style.display.startsWith('inline')
    && Boolean(uxAncestor(el, t => t === 'p' || t === 'li' || t === 'blockquote' || t === 'figcaption' || t === 'td'));
  return {
    left: rect.left, top: rect.top, width: rect.width, height: rect.height,
    selector: uxClassSelector(el), label: uxClassSelector(el), inlineProse, el,
  };
}

// Link affordance needs resolved colors; each engine resolves, this shapes.
function linkAffordanceFromResolved(el, linkStyle, parentColorResolved) {
  const decoration = `${linkStyle.textDecorationLine || ''} ${linkStyle.textDecoration || ''}`;
  if (!/\bnone\b/.test(decoration)) return [];
  if (/underline|overline/.test(decoration)) return [];
  const linkColor = parseAnyColor(linkStyle.color || '');
  const parentColor = parentColorResolved;
  let sameColor;
  if (!linkStyle.color || linkStyle.color === 'inherit') {
    sameColor = true;
  } else if (linkColor && parentColor) {
    sameColor = Math.abs(linkColor.r - parentColor.r) <= 8
      && Math.abs(linkColor.g - parentColor.g) <= 8
      && Math.abs(linkColor.b - parentColor.b) <= 8;
  } else {
    sameColor = false;
  }
  const weight = parseInt(linkStyle.fontWeight, 10) || 400;
  const hasCue = (parseFloat(linkStyle.borderBottomWidth) || 0) > 0
    || weight >= 600
    || Boolean(linkStyle.backgroundColor && !/transparent|rgba\(0,\s*0,\s*0,\s*0\)/.test(linkStyle.backgroundColor));
  const prose = uxAncestor(el, t => t === 'p' || t === 'li' || t === 'td' || t === 'blockquote');
  const inProse = Boolean(prose)
    && (prose.textContent || '').trim().length > (el.textContent || '').trim().length + 10;
  return checkLinkAffordance({
    inProse,
    decorationNone: true,
    sameColor,
    hasCue,
    text: el.textContent || '',
  });
}

function checkElementLinkAffordance(el, tag, style, window) {
  if (tag !== 'a' || uxAttr(el, 'href') === null) return [];
  if (uxInTcherChrome(el)) return [];
  if (uxAncestor(el, t => t === 'nav')) return [];
  // Resolve nearest explicit ancestor color for the comparison.
  let parentColor = null;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const c = (window ? window.getComputedStyle(p) : getComputedStyle(p)).color;
    if (c && c !== 'inherit') { parentColor = parseAnyColor(c); break; }
    if ((p.tagName || '').toLowerCase() === 'html') break;
  }
  return linkAffordanceFromResolved(el, style, parentColor);
}

// Doc-level UX pass shared by both engines: viewport meta, nav choice
// counts, select overload, header logo link, form chunking, autocomplete,
// and input labelling. Findings carry `el` so the overlay can outline the
// concrete element (the static engine just reads id/snippet). `getStyle`
// resolves computed style per engine (static window vs real browser).
function checkUxPageFromDoc(doc, getStyle) {
  const findings = [];
  const push = (f, el) => { if (f.length) findings.push(...f.map(x => ({ ...x, el }))); };

  // no-viewport-meta
  if (!doc.querySelector('meta[name="viewport"]')) {
    findings.push({ id: 'no-viewport-meta', snippet: 'missing "viewport" meta tag; mobile browsers will render desktop-width' });
  }

  // choice-overload-nav
  for (const nav of doc.querySelectorAll('nav')) {
    if (nav.closest?.(UX_SKIP_SELECTOR)) continue;
    const links = nav.querySelectorAll('a[href]');
    const label = uxAttr(nav, 'aria-label') || (links[0] ? (links[0].textContent || '').trim() : 'navigation');
    push(checkNavChoices({
      count: links.length,
      label,
      inFooter: Boolean(uxAncestor(nav, t => t === 'footer')),
    }), nav);
  }

  // select-overload
  for (const select of doc.querySelectorAll('select')) {
    if (select.closest?.(UX_SKIP_SELECTOR)) continue;
    const hay = `${uxAttr(select, 'name') || ''} ${uxAttr(select, 'id') || ''} ${uxAttr(select, 'aria-label') || ''}`;
    push(checkSelectChoices({
      optionCount: select.querySelectorAll('option').length,
      hasOptgroups: select.querySelectorAll('optgroup').length > 0,
      label: uxAttr(select, 'aria-label') || uxAttr(select, 'name') || uxAttr(select, 'id') || 'select',
      exempt: SELECT_CANONICAL_RE.test(hay),
    }), select);
  }

  // logo-not-home-link: first sizeable img/svg per header
  const HOME_HREFS = new Set(['/', '#', '', './', 'index.html', '/index.html', '#/', '/#']);
  for (const header of doc.querySelectorAll('header, [role="banner"]')) {
    if (header.closest?.(UX_SKIP_SELECTOR)) continue;
    for (const mark of header.querySelectorAll('img, svg')) {
      let sizePx = parseFloat(uxAttr(mark, 'width')) || 0;
      if (!sizePx && getStyle) {
        try { sizePx = parseFloat(getStyle(mark).width) || 0; } catch { /* unstyleable node */ }
      }
      if (sizePx < 24) continue;
      const linkAncestor = uxAncestor(mark, (t, p) => t === 'a' && uxAttr(p, 'href') !== null);
      const href = linkAncestor ? String(uxAttr(linkAncestor, 'href')).trim() : null;
      const ident = (mark.tagName || '').toLowerCase() === 'img'
        ? (String(uxAttr(mark, 'src') || '').split('/').pop() || 'logo')
        : (uxAttr(mark, 'aria-label') || 'svg mark');
      push(checkLogoHomeLink({
        ident: ident.slice(0, 50),
        linked: href !== null && HOME_HREFS.has(href),
        sizePx,
      }), mark);
      break; // only the first qualifying mark per header
    }
  }

  // form-field-overload + autocomplete-missing
  const TEXTY = new Set(['', 'text', 'email', 'tel', 'url', 'password', 'number', 'search']);
  for (const form of doc.querySelectorAll('form')) {
    if (form.closest?.(UX_SKIP_SELECTOR)) continue;
    let textFieldCount = 0;
    for (const field of form.querySelectorAll('input, textarea, select')) {
      const tag = (field.tagName || '').toLowerCase();
      const type = (uxAttr(field, 'type') || '').toLowerCase();
      if (tag === 'textarea' || tag === 'select' || (tag === 'input' && TEXTY.has(type))) textFieldCount++;
      if (tag === 'input') {
        push(checkAutocomplete({
          type,
          name: uxAttr(field, 'name') || '',
          id: uxAttr(field, 'id') || '',
          ariaLabel: uxAttr(field, 'aria-label') || '',
          hasAutocomplete: uxAttr(field, 'autocomplete') !== null,
          inForm: true,
        }), field);
      }
    }
    push(checkFormFieldChunking({
      textFieldCount,
      hasFieldsets: form.querySelectorAll('fieldset').length > 0,
      hasHeadings: form.querySelectorAll('h2, h3, h4, h5, h6').length > 0,
      label: uxAttr(form, 'aria-label') || uxAttr(form, 'id') || 'form',
    }), form);
  }

  // input-without-label (needs the doc for label[for] lookups)
  const labelFor = new Set();
  for (const label of doc.querySelectorAll('label[for]')) {
    labelFor.add(uxAttr(label, 'for'));
  }
  for (const field of doc.querySelectorAll('input, select, textarea')) {
    if (field.closest?.(UX_SKIP_SELECTOR)) continue;
    const tag = (field.tagName || '').toLowerCase();
    const id = uxAttr(field, 'id');
    const wrapped = Boolean(uxAncestor(field, t => t === 'label'));
    const firstOption = tag === 'select' ? field.querySelectorAll('option')[0] : null;
    const ident = uxAttr(field, 'placeholder')
      || uxAttr(field, 'name')
      || (firstOption ? (firstOption.textContent || '').trim() : '')
      || id || '';
    push(checkInputLabel({
      tag,
      type: uxAttr(field, 'type') || '',
      hasLabel: wrapped || (id !== null && labelFor.has(id)),
      ariaLabel: uxAttr(field, 'aria-label') || '',
      ariaLabelledby: uxAttr(field, 'aria-labelledby') || '',
      title: uxAttr(field, 'title') || '',
      ident,
    }), field);
  }

  return findings;
}

// ── Thai typography (category: quality) ────────────────────────────────────
// Latin-tuned type defaults break Thai: stacked vowels and tone marks need
// more leading, the loops that distinguish letters need size, and tracking
// copied from Latin labels breaks the syllable. One page pass walks
// text-bearing elements and keys off each element's OWN Thai run, so the
// finding lands on the element that holds the text and non-Thai pages stay
// completely silent.
function thaiCharCount(s) {
  let n = 0;
  for (const ch of String(s || '')) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0e00 && cp <= 0x0e7f) n++;
  }
  return n;
}

function uxDirectText(el) {
  let out = '';
  for (const n of el.childNodes || []) {
    if (n.nodeType === 3) out += (n.textContent || '');
  }
  return out;
}

function checkThaiTypographyFromDoc(doc, getStyle) {
  const findings = [];
  const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const els = doc.querySelectorAll(
    'p, li, dd, dt, blockquote, figcaption, td, th, span, a, button, label, summary, h1, h2, h3, h4, h5, h6, div, section, article'
  );
  for (const el of els) {
    if (uxInTcherChrome(el)) continue;
    const thai = thaiCharCount(uxDirectText(el));
    if (thai < 2) continue; // no meaningful Thai run in this element's own text
    let style;
    try { style = getStyle(el); } catch { continue; }
    if (!style) continue;
    if ((style.display || '') === 'none' || (style.visibility || '') === 'hidden') continue;

    const tag = (el.tagName || '').toLowerCase();
    const fontSize = parseFloat(style.fontSize) || 16;
    const sel = uxClassSelector(el);

    // thai-letter-spacing — any positive tracking, even on a short label.
    const lsPx = resolveLengthPx(style.letterSpacing, fontSize);
    if (lsPx != null && lsPx > 0.2) {
      findings.push({
        id: 'thai-letter-spacing',
        snippet: `positive letter-spacing ${(lsPx / fontSize).toFixed(3)}em on Thai text "${sel}"`,
        el,
      });
    }

    // line-height and font-size target real Thai prose, not one-line labels
    // or headings (which legitimately run tight and large).
    if (thai >= 30 && !HEADINGS.has(tag)) {
      const lhPx = resolveLengthPx(style.lineHeight, fontSize);
      // 'normal' (resolveLengthPx → null) renders ~1.2 for most faces, which
      // is cramped for stacked Thai marks: treat it as the cramped case.
      const ratio = lhPx == null ? 1.2 : lhPx / fontSize;
      if (fontSize > 0 && ratio < 1.5) {
        findings.push({
          id: 'thai-line-height-cramped',
          snippet: `Thai prose line-height ${ratio.toFixed(2)}x (need >=1.6) "${sel}"`,
          el,
        });
      }
      if (fontSize > 0 && fontSize < 14) {
        findings.push({
          id: 'thai-font-size-small',
          snippet: `Thai prose at ${fontSize}px (use >=16px) "${sel}"`,
          el,
        });
      }
    }
  }
  return findings;
}

// --- cli/engine/browser/injected/index.mjs ---
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

})();
