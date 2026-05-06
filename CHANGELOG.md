# Changelog

All notable changes to NAC (Native Accessibility Contract) are documented
in this file.

This project adheres to [Keep a Changelog 1.1](https://keepachangelog.com)
and uses [Semantic Versioning 2.0.0](https://semver.org).

Versioning conventions for the spec:

- **MAJOR**  -- breaking changes to the public API contract or to existing
  `data-nac-*` attribute semantics. Existing NAC-3 plugins MUST be
  re-audited.
- **MINOR**  -- new pillars, new roles, new attributes added without
  breaking existing plugins. Existing NAC-3 plugins remain valid.
- **PATCH**  -- clarifications, doc updates, reference-impl bug fixes,
  test additions, badge tweaks. No public-API change.

---

## [Unreleased]

### Added

- **Spec section 14.7** -- "Section navigation (page-level
  landmarks)". `data-nac-role="section"` plus
  `data-nac-id="page.section.<slug>"` plus optional
  `data-nac-label`. New driver functions
  `NAC.list_sections()` and `NAC.go_to_section(id)`. New event
  `nac:section:reached`. Reference impl wires an
  IntersectionObserver per section so visibility flips emit
  `nac:state:changed` automatically. Lets a voice or chat
  operator say "go to the pricing section" and the page does
  the right thing -- expand, switch tab if needed, scroll,
  settle.
- **Reference impl `js/nac.js`** bumped to 1.2.1: section
  driver functions + observer.

### Demo

- **`yujin.app/nac-spec/example.php`** (cache buster v4):
  - Every top-level `<section>` (intro, demos grid, wizard,
    chat, manifest panel) now carries `data-nac-role="section"`
    + `data-nac-id="page.section.<slug>"`.
  - New "Self-test & introspect" card added before the events
    log. Five buttons:
    - **Show navmap** -- inline `NAC.system_map()` JSON.
    - **Show capabilities** -- inline `NAC.capabilities()`
      JSON.
    - **List sections** -- `NAC.list_sections()` rendered as
      `id  [visible|hidden]  label`.
    - **Run NAC self-test** -- in-browser version of the
      Python runner. Walks every registered plugin, exercises
      the first 3 actions + first 2 fields per plugin, plus
      6 static gap rules (R1 button without nac-id, R2 plugin
      root without manifest, R3 field without field-type,
      R4 section without label, R5 page section without role,
      R6 action without verb). Outputs a per-test breakdown
      plus an expandable gap report inline.
    - **AI agent: tour the page** -- discovers plugins via
      `system_map()`, walks every section via
      `go_to_section()`, exercises one action per plugin,
      narrating in the chat panel via `botSpeak`.
  - Self-test card carries minimize / maximize / restore
    chrome buttons like the other v1.2 cards.

### Documented

- **CHANGELOG** notes Self-test panel + AI agent tour as
  Demo additions.

### Demo (continued)

- **18-step wizard.** `yujin.app/nac-spec/example.php`
  (cache buster v5): the guided tour now covers v1.0
  primitives (piano + modal + form, steps 1-8), v1.1 widgets
  (tabs / accordion / combobox / slider / table, steps 9-13)
  and v1.2 widgets (remote autocomplete + chrome minimize +
  system map + section navigation, steps 14-17). Step 18 is
  the terminal. Each step is validated via the matching NAC
  event: `nac:tab:changed`, `nac:section:expanded`,
  `nac:slider:value_changed`, `nac:plugin:minimized`,
  `nac:section:reached`, etc. The wizard listens to twelve
  event types (was four).
- **Autopilot extended** to drive all 17 actionable wizard
  steps end-to-end: piano notes -> modal -> form fill ->
  switch tab -> expand accordion -> pick country ->
  raise slider -> sort table -> remote autocomplete ->
  minimize -> fetch system map -> go to chat section. Closes
  with a one-line summary in the assistant chat.

## [1.2.0] - 2026-05-06

Strict superset of v1.1. Every v1.0/v1.1 plugin remains valid;
every v1.0/v1.1 operator continues to work. Adds three
capability blocks the public spec was asked about by early
readers:

- **A** -- dropdowns whose options come from JSON or DB tables
  (including high-cardinality remote autocompletes).
- **B** -- plugin window chrome: minimize, maximize, restore,
  fullscreen.
- **C** -- first-contact discovery: an agent connecting to an
  unknown system can call `NAC.system_map()` once and obtain a
  complete navigation tree + capability inventory before
  acting.

### Added

- **Spec section 14** -- "Discoverability and dynamic data
  extensions (v1.2, normative)". Strict superset of sections
  1-13.
- **4 new verbs** in `data-nac-action`: `minimize`, `maximize`,
  `restore`, `toggle_fullscreen`.
- **3 new state values** on plugin roots: `minimized`,
  `maximized`, `normal` (the four-way set
  `minimized | maximized | normal | fullscreen` is mutually
  exclusive).
- **4 new lifecycle events** on `document`, bubbling:
  `nac:plugin:minimized`, `nac:plugin:maximized`,
  `nac:plugin:restored`, `nac:plugin:fullscreen_changed`.
- **3 new options events** on `document`, bubbling:
  `nac:options:loading`, `nac:options:loaded`,
  `nac:options:invalidated`.
- **8 new driver API functions** on `window.NAC`:
  `options(field_id)`, `search_options(field_id, query, limit?)`,
  `invalidate_options(field_id, reason?)`,
  `set_options_resolver(plugin, field_id, fn)`,
  `minimize(plugin)`, `maximize(plugin)`, `restore(plugin)`,
  `fullscreen(plugin, on?)`.
- **4 new discovery functions** on `window.NAC`:
  `system_map()`, `capabilities()`,
  `set_system_map_provider(fn)`, `set_capabilities_provider(fn)`.
- **3 new manifest extensions** on `fields[]`:
  `options_source` (`static | dynamic | remote`),
  `depends_on: [field_id]`, `search_supported: true`,
  `min_chars`.
- **1 new manifest extension** on the manifest root:
  `transitions: [{to_view, via_action, conditions?,
  side_effects?}]` -- per-view edges of the navigation graph.
- **Error namespace** `NAC.errors` with stable codes:
  `RemoteSourceRequiresSearch`, `OptionsUnavailable`,
  `SystemMapNotProvided`, `CapabilitiesNotProvided`.
- **Compliance level NAC-3 v1.2** defined. A v1.0/v1.1 plugin
  MAY claim NAC-3 v1.0/v1.1 (baseline) without v1.2 conformance.

### Demo

- **`yujin.app/nac-spec/example.php`** -- two new cards added:
  Remote autocomplete (5000-city catalog with debounced
  search, `options_source=remote`, full options-event flow)
  and System map (buttons that call `NAC.system_map()` and
  `NAC.capabilities()` and pretty-print the result). Both
  cards carry minimize / maximize / restore window-chrome
  buttons exercised through `NAC.minimize/maximize/restore`.
  Asset cache buster bumped to `v3`.
- **`yujin.app/nac-spec/example-navmap.php`** (new) -- a
  separate scenario page: an "agent panel" lands on three
  unknown plugins (inventory, customers, orders), calls
  `NAC.system_map()` once to discover the graph, then plans
  and executes a 3-step task ("create order for Acme Corp,
  $1500, high priority") via NAC.search_options + NAC.fill +
  NAC.click + NAC.wait_for. No selectors. No DOM scraping.
  All NAC events are observed live in the right-hand log.
- **`js/nac.js`** reference impl bumped from 1.0.0 / spec 1.0
  to 1.2.0 / spec 1.2. ~280 LOC added across options
  resolvers, chrome verbs, and discovery providers. Still
  zero dependencies. Still ASCII-pure.

### Documented

- **`docs/IMPACT_RPA.md`** (new) -- long-form treatment of how
  NAC changes the economics of an RPA factory. Covers the
  selector-driven status quo, the five concrete savings (no
  more selector hunting, no more redesign breakage, no more
  flake, no more screenshot scraping, no more double
  maintenance with QA), an incremental migration path from an
  existing UiPath / Automation Anywhere / Power Automate
  factory, and the comparative table against XPath, image/OCR,
  vision-LLM agents and recorders.
- **`docs/IMPACT_TESTING.md`** (new) -- parallel treatment for
  QA automation. Covers what stops being a test problem under
  NAC (selector maintenance, race-condition flake,
  localisation breakage, theme/redesign breakage,
  cross-framework portability), what NAC explicitly does NOT
  change (unit tests, visual regression, accessibility audits,
  performance), the migration path for an existing
  Playwright/Cypress/Selenium suite, and the test-pyramid
  reshape that follows.
- **`README.md`** -- "Impact on RPA and automated testing"
  section pointing at the two new docs; badge bumped to v1.2.
- **`docs/MANUAL.md`** -- "Testing with the runner" section
  cross-references `IMPACT_TESTING.md` and `IMPACT_RPA.md`.

### Migration

- A v1.0/v1.1 plugin is valid v1.2 without modification.
- A v1.0/v1.1 operator parses a v1.2 plugin without crashing
  (unknown verbs treated as opaque, unknown manifest fields
  silently skipped, unknown events ignored).
- A v1.2 operator drives a v1.0/v1.1 plugin without retrofit:
  absent `options_source` is read as `static`, absent
  `transitions[]` is read as a leaf view, absent system map +
  capabilities downgrades to per-view planning.
- semver impact: **MINOR**. No breaking change.

## [1.1.0] - 2026-05-06

Strict superset of v1.0. Every v1.0 plugin is still valid; every
v1.0 operator still works. Adds vocabulary for nine widget
families that v1.0 left under-specified.

### Added

- **Spec section 13** -- "Widget extensions (v1.1, normative)".
  Strict superset of sections 1-12 covering tabs (formalised),
  accordions, sliders, comboboxes, datepickers, sortable /
  filterable / paginated tables, drag-and-drop, file uploads,
  tooltips, popovers, and notifications.
- **15 new roles** in P2 vocabulary: `tablist`, `tabpanel`,
  `accordion-section`, `slider`, `dropzone`, `draggable`,
  `drop-target`, `tooltip-trigger`, `tooltip-content`,
  `popover-trigger`, `popover-content`, `sort-control`,
  `filter-control`, `pagination-control`, `notification`.
- **9 new field-types**: `combobox`, `multi-select`, `range`,
  `time`, `date-range`, `color`, `email`, `tel`, `url`. The
  pre-existing v1.0 `multi` remains valid; `multi-select` is the
  formalised name.
- **22 new events** across 8 widget families (tabs lifecycle,
  accordion section, slider, datepicker, drag-and-drop, dropzone
  / file upload, table operations, tooltips and popovers,
  notifications). All under the `nac:*` namespace.
- **12 new driver API functions** on `window.NAC`: `expand`,
  `collapse`, `pick_date`, `set_slider`, `sort`, `filter`,
  `go_to_page`, `drag_drop`, `upload_file`, `show_tooltip`,
  `hide_tooltip`, `show_popover`, `hide_popover`. Implementations
  MAY route some through `fill` or `click` internally; the
  contract only requires the named function and the
  corresponding event.
- **6 optional manifest extensions** for capability
  introspection: `accordion_sections`, `sliders`, `tables`,
  `drag_zones`, `dropzones`, `notifications_channel`.
- **7 new state values**: `expanded`, `collapsed`, `dragging`,
  `drop-target-over`, `uploading`, `sorting`, `filtering`.
- **Compliance level NAC-3 v1.1** defined. A v1.0 plugin MAY
  claim NAC-3 v1.0 (baseline) without v1.1 conformance.

### Documented

- **`docs/PHILOSOPHY.md`** -- long-form treatment of the two
  product principles that produced NAC ("the system disappears"
  + "the agent acts as a human, not as another system"), the
  six implications of principle 2, the full NAC vs MCP
  comparison, and what the principles rule out of NAC's scope.
- **Spec section 1.5** -- "Rationale -- why not just ARIA"
  added as part of the normative document. Lists the seven gaps
  NAC closes, the scope mismatch with the ARIA WG, and the
  coexistence pattern.
- **Spec section 1.6** -- "The two principles that produced
  NAC" added (normative). Constrains future spec extensions:
  any addition that violates either principle is out of scope.
- **Spec section 1.7** -- "NAC vs MCP -- complementary
  contracts" added (normative). Codifies the layered usage rule
  so adopters do not treat NAC and MCP as competing.
- **`README.md`** -- new top-level "The thesis in two
  principles" section + extended "NAC vs ARIA" section + new
  "NAC vs MCP" section with comparison table.
- **`docs/MANUAL.md`** -- "Mental model" reframed around the
  two principles + new "NAC vs ARIA -- when to use what" section
  with decision matrix and coexistence pattern.

### AI tooling

- `AI_INSTRUCTIONS.md` (new, canonical at repo root) -- single
  source of truth for AI coding assistants working with NAC.
  Templates for attributes, events, manifest, decision order,
  anti-patterns.
- Vendor-specific instruction files at the conventions each
  tool respects: `CLAUDE.md` (Anthropic Claude Code),
  `GEMINI.md` (Google Gemini Code Assist), `AGENTS.md` (OpenAI
  Operator / Aider / Devin / multi-agent), `.cursorrules`
  (Cursor), `.windsurfrules` (Codeium Windsurf), and
  `.github/copilot-instructions.md` (GitHub Copilot). Each
  file references `AI_INSTRUCTIONS.md` as canonical.

### Changed

- Spec header section: "Spec version" updated from v1.0 to v1.1
  (extends v1.0; sections 1-12 unchanged).
- Glossary entry for `NAC` now reads "Native Accessibility
  Contract" (formerly "Navegabilidad Automatica Compliance").
  Both expansions refer to the same contract; the English form
  is canonical for the public spec, the Spanish form is
  preserved as the original drafting name.

### Migration

- A v1.0 plugin is valid v1.1 without modification.
- A v1.0 operator parses a v1.1 plugin without crashing
  (unknown roles -> `region`, unknown field-types -> `text`,
  unknown events -> ignored).
- A v1.1 operator drives a v1.0 plugin without retrofit (v1.1
  driver functions degrade to v1.0 equivalents when v1.1
  manifest entries are absent).
- semver impact: **MINOR**. No breaking change.

## [1.0.1] - 2026-05-05

### Fixed

- `js/nac.js` `_serializeElement` label resolver: when an element has
  no `aria-label` and no associated `<label for=>`, NAC now walks into
  the element looking for `[data-nac-role=label]`, `.yj-kpi-label`,
  `.yj-tab-label`, or trims the elements own `textContent` (capped 80
  chars). Pure observability fix; P6 still requires `aria-label` on
  interactive elements -- the resolver only improves serialization for
  display-only nodes whose label is not an a11y target.
- Validated against yujin.app/crm Patch Manager mvp60 plugin. NAC SCORE
  22/22.

## [1.0.0] - 2026-05-05

### Added

- Initial public release. Spec normative document
  (`spec/NAC-v1.0.md`) defines the seven pillars:
  - **P1** stable identity (`data-nac-id`).
  - **P2** roles + semantics (`data-nac-role`,
    `data-nac-field-type`, `data-nac-action` verbs).
  - **P3** state exposed (`data-nac-state`,
    `data-nac-error`).
  - **P4** events published (`nac:action:dispatching` /
    `succeeded` / `failed`, `nac:tab:changed`,
    `nac:field:changed`).
  - **P5** programmatic API (`window.NAC.describe / list / find /
    click / fill / select / tab / wait_for / read_feedback /
    screenshot / validate`).
  - **P6** i18n + a11y (`I18n.t` for every visible string,
    `aria-label`, WCAG AA contrast, `role="tab"` +
    `aria-selected`).
  - **P7** manifest declared (`manifest_nac` enumerates fields,
    actions, tabs, kpis, rows, charts; validator
    `NAC.validate(slug)` MUST pass at runtime).
- Reference JavaScript implementation `js/nac.js` (439 LOC, zero
  dependencies, MIT licensed).
- Practical authoring + operating + testing manual
  (`docs/MANUAL.md`).
- MIT License with citation request honoring Pablo Kuschnirof + Sumi
  (the AI partner).
- First production deployment: yujin.app/crm Centro de Control
  (Patch Manager + Plan tiles, NAC-3 verified).

### Reference deployments

- yujin.app/crm Centro de Control -- NAC-3 in production since
  2026-05-05 (Patch Manager mvp60 SCORE 22/22, Plan tile NAC-3
  certified).

[Unreleased]: https://github.com/pkuschnirof/nac-spec/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/pkuschnirof/nac-spec/releases/tag/v1.0.0
