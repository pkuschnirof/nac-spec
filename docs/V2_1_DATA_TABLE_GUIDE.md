# NAC v2.1 -- Data-table primitive: adopter guide

> Spec sec 18. Companion to `RFC_v2.0.0.md` (which sets the
> philosophy) and the runtime impl in `js/nac-v2-extensions.js`.
> Read this if you are about to add a data-table to a NAC-3
> conformant page. ASCII-only.

---

## TL;DR

```js
const tableId = NAC.registerDataTable({
  table_id: 'invoice.lines',
  scope_owner: 'modal.invoice_edit',
  subkind: 'collection',
  row_id_field: 'line_id',
  columns: [...],
  aggregates: { sum: ['line_total'] },
  initial_rows: [...]
});

NAC.registerDataTableComputed(tableId, 'line_total',
  row => row.qty * row.unit_price);

// User edits in the UI. NAC keeps state in sync.
// On modal Save:
const result = NAC.dt_commit(tableId);
if (result.ok) {
  // POST result.final_state.rows to your backend
  await fetch('/api/invoices/123/lines', {
    method: 'PUT',
    body: JSON.stringify(result.final_state.rows)
  });
}
// On modal Cancel:
NAC.dt_discard(tableId);
```

That is the entire integration. The rest of this document
explains the contract behind it.

---

## 1. When to use data-table (and when not to)

**Use data-table when:**

- The collection is BOUNDED (typically <500 rows; the runtime
  has no virtualization).
- The collection is EDITED TRANSACTIONALLY (commit on parent
  Save, discard on Cancel).
- The collection lives INSIDE a modal, panel, drawer,
  accordion section, wizard step, or otherwise scope-bound
  region.

**Do NOT use data-table for:**

- Persistent enterprise grids with 1k+ rows or virtualization.
  These are coming as `data-grid` in a future v2.x. Track the
  RFC for the differences.
- Read-only static tables that never change. A regular
  `data-nac-role="table"` on the `<table>` is fine.
- Pivot reports / aggregation-heavy analytics views. Those need
  their own primitive.

---

## 2. The three subkinds

### `collection` (most common, ~95% of cases)

Rows have **business-key identity** in `row_id_field`. Columns
are attributes. Operations: `dt_add_row`, `dt_remove_row`,
`dt_edit_cell`, `dt_select`. Examples: invoice lines, order
items, attendees, audit entries.

### `matrix` (Salesforce-style permission matrix)

Rows AND columns are **slugs** (not arbitrary keys). Cells are
the intersection. Operations: `dt_set_cell`, `dt_get_cell`.
Examples: role x permission, day x time-slot booking,
feature x plan-tier.

### `readonly` (degenerate collection)

Same shape as collection but no add/remove/edit. Used for audit
trails, pre-flight previews ("you are about to delete these 23
rows"), summaries.

---

## 3. Manifest reference

```js
{
  table_id:     string,           // canonical NAC slug
  scope_owner:  string,           // slug of parent modal/panel
  subkind:      'collection' | 'matrix' | 'readonly',
  transactional: boolean,         // default true
  row_id_field: string,           // collection only; column key
  columns: [
    {
      key:        string,         // unique within the table
      label_i18n: { es, en, pt, fr, it, de, ja, zh, hi, ar },
      type:       'text' | 'number' | 'currency' | 'date'
                | 'boolean' | 'select' | 'computed',
      editable:   boolean,
      required?:  boolean,
      computed?:  boolean,
      computed_from?: string[],
      min?:       number,
      max?:       number,
      options?:   [{ value, label_i18n }]   // for type='select'
    }
  ],
  // matrix-specific:
  row_axis:    { label_i18n, values: [{ slug, label_i18n }] },
  column_axis: { label_i18n, values: [{ slug, label_i18n }] },
  cell_type:   'boolean' | 'number' | 'text',

  supports:        ['add_row', 'remove_row', 'edit_cell', 'reorder', 'export'],
  selection_mode:  'none' | 'single' | 'multiple',

  aggregates: {
    sum:   string[],     // column keys to aggregate
    avg:   string[],
    count: string[],     // '*' counts rows
    min:   string[],
    max:   string[]
  },

  initial_rows:  [...],   // collection only
  initial_cells: [{ row, col, value }],  // matrix only

  validators: [
    { kind: 'row',
      code: 'qty_positive',          // your code; auditable
      column: 'qty',
      op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in' | 'matches',
      value: ...,
      message_i18n?: { es, en, ... }
    },
    { kind: 'table',
      code: 'no_dup_product',
      unique_columns: ['product'],
      message_i18n?: { ... }
    },
    { kind: 'table',
      code: 'min_one_line',
      min_rows: 1,
      message_i18n?: { ... }
    }
  ]
}
```

---

## 4. The lifecycle

```
host opens modal
  |
  v
NAC.registerDataTable(spec)
  |
  +---> nac:dt:registered fires
  |
  v
user / agent / bot operates the UI
  |
  +---> nac:dt:row_added / cell_edited / row_removed fire
  +---> nac:dt:aggregate_changed fires when sums change
  +---> nac:dt:validation_failed fires if a cell rejects type
  |
  v
host wires modal Save -> NAC.dt_commit(table_id)
  +-> dt_validate runs first
  |   +-> if invalid: nac:dt:validation_failed, commit aborts
  +-> if valid: nac:dt:committed fires with final_state + audit_diff
  +-> host writes final_state to backend (HTTP, IndexedDB, ...)

OR

host wires modal Cancel -> NAC.dt_discard(table_id)
  +-> rows revert to initial_state
  +-> nac:dt:discarded fires

host closes modal
  |
  v
NAC.unregisterDataTable(table_id)   // cleanup
```

The runtime owns the in-memory state. The host owns persistence.
NAC does not touch the network.

---

## 5. Computed columns

```js
NAC.registerDataTable({
  table_id: 'invoice.lines',
  columns: [
    /* ... */
    { key: 'qty', type: 'number', editable: true },
    { key: 'unit_price', type: 'currency', editable: false },
    { key: 'line_total', type: 'currency', computed: true,
      computed_from: ['qty', 'unit_price'] }
  ],
  /* ... */
});

NAC.registerDataTableComputed('invoice.lines', 'line_total',
  function (row /* current row */, allRows /* every row */) {
    return (row.qty || 0) * (row.unit_price || 0);
  });
```

Recompute fires automatically:
- After `dt_add_row` for the new row.
- After `dt_edit_cell` for the affected row.
- Once at registration time for every existing row.

If you forget to register the fn, computed columns hold the
value supplied in `initial_rows` and never update -- a warn-level
finding from `validate_global_v2`.

The fn signature is `(row, allRows) => value`. Use `allRows`
for cross-row computations like running balance, tax allocation,
etc.

---

## 6. Voice / agent / bot operations

The runtime exposes the same API to every operator class. The
chatbot intermediary (sec 16) reads `describe_v2().data_tables`
on every turn and dispatches `dt_*` directly:

```
User: "agrega una linea con producto Monitor cantidad 1 a 250"
LLM:  emits {kind:'click_by_verb', plugin:'invoice.lines', verb:'add_row',
              params:{product:'Monitor', qty:1, unit_price:250}}
Runtime: NAC.dt_add_row('invoice.lines',
                        {product:'Monitor', qty:1, unit_price:250})
                        // by='agent'

User: "borra la linea del teclado"
LLM:  resolves "teclado" against current_state.rows[*].product
       -> finds line_id 'L2'
       -> emits {kind:'click_by_verb', plugin:'invoice.lines', verb:'remove_row',
                  params:{row_id:'L2'}}
Runtime: NAC.dt_remove_row('invoice.lines', 'L2')   // by='agent'

User: "leeme el total"
LLM:  emits {kind:'say',
              text: 'El total es ' +
                NAC.dt_read_aggregate('invoice.lines', 'sum', 'line_total')}

User: "guardar"
LLM:  emits a click on modal.invoice_edit.save which the host
       wires to NAC.dt_commit('invoice.lines') + backend POST.
```

The 6 voice cases listed in spec sec 18.12 are the conformance
test for this integration.

---

## 7. Test-runner integration

`@nac-spec/test-runner` resolves intents to `dt_*` actions
automatically when the snapshot exposes a registered table:

```js
const { runIntent } = require('@nac-spec/test-runner');

await runIntent(page, {
  intent: 'agrega una linea con monitor cantidad 1 a 250 y guarda la factura',
  expected_terminal_slug: 'modal.invoice_edit.save'
});
// passed === true if the runner:
//   1. Opens the modal (sitemap nav if not already there).
//   2. Resolves intent to dt_add_row + dt_commit.
//   3. Asserts terminal slug reached.
```

---

## 8. Audit + provenance

Every event carries `by: 'user' | 'agent'`. The runtime
distinguishes by checking the gesture buffer (rc3 T4-F1):

- A direct DOM click that fires the dt_* call inside its 16ms
  attestation window is `'user'`.
- Anything else (chat dispatch, RPA, test runner) is `'agent'`.

Audit pipelines downstream consume this for compliance reports
("who edited what and when").

`dt_commit()` returns `audit_diff: { initial, final }` -- the
host should append this (along with user_id, timestamp,
session_id) to its audit log.

---

## 9. i18n discipline

Every `label_i18n` (column, axis value, aggregate, validator
message) MUST carry **all 10 supported locales**: es, en, pt,
fr, it, de, ja, zh, hi, ar. NAC v2.1 emits a warn-level
finding `dt_i18n_missing_locale` from `validate_global_v2()`
when a locale is missing.

Adopters with a catalog-lint CI gate (recommended) should
upgrade to error-level. The chatbot resolves `"borra la linea
del teclado"` (es) and `"delete the keyboard line"` (en) and
`"键盘那行删除"` (zh) to the same row -- only if every locale
has a translation.

---

## 10. Backwards compatibility

v2.1 is a strict superset of v2.0. Adopters who do not call
`registerDataTable()` see no behaviour change. The new APIs
appear on `NAC.*` but are no-ops in their absence (calling
`dt_state()` for an unregistered `table_id` returns `null`
without throwing).

This means you can ship v2.1 runtime to a page, register your
data-tables incrementally, and existing v2.0 plugins keep
working unchanged.

---

## 11. Common gotchas

### 11.1 Forgetting `registerDataTableComputed`

Symptom: `line_total` shows the value passed in `initial_rows`
and never updates after edits.

Fix: register the fn at boot, NOT lazily.

### 11.2 Required-but-missing on `add_row`

Symptom: `dt_add_row` returns
`{ok:false, error:'required_missing', column:'product'}`.

Fix: pass every required (non-computed) column in
`valuesByColumn`.

### 11.3 Edit on a computed column

Symptom: `dt_edit_cell` returns
`{ok:false, error:'computed_column'}`.

Fix: edit the input columns (`computed_from`); the computed
column updates automatically.

### 11.4 Discard before commit means lost work

Symptom: user edits the table, presses Cancel, expects to come
back later and find their changes.

By design: `dt_discard` reverts. If you want a "save draft"
option, expose a separate button that calls `dt_commit` with a
draft flag in your backend.

### 11.5 `dt_select('none')` was treated as a row_id by older builds

If you are on rc1 (post-2026-05-09 fix) you are fine. Pre-fix
builds treated `'none'` as the row_id `'none'` and selected it
if it existed (which it usually didn't, so `selected_count`
became 1 of nothing). Use the current rc1.

---

## 12. What is NOT in v2.1 (yet)

These are deliberate deferrals to keep the v2.1 surface small
and shippable:

- **Inline edit UX primitives.** v2.1 specifies the data
  contract; the host is responsible for the actual
  click-to-edit / tab-to-next behaviour.
- **Sort and filter on the table.** Either out of scope (the
  parent modal is small enough that all rows fit) or
  delegated to the future `data-grid` primitive.
- **Pagination.** Same reasoning. Modal tables are bounded.
- **Drag-to-reorder.** `supports:['reorder']` is reserved in
  the manifest but no `dt_reorder` API yet. Coming in 2.1.x.
- **Cross-table relations.** A line referencing another table's
  row is the host's job to resolve at commit time.

If you hit a wall because of a deferred feature, file an issue
referencing `docs/V2_1_DATA_TABLE_GUIDE.md sec 12` so we can
prioritise.

---

## 13. References

- Spec sec 18 in `spec/NAC-v2.0.md`.
- Runtime in `js/nac-v2-extensions.js` (search `_dataTables`).
- Tests in `tests/nac-v2-extensions.spec.js` (22 specs under
  `v2.1 dt:`).
- Demo in `yujin.app/nac-spec/example-v21-data-table.php`
  (under the rpaforce-crm repo).

---

*Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, 2026-05-09.*
