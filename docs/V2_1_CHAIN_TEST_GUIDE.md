# NAC v2.1 -- End-to-end chain test guide

> Spec sec 19. Companion to `V2_1_DATA_TABLE_GUIDE.md`. Read this
> if you are claiming NAC-3 conformance. Chain testing is
> MANDATORY at NAC-3; the spec test suite + unit tests do NOT
> cover stage-boundary regressions, only chain tests do. ASCII-
> only.

---

## TL;DR

```js
const { runChainTest } = require('@nac-spec/test-runner');

test('voice intent: borrar auriculares -> row removed', async () => {
  const result = await runChainTest({
    intent: 'borra los auriculares',
    page: playwrightPage,
    expected: {
      stage_1_kind: 'dt_remove_row',
      stage_2_params: {
        table_id: 'invoice.lines',
        row_id_resolves_via: { column: 'product', value: 'Auriculares' }
      },
      stage_3_event: {
        type: 'nac:dt:row_removed',
        detail_match: { table_id: 'invoice.lines' }
      },
      stage_4_state_assertion: (after) => {
        const dt = after.data_tables.find(t => t.table_id === 'invoice.lines');
        const stillThere = dt.current_state.rows
          .some(r => r.product === 'Auriculares');
        return { passed: !stillThere,
                 note: stillThere ? 'row not removed' : 'row removed' };
      }
    }
  });
  expect(result.passed).toBe(true);
});
```

That is one chain test. Repeat for every intent class your
host supports.

---

## 1. Why chain tests are mandatory

The user expresses an intent in natural language. Four
distinct components interpret + dispatch + observe it:

1. The intermediary LLM (sec 16).
2. The runtime dispatcher (sec 15.* + 18.*).
3. The runtime event bus (sec 6.2 + 18.6).
4. The host UI subscriber (re-renders, validates, persists).

Each component has its own contract. ZERO unit-test coverage
catches a regression at the BOUNDARY between two of them.
The reference implementation already ate this bug class:

> Pablo's session, 2026-05-09: chatbot replied with
> hallucinated invoice line names (Monitor 27", Teclado
> mecanico, Mouse inalambrico, Webcam HD with quantities
> 50/40/20/80) when the demo had EIGHT real lines. Cause: the
> backend's `yjNacDemoCompactTree` function silently dropped
> the `data_tables[]` field from the snapshot before the
> prompt template ever saw it. Spec correct, frontend correct,
> runtime correct, backend wrong -- and 59/59 unit tests still
> green.

The fix-class for that whole error mode is end-to-end chain
testing. v2.1 sec 19 mandates it at NAC-3.

---

## 2. The four stages

| Stage | What it verifies |
|---|---|
| **1. Intent detection** | The LLM, given the live `describe_v2()` snapshot, classifies the user's natural-language phrase into one of the documented action kinds (sec 16 vocabulary). |
| **2. Disambiguated dispatch** | The kind + resolved parameters invoke the runtime against concrete slugs (e.g. `NAC.dt_remove_row('invoice.lines', 'L5')`). The test asserts the parameter resolution. |
| **3. Runtime event emission** | The dispatch causes the canonical event documented in sec 6.2 / 18.6 to fire, with the right detail payload shape. |
| **4. Side-effect coherence** | The post-dispatch state (re-snapshot via describe_v2) reflects the intent. |

Skipping any stage produces false confidence. See spec sec
19.2 for the full breakdown of which bug-class each stage
catches.

---

## 3. Two modes

### 3.1 Live mode (Playwright + browser + LLM)

```js
const result = await runChainTest({
  intent:   'agrega una linea con monitor cantidad 1 a 250',
  page:     playwrightPage,
  expected: { ... }
});
```

The full pipeline runs against a real browser. The agent
intermediary makes its actual LLM call, the dispatch hits the
runtime, the event bus fires, the host UI subscribes. Every
stage is verified.

Use this in the host's CI before tagging a release.

### 3.2 Offline mode (snapshot only)

```js
const result = await runChainTest({
  intent:   'agrega una linea con monitor cantidad 1 a 250',
  snapshot: frozenDescribeV2Json,
  expected: { ... }
});
```

The matcher + planner run pure-JS against a frozen snapshot.
Stages 3 + 4 are explicit "skip" passes with notes (no live
runtime). Cheaper to iterate; runs in pure node.

Use this in the host's unit-test suite alongside per-component
tests for rapid iteration.

**Both modes verify the same four stages**; the live mode
verifies all four against a real session, the offline mode
verifies stages 1 + 2 with deterministic input.

---

## 4. Required chain test coverage at NAC-3

**A NAC-3 deployment is non-conformant if it lacks chain
tests covering at least:**

| Operator domain | Required tests |
|---|---|
| Data-table collection (sec 18) | 1 add + 1 edit + 1 remove + 1 commit + 1 read_aggregate |
| Data-table matrix (sec 18) | 1 set_cell |
| Sitemap navigation (sec 17) | 1 cross-page intent |
| Confirm-dialog (sec 6.2.32) | 1 destructive intent + voice yes/no answer |
| Locale switch (rule 13) | 1 change_locale meta-command |
| Plain click (sec 16 baseline) | 1 click + 1 click_by_verb |

A typical app with five data-tables, three sitemap paths, and
two destructive actions ships ~15 chain tests. The adopter's
CI MUST run them on every push; a red chain test blocks merge.

The reference implementation tests are in
`packages/test-runner/tests/chain.spec.js` (offline) plus
the host's own e2e suite (live).

---

## 5. The `expected` shape

```js
{
  stage_1_kind: '<one of the sec-16 vocabulary>',
    /* e.g. 'click', 'click_by_verb', 'fill', 'select', 'tab',
       'drag_drop', 'go_to_section', 'say', 'change_locale',
       'dt_add_row', 'dt_remove_row', 'dt_edit_cell',
       'dt_set_cell', 'dt_select', 'dt_commit', 'dt_discard',
       'dt_read_aggregate'. */

  stage_2_params: {
    /* For data-table intents: */
    table_id: '<table_id from data_tables[]>',
    /* For row-targeting intents (remove, edit), resolve the
       row_id from the snapshot via a column predicate. The
       test uses snapshot.data_tables[].current_state.rows
       (which the backend MUST forward for stage 2 to pass).
       This is exactly the contract that the deployed-backend
       bug violated. */
    row_id_resolves_via: { column: 'product', value: 'Auriculares' }
    /* For matrix: */
    // row: 'admin', col: 'invoices.read', value: true
    /* For non-row intents: this object is the parameter
       envelope. */
  },

  stage_3_event: {
    /* Required only in live mode (skipped offline). */
    type:         'nac:dt:row_removed',
    detail_match: { table_id: 'invoice.lines' }
    /* The test catches every event of `type` during the
       dispatch window and asserts at least one matches every
       key in `detail_match`. Strict equality. */
  },

  stage_4_state_assertion: function (afterSnapshot) {
    /* Required only in live mode (skipped offline). Receives
       the post-dispatch describe_v2() snapshot. Returns
       { passed: bool, note?: string }. */
    return { passed: true, note: '...' };
  }
}
```

---

## 6. Runtime contract for stage 2

For row-targeting data-table intents to work, the chain test
needs `snapshot.data_tables[].current_state.rows[]` to be
present. This is the contract the spec sec 18.11 defines.

**If the chain test fails at stage 2 with "could not resolve
row_id"**, your symptom is one of:

| Symptom location | Diagnosis |
|---|---|
| Frontend not registering the table | `NAC.registerDataTable()` was never called for the slug. |
| Frontend not forwarding describe_v2 | The agent dispatch path uses `NAC.describe()` (v1) only and drops the v2 layer. The shipped `NacChat.snapshotTree()` forwards describe_v2 too; if you wrote a custom client, copy that pattern. |
| Backend dropping the data_tables field | Your backend compactor (the equivalent of yjNacDemoCompactTree) is filtering snapshot keys. Ensure `data_tables[]`, `v2_scope_entries[]`, `sitemap`, `tenant_prefix`, `nac_version_v2` all reach the prompt. |
| LLM ignoring the field | Rule 14 of the system prompt (sec 16 contract) is missing or not authoritative enough. The reference yjNacDemoSystemPrompt rule 14 is the canonical text. |

The chain test was specifically designed to catch all four
symptoms with one assertion: "stage 2 resolved the row_id".
If it fails, walk the four candidate causes above.

---

## 7. The regression-test pattern

The reference implementation includes a regression test that
deliberately **strips data_tables from the snapshot** to
prove the chain test detects the deployed-backend bug:

```js
test('chain v2.1: missing data_tables in snapshot reproduces the deployed-backend bug', async () => {
  var snapWithoutTables = Object.assign({}, SNAP);
  delete snapWithoutTables.data_tables;
  var r = await runChainTest({
    intent: 'borra los auriculares',
    snapshot: snapWithoutTables,
    expected: { stage_1_kind: 'dt_remove_row',
                stage_2_params: { table_id: 'invoice.lines',
                                  row_id_resolves_via: { column: 'product', value: 'Auriculares' } } }
  });
  expect(r.stages[1].passed).toBe(false);
});
```

That's the unit test that would have caught Pablo's bug at CI
time on day one. Adopters SHOULD include their own equivalent
regression test for any intent-class they actively support.

---

## 8. Live-mode setup

```js
const { test, expect } = require('@playwright/test');
const { runChainTest } = require('@nac-spec/test-runner');

test.describe('NAC v2.1 chain coverage', () => {
  let page;
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('https://your-app.example.com');
    await page.waitForFunction(() => window.NAC && NAC.dt_state);
  });

  test('add line', async () => {
    const r = await runChainTest({
      intent: 'agrega una linea con monitor cantidad 1 a 250',
      page,
      expected: {
        stage_1_kind: 'dt_add_row',
        stage_2_params: { table_id: 'invoice.lines' },
        stage_3_event: { type: 'nac:dt:row_added',
                         detail_match: { table_id: 'invoice.lines' } },
        stage_4_state_assertion: (after) => {
          const dt = after.data_tables.find(t => t.table_id === 'invoice.lines');
          const added = dt.current_state.rows
            .some(r => r.product.toLowerCase() === 'monitor');
          return { passed: added, note: added ? 'monitor added' : 'monitor missing' };
        }
      }
    });
    expect(r.passed).toBe(true);
  });

  /* ... 14 more chain tests ... */
});
```

---

## 9. CI integration

GitHub Actions snippet:

```yaml
- name: NAC chain tests (offline)
  run: |
    npm install --save-dev @nac-spec/test-runner
    node node_modules/@nac-spec/test-runner/tests/run-all.js
- name: NAC chain tests (live)
  run: |
    npx playwright install chromium
    npx playwright test tests/e2e/nac-chain.spec.js
```

Hook the live-mode tests as a deploy gate, not just a PR gate
-- the chain test catches deployed-backend regressions that
PR-time CI cannot see.

---

## 10. Limits + future work

- v2.1 chain tests verify intent semantics; they do NOT yet
  verify visual rendering. Add visual-regression coverage on
  top.
- Stage 1 verification in offline mode uses the matcher's
  resolveIntent + planner output; the live-mode LLM may
  resolve differently due to prompt changes. The live test
  is authoritative; offline is a smoke test for prompt drift.
- Confirm-dialog chain testing requires the host to expose the
  modal prompt + buttons via `data-nac-id`; sec 6.2.32 mandates
  this.

---

## 11. References

- Spec sec 19 in `spec/NAC-v2.0.md`.
- Reference implementation in `packages/test-runner/src/lib/chain-test.js`.
- Tests in `packages/test-runner/tests/chain.spec.js`.
- Pablo's bug session: `yujin.app/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`
  (cross-repo) -- the practical motivation for sec 19.

---

*Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, 2026-05-09.*
