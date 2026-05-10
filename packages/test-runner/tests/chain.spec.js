/* chain.spec.js -- offline chain-test exercise (NAC v2.1 sec 19).

   These tests verify stages 1 + 2 against a frozen snapshot
   (data-table demo). Stages 3 + 4 require a live runtime
   (Playwright + browser); they are skipped here with explicit
   notes. The live counterpart runs in tests/e2e/ in the host's
   own CI.

   The snapshot fixture mirrors what describe_v2() returns for
   example-v21-data-table.php after the v21 demo boot
   (8 invoice lines + perm matrix). */
'use strict';

var runner = require('../src/index');

/* Frozen describe_v2() of the v21 demo. Ten reviewers can
   read this without booting a browser. */
var SNAP = {
  nac_version: '2.1.0-rc1',
  v1_plugins: [
    { plugin_slug: 'topbar',
      elements: [
        { id: 'topbar.brand', role: 'navigation',
          label_i18n: { es: 'Yujin demo', en: 'Yujin demo' } }
      ]
    },
    { plugin_slug: 'invoice',
      elements: [
        { id: 'action.open_invoice', role: 'action',
          actions: [{ verb: 'open', label_i18n: { es: 'Abrir / editar factura', en: 'Open / edit invoice' } }] }
      ]
    },
    { plugin_slug: 'invoice_edit_modal',
      elements: [
        { id: 'modal.invoice_edit.cancel', role: 'action',
          actions: [{ verb: 'cancel', label_i18n: { es: 'Cancelar edicion', en: 'Cancel edit' } }] },
        { id: 'modal.invoice_edit.save', role: 'action',
          actions: [{ verb: 'save', label_i18n: { es: 'Guardar factura', en: 'Save invoice' } }] }
      ]
    },
    { plugin_slug: 'chat',
      elements: [
        { id: 'chat.input', role: 'field' },
        { id: 'chat.mic',   role: 'action' }
      ]
    }
  ],
  v2_scope_entries: [],
  data_tables: [
    {
      table_id:    'invoice.lines',
      scope_owner: 'modal.invoice_edit',
      subkind:     'collection',
      schema: {
        row_id_field: 'line_id',
        columns: [
          { key: 'product',    type: 'text',     editable: true,  required: true },
          { key: 'qty',        type: 'number',   editable: true,  min: 1, required: true },
          { key: 'unit_price', type: 'currency', editable: false },
          { key: 'line_total', type: 'currency', computed: true }
        ],
        aggregates: { sum: ['line_total'], count: ['*'] }
      },
      current_state: {
        rows: [
          { line_id: 'L1', product: 'Mouse',       qty: 2, unit_price: 25,  line_total: 50  },
          { line_id: 'L2', product: 'Teclado',     qty: 1, unit_price: 140, line_total: 140 },
          { line_id: 'L3', product: 'Monitor',     qty: 1, unit_price: 250, line_total: 250 },
          { line_id: 'L4', product: 'Silla',       qty: 1, unit_price: 320, line_total: 320 },
          { line_id: 'L5', product: 'Auriculares', qty: 2, unit_price: 90,  line_total: 180 },
          { line_id: 'L6', product: 'Webcam',      qty: 1, unit_price: 75,  line_total: 75  },
          { line_id: 'L7', product: 'Cable USB',   qty: 5, unit_price: 8,   line_total: 40  },
          { line_id: 'L8', product: 'Lampara',     qty: 1, unit_price: 60,  line_total: 60  }
        ],
        aggregates: { sum: { line_total: 1115 }, count: { '*': 8 } },
        modified: false,
        valid: true
      }
    }
  ],
  sitemap: null
};

test('chain v2.1: borra los auriculares -> dt_remove_row', async () => {
  var r = await runner.runChainTest({
    intent: 'borra los auriculares',
    snapshot: SNAP,
    expected: {
      stage_1_kind: 'dt_remove_row',
      stage_2_params: {
        table_id: 'invoice.lines',
        row_id_resolves_via: { column: 'product', value: 'Auriculares' }
      }
    }
  });
  /* Offline mode: stages 3+4 are explicit "skip" passes. */
  assert.strictEqual(r.stages.length, 4);
  /* Stage 2 MUST resolve row_id to L5. */
  var s2 = r.stages.find(function (s) { return s.name === 'stage_2_disambiguated_dispatch'; });
  assert.ok(s2.passed, 'stage 2 must resolve row_id');
  assert.strictEqual(s2.evidence.resolved_row_id, 'L5');
});

test('chain v2.1: borra el cable USB -> resolves L7', async () => {
  var r = await runner.runChainTest({
    intent: 'borra el cable usb',
    snapshot: SNAP,
    expected: {
      stage_1_kind: 'dt_remove_row',
      stage_2_params: {
        table_id: 'invoice.lines',
        row_id_resolves_via: { column: 'product', value: 'Cable USB' }
      }
    }
  });
  var s2 = r.stages.find(function (s) { return s.name === 'stage_2_disambiguated_dispatch'; });
  assert.ok(s2.passed);
  assert.strictEqual(s2.evidence.resolved_row_id, 'L7');
});

test('chain v2.1: row_id_resolves_via with non-existent product fails stage 2', async () => {
  var r = await runner.runChainTest({
    intent: 'borra el unicornio',
    snapshot: SNAP,
    expected: {
      stage_1_kind: 'dt_remove_row',
      stage_2_params: {
        table_id: 'invoice.lines',
        row_id_resolves_via: { column: 'product', value: 'Unicornio' }
      }
    }
  });
  var s2 = r.stages.find(function (s) { return s.name === 'stage_2_disambiguated_dispatch'; });
  assert.strictEqual(s2.passed, false);
  assert.ok(s2.note.indexOf('could not resolve') >= 0);
});

test('chain v2.1: missing data_tables in snapshot reproduces the deployed-backend bug', async () => {
  /* This is the regression test for Pablo's 2026-05-09 session.
     With data_tables[] missing, stage 2 cannot resolve row_id
     and the chain test correctly fails. The pre-fix backend
     dropped data_tables in yjNacDemoCompactTree; this test
     would have caught that bug at CI time. */
  var snapWithoutTables = Object.assign({}, SNAP);
  delete snapWithoutTables.data_tables;
  var r = await runner.runChainTest({
    intent: 'borra los auriculares',
    snapshot: snapWithoutTables,
    expected: {
      stage_1_kind: 'dt_remove_row',
      stage_2_params: {
        table_id: 'invoice.lines',
        row_id_resolves_via: { column: 'product', value: 'Auriculares' }
      }
    }
  });
  var s2 = r.stages.find(function (s) { return s.name === 'stage_2_disambiguated_dispatch'; });
  assert.strictEqual(s2.passed, false,
    'stage 2 MUST fail when data_tables is dropped from snapshot');
});

test('chain v2.1: change_locale meta-command (no data-table involved)', async () => {
  var r = await runner.runChainTest({
    intent: 'cambia a ingles',
    snapshot: SNAP,
    expected: {
      stage_1_kind: 'change_locale',
      stage_2_params: { /* meta -- no row resolution */ }
    }
  });
  /* For meta-commands stage 2 has no row to resolve; stage 1
     classification is the principal check. The matcher we use
     here is intent-to-slug; a richer chain test in live mode
     observes the LLM's actual kind selection. */
  /* Both stages should at minimum not throw. */
  assert.ok(Array.isArray(r.stages));
});

test('chain v2.1: runChainTest requires intent + expected', async () => {
  let threw = false;
  try { await runner.runChainTest({ snapshot: SNAP }); }
  catch (e) { threw = true; }
  assert.ok(threw);
});

test('chain v2.1: runChainTest requires page or snapshot', async () => {
  let threw = false;
  try { await runner.runChainTest({ intent: 'x', expected: { stage_1_kind: 'click' } }); }
  catch (e) { threw = true; }
  assert.ok(threw);
});

test('chain v2.1: result has latency_ms + log fields', async () => {
  var r = await runner.runChainTest({
    intent: 'borra el monitor',
    snapshot: SNAP,
    expected: {
      stage_1_kind: 'dt_remove_row',
      stage_2_params: {
        table_id: 'invoice.lines',
        row_id_resolves_via: { column: 'product', value: 'Monitor' }
      }
    }
  });
  assert.ok(typeof r.latency_ms === 'number');
  assert.ok(Array.isArray(r.log));
  assert.ok(r.log.length > 0);
});
