# NAC v1.0 -- Navegabilidad Automatica Compliance

> A design norm for user interfaces that lets AI agents, voice
> assistants, RPA bots and automated test runners navigate, fill,
> operate and verify the system as if they were human users -- without
> reading the source code, without fragile selectors, without manual
> test scripts.

**Status**: Stable.
**Version**: 1.0.
**Date**: 2026-05-05.
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

- **NAC**: Navegabilidad Automatica Compliance.
- **RPA**: Robotic Process Automation.
- **WCAG**: Web Content Accessibility Guidelines.
- **ARIA**: Accessible Rich Internet Applications.
- **i18n**: internationalization.

End of NAC v1.0 normative document.
