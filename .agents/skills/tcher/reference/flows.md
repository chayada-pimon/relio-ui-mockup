A beautiful interface that strands the user mid-task has failed. This command reads the codebase (routes, pages, components, and state) and answers one question per flow: can a user actually finish the task? It traces real user journeys through the code, not the visual surface, and reports where people get stuck, lost, or dropped.

It is the journey-level counterpart to the surface-level reviews:

- `/tcher audit` asks "is this surface technically sound?" (contrast, a11y, performance, responsive).
- `/tcher critique` asks "is this surface well-designed?" (hierarchy, clarity, cognitive load) on one screen.
- **`/tcher flows` asks "can the user complete the task?"** across every screen the task spans. A page can pass audit and critique and still be a dead end.

---

## Register

Product (app, dashboard, tool): the primary task flows ARE the product; this is where it matters most.

Brand (marketing, landing): even a landing has a micro-flow (hero CTA → form → confirmation). Trace it; a thank-you page with no next step is a dead end on a landing too.

---

## How to read the codebase

Don't open the browser; read the code. Work in this order:

1. **Find the routing.** Identify the convention and list every route / screen:
   - File-based: `app/` or `pages/` (Next), `src/routes/` (SvelteKit / Remix), `src/pages/` (Astro / Nuxt), `pages/` + a router (Vue).
   - Config-based: a React Router / TanStack Router route tree, a `<Routes>` block, a router config array.
2. **Name the primary flows.** The handful of tasks the product exists for: checkout, sign-up / sign-in, onboarding, create-X, upload, search → result, invite, a settings change. Use the routes, the nav, and PRODUCT.md to pick them. Don't analyze every route equally; analyze the flows that carry the product's value.
3. **Trace each flow screen by screen.** For every step find: how the user arrives, the actions on the screen, and where each action sends them (`<Link>` / `<a>`, `router.push` / `navigate`, `redirect`, `<form action>`, a mutation's `onSuccess`). Build the step graph.
4. **Read each screen's state branches.** In the components, find the conditional renders for loading / error / empty / success. Read the data layer (fetch, react-query / SWR, store, server action) to see which states actually exist versus only the happy path.
5. **Map reachability.** Which routes have an inbound link or programmatic navigation, and which have none.

## The five checks

### 1. Dead ends
A screen the user can reach but cannot leave toward their goal. Look for:
- Error / 404 / 500 pages with no link home and no retry.
- Confirmation / success / "thank you" pages with no next step (continue shopping, go to dashboard, view the thing you just made).
- Empty states that say "nothing here" but offer no action to create or import.
- Modals or wizards with no cancel and no back.

The worst dead end is the one users hit *after finishing the work* (the confirm page): they got all the way there and the path stops.

### 2. Task completion
Count the steps to finish each primary task and judge whether each step earns its place.
- How many screens and required fields between start and done?
- Could any step be merged, deferred, or removed (a whole page for one field)?
- Is there a forced detour that blocks the core task (must verify email before you can even look around)?

Report the step count and a completion-rate risk (LOW / MEDIUM / HIGH) from length, friction, and the issues found.

### 3. Missing states
Every screen that fetches or submits needs four states designed, not just the happy path:
- **loading**: a pending UI, or does the screen sit blank / jump?
- **error**: a failure handled with a message and a way forward, or does it throw / hang silently?
- **empty**: first-run / no-data, does it guide the next action?
- **success**: is completion confirmed (redirect, toast, visible state change)?

List which of the four is missing, per screen. A flow with no error state anywhere is one failed request away from stranding the user.

### 4. Orphan pages
A route that exists in code but nothing in the UI navigates to. Cross-check every route against inbound links / `push` / `redirect`. An orphan is either dead code or a flow with a broken entrance. Exempt routes that are reached by direct link on purpose (password reset, OAuth callback, shared / deep links, email-action targets); note them, don't flag them.

### 5. Broken flows
A flow that starts but cannot be confirmed finished:
- A form that submits with no success and no error feedback (fire-and-forget mutation, no `onSuccess` / `onError`).
- A multi-step flow where a later step has no way back to fix an earlier one.
- A success path that depends on a state that is never set.
- A CTA pointing at a route that does not exist (a broken entrance to a real flow).

## Output

Open with a one-line summary across all flows, then one block per flow in this shape:

```
Flow: Checkout
Steps: 4 (cart → address → payment → confirm)
Completion rate risk: HIGH

Issues found:
❌ Payment: no error state if the card is declined
❌ Confirm: no link back home or continue shopping
⚠️  Address: no loading state while the address validates
⚠️  Cart: empty cart does not say what to do next

Dead ends: 1
Missing states: 3
Recommended: fix the Confirm page first; users arrive after paying and get stuck there.
```

Severity marks: **❌** = the user cannot finish or is stranded (blocks completion); **⚠️** = friction or a missing non-happy-path state (hurts, not blocking). Keep the issue lines specific and name the screen.

## Prioritize the fixes

Order by where the user is and how far they came:

1. **Dead ends users hit after investing effort** (the confirm / post-submit screen). They completed the work and the path stopped: highest regret, highest abandonment.
2. **Broken flows** where the task literally cannot finish.
3. **Missing error states** on required steps: one failed request strands the user.
4. **Missing loading / empty states**, then step-count trims.

Peak-End rule: the end of a flow is what the user remembers. A broken or abrupt ending taints the whole task even when every earlier screen was fine.

## Hand off

`/tcher flows` finds where the journey breaks; other commands build the fix:

- Missing empty / first-run state → `/tcher onboard` designs it.
- The copy in an error / empty / success state reads badly → `/tcher clarify`.
- Error handling and edge cases need building out → `/tcher harden`.
- A surface on the path needs visual or technical work → `/tcher critique` / `/tcher audit`.
