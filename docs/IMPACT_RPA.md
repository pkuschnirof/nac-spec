# Impact of NAC on RPA

NAC (Native Accessibility Contract) changes the economics of
Robotic Process Automation. This document explains how, and what
RPA teams should do about it.

The two principles of NAC -- "the system disappears" and "the
agent acts as a human, not as another system" -- are what make
the change concrete. RPA was invented to teach robots to act as
humans against systems that were never built for them. NAC asks
the systems to publish a contract for that human-shaped mode of
access. The robot stops guessing.

---

## 1. What RPA looks like today

A typical enterprise RPA program automates a long tail of
human-mediated workflows over web UIs and desktop apps. The
mechanics are roughly the same across UiPath, Automation Anywhere,
Blue Prism, Power Automate Desktop, Robocorp, Tricentis Tosca,
and the dozens of smaller vendors:

- A developer records a flow by clicking through the UI.
- The recorder captures `XPath`, `CSS selectors`, image regions
  or OCR anchors per step.
- The bot replays the flow, scraping selectors, waiting on
  visual heuristics, retrying on flake.
- A "RPA factory" team maintains hundreds of these flows. Most
  of their work is repair, not creation.

This works. It also has a known failure mode: the moment the
target UI changes, the bot breaks. The cost of that breakage is
the dominant operating expense of any RPA programme of scale.

Industry surveys put the typical breakage rate at 15-30 percent
of bots per quarter, driven mostly by minor UI updates that no
human user even notices. That number is the load-bearing metric.
It is what NAC moves.

---

## 2. Where the brittleness comes from

It comes from the same place every time: the bot does not know
what an element IS, only what it LOOKS LIKE in the DOM.

A "Save" button is, to the bot, `//*[@id='btn-save-23']` or
`button.btn-primary:nth-of-type(3)` or a 32 by 32 pixel image
clipped from a screenshot. None of those identities survive a
re-style, a refactor, an A/B test, a localisation, a framework
migration, or a CSS-in-JS class regeneration.

So the cycle is:

1. Developer ships a UI change.
2. Hundreds of bots silently start producing wrong results or
   throwing flake errors at scale.
3. RPA team detects the breakage, often days later, often via
   a complaining business user.
4. Each broken flow is opened, re-recorded, re-tested, redeployed.
5. Repeat next quarter.

Step 4 is where most RPA budget goes. NAC is designed to delete
step 4.

---

## 3. What NAC adds

A NAC-compliant page exposes:

- A stable identity per interactive element (`data-nac-id`) that
  outlives DOM refactors, framework swaps and visual redesigns.
- A semantic role per element (`data-nac-role`) so the bot does
  not have to guess "is this a Save button or a Submit?".
- Live state (`data-nac-state`) so the bot waits on intent --
  "loading", "ready", "error" -- instead of polling a spinner.
- Lifecycle events on the document (`nac:plugin:opened`,
  `nac:action:succeeded`, `nac:field:changed`, ...) so the bot
  reacts instead of polls.
- A driver API (`window.NAC.click`, `fill`, `wait_for`,
  `describe`, ...) that performs the action through the same
  path a real user takes -- the application's own keyboard,
  focus and validation flow.
- A manifest (`manifest_nac`) that lists every action, field,
  tab and KPI on the current view. The bot reads the manifest
  before doing anything.

The contract is published BY the application. It does not depend
on a vendor recorder, a selector engine, a vision model or a
particular RPA tool.

---

## 4. The five concrete savings for an RPA team

### 4.1 No more selector hunting

Every RPA project starts with a developer pointing at a button
and asking "how do I select this reliably?". With NAC the answer
is `data-nac-id="save"`. There is no XPath, no parent-of-cousin
trick, no class regex.

Saving for an enterprise of a few hundred bots: weeks of
developer time per release cycle, distributed across the
factory.

### 4.2 No more breakage on UI redesign

A UI redesign that keeps the same intent (the Save button is
still called Save and still saves) keeps the same `data-nac-id`.
The bot does not break, because the contract did not change.

Saving: 15-30 percent of bots no longer require quarterly
repair. This is the dominant line item.

### 4.3 No more flake

NAC events are deterministic. `nac:action:succeeded` fires
exactly once when the underlying operation actually completed.
The bot waits on the event, not on a "spinner is gone" heuristic
or a fixed sleep.

Saving: the long tail of intermittent failures that today are
fixed with `Sleep(2000)` and prayer. Bots become deterministic.

### 4.4 No more screenshot scraping

`window.NAC.snapshot_state()` and `NAC.describe()` return a
structured JSON of the current view's intent. There is no need
to OCR a table, scrape pixels for a status badge, or parse an
HTML report. The application hands the bot the data it would
have needed to reverse-engineer.

Saving: the entire "OCR pipeline + retraining when fonts change"
budget vanishes.

### 4.5 No more double maintenance with QA

Automated UI tests historically lived in a parallel selector
codebase. A NAC-driven page is queried by the bot, the test, and
the accessibility tooling using exactly the same primitives. One
contract. One thing to keep stable.

Saving: the duplicated maintenance budget between RPA factories
and QA factories collapses into one.

---

## 5. Migration path for an existing RPA factory

You do not throw your RPA platform away. NAC sits underneath it.

### Stage 1 -- backstop

For new internal applications: require NAC attributes in the
UI definition of done. Every interactive element ships with
`data-nac-id` + `data-nac-role`. Every fetch boundary fires
the matching `nac:action:*` event.

This costs the front-end team about 10 extra characters per
element. It is cheaper than retro-fitting accessibility audits.

### Stage 2 -- bridge

Keep your existing UiPath / Automation Anywhere / Power Automate
flows running. Wrap a thin adapter that reads `data-nac-id`
preferentially and falls back to the existing selector when the
target page has not been NAC-tagged yet. This is a couple of
days of work per RPA platform.

The adapter is small because NAC tools are simple by design --
five attributes, one driver API, one manifest endpoint.

### Stage 3 -- rebuild the most painful flows

Identify your top ten flake-prone bots. They are usually the
ones that touch dynamic dashboards, search results pages, or
pages with heavy CSS-in-JS. Re-author them on top of the NAC
adapter. Measure the breakage rate over a release cycle.

### Stage 4 -- retire the selector-based flows

Once the NAC-driven path proves more stable, the selector
fallback becomes dead code. Delete it. The factory now has a
single, contract-driven flow language.

The whole migration is incremental. There is no flag day, no
rewrite, no replatform. NAC adds a layer; nothing has to be
removed.

---

## 6. NAC is not an RPA replacement

A common confusion: "if applications expose NAC, do we still
need RPA tools?". Yes. RPA platforms own the orchestration --
schedule, queue, credentials vault, audit, supervised handoff
to humans, business-process modelling. NAC owns only the
last-mile contract between the bot and the page.

You will keep:

- Your RPA orchestration tier (UiPath Orchestrator, Power
  Automate cloud, Robocorp Control Room, etc).
- Your credential vault.
- Your business-process designer.
- Your audit and reporting.
- Your human-in-the-loop queue.

What you replace is the per-element selector layer. Everything
above it stays.

---

## 7. NAC vs. other approaches

| Approach | Stability | Cost to author | Owned by |
|---|---|---|---|
| XPath / CSS selectors | Low (breaks on redesign) | High (factory) | RPA team |
| Image / OCR matching | Medium (breaks on theme/font) | Very high | RPA team |
| Vision-LLM agent (GPT-4V, Claude Vision) | Medium (breaks on layout shift, expensive) | Per-call API cost | Vendor |
| RPA platform recorder | Same as selectors underneath | Medium | RPA team |
| **NAC** | **High (changes only on intent change)** | **Low (10 chars per element)** | **App team** |

The interesting row is the last one. NAC is the only approach
where the cost of stability is paid by the team that produces
the change in the first place -- the front-end developer who
re-styles the button is the same person who also maintains the
`data-nac-id` on it. Cost lives where information lives.

---

## 8. Voice, mobile and accessibility as side effects

A NAC-tagged application is operable, with no further work, by:

- Voice assistants ("press save", "fill name with Alice").
- Screen readers (NAC and ARIA coexist).
- Mobile bots (the same `data-nac-id` works from a wrapped
  webview).
- Test automation (see `IMPACT_TESTING.md`).
- Accessibility audits (`NAC.describe()` enumerates the same
  set the auditor wants).

A team that already pays the NAC cost for RPA gets four other
constituencies operating their UI for free. The marginal cost of
a new operator is zero, because the contract is published.

---

## 9. Concrete numbers a team can quote

These are illustrative, derived from publicly reported RPA
operating costs and the failure-mode pattern above. Substitute
your own factory numbers; the ratios are the load-bearing point.

For a factory of 500 bots:

- Quarterly breakage cost (today): roughly 100 bots x 4 hours of
  developer time = 400 dev-hours per quarter, or one full-time
  engineer dedicated to repairs. Plus the business cost of the
  windows of broken flows.
- After NAC migration: roughly 15 bots x 2 hours of developer
  time per quarter, because the only changes that break the bot
  are intent changes, and those need a real review anyway.

Net saving: about 95 percent of the repair budget. Add the
selector-authoring saving on new bots and you get a factory
that ships flows in days instead of weeks, with QA, voice and
accessibility coverage for free.

---

## 10. What an RPA team should ask its product team to do

One paragraph. Print it out and hand it over.

> "When you ship UI, add five `data-nac-*` attributes per
> interactive element and emit four `nac:action:*` events per
> action. Use `window.NAC.validate(slug)` in CI as a gate.
> Every other consumer of the UI -- automated tests, voice,
> accessibility, our RPA bots -- speaks the same contract.
> Doing this once removes a quarterly repair tax that today
> sits with the RPA team but originates here."

The argument for the product team is not that they should help
the RPA team. The argument is that publishing the contract makes
their UI more legible to themselves: their tests stop breaking,
their accessibility audits stop being mysterious, their support
team can voice-drive a customer through a flow over a phone
call. The RPA win is a side effect.

---

## See also

- `docs/PHILOSOPHY.md` -- the two principles behind NAC.
- `docs/IMPACT_TESTING.md` -- the parallel argument for QA
  automation.
- `docs/MANUAL.md` -- how to author a NAC-compliant view.
- `spec/NAC-v1.0.md` -- the normative document, including the
  v1.1 widget extensions, v1.2 discovery + window chrome,
  v1.3 sixteen common UI primitives, v1.4 navigation +
  ordering primitives, v1.5 NAC + LLM agentic loop,
  v1.6 plugin reset primitive, v1.7 canonical event detail
  shapes (sec 6.2), and v1.8 ProvenanceBlock + command events
  + skip-validate + a11y-hint + drag types + migration
  helpers (sec 6.2.30, sec 3.1, sec 13.9).
