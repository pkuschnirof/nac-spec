# NAC v1.0 -- Navegabilidad Automatica Compliance

> A design norm for user interfaces that lets AI agents, voice
> assistants, RPA bots and automated test runners navigate, fill,
> operate and verify the system as if they were human users -- without
> reading the source code, without fragile selectors, without manual
> test scripts.

**Status**: Stable.
**Version**: 1.2 (extends v1.1 which extends v1.0; sections 1-13 unchanged).
**Date**: 2026-05-06.
**Authors**: Pablo Kuschnirof (lead), Sumi (collaboration).
**License**: MIT.

---

## 1. Why NAC exists

Modern software UIs are built for humans first and machines second. As
a result:

- Automated tests rely on fragile CSS selectors that break on every
  refactor.
- AI assistants cannot reliably operate a UI on behalf of the user.
- RPA bots require costly per-app training and maintenance.
- Coverage of E2E test suites rarely exceeds 50% because writing
  specs manually does not scale with feature velocity.
- Voice control requires bespoke wiring per surface.

NAC reverses the polarity: a UI that complies with NAC v1.0 publishes
its own contract -- semantic IDs, roles, states, events, and a
programmatic API -- so any AI agent or automation tool can introspect,
operate and verify it without privileged access. Compliant systems are
testable end-to-end at near-100% coverage with auto-generated specs
plus AI-guided exploration. Non-compliant systems are not.

The norm is platform-agnostic: it can be implemented in any web or
native UI stack that reaches a DOM-like accessible tree. This document
describes the contract; reference implementations live in `js/`,
`validator/`, and `runner/` of this repository.

---

## 1.5. Rationale -- why not just ARIA

ARIA (Accessible Rich Internet Applications, W3C) is the dominant
contract for UI accessibility. It targets one audience: human users
operating UIs through assistive technology, primarily screen readers.
NAC targets a different audience: autonomous operators (AI agents,
voice runners, RPA bots, AI-driven test runners) operating UIs
programmatically.

Both layers MAY be present on the same DOM element. ARIA covers what
a screen reader needs; NAC covers what an autonomous operator needs.
The two contracts are complementary, not competing.

NAC is intentionally NOT a superset of ARIA, nor an extension of
ARIA, for three reasons:

1. **Scope mismatch.** The ARIA Working Group has explicitly
   excluded imperative driver APIs and structured custom-event
   contracts from its scope; ARIA is declarative-only by design.
   NAC's `NAC.click()` / `NAC.fill()` / `NAC.snapshot_state()`
   functions and the `nac:*` event family are incompatible with
   that philosophy.

2. **Evolution speed.** ARIA 1.2 shipped in 2023; ARIA 1.3 has
   been in working draft for 2+ years. The ecosystem of AI-driven
   automation tooling needs a contract today, not in 2028.

3. **Adoption cost.** ARIA defines ~50 attributes plus 80+
   patterns in WAI-ARIA Authoring Practices. Onboarding a
   developer takes about a week. NAC v1.0 is 5 attributes,
   7 events, and 5 driver functions. Onboarding takes about an
   hour. A smaller surface keeps the contract adoptable for the
   long tail of apps that have neither budget nor expertise to
   onboard ARIA.

The seven gaps that NAC addresses, which ARIA does not:

| Gap | What ARIA gives | What NAC adds | Why it matters for autonomous operators |
|---|---|---|---|
| Stable, namespaced ID | `id` (HTML, global, often regenerated) | `data-nac-id="plugin.element"` (namespaced per plugin, stable across re-renders) | An agent must address the same element across renders without colliding with sibling plugins |
| Verb semantics | `role="button"` | `data-nac-action="apply | submit | refresh | retry | cancel | discard"` | An agent must distinguish *apply* from *submit* from *refresh* without parsing button labels |
| Driver API | None (declarative-only by WG decision) | `NAC.click(id)`, `NAC.fill(id, val)`, `NAC.tab(plugin, tab)`, `NAC.snapshot_state()` | One call surface multi-consumer (voice, chat, RPA, AI agent, test runner) |
| Lifecycle as events | `aria-busy="true"` (state attribute) | `nac:action:dispatching | succeeded | failed`, `nac:plugin:opening | opened | closing | closed`, `nac:field:changed`, `nac:state:changed` | Consumers SUBSCRIBE to events with payloads instead of polling DOM mutations |
| Declarative manifest | Each ARIA widget is self-contained in DOM; no index | `manifest_nac` declared up front with `{kpis, actions, fields, tabs, rows, modes_supported}` | An agent or workflow engine introspects with `NAC.describe(plugin)` BEFORE rendering, enabling planning |
| Modes supported | None | `modes_supported: ['modal', 'maximized', 'new_tab', 'new_window']` | An agent decides where to open the plugin without trial-and-error |
| Adoption surface | ~50 attributes + 80+ patterns, ~1 week onboarding | 5 attributes + 7 events + 5 functions, ~1 hour onboarding | The long tail of apps gets coverage |

**The single-line distinction**: ARIA is to screen readers what
NAC is to AI agents. ARIA gives a blind user the audio map of a
UI; NAC gives an autonomous operator the *operable* map. Same
DOM, different audiences, complementary layers.

A compliant element in production typically carries both layers:

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

Five NAC attributes for the autonomous operator, three ARIA
attributes for the screen reader. No conflict, no duplication of
concept.

Once NAC has multiple production deployments and ports to other
languages, a subset MAY be proposed to the ARIA WG as an
imperative companion specification. Until then, NAC ships
independently under MIT and tracks its own version line.

---

## 1.6. The two principles that produced NAC

NAC is the technical consequence of two product principles. They
are stated here as part of the normative document because they
constrain every shape decision in the spec; an extension that
violates either principle is out of scope.

### Principle 1 -- The system disappears

A modern UI exists because a human needs to do work. The UI is
not the work. The UI is the surface through which the work
happens. A well-built system gets out of the user's way -- and,
by extension, out of any operator's way.

NAC takes this principle seriously and applies it to non-human
operators. If the UI is transparent for the human, it MUST be
transparent for any operator -- voice, chat, AI agent, RPA bot,
automated test -- that acts on behalf of a human or alongside
one. That requires a contract that the UI publishes and any
operator consumes uniformly, on the surface of the UI itself.

This produces the technical decisions:
- attributes ON the DOM (not behind a separate metadata file),
- events emitted ON the page (not behind a separate transport),
- `window.NAC` exposed to whoever loads the page (not gated by
  authentication).

### Principle 2 -- The AI agent acts as a human, not as another system

When an AI agent operates a system on behalf of a user, NAC
mandates that it goes through the same path the human takes. It
uses the same buttons, the same forms, the same modals, the same
permission gates, the same audit trail. There is no privileged
backend API and no service-identity bypass.

Whatever the human user can do via the UI is exactly what the
agent can do via NAC -- nothing more, nothing less. The contract
exposes the *surface* of the human's ability, not the *interior*
of the system's capability.

This produces six concrete properties for free:

1. **Permission parity.** The agent is gated by the same role
   check that gates the human. The button is the permission;
   clicking it inherits the gate.
2. **Audit parity.** The agent's actions appear in the audit
   trail under the same user identity, indistinguishable from
   the human's.
3. **i18n / locale parity.** A button that translates to
   "Aceptar" / "OK" / native script is one `data-nac-id`. The
   agent operates uniformly across locales.
4. **Drift resistance.** When a backend changes endpoint, schema
   or shape, an agent driving via NAC keeps working as long as
   the UI keeps the button. The contract lives at the surface,
   not at the boundary.
5. **No backdoor surface.** The agent goes through login + MFA +
   session lifecycle. There is no privileged service identity
   to leak.
6. **The system disappears for the agent too.** The agent does
   not know the backend; it acts through the UI. The backend is
   free to be refactored, sharded, or replaced as long as UI
   semantics stay.

### What this rules out

The principles forbid certain extensions to the spec:

- **NAC will not standardise direct backend access.** That is
  MCP's job (see section 1.7).
- **NAC will not standardise pixel scraping.** Reading
  screenshots is the antithesis of "the system disappears".
- **NAC will not standardise selector engines, XPath, CSS-path
  recipes.** Those exist because contracts failed; NAC IS the
  contract.
- **NAC will not introduce per-vendor extensions to its
  vocabulary.** Vendors that need their own surface should use
  a sibling namespace (`data-vendor-*`), not pollute NAC's.

For the full philosophical treatment see
`docs/PHILOSOPHY.md`.

---

## 1.7. NAC vs MCP -- complementary contracts

The Model Context Protocol (MCP) is the modern contract for
exposing a system to LLMs as a server with typed tools. NAC and
MCP are complementary, not competing; they sit on different
layers and answer different design questions.

### The crucial distinction

- **MCP**: the agent reaches the system **as another system**.
  It calls typed tools on a server, knows the backend function
  shape, has privileged access via API key.
- **NAC**: the agent reaches the system **as a human**. It
  operates the UI through the same path the human takes. It
  does not know the backend; it does not need to.

### Comparison table

| Question | MCP answer | NAC answer |
|---|---|---|
| Reach | Backend, server-to-server | Frontend UI, page-level |
| Knows | Tool surface (function names, params, returns) | UI surface (plugins, actions, fields, states) |
| Permissions | Re-implemented per tool | Inherited from UI gate |
| Audit | Service identity | User identity |
| Drift | Breaks on backend change | Stable while UI keeps the button |
| i18n | Per-tool handling | Free, from the UI |
| Best for | Server-to-server, batch, headless reads | UI-driven assistance, voice/chat, RPA, UI tests |

### Layered usage

A serious product uses both protocols, layered:

- Acting on behalf of the user with permissions and audit -> NAC.
- Reading data or running headless backend work -> MCP.
- Both, in the same agent -> use both.

NAC does not fold MCP into its surface, and MCP does not fold
NAC into its surface. They are sibling contracts at different
abstraction layers.

---

## 2. Terminology

- **Plugin**: any self-contained UI surface that follows the contract.
  In a SPA, a plugin is typically a modal, drawer, or routed view. In
  a desktop app, a plugin is a window or panel. In a mobile app, a
  plugin is a screen.
- **Element**: any interactive or informative DOM node addressable by
  the contract: a form field, a button, a tab, a row, a KPI, a chart,
  a region.
- **Manifest**: the JSON document that a plugin publishes describing
  every element it exposes. Source of truth for runtime validation
  and test generation.
- **Operator**: any external agent (human assistant, AI model, RPA
  bot, test runner) that operates the UI through the NAC API.

---

## 3. The seven pillars (P1..P7)

A UI surface that claims compliance with NAC v1.0 MUST satisfy all
seven pillars listed below. The compliance level (NAC-1 / NAC-2 /
NAC-3) declares how many pillars are satisfied (see section 6).

### P1 -- Stable identity

Every navigable element MUST expose `data-nac-id` containing a
semantic, stable, plugin-namespaced identifier.

- Semantic: human-readable, expresses intent (`apply_all`, not
  `btn_3`).
- Stable: identical across re-renders, page refreshes, theme switches,
  locale changes.
- Plugin-namespaced: scoped under `data-nac-plugin` attribute on the
  plugin root, so identical IDs in different plugins do not collide.
- Not auto-generated, not UUID, not timestamp-derived.

```html
<div data-nac-plugin="patch_manager" data-nac-state="ready">
  <button data-nac-id="apply_all" data-nac-role="action">Apply all</button>
  <input  data-nac-id="log.search" data-nac-role="field" data-nac-field-type="text">
</div>
```

### P2 -- Roles and semantics

Every NAC-tagged element MUST declare `data-nac-role` from the
canonical vocabulary:

| Role                  | Purpose                                          |
|-----------------------|--------------------------------------------------|
| `view`                | Top-level routed view                            |
| `region`              | Logical group inside a plugin                    |
| `field`               | Input control accepting user data                |
| `action`              | Button / link that dispatches an operation       |
| `tab`                 | Tab strip member                                 |
| `row`                 | Repeating list/table row                         |
| `cell`                | Cell inside a row                                |
| `kpi`                 | Read-only metric card                            |
| `chart`               | Visualization                                    |
| `toolbar`             | Filter / search / sort container                 |
| `feedback`            | Toast, alert, inline error                       |
| `modal-mode-button`   | Visualization mode switcher (modal/max/tab/win)  |

Fields MUST also declare `data-nac-field-type` from:

`text` `number` `date` `datetime` `select` `multi` `checkbox` `radio`
`file` `signature` `geo` `barcode` `richtext` `password`

Actions MUST declare `data-nac-action` with a verb identifier
(`submit`, `cancel`, `apply`, `retry`, `refresh`, `next`, `prev`,
`delete`, `confirm`, `dismiss`, etc.). The verb is plugin-internal,
human-readable, and matches the manifest entry.

### P3 -- State exposed

Every NAC-tagged element MUST expose its current state through
`data-nac-state` from:

`idle` `loading` `disabled` `invalid` `success` `error` `dirty`
`pristine` `empty` `ready`

Validation errors MUST expose `data-nac-error` containing a stable
i18n key plus the localized message. Example:

```html
<input data-nac-id="email" data-nac-role="field" data-nac-field-type="text"
       data-nac-state="invalid"
       data-nac-error="cc.users.email_invalid|Email no valido">
```

The plugin root MUST expose `data-nac-plugin-state` from:
`loading` `ready` `error` `empty` `partial`.

### P4 -- Published events

Plugins MUST emit standardized events on `document`. The event name
follows `nac:{category}:{phase}`. Required event payload shape:

```js
{ plugin: 'patch_manager', nac_id: 'apply_all', value?: any,
  error?: string, timestamp: 1714904100123 }
```

Required events:

| Event                       | When                                       |
|-----------------------------|--------------------------------------------|
| `nac:plugin:opening`        | Plugin starts mounting                     |
| `nac:plugin:opened`         | Plugin reached `ready` state               |
| `nac:plugin:closing`        | Plugin starts unmounting                   |
| `nac:plugin:closed`         | Plugin fully removed                       |
| `nac:field:focused`         | Focus on a field                           |
| `nac:field:changed`         | Field value changed by user or programmatic|
| `nac:field:validated`       | Validation completed (success or error)    |
| `nac:action:dispatching`    | Action click started side effect           |
| `nac:action:succeeded`      | Side effect completed without error        |
| `nac:action:failed`         | Side effect failed                         |
| `nac:tab:changed`           | Active tab switched                        |
| `nac:row:selected`          | Row selected/clicked                       |
| `nac:feedback:shown`        | Toast / alert / inline message rendered    |

Operators MAY listen to these events to drive workflows. Implementors
MAY add custom events under the same namespace without breaking
compliance.

### P5 -- Programmatic API

Compliant systems MUST expose `window.NAC` (or equivalent global in
non-browser contexts) implementing this contract:

```typescript
interface NAC {
  describe(): NacSnapshot;
  list(role?: NacRole): NacElement[];
  find(nac_id: string): NacElement | null;
  click(nac_id: string): Promise<NacResult>;
  fill(nac_id: string, value: any): Promise<NacResult>;
  select(nac_id: string, option: string | string[]): Promise<NacResult>;
  tab(plugin: string, tab_key: string): Promise<NacResult>;
  read_feedback(): NacFeedback[];
  wait_for(event: string, timeout_ms?: number): Promise<NacEvent>;
  screenshot(): Promise<string>;        // base64 PNG / SVG
  snapshot_state(): NacStateSnapshot;
  manifest(plugin?: string): NacManifest | NacManifest[];
  set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void;
}
```

The API MUST resolve `nac_id` first inside the active plugin, then
fall back to global lookup. Operations on missing IDs MUST throw a
typed `NacError` containing `code: 'not_found' | 'disabled' |
'invalid' | 'timeout'`.

### P6 -- i18n + accessibility

NAC does not replace ARIA -- it complements it. Every element with a
`data-nac-id` MUST also expose:

- `aria-label` (or `aria-labelledby`) containing the localized,
  human-readable label.
- For inputs: associated `<label for="...">` or `aria-labelledby`.
- For tabs: `role="tab"` and `aria-selected`.
- For modals: `role="dialog"` and a working focus trap.

Color contrast MUST meet WCAG AA. NAC linters MAY enforce this.

### P7 -- Manifest declared

Every plugin MUST publish a `manifest_nac` object describing its
entire NAC surface. The manifest is:

- Static at registration time (declarative, JSON-serializable).
- Available via `NAC.manifest(plugin_slug)`.
- Validated by the NAC runtime against the rendered DOM. Drift
  (manifest declares an ID not present in DOM, or DOM emits an ID not
  declared in manifest) is a CI blocker.

Manifest schema:

```typescript
interface NacManifest {
  plugin_slug: string;          // unique within the host system
  version: string;              // semver of the plugin
  i18n_namespace: string;       // e.g. 'cc.patch_manager'
  needs_admin?: boolean;
  size_hint?: 'small'|'medium'|'large'|'auto';
  fields:   NacField[];
  actions:  NacAction[];
  tabs?:    NacTab[];
  kpis?:    NacKpi[];
  rows?:    NacRowDef;
  charts?:  NacChart[];
  modes_supported?: ('modal'|'maximized'|'new_tab'|'new_window')[];
}

interface NacField {
  nac_id: string;
  type: 'text'|'number'|'date'|'datetime'|'select'|'multi'|
        'checkbox'|'radio'|'file'|'signature'|'geo'|
        'barcode'|'richtext'|'password';
  required?: boolean;
  options?: string[] | { value: string, label_i18n: string }[];
  validation?: { regex?: string, min?: number, max?: number };
  label_i18n: string;
}

interface NacAction {
  nac_id: string;
  verb: string;
  label_i18n: string;
  destructive?: boolean;
  needs_confirm?: boolean;
}

interface NacTab {
  nac_id: string;
  label_i18n: string;
  default_active?: boolean;
}

interface NacKpi {
  nac_id: string;
  label_i18n: string;
  unit?: string;
  format?: 'integer'|'decimal'|'percent'|'currency'|'duration';
}

interface NacRowDef {
  nac_id: string;
  cells: { nac_id: string, label_i18n: string,
           format?: NacKpi['format'] }[];
  actions?: NacAction[];   // per-row actions
}
```

---

## 4. Lifecycle and cardinality

A plugin in NAC has the following observable lifecycle:

```
[register]   --> manifest_nac exposed via NAC.manifest()
[opening]    --> mount started; data-nac-plugin-state='loading'
[opened]     --> data-nac-plugin-state='ready' or 'empty';
                 nac:plugin:opened fired
[interact]   --> any combination of fill / click / tab / select
[closing]    --> nac:plugin:closing
[closed]     --> plugin removed from DOM; nac:plugin:closed
```

Multiple plugin instances MAY coexist (e.g. two modals stacked). NAC
addresses them with a synthetic `instance_id` appended to operations
when ambiguous: `NAC.click('apply_all', { plugin: 'patch_manager',
instance_id: 'i_2' })`.

---

## 5. Security boundaries

NAC is a UX contract, NOT an authorization mechanism. The presence of
`data-nac-id="delete_user"` on the page does not grant the operator
permission to call it -- the server still checks the JWT and admin
key on the underlying request.

Compliant systems MUST:

- Never expose secrets in `data-nac-*` attributes.
- Never trust `NAC.click` / `fill` more than they trust the
  equivalent human action -- the operator runs in the same browser
  context with the same session.
- Treat `NAC.set_mode('new_tab')` / `('new_window')` as inheriting
  the parent session via shared origin storage. Cross-tab logout
  must propagate (see `examples/cross_tab_logout.md`).

---

## 6. Compliance levels

| Level   | Pillars satisfied | Allowed in            |
|---------|-------------------|-----------------------|
| NAC-0   | none              | -- (forbidden)        |
| NAC-1   | P1 + P2 + P3      | dev / sandbox only    |
| NAC-2   | P1..P5            | sandbox / pre-prod    |
| NAC-3   | P1..P7            | production            |

A plugin's compliance level is the minimum of:
- The lowest pillar number where the plugin still satisfies all prior.
- The result of the validator on the latest CI run.

Implementors MAY publish a public `NAC_REGISTRY.md` listing every
plugin's level. This repository's own systems do exactly that under
`docs/NAC_REGISTRY.md`.

The official NAC badge image (SVG) is published under
`docs/badge/nac-{level}.svg` for embedding in READMEs.

---

## 7. Operator semantics

Operators interact with compliant systems following these guarantees:

1. **Idempotent reads**: `describe`, `list`, `find`, `manifest`,
   `snapshot_state`, `read_feedback`, `screenshot` produce no side
   effects.
2. **Awaitable writes**: `click`, `fill`, `select`, `tab`,
   `set_mode` return promises that resolve only after the
   corresponding event fires. Timeouts default to 5000 ms and MAY be
   tuned via `NAC.config.default_timeout_ms`.
3. **State observability**: after any write, `snapshot_state` MUST
   reflect the new state before the next operator step starts.
4. **Failure visibility**: when an operation fails (`nac:action:
   failed`, validation error, missing element), `NAC.read_feedback()`
   MUST return a structured payload describing the failure. Silent
   failures are non-compliant.

---

## 8. Test generation contract

Compliant systems enable automated test generation. A NAC-aware
runner MAY consume the manifest and produce, without manual scripting:

- **Smoke tests**: each plugin opens, reaches `ready`, no
  `nac:action:failed` events fire spontaneously.
- **Field tests**: each field accepts a valid value, rejects an
  invalid value, emits the right validation event.
- **Action tests**: each action dispatches and either succeeds
  idempotently or surfaces a structured error.
- **Tab tests**: every tab activates, switches `data-nac-state`, fires
  `nac:tab:changed`.
- **KPI tests**: every KPI renders a non-null value matching its
  declared format.
- **Row CRUD**: when `rows` is declared, create/edit/delete cycles
  exercise the row actions and assert backend state via the system's
  own data API.

Reference runner lives in `runner/` of this repository.

---

## 9. Voice and natural language

Voice operators MAY map a transcribed utterance to NAC operations
using the manifest's `label_i18n` fields and the active locale. NAC
v1.0 does not mandate a specific NLU pipeline -- any model that
consumes the manifest and returns a structured `NacOp` is compliant.

A reference voice-to-NAC adapter is provided in
`examples/voice_to_nac.md`.

---

## 10. Compatibility and versioning

NAC follows semver:

- **MAJOR**: breaking changes to the API or attribute names.
- **MINOR**: new pillars or roles added without breaking existing
  plugins.
- **PATCH**: clarifications, doc updates, non-normative additions.

Plugins MAY declare the NAC version they target via
`manifest_nac.nac_version`. Runtimes MUST refuse to validate plugins
whose declared version is newer than the runtime supports.

---

## 11. Trademark and citation

NAC and the badge logo are unregistered trademarks of the authors
released under MIT. Forks and derivatives are encouraged. Citation:

```
NAC v1.0 -- Navegabilidad Automatica Compliance.
Pablo Kuschnirof, Sumi. 2026. MIT License.
https://github.com/<TBD-after-publish>/nac-spec
```

---

## 12. Glossary of acronyms

- **NAC**: Native Accessibility Contract (formerly Navegabilidad
  Automatica Compliance, the Spanish phrasing the spec was
  drafted under; both expansions refer to the same contract).
- **RPA**: Robotic Process Automation.
- **WCAG**: Web Content Accessibility Guidelines.
- **ARIA**: Accessible Rich Internet Applications.
- **MCP**: Model Context Protocol (Anthropic, 2024-2026).
- **i18n**: internationalization.

End of NAC v1.0 baseline normative content.

---

## 13. Widget extensions (v1.1, normative)

This section EXTENDS sections 1-12 with vocabulary for widgets
that v1.0 left under-specified. All v1.0 content above is
unchanged. A NAC-1.0 plugin is a valid NAC-1.1 plugin without
modification; v1.1 is a strict superset.

The extensions cover nine widget families that a real product
ships routinely and that an autonomous operator must drive
identically to a human: tabs (formalised), accordions, sliders,
comboboxes (autocomplete), datepickers, sortable / filterable /
paginated tables, drag-and-drop, file uploads, tooltips and
popovers.

### 13.1. New roles

The role vocabulary in P2 (section 3) is extended with:

| Role                  | Purpose                                          |
|-----------------------|--------------------------------------------------|
| `tablist`             | Container holding `tab` members. Was implicit in v1.0; now formal |
| `tabpanel`            | Panel revealed when its associated tab is active |
| `accordion-section`   | Collapsible section with header + body          |
| `slider`              | Continuous numeric input with min/max bounds     |
| `dropzone`            | File drop target                                 |
| `draggable`           | Item that can be picked up and moved             |
| `drop-target`         | Container that accepts a `draggable`             |
| `tooltip-trigger`     | Element that, when hovered or focused, surfaces a tooltip |
| `tooltip-content`     | The tooltip body                                 |
| `popover-trigger`     | Element that, when activated, surfaces a popover |
| `popover-content`     | The popover body                                 |
| `sort-control`        | Column header that toggles sort direction        |
| `filter-control`      | Input or chip that constrains a list/table      |
| `pagination-control`  | Page selector for a list/table                  |
| `notification`        | Toast / banner / inline alert addressed to the operator |

A plugin MAY use any subset of these; an operator MUST be able
to discover the inventory through `manifest_nac` (section 13.5).

### 13.2. New field types

The field-type vocabulary in P2 (section 3) is extended with:

| `data-nac-field-type` | Semantics                                        |
|-----------------------|--------------------------------------------------|
| `combobox`            | Single-value text field with autocomplete suggestions |
| `multi-select`        | Multi-value picker with chips (clarifies v1.0 `multi`) |
| `range`               | Continuous numeric (paired with `role="slider"`) |
| `time`                | Time-of-day, separated from `date`               |
| `date-range`          | Pair of dates (start + end)                      |
| `color`               | Hex / rgb color picker                            |
| `email`               | Subtype hint of `text` for email validation     |
| `tel`                 | Subtype hint of `text` for phone numbers         |
| `url`                 | Subtype hint of `text` for URLs                   |

The pre-existing v1.0 types remain valid. Operators that do not
recognise a v1.1 type MUST treat it as `text` and emit
`nac:field:changed` with the raw value.

### 13.3. New events

The event vocabulary in P4 (section 3) is extended with:

#### Tab lifecycle (formalised)

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:tab:switching`      | Precedes `nac:tab:changed` so consumers can run transition logic |
| `nac:tab:changed`        | Already in v1.0; unchanged                   |

#### Accordion section

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:section:expanding`  | Section starts opening                       |
| `nac:section:expanded`   | Section fully open                            |
| `nac:section:collapsing` | Section starts closing                        |
| `nac:section:collapsed`  | Section fully closed                          |

#### Slider

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:slider:value_changed` | Value changed by user or programmatic. Implementations SHOULD debounce continuous drags to ~16 ms or fire only on final release |

#### Datepicker (built on top of `nac:plugin:*`)

A datepicker MUST emit `nac:plugin:opening | opened | closing |
closed` for the picker overlay using the field's nac_id as the
plugin slug, plus the field-changed event:

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:datepicker:date_picked` | A date or date-range was committed. Detail carries `value` as ISO 8601 |

#### Drag and drop

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:drag:started`       | A `draggable` is picked up                    |
| `nac:drag:over`          | The dragged item enters a `drop-target`. Detail carries `from_nac_id` and `over_nac_id` |
| `nac:drag:dropped`       | The dragged item is released over a valid `drop-target`. Detail carries `from_nac_id`, `target_nac_id`, and `value` |
| `nac:drag:cancelled`     | Drag aborted (Esc, drop on invalid target)    |

#### Dropzone / file upload

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:dropzone:drag_over` | File hovers over the dropzone                 |
| `nac:dropzone:dropped`   | File released on the dropzone                 |
| `nac:file:added`         | File queued for processing                    |
| `nac:file:upload_progress` | Progress tick. Detail carries `bytes_sent`, `bytes_total`, `pct` |
| `nac:file:upload_completed` | Upload finished successfully. Detail carries `file_id` (server-assigned) |
| `nac:file:upload_failed` | Upload failed. Detail carries `error`        |

#### Table operations

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:table:sort_changed` | Sort column or direction changed. Detail carries `column_nac_id`, `direction: 'asc' \| 'desc' \| 'none'` |
| `nac:table:filter_changed` | A filter applied or cleared. Detail carries `filter_nac_id`, `value`, `cleared: bool` |
| `nac:table:page_changed` | Page number changed. Detail carries `page_n`, `page_size`, `total_pages` |

#### Tooltips and popovers

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:tooltip:shown`      | Tooltip became visible                        |
| `nac:tooltip:hidden`     | Tooltip dismissed                             |
| `nac:popover:shown`      | Popover opened (treat as transient plugin sub-region) |
| `nac:popover:hidden`     | Popover closed                                |

#### Notifications

| Event                    | When                                          |
|--------------------------|-----------------------------------------------|
| `nac:notification:posted` | A notification appeared. Detail carries `severity: 'info' \| 'success' \| 'warning' \| 'error'`, `text`, `notification_nac_id` |
| `nac:notification:dismissed` | The user or the operator dismissed a notification |

### 13.4. New driver API functions

The `window.NAC` interface in P5 (section 3) is extended with:

```typescript
interface NAC {
  // v1.0 functions unchanged.

  // Accordion
  expand(section_nac_id: string): Promise<NacResult>;
  collapse(section_nac_id: string): Promise<NacResult>;

  // Datepicker -- shorthand. Equivalent to NAC.fill with an
  // ISO 8601 string, but emits nac:datepicker:date_picked
  // explicitly so consumers can wait for it.
  pick_date(field_nac_id: string,
            iso_date: string | { from: string; to: string }
            ): Promise<NacResult>;

  // Slider -- shorthand for NAC.fill on a numeric range field.
  set_slider(field_nac_id: string, value: number): Promise<NacResult>;

  // Sortable / filterable / paginated tables
  sort(table_nac_id: string,
       column_nac_id: string,
       direction: 'asc' | 'desc' | 'none'): Promise<NacResult>;
  filter(table_nac_id: string,
         filter_nac_id: string,
         value: any | null /* null clears */): Promise<NacResult>;
  go_to_page(table_nac_id: string, page_n: number): Promise<NacResult>;

  // Drag and drop
  drag_drop(source_nac_id: string,
            target_nac_id: string): Promise<NacResult>;

  // File upload
  upload_file(dropzone_nac_id: string,
              file: File | Blob | { name: string; data: ArrayBuffer }
              ): Promise<NacResult>;

  // Tooltips / popovers (programmatic surfacing)
  show_tooltip(trigger_nac_id: string): Promise<NacResult>;
  hide_tooltip(trigger_nac_id: string): Promise<NacResult>;
  show_popover(trigger_nac_id: string): Promise<NacResult>;
  hide_popover(trigger_nac_id: string): Promise<NacResult>;
}
```

Implementations MAY route some of the new functions through
`fill` or `click` internally; the spec only mandates that the
named function is callable and that the corresponding event from
section 13.3 is emitted as a side effect. Operators MAY use
either path.

### 13.5. Manifest extensions

The `manifest_nac` shape in P7 (section 3) is extended with
optional inventories that let an operator discover capabilities
without DOM scraping:

```typescript
interface NacManifest {
  // v1.0 fields unchanged: plugin_slug, version, nac_version,
  // i18n_namespace, modes_supported, kpis, actions, fields,
  // tabs, rows.

  // v1.1 additions, all optional:
  accordion_sections?: Array<{
    nac_id: string;
    label_i18n: string;
    default_state?: 'expanded' | 'collapsed';
  }>;

  sliders?: Array<{
    nac_id: string;
    min: number;
    max: number;
    step?: number;
    unit?: string;            // e.g. "%", "px", "MB"
    label_i18n: string;
  }>;

  tables?: Array<{
    nac_id: string;
    label_i18n: string;
    columns: Array<{
      nac_id: string;
      label_i18n: string;
      sortable: boolean;
      filterable: boolean;
      filter_type?: 'text' | 'select' | 'date-range' | 'number-range';
    }>;
    pagination?: { page_size: number; default_page: number };
  }>;

  drag_zones?: Array<{
    nac_id: string;
    label_i18n: string;
    accepts: string[];        // nac_id prefixes of valid sources
  }>;

  dropzones?: Array<{
    nac_id: string;
    label_i18n: string;
    accept_mime?: string[];   // e.g. ["image/*", "application/pdf"]
    max_size_bytes?: number;
    multi?: boolean;
  }>;

  notifications_channel?: {
    nac_id: string;          // the region where notifications surface
    severities: Array<'info' | 'success' | 'warning' | 'error'>;
  };
}
```

A NAC-1.0 manifest without these fields is valid as NAC-1.1.

### 13.6. State extensions

The state vocabulary in P3 (section 3) is extended with:

| `data-nac-state` value | Applies to                          |
|------------------------|-------------------------------------|
| `expanded`             | accordion-section, popover, tooltip |
| `collapsed`            | accordion-section                   |
| `dragging`             | draggable while picked up           |
| `drop-target-over`     | drop-target while drag is over it   |
| `uploading`            | dropzone, file row during upload    |
| `sorting`              | sort-control while reorder pending  |
| `filtering`            | filter-control while query pending  |

Pre-existing v1.0 states (`idle`, `active`, etc.) remain valid
and apply across the new roles.

### 13.7. Compliance level for v1.1

A plugin claiming **NAC-3 v1.1** MUST:

1. Satisfy NAC-3 baseline (P1..P7 of v1.0).
2. For every widget it ships from the families above (tabs,
   accordions, sliders, etc), declare the appropriate role from
   13.1, emit the appropriate events from 13.3, and include the
   appropriate manifest entries from 13.5.
3. Implement the corresponding driver functions from 13.4 if
   the widget is operated programmatically (e.g. a sortable
   table MUST support `NAC.sort()`).

A plugin MAY claim **NAC-3 v1.0** (baseline only) and ship some
v1.1 widgets without their formal roles -- it remains valid v1.0
but is not v1.1-compliant.

### 13.8. Backwards compatibility commitment

Every v1.1 addition is **additive**. A v1.0 operator parses a
v1.1 plugin without crashing: unknown roles are treated as
`region`, unknown field-types are treated as `text`, unknown
events are ignored. A v1.1 operator drives a v1.0 plugin
without retrofit: the v1.1 driver functions degrade to existing
v1.0 functions when the v1.1 manifest entries are absent.

The semver impact of v1.1 is **MINOR**. Any future change that
removes or repurposes a v1.0 attribute, event, or function will
require **MAJOR** (v2.0).

End of NAC v1.1 normative document.

---

## 14. Discoverability and dynamic data extensions (v1.2, normative)

This section is normative. It is a strict superset of v1.1 (and
therefore of v1.0). Every v1.0 plugin and every v1.1 plugin remains
valid; every v1.0/v1.1 operator continues to work. The additions
in this section are MOTIVATED by three real-world scenarios that
v1.0 and v1.1 left under-specified:

- A. Dropdowns whose options come from a JSON catalog or a
  database table -- often with thousands of entries, often
  filtered by what the user already typed elsewhere on the form.
- B. Plugin window chrome -- the minimize / maximize / restore
  buttons that today live in the application's frame and are
  invisible to NAC.
- C. First-contact discovery -- an agent connecting to a system
  it has never seen, needing to know what views exist, how they
  connect, and what capabilities the system has, BEFORE acting.

Every addition below is namespaced (`options:`, `plugin:` for the
new lifecycle events; `system:` for discovery) and additive. Any
v1.0/v1.1 operator that does not implement v1.2 will see the new
attributes/events as unknown and ignore them per section 13.8.

### 14.1. Dynamic option resolution (scenario A)

#### 14.1.1. Manifest extensions

A `fields[]` entry MAY declare an `options_source` shape. Three
values are normative:

- `static` -- the options are enumerable now, in the manifest,
  under `options[]`. This is the v1.0/v1.1 default and MUST stay
  the assumption when `options_source` is absent.
- `dynamic` -- the options are computable now, but the application
  generates them client-side (filtering an in-memory catalog,
  derived from another field's value). The agent MUST NOT trust
  any `options[]` array in the manifest as authoritative; it
  MUST call `NAC.options(field_id)` to obtain the current set.
- `remote` -- the options are server-fetched, typically large
  cardinality, typically with a search input. The agent SHOULD
  NOT call `NAC.options(field_id)` (it would download the full
  set); it MUST call `NAC.search_options(field_id, query, limit)`
  to obtain a candidate list.

A `fields[]` entry MAY declare `depends_on: [field_id, ...]`.
This signals to the agent that changing any listed field
invalidates the option set on this field. A v1.2-compliant
operator that changed any field listed in `depends_on` MUST
either re-fetch the options or rely on the application emitting
`nac:options:invalidated` (see 14.1.3).

A `fields[]` entry MAY declare `search_supported: true`. This
signals that the application implements a server-side search
endpoint reachable through `NAC.search_options`. The presence
of `search_supported: true` REQUIRES `options_source` to be
either `dynamic` or `remote`.

Example manifest entry for a "select customer" combobox backed
by a customers table:

```json
{
  "id": "deal.customer",
  "role": "field",
  "field_type": "combobox",
  "label": "Customer",
  "options_source": "remote",
  "search_supported": true,
  "min_chars": 2
}
```

Example for a "select province" select that depends on country:

```json
{
  "id": "address.province",
  "role": "field",
  "field_type": "select",
  "label": "Province",
  "options_source": "dynamic",
  "depends_on": ["address.country"]
}
```

#### 14.1.2. Driver functions

The reference implementation MUST expose:

- `NAC.options(field_id) -> Promise<Option[]>` where `Option`
  is `{ value: string, label: string, disabled?: boolean,
  group?: string }`. Resolves with the current full option set
  for `field_id`. For `static` sources this returns the manifest
  array synchronously-wrapped. For `dynamic` it triggers the
  client-side computation and returns the resulting list. For
  `remote` it MUST throw `NAC.errors.RemoteSourceRequiresSearch`
  -- the agent must use `search_options` instead.

- `NAC.search_options(field_id, query, limit?) ->
  Promise<Option[]>` Issues the same fetch the application uses
  for autocomplete. `limit` defaults to 10. The implementation
  SHOULD debounce identical queries within 200 ms. Resolves with
  the candidates ranked by the application's own scoring.

Both functions resolve quickly when the answer is cached. Both
MAY reject with `NAC.errors.OptionsUnavailable` when the source
is offline; agents SHOULD retry once with backoff.

#### 14.1.3. Events

Three new events are normative on `document`, `bubbles: true`:

- `nac:options:loading` -- detail: `{ field_id, source, query? }`.
  Fired when an options fetch starts (whether triggered by the
  agent via `options`/`search_options`, or by the user typing in
  the combobox).
- `nac:options:loaded` -- detail: `{ field_id, source, query?,
  count }`. Fired when the fetch resolved successfully.
- `nac:options:invalidated` -- detail: `{ field_id, reason,
  trigger_field_id? }`. Fired when a previously-cached option
  set is no longer authoritative (a `depends_on` field changed,
  the user clicked "refresh", a TTL expired). Operators MUST
  discard cached results and re-query before next use.

A v1.2-compliant operator MAY chain `wait_for("options:loaded")`
between `fill(country)` and `fill(province)` to make the
sequence deterministic.

### 14.2. Window chrome and viewport state (scenario B)

#### 14.2.1. New verbs

Four new verbs are added to the `data-nac-action` value space:

- `minimize` -- collapse the plugin to its taskbar / dock
  representation. The plugin remains running.
- `maximize` -- expand the plugin to fill the available viewport.
- `restore` -- return the plugin to its previous, non-minimized,
  non-maximized geometry.
- `toggle_fullscreen` -- enter or leave OS-level fullscreen
  (typically `requestFullscreen()` on the plugin root).

Plugins SHOULD expose these as separate `data-nac-action`
buttons in the plugin chrome (header bar). Plugins MAY ship a
single button that cycles through states, in which case
`data-nac-action` MUST reflect the action that the next click
will perform, and MUST update on each transition.

#### 14.2.2. New states

Three new values are added to the `data-nac-state` value space,
applied to the plugin root element:

- `minimized` -- plugin is collapsed.
- `maximized` -- plugin fills the viewport.
- `normal` -- plugin is at its default user-resized geometry.

Mutually exclusive: a plugin root MUST carry exactly one of
`minimized | maximized | normal | fullscreen` at any moment.

#### 14.2.3. New events

Three new events are normative:

- `nac:plugin:minimized` -- detail: `{ plugin, prior_state }`.
- `nac:plugin:maximized` -- detail: `{ plugin, prior_state }`.
- `nac:plugin:restored` -- detail: `{ plugin, prior_state }`.
- `nac:plugin:fullscreen_changed` -- detail: `{ plugin,
  fullscreen: boolean }`.

These fire AFTER the geometry transition has settled.
`prior_state` is one of the four state values listed in 14.2.2.

#### 14.2.4. Driver functions

- `NAC.minimize(plugin)` -- minimizes the named plugin window.
  Resolves with the new state.
- `NAC.maximize(plugin)` -- maximizes the named plugin window.
- `NAC.restore(plugin)` -- restores to `normal`.
- `NAC.fullscreen(plugin, on?)` -- if `on` is omitted, toggles;
  otherwise sets fullscreen to the boolean.

All four resolve when the corresponding lifecycle event has
fired, or reject after a 2 s timeout.

### 14.3. System discovery and navigation map (scenario C)

This is the most consequential addition in v1.2. It lets an
agent connect to a NAC system for the first time and obtain a
mental model of what exists, how it connects, and what it can
do, BEFORE driving anything.

The model has three layers, ordered by completeness. A
v1.2-compliant system SHOULD expose at least one. An agent that
finds none of them MAY still operate the system view by view
using v1.0/v1.1 primitives, but it cannot plan multi-view
sequences.

#### 14.3.1. Layer A -- system map (precomputed)

A v1.2-compliant system MAY expose:

- `NAC.system_map() -> Promise<SystemMap>` where:

```
SystemMap = {
  views: ViewSummary[],
  transitions: Transition[],
  capabilities: CapabilityInventory,
  generated_at: ISO8601,
  ttl_seconds: number
}

ViewSummary = {
  id: string,
  label: string,
  parent_view?: string,
  reachable_from: string[],
  manifest_url?: string,
  fields_count: number,
  actions_count: number,
  tabs_count: number,
  required_permissions?: string[]
}

Transition = {
  from_view: string,
  to_view: string,
  via_action: string,
  conditions?: { field?: string, value?: string }[],
  side_effects?: string[]
}

CapabilityInventory = {
  entities: { slug, label, verbs[] }[],
  actions: { id, label, verbs[] }[],
  reports?: { slug, label }[],
  dashboards?: { slug, label }[],
  integrations?: { slug, label }[],
  languages?: string[]
}
```

The system map MUST be a snapshot consistent at
`generated_at`. Operators MUST treat it as stale after
`ttl_seconds` and re-fetch.

#### 14.3.2. Layer B -- per-view transitions (crawlable)

If the precomputed map is absent, a v1.2-compliant manifest MAY
declare its outgoing edges:

```json
{
  "id": "patch_manager",
  "label": "Patch Manager",
  "transitions": [
    {
      "to_view": "patch_detail",
      "via_action": "open_patch",
      "conditions": [{"field": "patch_id", "required": true}]
    },
    {
      "to_view": "settings",
      "via_action": "open_settings"
    }
  ]
}
```

An operator that lacks `system_map` MAY crawl by calling
`NAC.describe()`, recording transitions, then traversing each
edge. This is breadth-first navigation discovery.

#### 14.3.3. Layer C -- capability inventory (catalog only)

A v1.2-compliant system MAY expose:

- `NAC.capabilities() -> Promise<CapabilityInventory>`

This is the minimum useful answer to "what can this system do?"
when the agent does not need (or cannot afford) the full
navigation graph. It returns the same `CapabilityInventory`
shape from 14.3.1, without the views or transitions.

Sources for the inventory in a typical implementation are the
project's own registry layer -- entity registry, workflow action
catalog, sidebar / mokuji table, plugin manifest list. The spec
does NOT prescribe how to assemble it; only its shape.

#### 14.3.4. The three layers are layered, not exclusive

An agent SHOULD probe in order: A, then B, then C. The first
positive response wins. A system that exposes A SHOULD also
expose C (cheap), MAY skip B (subsumed). A system that exposes
only B forces breadth-first crawling. A system that exposes
only C limits the agent to single-view planning.

A reference implementation of all three layers, drawing the
data from a `mokuji` (navigation registry) table plus per-view
manifests, is available in the public repository under
`runner/system_map_reference.py`.

### 14.4. Errors and conventions

A new error namespace `NAC.errors` is normative for v1.2:

- `NAC.errors.RemoteSourceRequiresSearch` -- raised by
  `NAC.options(field_id)` when the field's `options_source` is
  `remote`.
- `NAC.errors.OptionsUnavailable` -- raised when an options
  fetch fails after retries.
- `NAC.errors.SystemMapNotProvided` -- raised by
  `NAC.system_map()` when no system map endpoint is registered.
- `NAC.errors.CapabilitiesNotProvided` -- raised by
  `NAC.capabilities()` when no inventory endpoint is registered.

Errors are plain `Error` subclasses with a stable `code`
property matching the name (`code: 'RemoteSourceRequiresSearch'`)
so non-JS hosts can switch on them.

### 14.5. NAC-3 v1.2 compliance level

A plugin claiming **NAC-3 v1.2** MUST:

1. Satisfy NAC-3 v1.1 (and therefore v1.0).
2. For every dynamic dropdown / autocomplete it ships, declare
   `options_source` and `depends_on` in the manifest, and emit
   `nac:options:loading` + `nac:options:loaded` per fetch.
3. For every plugin window with chrome controls (minimize /
   maximize / restore / fullscreen), declare the verbs in
   `data-nac-action` and emit the matching events.
4. Either expose `NAC.system_map()`, or declare `transitions[]`
   on every manifest, or expose `NAC.capabilities()`.

A v1.2 operator drives a v1.0/v1.1 plugin without retrofit:
absence of `options_source` is read as `static`; absence of
`transitions[]` is read as a leaf view; absence of system map
plus capabilities downgrades the agent to per-view planning.
The semver impact of v1.2 is **MINOR**.

### 14.6. Backwards compatibility commitment

Every v1.2 addition is additive. A v1.1 operator parses a v1.2
plugin without crashing: unknown verbs (`minimize`, etc) are
treated as opaque actions, unknown events are ignored, the new
manifest fields (`options_source`, `depends_on`,
`search_supported`, `transitions`) are silently skipped. A v1.2
operator drives a v1.1 plugin without retrofit per the
degradations above.

### 14.7. Section navigation (page-level landmarks)

A NAC-compliant page MAY tag its top-level page sections (the
narrative blocks a human user scrolls between) with:

- `data-nac-role="section"`.
- `data-nac-id="page.section.<slug>"`. The `page.section.`
  prefix is normative -- it lets operators distinguish landmark
  sections from plugin-internal regions.
- `data-nac-label="<i18n key or human label>"`. Optional; when
  absent, the operator falls back to the section's first
  heading text.
- `data-nac-state="visible" | "hidden"`. The operator updates
  this on the IntersectionObserver boundary.

A v1.2 reference implementation MUST expose:

- `NAC.go_to_section(id) -> Promise<void>` -- smooth-scrolls to
  the named section, dispatches `nac:section:reached`. If the
  section is in a collapsed accordion or in another tab, the
  implementation SHOULD expand / switch first, then scroll.
- `NAC.list_sections() -> { id, label, visible }[]` -- the
  page's section roster, in DOM order.

A new event:

- `nac:section:reached` -- detail: `{ section_id, label }`.
  Fired AFTER scroll has settled.

The motivation: a voice or chat operator can say "go to the
pricing section" and the page does the right thing -- expand,
switch tab, scroll, settle. Without page-level landmarks, the
operator can only navigate plugin-by-plugin, which is the wrong
unit of granularity for a long marketing or docs page.

Sections are NOT plugins. Multiple sections may live inside one
plugin; one section may host multiple plugins. The roles do not
overlap.

End of NAC v1.2 normative document.
