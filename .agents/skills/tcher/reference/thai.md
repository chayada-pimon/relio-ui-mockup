Thai script has needs that Latin-tuned defaults actively break: it stacks marks vertically, distinguishes letters by tiny loops, has no spaces between words, and has no uppercase. Type set with English defaults (line-height 1.5, any positive letter-spacing, 14-16px, a Latin-only font) collides, blurs, and reads as foreign. This command makes Thai text read like a native Thai designer set it, and keeps mixed Thai + English lines harmonious.

---

## Register

Brand: display and headline type can be loopless and expressive (Prompt, Kanit, Mitr). Distinctiveness is the bar, but body copy still follows the body rules below.

Product: body and UI labels should use a looped, screen-tuned face (Anuphan, IBM Plex Sans Thai Looped, Sarabun). Earned familiarity and legibility win over expression.

See [brand.md](brand.md) / [product.md](product.md) for the register frame.

---

## Why Thai type is different

Four facts drive every rule here:

1. **Thai stacks up to four vertical levels.** A base consonant, an upper vowel (สระบน), a tone mark above it (วรรณยุกต์), and a lower vowel (สระล่าง) can all land on one syllable (e.g. ปุ๋ย, ญี่ปุ่น). With Latin-tuned leading the tone mark of one line nearly touches the lower vowel or descender of the line above. **Thai needs more line-height than Latin.**
2. **Letters are told apart by small loops (หัว).** The distinguishing detail is tiny, so Thai loses legibility at small sizes faster than Latin does. Loopless display faces (Prompt, Kanit) drop the loop entirely for a geometric look and are display-only.
3. **No spaces between words.** Word breaks fall at phrase boundaries. `word-break: break-all` and naive `text-align: justify` shred Thai; rely on the browser's Thai segmentation instead.
4. **No uppercase.** The Latin habit of tracking out caps and small-caps has no Thai equivalent. Positive letter-spacing pushes the marks off their base letters and breaks the syllable.

## Assess

Read the rendered Thai (run the detector below, then look). Check:

- **Line-height**: is body Thai below ~1.6? Do tone marks crowd the line above? `line-height: normal` and Tailwind `leading-normal` (1.5) are both too tight for Thai prose.
- **Font size**: is Thai body below 16px? Is a loopless face below ~17px? The loops vanish.
- **Letter-spacing**: any positive `letter-spacing` on Thai (often copied from a Latin all-caps label or a `tracking-*` utility)?
- **Font choice**: is Thai rendering through a Latin-only webfont's fallback (Inter / Roboto / Poppins with no Thai-capable family in the stack)? Is a loopless display face (Prompt / Kanit) being used for body?
- **Mixed Thai + English**: on a line with both scripts, do the x-heights and weights match, or does one script look smaller / lighter and the line go lumpy?
- **Wrapping**: is Thai justified or `break-all`, leaving big gaps or mid-word breaks?

## Fix

### Line-height
Body Thai: **1.6 minimum, 1.75-2.0 for comfortable long-form.** Headings can be tighter (1.25-1.4) since they are short and large, but never `line-height: 1` on Thai. Set the leading first, then base vertical spacing on it.

### Font size
Body **≥16px; 17-18px is the comfortable Thai body size**, especially for loopless or low-loop faces. UI labels ≥14px and prefer a looped face there. Use `rem`, never disable zoom.

### Letter-spacing & wrapping
- **No positive `letter-spacing` on Thai.** Default (`normal`) is correct. Audit stray `tracking-*` utilities and inherited spacing from Latin labels.
- `word-break: normal`, never `break-all` for Thai. Don't `text-align: justify` Thai unless you've confirmed the browser's Thai line-breaking is active (`line-break: loose` helps); otherwise it opens ugly gaps because there are no spaces to absorb them.

### Font selection
All of these are on Google Fonts and cover Thai well. Pick by role:

| Role | Faces | Notes |
|---|---|---|
| **Body / UI (looped, readable)** | Anuphan, IBM Plex Sans Thai Looped, Sarabun, Noto Sans Thai, Krub | Anuphan = modern UI workhorse with character. IBM Plex Sans Thai = best Latin pairing. Sarabun = the safe gov/body default (legible but generic; AI's reflex). Noto = pan-script safety. |
| **Serif body / editorial** | Noto Serif Thai, IBM Plex Serif Thai | One of the few quality Thai serif lanes. |
| **Display / headline (loopless)** | Prompt, Kanit, Mitr, Bai Jamjuree, Chonburi | Loopless = display only, never body. Prompt = Poppins-like brand default. Kanit = bold / condensed. Mitr = friendly rounded. Bai Jamjuree = technical / semi-condensed. |
| **Decorative / script** | Charm, Charmonman, Pattaya | Accents only. |

Anti-reflex: **Sarabun and Noto Sans Thai are the AI defaults.** They are fine, not distinctive. If the brand wants character, reach for Anuphan or IBM Plex Sans Thai for body and a deliberate loopless face for display, the same way you would avoid Inter for a Latin brand.

### Mixed Thai + English

The lumpy-line problem: a Thai face and a Latin face from different foundries have different x-heights, weights, and rhythm, so a mixed line looks uneven. In order of preference:

1. **Use one family designed with both scripts.** Noto Sans Thai + Noto Sans, IBM Plex Sans Thai + IBM Plex Sans, or a Thai face that ships harmonized Latin (Anuphan, Sarabun). The foundry already matched the metrics. This is the right answer almost always.
2. **If you must pair two families**, assign each script with a `unicode-range` `@font-face` (Latin → the Latin font's range, Thai → U+0E00-U+0E7F) so each script uses its intended face per character. Match x-heights; if Thai looks smaller, size it up per `:lang(th)`.
3. Never let a Latin-only font's weak or missing Thai glyphs render Thai. Always put a Thai-capable family in the stack before the generic.

Numerals: use Arabic digits (0-9) for modern UI; Thai numerals (๐-๙) only for formal, traditional, or government contexts.

## Verify

- Set a long Thai paragraph with stacked-mark words (ปุ๋ย, ญี่ปุ่น, กรุ๊ปเลือด) and confirm no mark collides with the line above.
- A mixed Thai + English heading and sentence read as one even line.
- Body holds up at 200% zoom and on a real phone.
- Re-run the detector; the measurable rules below should be clean.

## Engine support

`npx tcher-designs detect <files>` (or the live overlay) flags the three measurable Thai-type faults automatically: **thai-line-height-cramped**, **thai-letter-spacing**, and **thai-font-size-small**. Run it first to find every offending element, then apply the judgment parts (font selection, mixed-language harmony) that no rule can decide. The findings appear under the Design tab.
