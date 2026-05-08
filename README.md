# NAC -- Navegabilidad Automatica Compliance

> A design norm that lets AI agents, voice assistants, RPA bots and
> automated test runners navigate, fill, operate and verify any user
> interface as if they were human users -- without reading the source
> code, without fragile selectors, without manual test scripts.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NAC v1.9.0](https://img.shields.io/badge/NAC-v1.9.0-violet.svg)](spec/NAC-v1.0.md)
[![Status: Stable](https://img.shields.io/badge/status-stable-success.svg)](#)

**Authors:** Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, Sumi.
**License:** MIT.
**Spec version:** v1.9.0 (2026-05-08).
**Reference runtime:** v1.9.0 (`NAC.version === '1.9.0'`).
**Strict superset of:** v1.8, v1.7, v1.6, v1.5, v1.4, v1.3, v1.2, v1.1, v1.0.
**What v1.9.0 adds (the v2.0 patch round):**
- **`data-nac-skip-reason` REQUIRED** when `data-nac-validate=
  "skip"` is set (sec 3.1). Format:
  `<category>[;remediate-by=YYYY-MM-DD][;tracker=<id>]`. Validator
  emits `skip_without_reason` (error at NAC-3) and
  `skip_remediation_overdue` (warn) so brownfield skip regions
  cannot become permanent compliance theatre.
- **ARIA bridge for `data-nac-a11y-hint`** (sec 3.1). Runtime mounts
  a hidden `aria-live` region and appends per-element hint text via
  `aria-describedby` so screen readers consume hints today, without
  waiting for vendor support. `NAC.set_a11y_hint_localizer(fn)`
  hook for hosts.
- **`data-nac-braille-label`** (sec 3.1, NEW) for refreshable
  braille displays. Surfaced on `NAC.describe()`/`find()` as
  `braille_label`.
- **`validate_event_conformance` enforces ProvenanceBlock**
  (sec 6.2.27). The self-test fails when an event detail lacks a
  valid `source.type` (`'user' | 'agent' | 'script'`).
- **ARIA-to-NAC mapping table** (sec 7.3.3, NEW). Normative
  preflight: `aria-disabled`, `aria-busy`, `aria-hidden`,
  `aria-readonly`, `inert` -> `nac:command:rejected` reasons.
- **Drift tolerance window 200 ms** (sec 7.3.2) so React 18 / Vue 3
  / Svelte 5 hydration does not produce false-positive drift
  errors. Configurable via
  `NAC.set_validation_tolerance({drift_window_ms: <n>})`.
- **Worked ARIA examples** (sec 7.3.4) for combobox, modal dialog,
  virtualized datagrid, accordion, tabs.
- **`docs/ROADMAP.md`** (NEW). Three horizons: v2.0 in flight,
  v2.1 (3-6 months) deferred items, v2.x (6-12 months) post-2.1
  research items, plus a Yujin Framework section describing the
  first commercial NAC v2.0 reference implementation.
- **`docs/AUTHORING_PATTERNS.md`** (NEW). Worked patterns for ARIA
  + NAC coexistence, skip-reason enforcement, hint escalation
  semantics by consumer type (voice / SR / AI agent / RPA bot).
- **Performance budget** (sec 6.2.27, normative). Validator <=
  50 ms for 1000 elements, describe() <= 30 ms, _emit overhead
  <= 0.5 ms per event. `NAC.perf_probe()` produces a structured
  timing report against a synthetic fixture.
- **Test harness utilities** (sec 13.10, normative).
  `NAC.assert_event_fired(eventType, opts)` and
  `NAC.assert_event_count(eventType, n, opts)` remove the
  per-test listener boilerplate; `NAC.perf_probe()` drives the
  performance budget.
- **Event replay buffer** (sec 13.11, informative).
  `window.__NAC_PENDING__` lets hosts capture user actions
  before the runtime loads; `NAC.replay_pending(buffer)` re-emits
  them when the runtime installs.
- **`nac:action:confirm` event family** (sec 6.2.32, NEW).
  `requested` / `granted` / `denied` promotes confirmation from
  advisory hint to wire-level contract. NAC-3 conformant pages
  MUST route any action with `irreversible` / `requires_confirmation`
  / `data_loss` hint through `NAC.confirm_action()` (or an
  equivalent emitting the same shape).
- **Action undoable flag** (sec 6.2.33, NEW). Manifest's
  `actions[i].undoable: true` surfaces on `describe()`/`find()` as
  `undoable: boolean` so AI agents downgrade interposition
  pressure on recoverable actions.
- **Drag-type registry** (sec 13.4.1, NEW). 24 canonical type
  patterns (`text/*`, `image/*`, `application/json+card`,
  `card/<plugin_slug>`, `row/<entity_slug>`, `file/<extension>`,
  `tag`, `note`, `event`, `chart-series`, `tree-node`). Custom
  types still work; validator emits `drag_type_unknown` warning
  for ad-hoc types.
- **Codemod extension `--inject-source-script`**
  (`tools/migrate-legacy-events.js`). Scans `NAC.click()` /
  `fill()` / `drag_drop()` / `expand()` / `sort()` / `set_slider()`
  / `go_to_section()` call sites that lack `opts.source` and
  injects `{ source: { type: 'script' } }` so existing codebases
  satisfy the v1.9 NAC-3 ProvenanceBlock requirement without
  per-line audit. Heuristic skips lines that look like agent
  callers (presence of `agent` / `tool` / `claude` / `voice` /
  `talon` keywords).

Strict superset of v1.8.0 -- every v1.8 plugin remains valid;
every v1.7 plugin remains valid.

**What v1.8.0 adds:**
- **ProvenanceBlock on every event** (sec 6.2.1) --
  `source: { type: 'user' | 'agent' | 'script', id?, tool? }`.
  Audit pipelines for users delegating UI work to AI assistants
  can finally distinguish human from automated traffic.
- **`nac:command:rejected` + `nac:command:failed`** event
  families (sec 6.2.30) close the silent-failure gap (target
  disabled / hidden / not_found / ambiguous, or unexpected
  throw during execution).
- **`data-nac-validate="skip"`** declarative attribute (sec
  3.1) -- third-party widget escape hatch that does NOT fail
  validate() but emits a warning if the region contains
  operable surface.
- **`data-nac-a11y-hint`** (sec 3.1) -- `irreversible |
  requires_confirmation | dangerous | long_running | costly |
  external_side_effect | data_loss` for voice + screen-reader
  + AI-agent interposition before invocation.
- **Drag-drop type validation** (sec 13.4) --
  `data-nac-drag-type` on source + `data-nac-drag-accept` on
  target, mismatches reject cleanly.
- **Self-test promoted to runtime** (sec 13.9 +
  sec 6.2.27) -- `NAC.validate_event_conformance()` is now a
  normative NAC-3 requirement, not a demo-only helper.
- **Migration helpers** (sec 13.9) -- `NAC.emit_dual()`,
  `NAC.command_rejected()`, `NAC.command_failed()`,
  `NAC.check_canonical_shape()`. Codemod at
  `tools/migrate-legacy-events.js`. Migration guide at
  `docs/MIGRATION_v1_to_v2.md`.
- **Public CSS custom properties** (sec 7.6) --
  `--nac-focus-pulse-color/duration/thickness/intensity` and
  `--nac-section-visited-color/duration` so attention-sensitive
  populations can crank the cue intensity without forking.
- All seven additions land in response to the four-AI peer
  review of v1.7.0 (Microsoft Copilot, DeepSeek, Mistral
  Le Chat, Grok). Strict superset of v1.7 -- every v1.7
  plugin remains valid; v1.8 primitives are additive, opt-in.

**v1.7.0 recap:**
- Spec sec 6.2 canonical event detail shapes with per-family
  entity-id fields (action_id, field_id, tab_id, section_id,
  column_id, source_id, target_id, list_id, tree_id, etc.)
  closing the v1.6 review's "validator is reactive, not
  preventive" abandonment cause.
- 11 new widget cards in the demo (stepper, tree, toast,
  drawer, calendar, chart, map, richtext, breadcrumb, carousel,
  timeline) covering every event family in sec 6.1.
- "v1.7 event conformance" self-test that programmatically
  asserts canonical shape per emitted event -- the first
  executable specification check NAC ships.
**v1.6.x recap:** `NAC.is_blocked()`,
`NAC.set_validation_tolerance()`, sec 7.3.2 aria/nac drift as
hard-error at NAC-3, per-plugin event buses default-on,
closed shadow roots out of scope, NAC.drag_drop runtime,
role-aware NAC.click, section-visibility highlight,
sort-control + filter-control role family. `MANUAL.md`
"Design-system layer pattern" chapter (React 18 / Vue 3 /
Svelte 5 atomic NAC + ARIA primitives).
**v1.6.0 recap:** `NAC.reset()` plugin reset primitive (spec
sec 9.3) + `NAC.set_reset_provider(slug, fn)`.
**v1.5.x recap:** v1.5.0 NAC + LLM agentic loop. v1.5.1
cross-plugin uniqueness audit. v1.5.4 10-locale i18n sweep on
the reference demo. Full diff in [`CHANGELOG.md`](CHANGELOG.md).

---

## The thesis in two principles

NAC is the technical consequence of two product principles. If
you do not buy these two principles, you do not need NAC. If you
do buy them, you cannot avoid building something close to NAC.

### 1. The system disappears

The UI is not the work. The UI is the surface through which the
work happens. A well-built system gets out of the user's way --
and out of any operator's way. That demands a contract on the
surface of the UI itself, not behind it.

### 2. The agent acts as a human, not as another system

When an AI agent operates a system on behalf of the user, it
goes through the same buttons, forms, modals, permission checks
and audit trails as the human. No privileged backend API. No
service-identity backdoor. Whatever the human can do, the agent
can do, **the same way**. NAC is the contract that makes that
possible.

This is the explicit difference with MCP (Model Context
Protocol): MCP exposes the system *as another system* (function
calls, backend access, server tools). NAC exposes the system *as
it is exposed to humans*. They are layered and complementary,
not competing -- see "NAC vs MCP" below for the full rationale.

Read [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) for the full
treatment, including why these two principles produce every
shape decision in the spec.

### Quick links

- [`spec/NAC-v1.0.md`](spec/NAC-v1.0.md) -- normative contract.
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) -- one-page
  cheat sheet of every `window.NAC.*` method, grouped by version.
- [`docs/MANUAL.md`](docs/MANUAL.md) -- authoring decisions
  (what each attribute means, when to use which role).
- [`AI_INSTRUCTIONS.md`](AI_INSTRUCTIONS.md) -- decision rules
  for an AI coding agent applying NAC to a project.
- [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) /
  [`GEMINI.md`](GEMINI.md) -- vendor-specific entry points
  (identical content; pick the one matching your toolchain).
- [`CHANGELOG.md`](CHANGELOG.md) -- per-version diff log.

---

## Why NAC

Modern UIs are built for human eyes first. As a result, automated
tests rely on fragile CSS selectors, AI assistants cannot operate UIs
on the user's behalf, RPA bots need costly per-app training, and E2E
test coverage rarely exceeds 50% because writing specs manually does
not scale with feature velocity.

NAC reverses the polarity: a UI that complies with NAC publishes
its own contract -- semantic IDs, roles, states, events, and a
programmatic API -- so any external operator can introspect,
operate and verify it without privileged access. The current
release line is v1.9.0; every spec version since v1.0 has been
a strict superset (no breaking changes).

Compliant systems are testable end-to-end at near-100% coverage with
auto-generated specs plus AI-guided exploration. Non-compliant
systems are not.

## Honest expectations

> Added in v1.6.1 in response to the v1.6 AI peer review.
> Five of seven reviewers (Copilot, Claude 4.7, HuggingChat,
> Mistral, DeepSeek) flagged that the original "1 hour
> onboarding / smaller than ARIA" pitch no longer matches the
> v1.4..v1.6 surface. Pretending otherwise is the fastest way
> to lose trust on first contact, so this section says what we
> have learned.

### Cost frame for NAC-3

For a typical 30-screen SPA built on a modern framework with an
existing component library:

| Phase | Wall-clock with AI coding agent | Notes |
|---|---|---|
| Build the design-system layer (NAC + ARIA atomic primitives) | 1-2 days | One-time. Without this, every screen pays a per-element drift tax. See [`docs/MANUAL.md`](docs/MANUAL.md) "Design-system layer pattern". |
| Annotate one screen end-to-end | ~1 day per screen | AI agent does the mechanical work; human reviews semantic IDs + verb naming. |
| Wire the lifecycle events correctly | ~0.5 day per plugin | Underestimated. See "Event correctness" chapter. |
| Set up `validate_global()` in CI + initial tolerated_violations file | 0.5 day | Runs every push, blocks on drift. |

The original "1 hour" claim was written for vanilla HTML before
the v1.4 widget vocabulary existed and before the ARIA mirror
was normative. **Read it as obsolete.** What survives is the
shape: NAC is still smaller than building a custom test
framework or scripting RPA per app, and an AI coding agent
genuinely compresses the per-screen work. The bottleneck moved
from typing to design-system discipline.

### Where NAC fits

| Best fit | Worst fit |
|---|---|
| Internal admin / ops apps with one team owning the UI | Consumer marketing site where ARIA alone is sufficient |
| AI-copiloted enterprise tools | Legacy app with deep ARIA + zero design-system layer |
| Codebases retiring a non-ARIA selector strategy (`data-testid`, etc.) | Apps whose interactive surface lives in closed shadow roots |
| Greenfield SaaS with selector-stable E2E testing as a product principle | Open-source component libraries that cannot impose a host-side primitive |

If the project is in the right column, ARIA + thoughtful
`data-testid` is a cheaper answer. NAC pays back when at least
one of "AI agent operation", "voice control", "RPA without
training" or "selector-free E2E" is a hard requirement.

### What will cause a rollout to fail

The v1.6 review converged on three abandonment causes, listed
in the order a real team will hit them:

1. **No design-system layer.** Every screen ends up wiring
   `data-nac-*` and `aria-*` separately; drift accumulates;
   CI starts blocking on known issues; team disables the
   validator; NAC quietly stops being maintained.
2. **Event timing wrong under async.** `nac:action:succeeded`
   fires after the optimistic UI update instead of after the
   server confirmation; agents observe a state that does not
   exist; trust collapses; team blames the contract.
3. **Reset provider treated as a one-liner.** Real plugins have
   modal stacks, filters, websocket subscriptions, third-party
   embeds. `NAC.reset()` with the generic fallback only clears
   `data-nac-*` fields; everything else stays dirty between
   runs; tests become flaky.

The corresponding chapters in [`docs/MANUAL.md`](docs/MANUAL.md)
("Design-system layer pattern", "Event correctness", "Reset
provider authoring") exist specifically to defuse these three.

---

## What NAC unlocks

- **AI-driven testing**: a Claude/GPT-Vision runner consumes the
  manifest, opens every screen, fills every field, dispatches every
  action, validates every event, and reports pass/fail -- without a
  human writing test scripts.
- **AI-driven user assistance**: a voice or chat assistant can pilot
  the UI on behalf of the user ("open patch manager, apply all
  pending"), reading state and reacting to errors.
- **RPA without training**: tools like Browser-use, Playwright AI,
  Cypress AI, Anthropic Computer Use, etc. read `data-nac-*`
  attributes and operate without app-specific scripting.
- **Vendor-portable QA**: external QA vendors test the system using
  only the manifest. No source-code access required.
- **Future-proof**: the same UI that a human uses today is what an
  agent will use tomorrow. No bespoke API to expose; the UI itself
  is the API.
- **Accessibility for people with disabilities**: NAC is positioned
  as agent infrastructure, but its real-world beneficiaries are
  humans whose access to the UI depends on assistive tools.
  - **Motor disabilities** -- voice control software (Talon, Voice
    Access, Dragon, browser voice modes) needs stable semantic IDs
    to map "click apply" to a button. NAC's `data-nac-id` +
    `label_i18n` is exactly that contract, deterministic across
    layouts and themes.
  - **Visual disabilities** -- ARIA exposes structure to screen
    readers; `NAC.describe()` adds a manifest-grade snapshot of
    every operable element with current state, localised label
    and pending confirms. Screen-reader users can navigate by
    intent instead of widget taxonomy.
  - **Cognitive disabilities + chronic illness** -- the agentic
    loop pattern (spec sec 9.1, 9.2) lets a user delegate
    multi-step work to an AI assistant in plain language. For
    users whose capacity varies day-to-day (chronic pain,
    fatigue, executive-function variation, ADHD, cognitive
    impairment), agentic delegation IS an accommodation.
  - **Auditability and agency** -- whatever an agent does via
    NAC, the user can also do via the same UI buttons +
    manifest. `NAC.snapshot_state()` plus the
    `nac:action:succeeded` event log makes every agent action
    auditable. There is no privileged backdoor; the agent is a
    proxy, not a substitute.

  See [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md#what-nac-does-for-people-with-disabilities)
  for the longer treatment of why agent infrastructure and
  accessibility infrastructure converge in the same contract.

## What v1.4 adds (May 2026)

Four navigation and ordering primitives that v1.0..v1.3 left
under-specified -- a v1.3 operator could already drive them via
generic `click` / drag-drop, but could not *recognise* them:

- **Breadcrumb** -- `role=breadcrumb / breadcrumb-item`, verb
  `navigate_to_crumb`, event `nac:breadcrumb:navigated { id,
  depth, path, target_depth }`. Driver:
  `NAC.list_breadcrumbs`, `NAC.navigate_breadcrumb(item_id)`.
  Hierarchy depth and parent-of-current-view are now
  first-class.
- **Carousel** -- `role=carousel / carousel-slide /
  carousel-dot`, states `playing | paused`, verbs
  `slide_next | slide_prev | slide_to | pause_autoplay |
  play_autoplay`. Driver: `carousel_advance`, `carousel_to`,
  `carousel_autoplay`, `carousel_state`. Closes the v1.1
  naming gap (where `slider` had been taken for numeric input).
- **Timeline / activity feed** -- `role=timeline /
  timeline-item`, states `live | static`, verbs `load_older |
  load_newer`, events `nac:timeline:item_clicked |
  scrolled_to | loaded_more | item_appeared`. Driver:
  `timeline_load_older`, `timeline_load_newer`. Distinct from
  `calendar-event` (anchored grid) and `pagination-control`.
- **Reorder-within-list** -- new verb `reorder` on existing
  v1.1 `draggable`, new event `nac:list:reordered { list_id,
  item_id, from_index, to_index }`. Disambiguates from cross-
  list drag-drop. Driver: `NAC.reorder(list_id, item_id,
  to_index)`.

Spec section 16 in [`spec/NAC-v1.0.md`](spec/NAC-v1.0.md).
Every v1.0 / v1.1 / v1.2 / v1.3 plugin remains valid v1.4
without modification. semver impact **MINOR**.

## What v1.3 adds (May 2026)

Sixteen primitive families that v1.0..v1.2 left under-specified
but every production app uses:

- **Toast / banner / alert** -- `NAC.toast(text, opts)` plus
  events `nac:toast:fired | dismissed` and a manifest-driven
  list of pending banners.
- **Toggle / switch** -- new `field_type="toggle"`, distinct
  from checkbox.
- **Stepper** -- `step_next / step_back / step_to`, events
  `nac:step:advanced | back | completed | error`.
- **Tree** -- hierarchical view with `tree_expand /
  tree_collapse / tree_select / tree_path`.
- **Calendar with events** -- `calendar_view |
  calendar_go_to | calendar_select_event |
  calendar_list_events`.
- **Rich text editor** -- `field_type="richtext"` plus
  `richtext_format / richtext_insert_link /
  richtext_insert_mention`.
- **Tag input** -- `field_type="tag-input"`, plus
  `add_tag / remove_tag / list_tags`.
- **Rating** -- `field_type="rating"` (`min` / `max` / `step` /
  `icon`).
- **Confirmation dialog** -- `NAC.confirm(prompt, opts) ->
  Promise<boolean>` plus the modal it builds.
- **Drawer / bottom-sheet** -- `open_drawer | close_drawer |
  peek_drawer`.
- **Pagination standalone** -- generalises v1.1's
  `pagination-control` to any list, not only tables.
- **Chart** -- `role=chart / chart-series / chart-point`,
  manifest array `charts[]`, `chart_toggle_series` +
  `chart_filter`.
- **Map** -- `role=map / map-marker / map-layer`, manifest
  array `maps[]`, `map_focus | map_select_marker |
  map_toggle_layer`.
- **Avatar + presence indicator** -- `role=avatar /
  presence-indicator` with states `online | away | busy |
  offline`.
- **Floating action button** -- `role=fab`.
- **Empty state + skeleton** -- distinguish "loading" from
  "nothing here yet". `role=empty-state / skeleton` with
  kinds `no-results | first-time | no-permission | error`.

Live demo: [`yujin.app/nac-spec/example-v13.php`](https://yujin.app/nac-spec/example-v13.php).
Spec section 15 in [`spec/NAC-v1.0.md`](spec/NAC-v1.0.md).
Every v1.0 / v1.1 / v1.2 plugin remains valid v1.3 without
modification. semver impact **MINOR**.

## What v1.2 adds (May 2026)

The spec is now at v1.2 and answers three questions early
readers raised about real-world UIs:

- **Dynamic dropdowns from JSON or DB tables.** A new
  `options_source: 'static' | 'dynamic' | 'remote'` on every
  field, plus driver functions `NAC.options(field_id)` and
  `NAC.search_options(field_id, query, limit)` for high-cardinality
  remote autocompletes. Three new lifecycle events
  (`nac:options:loading`, `nac:options:loaded`,
  `nac:options:invalidated`) so an agent can wait deterministically
  on the application's own fetch instead of polling the DOM.
  Live demo card on `example.php` (5000-city catalog with
  debounced server-side search).

- **Window chrome (minimize / maximize / restore / fullscreen).**
  Four new `data-nac-action` verbs, four new lifecycle events,
  three new `data-nac-state` values, four new driver functions on
  `window.NAC`. Agents that today cannot drive the corner buttons
  of a plugin window now can. Live demo on the same cards via the
  three chrome buttons in each card header.

- **First-contact discovery.** New `NAC.system_map()` returns the
  full navigation graph + capability inventory of the system.
  Manifests can declare per-view `transitions[]`. Stand-alone demo
  at `yujin.app/nac-spec/example-navmap.php`: an agent panel lands
  on three unknown plugins, calls `system_map()` once, plans a
  3-step task ("create order for Acme Corp, $1500, high"), and
  executes it via NAC primitives only -- no selectors, no DOM
  scraping, no human help.

Spec section 14 in `spec/NAC-v1.0.md` is the normative document.
Every v1.0/v1.1 plugin remains valid v1.2 without modification;
every v1.0/v1.1 operator continues to work against v1.2 plugins.
The semver impact is **MINOR**.

## Impact on RPA and automated testing

NAC has direct, measurable consequences for two industries that
today carry the cost of UI brittleness: RPA factories and QA
automation teams. In both cases the dominant operating expense
is repair, and most of the repair is selector maintenance. NAC
deletes that line item.

- **For RPA**: bots stop hunting for selectors and stop scraping
  pixels. They read `data-nac-id` and call `window.NAC.click()`.
  Quarterly breakage from minor UI updates -- the 15 to 30 percent
  number every RPA programme of scale lives with -- collapses to
  near zero. The platform tier (Orchestrator, vault, audit, BPM)
  stays; only the fragile last-mile selector layer goes away.
  Migration is incremental: NAC sits underneath the existing
  recorder, so you do not throw your factory away.
  Full argument in [`docs/IMPACT_RPA.md`](docs/IMPACT_RPA.md).

- **For automated testing**: tests assert on the application's own
  state model (`NAC.snapshot_state()`) and wait on the application's
  own lifecycle events (`NAC.wait_for('action:succeeded')`) instead
  of selectors and visual cues. Suites stop breaking on every
  redesign, every locale change, every CSS-in-JS class
  regeneration. Flake from race conditions stops existing because
  the contract is event-driven, not poll-driven. The
  `data-test=`/`data-cy=` parallel attribute layer is no longer
  needed: the same `data-nac-id` the bot uses is the one the test
  uses. End-to-end stops being the "never trust this" tier of the
  pyramid.
  Full argument in [`docs/IMPACT_TESTING.md`](docs/IMPACT_TESTING.md).

In both cases the cost of stability moves to where the change
originates: the front-end developer who re-styles the button is
the same person who maintains its `data-nac-id`. Cost lives where
information lives.

## NAC vs ARIA -- why we did not extend ARIA

The first reaction from any web-platform engineer is: "isn't this
just ARIA + custom events?" Short answer: ARIA covers part of the
problem, but a different audience and with deliberate scope limits
that exclude what NAC delivers. Both layers coexist on the same
DOM and a compliant element will carry attributes from each.

### What ARIA gives you

ARIA (W3C Accessible Rich Internet Applications) is the de facto
contract for **assistive technology aimed at human users without
sight**. It standardises ~50 attributes:

- `role` (button, dialog, listbox, combobox, tabpanel, slider, ...)
- `aria-label` / `aria-labelledby` / `aria-describedby` for text
  surrogates
- `aria-expanded` / `aria-checked` / `aria-pressed` /
  `aria-selected` / `aria-current` for binary states
- `aria-live` / `aria-atomic` / `aria-relevant` for announcements
- `aria-busy`, `aria-disabled`, `aria-hidden`, `aria-required`,
  `aria-invalid` for status
- `aria-controls`, `aria-owns`, `aria-flowto` for relationships

It is excellent for screen readers. We use it. NAC does not
replace it.

### What ARIA does not give you

Seven gaps that block AI-driven, voice-driven, and RPA-driven
operation of a UI:

1. **No stable, namespaced identifier.** ARIA reuses HTML `id`
   which is global, not namespaced per plugin, often missing, and
   often regenerated on re-render. NAC adds `data-nac-id` like
   `patch_manager.apply_all`, namespaced and stable.

2. **No verb semantics.** ARIA has `role="button"` but every
   button looks alike. An agent cannot distinguish *apply* from
   *submit* from *refresh* from *retry* from *cancel* from
   *discard*. NAC adds `data-nac-action="apply | submit | refresh
   | retry | cancel"`.

3. **No driver API.** ARIA is declarative-only by design; the WG
   has explicitly excluded an imperative API from its scope. Every
   automation tool (Selenium, Playwright, Cypress, Browser Use,
   Anthropic Computer Use) reinvents its own selector engine and
   click strategy. NAC publishes one: `NAC.click(id)`,
   `NAC.fill(id, val)`, `NAC.tab(plugin, tab)`,
   `NAC.snapshot_state()`. One call -- voice, chat, RPA, and AI
   agents share the same surface.

4. **No structured lifecycle events.** ARIA has `aria-busy="true"`
   as an attribute, not an event. To know when a long-running
   operation finished, a consumer has to poll the DOM. NAC emits
   `nac:action:dispatching -> succeeded | failed`,
   `nac:plugin:opening -> opened -> closing -> closed`,
   `nac:field:changed`, `nac:state:changed`. Consumers subscribe.

5. **No declarative manifest.** Each ARIA widget is self-contained
   in the DOM; there is no index a tool can read to know what
   actions exist before exploring the screen. NAC requires
   `manifest_nac` declared up front with `{kpis, actions, fields,
   tabs, rows, modes_supported}`. A workflow engine, an agent or a
   help system can introspect with `NAC.describe('patch_manager')`
   and act without ever rendering the UI.

6. **No "modes supported" concept.** ARIA cannot tell a tool
   whether a plugin can be opened maximised, in a new tab or in a
   new window. NAC declares `modes_supported: ['modal',
   'maximized', 'new_tab', 'new_window']`.

7. **High adoption cost.** ARIA defines ~50 attributes and 80+
   patterns in the WAI-ARIA Authoring Practices guide. Onboarding
   a *human* developer takes about a week. NAC is 5 attributes
   + 7 events + a small driver API; the relevant adoption metric
   is no longer human-developer time. NAC is designed to be
   applied by an AI coding agent that reads `AI_INSTRUCTIONS.md`
   + `CLAUDE.md` + `AGENTS.md` + `GEMINI.md` (all shipped in this
   repo) and instruments a screen in minutes. The implementer is
   the agent. The human role is review, not authoring. See spec
   section 1.5.2 for the authoritative framing.

### Different audiences, different requirements

| | Screen reader | Voice / chat / AI agent / RPA |
|---|---|---|
| Reads | Linear text in DOM order | Whatever the manifest declares, in any order |
| Wants | Announcements as state changes | Events to subscribe to with payloads |
| Needs | `role` + `label` to read aloud | `nac_id` + `verb` to dispatch programmatically |
| Operates | Keyboard, single-step | Programmatic, multi-step, branching |
| Recovers | "Press Tab and try again" | Reads `nac:action:failed` and decides |

**ARIA was designed for humans without sight. NAC was designed for
agents without hands.** Different audiences. Different
requirements. Both layers complement each other on the same DOM.

### Why we did not extend ARIA upstream

Three reasons:

1. **Scope mismatch.** The ARIA WG has explicitly excluded
   imperative APIs and structured custom events from its scope.
   `NAC.click()` and `nac:*` events are incompatible with the WG's
   declarative-only philosophy. Trying to upstream them would be
   rejected on principle.
2. **Iteration speed.** ARIA 1.2 shipped in 2023; ARIA 1.3 has
   been in working draft for 2+ years. The community needs an
   AI-driving contract today, not in 2028.
3. **Adoption cost.** Adding to ARIA's surface deepens the
   onboarding cliff. NAC is deliberately a smaller, parallel
   layer that an AI coding agent applies to a codebase in a
   single CI run. The human path through ARIA still exists for
   teams that want it; NAC's path is agent-first by design.

Once NAC has multiple production deployments and ports, a subset
may be proposed to the ARIA WG. Until then, NAC ships
independently under MIT and tracks its own version line.

### Coexistence example

A single element typically carries both layers:

```html
<button
  data-nac-id="patch_manager.apply_all"
  data-nac-role="action"
  data-nac-action="apply"
  data-nac-state="idle"
  role="button"
  aria-label="Apply all pending patches"
  aria-busy="false">
  Apply all
</button>
```

Five NAC attributes for the agent. Three ARIA attributes for the
screen reader. No conflict. No duplication of effort.

### One-line pitch

> NAC is to AI agents what ARIA is to screen readers.
> ARIA gives a blind user the audio map of your UI;
> NAC gives an AI agent the **operable** map.
> Same DOM, different audiences, complementary layers.

---

## NAC vs MCP -- agent as human vs agent as system

The Model Context Protocol (Anthropic, 2024-2026) is the modern
contract for exposing a system to LLMs as a server with typed
tools. It is excellent at what it does. **NAC and MCP are
complementary, not competing**: they sit on different layers and
answer different questions about *how* the agent reaches the
system.

The crucial design distinction:

- **MCP**: the agent reaches the system **as another system**.
  It connects to a server, calls typed tools, receives typed
  responses. The agent knows there is a backend; it knows the
  function names, the parameter shapes, the return types. It
  has privileged access by virtue of the API key or token.

- **NAC**: the agent reaches the system **as a human**. It
  opens the page, clicks buttons, fills fields, reads UI state.
  It does not know what is behind the buttons; it does not need
  to. Whatever the human user can do via the UI is exactly what
  the agent can do via NAC -- nothing more, nothing less.

| Question | MCP answer | NAC answer |
|---|---|---|
| How does the agent reach the system? | Backend API, server-to-server, typed tools | Frontend UI, click + fill, declarative attributes |
| What does the agent know? | Backend tool surface (function names, params, returns) | UI surface (plugins, actions, fields, states) |
| Permissions enforced where? | Re-implemented inside each MCP tool | Inherited from the existing UI permission gate |
| Audit identity | Service identity (linked to user out-of-band) | User identity (same login session as human) |
| Surface stability | Breaks when backend changes | Stable as long as UI keeps the same button |
| i18n / locale handling | Per-tool string handling | Free, from the UI |
| Best for | Server-to-server, batch jobs, headless reads, data pipelines | UI-driven assistance, voice/chat, RPA, automated UI tests |
| What disappears | The integration (no UI rendered) | The system (UI mediates invisibly) |

**Use both, layered**, in a real product:

- An assistant that **drafts an invoice** for the user uses NAC
  -- it fills the invoice form on the user's screen, leaving the
  human in the loop, with the same permissions and audit trail
  as the human would have.
- The same assistant, when asked to **summarise sales for the
  quarter**, uses MCP -- it queries a read-only sales server
  bypassing the UI because no UI mediation is needed for an
  aggregate read.

**Rule of thumb:**

- Acting on behalf of the user with permissions, audit, and
  identity? -> **NAC**.
- Reading data or running headless backend work? -> **MCP**.
- Both? -> **use both**, on the same agent.

The deeper point: principle 2 of NAC ("agent as human") is not
just a stylistic preference. It buys permission parity, audit
parity, locale parity, drift resistance, and zero-backdoor
surface -- all for free, by reusing the existing UI gate. MCP
cannot give those properties even in principle, because it
operates below the UI gate. The two protocols are answering
different design questions; a serious product needs both.

For the long-form treatment, including the six implications of
"agent as human" and what the principles rule out of NAC's
scope, see [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md).

---

## How it works

A compliant UI annotates its DOM with seven kinds of attributes:

```html
<div data-nac-plugin="patch_manager" data-nac-plugin-state="ready">
  <button data-nac-id="apply_all"
          data-nac-role="action"
          data-nac-action="apply"
          data-nac-state="idle"
          aria-label="Apply all pending patches">
    Apply all
  </button>
</div>
```

And exposes a programmatic API on the same page:

```js
await NAC.click('apply_all');
const snap = NAC.describe();
const errs = NAC.read_feedback();
```

That's it. Any external operator that knows the spec can drive the
UI -- no source code reading, no selector engineering.

## Compliance levels

| Level   | Pillars satisfied | Allowed in        |
|---------|-------------------|-------------------|
| NAC-0   | none              | -- (forbidden)    |
| NAC-1   | P1 + P2 + P3      | dev / sandbox     |
| NAC-2   | P1..P5            | sandbox / pre-prod|
| NAC-3   | P1..P7            | production        |

The seven pillars are defined in [spec/NAC-v1.0.md](spec/NAC-v1.0.md).

## Repository layout

```
nac-spec/
+-- spec/        normative document (v1.0)
+-- js/          reference JS implementation (zero deps)
+-- validator/   manifest <-> runtime DOM validator
+-- runner/      headless test runner (Python + Playwright)
+-- examples/    minimal example plugin + voice adapter
+-- docs/        guides + badge SVGs + registry template
+-- tests/       unit tests for the reference impl
+-- LICENSE
+-- AUTHORS
+-- README.md    you are here
```

## Quick start

### 1. Make a plugin compliant

Annotate the DOM:

```html
<form data-nac-plugin="contact_form" data-nac-plugin-state="ready">
  <input data-nac-id="email"
         data-nac-role="field"
         data-nac-field-type="text"
         data-nac-state="pristine"
         aria-label="Email address">

  <button data-nac-id="submit"
          data-nac-role="action"
          data-nac-action="submit">Send</button>
</form>
```

Register the manifest:

```js
NAC.register({
  plugin_slug: 'contact_form',
  version: '1.0.0',
  i18n_namespace: 'contact_form',
  fields:  [{ nac_id: 'email',  type: 'text',  required: true,
              label_i18n: 'contact_form.email' }],
  actions: [{ nac_id: 'submit', verb: 'submit',
              label_i18n: 'contact_form.submit' }],
});
```

Emit events:

```js
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  document.dispatchEvent(new CustomEvent('nac:action:dispatching',
    { detail: { plugin: 'contact_form', nac_id: 'submit' } }));
  try {
    await api.send(emailValue);
    document.dispatchEvent(new CustomEvent('nac:action:succeeded',
      { detail: { plugin: 'contact_form', nac_id: 'submit' } }));
  } catch (err) {
    document.dispatchEvent(new CustomEvent('nac:action:failed',
      { detail: { plugin: 'contact_form', nac_id: 'submit',
                  error: String(err) } }));
  }
});
```

That's NAC-3.

### 2. Operate it from outside

```js
await NAC.fill('email', 'me@example.com');
await NAC.click('submit');
const errs = NAC.read_feedback();
```

### 3. Auto-test it

```bash
cd runner/
python nac_runner.py --target http://localhost:3000 --plugin contact_form
# -> generates and runs smoke / field / action / tab / KPI tests
```

## Citation

```
NAC -- Native Accessibility Contract.
Spec v1.9.0 / runtime v1.9.0. 2026. MIT License.
Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, Sumi.
https://github.com/pkuschnirof/nac-spec
```

## Status

NAC v1.9 is **stable** (the v2.0 patch round; v2.0 cuts shortly
after the closing AI peer review pass). The first production
deployment ships with the Yujin CRM (yujin.app) Control Center
plugins; the public reference demo at
https://yujin.app/nac-spec/example.php exercises every primitive
in the spec (v1.0 piano + modal + form, v1.1 tabs + accordion +
combobox + slider + table + drag-drop, v1.2 remote autocomplete
+ window chrome + system map + section navigation, v1.3 toast +
banner + confirm + stepper + tree + tag-input + drawer +
calendar + chart + map + richtext, v1.4 breadcrumb + carousel +
timeline + reorder, v1.5 agentic chat loop with Claude Sonnet
primary + DeepSeek free fallback, v1.6 reset primitive +
sec 7.3.2 ARIA-NAC drift hard-error, v1.7 sec 6.2 canonical
event detail shapes, v1.8 ProvenanceBlock + command:rejected/
failed + skip-validate + a11y-hint + drag-types, v1.9 ARIA
bridge + braille label + HMAC signing + nac:action:confirm +
recommended_remediation + skip-reason + drag-type registry +
test harness + replay buffer + perf budget). May 2026.

## Contributing

This is an open standard. Forks, suggestions, language ports
(Python, Swift, Kotlin, Rust, Go) are welcome via pull request. The
spec is intentionally minimal; new attribute types or roles MUST go
through a spec PR with at least one production reference deployment.

## Supporting NAC

NAC is built and maintained by one person (Pablo Adrian Kuschniroff)
who needs to eat to keep shipping. If your team or company adopts
NAC and wants the maintainer to keep building, porting the runtime
to other languages, and responding to issues, here is how to keep
that work funded:

- **Polar.sh** (recurring + one-time sponsorship, single checkout
  with all 5 options):
  https://buy.polar.sh/polar_cl_mqEuONOGSTr3bn9P8XSQRRFryST2htj4xDv1p0nNDJW
  - Supporter $5/mo -- recognition in `CONTRIBUTORS.md`
  - Backer $25/mo -- + GitHub badge, recognition across launch
  - Sponsor $100/mo -- + logo in README, priority issue triage
  - Enterprise $500/mo -- + 1h call/month + adoption support
  - One-time sponsor $25+ -- single contribution, enterprise PO,
    bug bounty, conference tip

- **GitHub Sponsors** (waitlist; will activate when GitHub approves
  the maintainer's setup): https://github.com/sponsors/pkuschnirof

- **Commercial adoption help**: pablo.kuschnirof@gmail.com

- **Yujin** (the production showcase using NAC end-to-end --
  buy a SaaS subscription if NAC's contract is what your team
  needs in production tomorrow): https://yujin.app

The spec stays MIT regardless. The funding rails above exist to
keep the maintainer working on NAC instead of selling time
elsewhere -- not as a paywall.

## Related work

- **ARIA / WAI-ARIA (W3C)** -- the dominant accessibility contract.
  See the dedicated "NAC vs ARIA" section above for the detailed
  comparison and coexistence pattern.
- **HTML5 native semantics** (`<button>`, `<dialog>`,
  `<details>`, `<input type="...">`) -- adequate for built-in
  widgets. NAC fills the gap when an app ships custom widgets that
  HTML5 cannot describe.
- **WebDriver BiDi (W3C, in-flight)** -- low-level browser
  protocol for testing automation. Pairs with NAC: BiDi delivers
  the transport, NAC the semantic contract above the DOM.
- **Model Context Protocol (MCP, Anthropic)** -- spec for LLMs to
  call server-side tools. Complementary, not competing: MCP =
  "this server exposes these functions"; NAC = "this UI is
  operable by these actions".
- **Microsoft UIA / Apple Accessibility / AccessKit** -- desktop
  OS-level accessibility frameworks. Different platform target.
- **Playwright `getByRole` / Cypress semantic locators** -- test
  library abstractions over ARIA. They are consumers; NAC is the
  layer the apps emit.

NAC sits at the intersection: client-side, multi-driver
(voice / chat / AI / RPA / a11y), declarative + imperative,
adoption-light. None of the above covers all five attributes.
