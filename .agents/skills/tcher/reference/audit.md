Run systematic **technical** quality checks and generate a comprehensive report. Don't fix issues; document them for other commands to address.

This is a code-level audit, not a design critique. Check what's measurable and verifiable in the implementation.

## Diagnostic Scan

Run comprehensive checks across 6 dimensions. Score each dimension 0-4 using the criteria below.

### 1. Accessibility (A11y)

**Check for**:
- **Contrast issues**: Text contrast ratios < 4.5:1 (or 7:1 for AAA)
- **Missing ARIA**: Interactive elements without proper roles, labels, or states
- **Keyboard navigation**: Missing focus indicators, illogical tab order, keyboard traps
- **Semantic HTML**: Improper heading hierarchy, missing landmarks, divs instead of buttons
- **Alt text**: Missing or poor image descriptions
- **Form issues**: Inputs without labels, poor error messaging, missing required indicators

**Score 0-4**: 0=Inaccessible (fails WCAG A), 1=Major gaps (few ARIA labels, no keyboard nav), 2=Partial (some a11y effort, significant gaps), 3=Good (WCAG AA mostly met, minor gaps), 4=Excellent (WCAG AA fully met, approaches AAA)

### 2. Performance

**Check for**:
- **Layout thrashing**: Reading/writing layout properties in loops
- **Expensive animations**: Casual layout-property animation, unbounded blur/filter/shadow effects, or effects that visibly drop frames
- **Missing optimization**: Images without lazy loading, unoptimized assets, missing will-change
- **Bundle size**: Unnecessary imports, unused dependencies
- **Render performance**: Unnecessary re-renders, missing memoization

**Score 0-4**: 0=Severe issues (layout thrash, unoptimized everything), 1=Major problems (no lazy loading, expensive animations), 2=Partial (some optimization, gaps remain), 3=Good (mostly optimized, minor improvements possible), 4=Excellent (fast, lean, well-optimized)

### 3. Theming

**Check for**:
- **Hard-coded colors**: Colors not using design tokens
- **Broken dark mode**: Missing dark mode variants, poor contrast in dark theme
- **Inconsistent tokens**: Using wrong tokens, mixing token types
- **Theme switching issues**: Values that don't update on theme change

**Score 0-4**: 0=No theming (hard-coded everything), 1=Minimal tokens (mostly hard-coded), 2=Partial (tokens exist but inconsistently used), 3=Good (tokens used, minor hard-coded values), 4=Excellent (full token system, dark mode works perfectly)

### 4. Responsive Design

**Check for**:
- **Fixed widths**: Hard-coded widths that break on mobile
- **Touch targets**: Interactive elements < 44x44px
- **Horizontal scroll**: Content overflow on narrow viewports
- **Text scaling**: Layouts that break when text size increases
- **Missing breakpoints**: No mobile/tablet variants

**Score 0-4**: 0=Desktop-only (breaks on mobile), 1=Major issues (some breakpoints, many failures), 2=Partial (works on mobile, rough edges), 3=Good (responsive, minor touch target or overflow issues), 4=Excellent (fluid, all viewports, proper touch targets)

### 5. Anti-Patterns (CRITICAL)

Check against ALL the **DON'T** guidelines from the parent tcher skill (already loaded in this context). Look for AI slop tells (AI color palette, gradient text, glassmorphism, hero metrics, card grids, generic fonts) and general design anti-patterns (gray on color, nested cards, bounce easing, redundant copy).

**Score 0-4**: 0=AI slop gallery (5+ tells), 1=Heavy AI aesthetic (3-4 tells), 2=Some tells (1-2 noticeable), 3=Mostly clean (subtle issues only), 4=No AI tells (distinctive, intentional design)

### 6. UX (Laws of UX)

Audit the interface against the 30 Laws of UX (principle names from Jon Yablonski's lawsofux.com; the checks below are this skill's own operationalization). The deterministic engine already measures a subset (run `npx tcher-designs detect --mode=ux` or live mode's Detect UX: Fitts targets, Hick/Miller overload, Similarity link cues, Jakob logo link, Postel autocomplete, Doherty payloads, labels/alt/focus/viewport). **Your job here is the judgment half the engine cannot measure.** Walk each cluster:

**Perception (Gestalt)**
- **Proximity**: is spacing doing the grouping? Labels nearer their own field than the next; related controls clustered; unrelated sections separated by more than within-section gaps.
- **Similarity**: do same-looking things behave the same? One visual grammar for links, one for buttons; no false affordances.
- **Common Region**: do containers group related content, or are cards drawn around arbitrary slices?
- **Uniform Connectedness**: are steps/flows visually connected (progress rails, connectors) when sequence matters?
- **Prägnanz**: can each screen be summarized in one sentence? If a region needs study to parse, simplify it.

**Memory & load**
- **Miller's Law / Chunking**: menus, lists, and forms broken into scannable groups; phone/card inputs chunked.
- **Working Memory**: does any step ask the user to remember something from a previous screen? Carry it forward instead (visited states, breadcrumbs, persisted form data).
- **Cognitive Load**: count what competes for attention that doesn't serve the task; cut extraneous decoration, merge duplicate actions.
- **Serial Position Effect**: most important nav items first and last; the middle is where attention dies.

**Decision-making**
- **Hick's Law / Choice Overload**: fewer, clearer choices at each decision point; one recommended option highlighted; search/filter when lists must be long.
- **Cognitive Bias**: does the flow exploit or fight user expectations? Watch for confirmation-bias traps in your own review.
- **Occam's Razor**: for every element ask "what breaks if this goes?" Remove until the answer is "something".
- **Pareto Principle**: is the primary 20% of functionality the most prominent 20% of the UI?

**Interaction & performance**
- **Fitts's Law**: primary actions big and near; destructive actions small and far; edge/corner placement for frequent targets.
- **Doherty Threshold**: feedback within 400ms everywhere (optimistic UI, skeletons, progress for anything slower).
- **Postel's Law**: forms accept any reasonable input format and normalize it; validation forgives, error messages instruct.
- **Tesler's Law**: complexity the user carries that the system could (manual steps that could be defaults, repeated data entry).
- **Parkinson's Law**: autofill, smart defaults, and one-click paths where the task allows.

**Motivation & emotion**
- **Goal-Gradient / Zeigarnik**: progress visible in multi-step tasks; started-but-unfinished states invite completion.
- **Peak-End Rule**: the moment of success (submit, send, complete) and the exit are designed, not default.
- **Flow**: friction matched to skill: onboarding gentle, expert paths fast (shortcuts, bulk actions).
- **Aesthetic-Usability Effect**: looks may be masking usability problems; test the ugly path too.

**Mental models & behavior**
- **Jakob's Law / Mental Model**: conventions kept unless breaking one buys real value (logo→home, cart top-right, underlined links).
- **Selective Attention**: critical info not styled like ads or banners (banner blindness); important changes visually announced (change blindness).
- **Paradox of the Active User**: help in context (tooltips, empty states, inline hints), never a manual to read first.
- **Von Restorff Effect**: exactly one thing per screen is the standout; if everything pops, nothing does.

**Score 0-4**: 0=Fights the user (conventions broken, no feedback, choice walls), 1=Major friction (several laws violated in core flows), 2=Mixed (core flow respects them, secondary flows don't), 3=Good (deliberate grouping, feedback, defaults; minor gaps), 4=Excellent (flows feel obvious; the laws are invisible because they're all honored)

## Generate Report

### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | ? | [most critical a11y issue or "--"] |
| 2 | Performance | ? | |
| 3 | Responsive Design | ? | |
| 4 | Theming | ? | |
| 5 | Anti-Patterns | ? | |
| 6 | UX (Laws of UX) | ? | |
| **Total** | | **??/24** | **[Rating band]** |

**Rating bands**: 22-24 Excellent (minor polish), 17-21 Good (address weak dimensions), 12-16 Acceptable (significant work needed), 7-11 Poor (major overhaul), 0-6 Critical (fundamental issues)

### Anti-Patterns Verdict
**Start here.** Pass/fail: Does this look AI-generated? List specific tells. Be brutally honest.

### Executive Summary
- Audit Health Score: **??/20** ([rating band])
- Total issues found (count by severity: P0/P1/P2/P3)
- Top 3-5 critical issues
- Recommended next steps

### Detailed Findings by Severity

Tag every issue with **P0-P3 severity**:
- **P0 Blocking**: Prevents task completion. Fix immediately
- **P1 Major**: Significant difficulty or WCAG AA violation. Fix before release
- **P2 Minor**: Annoyance, workaround exists. Fix in next pass
- **P3 Polish**: Nice-to-fix, no real user impact. Fix if time permits

For each issue, document:
- **[P?] Issue name**
- **Location**: Component, file, line
- **Category**: Accessibility / Performance / Theming / Responsive / Anti-Pattern / UX (cite the law)
- **Impact**: How it affects users
- **WCAG/Standard**: Which standard it violates (if applicable)
- **Recommendation**: How to fix it
- **Suggested command**: Which command to use (prefer: /tcher responsive, /tcher animate, /tcher audit, /tcher brave, /tcher clarify, /tcher palette, /tcher critique, /tcher motion, /tcher trim, /tcher document, /tcher harden, /tcher idea, /tcher layout, /tcher onboard, /tcher optimize, /tcher extreme, /tcher refine, /tcher calm, /tcher shape, /tcher typo, /tcher thai, /tcher sea, /tcher flows)

### Patterns & Systemic Issues

Identify recurring problems that indicate systemic gaps rather than one-off mistakes:
- "Hard-coded colors appear in 15+ components, should use design tokens"
- "Touch targets consistently too small (<44px) throughout mobile experience"

### Positive Findings

Note what's working well: good practices to maintain and replicate.

## Recommended Actions

List recommended commands in priority order (P0 first, then P1, then P2):

1. **[P?] `/command-name`**: Brief description (specific context from audit findings)
2. **[P?] `/command-name`**: Brief description (specific context)

**Rules**: Only recommend commands from: /tcher responsive, /tcher animate, /tcher audit, /tcher brave, /tcher clarify, /tcher palette, /tcher critique, /tcher motion, /tcher trim, /tcher document, /tcher harden, /tcher idea, /tcher layout, /tcher onboard, /tcher optimize, /tcher extreme, /tcher refine, /tcher calm, /tcher shape, /tcher typo, /tcher thai, /tcher sea, /tcher flows. Map findings to the most appropriate command. End with `/tcher refine` as the final step if any fixes were recommended.

After presenting the summary, tell the user:

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/tcher audit` after fixes to see your score improve.

**IMPORTANT**: Be thorough but actionable. Too many P3 issues creates noise. Focus on what actually matters.

**NEVER**:
- Report issues without explaining impact (why does this matter?)
- Provide generic recommendations (be specific and actionable)
- Skip positive findings (celebrate what works)
- Forget to prioritize (everything can't be P0)
- Report false positives without verification

