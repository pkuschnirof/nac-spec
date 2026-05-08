# NAC v1.0 -- Navegabilidad Automatica Compliance

> A design norm for user interfaces that lets AI agents, voice
> assistants, RPA bots and automated test runners navigate, fill,
> operate and verify the system as if they were human users -- without
> reading the source code, without fragile selectors, without manual
> test scripts.

**Status**: Stable.
**Version**: 1.9.0 (spec) / 1.9.0 (reference runtime). v1.9.0
responds to the five-AI peer review panel of v1.8.0 (Microsoft
Copilot, DeepSeek, Mistral Le Chat, Grok, ChatGPT) with a
focused patch round closing the gaps the panel marked as
should-land-before-2.0: machine-readable skip justification,
ARIA bridge for a11y_hint, ProvenanceBlock enforcement in the
self-test, ARIA-to-NAC mapping table, ARIA drift tolerance
window, inert/readonly/aria-busy preflight, drag-type
registry, nac:action:confirm + :undoable event families,
data-nac-braille-label for deaf-blind users, and a public
roadmap document. Strict superset of v1.8.0: every v1.8 plugin
remains valid; every v1.7 plugin remains valid.

**Earlier version**: 1.8.0 (2026-05-07). v1.8.0
responds to the four-AI peer review panel of v1.7.0 (Microsoft
Copilot, DeepSeek, Mistral Le Chat, Grok) and lands every
agreed-upon action item in a single release. Highlights:
ProvenanceBlock on every nac:* event (`source: { type: 'user' |
'agent' | 'script', id?, tool? }`) closes the silent-failure
gap reviewers identified for users delegating multi-step UI
work to AI assistants -- the contract now records WHO drove
each action. New `nac:command:rejected` and `nac:command:failed`
event families (sec 6.2.30) close the case where a command
preflight fails (target disabled / hidden / not_found /
ambiguous / drag_type_mismatch) or an unexpected throw aborts
execution -- previously these were silent and the AI could
claim success based on no-event. New `data-nac-validate="skip"`
attribute (sec 5) lets hosts wrap third-party widgets they
cannot annotate while validate() emits a structured warning if
the skipped subtree contains interactives. New
`data-nac-a11y-hint` attribute lets `delete` buttons declare
`irreversible|requires_confirmation` so voice tools and screen
readers can warn users BEFORE invocation. Drag-drop type
validation (`data-nac-drag-type` on source +
`data-nac-drag-accept` on target). Migration tooling: public
`NAC.emit_dual()` helper, runtime
`NAC.validate_event_conformance()` (was demo-only in v1.7),
`NAC.check_canonical_shape()` pure utility, and a codemod
script in `tools/migrate-legacy-events.js`. Self-test promoted
to NAC-3 normative requirement (sec 6.2.27). Stable persistent
IDs required for paginated/virtualized lists (sec 6.2.31).
Focus pulse CSS custom properties documented and configurable
per attention/cognition need (sec 7.x). Strict superset of
v1.7.0: every v1.7 plugin remains valid; every v1.6.x legacy
alias still accepted by the matcher but `legacy_event_field`
warnings are now deduplicated by (event, field) per session.
Inherits v1.7.0's normative section 6.2 (canonical TypeScript
shapes per event family with entity-specific id fields:
action_id, field_id, tab_id, section_id, column_id, source_id,
target_id, etc instead of the ambiguous nac_id). The reference demo at
yujin.app/nac-spec/example.php gained 11 new widget cards
covering every event family in sec 6.2 (stepper, tree, toast,
drawer, calendar, chart, map, richtext, breadcrumb, carousel,
timeline) and a new "v1.7 event conformance" self-test that
programmatically exercises each widget and asserts the emitted
event matches its canonical shape. v1.6.6
added 'sort-control' and 'filter-control' to the role-event
family map (so NAC.click on table column headers + filter
inputs resolves on nac:table:sort_changed /
nac:table:filter_changed instead of timing out). The matcher
also accepted column_nac_id and filter_nac_id as nac_id-equal
detail fields for those events. v1.6.5
was a runtime-only patch (2026-05-07): closes the
detached-element matcher edge case where a host's click handler
removes el from the DOM before emitting nac:field:changed
(combobox-option case). Caches plugin/opt-value at click() time
so the matcher works regardless of detachment. Also makes
NAC.go_to_section() set [data-nac-section-visited="1"] on the
target for 1500ms so an agent tour produces visible feedback
even when the section is already in viewport. v1.6.4
was a runtime-only patch (2026-05-07): NAC.click resolved two
matcher gaps that v1.6.3 left open. (1) Combobox-option click:
the matcher now accepts nac:field:changed when the clicked
option's data-nac-value matches event.detail.new_value within
the same data-nac-plugin scope. (2) Toggle-class field click
(checkbox / radio / toggle / switch): the runtime synthesises
nac:field:changed after el.click() when the host did not emit
one within ~32ms. v1.6.3
was a runtime-only patch (2026-05-07): NAC.click was made
role-aware on the success-event side. Pre-v1.6.3 click() only
listened for nac:action:succeeded / :failed, so calling it on a
combobox option (data-nac-role="option", emits
nac:field:changed) timed out at 5s even though the option was
selected. v1.6.3 picks the right success / failure event family
per role -- option, tab, breadcrumb-item, accordion-toggle,
step, pagination-item, confirm-button -- with the action contract
also listened-for as a safety net. No spec contract change;
this implements existing widget-event vocabulary correctly.
v1.6.2 is
a runtime-only patch (2026-05-07): implements `NAC.drag_drop`
which spec sec 13.4 had declared since v1.1 but the runtime
never landed. Discovered same-day by user-testing the v1.6.1
demo: an agent asked to drag Alpha to the right list timed out
because no programmatic drag entry point existed; the agent
fell back to `NAC.click` on a draggable, which never resolves.
v1.6.2 closes the loop without changing any spec contract.
v1.6.1 is
a patch release responding to AI peer review of v1.6.0
(ChatGPT, Mistral Le Chat, Microsoft Copilot, Claude 4.7 Deep
Thinking, DeepSeek, HuggingChat, Grok). Strict superset of
v1.6.0; every v1.6.0 plugin remains valid. Highlights:
section 7.3.2 promotes `aria_nac_state_mismatch` and
`aria_first_state` to hard-errors at NAC-3 (default-on, opt-out
via `set_validation_tolerance`); section 7.4 makes per-plugin
event buses default-on (root-level dispatch is now mandatory in
addition to document-level); section 7.4 declares closed shadow
roots explicitly out of scope with a canonical bridge pattern;
runtime adds `NAC.is_blocked()` canonical block-detection probe
and `NAC.set_validation_tolerance()` for incremental retirement
of historic findings. v1.6.0 added the `NAC.reset()`
plugin-reset primitive (normative section 9.3 + a new
`nac:plugin:reset` event), so an operator can ask any
NAC-compliant plugin (or the whole page) to return to its
declared initial state. v1.5.4 was the previous release: a
demo-only patch that shipped exhaustive 10-locale i18n on every
visible string of the reference demo. v1.5.1 added normative
section P7.1 (cross-plugin uniqueness + `NAC.validate_global()`)
and P7.2 (recommended nac_id grammar). v1.5.0 added the
canonical NAC + LLM agentic loop pattern (informative sections
9.1 and 9.2). v1.4.2 normative additions on top of v1.4.1:
P5.0 return shapes, 6.1 NAC-3 event-family scoping, 7.3.1
NAC-drives-ARIA-mirrors direction, 7.5 confirm-dialog contract,
plus tightened plugin-id rule (sec 7.4) and click_by_verb
tie-break + tab_by_label matching rules (sec P5). See
CHANGELOG.md for the full diff.
**Date**: 2026-05-08 (v1.9.0).
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

The downstream beneficiary of this complementarity is, more
often than not, a human with a disability. ARIA targets the
assistive tool that announces the UI; NAC targets the
operator that drives it. Voice-control users (motor
disabilities), screen-reader users (visual disabilities), and
users who delegate multi-step UI work to an AI assistant
(cognitive disabilities, chronic illness, ADHD, executive-
function variation) all benefit from the same contract.
NAC's `NAC.describe()` enriches what ARIA exposes with
operable-state metadata; NAC's `data-nac-id` + `label_i18n`
gives voice control deterministic identifiers across layouts
and themes; the agentic loop pattern (sec 9.1, 9.2) makes
delegation auditable via `NAC.snapshot_state()` +
`nac:action:succeeded` event logs so the user keeps oversight.
The longer treatment, including why agent infrastructure and
accessibility infrastructure converge in the same contract, is
in [`docs/PHILOSOPHY.md`](../docs/PHILOSOPHY.md) "What NAC
does for people with disabilities".

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
  /* v1.6.0 plugin reset primitive (section 9.3) */
  reset(plugin_slug?: string): Promise<NacResetResult>;
  set_reset_provider(plugin_slug: string,
                     fn: () => void | Promise<void>): void;
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

##### Tie-break (normative, added v1.4.2)

When multiple `actions[]` entries within the resolved plugin's
manifest share the same `verb`, `click_by_verb` MUST pick the
**first match in `actions[]` array order**. Plugin authors that
need different behaviour MUST give the actions distinct verbs;
the first-match rule is deterministic and SHOULD NOT be relied
on for routing. `NAC.validate(plugin)` from v1.4.2 onward emits
a `warn` finding `duplicate_verb` for any plugin manifest that
declares two actions with the same `verb`.

When the manifest yields no match, `click_by_verb` falls back
to a DOM scan within the plugin root for
`[data-nac-action="<verb>"]`. The scan returns the **first
match in DOM order**. Same first-match-wins rule applies.

##### Label matching for `tab_by_label` (normative, added v1.4.2)

The label argument is matched against, in order:

1. `tabs[i].label` (legacy single-locale label, if present).
2. Every value of `tabs[i].label_i18n` (every locale present
   in the manifest, not just the active locale -- a voice
   agent that speaks "failed" in English on a Spanish-locale
   page should still find a tab whose `label_i18n.en === 'failed'`).
3. `tabs[i].nac_id` (last-resort identifier match).

Comparison rules:

- **Case-insensitive**: both sides lower-cased via the language-
  insensitive Unicode `toLowerCase()` before compare.
- **Whitespace-trimmed**: leading/trailing whitespace stripped.
- **Locale-aware optional**: implementations MAY use
  `Intl.Collator(undefined, { sensitivity: 'base' })` for
  matches sensitive to language-specific equivalences (Turkish
  dotless-i, German esszett, full-width vs half-width). The
  reference runtime uses simple lower-cased trim; this is
  spec-permitted but stricter implementations are encouraged.
- **No partial matches by default**: the strings MUST be equal
  after the above normalisations. A future minor version MAY
  add a `{ partial: true }` option for substring search.

When two tabs match the same label after normalisation,
`tab_by_label` MUST pick the **first match in `tabs[]` array
order** (same first-match rule as `click_by_verb`).
`NAC.validate(plugin)` emits a `warn` finding `duplicate_tab_label`
for plugins that declare two tabs with the same label across
their declared locales.

The API MUST resolve `nac_id` first inside the active plugin, then
fall back to global lookup. Operations on missing IDs MUST throw a
typed `NacError` containing `code: 'not_found' | 'disabled' |
'invalid' | 'timeout'`.

#### P5.0 -- Return shapes (normative, added v1.4.2)

> Added in v1.4.2 in response to AI peer review action item
> 3.5-A (Copilot, 2026-05-06). Pre-v1.4.2 the names below were
> declared in P5 method signatures but not formalised, so an
> AI test runner reading the spec cold could not rely on the
> shape of `describe().kpis[i].value` and similar.

Every read function in the P5 interface returns one of the
following shapes. All fields listed are normative; runtimes
MUST emit them; consumers MAY ignore additional fields the
runtime adds (forwards-compatible extension policy).

```typescript
interface NacElement {
  nac_id:    string;            // canonical addressable ID
  role:      NacRole;            // P2 role token
  state:     string | null;     // current data-nac-state value, or null
  label:     string;             // resolved label (aria-label || textContent || nac_id)
  value:     string | number | boolean | null;
                                 // current value if input/select/textarea/contenteditable;
                                 // null otherwise. KPI value rendering: see NacKpi below.
  action:    string | null;      // verb if role='action', else null
  field_type: string | null;    // data-nac-field-type if role='field', else null
  plugin:    string | null;      // owning plugin slug, or null if global
  plugin_instance_id: string | null; // P5.1 multi-mount discriminator
  disabled:  boolean;            // disabled || aria-disabled='true'
  hidden:    boolean;            // aria-hidden='true' || display:none
  error:     string | null;      // data-nac-error if present
}

interface NacSnapshot {
  active:   string | null;       // active plugin slug per P5.1
  plugins:  Array<{
    plugin:  string;
    version: string;
    state:   'opening' | 'ready' | 'closing' | 'closed' | null;
    elements: NacElement[];
  }>;
  fields:   NacElement[];        // flat list, role='field'
  actions:  NacElement[];        // flat list, role='action'
  kpis:     NacKpiReadout[];     // see below
  tabs:     NacElement[];        // flat list, role='tab'
  feedback: NacFeedback[];
  timestamp: number;             // Date.now() at snapshot creation
}

interface NacKpiReadout {
  nac_id:   string;
  label:    string;              // localised label
  value:    string | number | null;
                                 // primary numeric/textual value
  format?:  string;              // declared format token (e.g. 'currency', 'percent')
  unit?:    string;              // declared unit (e.g. 'USD', '%')
  trend?:   'up' | 'down' | 'flat' | null;
                                 // optional, when manifest declares it
  plugin:   string | null;
}

interface NacFeedback {
  severity: 'info' | 'warn' | 'error' | 'success';
  message:  string;              // localised text
  nac_id:   string | null;       // element this feedback is bound to, or null if global
  plugin:   string | null;
  timestamp: number;
}

interface NacEvent {
  event:  string;                // canonical event name e.g. 'nac:action:succeeded'
  detail: object;                // event payload
}

interface NacResult {
  ok:     boolean;
  event:  NacEvent | null;       // the event that resolved the awaitable write,
                                 // or null only when the manifest declared
                                 // dispatch_mode:'sync' for that action
                                 // (see section 7.1).
}

interface NacStateSnapshot {
  active:    string | null;      // plugin slug per P5.1
  errors:    NacElement[];       // every element with state='invalid' or 'error'
  feedback:  NacFeedback[];
  timestamp: number;
}
```

The interface names above are the ones already used in the P5
function signatures higher in this section. Pre-v1.4.2 they
appeared only as type annotations without bodies; v1.4.2
makes the bodies normative.

Backwards compatibility: every v1.4.0 reference-runtime
return value already conforms to these shapes (the bodies
were extracted from the runtime, not invented). Existing
consumers do not need changes.

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

#### P7.1. Cross-plugin uniqueness and validate_global() (normative, added v1.5.1)

> Added in v1.5.1 in response to user question: "how does NAC
> avoid duplicate keys in a large system, and does it report
> duplicates?".

`nac_id` is a single global namespace within a mounted page. Two
manifests that declare the same `nac_id` make
`find()` / `click()` resolution order-dependent and brittle.

To prevent this:

1. **Convention (P1 reaffirmed)**: every `nac_id` SHOULD be
   prefixed with its owning plugin's slug followed by a dot
   (e.g. `patch_manager.apply_all`, `patch_manager.row.123.apply`).
   The convention makes collisions structurally impossible as
   long as plugin slugs themselves are unique.
2. **Register-time warning**: when a plugin calls
   `NAC.register({...})` with a `nac_id` that another already-
   registered manifest also declares, the runtime emits
   `console.warn('[NAC] duplicate nac_ids between plugin "A" and
   "B": [...]')`. The warning fires once per `register()` call
   and never blocks registration -- it is a dev-time signal,
   not a runtime gate.
3. **CI gate via `NAC.validate_global()`**: the structured
   audit returns:

```typescript
interface NacGlobalReport {
  ok:         boolean;            // false when duplicates exist
  duplicates: { nac_id: string, plugins: string[] }[];
  orphans:    { nac_id: string, in_dom: true,
                in_manifest: false, plugin_root: string|null }[];
  unmounted:  { nac_id: string, in_manifest: true,
                in_dom: false, plugin: string }[];
  convention_violations: { nac_id: string, plugin: string,
                           hint: string }[];
  plugin_count: number;
  total_ids:    number;
  timestamp:    number;
}
```

   Field semantics:
   - `duplicates`: same `nac_id` declared in two or more
     manifests. Always a hard error at NAC-3.
   - `orphans`: a `data-nac-id` attribute is in the DOM but
     no manifest declares it. Often legitimate (dynamically
     added rows, host-injected widgets) but flagged so the
     CI gate can require an explicit allow-list.
   - `unmounted`: declared in manifest but absent from DOM
     when the audit ran. Same finding shape as v1.4.1
     `missing_in_dom` from `validate(slug)`, surfaced
     globally.
   - `convention_violations`: `nac_id` does not start with
     `<plugin_slug>.` (or equal the slug itself). Warn
     severity at NAC-3.

A NAC-3 codebase that declares "drift is a CI blocker" SHOULD
run `NAC.validate_global()` after the per-plugin
`validate(slug)` loop and fail the build on any
`duplicates.length > 0`. The reference runtime exposes the
function from v1.5.1 onward.

#### P7.2. Recommended nac_id grammar (informative)

```
nac_id        ::= plugin_slug "." element_path
plugin_slug   ::= /[a-z][a-z0-9_]*/        ; one of the registered plugins
element_path  ::= segment ( "." segment )*
segment       ::= /[a-z][a-z0-9_]*/        ; one segment of the path

Examples:
  patch_manager.apply_all                       (top-level action)
  patch_manager.row.42.apply                    (action on a specific row)
  patch_manager.tab.failed                      (tab)
  patch_manager.field.environment               (field)
```

The grammar is informative; runtimes accept any non-empty
`nac_id` string. The CI gate via `validate_global()` calls
out violations as `convention_violations`, not errors,
because legacy ports may carry pre-v1.5 ids that do not
match.

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

## 3.1. Additional declarative attributes (v1.8.0, normative)

Two new declarative attributes land in v1.8.0. Both are
optional; absence preserves the v1.7 contract verbatim.

### data-nac-validate="skip"

Marks an HTML subtree as **out of scope for NAC-3 validation**.
Use it when the host wraps a third-party widget that emits its
own ARIA / events but cannot be retrofitted with `data-nac-*`
attributes. Examples: a date-picker from a vendor library, a
WYSIWYG editor, a chat widget mounted from a CDN script.

The runtime guarantees:

1. `validate(slug)` and `validate_global()` MUST NOT raise
   `missing_required_event_field`, `aria_nac_state_mismatch`
   or `aria_first_state` findings on elements whose ancestor
   carries `data-nac-validate="skip"`.
2. The validator MUST emit a finding
   `skip_subtree_contains_interactives` (severity: `warn`)
   listing the count of `[data-nac-id]` and natively
   interactive descendants in the skipped subtree, so authors
   notice when they accidentally exclude operable surface.
3. Drivers (`NAC.click`, `NAC.fill`, `NAC.drag_drop`)
   continue to operate on elements inside the skipped subtree;
   the marker affects validation only, not operability.

```html
<section data-nac-validate="skip"
         data-nac-skip-reason="third_party_datepicker;remediate-by=2026-12-31"
         data-nac-id="vendor.datepicker">
  <!-- vendor widget mounted here; not retrofitted with data-nac-* -->
</section>
```

#### data-nac-skip-reason (REQUIRED, v1.9.0+)

A `data-nac-validate="skip"` element MUST also carry a
`data-nac-skip-reason` attribute with a machine-readable
justification. The format is a semicolon-separated list of
key-value pairs and bare tags:

```
data-nac-skip-reason="<category>[;remediate-by=YYYY-MM-DD][;tracker=<id>]"
```

Where `<category>` is one of:

| Category | Meaning |
|---|---|
| `third_party_widget` | Wrapped third-party component (vendor library, embed). |
| `legacy_unmodifiable` | Inherited code the team cannot touch. |
| `wip_remediation` | Active migration; team intends to retrofit. |
| `closed_shadow_root` | Closed shadow DOM (out of scope per sec 7.4). |
| `experimental` | Behind a feature flag, not production. |

The optional `remediate-by` field is a target date (ISO 8601)
for removing the skip marker. The optional `tracker` field is
a free-form identifier (issue number, ticket, etc).

The validator MUST emit `skip_without_reason` (severity:
`error` at NAC-3, `warn` at NAC-2) when `data-nac-validate="skip"`
appears without a `data-nac-skip-reason`. This requirement
exists because reviewers (Mistral, Microsoft Copilot, DeepSeek)
flagged that without enforced justification, "skip" becomes a
permanent escape hatch and brownfield apps stay non-compliant
indefinitely.

Audits and CI tooling SHOULD report:
- The total count of skip regions per page.
- The count of skip regions whose `remediate-by` is past.
- The count of skip regions per category (so teams see what
  they actually skip most).

This attribute exists because reviewers (DeepSeek, Microsoft
Copilot, Mistral Le Chat) flagged sec 7.3.2's hard-error gate
as the most likely cause of brownfield abandonment without an
escape hatch.

### data-nac-a11y-hint

Pipe-separated semantic tags declaring **what voice tools,
screen readers and AI agents should warn about BEFORE
invoking the action**. The runtime does not enforce
behaviour; it surfaces the hints in `NAC.describe()` output
as a parsed string array on the element so consumers can
interpose a confirmation step.

Recognised vocabulary (extensible by plugins):

| Tag                       | Meaning                                              |
|---------------------------|------------------------------------------------------|
| `irreversible`            | Cannot be undone (delete, finalize).                 |
| `data_loss`               | Replaces data without preservation.                  |
| `dangerous`               | Equivalent to "are you sure?" weight in HCI terms.   |
| `external_side_effect`    | Touches systems outside this app (email, webhook).   |
| `costly`                  | Triggers a billable side effect (API call, doc gen). |
| `requires_confirmation`   | UI flow expects a second confirm step.               |
| `long_running`            | Expected to take >2s; agent SHOULD inform user.      |
| `session_boundary`        | Action ends the session (logout, tenant cut-over, sign-out). |
| `audit_required`          | Action MUST survive compliance review (signed, logged, retained). |

```html
<button data-nac-id="invoice.delete"
        data-nac-role="action" data-nac-action="delete"
        data-nac-a11y-hint="irreversible|requires_confirmation|data_loss">
  Delete invoice
</button>
```

`describe()` output for the above:

```javascript
{
  nac_id: 'invoice.delete',
  role: 'action',
  /* ... */
  a11y_hint: ['irreversible', 'requires_confirmation', 'data_loss']
}
```

This attribute exists because reviewers (Mistral Le Chat,
DeepSeek) flagged that voice-control + agentic loops carry
a real risk of users-with-cognitive-disability triggering
irreversible actions without comprehension. The attribute is
the contract through which assistive software earns the
right to interpose.

#### ARIA bridge (REQUIRED runtime behaviour, v1.9.0+)

Screen readers DO NOT read `data-nac-*` attributes. To make
`data-nac-a11y-hint` consumable by AT today (without waiting
for screen-reader vendors to learn NAC), the runtime MUST
bridge each hint into ARIA at install time:

1. The runtime creates one hidden live region per page:
   `<div id="nac-a11y-hint-region" role="status"
   aria-live="polite" class="nac-sr-only"></div>` -- visually
   hidden via `clip:rect(0,0,0,0)` but readable by AT.

2. For each `[data-nac-a11y-hint]` element, the runtime
   appends to its `aria-describedby` (or sets it if absent)
   the ID of a per-element hidden span containing the
   resolved hint text.

3. The hint text is the localized human-readable expansion
   of each tag, joined by ". ":

   | Hint tag | Default text (en) |
   |---|---|
   | `irreversible` | "This action cannot be undone." |
   | `requires_confirmation` | "Confirmation will be required." |
   | `dangerous` | "Dangerous action." |
   | `long_running` | "May take a while." |
   | `costly` | "Triggers a billable side effect." |
   | `external_side_effect` | "Affects external systems." |
   | `data_loss` | "Replaces data without preservation." |

   Localized variants are supplied by the host via
   `NAC.set_a11y_hint_localizer(fn)` where `fn(tag, locale)`
   returns the localized string. Without a custom localizer,
   the runtime emits the en defaults plus any string in
   `<plugin>.label_i18n.a11y_hint.<tag>` if present in the
   manifest.

4. When the host clears or changes `data-nac-a11y-hint` on
   an element, the runtime MUST update the bridged
   `aria-describedby` and the hidden span synchronously.

```html
<!-- Author writes -->
<button data-nac-id="invoice.delete"
        data-nac-a11y-hint="irreversible|requires_confirmation">
  Delete invoice
</button>

<!-- Runtime mutates DOM at install time to: -->
<button data-nac-id="invoice.delete"
        data-nac-a11y-hint="irreversible|requires_confirmation"
        aria-describedby="nac-hint-invoice-delete">
  Delete invoice
</button>
<span id="nac-hint-invoice-delete" class="nac-sr-only">
  This action cannot be undone. Confirmation will be required.
</span>
```

The bridge runs once at install + on every mutation that
touches `data-nac-a11y-hint`. Without it, screen-reader users
would never hear hints regardless of how many AI agents
respect them.

#### Priority ordering (normative, v1.9.0+)

When an element carries multiple hint tags, consumers MUST
interpose using the strongest one as primary and MAY mention
the others as context. The normative order, highest first:

1. `audit_required`
2. `session_boundary`
3. `irreversible`
4. `data_loss`
5. `dangerous`
6. `external_side_effect`
7. `costly`
8. `requires_confirmation`
9. `long_running`

A button with `irreversible|requires_confirmation|data_loss`
opens an interposition that leads with "This action cannot be
undone" rather than "Confirmation will be required". The
runtime exposes `NAC.sort_hints_by_priority(hints)` that
returns the array sorted high-first; consumer-side localization
walks the sorted result.

The order is normative because v1.8 reviewers (Mistral, DeepSeek)
flagged that "AI agent picks first hint in array" produces
different interposition behaviour across implementations -- a
button that the host happens to write as `requires_confirmation|
irreversible` would interpose on the wrong tag. Fixing the
order at spec level removes that variance.

#### Custom hint vocabulary

Hosts MAY add custom hints (e.g., `compliance_review`,
`signs_legal_doc`) by including them in the pipe-separated
attribute alongside the recognised set. The runtime parses
custom tags into the `a11y_hint` array unchanged; the ARIA
bridge falls back to the raw tag text when the localizer has
no entry. Plugin authors who introduce a custom hint MUST
document it in the plugin manifest's `label_i18n.a11y_hint.<tag>`
entry so consumers can localise. Custom hints are sorted at the
bottom of the priority order (after `long_running`); to override
this, hosts can register a custom priority via
`NAC.set_hint_priority(['custom_tag', 'audit_required', ...])`.

### data-nac-confirmation-message

Optional override for the interposition text used by
`NAC.confirm_action()`. When present, the runtime uses this
attribute's value (or its `i18n:` reference) instead of the
auto-generated text from the localized hint vocabulary.

```html
<button data-nac-id="invoice.delete"
        data-nac-role="action" data-nac-action="delete"
        data-nac-a11y-hint="irreversible|requires_confirmation"
        data-nac-confirmation-message="Eliminar factura permanentemente?">
  Delete invoice
</button>
```

Or, with an i18n key:

```html
<button data-nac-id="invoice.delete"
        data-nac-confirmation-message="i18n:invoice.delete.confirm">
  Delete invoice
</button>
```

When the value starts with `i18n:`, the runtime resolves the
remainder against `NAC.set_a11y_hint_localizer(fn)` (passing
the key as `tag`) and uses the result. This lets hosts that
already maintain a translation catalog reuse it without writing
strings inline.

The attribute responds to Grok's v1.8 finding that auto-generated
hint text is too generic for high-stakes domain actions ("This
action cannot be undone" vs "Eliminar factura #2026-04223 sin
recuperacion?"). Both work; the second produces meaningfully
better confirmation UX for a domain user.

### data-nac-braille-label

For users on refreshable braille displays (~40 chars wide) or
deaf-blind users on screen-reader-plus-braille setups, a
NAC element MAY declare an extra-short label specifically for
braille output:

```html
<button data-nac-id="invoice.delete"
        data-nac-action="delete"
        aria-label="Delete invoice"
        data-nac-braille-label="Del">
  Delete invoice
</button>
```

The runtime MUST surface `braille_label` on
`NAC.describe()` / `NAC.find()` output. Voice tools and AT
that produce braille output SHOULD prefer
`data-nac-braille-label` over `aria-label` when the rendering
medium is braille; SHOULD fall back to `aria-label` when no
`data-nac-braille-label` exists.

The runtime does NOT bridge this attribute into ARIA -- ARIA
has no braille-specific channel. Consumers that produce
braille (Bristol Braille Canute, refreshable displays via
NVDA/JAWS braille mode) read it directly from
`NAC.describe()`. Vocabulary: as short as feasible while
unique within the page (typical: 3-8 characters).

This attribute responds to DeepSeek's v1.8 review finding that
the spec under-served deaf-blind users.

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

### 6.1. Required vs optional event families per level (normative, added v1.4.2)

> Added in v1.4.2 in response to AI peer review action item
> 3.5-E (Copilot, 2026-05-06). Pre-v1.4.2, NAC-3 was read by
> some reviewers as "every event family in v1.0..v1.4 is
> required for every plugin". That interpretation forces a
> plugin that ships zero accordions to also emit
> `nac:accordion:expanded`, which is absurd. The correct rule
> -- "events are required only for widget families the plugin
> actually uses" -- is now stated normatively here.

**Universal MUST events at NAC-3** (every plugin emits these
regardless of which widgets it ships):

- `nac:plugin:opening`
- `nac:plugin:opened`
- `nac:plugin:closing`
- `nac:plugin:closed`
- `nac:action:dispatching`
- `nac:action:succeeded` (or `:failed` per action call)
- `nac:field:changed` (only if the plugin declares any field
  in its manifest; otherwise N/A)

**Conditional MUST events at NAC-3** (the plugin emits these
*if and only if* its manifest declares the corresponding
widget family). Examples (non-exhaustive, generalises to
every widget family):

| Manifest declares      | Plugin MUST emit                                    |
|------------------------|-----------------------------------------------------|
| any tab in `tabs[]`    | `nac:tab:changed`                                   |
| accordion in DOM       | `nac:accordion:expanded`, `:collapsed`              |
| confirm dialog         | `nac:confirm:requested`, `:resolved`, `:cancelled`  |
| stepper                | `nac:step:advanced`, `:back`                        |
| tree                   | `nac:tree:expanded`, `:collapsed`, `:selected`      |
| toast/banner           | `nac:toast:shown`, `:dismissed` (banner same)       |
| drawer/bottom-sheet    | `nac:drawer:opened`, `:closed`, `:peeked`           |
| calendar               | `nac:calendar:view_changed`, `:event_selected`      |
| chart                  | `nac:chart:data_loaded`, `:series_toggled`          |
| map                    | `nac:map:focused`, `:marker_selected`               |
| richtext               | `nac:richtext:formatted`, `:link_inserted`          |
| breadcrumb             | `nac:breadcrumb:navigated`                          |
| carousel               | `nac:carousel:advanced`                             |
| timeline               | `nac:timeline:loaded`                               |
| reorder list           | `nac:reorder:applied`                               |

**MAY events** (every level, optional):

- `nac:focus:moved` (v1.4.1+, emitted by the runtime, not by
  the plugin; plugins do NOT need to emit this themselves).
- `nac:state:changed` for non-canonical states the plugin
  defines (always optional, useful for telemetry).
- `nac:section:reached` for section landmarks (v1.2 sec 14.7).

**Validator behaviour at NAC-3**:

- A plugin that declares `tabs[]` in its manifest but never
  emits `nac:tab:changed` is non-compliant. Validator: `error`,
  code `missing_required_event`.
- A plugin that does NOT declare `tabs[]` and never emits
  `nac:tab:changed` is fine.
- The validator MUST treat the conditional table above as
  exhaustive: a widget family in DOM (detected via
  `data-nac-role` scan) without the corresponding manifest
  declaration is itself a `warn` finding (code
  `widget_in_dom_not_in_manifest`); a manifest declaration
  without DOM presence is a `warn` (`widget_in_manifest_not_in_dom`,
  this is the v1.4.1 missing_in_dom case).

**Rationale**: the v1.4.0 spec was internally consistent but
ambiguous about scope. v1.4.2 makes the per-family scoping
explicit so a plugin author who ships only the v1.0 base + a
single tablist + a confirm dialog does NOT accidentally lose
NAC-3 by failing to emit `nac:accordion:expanded` for an
accordion the plugin never uses.

---

## 6.2. Canonical event detail shapes (normative, added v1.7.0)

> Added in v1.7.0 in response to the v1.6 AI peer review's #1
> abandonment cause -- "the validator is reactive, not
> preventive". v1.4..v1.6.6 had the runtime accumulate matcher
> tolerances (accept `nac_id` here, `column_nac_id` there,
> `from_nac_id` elsewhere) so consumers could cope with hosts
> that emitted events with divergent detail shapes. v1.7.0
> closes the loop by declaring the canonical shape for every
> NAC event, with each event family having its own
> entity-specific id field (`action_id`, `field_id`, `tab_id`,
> `column_id`, `section_id`, etc) instead of the ambiguous
> `nac_id`. The runtime keeps legacy field names (e.g.
> `nac_id`) accepted for one major version with a
> `legacy_event_field` warning emitted by the validator;
> v2.0 will drop them.

### 6.2.1. Universal base

Every `nac:*` event detail extends:

```typescript
interface ProvenanceBlock {
  // Who triggered the event. Required at NAC-3 (v1.8+).
  // - 'user'   : real DOM input (mouse, keyboard, touch).
  // - 'agent'  : an autonomous AI / RPA / voice agent.
  //              MUST set tool to identify itself.
  // - 'script' : page script, runtime helper, or unidentified.
  //              Default when the runtime emits without context.
  type: 'user' | 'agent' | 'script';
  // Stable identifier of the actor when available.
  // For 'agent': session id, conversation id, etc.
  // For 'user': may be a session correlator; SHOULD NOT be PII.
  id?: string;
  // For 'agent': name + version of the tool.
  //   e.g. 'claude-code/0.2.4', 'voice-control/talon-1.6'.
  tool?: string;
}

interface NacEventBase {
  // From data-nac-plugin on the originating root. Required.
  plugin: string;
  // From data-nac-plugin-id on the originating root, when
  // the host mounts multiple instances of the same plugin.
  // null when only one instance exists. Required field; may
  // be null. See sec 7.4.
  plugin_instance_id: string | null;
  // Optional wall-clock timestamp the runtime SHOULD set when
  // it emits an event itself; hosts MAY set it. Useful for
  // telemetry consumers ordering events across plugin buses.
  ts?: number;
  // Provenance of the action that produced this event. The
  // runtime defaults to { type: 'script' } when no caller
  // sets it. AI agents and voice tools MUST set { type:
  // 'agent', tool: '...' } so audit pipelines can distinguish
  // human from automated traffic. Required at NAC-3 (v1.8+).
  source: ProvenanceBlock;
}
```

The legacy field `plugin_slug` (used in v1.0..v1.3 emitters as
the plugin id) is deprecated; v1.4.1+ runtimes MUST alias it
to `plugin`. Implementations MAY emit both for compatibility.

#### Precedence between canonical and legacy fields

When a detail carries both a canonical field (e.g. `field_id`)
and its legacy alias (e.g. `nac_id`), the canonical field is
authoritative. Consumers MUST read the canonical first and only
fall back to the legacy alias if the canonical is absent. The
runtime SHOULD emit a `legacy_event_field` warning the first
time it observes a consumer reading a legacy alias on an event
type+field combination; subsequent reads of the same combination
in the same session are deduplicated. This avoids the "400
identical warnings per user action" failure mode flagged in
the v1.7 peer review.

#### Emission order

When a producer fires both a canonical event name and its
legacy alias (e.g. `nac:accordion:expanded` AND
`nac:section:expanded`), it MUST fire the canonical name FIRST
in the same synchronous emission cycle (same task tick). The
helper `NAC.emit_dual(canonical, legacy, detail)` enforces this.
Listeners that subscribe to only the canonical name therefore
receive the event on the same tick they would have received the
legacy event, ensuring no migration latency.

#### Provenance examples

A real user click:

```javascript
// Runtime sees a real bubbling click event from the user.
detail.source = { type: 'user' };
```

An AI agent invoking NAC.click via an RPA tool:

```javascript
await NAC.click('quotation.send', {
  source: { type: 'agent', id: 'sess-9b2c', tool: 'claude-code/0.2.4' }
});
// detail.source = { type: 'agent', id: 'sess-9b2c', tool: 'claude-code/0.2.4' }
```

A page script firing a synthetic event:

```javascript
// Runtime defaults to script when no opts.source given.
NAC.emit_dual('nac:field:changed', null, {
  plugin: 'order_form', field_id: 'qty', new_value: 5
});
// detail.source = { type: 'script' }
```

Audit pipelines for users with cognitive disabilities who
delegate to an AI MUST be able to distinguish `user` from
`agent` traffic. A consent flow that asks "your AI assistant
wants to send the quotation, approve?" requires this distinction
to be a load-bearing primitive of the contract, not a guess
from event timing.

### 6.2.2. Plugin lifecycle (4+1 events)

```typescript
interface NacPluginOpeningDetail extends NacEventBase {}
interface NacPluginOpenedDetail extends NacEventBase {
  version: string;     // from manifest.version, required
}
interface NacPluginClosingDetail extends NacEventBase {}
interface NacPluginClosedDetail extends NacEventBase {}
interface NacPluginResetDetail extends NacEventBase {
  source: 'custom' | 'generic' | 'custom+generic';
  reason?: string;
}
```

### 6.2.3. Action lifecycle (3 events)

```typescript
interface NacActionDispatchingDetail extends NacEventBase {
  action_id: string;   // canonical (was nac_id in v1.0..v1.6)
  verb: string;        // from manifest.actions[].verb
}
interface NacActionSucceededDetail extends NacEventBase {
  action_id: string;
  verb: string;
  result?: any;        // action-specific payload
  duration_ms?: number;
}
interface NacActionFailedDetail extends NacEventBase {
  action_id: string;
  verb: string;
  error: string;       // human-readable
  error_code?: string; // machine-readable, e.g. 'timeout'
}
```

Legacy alias: `nac_id` maps to `action_id`.

### 6.2.4. Field changed (1 event)

```typescript
interface NacFieldChangedDetail extends NacEventBase {
  field_id: string;        // canonical (was nac_id)
  field_type?: string;     // 'text'|'select'|'checkbox'|...
  new_value: any;          // primitive or object
  old_value?: any;         // optional
  // For combobox option clicks: id of the chosen option.
  // Pre-v1.7 was implicit (matcher used data-nac-value).
  option_id?: string | null;
  synthesised?: boolean;   // set by runtime when click() on a
                           // toggle field synthesised the event
                           // (see v1.6.4 runtime patch).
}
```

Legacy alias: `nac_id` maps to `field_id`.

### 6.2.5. Tab changed (1 event)

```typescript
interface NacTabChangedDetail extends NacEventBase {
  tab_id: string;          // canonical (was nac_id or tab_id)
  tabset_id?: string;      // optional, the tablist container
  prior_tab_id?: string | null;
}
```

### 6.2.6. Accordion (2 events)

```typescript
interface NacAccordionExpandedDetail extends NacEventBase {
  section_id: string;      // canonical (was nac_id)
}
interface NacAccordionCollapsedDetail extends NacEventBase {
  section_id: string;
}
```

Legacy alias: `nac:section:expanded` (used by some v1.0..v1.6
hosts) is deprecated; emitters MUST switch to
`nac:accordion:expanded` for accordion-section widgets. The
generic `nac:section:reached` (sec 6.2.18) is for SECTION
LANDMARKS, NOT for accordion sections -- different role.

### 6.2.7. Confirm-dialog (3 events)

```typescript
interface NacConfirmRequestedDetail extends NacEventBase {
  confirm_id: string;
  message: string;
}
interface NacConfirmResolvedDetail extends NacEventBase {
  confirm_id: string;
  choice: string;          // 'confirm' | 'cancel' | <custom>
}
interface NacConfirmCancelledDetail extends NacEventBase {
  confirm_id: string;
}
```

### 6.2.8. Stepper (2 events)

```typescript
interface NacStepAdvancedDetail extends NacEventBase {
  stepper_id: string;
  from_index: number;
  to_index: number;
  total: number;
}
interface NacStepBackDetail extends NacEventBase {
  stepper_id: string;
  from_index: number;
  to_index: number;
}
```

### 6.2.9. Tree (3 events)

```typescript
interface NacTreeExpandedDetail extends NacEventBase {
  tree_id: string;
  node_id: string;
}
interface NacTreeCollapsedDetail extends NacEventBase {
  tree_id: string;
  node_id: string;
}
interface NacTreeSelectedDetail extends NacEventBase {
  tree_id: string;
  node_id: string;
  prior_node_id?: string | null;
}
```

### 6.2.10. Toast / banner (2 events)

```typescript
interface NacToastShownDetail extends NacEventBase {
  toast_id: string;
  severity: 'info' | 'warn' | 'error' | 'success';
  message: string;
}
interface NacToastDismissedDetail extends NacEventBase {
  toast_id: string;
  by: 'user' | 'timeout' | 'programmatic';
}
```

### 6.2.11. Drawer / bottom-sheet (3 events)

```typescript
interface NacDrawerOpenedDetail extends NacEventBase {
  drawer_id: string;
}
interface NacDrawerClosedDetail extends NacEventBase {
  drawer_id: string;
}
interface NacDrawerPeekedDetail extends NacEventBase {
  drawer_id: string;
}
```

### 6.2.12. Calendar (2 events)

```typescript
interface NacCalendarViewChangedDetail extends NacEventBase {
  calendar_id: string;
  view: 'month' | 'week' | 'day' | 'agenda' | string;
  range_start?: string;    // ISO 8601
  range_end?: string;
}
interface NacCalendarEventSelectedDetail extends NacEventBase {
  calendar_id: string;
  event_id: string;
}
```

### 6.2.13. Chart (2 events)

```typescript
interface NacChartDataLoadedDetail extends NacEventBase {
  chart_id: string;
  series_count: number;
  point_count?: number;
}
interface NacChartSeriesToggledDetail extends NacEventBase {
  chart_id: string;
  series_id: string;
  visible: boolean;
}
```

### 6.2.14. Map (2 events)

```typescript
interface NacMapFocusedDetail extends NacEventBase {
  map_id: string;
  center?: { lat: number; lng: number };
  zoom?: number;
}
interface NacMapMarkerSelectedDetail extends NacEventBase {
  map_id: string;
  marker_id: string;
}
```

### 6.2.15. Richtext (2 events)

```typescript
interface NacRichtextFormattedDetail extends NacEventBase {
  richtext_id: string;
  format: string;          // 'bold'|'italic'|'h1'|...
}
interface NacRichtextLinkInsertedDetail extends NacEventBase {
  richtext_id: string;
  href: string;
}
```

### 6.2.16. Breadcrumb (1 event)

```typescript
interface NacBreadcrumbNavigatedDetail extends NacEventBase {
  breadcrumb_id: string;
  to_index: number;
  to_label?: string;
}
```

### 6.2.17. Carousel (1 event)

```typescript
interface NacCarouselAdvancedDetail extends NacEventBase {
  carousel_id: string;
  index: number;
  total: number;
  direction: 'forward' | 'backward';
}
```

### 6.2.18. Timeline (1 event)

```typescript
interface NacTimelineLoadedDetail extends NacEventBase {
  timeline_id: string;
  loaded_count: number;
  direction: 'older' | 'newer';
}
```

### 6.2.19. Reorder list (2 events)

```typescript
interface NacReorderAppliedDetail extends NacEventBase {
  list_id: string;         // canonical
  item_id: string;         // canonical
  from_index: number;
  to_index: number;
}
interface NacListReorderedDetail extends NacEventBase {
  list_id: string;
  item_id: string;
  from_index: number;
  to_index: number;
}
```

### 6.2.20. Table (3 events)

```typescript
interface NacTableSortChangedDetail extends NacEventBase {
  table_id: string;        // canonical (was nac_id)
  column_id: string;       // canonical (was column_nac_id)
  direction: 'asc' | 'desc' | 'none';
}
interface NacTableFilterChangedDetail extends NacEventBase {
  table_id: string;
  filter_id: string;       // canonical (was filter_nac_id)
  value: any;
  cleared: boolean;
}
interface NacTablePageChangedDetail extends NacEventBase {
  table_id: string;
  page_n: number;
  page_size: number;
}
```

### 6.2.21. Slider (1 event)

```typescript
interface NacSliderValueChangedDetail extends NacEventBase {
  field_id: string;        // slider is a field role
  value: number;
  min?: number;
  max?: number;
}
```

### 6.2.22. Drag (4 events)

```typescript
interface NacDragStartedDetail extends NacEventBase {
  source_id: string;       // canonical (was from_nac_id)
}
interface NacDragOverDetail extends NacEventBase {
  source_id: string;
  target_id: string;       // canonical (was over_nac_id)
}
interface NacDragDroppedDetail extends NacEventBase {
  source_id: string;
  target_id: string;       // canonical (was target_nac_id)
  value?: any;
}
interface NacDragCancelledDetail extends NacEventBase {
  source_id: string;
  reason?: 'esc' | 'invalid_target' | 'aborted';
}
```

### 6.2.23. Dropzone / file upload (5 events)

```typescript
interface NacDropzoneDroppedDetail extends NacEventBase {
  dropzone_id: string;
  file: { name: string; size: number; type: string };
}
interface NacDropzoneDragOverDetail extends NacEventBase {
  dropzone_id: string;
}
interface NacFileAddedDetail extends NacEventBase {
  dropzone_id: string;
  file: { name: string; size: number; type: string };
}
interface NacFileUploadProgressDetail extends NacEventBase {
  dropzone_id: string;
  bytes_sent: number;
  bytes_total: number;
  pct: number;
}
interface NacFileUploadCompletedDetail extends NacEventBase {
  dropzone_id: string;
  file: { name: string; size: number };
  file_id: string;
}
```

### 6.2.24. Section reached (1 event)

```typescript
interface NacSectionReachedDetail extends NacEventBase {
  section_id: string;      // canonical (was nac_id)
  label?: string;
}
```

### 6.2.25. Generic state changed (1 informative event)

```typescript
interface NacStateChangedDetail extends NacEventBase {
  // The element that changed. nac_id is correct here because
  // this generic event covers ANY data-nac-id'd element with
  // a custom state (not a typed widget event); there is no
  // entity-specific id naming.
  nac_id: string;
  state: string;           // current data-nac-state value
  prior_state?: string;
}
```

### 6.2.26. Focus moved (1 informative, runtime-emitted)

```typescript
interface NacFocusMovedDetail extends NacEventBase {
  nac_id: string;          // the element receiving focus
  via: 'click' | 'fill' | 'select' | 'tab' | 'keyboard' |
       'programmatic';
}
```

### 6.2.27. Validator behaviour at NAC-3

`NAC.validate(slug)` and `NAC.validate_global()` MUST inspect
emitted events (during a CI dry-run that exercises the plugin's
actions and fields) and report:

- `legacy_event_field` (severity `warn` at NAC-2, `warn` at
  NAC-3 with hard-error opt-in via
  `set_validation_tolerance({legacy_fields:'error'})`).
  Triggered when an event detail uses a deprecated alias
  (e.g. `nac_id` for an action event instead of `action_id`).
  v1.8+ runtimes MUST deduplicate this warning by `(event_type,
  field)` per session so a chatty page does not flood the
  console with hundreds of identical warnings per single user
  action.
- `missing_required_event_field` (severity `error` at NAC-3).
  Triggered when an event detail omits a field this section
  declares as required.
- `unknown_event_family` (severity `warn`). Triggered when a
  plugin emits a `nac:*` event whose family is not declared
  in this section AND the plugin's manifest does not declare
  it as a custom event.
- `skip_subtree_contains_interactives` (severity `warn`).
  Triggered when a `data-nac-validate="skip"` subtree (sec 5)
  contains `[data-nac-id]` elements or interactive native
  controls. The subtree is correctly excluded from NAC-3
  enforcement, but the warning surfaces that operable surface
  is being hidden from drivers, so authors notice when they
  accidentally exclude live UI.

#### Self-test as a normative requirement (v1.8+)

A NAC-3 conformant runtime MUST expose
`NAC.validate_event_conformance(driver, opts)` (sec 13.5).
A NAC-3 conformant page MUST be drivable end-to-end such that
the self-test reports `pass` for every event family the page
declares in its manifests, with `fail` and `miss` both zero.
CI gates SHOULD invoke this method during the same pass that
runs `validate()`/`validate_global()` and treat a non-zero
`fail` count as a hard error. v1.7 shipped the self-test as
demo-only source; v1.8 promotes it to a runtime method and a
required NAC-3 gate (Mistral peer-review action item).

#### ProvenanceBlock enforcement (REQUIRED at NAC-3, v1.9.0+)

`validate_event_conformance` MUST verify that every captured
event detail carries a `source` field with `type` set to one
of `'user' | 'agent' | 'script'`. Events without a source are
counted as failures, not passes. Reviewers (Mistral, Microsoft
Copilot) flagged that v1.8 made source mandatory in spec but
the self-test only checked widget id fields, leaving a gap
where a non-compliant emitter could pass conformance. v1.9
closes the gap.

The runtime helper `check_canonical_shape(eventType, detail)`
MUST also return `ok: false` when `detail.source.type` is
absent or not one of the three allowed values, regardless of
whether the widget id fields are present.

#### Performance budget (normative, v1.9.0+)

A NAC-3 conformant runtime MUST satisfy the following timing
budgets on a midrange consumer device (representative target:
2024 mid-tier laptop, JS engine V8 / SpiderMonkey current
release, no concurrent CPU pressure):

| Operation                                    | Budget                           |
|----------------------------------------------|----------------------------------|
| `validate(slug)` for a plugin with 50 elements | <= 20 ms                       |
| `validate_global()` over a page with 1000 elements | <= 50 ms                  |
| `describe()` for a page with 1000 elements   | <= 30 ms                         |
| `validate_event_conformance(driver)` -- runtime overhead beyond the driver | <= 10 ms |
| Single `NAC.click()` round trip (target visible, no animation) | <= 80 ms     |
| `_emit()` overhead per event                 | <= 0.5 ms                        |

Hosts MAY exceed these on slower devices or larger pages but
MUST document the operating envelope. Implementations SHOULD
ship a CI benchmark fixture so regressions are caught before
release. The reference runtime exposes a `NAC.perf_probe()`
test utility (sec 13.10) that produces a structured timing
report against a synthetic 1000-element fixture.

Reviewer attribution: DeepSeek v1.8 finding ("no normative
performance requirements -- the validator could regress
silently"). Without a documented envelope, a five-minute
validation pass would still ship as conformant.

### 6.2.30. Command events (v1.8.0, normative)

`nac:command:rejected` and `nac:command:failed` close the
silent-failure gap reviewers identified for users delegating
multi-step UI work to AI assistants. The runtime emits these
events itself; plugins MAY emit them via the public helpers
`NAC.command_rejected(detail)` and `NAC.command_failed(detail)`.

```typescript
interface NacCommandRejectedDetail {
  command_method: 'click' | 'fill' | 'drag_drop' | 'expand' |
                  'sort' | 'set_slider' | 'go_to_section' |
                  'reset' | string;
  command_target: string | null;     // the requested nac_id, if any
  reason: 'not_found' | 'disabled' | 'hidden' | 'ambiguous' |
          'role_mismatch' | 'drag_type_mismatch' | 'invalid' |
          /* v1.9.0 ARIA preflight extensions (sec 7.3.3): */
          'aria_busy' | 'inert' | 'readonly' |
          /* v1.9.0 host-defined: */
          string;
  message: string;                   // human-readable
  // Drag-specific fields (only when reason='drag_type_mismatch'):
  drag_type?: string;                // source's data-nac-drag-type
  drag_accept?: string;              // target's data-nac-drag-accept
  // Provenance is required (sec 6.2.1).
  source: ProvenanceBlock;
  ts?: number;
}

interface NacCommandFailedDetail {
  command_method: string;
  command_target: string | null;
  reason: 'exception' | string;
  message: string;
  error_message?: string;
  error_stack?: string;              // optional, runtime MAY redact
  source: ProvenanceBlock;
  ts?: number;
}
```

**Distinction.** `rejected` covers preflight failures the runtime
detects BEFORE invoking the host's handler (target not in DOM,
disabled, hidden, ambiguous, drag-type mismatch). `failed` covers
unexpected throws DURING invocation (host handler raised, network
error, drag-drop DOM mutation failure). An AI assistant can act
on these distinctly: `rejected` typically means "rephrase or pick
another target"; `failed` typically means "retry with backoff or
escalate to human".

**Audit value.** Together they ensure every NAC-driven command
emits exactly one terminal event: success on its role-specific
event family, or `nac:command:rejected`, or `nac:command:failed`.
A consumer that hears no event in the timeout window now has a
genuine bug to chase, not a missing-emitter shrug.

### 6.2.31. Stable persistent IDs for paginated and virtualized lists (v1.8.0, normative)

For lists, tables, autocomplete results, tree nodes, calendar
events, map markers, and any collection rendered with pagination
or virtualization: the canonical id field (`item_id`, `node_id`,
`event_id`, `marker_id`, `option_id`, `row_id`) MUST be **stable
across pagination, scroll virtualization and re-renders**. Two
load operations that fetch the same backing record MUST produce
the same canonical id. The id MAY be opaque to the consumer (a
ULID, UUID, or backend primary key) but MUST NOT be derived from
visual position or list index.

This requirement responds to peer-review findings (Grok,
DeepSeek) that voice control + agentic delegation collapse on
virtualized 5000-row autocompletes when "pick Berlin" is mapped
to "click position 437" rather than "click option_id=opt-de-berlin".

### 6.2.32. Action confirmation event family (v1.9.0, normative)

`nac:action:confirm:requested`, `nac:action:confirm:granted`,
and `nac:action:confirm:denied` close the gap reviewers (Mistral
+ ChatGPT + Grok) flagged in v1.8: `data-nac-a11y-hint=
"requires_confirmation"` was advisory, so an AI agent could
ignore it and still claim conformance. v1.9.0 promotes
confirmation to a wire-level contract.

```typescript
interface NacActionConfirmRequestedDetail extends NacEventBase {
  action_id: string;       // the action awaiting user confirmation
  verb: string;            // from manifest.actions[].verb
  hints: string[];         // resolved data-nac-a11y-hint array
  hint_text: string;       // localized human-readable text
  confirm_id: string;      // ephemeral correlation id (UUID)
  expires_at?: number;     // timeout, optional
}

interface NacActionConfirmGrantedDetail extends NacEventBase {
  action_id: string;
  confirm_id: string;
  granted_by: 'user' | 'agent';   // who issued the grant
  granted_via?: string;           // 'modal_button' | 'voice_phrase' |
                                  // 'agent_policy' | 'biometric' etc
  source: ProvenanceBlock;        // who decided
}

interface NacActionConfirmDeniedDetail extends NacEventBase {
  action_id: string;
  confirm_id: string;
  reason?: 'user_cancelled' | 'timeout' | 'policy_blocked' | string;
  source: ProvenanceBlock;
}
```

#### NAC.confirm_action(action_id, opts)

The runtime exposes a helper that emits the requested event,
opens a host-defined confirmation UI (or the runtime's default
when none is registered), waits for the host to call back, and
emits the granted or denied event. The Promise resolves
`{ confirm_id, granted: true|false, granted_by, reason? }`.

```typescript
interface NAC {
  confirm_action(
    action_id: string,
    opts?: {
      hints?: string[];          // override the parsed a11y_hint
      hint_text?: string;        // override the localized text
      timeout_ms?: number;       // default 60_000
      source?: ProvenanceBlock;  // who is requesting confirmation
    }
  ): Promise<{
    confirm_id: string;
    granted: boolean;
    granted_by?: 'user' | 'agent';
    granted_via?: string;
    reason?: string;
  }>;

  // Hosts register a custom confirmation UI here. Default is
  // window.confirm(hint_text). Voice tools and AI agents register
  // their own dialog so they can record the consent in a way that
  // survives the audit trail.
  set_confirm_handler(
    fn: (req: NacActionConfirmRequestedDetail) =>
      Promise<{ granted: boolean; granted_via?: string; reason?: string }>
  ): void;
}
```

A NAC-3 conformant page that exposes any element with
`data-nac-a11y-hint` containing `requires_confirmation`,
`irreversible`, or `data_loss` MUST route the action through
`NAC.confirm_action()` (or an equivalent in the host that emits
the same wire shape) before the destructive side-effect runs. AI
agents and voice tools MUST set
`opts.source = { type: 'agent', tool: '...' }` so the audit
trail records who initiated the confirmation request.

### 6.2.33. Action undo flag (v1.9.0, normative)

For actions whose effects can be reversed, the manifest MAY
declare `undoable: true`:

```javascript
NAC.register({
  plugin_slug: 'invoices',
  actions: [
    { nac_id: 'invoice.delete', verb: 'delete',
      label_i18n: { /* ... */ },
      a11y_hint: ['irreversible', 'requires_confirmation'],
      undoable: false }, // hard delete; cannot undo
    { nac_id: 'invoice.archive', verb: 'archive',
      label_i18n: { /* ... */ },
      undoable: true,    // can be unarchived
      undo_window_ms: 60000 },  // optional: 60s undo window
  ],
});
```

A NAC.describe() / find() output exposes the flag as
`undoable: boolean`. Runtime helpers:

```typescript
interface NAC {
  // Returns true if the action declares undoable: true in its
  // manifest, false otherwise (default).
  action_undoable(action_id: string): boolean;

  // Returns the undo window declared by the manifest, in ms.
  // Null when the action is not undoable or the manifest does
  // not specify a window (treat null as "use host default" --
  // typically 0 = no undo, host UX decides whether to surface).
  action_undo_window_ms(action_id: string): number | null;
}
```

The flag is consumed by:
- AI agents that surface "this action can be undone within 60s"
  before invocation, allowing more aggressive autonomy on
  recoverable actions.
- Voice tools that downgrade interposition pressure (e.g. omit
  the confirm step for `undoable: true`).
- Audit pipelines that distinguish recoverable from
  unrecoverable agent actions for retention policy.

The flag does NOT alter the `nac:action:succeeded` event shape
or the action's runtime behaviour. It is metadata for downstream
consumers, not a runtime feature.

### 6.2.34. Why this remains a strict superset

Existing v1.6.x and v1.7.x plugins continue to validate at NAC-3
because the runtime matcher accepts legacy field names with a
warn-level finding. The hard-error path is opt-in. v1.8.0's
additions (`source` provenance, command events,
`data-nac-validate="skip"`, drag types, a11y hints) are
additive: a v1.7 plugin that does not set them simply does not
benefit from the new audit primitives, but it does not break.
The matcher tolerance code has a documented sunset (v2.0).

### 6.2.28. Migration from v1.6.x

Pre-v1.7 hosts may emit:

| Legacy field | Canonical (v1.7+) |
|---|---|
| `nac_id` (in action / field / tab / accordion / section / table events) | per-family entity id (`action_id`, `field_id`, `tab_id`, `section_id`, `table_id`) |
| `column_nac_id` | `column_id` |
| `filter_nac_id` | `filter_id` |
| `from_nac_id` | `source_id` |
| `over_nac_id` | `target_id` |
| `target_nac_id` (drag) | `target_id` |
| `tab_id` (when used as legacy generic in non-tab events) | per-family canonical |
| `plugin_slug` | `plugin` |

Hosts SHOULD emit both legacy AND canonical fields during the
v1.7 transition window so consumers on either side keep working.
The reference runtime emits both. v2.0 drops legacy fields
entirely; hosts MUST canonicalise before that release.

### 6.2.29. Why this is a strict superset

Existing v1.6.x plugins continue to validate at NAC-3 because
the runtime matcher accepts legacy field names with a warn-level
finding. The hard-error path is opt-in. Net effect: no plugin
breaks; new plugins write against the canonical spec from
day one; the matcher tolerance code has a documented sunset
(v2.0).

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

### 7.3.1. Direction of mirroring (normative, added v1.4.2)

> Added in v1.4.2 in response to AI peer review action item
> 3.5-G (Copilot, 2026-05-06).

The mapping in section 7.3 is **NAC drives, ARIA mirrors**.
That is the only permitted direction at NAC-3. Specifically:

- When a plugin transitions an element's state, the plugin
  MUST update `data-nac-state` first (or in the same render
  commit) and the corresponding `aria-*` attribute as a
  mirror.
- Plugins MUST NOT update `aria-*` first and rely on the
  validator or a runtime hook to back-fill `data-nac-state`.
- The reverse mapping (ARIA -> NAC) is intentionally NOT
  defined. An ARIA-first codebase that adopts NAC MUST
  rewrite the touchpoints so NAC is the source of truth for
  every state mapped in section 7.3.

Why this rule: NAC's driver semantics depend on
`data-nac-state` for `find()` filtering, lifecycle gating,
and validator drift detection. ARIA's semantics depend on the
ARIA attribute. If both sides could be authoritative, the
validator would have to choose -- and any choice produces a
class of silent disagreements. Single-direction mirroring
keeps the contract simple: NAC is the source, ARIA is the
view. Authors writing accessibility-first code can still use
ARIA in places NAC does not cover (section 7.3 is not
exhaustive); they only commit to NAC-first when both layers
apply to the same state.

The validator emits an `error` finding `aria_first_state` when
it detects an `aria-busy="true"` (or any 7.3-mapped ARIA
attribute) on an element with `data-nac-id` whose
`data-nac-state` does NOT correspond -- *and* the element
appears in the manifest's `actions[]` / `fields[]` (i.e. it
is a NAC-instrumented element, not a pure ARIA-only widget).

### 7.3.2. Drift findings are hard-errors at NAC-3 (normative, added v1.6.1)

> Added in v1.6.1 in response to AI peer review of v1.6.0
> (Mistral, Copilot, Claude 4.7, HuggingChat, DeepSeek). v1.4.2
> introduced the findings; multiple v1.6 reviewers noted that
> "the validator's `aria_nac_state_mismatch` is reactive, not
> preventive" and that warn-level delivery degrades to CI noise
> in large SPAs. v1.6.1 promotes both findings to errors at
> NAC-3 so they BLOCK the build instead of decorating it.

At NAC-3 compliance both `aria_nac_state_mismatch` and
`aria_first_state` MUST be emitted as `severity: 'error'` and
MUST cause `NAC.validate()` / `NAC.validate_global()` to return
a non-zero exit code (or set `report.has_errors === true` for
JS callers). At NAC-1 and NAC-2 they MAY be downgraded to
`severity: 'warn'`.

Suppression: hosts that need to retire historic violations
incrementally MAY use `NAC.set_validation_tolerance({
  drift_findings: 'warn'
})` to demote both findings to warn-level, OR maintain a
`tolerated_violations.json` file that the runtime accepts (see
section P7.1.1). The intent is that drift findings stay BLOCKING
by default in v1.6.1+ and silencing them is an explicit, audited
choice rather than the default behaviour.

Why hard-error: every reviewer who flagged this finding wrote
the same diagnosis -- when the validator only warns, teams
ignore the warnings, drift accumulates, and ARIA stops being a
reliable mirror. Making drift a build blocker forces the
discipline NAC needs to deliver the per-consumer authority
contract from section 7.2. The cost (one CI failure per drift
on commit) is paid by whoever introduced the drift, which is
where the cost belongs.

#### Drift tolerance window (v1.9.0+)

DeepSeek's v1.8 review observed that on SPAs with React 18
concurrent rendering, Vue 3 Suspense or Svelte 5 hydration,
ARIA attributes legitimately mutate after a NAC state change
within a small async window (typically 50-200 ms). A strict
zero-tolerance check fired during that window produces false
positives that have no remediation -- the team did the right
thing, the framework just needs a tick to settle.

v1.9.0 introduces a normative drift tolerance window of
**200 ms**. The validator MUST:

1. On detecting a state change on either the NAC or ARIA
   side, defer `aria_nac_state_mismatch` evaluation by 200ms.
2. If the mirror state has converged by the deadline, no
   finding is raised.
3. If divergence persists past the deadline, the finding is
   raised with severity `error` at NAC-3 as before.

The window is configurable via
`NAC.set_validation_tolerance({drift_window_ms: <n>})`. The
default 200 ms covers React/Vue/Svelte hydration, browser
microtask flush, and most async batching patterns. Hosts
running synchronous frameworks (vanilla JS, Lit) MAY set it
to 0 for stricter enforcement.

### 7.3.3. ARIA-to-NAC mapping (normative, added v1.9.0)

When an element exposes both ARIA semantics AND is targeted
by a NAC driver call (`NAC.click`, `NAC.fill`, `NAC.expand`,
etc.), the runtime MUST honour ARIA preflight constraints
BEFORE invoking the host handler. The mapping below is
normative.

| ARIA attribute               | NAC.click / fill behaviour          | Emitted event                                          |
|------------------------------|-------------------------------------|--------------------------------------------------------|
| `aria-disabled="true"`       | Reject before invocation            | `nac:command:rejected` reason=`disabled`               |
| `aria-busy="true"`           | Reject before invocation            | `nac:command:rejected` reason=`aria_busy`              |
| `aria-hidden="true"`         | Reject before invocation            | `nac:command:rejected` reason=`hidden`                 |
| `aria-readonly="true"` (fill)| Reject `fill` calls only            | `nac:command:rejected` reason=`readonly`               |
| `inert` attribute (HTML)     | Reject before invocation            | `nac:command:rejected` reason=`inert`                  |
| `aria-haspopup="dialog"` etc | (advisory) recommend `requires_confirmation` hint | n/a -- pre-action UX guidance     |
| `aria-live="polite"` region  | Reads from region after action      | n/a                                                    |
| `aria-expanded`              | Honoured by `NAC.expand`/`collapse` | `nac:section:expanded`/`collapsed`                     |
| `aria-pressed`               | Toggle reflected in next describe() | `nac:field:changed` (for toggle buttons)               |

The runtime walks the target element's ancestors when checking
`inert` and `aria-disabled` (these inherit). Other attributes
apply only to the target element directly.

The reason taxonomy on `nac:command:rejected` is therefore
extended in v1.9 to include: `aria_busy`, `inert`, `readonly`.
Existing reasons (`disabled`, `hidden`, `not_found`,
`ambiguous`, `role_mismatch`, `drag_type_mismatch`) keep their
v1.8 semantics.

### 7.3.4. Worked examples (informative, added v1.9.0)

#### Combobox

```html
<div data-nac-id="country.combobox" data-nac-role="field"
     data-nac-field-type="combobox"
     role="combobox"
     aria-haspopup="listbox"
     aria-expanded="false"
     aria-controls="country.list">
  <input type="text" data-nac-id="country.input">
</div>
<ul id="country.list" data-nac-id="country.list"
    data-nac-role="region" role="listbox" hidden>
  <li data-nac-id="country.option.ar" role="option"
      aria-selected="false">Argentina</li>
  <li data-nac-id="country.option.br" role="option"
      aria-selected="false">Brazil</li>
</ul>
```

NAC drivers operate on the `data-nac-id` IDs; ARIA mirrors
expanded/selected for screen readers. When NAC.click on
`country.option.ar` succeeds, the host updates BOTH
`aria-selected="true"` on the option AND fires
`nac:field:changed` with `field_id: 'country.combobox',
new_value: 'ar'`.

#### Modal dialog

```html
<button data-nac-id="invoice.delete"
        data-nac-role="action" data-nac-action="delete"
        data-nac-a11y-hint="irreversible|requires_confirmation"
        aria-haspopup="dialog">
  Delete
</button>
<div data-nac-id="confirm.delete"
     data-nac-role="confirm-dialog"
     role="dialog" aria-modal="true"
     aria-labelledby="confirm.title"
     hidden>
  ...
</div>
```

The `aria-haspopup="dialog"` aligns with the
`requires_confirmation` hint -- both signal that clicking
opens a confirmation flow. Voice tools and AI agents reading
either layer arrive at the same conclusion.

#### Datagrid with virtualization

```html
<div data-nac-id="orders.grid" data-nac-role="region"
     role="grid"
     aria-rowcount="50000"
     aria-colcount="6">
  <!-- only ~30 rows actually rendered; aria-rowcount tells AT
       the virtual size -->
  <div role="row" aria-rowindex="42"
       data-nac-id="orders.row.ord-2026-04223">
    <!-- canonical id is opaque + stable across pagination per sec 6.2.31 -->
  </div>
</div>
```

The `data-nac-id` (`orders.row.ord-2026-04223`) is the stable
persistent ID. `aria-rowindex` is the visible position which
changes with sort/filter/scroll. Voice command "click row 42"
resolves through `aria-rowindex`; voice command "open the
April 2026 #4223 order" resolves through `data-nac-id`. Both
work; the first is positional and fragile, the second is
semantic and stable.

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

### Plugin slug uniqueness (tightened in v1.4.2)

> Tightened in v1.4.2 in response to AI peer review action item
> 3.5-H (Copilot, 2026-05-06). v1.4.1 said hosts SHOULD set
> `data-nac-plugin-id` per instance; v1.4.2 promotes that to
> MUST when two roots with the same slug coexist in the DOM.

Within a single mounted document, a plugin slug MAY appear on
multiple roots (legitimate multi-instance UIs: stacked modals,
multi-window CRM views, master-detail with two patch_manager
panels). When two or more `[data-nac-plugin]` elements with
the same `data-nac-plugin` value are simultaneously in the
DOM, **each MUST carry a unique `data-nac-plugin-id` attribute**.
The pre-v1.4.2 fallback ("most recently mounted ready plugin
in DOM order picks one") is permitted only when slugs are
unique on the page. v1.4.2 makes the multi-mount-without-id
case a NAC-3 validator error, not a soft fallback.

Operators addressing a specific instance use:

- For driver calls: `NAC.click('apply_all', { plugin_instance_id: 'modal-2' })`.
- For event filtering: `e.detail.plugin_instance_id === 'modal-2'`.
- For scoped find: `NAC.find('apply_all', { plugin_instance_id: 'modal-2' })`.

If a single instance of a plugin is mounted, `data-nac-plugin-id`
is OPTIONAL (the slug alone disambiguates).

**Validator (v1.4.2 addition)**: `NAC.validate(plugin)` MUST
report an `error` finding `duplicate_plugin_no_instance_id`
when more than one element matching
`[data-nac-plugin="<slug>"]` is in the DOM and at least one
of those elements lacks a unique `data-nac-plugin-id`. The
error references all conflicting roots (so the host knows
which to fix). At NAC-3 this is a CI blocker.

**Note for hosts using fragments / portals**: a
plugin root MAY be unmounted and remounted across animations.
The simultaneity check is "currently in the DOM", not "ever
existed". Toggling display:none does NOT remove from the DOM
and therefore counts; React unmount + remount in the same
tick does NOT count if no two are present in the validator's
snapshot.

### Per-plugin event buses (default-on from v1.6.1)

> Tightened in v1.6.1 in response to AI peer review of v1.6.0
> (Claude 4.7 Deep Thinking, 2026-05-07): "data-nac-plugin-bus
> should arguably be the default for any app with stacked
> dialogs". Mistral, Copilot and HuggingChat raised the same
> finding under different wording.

`nac:*` events MUST be dispatched on the plugin root **in
addition to** `document`. Subscribers attached to the root
receive only that plugin's events without needing to filter on
payload, which scales listener overhead linearly with subscribed
instances rather than quadratically.

Subscribers that attach to the root see the event first (capture
phase) and the document-level subscriber still sees it via
bubbling. A runtime that disables document-level dispatch OR
disables root-level dispatch is non-compliant in v1.6.1+.

For backward compatibility, runtimes targeting NAC-3 against a
v1.4..v1.6.0 host SHOULD treat the missing root-level dispatch
as a SHOULD violation (warning), not an error. Hosts upgrading
to v1.6.1 SHOULD audit subscribers that relied solely on
document-level events to confirm they still fire (they do; the
default-on bus is additive).

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

### Closed shadow roots: out of scope (clarified v1.6.1)

> Clarified in v1.6.1 in response to AI peer review of v1.6.0
> (every reviewer raised this: ChatGPT, Mistral, Copilot, Claude
> 4.7, DeepSeek, HuggingChat, Grok). v1.4.1 acknowledged that
> `composed: true` does not pierce closed shadow roots; v1.6.1
> states explicitly that **closed shadow roots are out of scope
> for the NAC contract**.

A closed shadow root by WHATWG definition has no host-side API
to traverse it. NAC's manifest-and-events model assumes that an
external operator (driver, validator, agent) can observe and
operate on a plugin from outside. A plugin whose interactive
surface lives inside a closed shadow root cannot meet that
assumption.

If a host needs to expose a closed-shadow-rooted component to
NAC consumers, the canonical pattern is:

1. The component (closed shadow root owner) MUST emit `nac:*`
   events with `composed: true` so they bubble to the host
   document. v1.6.1 refines: the host MUST re-dispatch the
   bubbled event on its own plugin root so per-plugin buses
   (default-on, see above) work without traversing the closed
   boundary.
2. The component MUST expose its driver surface via a public
   method on the host element (`hostElement.nacDrive(verb,
   args)`). The host element registers a custom reset / fill /
   click bridge so `NAC.click('id')` resolves to a public
   method call, not a DOM-internal click on the closed root.
3. The component's manifest MUST declare
   `"shadow_root": "closed"` on its plugin root (manifest
   field new in v1.6.1) so validators can skip DOM-traversal
   checks that would always fail for that plugin.

Plugins that need full NAC-3 introspection MUST use open shadow
roots. The spec does not attempt to define a workaround that
makes closed roots first-class -- every reviewed alternative
either requires WHATWG changes or breaks the encapsulation
guarantee the closed root is there to provide.

---

## 7.5. Confirm-dialog contract (normative, added v1.4.2)

> Added in v1.4.2 in response to AI peer review action item
> 3.5-D (Copilot, 2026-05-06). The confirm-dialog primitive was
> introduced in v1.3 (section 15.5) but was described
> narratively. v1.4.2 promotes the contract to normative section
> 7 so a reviewer reading only this chapter has the full shape.

A confirm dialog is a modal that blocks operator input until
the user (or autonomous operator) resolves a binary or
multi-choice prompt. NAC-3 plugins that ship confirms MUST
follow this contract.

### DOM shape

A confirm dialog is one element with the following attributes:

```html
<div data-nac-role="confirm-dialog"
     data-nac-id="patch_manager.confirm_apply_all"
     data-nac-state="pending"
     data-nac-plugin="patch_manager"
     role="alertdialog"
     aria-modal="true"
     aria-labelledby="..."
     aria-describedby="...">
  <p id="...">Apply all 27 pending patches?</p>
  <button data-nac-role="action"
          data-nac-action="confirm"
          data-nac-id="patch_manager.confirm_apply_all.yes">Apply all</button>
  <button data-nac-role="action"
          data-nac-action="cancel"
          data-nac-id="patch_manager.confirm_apply_all.no">Cancel</button>
</div>
```

Required attributes:

- `data-nac-role="confirm-dialog"`.
- `data-nac-id`: namespaced ID (`<plugin>.confirm_<purpose>`).
- `data-nac-state`: one of `pending` | `resolved` | `cancelled`.
- `data-nac-plugin`: owning plugin slug.
- `role="alertdialog"` and `aria-modal="true"` for ARIA parity
  (per section 7.2 authority rule).
- A focus trap: tab navigation MUST stay inside the dialog
  while `data-nac-state="pending"`.

The yes/no buttons are normal NAC actions with verbs
`confirm` and `cancel`. Hosts MAY add additional choice
buttons; their verbs are host-defined.

### Lifecycle events (normative)

Three events fire on `document` (per section 7.4 scoping):

- `nac:confirm:requested` -- dispatched when a confirm dialog
  enters the DOM with `data-nac-state="pending"`. Detail:
  `{ plugin, plugin_instance_id, nac_id, prompt, choices,
  timestamp }`.
- `nac:confirm:resolved` -- dispatched when the user / agent
  picks any positive choice (verb `confirm` or any host
  positive verb). Detail: `{ plugin, plugin_instance_id,
  nac_id, choice, timestamp }`.
- `nac:confirm:cancelled` -- dispatched when the user / agent
  picks `cancel` or dismisses by ESC / backdrop click. Detail:
  same shape as `resolved` with `choice: 'cancel'`.

The `nac:action:succeeded` / `nac:action:failed` events still
fire on the underlying confirm/cancel buttons; the
`confirm:resolved` / `confirm:cancelled` events are an
*additional* lifecycle layer that operators reading the
dialog as a single unit can subscribe to without parsing
button verbs.

### Driver API

`NAC.list_pending_confirms(): NacElement[]` returns every
`[data-nac-role="confirm-dialog"][data-nac-state="pending"]`
on the page. An autonomous operator MUST check this list
before any `click()` / `fill()` call; if a confirm is
pending, the operator MUST resolve it first (or accept that
its next call will likely fail with `disabled`).

`NAC.confirm(prompt, opts): Promise<boolean>` is the
*emitter* helper for plugin authors that want to programmatically
raise a confirm. It returns a promise that resolves to `true`
(verb `confirm`) or `false` (verb `cancel`). Hosts that ship
their own confirm UI MAY skip this helper and dispatch the
events themselves; the runtime helper is a convenience.

### Validator (normative additions, v1.4.2)

`NAC.validate(plugin)` MUST report an `error` finding
`confirm_dialog_no_focus_trap` when a `[data-nac-role=
"confirm-dialog"][data-nac-state="pending"]` exists but no
focus trap is detectable (heuristic: the dialog must contain
at least one focusable element AND tabindex on body must NOT
allow focus to leave the dialog -- runtime checks the first
condition only; second is host-tested).

`NAC.validate(plugin)` MUST report an `error` finding
`confirm_dialog_missing_aria` when the dialog lacks
`role="alertdialog"` or `aria-modal="true"`.

### Compliance levels

- NAC-1: confirm dialogs MAY exist; no contract enforced.
- NAC-2: confirm dialogs MUST have `data-nac-role` and
  `data-nac-id`; lifecycle events not required.
- NAC-3: full contract above MUST be implemented; validator
  errors are blockers.

---

## 7.6. Attention signals (informative, added v1.8.0)

When the runtime drives a programmatic operation, it provides
visual feedback so a human reviewer (sighted or low-vision)
can SEE what the agent did. This matters most for users with
attention or executive-function variation, who need explicit
"the system did the thing you asked it to" cues to maintain
trust in the delegation.

Two signal channels:

1. **Focus pulse**: a brief outline + glow on the element the
   driver just clicked, filled, expanded, etc. Default
   duration 700 ms.
2. **Section visibility highlight**: a 1500 ms outline on the
   landmark section the runtime navigated to via
   `NAC.go_to_section`. Persists 1500 ms even when the
   section was already in viewport so the user always sees
   "the agent went to section X".

Both signals are configurable through CSS custom properties
the host can override. The reference runtime declares these
defaults (the host MAY override per-tenant or per-user via
the cascade):

```css
:root {
  /* Focus pulse on every driver-initiated operation. */
  --nac-focus-pulse-color:    #4f46e5;   /* indigo-500 */
  --nac-focus-pulse-duration: 700ms;
  --nac-focus-pulse-thickness: 3px;
  --nac-focus-pulse-intensity: 1;        /* 0..1 opacity scale */

  /* Section-visit highlight on go_to_section. */
  --nac-section-visited-color:    #f59e0b;   /* amber-400 */
  --nac-section-visited-duration: 1500ms;
}

[data-nac-focus-pulse="1"] {
  outline: var(--nac-focus-pulse-thickness) solid
           var(--nac-focus-pulse-color);
  outline-offset: 2px;
  animation: nac-focus-pulse var(--nac-focus-pulse-duration) ease-out;
}

@keyframes nac-focus-pulse {
  0%   { outline-color: var(--nac-focus-pulse-color);
         opacity: var(--nac-focus-pulse-intensity); }
  100% { outline-color: transparent; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  /* MUST honour the user's reduced-motion preference. */
  [data-nac-focus-pulse="1"] { animation: none; }
}

@media (prefers-contrast: more) {
  /* v1.9.0: REQUIRED at NAC-3. When the OS reports
     prefers-contrast: more, the focus pulse defaults
     are too subtle for low-vision users on high-contrast
     themes. Override to a thicker, darker outline + larger
     glow so the cue stays visible at 4.5:1 contrast against
     light AND dark backgrounds. Hosts MAY further customise
     the values; the override block MUST exist. */
  :root {
    --nac-focus-pulse-color: #000000;
    --nac-focus-pulse-thickness: 5px;
    --nac-focus-pulse-glow-radius: 26px;
    --nac-focus-pulse-intensity: 1;
    --nac-section-visited-color: #000000;
  }
}
```

A host targeting users with ADHD or chronic-pain
variability MAY raise `--nac-focus-pulse-thickness` to `5px`
and `--nac-focus-pulse-duration` to `1500ms` so the cue is
more salient, OR declare a manifest attention profile (sec
13.5 v1.9.0+) that automatically applies a recognised preset.

**Why this exists.** v1.7 peer reviewers (Mistral, Grok)
flagged that the default pulse was too subtle to serve
attention-sensitive populations. v1.8 made the parameters
public and configurable, with reduced-motion respect as
non-negotiable. v1.9 adds the `prefers-contrast: more`
media query because DeepSeek's v1.8 review noted the
focus pulse was invisible in OS-level high-contrast themes,
which is the population that needs it most.

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

## 9.1. NAC + LLM agentic loop (informative, added v1.5.0)

> Added in v1.5.0. The reference public demo at
> `yujin.app/nac-spec/example.php` implements this pattern.
> Vendoring the demo gives you the same shape against your own
> backend.

The canonical pattern for an LLM-driven UI operator on a
NAC-compliant page has four steps. Implementations MAY vary;
the contract below is the recommended shape.

### Step 1 -- Snapshot the page

Caller (frontend, in-page agent, test runner) calls
`NAC.describe()` and optionally `NAC.manifest(<plugin>)` for each
plugin, then assembles a compact tree:

```js
function snapshotTree() {
  const snap = NAC.describe();
  return {
    active:  snap.active,
    plugins: (snap.plugins || []).map(p => ({
      plugin:   p.plugin,
      state:    p.state,
      elements: p.elements,            // P5.0 NacElement[]
      manifest: NAC.manifest(p.plugin),// optional, full contract
    })),
  };
}
```

The tree is the source of truth for the LLM. Keep it under
~60 KB JSON to fit common context budgets (Claude Sonnet 200 K
tokens, DeepSeek 64 K, GPT-4o-mini 128 K -- 60 KB is well
within all three).

### Step 2 -- Send to a backend that holds the API key

The frontend MUST NOT call an LLM provider directly: it would
expose the API key in the network tab of any visitor. Pattern:

```
POST https://your-backend/nac-demo
Body: {
  session_id: <stable per browser tab>,
  prompt:     <user request>,
  lang:       <2-letter ISO>,
  history:    [{role, content}, ...],   // optional, last 4-10 turns
  nac_tree:   <step-1 output>,
}
```

The backend composes a system prompt that constrains the
model to the NAC verb vocabulary and a strict JSON output
shape. See section 9.2 for the canonical prompt.

### Step 3 -- Backend calls the LLM with a structured-output system prompt

The system prompt:

1. Enumerates the available action kinds: `click`,
   `click_by_verb`, `fill`, `select`, `tab`, `tab_by_label`,
   `say`.
2. Forces the response to a single JSON object
   `{ message, actions[] }`.
3. Embeds the NAC tree as the source of valid `nac_id`s.
4. Caps the action list (recommended: 6 per turn) and
   forbids inventing IDs that are not in the tree.

The reference implementation in
`crm_desa/api/v1/yujin.php::yjNacDemoSystemPrompt()` is one
canonical realisation. The prompt is informative, not
normative -- any prompt that produces the same output shape
is compliant.

The backend SHOULD chain providers: a primary (e.g. Claude
Sonnet) plus a fallback (e.g. DeepSeek). When the primary
returns a non-2xx or a parse error, retry against the
fallback before surfacing the failure to the caller.

### Step 4 -- Frontend dispatches each action

The backend response shape:

```json
{
  "ok": true,
  "data": {
    "message": "Toco Mi y abro el modal secreto.",
    "actions": [
      { "kind": "click", "nac_id": "note.e" },
      { "kind": "click", "nac_id": "secret.open" }
    ],
    "model": "claude-sonnet-4-6",
    "fallback_used": false
  }
}
```

The frontend dispatches each action through the standard
NAC primitives:

```js
async function dispatch(a) {
  switch (a.kind) {
    case 'click':         return NAC.click(a.nac_id);
    case 'click_by_verb': return NAC.click_by_verb(a.plugin, a.verb);
    case 'fill':          return NAC.fill(a.nac_id, a.value);
    case 'select':        return NAC.select(a.nac_id, a.value);
    case 'tab':           return NAC.tab(a.plugin, a.tab_key);
    case 'tab_by_label':  return NAC.tab_by_label(a.plugin, a.label);
    case 'say':           /* render text, no DOM action */ return;
  }
}
```

Each `NAC.*` call benefits from v1.4.2 focus follow + visual
pulse, so the human reviewer SEES every step the agent takes.

### Compliance level

This pattern is informative. A NAC-compliant page does NOT
need to expose an LLM-driven chat. The reference public demo
implements it because the AI peer review of 2026-05-06 (see
`docs/AI_REVIEWS_OF_NAC_SPEC.md`) flagged that a
hardcoded-keyword chat on the demo page is the antithesis of
what NAC promises -- which is exactly that the agent reads
the manifest and decides.

### Failure modes the loop must handle

- **API key absent**: backend returns 502; caller shows a
  graceful message and falls back to a local intent parser
  (the reference demo keeps a tokenised matcher behind a
  `try/catch` exactly for this case).
- **Tree too large**: backend rejects 413 with the byte
  count; caller trims the tree (drop hidden plugins, drop
  rows beyond the visible viewport, drop fields with
  `data-nac-state="hidden"`) and retries.
- **Model returns non-JSON**: backend logs the sample and
  returns a benign `{ actions: [] }` with a parse_warning
  flag; the caller renders the model's text via a `say`
  fallback rather than 5xx-ing the user.
- **Action references an unknown nac_id**: the runtime's
  `NAC.click()` etc throw `NacError('not_found')`; the
  caller catches per-action and continues the chain rather
  than aborting.

The reference backend at
`crm_desa/api/v1/yujin.php::yjNacDemo()` covers all four
failure modes.

---

## 9.2. Canonical system prompt (informative)

Pseudo-code rather than verbatim text so implementers can
adapt to their target model:

```
You are a NAC operator agent for an interactive page.

AVAILABLE ACTION KINDS:
  click, click_by_verb, fill, select, tab, tab_by_label, say

OUTPUT SHAPE (one JSON object, no markdown, no prose around it):
{
  "message": "<short reply in user's language>",
  "actions": [ { "kind": ..., ... }, ... ]
}

RULES:
  1. Only emit nac_ids that appear in the NAC tree below.
  2. Maximum 6 actions per turn; order matters.
  3. message <= 30 words, in <user lang>.
  4. For ambiguity: ONE action plus a {kind:'say'} clarifier
     instead of guessing.
  5. Never include destructive actions you were not asked for.

NAC TREE OF THE CURRENT PAGE:
<tree as JSON>
```

The `<user lang>` placeholder maps from the frontend's
`lang` field. The `<tree as JSON>` placeholder is the output
of step 1 above, JSON-stringified and ASCII-safe.

The reference backend implements this prompt with two
robustness measures: a defensive JSON extractor that strips
markdown fences if the model emits one, and a strict
allow-list of action kinds (unknown kinds are dropped, not
errored, so the frontend keeps moving).

---

## 9.3. Plugin reset primitive (normative, added v1.6.0)

> Added in v1.6.0 in response to the user request 2026-05-06:
> "que cada vez que empiece el autopilot antes de comenzar
> retorne todos los modales a su situacion inicial". Reset is a
> small new pillar of the operator surface; without it, every
> repeatable interaction (autopilot, regression test, second
> tour) compounded state from the prior run.

A v1.6.0-or-later runtime MUST expose:

```typescript
NAC.reset(plugin_slug?: string): Promise<NacResetResult>;
NAC.set_reset_provider(plugin_slug: string,
                       fn: () => void | Promise<void>): void;
```

`reset()` returns the plugin (or, when called with no
argument, the entire page) to its declared initial state.
Compliant plugins MAY register a custom reset provider via
`set_reset_provider`. When no provider is registered for a
target plugin, the runtime executes a generic reset (defined
below).

### Resolution order

When a caller invokes `NAC.reset(plugin_slug)`:

1. **Custom provider for that plugin**: if registered, invoke
   it and emit `nac:plugin:reset { plugin: <slug> }` on
   completion.
2. **Generic fallback**: if no provider, walk the plugin root
   (`[data-nac-plugin="<slug>"]`) and apply the generic reset
   rules below.

When a caller invokes `NAC.reset()` with no arguments:

1. **Every registered provider** is invoked in registration
   order. Each emits its own `nac:plugin:reset` on completion.
2. **Generic reset** then runs against the whole document.
3. A final `nac:plugin:reset { plugin: '*' }` is emitted.

### Generic reset rules (normative)

Without a custom provider, the runtime MUST:

- Clear every `[data-nac-role="field"]` to its
  `data-nac-default-value` if declared, else to empty
  string / unchecked / no selection per field type.
- Set every cleared field to `data-nac-state="pristine"`.
- Dispatch `input` + `change` events on each cleared field
  (so observers downstream see the reset).
- For every element with `data-nac-default-state="<token>"`,
  set `data-nac-state` to that token.
- For every element with `data-nac-default-hidden="1"`, set
  the `hidden` attribute true.

### Authoring conventions (informative)

For full control, plugins SHOULD register a custom provider
that knows the plugin's domain semantics. Examples of work a
custom provider commonly does:

- Closing modals that were left open by a prior run.
- Collapsing accordion sections / sumi-e expansion / details.
- Restoring window-chrome state (un-minimise / un-maximise).
- Resetting tabs to the first / default tab.
- Clearing sort + filter on tables and lists.
- Reverting slider / spinner controls to the documented
  default value.
- Scrolling the page back to the top so the next run starts
  with the entire surface visible.

The reference demo at `yujin.app/nac-spec/example.php`
registers a custom provider that does all of the above before
each autopilot run.

### `NacResetResult` shape

```typescript
interface NacResetResult {
  ok:      boolean;
  plugin:  string;          // resolved plugin slug, or '*' for global
  source:  'custom' | 'generic' | 'custom+generic';
  plugins?: Record<string, { ok: boolean, source: string }>;
                            // present when reset() was called with no arg
  error?:  string;          // present only when ok=false
}
```

### Event

`nac:plugin:reset` -- detail
`{ plugin: <slug | '*'>, timestamp: number }`. Fires once per
plugin reset completion, plus a final `'*'` emission for
no-argument calls. Bubbles + composed (per spec section 7.4).

### Compliance levels

- NAC-1 / NAC-2: `NAC.reset()` MAY exist; behaviour
  unspecified.
- NAC-3: `NAC.reset()` MUST exist; the generic reset rules
  above MUST work for any plugin without a custom provider;
  custom providers (when registered) MUST emit
  `nac:plugin:reset` on completion.

This pillar is the operator-side counterpart to the lifecycle
events in P4 (section 4): P4 says "tell consumers when state
changes", section 9.3 says "let consumers ASK for state to
return to the start". Together they bound the plugin's state
surface in both directions.

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

  // Drag and drop. Source MUST be data-nac-role="draggable",
  // target MUST be data-nac-role="drop-target". Reference runtime
  // implementation landed in v1.6.2; signature was declared in
  // v1.1 but the runtime never exposed it until then. Optional
  // opts.to_index for ordered drop-targets, opts.value passed
  // through to nac:drag:dropped, opts.source overrides the
  // ProvenanceBlock attached to every emitted drag event.
  //
  // v1.8.0 type validation: when source carries
  // data-nac-drag-type and target carries data-nac-drag-accept
  // (CSV list of accepted types or "*" for any), the runtime
  // checks compatibility. Mismatches reject with
  // NacError('drag_type_mismatch') and emit
  // nac:command:rejected with reason='drag_type_mismatch',
  // drag_type=<source's type>, drag_accept=<target's accept>.
  // Untyped sources (no data-nac-drag-type) are treated as
  // compatible with all targets, preserving v1.7 behaviour.
  // v1.9.0 normative registry (informative below): hosts SHOULD
  // pick types from the registry when a recognised one fits;
  // hosts MAY define custom types but the runtime emits a
  // 'drag_type_unknown' validator warning so cross-app
  // interoperability is preserved.
  drag_drop(source_nac_id: string,
            target_nac_id: string,
            opts?: { to_index?: number; value?: any;
                     source?: ProvenanceBlock }
            ): Promise<NacResult>;

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

#### 13.4.1. Drag-type registry (v1.9.0, normative)

`data-nac-drag-type` and `data-nac-drag-accept` (sec 13.4 v1.8)
declare types as opaque strings. To improve cross-app
interoperability, v1.9.0 declares a recognised registry of
canonical drag types. Hosts SHOULD pick from the registry when
a recognised type fits; hosts MAY define custom types but the
runtime emits a `drag_type_unknown` validator warning at NAC-3
so an audit pipeline notices when a drag flow uses an ad-hoc
type that no other app understands.

The registry follows MIME-like dotted notation. Forward-slash
groupings (`text/plain`) match MIME conventions; `card/*` and
`row/*` are NAC-specific groupings for in-app data shapes.

| Type pattern             | Use                                                  |
|--------------------------|------------------------------------------------------|
| `text/plain`             | Plain string payload (free text, address, etc).      |
| `text/markdown`          | Markdown source.                                     |
| `text/html`              | HTML fragment (richtext drag).                       |
| `text/csv`               | CSV cell or row payload.                             |
| `text/uri-list`          | One or more URIs (file URIs, web URLs).              |
| `image/*`                | Any image bitmap (use `image/png`, `image/jpeg` etc). |
| `image/svg+xml`          | Vector image as SVG source.                          |
| `audio/*`                | Audio clip (use `audio/wav`, `audio/mpeg` etc).      |
| `video/*`                | Video clip (use `video/mp4`, `video/webm` etc).      |
| `application/json`       | JSON object payload.                                 |
| `application/json+card`  | Card-shaped JSON: `{ id, title, body, meta? }`.      |
| `application/json+row`   | Row-shaped JSON for table reorder.                   |
| `application/json+task`  | Task-shaped JSON for kanban reorder.                 |
| `application/pdf`        | Full PDF document.                                   |
| `card/<plugin_slug>`     | Card from a specific plugin (custom shape).          |
| `row/<entity_slug>`      | Row from a specific entity table.                    |
| `file/<extension>`       | Generic file (use `file/xlsx`, `file/zip` etc).      |
| `tag`                    | Tag chip (label, severity, label_i18n).              |
| `note`                   | Note attachment (text + optional metadata).          |
| `event`                  | Calendar event (start, end, title).                  |
| `chart-series`           | Chart data series (for re-grouping across charts).   |
| `tree-node`              | Tree node (for cross-tree drag).                     |
| `*`                      | Wildcard (matches anything).                         |

Custom types outside the registry remain valid; the runtime
treats them as opaque and accepts them in `data-nac-drag-type`
and `data-nac-drag-accept`. Validators MUST emit
`drag_type_unknown` (severity: `warn` at all NAC levels) when
a type does not match any registry entry pattern, so the
operator notices and decides whether to formalise the type
upstream.

The registry is appendable. Hosts that need a frequently-used
custom type SHOULD propose it as a registry addition rather
than ship it under their own namespace. The MIME-style dotted
syntax means an addition is a one-line PR that does not break
existing apps.

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

  // v1.9.0: attention profile preset. When the manifest
  // declares one, the runtime applies the matching CSS custom
  // property overrides (sec 7.6) at register time. Hosts may
  // also set custom properties directly; the manifest preset
  // is a convenience for accessibility-tuned plugins.
  attention_profile?:
    'default' |          // no overrides (the v1.8 baseline)
    'high_contrast' |    // dark thick outline, large glow
    'reduced_motion' |   // animation: none on the pulse
    'extended_pulse' |   // pulse_duration 1500ms, larger glow
    'maximum_salience';  // all of the above (e.g. for ADHD-focused plugin)
}
```

A NAC-1.0 manifest without these fields is valid as NAC-1.1.

When the runtime sees an `attention_profile` field on register,
it sets the matching CSS custom properties on the plugin root
element so they cascade only to that plugin's surface (other
plugins keep the page default). Profile bindings:

| Profile             | --nac-focus-pulse-thickness | --nac-focus-pulse-duration | --nac-focus-pulse-color | --nac-focus-pulse-glow-radius |
|---------------------|-----------------------------|-----------------------------|--------------------------|-------------------------------|
| `default`           | 3px                         | 700ms                       | #DC2626                  | 18px                          |
| `high_contrast`     | 5px                         | 700ms                       | #000000                  | 26px                          |
| `reduced_motion`    | 3px                         | 0ms                         | #DC2626                  | 0                             |
| `extended_pulse`    | 4px                         | 1500ms                      | #DC2626                  | 24px                          |
| `maximum_salience`  | 5px                         | 1500ms                      | #000000                  | 32px                          |

This responds to Mistral + Grok + Copilot v1.8 finding that
attention-sensitive populations need preset switches without
forking the runtime. Plugin authors targeting those populations
declare one line in the manifest and inherit the right cue
intensity automatically.

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

### 13.9. Migration + audit helpers (v1.8.0, normative)

The runtime exposes four helpers for migration ergonomics and
executable audit. All four are required at NAC-3.

```typescript
interface NAC {
  // ... v1.0..v1.7 functions unchanged.

  // Fire BOTH the canonical event name and its legacy alias
  // with the same detail object. Canonical is dispatched first,
  // synchronously. Used by plugin authors who must support
  // v1.6.x consumers AND v1.7+ consumers from the same emit-site.
  emit_dual(
    canonical_event: string,
    legacy_event: string | null,
    detail: object
  ): void;

  // Public wrappers around nac:command:rejected and
  // nac:command:failed. Plugin authors use these to surface
  // their own preflight rejections and execution failures
  // through the same wire shape the runtime uses for click,
  // fill, drag_drop, etc.
  command_rejected(detail: NacCommandRejectedDetail): void;
  command_failed(detail: NacCommandFailedDetail): void;

  // Pure utility. Returns { ok, missing[] } for whether a given
  // detail object satisfies the canonical shape required for
  // the named event family per sec 6.2.
  check_canonical_shape(
    event_type: string,
    detail: object
  ): { ok: boolean; missing: string[]; unknown_event?: boolean };

  // Runtime equivalent of the v1.7 demo's "event conformance
  // self-test". Subscribes to every event family in sec 6.2,
  // optionally invokes a driver function that exercises the
  // page, then validates each captured event against its
  // canonical shape. Required at NAC-3 (sec 6.2.27).
  validate_event_conformance(
    driver?: () => Promise<void> | void,
    opts?: { timeout_ms?: number }
  ): Promise<{
    pass: number;
    fail: number;
    miss: number;
    total_captured: number;
    details: Array<{
      event: string;
      status: 'pass' | 'fail' | 'miss';
      missing?: string[];
      sample_detail?: object;
      count?: number;
    }>;
  }>;
}
```

**CI usage:** a NAC-3 conformant page integrates
`validate_event_conformance` into its CI pipeline alongside
`validate()`/`validate_global()`. A driver function exercises
each manifest-declared action / field / tab. The CI gate fails
when `pass` plus `miss` is less than the count of declared
event families OR when `fail > 0`. The reference demo at
`yujin.app/nac-spec/example.php` ships a worked example.

### 13.10. Test harness utilities (v1.9.0, normative)

Plugin authors writing automated tests against NAC-driven UIs
need primitives narrower than `wait_for` and richer than raw
`document.addEventListener`. v1.9.0 adds three normative
helpers exposed on `window.NAC`.

```typescript
interface NAC {
  // ... v1.0..v1.8 functions unchanged.

  // assert_event_fired(eventType, opts?)
  // Returns a Promise that resolves with the matched event
  // detail when an event of the given type fires AND every
  // predicate in opts.match passes. Rejects with NacError
  // ('timeout', ...) after opts.timeout_ms (default 5000).
  // The match object can pin specific detail fields:
  //   { match: { action_id: 'invoice.send', verb: 'submit' } }
  // Reusing the helper across tests removes the per-test
  // listener boilerplate.
  assert_event_fired(
    eventType: string,
    opts?: {
      match?: Record<string, any>;
      timeout_ms?: number;
      since_ms?: number;  // ignore events older than this
    }
  ): Promise<{ event: string; detail: any; t: number }>;

  // assert_event_count(eventType, n, opts?)
  // Captures events for opts.window_ms (default 250 ms after
  // the call), then resolves { count, samples } if count === n
  // and rejects otherwise. Useful for asserting "exactly one
  // succeeded fired" or "no failed events fired".
  assert_event_count(
    eventType: string,
    n: number,
    opts?: {
      window_ms?: number;
      match?: Record<string, any>;
    }
  ): Promise<{ count: number; samples: any[] }>;

  // perf_probe(opts?)
  // Runs a synthetic 1000-element fixture against
  // describe(), validate(), validate_event_conformance() and
  // returns a structured timing report. Used by the
  // performance budget check (sec 6.2.27). The fixture is
  // generated in-memory and torn down before return.
  perf_probe(
    opts?: { element_count?: number }
  ): Promise<{
    element_count: number;
    describe_ms: number;
    validate_ms: number;
    conformance_ms: number;
    emit_ms_avg: number;
    within_budget: boolean;
    breakdown: Array<{ op: string; ms: number; budget_ms: number }>;
  }>;
}
```

**Why these three.** DeepSeek's v1.8 review listed missing
test harness utilities and missing performance benchmarks as
two separate gaps; v1.9 ships them as one cohesive surface.
`assert_event_fired` removes the most repeated boilerplate in
existing test suites; `assert_event_count` covers the
"exactly N fired" assertion that one-shot listeners cannot
do; `perf_probe` produces the timing data sec 6.2.27 demands
for the performance budget.

**Reference runtime guarantees.**
- `assert_event_fired` MUST resolve at the first matching
  event, not at the last; subscribers are torn down on resolve.
- `assert_event_count` MUST capture for the full window even
  after `n` events fire (so it can reject when N+1 fires).
- `perf_probe` MUST tear down the synthetic fixture before
  resolving so subsequent runs are independent.

### 13.11. Event replay buffer (v1.9.0, informative)

Hosts that load NAC asynchronously (deferred script, dynamic
import, micro-frontend boot) face a window where actions occur
BEFORE the runtime is installed. v1.9.0 ships a small replay
buffer pattern hosts can use; the runtime exposes the API
but the design is informative -- hosts pick whether to wire
it up.

The pattern, in three steps:

1. **Stage** events on `window.__NAC_PENDING__` before the
   runtime loads.

   ```javascript
   // In page <head> before nac.js loads:
   window.__NAC_PENDING__ = window.__NAC_PENDING__ || [];

   // A user click during boot:
   window.__NAC_PENDING__.push({
     event: 'nac:action:dispatching',
     detail: { plugin: 'patch_manager', action_id: 'apply_all',
               verb: 'apply',
               source: { type: 'user' } }
   });
   ```

2. **Replay** when the runtime installs. The runtime's
   `nac:installed` handler walks the pending array and
   re-emits each entry through `_emit`, then clears the array.

   ```javascript
   document.addEventListener('nac:installed', function () {
     NAC.replay_pending(window.__NAC_PENDING__);
     window.__NAC_PENDING__ = [];
   });
   ```

3. **Subscribe** as usual. Late subscribers see the replayed
   events on the document bus exactly as if they had fired
   live.

The runtime API:

```typescript
interface NAC {
  // Re-emit each entry of the array through the event bus.
  // Detail.source defaults to {type:'script'} per the usual
  // _emit normalisation. Replays are tagged with detail._replayed
  // = true so consumers can distinguish if they want.
  replay_pending(buffer: Array<{ event: string; detail: any }>): number;
}
```

The replay buffer is informative (not required at NAC-3) so
hosts that do not need it can ignore it. Audit pipelines that
DO consume `_replayed: true` get a clean signal that the event
came from pre-init capture rather than live emission.

Reviewer attribution: Microsoft Copilot v1.8 finding ("when
user actions occur while NAC runtime is not yet loaded, they
are lost").

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
