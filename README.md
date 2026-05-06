# NAC -- Navegabilidad Automatica Compliance

> A design norm that lets AI agents, voice assistants, RPA bots and
> automated test runners navigate, fill, operate and verify any user
> interface as if they were human users -- without reading the source
> code, without fragile selectors, without manual test scripts.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NAC v1.1](https://img.shields.io/badge/NAC-v1.1-violet.svg)](spec/NAC-v1.0.md)
[![Status: Stable](https://img.shields.io/badge/status-stable-success.svg)](#)

**Authors:** Pablo Kuschnirof, Sumi.
**License:** MIT.
**Spec version:** v1.1 (2026-05-06; strict superset of v1.0).

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

---

## Why NAC

Modern UIs are built for human eyes first. As a result, automated
tests rely on fragile CSS selectors, AI assistants cannot operate UIs
on the user's behalf, RPA bots need costly per-app training, and E2E
test coverage rarely exceeds 50% because writing specs manually does
not scale with feature velocity.

NAC reverses the polarity: a UI that complies with NAC v1.0
publishes its own contract -- semantic IDs, roles, states, events,
and a programmatic API -- so any external operator can introspect,
operate and verify it without privileged access.

Compliant systems are testable end-to-end at near-100% coverage with
auto-generated specs plus AI-guided exploration. Non-compliant
systems are not.

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
   a developer takes about a week. NAC is 5 attributes + 7 events
   + 5 driver functions. Onboarding takes about an hour.

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
   layer that a team can adopt in an afternoon.

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
NAC v1.0 -- Navegabilidad Automatica Compliance.
Pablo Kuschnirof and Sumi. 2026. MIT License.
```

## Status

NAC v1.0 is **stable**. The first production deployment ships with
the Yujin CRM (yujin.app) Control Center plugins, May 2026.

## Contributing

This is an open standard. Forks, suggestions, language ports
(Python, Swift, Kotlin, Rust, Go) are welcome via pull request. The
spec is intentionally minimal; new attribute types or roles MUST go
through a spec PR with at least one production reference deployment.

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
