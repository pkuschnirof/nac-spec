# Migration guide: NAC v1.x to v2.0

NAC v2.0 is the public-announce release. It is intentionally a
**hard break**: every legacy field name accepted by the v1.x
runtime matcher is removed. v1.x consumers that read legacy
aliases stop working.

This guide is published with v1.8.0 so projects have months to
migrate before v2.0 ships. The strict-superset commitment between
minor versions stays unbroken: v1.7 plugins remain valid in v1.8;
v1.8 plugins remain valid up to v1.x for any x. The break happens
**only at v2.0**.

---

## What goes away in v2.0

The runtime stops emitting these legacy fields, and the matcher
stops accepting them. Consumers that read them get `undefined`.

| Legacy field            | Canonical (v1.7+) field                    | Where it appeared                         |
|-------------------------|--------------------------------------------|-------------------------------------------|
| `detail.nac_id`         | `detail.action_id` (action events)         | `nac:action:dispatching/succeeded/failed` |
| `detail.nac_id`         | `detail.field_id` (field events)           | `nac:field:changed`                       |
| `detail.nac_id`         | `detail.tab_id` (tab events)               | `nac:tab:changed`                         |
| `detail.nac_id`         | `detail.section_id` (section events)       | `nac:section:expanded/collapsed`          |
| `detail.nac_id`         | `detail.section_id` (accordion events)     | `nac:accordion:expanded/collapsed`        |
| `detail.nac_id`         | `detail.table_id` (table events)           | `nac:table:sort_changed/filter_changed`   |
| `detail.column_nac_id`  | `detail.column_id`                         | `nac:table:sort_changed`                  |
| `detail.filter_nac_id`  | `detail.filter_id`                         | `nac:table:filter_changed`                |
| `detail.from_nac_id`    | `detail.source_id`                         | `nac:drag:started/over/dropped/cancelled` |
| `detail.over_nac_id`    | `detail.target_id`                         | `nac:drag:over`                           |
| `detail.target_nac_id`  | `detail.target_id`                         | `nac:drag:dropped`                        |
| `detail.plugin_slug`    | `detail.plugin`                            | every event                               |
| `detail.id`             | per-family canonical id                    | various                                   |

The `legacy_event_field` warning that v1.7 emits when a consumer
reads a legacy alias becomes a hard error at v2.0.

---

## How to migrate

### Step 1: run the codemod

`tools/migrate-legacy-events.js` walks a project tree and rewrites
listener handlers reading legacy field names. Run it from the root
of your project:

```bash
node /path/to/nac-spec/tools/migrate-legacy-events.js src/
```

The codemod is a regex-based source rewrite, not a full AST
transform. It is conservative: it produces dual-read fallbacks
(`detail.field_id ?? detail.nac_id`) rather than removing the
legacy reference outright, so the migrated code keeps working on
both v1.x AND v2.0. Once your project is fully migrated and you
have dropped the v1.x runtime, you can remove the fallback by
hand or run the codemod a second time with `--strict`.

The codemod is idempotent: running it twice on already-migrated
code produces no diff.

### Step 2: emit dual-shape from your plugins

If your plugin emits events directly (not via the reference
runtime), update each emit-site to fire BOTH the canonical and
the legacy alias. The runtime exposes a helper for this:

```javascript
// Before (v1.6 style):
document.dispatchEvent(new CustomEvent('nac:field:changed', {
  detail: { plugin: 'order_form', nac_id: 'qty', value: 5 },
  bubbles: true, composed: true,
}));

// After (v1.7+ canonical with v1.6 legacy alias):
NAC.emit_dual('nac:field:changed', null, {
  plugin: 'order_form',
  field_id: 'qty',          // canonical (v1.7+)
  nac_id:   'qty',          // legacy alias (drop in v2.0)
  new_value: 5,
});
```

`NAC.emit_dual` guarantees the canonical event name dispatches
synchronously BEFORE the legacy alias on the same task tick, so
listeners on either name observe the event in deterministic order.

### Step 3: add ProvenanceBlock to programmatic operations

Every NAC-driven write should pass `opts.source` so audit pipelines
can distinguish human from automated traffic:

```javascript
// AI agent invoking a NAC.click:
await NAC.click('quotation.send', {
  source: { type: 'agent', id: 'sess-9b2c', tool: 'claude-code/0.2.4' }
});

// Voice control software:
await NAC.fill('field.name', 'Yujin', {
  source: { type: 'agent', id: voiceSessionId, tool: 'talon/1.6' }
});
```

The runtime defaults to `{type:'script'}` when `opts.source` is
absent, which is correct for page scripts. Agents that fail to
identify themselves still work but appear as `script` in audit
logs.

### Step 4: integrate the conformance self-test in CI

`NAC.validate_event_conformance(driver, opts)` is required at
NAC-3 in v1.8+ and is a normative blocker at v2.0. Wire it into
the same CI pass that runs `NAC.validate(slug)` /
`NAC.validate_global()`:

```javascript
const result = await NAC.validate_event_conformance(async () => {
  // Drive every action / field / tab / etc your manifest declares.
  await NAC.click('quotation.send');
  await NAC.fill('field.name', 'Yujin');
  // ... or invoke your existing E2E test suite as the driver.
});
if (result.fail > 0) {
  process.exit(1);
}
```

### Step 5: opt into the new audit primitives

These are not required for v2.0 but materially improve audit and
accessibility:

- Add `data-nac-a11y-hint` to dangerous actions (delete, finalize,
  send-to-client, irreversible). Voice tools and screen readers
  read this from `NAC.describe()` and SHOULD interpose a
  confirmation BEFORE invoking.

- Add `data-nac-validate="skip"` to wrappers around third-party
  widgets you cannot retrofit. The validator stops raising
  hard-errors on the subtree but emits a structured warning if
  the region contains operable surface, so you notice when you
  accidentally exclude live UI.

- Add `data-nac-drag-type` on draggable sources +
  `data-nac-drag-accept` on drop targets. Mismatched drags emit
  `nac:command:rejected` instead of silently mutating the DOM.

- Listen for `nac:command:rejected` and `nac:command:failed` in
  audit pipelines. These events fire when the runtime detected a
  preflight failure (rejected) or an unexpected throw (failed),
  closing the silent-failure gap that previously let an AI claim
  success based on no-event.

---

## When v2.0 ships

The CHANGELOG entry for v2.0 will list:

1. The exact runtime release that drops legacy fields.
2. A coordinated demo cut-over.
3. A `validate({legacy_fields: 'error'})` flag flip default to
   match the new normative behavior.
4. The deprecation of `legacy_event_field` warning suppression
   options (since the warning becomes hard).

Until then, every minor (v1.8, v1.9, ...) remains a strict
superset of v1.7. You can migrate at your own cadence.

---

## See also

- `CHANGELOG.md` -- per-version diff.
- `spec/NAC-v1.0.md` sec 6.2.28 -- canonical to legacy mapping.
- `spec/NAC-v1.0.md` sec 6.2.32 -- "why this remains a strict
  superset" until v2.0.
- `tools/migrate-legacy-events.js` -- the codemod.
