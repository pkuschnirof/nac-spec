# NAC `window.NAC` API Reference

> One-page cheat sheet of every `window.NAC.*` method shipped by
> the reference runtime (`js/nac.js`). For the normative
> contract see `spec/NAC-v1.0.md`. For authoring guidance see
> `docs/MANUAL.md`. For decision rules see `AI_INSTRUCTIONS.md`.

The surface is grouped by version. Each method shows signature,
short description, error throws, and the spec section that
formalises it. AI coding agents implementing NAC can use this
table as the canonical lookup.

Current runtime version: **`NAC.version === '1.4.1'`** (spec
`1.4`). The runtime exposes `NAC.version` and
`NAC.spec_version` as strings; check them at boot if you need
feature gating.

---

## v1.0 -- core read API

| Method | Signature | Description | Spec |
|---|---|---|---|
| `register` | `register(plugin_slug, manifest_nac): void` | Plugin registers its manifest at boot | P7 |
| `unregister` | `unregister(plugin_slug): void` | Remove a plugin's manifest (cleanup on unmount) | P7 |
| `manifest` | `manifest(plugin?): NacManifest \| NacManifest[]` | Returns one or all registered manifests | P7 |
| `describe` | `describe(): NacSnapshot` | Synchronous snapshot of every plugin + element on page | P5 |
| `list` | `list(role?: NacRole): NacElement[]` | Filter by role: action, field, kpi, tab, etc | P5 |
| `find` | `find(nac_id, opts?): NacElement \| null` | Locate one element by `nac_id` | P5 |
| `read_feedback` | `read_feedback(): NacFeedback[]` | Active error / warning / info messages | P5 |
| `snapshot_state` | `snapshot_state(): NacStateSnapshot` | Active plugin + invalid elements + feedback | P5 |

## v1.0 -- core write API

| Method | Signature | Description | Spec |
|---|---|---|---|
| `click` | `click(nac_id, opts?): Promise<NacResult>` | Trigger an action; awaits `nac:action:succeeded` / `failed`; rejects on timeout | 3.4-A, 7.1 |
| `fill` | `fill(nac_id, value, opts?): Promise<NacResult>` | Set a field; emits `nac:field:changed` | P5 |
| `select` | `select(nac_id, option, opts?): Promise<NacResult>` | Pick one or many options | P5 |
| `tab` | `tab(plugin, tab_key): Promise<NacResult>` | Activate a tab by `data-nac-id` | P5 |
| `set_mode` | `set_mode('modal'\|'maximized'\|'new_tab'\|'new_window'): void` | Request a viewport mode; emits `nac:mode:requested` | P5 |

## v1.0 -- utility

| Method | Signature | Description | Spec |
|---|---|---|---|
| `wait_for` | `wait_for(eventName, timeout_ms?): Promise<NacEvent>` | Promise resolves when event fires; rejects on timeout | 7.1 |
| `screenshot` | `screenshot(): Promise<string>` | Best-effort SVG/PNG of active plugin | P5 |
| `validate` | `validate(plugin_slug): { ok, missing, errors, manifest, timestamp }` | Manifest-vs-DOM drift check; v1.4.1 includes structured `errors[]` | 3.4-B |

`click` opts shape (v1.4.1): `{ plugin?: string, plugin_instance_id?: string, timeout?: number }`. See section 7.1 for the awaitable-write contract -- writes resolve only on the success/fail event, or reject with `NacError('timeout', ...)`.

---

## v1.2 -- dynamic options

For select/multi fields whose options come from a remote source, run-time filtered, or depend on other fields.

| Method | Signature | Description |
|---|---|---|
| `options` | `options(plugin, field_id): Promise<Option[]>` | Resolve options for a field (uses registered resolver or static manifest) |
| `search_options` | `search_options(plugin, field_id, query): Promise<Option[]>` | Filtered options for autocomplete |
| `invalidate_options` | `invalidate_options(plugin, field_id): void` | Force refetch on next read; emits `nac:options:invalidated` |
| `set_options_resolver` | `set_options_resolver(plugin, field_id, fn): void` | Plugin registers `fn(query, limit) -> Promise<Option[]>` |

## v1.2 -- window chrome

| Method | Signature | Description |
|---|---|---|
| `minimize` | `minimize(plugin): void` | Drop plugin to dock |
| `maximize` | `maximize(plugin): void` | Expand to fullscreen workspace |
| `restore` | `restore(plugin): void` | Return to normal modal size |
| `fullscreen` | `fullscreen(plugin): void` | Native browser fullscreen |

## v1.2 -- discovery

| Method | Signature | Description | Spec |
|---|---|---|---|
| `system_map` | `system_map(): Promise<SystemMap>` | Layer A precomputed nav map | 14.3.1 |
| `capabilities` | `capabilities(): Promise<CapabilityInventory>` | Layer C catalog only | 14.3.3 |
| `set_system_map_provider` | `set_system_map_provider(fn): void` | Host registers `fn(): Promise<SystemMap>` | 14.3 |
| `set_capabilities_provider` | `set_capabilities_provider(fn): void` | Host registers `fn(): Promise<CapabilityInventory>` | 14.3 |
| `system_map_layers` | `system_map_layers(): { a, b, c, preferred }` | **v1.4.1** -- synchronous declaration of which layers are implemented | 14.3.5 |

Layer B (per-view transitions) is declared inline in each manifest under `manifest.transitions[]`; no dedicated function. Use `manifest()` then read `transitions`.

## v1.2 -- section landmarks

| Method | Signature | Description |
|---|---|---|
| `list_sections` | `list_sections(): Section[]` | Enumerate page-level landmarks |
| `go_to_section` | `go_to_section(sectionId): void` | Scroll into view + emit `nac:section:reached` |

---

## v1.3 -- toast / banner / confirm

| Method | Signature | Description |
|---|---|---|
| `toast` | `toast(text, opts?): { id, dismiss }` | Auto-dismissing notification |
| `list_toasts` | `list_toasts(): Toast[]` | Currently visible toasts |
| `dismiss_toast` | `dismiss_toast(id): void` | Force-close a toast |
| `list_banners` | `list_banners(): Banner[]` | In-page banners |
| `dismiss_banner` | `dismiss_banner(id): void` | Close a banner |
| `confirm` | `confirm(prompt, opts?): Promise<boolean>` | Show modal confirm; resolves `true`/`false` |
| `list_pending_confirms` | `list_pending_confirms(): ConfirmDialog[]` | **Use this to detect blocking modals** |

## v1.3 -- stepper

| Method | Signature | Description |
|---|---|---|
| `step_next` | `step_next(stepperId): void` | Advance one step |
| `step_back` | `step_back(stepperId): void` | Retreat one step |
| `step_to` | `step_to(stepperId, n): void` | Jump to step `n` (zero-indexed) |
| `step_state` | `step_state(stepperId): StepperState` | Current index + total + completion |

## v1.3 -- tree

| Method | Signature | Description |
|---|---|---|
| `tree_expand` | `tree_expand(treeId, nodeId): void` | Expand one node |
| `tree_collapse` | `tree_collapse(treeId, nodeId): void` | Collapse one node |
| `tree_select` | `tree_select(treeId, nodeId): void` | Select node + emit event |
| `tree_path` | `tree_path(treeId, nodeId): string[]` | Ancestor chain root -> node |

## v1.3 -- tag input

| Method | Signature | Description |
|---|---|---|
| `add_tag` | `add_tag(tagInputId, value): void` | Append a tag |
| `remove_tag` | `remove_tag(tagInputId, value): void` | Remove a tag |
| `list_tags` | `list_tags(tagInputId): string[]` | Current tag set |

## v1.3 -- drawer / bottom-sheet

| Method | Signature | Description |
|---|---|---|
| `open_drawer` | `open_drawer(drawerId, opts?): void` | Slide in |
| `close_drawer` | `close_drawer(drawerId): void` | Slide out |
| `peek_drawer` | `peek_drawer(drawerId, height_px): void` | Half-open at height |

## v1.3 -- calendar

| Method | Signature | Description |
|---|---|---|
| `calendar_view` | `calendar_view(calId, mode): void` | Set day/week/month/year |
| `calendar_go_to` | `calendar_go_to(calId, dateISO): void` | Navigate to date |
| `calendar_select_event` | `calendar_select_event(calId, eventId): void` | Open event detail |
| `calendar_list_events` | `calendar_list_events(calId, opts?): Event[]` | Events in range |

## v1.3 -- chart

| Method | Signature | Description |
|---|---|---|
| `chart_data` | `chart_data(chartId): ChartData` | Series + categories + values |
| `chart_toggle_series` | `chart_toggle_series(chartId, seriesId): void` | Show/hide series |
| `chart_filter` | `chart_filter(chartId, filterDef): void` | Apply a chart filter |

## v1.3 -- map

| Method | Signature | Description |
|---|---|---|
| `map_focus` | `map_focus(mapId, lat, lng, zoom?): void` | Center the map |
| `map_select_marker` | `map_select_marker(mapId, markerId): void` | Select marker, open popup |
| `map_toggle_layer` | `map_toggle_layer(mapId, layerId): void` | Show/hide layer |
| `list_markers` | `list_markers(mapId): Marker[]` | All visible markers |

## v1.3 -- richtext

| Method | Signature | Description |
|---|---|---|
| `richtext_format` | `richtext_format(editorId, command, value?): void` | bold/italic/heading/list/etc |
| `richtext_insert_link` | `richtext_insert_link(editorId, url, label?): void` | Insert link |
| `richtext_insert_mention` | `richtext_insert_mention(editorId, mentionId, label): void` | @mention |

---

## v1.4 -- breadcrumb

| Method | Signature | Description |
|---|---|---|
| `list_breadcrumbs` | `list_breadcrumbs(): Breadcrumb[]` | All crumbs on page with item array |
| `navigate_breadcrumb` | `navigate_breadcrumb(itemId): Promise<{ok}>` | Click a specific crumb (jumps up the trail) |

## v1.4 -- carousel

| Method | Signature | Description |
|---|---|---|
| `list_carousels` | `list_carousels(): Carousel[]` | All carousels with slide counts |
| `carousel_state` | `carousel_state(carouselId): CarouselState` | Current slide + total + autoplay flag |
| `carousel_advance` | `carousel_advance(carouselId, dir): void` | `1` next, `-1` prev |
| `carousel_to` | `carousel_to(carouselId, slideIdx): void` | Jump to a specific slide |
| `carousel_autoplay` | `carousel_autoplay(carouselId, on): void` | Toggle autoplay |

## v1.4 -- timeline

| Method | Signature | Description |
|---|---|---|
| `list_timelines` | `list_timelines(): Timeline[]` | All timelines with current span |
| `timeline_state` | `timeline_state(timelineId): TimelineState` | Visible range + entry count |
| `timeline_load_older` | `timeline_load_older(timelineId): Promise<void>` | Fetch + prepend older entries |
| `timeline_load_newer` | `timeline_load_newer(timelineId): Promise<void>` | Fetch + append newer entries |

## v1.4 -- reorder

| Method | Signature | Description |
|---|---|---|
| `reorder` | `reorder(listId, fromIdx, toIdx): Promise<{ok}>` | Move item; emits `nac:reorder:applied` |

---

## v1.4.1 -- voice / agent ergonomics (added 2026-05-06)

| Method | Signature | Description | Spec |
|---|---|---|---|
| `click_by_verb` | `click_by_verb(plugin, verb, opts?): Promise<NacResult>` | Trigger action by verb (e.g. "apply") instead of `nac_id` | 3.4-C, 9 |
| `tab_by_label` | `tab_by_label(plugin, label, opts?): Promise<NacResult>` | Switch tab by label (e.g. "failed") instead of `nac_id` | 3.4-C, 9 |

Both helpers accept `null` for `plugin` to use the active plugin (per section P5.1). They search the manifest first (matching `actions[].verb` or `tabs[].label` / `label_i18n`), fall back to a DOM scan, then delegate to `click()` / `tab()`. The underlying contracts (awaitable-write, timeout semantics, error throws) are unchanged.

---

## Errors

`NAC.errors.NacError(code, message)` constructs typed errors. Standard codes:

| Code | When |
|---|---|
| `not_found` | `nac_id` does not exist in DOM, or plugin not mounted, or no action matches verb |
| `disabled` | Element exists but is `disabled` or `aria-disabled="true"` |
| `invalid` | Argument validation failed (bad mode, missing required arg) |
| `timeout` | Awaitable write did not see `nac:action:succeeded` / `failed` within `opts.timeout` (default 5000 ms) |
| `SystemMapNotProvided` | `system_map()` called but no provider was registered |

Catch with:

```js
try {
  await NAC.click('apply_all', { timeout: 8000 });
} catch (e) {
  if (e.code === 'timeout') {
    // action is hung; runner aborts the test step
  } else if (e.code === 'not_found') {
    // manifest drift; runner reports validate() finding
  }
  throw e;
}
```

---

## Configuration

`NAC.config` is a small mutable object:

| Key | Default | Effect |
|---|---|---|
| `default_timeout_ms` | `5000` | Default `wait_for` and write-call timeout |
| (extensible) | -- | Plugins MAY add keys; reserved keys live under `__nac_*` |

---

## Lifecycle events

The seven events every NAC-3 plugin MUST emit:

| Event | Fires when | Detail shape |
|---|---|---|
| `nac:plugin:opening` | Plugin begins to mount | `{ plugin, plugin_instance_id, timestamp }` |
| `nac:plugin:opened` | Plugin reached `state="ready"` | `{ plugin, plugin_instance_id, timestamp, manifest }` |
| `nac:plugin:closing` | Plugin begins to unmount | `{ plugin, plugin_instance_id, timestamp }` |
| `nac:plugin:closed` | Plugin removed from DOM | `{ plugin, plugin_instance_id, timestamp }` |
| `nac:action:dispatching` | A `click()` started | `{ plugin, nac_id, verb, timestamp }` |
| `nac:action:succeeded` | An action completed | `{ plugin, nac_id, verb, result, timestamp }` |
| `nac:action:failed` | An action failed | `{ plugin, nac_id, verb, error, timestamp }` |

Plus state events `nac:field:changed`, `nac:state:changed`, `nac:tab:changed`, `nac:mode:requested`, plus all v1.3/v1.4 widget-specific events. Every event MUST include `plugin` (and `plugin_instance_id` if multi-mount; see spec section 7.4).

All `nac:*` events fire on `document` with `bubbles: true` and (v1.4.1+) `composed: true`. Per-plugin buses are optional via `data-nac-plugin-bus="enabled"` on the plugin root.

---

## Where to start

If you are an AI coding agent implementing NAC in another project, in this order:

1. Read `AI_INSTRUCTIONS.md` for the decision rules.
2. Vendor `js/nac.js` into your project; load it once.
3. For each interactive element your codebase renders, add the five `data-nac-*` attributes per `AI_INSTRUCTIONS.md` templates.
4. Register one `manifest_nac` per plugin via `NAC.register(slug, manifest)` at boot.
5. Emit the seven lifecycle events at the right points.
6. Run `NAC.validate(slug)` in CI; treat any `error`-severity finding as a blocker.

The whole loop (step 3 onward) is mechanical. An agent with this repo in context completes a typical screen in minutes.

---

End of API_REFERENCE.md.
