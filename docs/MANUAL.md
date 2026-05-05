# NAC v1.0 -- Practical Manual

A hands-on guide to making a UI navigable by AI, voice and RPA.
Read [spec/NAC-v1.0.md](../spec/NAC-v1.0.md) first for the formal
contract; this manual focuses on day-to-day patterns.

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
equivalent E2E tests by hand.

---

## License and citation

MIT. See [LICENSE](../LICENSE).

```
NAC v1.0 -- Navegabilidad Automatica Compliance.
Pablo Kuschnirof and Sumi. 2026. MIT License.
```
