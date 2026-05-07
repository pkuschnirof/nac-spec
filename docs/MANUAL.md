# NAC -- Practical Manual

A hands-on guide to making a UI navigable by AI, voice and RPA.
Read [spec/NAC-v1.0.md](../spec/NAC-v1.0.md) first for the formal
contract; this manual focuses on day-to-day patterns.

> **Version**: this manual tracks NAC spec v1.6.1 (runtime
> v1.6.1). Every version since v1.0 is a strict superset, so the
> v1.0 patterns shown here keep working unchanged. New primitives
> introduced in v1.1..v1.6.1 are documented in their own
> sections; follow the spec links for the normative contract.

> **What v1.6 adds**: the `NAC.reset()` plugin reset primitive.
> An operator can ask any plugin -- or the whole page -- to
> return to its declared initial state. Plugins opt in by
> registering a custom reset provider via
> `NAC.set_reset_provider(slug, fn)`; the runtime falls back to
> a generic reset (clear fields, apply
> `data-nac-default-state` / `data-nac-default-value` /
> `data-nac-default-hidden`) when no provider is registered.
> See spec section 9.3 for the normative contract; the
> reference demo registers a custom provider that closes the
> secret modal, collapses sumi-e icons, clears form fields,
> resets sort + filter + tabs + accordion, and scrolls to top
> -- the autopilot calls `NAC.reset('example_demo')` as its
> first step on every run.

> **Looking for a specific `window.NAC.*` method?**
> See [`API_REFERENCE.md`](API_REFERENCE.md) -- one-page cheat
> sheet listing every method, signature, version added, and the
> spec section that formalises it. Faster than scanning the
> spec's TypeScript interface block.

---

## Audience

- **Frontend developers** who need their UI testable end-to-end and
  pilotable by AI assistants without writing per-screen code.
- **QA engineers** who want auto-generated, manifest-driven test
  suites that survive refactors.
- **AI / RPA practitioners** who need to operate apps reliably
  without per-app integration work.

---

## Mental model

### The two principles

NAC was extracted from two product principles. Read
[`PHILOSOPHY.md`](PHILOSOPHY.md) for the full treatment;
the short version:

1. **The system disappears.** The UI is not the work; it is the
   surface through which the work happens. The contract lives
   on that surface.
2. **The agent acts as a human, not as another system.** When
   the agent operates the UI on behalf of the user, it goes
   through the same buttons, forms, permissions, and audit
   trail as the human. No privileged backdoor, no
   service-identity bypass.

Every spec decision flows from these two principles.

### Three layers

NAC is three things stacked:

1. **A vocabulary** -- a fixed set of `data-nac-*` attributes that
   describe what an element is, what it does and what state it is
   in.
2. **A bus** -- a fixed set of `nac:*` events plugins emit so
   operators know what just happened.
3. **An API** -- `window.NAC` so operators can read the page,
   fill fields, click actions, switch tabs, and wait for events.

A plugin authored for NAC says: "here is my surface, here are my
ingredients, here is my state, here are my events, drive me."

### NAC vs MCP

If you also build agents that consume MCP servers, internalise:

- **MCP** = agent as another system (typed backend tools).
- **NAC** = agent as a human (UI driving with the same path).

They are complementary. Use both, layered: NAC for acting on
behalf of the user with permissions and audit; MCP for headless
backend reads and integrations. See `PHILOSOPHY.md` for the full
NAC-vs-MCP comparison.

---

## NAC vs ARIA -- when to use what

Most teams already ship some ARIA. NAC does not replace it. The
two contracts cover different audiences and stack on the same
DOM. This section is a quick decision guide.

### One-line rule

If a **human without sight** needs to consume the element via
audio -> use ARIA. If an **autonomous operator** (AI agent, voice
runner, RPA bot, test runner) needs to drive the element
programmatically -> use NAC. If both -> use both, on the same
element.

### Decision matrix

| You want to ... | Use ARIA | Use NAC | Use both |
|---|---|---|---|
| Read aloud the label of a button | yes (`aria-label`) | -- | yes |
| Announce that a long task started | yes (`aria-busy="true"`) | -- | yes |
| Tell an agent which button is "apply" vs "submit" | -- | yes (`data-nac-action="apply"`) | yes |
| Let an agent click a button by stable ID | -- | yes (`NAC.click(id)`) | yes |
| Let an agent wait for a modal to close | -- | yes (`nac:plugin:closed`) | yes |
| Expose the list of fields a form has | partial (DOM scan only) | yes (`manifest_nac.fields`) | yes |
| Let an agent know what tabs a plugin has | partial (`role="tablist"`) | yes (`manifest_nac.tabs`) | yes |
| Tell an agent which open modes are valid (modal / maximized / new tab) | -- | yes (`modes_supported`) | yes |
| Render a screen reader announcement | yes (`aria-live`) | -- | yes |
| Let an agent read the validation summary | -- | yes (`NAC.read_feedback()`) | yes |

### Coexistence pattern

Every interactive element in production should carry attributes
from BOTH layers when relevant. They are not mutually exclusive.

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

Five NAC attributes for the autonomous operator. Three ARIA
attributes for the screen reader. Zero overlap in semantics; both
work without stepping on each other.

### Common confusions

- **"NAC roles overlap with ARIA roles."** They do not. ARIA
  `role="button"` declares "this is a button for a screen reader
  to announce". NAC `data-nac-role="action"` declares "this is an
  imperative action for an agent to invoke". A button that opens
  a modal is `role="button"` (for the screen reader) AND
  `data-nac-role="action"` with `data-nac-action="apply"` (for
  the agent). Same element, two layers.

- **"NAC `data-nac-state` overlaps with `aria-busy`."** Partial
  overlap, intentional. `aria-busy="true"` is a binary flag
  declaring "do not announce changes right now". NAC
  `data-nac-state` is one of `idle | active | success | invalid |
  busy | dirty | pristine | success | error` and is the
  authoritative state observed by the agent. When a long task
  starts, set both: `aria-busy="true"` AND
  `data-nac-state="active"`. When it finishes, set both back.

- **"NAC events look like the `change` event."** They are not the
  same. Native events fire on every keystroke and are not
  namespaced. NAC events are emitted at semantic boundaries
  (action started, action succeeded, plugin opened) and carry a
  structured `detail` object with `nac_id`, `verb`, `value`, and
  context. An agent subscribes once and receives the lifecycle
  cleanly without filtering noise.

### When you can skip NAC

You CAN skip NAC for an element if all of the following are true:

1. It is a built-in HTML5 widget (`<button>`, `<input>`,
   `<select>`, `<dialog>`, `<details>`) that the host platform
   describes via the accessibility tree natively.
2. There is a single, stable `id` already on the element that no
   other plugin reuses.
3. No autonomous operator needs to know the difference between
   "apply", "submit", "refresh", "retry", "cancel" -- a generic
   click is enough.
4. The page never opens long-running operations whose lifecycle
   an operator must wait for.

In practice, most modern UIs fail at least one of these and
therefore benefit from NAC.

### When you can skip ARIA

You CANNOT. Always ship ARIA. NAC complements; it does not
replace.

---

## Authoring a plugin

### Step 1 -- Mark the plugin root

```html
<div data-nac-plugin="patch_manager"
     data-nac-plugin-state="loading"
     role="dialog" aria-label="Patch manager">
  ...
</div>
```

`data-nac-plugin` MUST be unique within the host system.
`data-nac-plugin-state` transitions: `loading` -> `ready` (or
`empty` / `error`) -> when closing, the root is removed from DOM.

### Step 2 -- Mark every navigable element

For every input, button, tab, KPI, row, or feedback message inside
the plugin, add the three required attributes:

| Attribute             | Purpose                                  |
|-----------------------|------------------------------------------|
| `data-nac-id`         | semantic, stable, unique per plugin      |
| `data-nac-role`       | one of the canonical roles               |
| `data-nac-state`      | current state (idle/loading/.../ready)   |

Plus the role-specific attributes:

| If role is | Add                                          |
|------------|----------------------------------------------|
| `field`    | `data-nac-field-type`                        |
| `action`   | `data-nac-action`                            |
| `tab`      | `role="tab"` + `aria-selected`               |
| `feedback` | `data-nac-error` when state is `invalid`     |

### Step 3 -- Register the manifest

Right after the plugin renders for the first time:

```js
NAC.register({
  plugin_slug: 'patch_manager',
  version:     '1.0.0',
  i18n_namespace: 'cc.patch_manager',
  needs_admin: true,
  size_hint: 'large',
  modes_supported: ['modal', 'maximized', 'new_tab', 'new_window'],

  fields: [
    { nac_id: 'log.search',
      type: 'text',
      label_i18n: 'cc.patch_manager.log.search' },
    { nac_id: 'log.status_filter',
      type: 'select',
      options: [
        { value: '',        label_i18n: 'common.any' },
        { value: 'applied', label_i18n: 'cc.patch_manager.status.applied' },
        { value: 'failed',  label_i18n: 'cc.patch_manager.status.failed' },
      ],
      label_i18n: 'cc.patch_manager.log.status_filter' },
  ],

  actions: [
    { nac_id: 'refresh',  verb: 'refresh',
      label_i18n: 'common.refresh' },
    { nac_id: 'dry_run',  verb: 'apply',
      label_i18n: 'cc.patch_manager.dry_run' },
    { nac_id: 'apply_all', verb: 'apply', destructive: true,
      needs_confirm: true,
      label_i18n: 'cc.patch_manager.apply_all' },
    { nac_id: 'retry_failed', verb: 'retry',
      label_i18n: 'cc.patch_manager.retry_failed' },
  ],

  tabs: [
    { nac_id: 'tab.pending', default_active: true,
      label_i18n: 'cc.patch_manager.tab.pending' },
    { nac_id: 'tab.failed',
      label_i18n: 'cc.patch_manager.tab.failed' },
    { nac_id: 'tab.log',
      label_i18n: 'cc.patch_manager.tab.log' },
  ],

  kpis: [
    { nac_id: 'kpi.applied',    format: 'integer',
      label_i18n: 'cc.patch_manager.kpi.applied' },
    { nac_id: 'kpi.pending',    format: 'integer',
      label_i18n: 'cc.patch_manager.kpi.pending' },
    { nac_id: 'kpi.failed_24h', format: 'integer',
      label_i18n: 'cc.patch_manager.kpi.failed_24h' },
    { nac_id: 'kpi.chain',
      label_i18n: 'cc.patch_manager.kpi.chain' },
  ],

  rows: {
    nac_id: 'pending.row',
    cells: [
      { nac_id: 'pending.row.patch_id',     label_i18n: 'cc.patch_manager.col.patch_id' },
      { nac_id: 'pending.row.source',       label_i18n: 'cc.patch_manager.col.source' },
      { nac_id: 'pending.row.attempts',     format: 'integer',
        label_i18n: 'cc.patch_manager.col.attempts' },
      { nac_id: 'pending.row.last_status',  label_i18n: 'cc.patch_manager.col.last_status' },
    ],
  },
});
```

Once registered the manifest is queryable: `NAC.manifest('patch_manager')`.

### Step 4 -- Emit events

Lifecycle events on mount/unmount:

```js
function mount() {
  document.dispatchEvent(new CustomEvent('nac:plugin:opening',
    { detail: { plugin: 'patch_manager', timestamp: Date.now() } }));
  // ... fetch + render ...
  root.setAttribute('data-nac-plugin-state', 'ready');
  document.dispatchEvent(new CustomEvent('nac:plugin:opened',
    { detail: { plugin: 'patch_manager', timestamp: Date.now() } }));
}
```

Action events on each click:

```js
async function applyAll() {
  document.dispatchEvent(new CustomEvent('nac:action:dispatching',
    { detail: { plugin: 'patch_manager', nac_id: 'apply_all' } }));
  try {
    const r = await api.applyAll();
    document.dispatchEvent(new CustomEvent('nac:action:succeeded',
      { detail: { plugin: 'patch_manager', nac_id: 'apply_all', value: r } }));
  } catch (err) {
    document.dispatchEvent(new CustomEvent('nac:action:failed',
      { detail: { plugin: 'patch_manager', nac_id: 'apply_all',
                  error: String(err) } }));
  }
}
```

Field events whenever an input changes:

```js
inputEl.addEventListener('input', function () {
  document.dispatchEvent(new CustomEvent('nac:field:changed',
    { detail: { plugin: 'patch_manager', nac_id: 'log.search',
                value: inputEl.value } }));
});
```

That's it. The plugin is now NAC-3 compliant.

---

## Operating a NAC plugin

The operator (Claude, voice assistant, RPA bot, test runner) uses
`window.NAC`:

```js
// Wait for the plugin to be ready
await NAC.wait_for('nac:plugin:opened');

// Inspect the current state
const snap = NAC.describe();

// Fill a field
await NAC.fill('log.search', 'B-fix');

// Switch a tab
await NAC.tab('patch_manager', 'tab.failed');

// Click an action and await completion
const r = await NAC.click('apply_all');
if (!r.ok) {
  console.error('apply_all failed:', r.event && r.event.detail);
}

// Read feedback
const fb = NAC.read_feedback();
fb.forEach(function (f) {
  console.log(f.state, f.message);
});
```

For external operators (Playwright, Browser-use, etc.), the same API
is invoked via `page.evaluate()`.

---

## Voice-to-NAC

A voice assistant maps the spoken utterance to a `NacOp`:

```text
"Patch manager, aplicar todos los pendientes"
   |
   v
{ op: 'click', nac_id: 'apply_all', plugin: 'patch_manager' }
```

The mapping is done by reading the manifest + active locale labels:
the assistant searches for the label that best matches the
utterance, then resolves to the `nac_id`. No per-app NLU training
required; the manifest is the dictionary.

See `examples/voice_to_nac.md` for a full reference adapter.

---

## Testing with the runner

```bash
cd runner/
python nac_runner.py --target https://your-app/ \
                     --plugin patch_manager \
                     --auth seed-jwt
```

The runner:

1. Loads the page, opens the plugin via UI navigation.
2. Reads `NAC.manifest('patch_manager')`.
3. Generates smoke / field / action / tab / KPI tests automatically.
4. Optionally calls Claude/GPT-Vision with the screenshot + manifest
   to propose extra edge cases.
5. Reports pass/fail per test, with screenshots of failures.

### Why this is different from a selector-based suite

A selector-based test suite asserts on rendering choices --
class names, label text, DOM order. Every redesign, every
locale switch, every CSS-in-JS rebuild breaks a chunk of the
suite even when no behaviour changed. A NAC-driven suite asserts
on the application's own contract -- `data-nac-id`, lifecycle
events, manifest entries -- so it only breaks when the
application's intent actually changes. That is the correct
breakage signal.

For the full argument, including the migration recipe for an
existing Playwright/Cypress/Selenium suite and the CI-gate
integration with `axe-core` for ARIA, see
[`docs/IMPACT_TESTING.md`](IMPACT_TESTING.md). The parallel
argument for RPA factories is in
[`docs/IMPACT_RPA.md`](IMPACT_RPA.md).

---

## Common mistakes

### Mistake: auto-generated `nac_id`

```html
<!-- WRONG -->
<button data-nac-id="btn_3a7f9c">Apply</button>
```

`nac_id` MUST be semantic. Operators reference it across releases.

### Mistake: missing event on async action

```js
// WRONG: clicks fire but no event tells the operator the action ended
function applyAll() { return api.applyAll(); }
```

Operators need `nac:action:succeeded` / `nac:action:failed` to know
when to proceed. Without it, every click becomes an indeterminate
wait.

### Mistake: hardcoded feedback strings

```html
<!-- WRONG -->
<div class="toast">Error: not found</div>

<!-- RIGHT -->
<div data-nac-id="feedback.last_apply"
     data-nac-role="feedback"
     data-nac-state="error"
     data-nac-error="cc.patch_manager.error.not_found|Patch no encontrado">
  Patch no encontrado
</div>
```

### Mistake: leaking secrets in `data-nac-*`

```html
<!-- DANGEROUS -->
<input data-nac-id="api_key" value="sk_live_abc123...">
```

NAC attributes are public. Never put secrets there. Treat the
attribute set as you would treat ARIA: anyone running JS in the page
can read it.

---

## Migration playbook

For an existing app:

1. **Inventory** -- list every screen / modal / drawer that has
   interactive elements.
2. **Prioritize** -- start with the screens most used by AI
   assistants or covered worst by automated tests.
3. **Annotate** -- add the attributes per the vocabulary.
4. **Register** -- one manifest per screen.
5. **Emit events** -- wrap async actions with the lifecycle
   `dispatching` / `succeeded` / `failed` triplet.
6. **Validate** -- run `NAC.validate('plugin_slug')` in dev.
7. **Run runner** -- the auto-generated test suite catches what you
   forgot.
8. **Publish badge** -- once green, add the NAC-3 badge to your
   README and update `NAC_REGISTRY.md`.

Typical effort per screen: 30-60 min for a simple form, 1-3 h for a
complex multi-tab dashboard. Significantly less than writing the
equivalent E2E tests by hand. Note that "effort per screen" assumes
a human author. With an AI coding agent applying NAC from
`AI_INSTRUCTIONS.md` + this manual, per-screen wall-clock drops to
a few minutes per screen plus human review time. See spec section
1.5.2 for the agent-first adoption framing.

---

## Framework integration patterns

> Added in v1.4.2 in response to AI peer review action item 3.5-F.
> Section 7.2 of the spec mandates atomic updates to
> `data-nac-state` and the corresponding `aria-*` attribute. Modern
> reactive frameworks batch DOM writes asynchronously; this section
> shows how to honour the contract per framework.

### React 18

React batches state updates inside event handlers and effects. To
update both attributes atomically:

```jsx
function PatchRow({ patch }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      data-nac-id={`patch_manager.row.${patch.id}.apply`}
      data-nac-role="action"
      data-nac-action="apply"
      data-nac-state={busy ? 'loading' : 'idle'}
      role="button"
      aria-label={`Apply patch ${patch.id}`}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true); // single setState -> atomic re-render
        try {
          await api.applyPatch(patch.id);
          dispatchNac('nac:action:succeeded', { nac_id: ..., verb: 'apply' });
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
```

Both `data-nac-state` and `aria-busy` derive from the same `busy`
state, so a single `setBusy` call commits both attributes in the
same render. `aria_lag_ms` in the manifest can stay at 0.

If you maintain the two values as separate states (don't), use
`flushSync` from `react-dom` only when crossing render boundaries:

```jsx
import { flushSync } from 'react-dom';
flushSync(() => {
  setNacState('loading');
  setAriaBusy(true);
});
```

`useDeferredValue` and `useTransition` defer renders -- they break
atomicity. Avoid them for state mirrored to ARIA.

### Vue 3 (Composition API)

Vue's reactivity collapses multiple sets into one tick automatically:

```vue
<template>
  <button
    :data-nac-id="`patch_manager.row.${patch.id}.apply`"
    data-nac-role="action"
    data-nac-action="apply"
    :data-nac-state="busy ? 'loading' : 'idle'"
    role="button"
    :aria-label="`Apply patch ${patch.id}`"
    :aria-busy="busy"
    @click="handle"
  />
</template>
<script setup>
import { ref } from 'vue';
const busy = ref(false);
async function handle() {
  busy.value = true;
  try { await api.applyPatch(patch.id); dispatchNac(...); }
  finally { busy.value = false; }
}
</script>
```

Both bindings read `busy.value`; Vue commits them in the same DOM
patch. Set `aria_lag_ms: 0` in the manifest.

### Svelte 5 (runes)

Same shape, even shorter:

```svelte
<script>
  let busy = $state(false);
  async function handle() {
    busy = true;
    try { await api.applyPatch(...); dispatchNac(...); }
    finally { busy = false; }
  }
</script>

<button
  data-nac-id={`patch_manager.row.${patch.id}.apply`}
  data-nac-role="action"
  data-nac-action="apply"
  data-nac-state={busy ? 'loading' : 'idle'}
  role="button"
  aria-busy={busy}
  on:click={handle}
/>
```

Svelte's compiler updates both attributes in the same micro-task.

### Angular 17 (signals)

```html
<button
  [attr.data-nac-id]="'patch_manager.row.' + patch.id + '.apply'"
  data-nac-role="action"
  data-nac-action="apply"
  [attr.data-nac-state]="busy() ? 'loading' : 'idle'"
  role="button"
  [attr.aria-busy]="busy()"
  (click)="handle()">
</button>
```

```ts
busy = signal(false);
async handle() {
  this.busy.set(true);
  try { await api.applyPatch(...); this.dispatchNac(...); }
  finally { this.busy.set(false); }
}
```

Angular's change detection ensures both attribute bindings update
in the same cycle.

### When you cannot guarantee atomicity

If your framework imposes asynchronous attribute commits (Web
Components with separate property setters, jQuery with manual
`.attr()` calls, legacy Backbone), declare the lag in the
manifest:

```js
NAC.register({
  plugin_slug: 'legacy_grid',
  /* ... */
  aria_lag_ms: 16, /* one frame; the validator uses this to
                       silence aria_nac_state_mismatch findings
                       within the declared window. */
});
```

Validators MAY tolerate divergence up to `aria_lag_ms`; beyond
that, the finding `aria_nac_state_mismatch` fires.

### Lifecycle event hooks per framework

| Event              | React            | Vue 3            | Svelte 5         | Angular            |
|--------------------|------------------|------------------|------------------|--------------------|
| `nac:plugin:opening` | top of mounting `useEffect` (empty deps) BEFORE first render | top of `<script setup>` after refs init, before template renders | top of component, $effect.pre | `ngOnInit`        |
| `nac:plugin:opened`  | `useEffect` cleanup-free leg AFTER refs settle | `onMounted()` | `onMount()` | `ngAfterViewInit` |
| `nac:plugin:closing` | early in `useEffect` cleanup function | `onBeforeUnmount` | `onDestroy` start | `ngOnDestroy` start |
| `nac:plugin:closed`  | end of cleanup function | last line of `onBeforeUnmount` | end of `onDestroy` | end of `ngOnDestroy` |

Server-side rendering note: emit lifecycle events only on the
client. Wrap with `typeof document !== 'undefined'` (or
framework-specific guards: `useEffect` is client-only in React,
`onMounted` is client-only in Vue 3).

---

## Design-system layer pattern

> Added in v1.6.1 in response to AI peer review of v1.6.0. **Five
> of seven reviewers (Mistral, Copilot, Claude 4.7, DeepSeek,
> HuggingChat) flagged the ARIA dual-source-of-truth tax as the #1
> abandonment cause** when adopting NAC alongside an existing
> ARIA-instrumented codebase. Claude 4.7 wrote: "Once a team sees
> the validator block CI on every drift between data-nac-state and
> the corresponding aria-*, internal pressure builds either to
> drop NAC or to build a design-system abstraction that emits
> both." This chapter is that design-system abstraction, written
> out concretely.

If your project already has a Button / Input / Toggle / Modal
component library, the cheapest place to absorb the NAC + ARIA
dual-attribute discipline is **inside those primitives**. Every
consumer that uses `<Button>` automatically gets both layers
without touching their own code. Drift is then a property of the
component library (one place to fix) instead of a property of
every screen (where teams get tired and skip).

### Goal

A single internal primitive that:

- accepts an action verb + state as props,
- emits `data-nac-id` / `data-nac-role` / `data-nac-state` and the
  corresponding `aria-*` attributes in the SAME render commit,
- fires `nac:action:dispatching` / `succeeded` / `failed` with
  correct timing (see "Event correctness" below),
- is the only component in the codebase allowed to write
  `data-nac-*` directly.

Hand-rolled `<button data-nac-id="...">` becomes a code-review
violation: every interactive element goes through the primitive.

### React reference (TypeScript)

```tsx
type NacButtonProps = {
  nacId: string;                    // canonical, plugin-namespaced
  verb: string;                     // 'apply' | 'submit' | 'refresh' | ...
  label: string;                    // localised
  onClick: () => Promise<unknown>;
  disabled?: boolean;
  pluginInstanceId?: string;        // for multi-mount plugins
  children?: React.ReactNode;
};

export function NacButton(props: NacButtonProps) {
  const [state, setState] = React.useState<'ready' | 'loading' | 'error'>('ready');

  const handle = React.useCallback(async () => {
    if (state !== 'ready' || props.disabled) return;

    /* React 18 batches state updates across handlers. The ARIA
       mirror MUST land in the same DOM commit as data-nac-state
       so the validator never observes drift. flushSync forces
       the synchronous commit before we emit the dispatching
       event. Without it, a fast follow-up read of aria-busy
       would be stale. */
    ReactDOM.flushSync(() => setState('loading'));

    emitNacEvent('nac:action:dispatching', {
      plugin: pluginSlug, plugin_instance_id: props.pluginInstanceId,
      nac_id: props.nacId, verb: props.verb,
    });

    try {
      const result = await props.onClick();
      ReactDOM.flushSync(() => setState('ready'));
      emitNacEvent('nac:action:succeeded', {
        plugin: pluginSlug, plugin_instance_id: props.pluginInstanceId,
        nac_id: props.nacId, verb: props.verb, result,
      });
    } catch (err) {
      ReactDOM.flushSync(() => setState('error'));
      emitNacEvent('nac:action:failed', {
        plugin: pluginSlug, plugin_instance_id: props.pluginInstanceId,
        nac_id: props.nacId, verb: props.verb,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [state, props]);

  return (
    <button
      type="button"
      onClick={handle}
      disabled={props.disabled || state === 'loading'}
      data-nac-id={props.nacId}
      data-nac-role="action"
      data-nac-action={props.verb}
      data-nac-state={state}
      data-nac-plugin-instance-id={props.pluginInstanceId || null}
      aria-label={props.label}
      aria-busy={state === 'loading' ? 'true' : undefined}
      aria-disabled={props.disabled ? 'true' : undefined}
    >
      {props.children ?? props.label}
    </button>
  );
}
```

Two dual-attribute pairs land atomically: `data-nac-state="loading"`
+ `aria-busy="true"`, and `data-nac-state` (when ready) +
absence of `aria-busy`. The validator's `aria_nac_state_mismatch`
finding can never fire on this primitive because the JSX template
only allows mirrored values.

### Vue 3 reference (Composition API)

```vue
<script setup lang="ts">
const props = defineProps<{
  nacId: string;
  verb: string;
  label: string;
  pluginInstanceId?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ click: [] }>();

const state = ref<'ready' | 'loading' | 'error'>('ready');

async function handle() {
  if (state.value !== 'ready' || props.disabled) return;
  state.value = 'loading';
  /* Vue 3 reactivity is synchronous on a single commit; nextTick
     flushes the DOM mutation before we emit, mirroring React's
     flushSync. */
  await nextTick();
  emitNacEvent('nac:action:dispatching', {
    plugin: pluginSlug, plugin_instance_id: props.pluginInstanceId,
    nac_id: props.nacId, verb: props.verb,
  });
  try {
    const result = await onClick();
    state.value = 'ready';
    await nextTick();
    emitNacEvent('nac:action:succeeded', { /* ... */ });
  } catch (err) {
    state.value = 'error';
    await nextTick();
    emitNacEvent('nac:action:failed', { /* ... */ error: String(err) });
  }
}
</script>

<template>
  <button
    type="button"
    @click="handle"
    :disabled="disabled || state === 'loading'"
    :data-nac-id="nacId"
    data-nac-role="action"
    :data-nac-action="verb"
    :data-nac-state="state"
    :data-nac-plugin-instance-id="pluginInstanceId || null"
    :aria-label="label"
    :aria-busy="state === 'loading' ? 'true' : null"
    :aria-disabled="disabled ? 'true' : null"
  >
    <slot>{{ label }}</slot>
  </button>
</template>
```

### Svelte 5 reference

```svelte
<script lang="ts">
  let { nacId, verb, label, pluginInstanceId, disabled, onClick } = $props();
  let state = $state<'ready' | 'loading' | 'error'>('ready');

  async function handle() {
    if (state !== 'ready' || disabled) return;
    state = 'loading';
    /* Svelte 5 effects flush before the next microtask; await
       Promise.resolve() lets the DOM commit settle before we
       emit, the same shape as flushSync / nextTick. */
    await Promise.resolve();
    emitNacEvent('nac:action:dispatching', {
      plugin: pluginSlug, plugin_instance_id: pluginInstanceId,
      nac_id: nacId, verb,
    });
    try {
      const result = await onClick();
      state = 'ready';
      await Promise.resolve();
      emitNacEvent('nac:action:succeeded', { /* ... */ });
    } catch (err) {
      state = 'error';
      await Promise.resolve();
      emitNacEvent('nac:action:failed', { /* ... */ error: String(err) });
    }
  }
</script>

<button
  type="button"
  onclick={handle}
  disabled={disabled || state === 'loading'}
  data-nac-id={nacId}
  data-nac-role="action"
  data-nac-action={verb}
  data-nac-state={state}
  data-nac-plugin-instance-id={pluginInstanceId || null}
  aria-label={label}
  aria-busy={state === 'loading' ? 'true' : null}
  aria-disabled={disabled ? 'true' : null}
>
  {label}
</button>
```

### Why each example uses a framework-specific commit barrier

The validator's drift findings (sec 7.3.2 hard-error from v1.6.1)
reject any state where `data-nac-state` and the mirrored
`aria-*` are inconsistent at the moment of observation. React
18's concurrent mode, Vue's queued reactivity, and Svelte 5's
effect scheduler all batch DOM mutations across microtasks
unless explicitly flushed. **Without the commit barrier, a fast
agent or test runner can observe a torn state for one tick.**
The barrier is the single most important pattern in the
design-system layer: every state mutation that crosses the
data-nac-state vs aria-* boundary MUST be committed before the
event fires.

### Cost amortisation

The up-front investment is roughly:

- 1 day to extract the primitive(s) for the 5-10 most-used
  components in your library (Button, Input, Toggle, Select,
  Modal, Tabs, Accordion).
- 1-2 days to refactor existing usages to consume the new
  primitives instead of raw `<button>` / `<input>`.
- An ESLint rule that forbids raw `data-nac-*` attributes
  outside the design-system package (1 hour to write, prevents
  the next 100 violations).

Once that is done, every new screen automatically meets the
v1.6.1 hard-error gate. **Teams that skip this layer are the
teams that abandon NAC mid-rollout.** Teams that build it
amortise the cost across every interactive element in their
product.

---

## Event correctness

> Added in v1.4.2 in response to AI peer review action item 3.5-I.
> Copilot rated this as "the most underestimated cost" of NAC
> adoption. The patterns below cover the four shapes that break
> automation runners most often.

The contract: `nac:action:succeeded` MUST fire when, and only
when, the operation the verb names is observably complete from
the user's perspective. Not when the request was sent. Not when
the optimistic UI updated. **When the work is done.**

### Pattern 1 -- Single async call

```js
button.addEventListener('click', async () => {
  emit('nac:action:dispatching', { nac_id, verb });
  try {
    await api.applyPatch(id); // observable result on server
    emit('nac:action:succeeded', { nac_id, verb });
  } catch (err) {
    emit('nac:action:failed', { nac_id, verb, error: String(err) });
  }
});
```

Rule: the `succeeded` / `failed` event fires after `await`,
inside the catch-or-success branch. Never before.

### Pattern 2 -- Optimistic update + server confirmation

The user sees the UI update immediately; the server confirms a
moment later. The agent-relevant event is the SERVER confirmation,
not the optimistic commit:

```js
async function applyPatch(id) {
  // Local optimistic state for the human.
  setLocal({ id, status: 'applying' });
  emit('nac:action:dispatching', { nac_id, verb });
  try {
    const res = await api.applyPatch(id);
    setLocal({ id, status: res.status }); // server-confirmed
    emit('nac:action:succeeded', { nac_id, verb, result: res });
  } catch (err) {
    setLocal({ id, status: 'failed' });
    emit('nac:action:failed', { nac_id, verb, error: String(err) });
    rollbackOptimistic();
  }
}
```

The wrong pattern (do NOT do this) is firing `succeeded` on the
optimistic commit. An agent that observes that event will move
on, the server then rejects the request, and the agent now
believes a state that does not exist.

### Pattern 3 -- Async chain

When the verb's outcome requires several backend hops:

```js
async function publishPost() {
  emit('nac:action:dispatching', { nac_id, verb: 'publish' });
  try {
    const draft = await api.saveDraft(payload);
    const reviewed = await api.submitForReview(draft.id);
    const published = await api.publish(reviewed.id);
    // The verb is "publish". Single succeeded event after the
    // CHAIN settles, not per step.
    emit('nac:action:succeeded', {
      nac_id, verb: 'publish', result: published });
  } catch (err) {
    emit('nac:action:failed', { nac_id, verb: 'publish', error: String(err) });
  }
}
```

Rule: one verb produces at most one `succeeded` and at most one
`failed`, regardless of how many internal steps execute.

### Pattern 4 -- Retries

Each retry attempt is a fresh `dispatching` / `succeeded` |
`failed` cycle. The earlier `failed` is permanent; the new
`succeeded` does not retract it -- agents see the full audit
trail.

```js
async function applyWithRetry(id, max = 3) {
  for (let attempt = 1; attempt <= max; attempt++) {
    emit('nac:action:dispatching', { nac_id, verb, attempt });
    try {
      const res = await api.applyPatch(id);
      emit('nac:action:succeeded', { nac_id, verb, attempt, result: res });
      return res;
    } catch (err) {
      emit('nac:action:failed', { nac_id, verb, attempt, error: String(err) });
      if (attempt === max) throw err;
      await sleep(2 ** attempt * 1000); // backoff
    }
  }
}
```

Note the `attempt` field in the event detail. Agents that
implement intelligent retry can read it and skip duplicating the
backoff.

### Pattern 5 -- Cancellation

Use `AbortController`. The verb produces a `failed` with error
`'aborted'`; the consuming agent learns the cancellation:

```js
const ctrl = new AbortController();
async function applyCancellable(id) {
  emit('nac:action:dispatching', { nac_id, verb });
  try {
    const res = await api.applyPatch(id, { signal: ctrl.signal });
    emit('nac:action:succeeded', { nac_id, verb, result: res });
  } catch (err) {
    if (err.name === 'AbortError') {
      emit('nac:action:failed', { nac_id, verb, error: 'aborted' });
    } else {
      emit('nac:action:failed', { nac_id, verb, error: String(err) });
    }
  }
}
// Elsewhere:
cancelButton.addEventListener('click', () => ctrl.abort());
```

### Race conditions

If a user fires the same verb twice in quick succession (impatient
double-click, or chat dispatching twice), the runtime's
awaitable-write contract (section 7.1) protects the operator side
-- the second `click()` resolves on the next event tick. The
plugin author still has to ensure the BACKEND idempotent or
serialised. The simplest pattern: while `data-nac-state="loading"`,
ignore the verb. The runtime will see the disabled / loading state
and reject the second call with `disabled` or `not_found`.

```js
async function handle() {
  if (button.getAttribute('data-nac-state') === 'loading') return;
  button.setAttribute('data-nac-state', 'loading');
  /* ... */
}
```

### Summary checklist

Before declaring NAC-3, walk every action your plugin ships and
verify:

- [ ] `nac:action:dispatching` fires AT START of the handler.
- [ ] `nac:action:succeeded` fires AFTER `await` resolves (server
  confirmation, not optimistic commit).
- [ ] `nac:action:failed` fires from the catch branch with a
  string `error` field describing the failure.
- [ ] One verb -> at most one terminal event per dispatch.
- [ ] Retries each get their own dispatching / succeeded | failed
  triplet with `attempt` in detail.
- [ ] Cancellation produces `failed` with `error: 'aborted'`.
- [ ] Double-fire prevention via `data-nac-state="loading"` gate.

### Framework-specific timing (v1.6.1)

> Added in v1.6.1 in response to AI peer review of v1.6.0
> (HuggingChat, Claude 4.7). HuggingChat: "In React 18 with
> concurrent features, useTransition or useDeferredValue batch
> and defer DOM commits by design ... yet the reference runtime
> does not enforce atomicity, it only validates after the fact."
> The fix lives in the design-system layer (see chapter above);
> this section names the precise barrier per framework.

The patterns above show the verb's lifecycle in vanilla JS. In
real frameworks the DOM mutation that flips `data-nac-state` is
batched. The `succeeded` / `failed` event MUST fire **after** the
DOM has actually committed the new state, not after the JS state
variable has been assigned.

| Framework | Commit barrier | Pitfall |
|---|---|---|
| React 18 | `ReactDOM.flushSync(() => setState('loading'))` before `emit('nac:action:dispatching', ...)`. Same before `succeeded` / `failed`. | `useTransition`, `useDeferredValue`, Suspense fallbacks all defer commit -- the bare `setState` is NOT enough. |
| Vue 3   | `await nextTick()` between mutating the ref and emitting the event. | Async components inside `<Suspense>` produce two render passes; nextTick once is fine, but the `await` is mandatory. |
| Svelte 5 | `await Promise.resolve()` after assigning to `$state` so the effect runs before the event fires. Or `await tick()` from `svelte`. | Bare assignment under `$effect.pre` does not commit before the next microtask. |
| Angular 17+ | `cdr.detectChanges()` after the host writes the input; or run inside `runInInjectionContext` + `effect()` and await `afterRender`. | `OnPush` change detection batches across event loops. |
| Qwik | `await sync$()` after the signal write. | Resumability defers DOM hydration; signal updates are not always synchronous to DOM. |

If you are not using a framework on this list, the safe portable
shape is `await Promise.resolve()` after the state mutation and
before the `emit` call. Most frameworks resolve their commit
queue inside that microtask boundary.

The validator does not enforce the barrier itself (that would
require framework introspection), but its `aria_nac_state_mismatch`
finding (hard-error at NAC-3 from v1.6.1, see spec sec 7.3.2)
reliably catches the symptom -- a stale `aria-busy` paired with
the new `data-nac-state`. If your CI fires that finding and the
DOM looks correct on inspection, the missing commit barrier is
the fix.

---

## License and citation

MIT. See [LICENSE](../LICENSE).

```
NAC -- Native Accessibility Contract.
Spec v1.6.1 / runtime v1.6.4. 2026. MIT License.
Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, Sumi.
https://github.com/pkuschnirof/nac-spec
```
