# NAC v1.0 -- Navegabilidad Automatica Compliance

> A design norm for user interfaces that lets AI agents, voice
> assistants, RPA bots and automated test runners navigate, fill,
> operate and verify the system as if they were human users -- without
> reading the source code, without fragile selectors, without manual
> test scripts.

**Status**: Stable.
**Version**: 1.4 (spec) / 1.4.1 (reference runtime). v1.4.1 is a
patch-level release responding to the AI peer review of
2026-05-06 (DeepSeek + Claude + Grok Fast); it adds five
normative subsections (1.5.1 demo references, 1.5.2 adoption
cost framing, 7.1 awaitable-write contract, 7.2 ARIA-NAC
authority rule, 7.3 state mapping, 7.4 event scoping,
P5.1 active-plugin resolution, 14.3.5 layer declaration) and
patches the reference runtime accordingly. v1.4.1 is a strict
superset of v1.4.0; every v1.0..v1.4.0 plugin remains valid.
The spec base remains v1.4 because no new role / event /
attribute vocabulary was added -- only contracts were tightened
and missing rules made explicit. See CHANGELOG.md for the full
diff.
**Date**: 2026-05-06.
**Authors**: Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com> (lead), Sumi (collaboration).
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
   patterns in WAI-ARIA Authoring Practices. Onboarding a human
   developer takes about a week. NAC v1.0 is 5 attributes, 7
   events, and 5 driver functions; the full v1.4 surface adds
   primitives but the per-element cost is still five attributes.
   The relevant onboarding metric, however, is no longer
   *human-developer time*: NAC is designed to be implemented by
   AI coding agents inside an existing project. With a
   `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` pointing the agent at
   this spec plus `AI_INSTRUCTIONS.md`, a coding agent applies
   NAC to a typical screen in minutes, not weeks. The five
   attributes per element + one manifest call + seven event
   emissions are mechanical work that an agent executes faster
   than any human review of the output. See section 1.5.2 below
   for the authoritative adoption-cost framing. A smaller surface
   keeps the contract adoptable for the long tail of apps that
   have neither budget nor expertise to onboard ARIA -- and
   keeps it tractable for an agent applying it across thousands
   of screens.

The seven gaps that NAC addresses, which ARIA does not:

| Gap | What ARIA gives | What NAC adds | Why it matters for autonomous operators |
|---|---|---|---|
| Stable, namespaced ID | `id` (HTML, global, often regenerated) | `data-nac-id="plugin.element"` (namespaced per plugin, stable across re-renders) | An agent must address the same element across renders without colliding with sibling plugins |
| Verb semantics | `role="button"` | `data-nac-action="apply | submit | refresh | retry | cancel | discard"` | An agent must distinguish *apply* from *submit* from *refresh* without parsing button labels |
| Driver API | None (declarative-only by WG decision) | `NAC.click(id)`, `NAC.fill(id, val)`, `NAC.tab(plugin, tab)`, `NAC.snapshot_state()` | One call surface multi-consumer (voice, chat, RPA, AI agent, test runner) |
| Lifecycle as events | `aria-busy="true"` (state attribute) | `nac:action:dispatching | succeeded | failed`, `nac:plugin:opening | opened | closing | closed`, `nac:field:changed`, `nac:state:changed` | Consumers SUBSCRIBE to events with payloads instead of polling DOM mutations |
| Declarative manifest | Each ARIA widget is self-contained in DOM; no index | `manifest_nac` declared up front with `{kpis, actions, fields, tabs, rows, modes_supported}` | An agent or workflow engine introspects with `NAC.describe(plugin)` BEFORE rendering, enabling planning |
| Modes supported | None | `modes_supported: ['modal', 'maximized', 'new_tab', 'new_window']` | An agent decides where to open the plugin without trial-and-error |
| Adoption surface | ~50 attributes + 80+ patterns, ~1 week of *human* onboarding | 5 attributes + 7 events + small driver API. Adoption cost measured in **AI-coding-agent time** (see 1.5.2), not human-developer time | The long tail of apps gets coverage because an AI coding agent applies the contract per screen in minutes |

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

## 1.5.1. Reference deployments and demo surfaces

This document uses two example surfaces. They are not
interchangeable; readers should know which one a given snippet
maps to.

### Public demo (no auth, cold-start friendly)

URL: `https://yujin.app/nac-spec/example.php`

A single page exposing a NAC-instrumented plugin
`data-nac-plugin="example_demo"` with the following addressable
elements (as of v1.4):

- **Action verbs**: `play.autopilot`, `secret.open`,
  `note.c`, `note.d`, `note.e`, `note.f`, `note.g`, `note.a`,
  `note.b`, `note.c2` (a piano keyboard).
- **Fields**: `field.name`, `field.mood`, `field.spread`.
- **Tablist**: `tabs.demo` with tabs `tabs.demo.t1` /
  `tabs.demo.t2` / `tabs.demo.t3`.
- **Sections**: `page.section.intro`, `page.section.demos`.
- **v1.3 widgets**: accordion, combobox, slider, sortable
  table, drag-and-drop, dropzone, remote autocomplete.
- **v1.4 widgets**: breadcrumb, carousel, timeline, reorder.

Use this surface for any cold-start review, AI-driven
exploration, or test-runner smoke. It requires no login and is
intended to be safe for arbitrary `window.NAC.*` calls. A
secondary system-map showcase lives at
`https://yujin.app/nac-spec/example-navmap.php`.

### Production showcase (admin-gated)

URL: `https://yujin.app/crm` (Centro de Control, admin login
required)

The `patch_manager` plugin referenced throughout this document
(including the headline element shown earlier as
`data-nac-id="patch_manager.apply_all"`) lives here. It is the
real deployment that drove NAC v1.0's design and remains the
canonical reference for "what NAC looks like in a production
multi-tenant CRM". Because it is admin-gated, cold AI reviews
cannot exercise its DOM directly; they must read the spec
narrative instead.

### What this means for spec snippets

When a spec example uses identifiers like
`patch_manager.apply_all`, those are illustrative quotations
from the production showcase, not assertions about the public
demo. When a spec example uses identifiers like
`example_demo.note.c`, those are exercisable on the public
demo. Where ambiguity matters (see section 9.1 walkthrough)
the spec calls out which surface a snippet refers to.

---

## 1.5.2. Adoption cost: the implementer is an AI coding agent

This is the most important framing in the spec. Read it before
estimating the cost of NAC adoption against any other UI
contract.

### The wrong question

"How long does it take a human developer to learn NAC and apply
it to my codebase?"

Cold reviews of this spec consistently answer that question
with estimates ranging from "two days" to "two engineer-weeks
for a 30-screen SPA". Those estimates are correct under their
own assumption (a human is implementing) and irrelevant.

### The right question

"How long does it take an AI coding agent to apply NAC to my
codebase, given that the spec, manual, and authoring rules ship
in formats explicitly designed for AI consumption
(`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `AI_INSTRUCTIONS.md`)?"

Answer: minutes per screen, in the wall-clock time of running
the agent. The agent reads the manifest contract, the attribute
templates, and the event templates from this repository, then
applies them mechanically to every interactive element it
finds. The work is high-volume, low-judgment, low-novelty -- a
shape that AI coding agents execute reliably and at speed.

### Why this matters

NAC is a contract whose adoption cost is dominated by one
mechanical operation: adding five attributes to every
interactive element, registering one manifest per plugin,
emitting seven events at the right lifecycle points. None of
those steps require taste, architectural judgment, or
business-domain knowledge. They are precisely the kind of work
where an AI coding agent outperforms a human, both in speed
and in consistency.

The implication for adoption planning:

- **Frontend teams should not budget engineer-weeks for NAC
  adoption.** They should budget the time required to wire one
  AI coding agent (Claude Code, Cursor, GitHub Copilot in agent
  mode, Aider, etc.) into their CI / IDE, point it at this
  repo's `AI_INSTRUCTIONS.md`, and let it run.
- **The right comparison is not "NAC vs ARIA in onboarding
  hours".** It is "NAC, applied by an AI coding agent, vs ARIA,
  applied by a team of human developers who must each onboard
  for a week". NAC ships with the agent-readable instructions
  (`AI_INSTRUCTIONS.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`)
  that close the loop; ARIA does not.
- **The remaining cost is review, not implementation.** A human
  reviewer reads the agent's diff, spot-checks the manifest,
  runs the validator, and either merges or asks for revisions.
  The cost shifts from "writing attributes" (gone) to "stating
  the contract once and verifying the agent applied it
  correctly".

### What an AI coding agent needs from this repo

In order: `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md` at session
start (vendor-specific entry points, all three identical in
intent). Then `AI_INSTRUCTIONS.md` for the decision rules, the
attribute templates, the event templates, and the manifest
shape. Then `spec/NAC-v1.0.md` (this document) for the
normative contract and `js/nac.js` for the reference runtime.
Then `docs/MANUAL.md` for the authoring decisions humans want
to spot-check, and `docs/API_REFERENCE.md` for the full
`window.NAC.*` surface in one place.

The agent does not need anything else. The repo is the agent's
training data for one task: apply NAC.

### A note on the "1 hour" claim in earlier text

Earlier paragraphs of section 1.5 describe NAC's adoption cost
as "about an hour", contrasted with ARIA's "about a week".
Those numbers were written assuming a human developer.
**Read both numbers as obsolete in 2026 and forward.** The
realistic frame is: NAC adoption time is whatever wall-clock
time an AI coding agent needs to traverse the codebase, plus
human review time. For a 30-screen SPA that an agent can
process in parallel, the wall-clock figure is dominated by CI
budget, not by per-screen complexity.

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
  click(nac_id: string, opts?: { plugin?: string, plugin_instance_id?: string, timeout?: number }): Promise<NacResult>;
  fill(nac_id: string, value: any): Promise<NacResult>;
  select(nac_id: string, option: string | string[]): Promise<NacResult>;
  tab(plugin: string, tab_key: string): Promise<NacResult>;
  read_feedback(): NacFeedback[];
  wait_for(event: string, timeout_ms?: number): Promise<NacEvent>;
  screenshot(): Promise<string>;        // base64 PNG / SVG
  snapshot_state(): NacStateSnapshot;
  manifest(plugin?: string): NacManifest | NacManifest[];
  set_mode(mode: 'modal'|'maximized'|'new_tab'|'new_window'): void;
  /* v1.4.1 voice/agent ergonomic helpers */
  click_by_verb(plugin: string | null, verb: string, opts?: any): Promise<NacResult>;
  tab_by_label(plugin: string | null, label: string, opts?: any): Promise<NacResult>;
}
```

`click_by_verb` and `tab_by_label` are convenience wrappers
introduced in v1.4.1 for voice and natural-language agents that
hear a verb or a label rather than a `nac_id`. They look up the
target in the manifest first (matching `actions[].verb` for
`click_by_verb`, `tabs[].label` / `tabs[].label_i18n` for
`tab_by_label`), fall back to a DOM scan, then delegate to
`click()` / `tab()`. The underlying contracts (awaitable-write,
timeout semantics, error throws) are unchanged. Pass `null` for
`plugin` to use the active plugin per section P5.1.

The API MUST resolve `nac_id` first inside the active plugin, then
fall back to global lookup. Operations on missing IDs MUST throw a
typed `NacError` containing `code: 'not_found' | 'disabled' |
'invalid' | 'timeout'`.

#### P5.1 -- Active-plugin resolution algorithm (normative, added v1.4.1)

When a driver call (`click`, `fill`, `select`, `tab`, `find`,
`read_feedback`) does not specify a target plugin via
`opts.plugin`, the runtime MUST resolve the "active plugin"
deterministically using this algorithm:

1. Enumerate every element matching
   `[data-nac-plugin]` in document order.
2. If any of those elements carries
   `data-nac-plugin-state="ready"`, the active plugin is the
   **last (most recently mounted in DOM order) ready plugin**.
3. Otherwise the active plugin is the **last (most recently
   mounted in DOM order) plugin root** regardless of its state.
4. If no `[data-nac-plugin]` elements exist, the active plugin
   is `null` and `find` / `list` MUST search the whole
   document.

This algorithm is the contract that `_activePlugin()` in
`js/nac.js` implements; it was implementation-defined before
v1.4.1. AI peer review of 2026-05-06 (DeepSeek + Claude) flagged
it as undocumented runtime behaviour. It is now part of the
normative spec.

Implications and caveats:

- **Multi-mounted plugins**: if two roots carry the same
  `data-nac-plugin` slug (e.g. two patch_manager modals
  stacked), step 2 picks the last one in DOM order. Operators
  that need to address the earlier instance MUST pass
  `opts.plugin_instance_id` (declared via `data-nac-plugin-id`,
  see section 4) or scope by calling `find()` against a
  specific plugin root they hold a reference to.
- **Plugins still booting**: a plugin with
  `data-nac-plugin-state` set to `loading`, `opening`, or
  unset will be considered active only if no `ready` plugin
  exists. Operators that strictly require a ready plugin MUST
  poll `manifest()` until the target plugin reports
  `state: 'ready'` (see lifecycle in section 4).
- **No plugin attribute**: elements outside any
  `[data-nac-plugin]` boundary are addressable by a globally
  unique `data-nac-id` only. Production codebases SHOULD
  enclose every NAC-instrumented surface in a plugin root to
  avoid the global-namespace risk.

This rule pairs with section 7.2 (NAC vs ARIA authority) and
section 7.4 (event scoping); together they make the
multi-mount case fully specified.

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

## 7.1. Awaitable-write contract (normative)

> Added in v1.4.1 in response to the AI peer review of 2026-05-06.
> The reference implementation prior to v1.4.1 violated this
> contract; see CHANGELOG entry `v1.4.1 / 3.4-A` for the fix.

The promise returned by `click()`, `fill()`, `select()`, `tab()`,
and `set_mode()` MUST settle in exactly one of three terminal
states. There is no other permitted outcome:

1. **Resolve `{ ok: true, event: <succeeded-event-detail> }`** if
   `nac:action:succeeded` (or the role-specific success event:
   `nac:tab:changed` for `tab`, `nac:field:changed` for `fill`,
   `nac:mode:requested` for `set_mode`) fires before the timeout.
2. **Resolve `{ ok: false, event: <failed-event-detail> }`** if
   `nac:action:failed` (or the role-specific failure event)
   fires before the timeout.
3. **Reject with `NacError('timeout', ...)`** if neither event
   fires within `opts.timeout` (or `NAC.config.default_timeout_ms`,
   default 5000 ms).

What is NOT permitted:

- Resolving `{ ok: true, event: null }` after a fixed short
  duration (e.g. 200 ms) regardless of whether any event fired.
  This was the v1.0..v1.4 reference-implementation behaviour and
  is hereby retracted as a flake-factory bug, not a permitted
  variant. Implementations carrying this pattern MUST be updated
  to either resolve on the real event or reject with `'timeout'`.
- Silently swallowing the failed-event leg and resolving as
  success.
- Returning `null` or `undefined` from a write call.

This guarantees that an autonomous operator can rely on the
shape of the resolved value to drive its next step without
out-of-band probing. CI test runners that observe a `'timeout'`
rejection know the action did not complete; runners that observe
a resolved promise know exactly which event caused the
resolution and can read its payload.

### Plugins that intentionally emit no lifecycle event

Some legitimate UI actions (a pure DOM toggle, a no-op
preview-stamp button) intentionally complete without emitting
`nac:action:succeeded`. NAC-3 compliance MUST treat that case
exactly like any other. Two acceptable patterns:

- **Recommended**: emit `nac:action:succeeded` even for trivial
  outcomes. The cost is one event emission and the operator gets
  a deterministic resolution.
- **Permitted alternative**: declare the action with
  `dispatch_mode: 'sync'` in the manifest. Operators that read
  the manifest first will then call `click()` with
  `opts.timeout: 0`, which MUST resolve immediately to
  `{ ok: true, event: null }` without waiting. This is the only
  case where `event: null` is a permitted resolution shape.

### Implementation note (informative)

The reference runtime in `js/nac.js` v1.4.1 implements this
contract via a single `Promise` that races
`nac:action:succeeded`, `nac:action:failed`, and a `setTimeout`
that calls `reject(NacError('timeout', ...))`. There is no
short-circuit success path. See `click()` definition for the
canonical pattern.

---

## 7.2. NAC vs ARIA: authority rules for state disagreements (normative)

> Added in v1.4.1 in response to the AI peer review of 2026-05-06.

NAC and ARIA share a DOM. They MAY both annotate the same
element. They CAN disagree -- e.g. `data-nac-state="loading"`
coexisting with `aria-busy="false"`, or
`data-nac-state="invalid"` coexisting with
`aria-invalid="false"`. When they do, consumers need a rule.

Authoritative side per consumer kind:

| Consumer kind                          | Authoritative side | Rationale |
|----------------------------------------|--------------------|-----------|
| Assistive technology (screen readers)  | **ARIA**           | ARIA is the contract those tools are built against; NAC has no signal they consume |
| NAC drivers (`window.NAC.*`, runners)  | **NAC**            | NAC drivers depend on `data-nac-state` for `find()`, `list()`, lifecycle, validators |
| AI agents driving via NAC              | **NAC**            | Same as above; the contract the agent operates against IS NAC |
| AI agents driving via accessibility tree (Computer Use, vision-grounded) | **ARIA** | Those agents read the accessibility tree, not `data-nac-*` |
| Hybrid agents (read both layers)       | **NAC for state, ARIA for label** | NAC's state vocabulary is richer (`loading`, `error`, `pending`, `expanded`, ...); ARIA's labels are richer in i18n affordances |
| Validators / linters                   | **Both**           | A divergence is a bug; report it |

What this rule means for the author of a compliant plugin:

- When a plugin transitions an element to a busy state, it MUST
  update both `data-nac-state="loading"` AND `aria-busy="true"`
  in the same render tick. Same for `invalid` /
  `aria-invalid="true"`, `expanded` / `aria-expanded="true"`,
  etc. The mapping table is in section 7.3.
- A NAC-3 validator MUST flag any element where one side reads
  busy/invalid/expanded and the other side does not, as a drift
  warning. The validator is permitted (but not required) to
  treat this as a hard fail.
- Implementations that cannot update both sides atomically MUST
  prioritise `data-nac-state` first and `aria-*` second, and
  document the lag in their plugin's manifest under
  `manifest_nac.aria_lag_ms`. Operators reading the manifest can
  then plan around it.

This rule is normative for NAC-3. It is informative for NAC-1
and NAC-2.

---

## 7.3. NAC state to ARIA attribute mapping (normative)

The canonical mapping table that section 7.2 references:

| `data-nac-state`         | ARIA equivalent                                         |
|--------------------------|---------------------------------------------------------|
| `loading`                | `aria-busy="true"`                                      |
| `idle` / `ready`         | `aria-busy="false"`                                     |
| `invalid` / `error`      | `aria-invalid="true"`                                   |
| `valid`                  | `aria-invalid="false"`                                  |
| `expanded`               | `aria-expanded="true"`                                  |
| `collapsed`              | `aria-expanded="false"`                                 |
| `pending`                | `aria-busy="true"` + `aria-disabled="true"`             |
| `disabled`               | `aria-disabled="true"` (and ideally `disabled` attr)    |
| `hidden`                 | `aria-hidden="true"` (or remove from DOM)               |
| `selected`               | `aria-selected="true"`                                  |
| `checked`                | `aria-checked="true"`                                   |
| `pressed`                | `aria-pressed="true"`                                   |
| `current`                | `aria-current="page"` (or appropriate token)            |
| `dragging`               | `aria-grabbed="true"` (deprecated in ARIA 1.1; informative only) |

States not in this table (e.g. NAC's domain-specific
`data-nac-state="ready_for_apply"` on a patch row) have no ARIA
equivalent and SHOULD NOT be mirrored. The contract is: every
state token that maps to ARIA MUST mirror; every state token
that does not map to ARIA stays NAC-only.

---

## 7.4. Event scoping (normative, added v1.4.1)

> Added in v1.4.1 in response to AI peer review of 2026-05-06
> (Grok Fast contributed this finding; DeepSeek and Claude did
> not raise it).

All `nac:*` events fire on `document` with `bubbles: true`. This
is intentional -- it lets a single subscriber observe every
plugin in the page without iterating roots. The cost is that
multi-instance pages need a scoping rule, which v1.4.1 makes
explicit.

### Required payload fields

Every `nac:*` event detail MUST include both of:

- `plugin: string` -- the plugin slug from
  `data-nac-plugin="..."` of the originating root. Required.
- `plugin_instance_id: string | null` -- the per-instance ID
  from `data-nac-plugin-id="..."` if multiple instances of the
  same plugin can be mounted simultaneously, otherwise `null`.

The legacy field name `plugin_slug` (used inconsistently in
some v1.0..v1.3 emitters) is deprecated and MUST be aliased to
`plugin` from v1.4.1 onward. Runtimes MAY emit both fields for
back-compat.

### Subscriber filtering pattern (informative)

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.plugin !== 'patch_manager') return;
  if (e.detail.plugin_instance_id !== myInstanceId) return;
  // ... handle event for this specific instance
});
```

Subscribers that omit the filter accept events from every
plugin and every instance on the page. That is permitted but
explicitly the subscriber's responsibility.

### Plugin slug uniqueness

Within a single mounted document, a plugin slug MAY appear on
multiple roots (legitimate multi-instance UIs: stacked modals,
multi-window CRM views, master-detail with two patch_manager
panels). To address a specific instance, hosts MUST set
`data-nac-plugin-id="<unique>"` on each root. Operators
addressing a specific instance use:

- For driver calls: `NAC.click('apply_all', { plugin_instance_id: 'modal-2' })`.
- For event filtering: `e.detail.plugin_instance_id === 'modal-2'`.
- For scoped find: `NAC.find('apply_all', { plugin_instance_id: 'modal-2' })`.

If a host mounts multiple instances of the same plugin without
distinguishing `data-nac-plugin-id`, the active-plugin
algorithm in P5.1 picks one (the most recently mounted ready
one). This is a permitted but lossy fallback; producers SHOULD
NOT rely on it.

### Per-plugin event buses (optional)

Hosts MAY additionally dispatch `nac:*` events on the plugin
root itself, in addition to `document`. Subscribers attached
to the root receive only that plugin's events without needing
to filter on payload. This is a SHOULD for hosts that mount
many instances of the same plugin and want listener overhead
to scale linearly with subscribed instances rather than
quadratically.

When a host opts into per-plugin buses, the same event MUST
fire on both the plugin root and `document`. Subscribers that
attach to the root see the event first (capture phase) but
the document-level subscriber still sees it via bubbling. A
runtime that disables document-level dispatch is non-compliant.

### Shadow DOM and iframe boundaries

`bubbles: true` does not cross shadow DOM closed boundaries.
Plugins inside a closed shadow root MUST forward `nac:*` events
to the host document via `composed: true` on the
`CustomEvent` init dictionary. Reference runtimes MUST set
`composed: true` from v1.4.1 onward.

Iframe boundaries are not crossed by DOM events. Plugins inside
an iframe SHOULD use `postMessage` to forward NAC events to the
parent frame, then re-dispatch them on the parent's `document`.
Or operate the iframe via its own `window.NAC.*` instance,
which is the recommended pattern.

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
Pablo Adrian Kuschniroff, Sumi. 2026. MIT License.
https://github.com/pkuschnirof/nac-spec
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

> **Looking only for the driver-API additions in this version?**
> See [`docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) for a
> tabular index of every `window.NAC.*` method introduced from
> v1.0 through v1.4.1. The narrative below explains *why* each
> primitive exists; the cheat sheet shows *how* to call it.

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

> **Driver-API additions in this version**: see
> [`docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) sections
> "v1.2 -- dynamic options", "v1.2 -- window chrome",
> "v1.2 -- discovery", "v1.2 -- section landmarks".

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

#### 14.3.5. Layer declaration (normative, added v1.4.1)

> Added in v1.4.1 in response to AI peer review of 2026-05-06.
> Claude's reading flagged that the three-layer system_map has
> no normative way to declare which layer a system implements,
> forcing agents to probe by catching exceptions.

A v1.2-or-later compliant runtime MUST expose:

```typescript
NAC.system_map_layers(): {
  a: boolean,             // system_map() implemented and reachable
  b: boolean,             // at least one manifest carries transitions[]
  c: boolean,             // capabilities() implemented and reachable
  preferred: 'a' | 'b' | 'c' | null,  // host's recommended entry point
  generated_at?: string,  // ISO8601, optional
  ttl_seconds?: number    // optional, applies to layer A cache
}
```

This is a synchronous, side-effect-free read. Agents call it
once at session start and decide their planning strategy
without exception-driven probing.

Examples (informative):

```js
const layers = NAC.system_map_layers();
if (layers.a) {
  const map = await NAC.system_map();
  // proceed with full plan
} else if (layers.b) {
  // crawl from current view via NAC.describe().transitions
} else if (layers.c) {
  const caps = await NAC.capabilities();
  // single-view planning only
} else {
  // pre-v1.2 system; degrade to v1.0 / v1.1 view-by-view
}
```

A v1.2 system that returns `{ a: false, b: false, c: false }`
is not compliant; if the host cannot expose any layer, the
runtime MUST omit the function entirely (so
`typeof NAC.system_map_layers === 'undefined'` signals
pre-v1.2). A v1.2 system that returns `{ a: false, b: false,
c: false, preferred: null }` is a runtime that knows it should
expose discovery but the host has not registered any data --
this is permitted but discouraged; it tells the agent "try
again later" rather than "I don't speak v1.2 discovery".

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

---

## 15. Common UI primitives extension (v1.3, normative)

> **Driver-API additions in this version**: see
> [`docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) sections
> "v1.3 -- toast / banner / confirm" through "v1.3 -- richtext"
> for all sixteen widget families. `NAC.confirm()` and
> `NAC.list_pending_confirms()` are the answer to "how does an
> agent detect a blocking modal?" -- this was missed by some
> cold AI reviewers in 2026-05-06; the cheat sheet shortens
> that path.

This section is normative. It is a strict superset of v1.2.
Every v1.0 / v1.1 / v1.2 plugin remains valid; every v1.0 /
v1.1 / v1.2 operator continues to work. The additions in this
section name sixteen UI primitives that were observable in
practice on most production web apps but had no formal
vocabulary in v1.0..v1.2 -- a v1.2 operator could drive them
through `click` / `fill` / generic events, but could not
*recognise* them as the kind of widget they were.

The list, in roughly the order they appear in a typical app:

A. Toast / banner / alert (transient or persistent feedback).
B. Toggle / switch (instant-action boolean, distinct from
   checkbox).
C. Stepper (multi-step form progress).
D. Tree (hierarchical view with expand / select).
E. Calendar with events (full-calendar with date + events).
F. Rich text editor (WYSIWYG / markdown editor).
G. Tag input (free-input + suggestions, e.g. Gmail "to:").
H. Rating (1..N stars, hearts, thumbs).
I. Confirmation dialog (interrupting yes/no prompt).
J. Drawer / sheet / bottom sheet.
K. Pagination as a standalone widget (i.e. on a card grid,
   not only inside a v1.1 table).
L. Charts (line / bar / pie / area / funnel) with clickable
   data points.
M. Map / geo widget with markers and layers.
N. Avatar + presence indicator.
O. Floating action button (FAB).
P. Empty state (and companion skeleton loader).

Every addition follows the existing five-attribute pattern --
`data-nac-id`, `data-nac-role`, `data-nac-state`,
`data-nac-action`, `data-nac-field-type` -- with new role,
state and verb values. New events are namespaced under
`nac:<family>:<verb>`; new driver functions are added to
`window.NAC`. No existing primitive is repurposed.

### 15.1. New roles (16 normative additions)

```
toast              transient feedback message (auto-dismiss)
banner             persistent feedback message (manual dismiss)
confirm-dialog     interrupting yes/no dialog
toggle             not used as a separate role; see field_type below
stepper            container of step entries
step               one step inside a stepper
tree               root of a hierarchical view
treenode           one node inside a tree (may itself contain treenodes)
calendar           container of a calendar view
calendar-event     one event inside a calendar
chart              container of a chart
chart-series       one series inside a chart
chart-point        one data point inside a chart-series
chart-legend       legend control of a chart
map                container of a geographic map
map-marker         one marker inside a map
map-layer          one toggleable layer inside a map
avatar             user avatar image / initials
presence-indicator user online/away/busy/offline status badge
drawer             slide-out side or bottom panel (non-blocking)
bottom-sheet       drawer with position=bottom (mobile)
fab                primary action button, usually floating
empty-state        explicit "nothing here yet" region
skeleton           loading placeholder, replaced by content on load
tag-input          not used as separate role; see field_type below
richtext           not used as separate role; see field_type below
```

Plus three new `data-nac-field-type` values for fields that are
visually distinct from existing types but use the same `field`
role: `toggle`, `tag-input`, `richtext`, `rating`.

### 15.2. New states

```
toast              visible | dismissed | persistent
banner             visible | dismissed
confirm-dialog     pending | confirmed | cancelled
stepper            in_progress | completed
step               current | done | pending | disabled | error
treenode           expanded | collapsed | leaf | selected
calendar-event     confirmed | tentative | cancelled | selected
drawer             open | peek | closed
bottom-sheet       open | peek | closed
empty-state        visible | hidden
skeleton           loading | done
```

### 15.3. New verbs (`data-nac-action`)

```
toggle             flip a switch
step_next          stepper move forward
step_back          stepper move backward
step_to            jump to specific step
expand_node        tree: expand a treenode
collapse_node      tree: collapse a treenode
select_node        tree: select a treenode
add_tag            tag-input: add a tag
remove_tag         tag-input: remove a tag
rate               rating: set value
confirm            confirm-dialog: yes
cancel             confirm-dialog: no  (already exists)
open_drawer        drawer / bottom-sheet open
close_drawer       drawer / bottom-sheet close
peek_drawer        bottom-sheet partial open
focus_marker       map: pan + zoom to a marker
toggle_layer       map: layer on/off
view_change        calendar: switch month/week/day
go_to_date         calendar: navigate to date
move_event         calendar: drag-move event
chart_filter       chart: apply filter / drill
toggle_series      chart: hide/show one series
format_apply       richtext: apply bold/italic/etc
```

### 15.4. New events (33 total)

All on `document`, `bubbles: true`.

```
toast / banner
  nac:toast:fired              { id, severity, text, ttl_ms }
  nac:toast:dismissed          { id, dismissed_by }    // user|timeout|programmatic
  nac:banner:displayed         { id, severity }
  nac:banner:dismissed         { id }

confirm-dialog
  nac:confirm:requested        { id, prompt, danger }
  nac:confirm:confirmed        { id }
  nac:confirm:cancelled        { id }

stepper
  nac:step:advanced            { stepper_id, from, to, total }
  nac:step:back                { stepper_id, from, to }
  nac:step:completed           { stepper_id, total }
  nac:step:error               { stepper_id, step_idx, errors }

tree
  nac:tree:expanded            { node_id, level }
  nac:tree:collapsed           { node_id, level }
  nac:tree:selected            { node_id, path }

tag-input
  nac:tags:added               { field_id, value, source } // typed|picked
  nac:tags:removed             { field_id, value }

rating
  (uses existing nac:field:changed)

drawer / bottom-sheet
  nac:drawer:opened            { id, position }
  nac:drawer:closed            { id, dismissed_by }
  nac:drawer:peek              { id, height_pct }

calendar
  nac:calendar:event_clicked   { event_id, start, end }
  nac:calendar:event_moved     { event_id, new_start, new_end }
  nac:calendar:date_selected   { date }
  nac:calendar:view_changed    { view }

chart
  nac:chart:point_clicked      { chart_id, series, x, y, label }
  nac:chart:point_hovered      { chart_id, series, x, y, label }
  nac:chart:series_toggled     { chart_id, series, visible }
  nac:chart:filtered           { chart_id, criteria }

map
  nac:map:marker_clicked       { map_id, marker_id, lat, lng, label }
  nac:map:zoom_changed         { map_id, zoom }
  nac:map:moved                { map_id, lat, lng }
  nac:map:layer_toggled        { map_id, layer_id, visible }

avatar / presence
  nac:presence:changed         { user_id, old_state, new_state }

empty-state / skeleton
  nac:empty:displayed          { region_id, kind }      // no-results|first-time|no-permission|error
  nac:empty:cta_clicked        { region_id, action_id }
  (skeleton uses nac:state:changed loading -> done)

richtext
  nac:richtext:format_applied  { field_id, format, value? }
  nac:richtext:link_inserted   { field_id, url, text }
  nac:richtext:mention_picked  { field_id, user_id, label }
```

### 15.5. New driver API functions

```
toast / banner
  NAC.toast(text, opts?) -> id           // fire programmatically
  NAC.list_toasts() -> Toast[]           // visible + persistent
  NAC.dismiss_toast(id)
  NAC.list_banners() -> Banner[]
  NAC.dismiss_banner(id)

confirm
  NAC.confirm(prompt, opts?) -> Promise<boolean>
  NAC.list_pending_confirms() -> ConfirmDialog[]

stepper
  NAC.step_next(stepper_id)
  NAC.step_back(stepper_id)
  NAC.step_to(stepper_id, n)
  NAC.step_state(stepper_id) -> { current, total, errors? }

tree
  NAC.tree_expand(node_id)
  NAC.tree_collapse(node_id)
  NAC.tree_select(node_id)
  NAC.tree_path(node_id) -> string[]
  NAC.tree_walk(tree_id) -> Iterator over { node_id, depth, label, state }

tag-input
  NAC.add_tag(field_id, value)
  NAC.remove_tag(field_id, value)
  NAC.list_tags(field_id) -> string[]

drawer
  NAC.open_drawer(id, position?)
  NAC.close_drawer(id)
  NAC.peek_drawer(id, height_pct?)

calendar
  NAC.calendar_view(cal_id, view)        // 'month'|'week'|'day'
  NAC.calendar_go_to(cal_id, date)       // ISO 8601
  NAC.calendar_select_event(event_id)
  NAC.calendar_list_events(cal_id, from?, to?) -> CalendarEvent[]

chart
  NAC.chart_data(chart_id) -> { series, axes, points }
  NAC.chart_toggle_series(chart_id, series, on?)
  NAC.chart_filter(chart_id, criteria)

map
  NAC.map_focus(map_id, lat, lng, zoom?)
  NAC.map_select_marker(marker_id)
  NAC.map_toggle_layer(map_id, layer_id, on?)
  NAC.list_markers(map_id) -> Marker[]

richtext
  NAC.richtext_format(field_id, format, value?)
  NAC.richtext_insert_link(field_id, text, url)
  NAC.richtext_insert_mention(field_id, user_id, label)
  // NAC.fill(field_id, html_or_markdown) already covers basic write
```

### 15.6. Manifest extensions

A `fields[]` entry of `field_type: 'rating'` MAY declare:

```json
{ "min": 1, "max": 5, "step": 1, "icon": "star" }
```

A `fields[]` entry of `field_type: 'tag-input'` MAY declare:

```json
{
  "options_source": "remote",       // see 14.1
  "search_supported": true,
  "allow_free_input": true,
  "max_tags": 10
}
```

A `fields[]` entry of `field_type: 'richtext'` MAY declare:

```json
{
  "supported_formats": ["bold","italic","link","mention","list","heading","code"],
  "mention_users_source_field": "users.search"
}
```

A new top-level manifest array `charts[]`:

```json
{
  "id": "dash.sales_chart",
  "label": "Monthly sales",
  "kind": "line",                   // line|bar|pie|area|funnel|scatter
  "series": [{ "id": "sales", "label": "Sales" }],
  "axes":   [{ "id": "x", "kind": "time" }, { "id": "y", "kind": "money" }],
  "supports_drill": true,
  "supports_filter": true
}
```

A new top-level manifest array `maps[]`:

```json
{
  "id": "dash.map",
  "label": "Customer locations",
  "provider": "google",             // google|mapbox|leaflet|other
  "default_center": { "lat": -34.6, "lng": -58.4 },
  "default_zoom": 11,
  "layers":  [{ "id": "stores", "label": "Stores" }],
  "markers_source": "/api/markers"  // optional fetch endpoint
}
```

### 15.7. NAC-3 v1.3 compliance level

A plugin claiming **NAC-3 v1.3** MUST:

1. Satisfy NAC-3 v1.2 (and therefore v1.1 and v1.0).
2. For every widget it ships from the families listed in
   15.1, declare the appropriate role from 15.1, emit the
   appropriate events from 15.4 and (when applicable) include
   the appropriate manifest entries from 15.6.
3. Implement the corresponding driver functions from 15.5
   when the widget is operated programmatically (e.g. a tree
   MUST support `NAC.tree_expand` / `_collapse`; a stepper
   MUST support `NAC.step_next` / `_back`).

### 15.8. Backwards compatibility commitment

Every v1.3 addition is additive. A v1.0 / v1.1 / v1.2 operator
parses a v1.3 plugin without crashing: unknown roles are
treated as `region`, unknown field-types are treated as
`text`, unknown verbs are treated as opaque actions, unknown
events are ignored, unknown manifest arrays (`charts[]`,
`maps[]`) are silently skipped.

A v1.3 operator drives a v1.0..v1.2 plugin without retrofit:
absence of the new roles / events / driver functions
downgrades the operator to the equivalent v1.2 path
(e.g. `NAC.tree_expand` falls back to clicking the
node-toggle button when the page does not register
`treenode` roles).

The semver impact of v1.3 is **MINOR**.

---

## 16. Navigation and ordering primitives extension (v1.4, normative)

> **Driver-API additions in this version**: see
> [`docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) sections
> "v1.4 -- breadcrumb", "v1.4 -- carousel",
> "v1.4 -- timeline", "v1.4 -- reorder". The v1.4.1 patch
> additionally introduced `click_by_verb` and `tab_by_label`
> for voice/agent ergonomics; see the same cheat sheet under
> "v1.4.1 -- voice / agent ergonomics".

This section is normative. It is a strict superset of v1.3.
Every v1.0 / v1.1 / v1.2 / v1.3 plugin remains valid; every
v1.0 / v1.1 / v1.2 / v1.3 operator continues to work. The
additions in this section name four UI primitive families that
v1.3 left under-specified: hierarchical breadcrumbs, carousels
(rotating slideshows), timelines / activity feeds, and
in-place reordering within a single list.

The motivation is recognition, not operability. A v1.3 operator
can already drive every one of these widgets through
`click` / `fill` / drag-drop / generic events. What it cannot
do is *recognise* them as the kind of widget they are -- and
so it cannot reason about hierarchy depth, carousel position,
chronological ordering, or in-list reordering as first-class
properties of the surface.

The four families, with their pre-v1.4 modeling and the
problem each one introduces:

A. **Breadcrumb** -- today rendered as a sequence of
   `<a>` tags. An agent has no signal that this *is* a
   hierarchy nor what level the user is currently at. Stack
   depth and parent-of-current-view are load-bearing context
   for any next-step decision (e.g. "go up one level" is a
   common voice command).
B. **Carousel** -- the obvious name `slider` was taken in v1.1
   for the continuous-numeric input (`min/max/step`). A
   carousel is a paginated container of slides with optional
   autoplay, dots, and prev/next controls. Verbs missing in
   v1.3: `slide_next`, `slide_prev`, `slide_to`,
   `pause_autoplay`, `play_autoplay`.
C. **Timeline / activity feed** -- linear chronological
   list, often infinite-scroll, often live-updating (Slack
   thread, audit log, social feed, support ticket history).
   Modeling it as `row[]` loses the "this is *time-ordered*
   and that matters" hint, plus the load-older / load-newer
   pagination that is fundamentally different from v1.1
   `pagination-control`.
D. **Reorder-within-list** -- v1.1 ships `draggable` +
   `drop-target` + `nac:drag:dropped { from_nac_id,
   target_nac_id }`. When source and target are the *same*
   list, the agent cannot tell whether the user *reparented*
   (cross-list) or *reordered* (in-list with a new index).
   The semantics matter: reorder is positional; reparent is
   relational.

Every addition follows the existing five-attribute pattern --
`data-nac-id`, `data-nac-role`, `data-nac-state`,
`data-nac-action`, `data-nac-field-type` -- with new role,
state and verb values. New events are namespaced under
`nac:<family>:<verb>`; new driver functions are added to
`window.NAC`. No existing primitive is repurposed.

### 16.1. New roles (7 normative additions)

```
breadcrumb         container of breadcrumb-item (current location in hierarchy)
breadcrumb-item    one level in the breadcrumb chain
carousel           rotating slideshow of slides with optional autoplay
carousel-slide     one slide inside a carousel
carousel-dot       one navigation dot of a carousel (alternative to prev/next)
timeline           container of chronologically-ordered timeline-item
timeline-item      one entry in a timeline
```

The `reorder` capability does NOT introduce a new role. It is
expressed by a `draggable` whose enclosing `drop-target` is the
*same* container declared in `nac:drag:dropped` (i.e.
`from_nac_id` and `target_nac_id` resolve to the same parent
list). The operator MAY also supply a positional index via the
new `reorder` verb (16.3).

### 16.2. New states

```
breadcrumb-item    current | navigable
carousel           playing | paused
carousel-slide     active | inactive
carousel-dot       active | inactive
timeline           live | static
timeline-item      visible | hidden
```

`timeline=live` signals to the operator that new items may
arrive without any user action; the operator SHOULD subscribe
to `nac:timeline:item_appeared` instead of polling. `static`
means snapshot-only.

### 16.3. New verbs (`data-nac-action`)

```
navigate_to_crumb   breadcrumb-item: navigate up the hierarchy to this level
slide_next          carousel: advance to next slide
slide_prev          carousel: go back to previous slide
slide_to            carousel: jump to specific slide_idx
pause_autoplay      carousel: pause auto-rotation
play_autoplay       carousel: resume auto-rotation
load_older          timeline: fetch entries before the current oldest
load_newer          timeline: fetch entries after the current newest
reorder             draggable: change position within the same list
```

### 16.4. New events (10 total)

All on `document`, `bubbles: true`.

```
breadcrumb
  nac:breadcrumb:navigated     { id, depth, path, target_depth }
                                // path is an array of breadcrumb-item ids
                                // ordered root-to-current; target_depth is
                                // the depth the user navigated to.

carousel
  nac:carousel:slide_changed   { carousel_id, from_idx, to_idx, total,
                                 trigger }
                                // trigger: 'next'|'prev'|'dot'|'autoplay'|
                                //          'programmatic'
  nac:carousel:autoplay_paused { carousel_id, dismissed_by }
                                // dismissed_by: 'user'|'programmatic'|
                                //                'visibility'
  nac:carousel:autoplay_resumed { carousel_id }

timeline
  nac:timeline:item_clicked    { timeline_id, item_id, ts }
  nac:timeline:scrolled_to     { timeline_id, cursor_ts, direction }
                                // direction: 'older'|'newer'
  nac:timeline:loaded_more     { timeline_id, direction, count }
  nac:timeline:item_appeared   { timeline_id, item_id, ts }
                                // only when state=live

reorder (extension of v1.1 drag-and-drop)
  nac:list:reordered           { list_id, item_id, from_index, to_index }
                                // emitted INSTEAD of nac:drag:dropped when
                                // from_nac_id and target_nac_id resolve to
                                // the same parent list. The original
                                // nac:drag:* events MAY also fire (lifecycle)
                                // but the canonical signal is reordered.
```

### 16.5. New driver API functions

```
breadcrumb
  NAC.list_breadcrumbs() -> Breadcrumb[]
                                // Breadcrumb: { id, items: [{ id, label,
                                //   depth, navigable, current }] }
  NAC.navigate_breadcrumb(item_id) -> Promise<NacResult>
                                // resolves once the target view is ready

carousel
  NAC.list_carousels() -> Carousel[]
  NAC.carousel_state(carousel_id) -> {
    current_idx, total, autoplay, slide_ids: string[]
  }
  NAC.carousel_advance(carousel_id, delta?) -> Promise<NacResult>
                                // delta defaults to +1; -1 goes back
  NAC.carousel_to(carousel_id, slide_idx) -> Promise<NacResult>
  NAC.carousel_autoplay(carousel_id, on: boolean) -> Promise<NacResult>

timeline
  NAC.list_timelines() -> Timeline[]
  NAC.timeline_load_older(timeline_id, limit?) -> Promise<TimelineItem[]>
                                // limit defaults to 20
  NAC.timeline_load_newer(timeline_id, limit?) -> Promise<TimelineItem[]>
  NAC.timeline_state(timeline_id) -> {
    is_live, ordering, oldest_ts, newest_ts, item_count
  }

reorder
  NAC.reorder(list_id, item_id, to_index) -> Promise<NacResult>
                                // emits nac:list:reordered when settled
```

### 16.6. Manifest extensions

Three new top-level manifest arrays are introduced. All are
optional; absent arrays mean the plugin ships no widget of
that family.

```typescript
interface NacBreadcrumb {
  nac_id: string;                  // id of the breadcrumb container
  items: {
    id: string;                    // id of one breadcrumb-item
    label_i18n: string;
    depth: number;                 // 0 = root
    navigable: boolean;            // false on the current level
  }[];
}

interface NacCarousel {
  nac_id: string;
  slides: {
    id: string;
    label_i18n?: string;
  }[];
  autoplay_default: boolean;
  interval_ms?: number;            // when autoplay_default = true
  loop: boolean;                   // last slide wraps to first?
}

interface NacTimeline {
  nac_id: string;
  ordering: 'newest_first' | 'oldest_first';
  is_live: boolean;
  load_older_supported: boolean;
  load_newer_supported: boolean;
  // items[] is NOT declared statically -- it is fetched dynamically,
  // similar to the v1.0 row contract.
}
```

`NacManifest` (section 3 P7) gains three optional properties:

```typescript
interface NacManifest {
  // ...existing fields...
  breadcrumbs?: NacBreadcrumb[];
  carousels?:   NacCarousel[];
  timelines?:   NacTimeline[];
}
```

The `reorder` capability does not require a manifest entry --
it is implied by any `draggable` whose `drop-target` is its
own parent. Plugins MAY signal explicit reorder support by
adding `supports_reorder: true` to a v1.1 `NacRowDef` entry
(opt-in hint for operators that prefer to use `NAC.reorder`
over generic `NAC.drag` calls).

### 16.7. NAC-3 v1.4 compliance level

A plugin claiming **NAC-3 v1.4** MUST:

1. Satisfy NAC-3 v1.3 (and therefore v1.0..v1.2).
2. For every widget it ships from the families listed in
   16.1, declare the appropriate role from 16.1, emit the
   appropriate events from 16.4 and (when applicable) include
   the appropriate manifest entries from 16.6.
3. Implement the corresponding driver functions from 16.5
   when the widget is operated programmatically (e.g. a
   carousel MUST support `NAC.carousel_advance` /
   `_autoplay`; a timeline that supports infinite scroll MUST
   support `NAC.timeline_load_older`).
4. For any list that supports drag-reorder within itself,
   emit `nac:list:reordered` with `from_index` and `to_index`
   in addition to (or instead of) the v1.1 `nac:drag:dropped`
   event.

### 16.8. Backwards compatibility commitment

Every v1.4 addition is additive. A v1.0..v1.3 operator parses
a v1.4 plugin without crashing: unknown roles are treated as
`region`, unknown verbs are treated as opaque actions, unknown
events are ignored, unknown manifest arrays (`breadcrumbs[]`,
`carousels[]`, `timelines[]`) are silently skipped.

A v1.4 operator drives a v1.0..v1.3 plugin without retrofit:
absence of the new roles, events, or driver functions
downgrades the operator to the equivalent v1.3 path. For
example:

- `NAC.navigate_breadcrumb(item_id)` falls back to clicking
  the `<a>` element matching the item's label or href when
  the page does not register `breadcrumb` roles.
- `NAC.carousel_advance` falls back to clicking the next/prev
  buttons by their conventional aria-labels.
- `NAC.timeline_load_older` falls back to scrolling the
  container to its bottom and waiting for new rows to mount.
- `NAC.reorder` falls back to a programmatic drag sequence
  using v1.1 `nac:drag:*` events.

The semver impact of v1.4 is **MINOR**.

End of NAC v1.4 normative document.
