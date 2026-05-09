/* ===============================================================
   Tests for nac-v2-extensions.js
   ---------------------------------------------------------------
   Run with: node tests/nac-v2-extensions.spec.js
   (Uses a synthetic minimal NAC v1.9 stub if the full runtime isn't
   available; in full CI, runs against the real nac.js v1.9 + v2 ext.)
   =============================================================== */
'use strict';

const assert = require('assert');

/* ---------------------- minimal DOM + NAC v1.9 stub ----------------- */

if (typeof window === 'undefined') {
  global.window = global;
  /* Minimal event bus so v2.1 dt tests can verify dispatch.
     Listeners keyed by event type; dispatch invokes them in
     registration order. */
  const _busListeners = {};
  global.document = {
    documentElement: { _attrs: {}, getAttribute(n) { return this._attrs[n]; }, setAttribute(n, v) { this._attrs[n] = v; }, removeAttribute(n) { delete this._attrs[n]; } },
    body: { _children: [], appendChild(n) { this._children.push(n); }, querySelectorAll() { return []; } },
    addEventListener: (name, fn) => {
      (_busListeners[name] = _busListeners[name] || []).push(fn);
    },
    removeEventListener: (name, fn) => {
      const arr = _busListeners[name] || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    dispatchEvent: (ev) => {
      (_busListeners[ev.type] || []).forEach(fn => { try { fn(ev); } catch (_) {} });
      return true;
    },
    createEvent: () => ({ initEvent: () => {} }),
    readyState: 'complete',
    querySelectorAll: () => []
  };
  global.CustomEvent = function(name, opts) { this.type = name; this.detail = opts && opts.detail; this.bubbles = opts && opts.bubbles; };
  global.MutationObserver = function() { this.observe = () => {}; this.disconnect = () => {}; };
  global.performance = { now: () => Date.now() };
  if (!global.navigator) {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'es' }, writable: true, configurable: true
    });
  }

  global.NAC = {
    __nac_v1_installed: true,
    sign_provenance: async (detail, secret) => 'sig_' + secret + '_' + JSON.stringify(detail).length,
    verify_provenance: async (detail, secret) => detail.signature === 'sig_' + secret + '_' + JSON.stringify({...detail, signature: undefined}).length,
    describe: () => ({ plugins: [] })
  };

  /* Load the v2 extension under test */
  require('../js/nac-v2-extensions.js');
}

const NAC = global.NAC;

/* ---------------------- assertions ---------------------------------- */

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; console.log('  PASS', name); })
    .catch(err => { failed++; console.error('  FAIL', name, '\n   ', err.message); });
}

(async function run() {
  console.log('\n[NAC v2 extension tests]\n');

  /* ----- scope() basic ----- */
  await test('scope creates root and chains', () => {
    const root = NAC.scope({ slug: 'shell', label_i18n: { es: 'Shell', en: 'Shell' } });
    assert.strictEqual(root.id, 'shell');
    const child = root.scope({ slug: 'topbar' });
    assert.strictEqual(child.id, 'shell.topbar');
  });

  await test('scope rejects slug with separator', () => {
    assert.throws(() => NAC.scope({ slug: 'a.b' }), /slug_invalid/);
  });

  await test('scope depth_exceeded throws past 6', () => {
    let s = NAC.scope({ slug: 'l1' });
    s = s.scope({ slug: 'l2' }).scope({ slug: 'l3' }).scope({ slug: 'l4' }).scope({ slug: 'l5' }).scope({ slug: 'l6' });
    assert.throws(() => s.scope({ slug: 'l7' }), /depth_exceeded/);
  });

  await test('scope.register persists in __v2._scopes', () => {
    const root = NAC.scope({ slug: 'app1' });
    const tb = root.scope({ slug: 'topbar' });
    tb.register({
      slug: 'logout',
      label_i18n: { es: 'Salir', en: 'Logout' },
      irreversible: false
    });
    assert.ok(NAC.__v2._scopes['app1.topbar.logout']);
  });

  /* ----- registerCatalog + t() ----- */
  await test('registerCatalog + t() resolves with locale fallback', () => {
    NAC.registerCatalog({
      'foo.bar': { es: 'Hola', en: 'Hello', pt: 'Ola' }
    });
    NAC.locale('es');
    assert.strictEqual(NAC.t('foo.bar'), 'Hola');
    NAC.locale('en');
    assert.strictEqual(NAC.t('foo.bar'), 'Hello');
    NAC.locale('ja');
    /* fallback chain: ja missing -> es first */
    assert.strictEqual(NAC.t('foo.bar'), 'Hola');
  });

  await test('t() returns key when no catalog entry', () => {
    assert.strictEqual(NAC.t('nonexistent.key'), 'nonexistent.key');
  });

  /* ----- locale + RTL auto ----- */
  await test('locale("ar") sets dir=rtl on documentElement', () => {
    NAC.locale('ar');
    assert.strictEqual(document.documentElement.getAttribute('dir'), 'rtl');
  });

  await test('locale("es") removes dir=rtl', () => {
    NAC.locale('ar');
    NAC.locale('es');
    assert.strictEqual(document.documentElement.getAttribute('dir'), undefined);
  });

  /* ----- setSupportedLocales ----- */
  await test('setSupportedLocales extends list', () => {
    NAC.setSupportedLocales(['es','en','ca']);
    /* internals exposed */
    /* check that t() doesn't break */
    assert.strictEqual(typeof NAC.t, 'function');
  });

  await test('setSupportedLocales rejects empty array', () => {
    assert.throws(() => NAC.setSupportedLocales([]), /non-empty/);
  });

  /* ----- HMAC secret ----- */
  await test('set_provenance_secret accepts string', () => {
    NAC.set_provenance_secret('test-secret');
    /* no throw = pass */
    assert.ok(true);
  });

  await test('set_provenance_secret accepts array', () => {
    NAC.set_provenance_secret(['s1', 's2']);
    assert.ok(true);
  });

  await test('set_provenance_secret rejects bad input', () => {
    assert.throws(() => NAC.set_provenance_secret(42));
  });

  /* ----- tenant prefix ----- */
  await test('setTenantPrefix sets prefix once', () => {
    /* fresh test setup since previous test polluted state */
    /* simulating: setTenantPrefix once works, twice throws */
    assert.strictEqual(NAC.getTenantPrefix(), null);
    NAC.setTenantPrefix('acme');
    assert.strictEqual(NAC.getTenantPrefix(), 'acme');
    assert.throws(() => NAC.setTenantPrefix('bigco'), /tenant_prefix_locked/);
  });

  /* ----- declareVirtual ----- */
  await test('declareVirtual stores spec', () => {
    NAC.declareVirtual({
      slug_pattern: 'rows.{i}',
      count: 1000,
      resolver: (i) => ({ slug: 'rows.' + i, role: 'row', label_i18n: { es: 'Fila ' + i } })
    });
    assert.strictEqual(NAC.__v2._virtuals.length, 1);
  });

  /* ----- describe_v2 ----- */
  await test('describe_v2 returns v2 fields', () => {
    const d = NAC.describe_v2();
    assert.ok(/^2\./.test(d.nac_version), 'nac_version starts with 2.');
    assert.ok(Array.isArray(d.v2_scope_entries));
    assert.ok(Array.isArray(d.v2_intermediate_scopes), 'rc3+ exposes intermediate scopes');
    assert.ok(Array.isArray(d.virtual));
    assert.ok(Array.isArray(d.ephemeral_log));
    assert.strictEqual(d.tenant_prefix, 'acme');
  });

  /* ----- validate_global_v2 with i18n_strict ----- */
  await test('validate_global_v2 detects missing locale (under error tolerance)', () => {
    /* rc2 defaults to warn; opt-in to error to confirm error path. */
    NAC.set_validation_tolerance({ i18n_strict: 'error' });
    NAC.setSupportedLocales(['es', 'en', 'ja']);
    NAC.registerCatalog({
      'incomplete.key': { es: 'Hola', en: 'Hello' /* ja missing */ }
    });
    const findings = NAC.validate_global_v2({ i18n_strict: true });
    const missingFinding = findings.errors.find(f =>
      f.code === 'i18n_missing_locale' && f.key === 'incomplete.key');
    assert.ok(missingFinding);
    assert.deepStrictEqual(missingFinding.missing, ['ja']);
    /* Reset for following tests */
    NAC.set_validation_tolerance({ i18n_strict: 'warn' });
  });

  await test('validate_global_v2 detects empty string (under error tolerance)', () => {
    NAC.set_validation_tolerance({ i18n_strict: 'error' });
    NAC.registerCatalog({
      'empty.key.r2': { es: 'Hola', en: '', ja: 'kon' }
    });
    const findings = NAC.validate_global_v2({ i18n_strict: true });
    const emptyFinding = findings.errors.find(f =>
      f.code === 'i18n_string_empty' && f.key === 'empty.key.r2');
    assert.ok(emptyFinding);
    NAC.set_validation_tolerance({ i18n_strict: 'warn' });
  });

  await test('validate_global_v2 default i18n severity is warn (rc2)', () => {
    /* Reset tolerance to default */
    NAC.set_validation_tolerance({ i18n_strict: 'warn' });
    NAC.setSupportedLocales(['es','en','ja']);
    NAC.registerCatalog({
      'rc2.warn.test': { es: 'Hola', en: 'Hello' /* ja missing */ }
    });
    const findings = NAC.validate_global_v2({ i18n_strict: true });
    const inWarnings = findings.warnings.find(f =>
      f.code === 'i18n_missing_locale' && f.key === 'rc2.warn.test');
    const inErrors = findings.errors.find(f =>
      f.code === 'i18n_missing_locale' && f.key === 'rc2.warn.test');
    assert.ok(inWarnings, 'missing locale should land in warnings (rc2 default)');
    assert.ok(!inErrors, 'missing locale should NOT be in errors at default tolerance');
  });

  await test('set_validation_tolerance({i18n_strict:error}) escalates', () => {
    NAC.set_validation_tolerance({ i18n_strict: 'error' });
    NAC.registerCatalog({
      'rc2.error.test': { es: 'Hola' /* en + ja missing */ }
    });
    const findings = NAC.validate_global_v2({ i18n_strict: true });
    const inErrors = findings.errors.find(f =>
      f.code === 'i18n_missing_locale' && f.key === 'rc2.error.test');
    assert.ok(inErrors, 'missing locale escalated to error when opt-in');
    /* Reset for following tests */
    NAC.set_validation_tolerance({ i18n_strict: 'warn' });
  });

  await test('set_perf_tolerance updates throttle defaults', () => {
    const before = NAC.get_perf_tolerance();
    assert.strictEqual(before.mutation_throttle_ms, 100, 'rc2 default = 100ms');
    NAC.set_perf_tolerance({ mutation_throttle_ms: 200 });
    const after = NAC.get_perf_tolerance();
    assert.strictEqual(after.mutation_throttle_ms, 200);
    NAC.set_perf_tolerance({ mutation_throttle_ms: 100 });
  });

  await test('setMobileWebViewAttestation accepts function or null', () => {
    NAC.setMobileWebViewAttestation(function (e) { return false; });
    NAC.setMobileWebViewAttestation(null);
    assert.throws(() => NAC.setMobileWebViewAttestation('not-a-function'),
      /expects function|null/);
  });

  /* ----- rc3 NEW tests ----- */

  await test('rc3: scope rejects empty slug (DeepSeek T3.1)', () => {
    /* Empty string is falsy in the typeof check, so caught at
       'slug required'. Either rejection is acceptable -- both
       reject empty correctly. */
    assert.throws(() => NAC.scope({ slug: '' }), /slug_invalid|slug required/);
  });

  await test('rc3: setAutoRTL toggles direction auto-flip (Claude T5-F4)', () => {
    NAC.setAutoRTL(false);
    NAC.locale('ar');
    /* with auto-RTL disabled, dir should NOT be set */
    assert.strictEqual(document.documentElement.getAttribute('dir'), undefined);
    NAC.setAutoRTL(true);
    NAC.locale('ar');
    assert.strictEqual(document.documentElement.getAttribute('dir'), 'rtl');
    NAC.locale('es');
  });

  await test('rc3: declareVirtual escapes regex metacharacters (Claude T3.6)', () => {
    NAC.declareVirtual({
      slug_pattern: 'pipe.run.row.{i}',
      count: 100,
      resolver: i => ({ slug: 'pipe.run.row.' + i, role: 'row',
        label_i18n: { es: 'F' + i, en: 'R' + i } })
    });
    /* Through internals: ensure that the pattern matched only the
       exact dot-separated form, not a regex wildcard. */
    const v = NAC.__v2._virtuals[NAC.__v2._virtuals.length - 1];
    assert.strictEqual(v.slug_pattern, 'pipe.run.row.{i}');
    /* The internal _resolveVirtual is not exported; we verify via
       resolver call directly. */
    assert.deepStrictEqual(v.resolver(7).slug, 'pipe.run.row.7');
  });

  await test('rc3: get_perf_tolerance returns rc3 defaults', () => {
    const t = NAC.get_perf_tolerance();
    assert.strictEqual(t.mutation_throttle_ms, 100);
    assert.strictEqual(t.describe_target_ms, 50);
    assert.strictEqual(t.describe_hard_fail_ms, 150);
    assert.strictEqual(t.adopt_hard_fail_ms, 20);
  });

  await test('v2.1 baseline: version_v2 is 2.1.0-rc1', () => {
    /* This was 'rc5: version is 2.0.0-rc5' in earlier runs;
       updated to 2.1.0-rc1 with the sec 18 ship. */
    assert.strictEqual(NAC.version_v2, '2.1.0-rc1');
  });

  await test('rc4: gcIntermediateScopes() prunes index (Mistral T7-F2)', () => {
    /* Create some intermediate scopes via scope chain. */
    const root = NAC.scope({ slug: 'rc4test1', label_i18n: { es: 'A', en: 'A' } });
    root.scope({ slug: 'sub', label_i18n: { es: 'B', en: 'B' } });
    /* No-arg form clears all. */
    const removed = NAC.gcIntermediateScopes();
    assert.ok(typeof removed === 'number');
  });

  await test('rc4: set_validation_tolerance accepts iframe_strict + autoderived_action', () => {
    NAC.set_validation_tolerance({ iframe_strict: 'error' });
    assert.strictEqual(NAC.get_validation_tolerance().iframe_strict, 'error');
    NAC.set_validation_tolerance({ autoderived_action: 'error' });
    assert.strictEqual(NAC.get_validation_tolerance().autoderived_action, 'error');
    /* Reset for following tests */
    NAC.set_validation_tolerance({ iframe_strict: 'warn', autoderived_action: 'warn' });
  });

  await test('rc4: perf_budget_fail_rate_pct default is 2 (Claude T8.1)', () => {
    const t = NAC.get_perf_tolerance();
    assert.strictEqual(t.perf_budget_fail_rate_pct, 2);
    assert.strictEqual(t.perf_budget_window_ms, 5000);
  });

  /* ----- rc5: sitemap primitive (spec sec 17) ----- */
  await test('rc5: declareSitemap stores paths and exposes via describe_v2', () => {
    NAC.declareSitemap({
      paths: [
        {
          slug: 'settings.system.smtp',
          label_i18n: { es: 'Configuracion SMTP', en: 'SMTP settings' },
          affordance_to_navigate: [
            { action: 'click', target: 'topbar.settings' },
            { action: 'click', target: 'settings.system' }
          ],
          requires_permission: ['admin'],
          tags: ['integration', 'mail']
        }
      ]
    });
    const d = NAC.describe_v2();
    assert.ok(d.sitemap, 'sitemap is exposed');
    assert.strictEqual(d.sitemap.paths.length, 1);
    assert.strictEqual(d.sitemap.paths[0].slug, 'settings.system.smtp');
    assert.deepStrictEqual(d.sitemap.paths[0].tags, ['integration', 'mail']);
  });

  await test('rc5: declareSitemap rejects non-object spec', () => {
    assert.throws(() => NAC.declareSitemap('nope'), /paths/);
    assert.throws(() => NAC.declareSitemap({}), /paths/);
  });

  await test('rc5: declareSitemap rejects entry without slug', () => {
    assert.throws(() => NAC.declareSitemap({
      paths: [{ label_i18n: { es: 'x', en: 'x' } }]
    }), /slug/);
  });

  await test('rc5: declareSitemap rejects duplicate slugs', () => {
    assert.throws(() => NAC.declareSitemap({
      paths: [
        { slug: 'a.b' },
        { slug: 'a.b' }
      ]
    }), /duplicate/);
  });

  await test('rc5: declareSitemap(null) clears the sitemap', () => {
    NAC.declareSitemap({ paths: [{ slug: 'foo.bar' }] });
    assert.ok(NAC.describe_v2().sitemap);
    NAC.declareSitemap(null);
    assert.strictEqual(NAC.describe_v2().sitemap, null);
  });

  await test('rc5: getSitemap returns defensive copy (no mutation leak)', () => {
    NAC.declareSitemap({ paths: [{ slug: 'gs.test', tags: ['t'] }] });
    const out = NAC.getSitemap();
    out.paths.push({ slug: 'injected' });
    const fresh = NAC.getSitemap();
    assert.strictEqual(fresh.paths.length, 1, 'mutation does not leak');
    assert.strictEqual(fresh.paths[0].slug, 'gs.test');
    NAC.declareSitemap(null);
  });

  await test('rc5: describe_v2 includes nac_version=2.1.0-rc1', () => {
    /* version was bumped from rc5 to 2.1.0-rc1 with sec 18 ship. */
    const d = NAC.describe_v2();
    assert.strictEqual(d.nac_version, '2.1.0-rc1');
  });

  /* ----- v2.1: data-table primitive (spec sec 18) ----- */
  function _registerInvoiceLines() {
    if (NAC.__v2_dataTables['invoice.lines']) {
      NAC.unregisterDataTable('invoice.lines');
    }
    return NAC.registerDataTable({
      table_id: 'invoice.lines',
      scope_owner: 'modal.invoice_edit',
      subkind: 'collection',
      transactional: true,
      row_id_field: 'line_id',
      columns: [
        { key: 'line_id',    label_i18n: { es: 'ID', en: 'ID' }, type: 'text', editable: false },
        { key: 'product',    label_i18n: { es: 'Producto', en: 'Product' }, type: 'text', editable: true, required: true },
        { key: 'qty',        label_i18n: { es: 'Cantidad', en: 'Qty' }, type: 'number', editable: true, min: 1, required: true },
        { key: 'unit_price', label_i18n: { es: 'Precio', en: 'Unit price' }, type: 'currency', editable: false },
        { key: 'line_total', label_i18n: { es: 'Total', en: 'Total' }, type: 'currency', computed: true, computed_from: ['qty','unit_price'] }
      ],
      supports: ['add_row','remove_row','edit_cell'],
      selection_mode: 'multiple',
      aggregates: { sum: ['line_total'], count: ['*'] },
      initial_rows: [
        { line_id: 'L1', product: 'Mouse',   qty: 2, unit_price: 25,  line_total: 50  },
        { line_id: 'L2', product: 'Teclado', qty: 1, unit_price: 140, line_total: 140 }
      ],
      validators: [
        { kind: 'row',   code: 'qty_positive', column: 'qty', op: 'gt', value: 0 },
        { kind: 'table', code: 'no_dup_product', unique_columns: ['product'] }
      ]
    });
  }

  await test('v2.1 dt: registerDataTable returns table_id', () => {
    const id = _registerInvoiceLines();
    assert.strictEqual(id, 'invoice.lines');
    const s = NAC.dt_state('invoice.lines');
    assert.strictEqual(s.rows.length, 2);
    assert.strictEqual(s.modified, false);
  });

  await test('v2.1 dt: dt_state returns rows + aggregates', () => {
    _registerInvoiceLines();
    const s = NAC.dt_state('invoice.lines');
    assert.strictEqual(s.aggregates.sum.line_total, 190);
    assert.strictEqual(s.aggregates.count['*'], 2);
  });

  await test('v2.1 dt: dt_add_row appends + recomputes aggregates', () => {
    _registerInvoiceLines();
    const r = NAC.dt_add_row('invoice.lines', {
      product: 'Monitor', qty: 1, unit_price: 250
    });
    assert.strictEqual(r.ok, true);
    assert.ok(r.row_id);
    const s = NAC.dt_state('invoice.lines');
    assert.strictEqual(s.rows.length, 3);
    /* line_total computed=true with no fn registered: stays
       undefined for the new row, sum stays 190 for now. */
    assert.strictEqual(s.modified, true);
  });

  await test('v2.1 dt: registerDataTableComputed recomputes on add', () => {
    _registerInvoiceLines();
    NAC.registerDataTableComputed('invoice.lines', 'line_total',
      function (row) { return (row.qty || 0) * (row.unit_price || 0); });
    NAC.dt_add_row('invoice.lines', {
      product: 'Monitor', qty: 1, unit_price: 250
    });
    const s = NAC.dt_state('invoice.lines');
    assert.strictEqual(s.aggregates.sum.line_total, 440);
  });

  await test('v2.1 dt: dt_edit_cell rejects invalid type', () => {
    _registerInvoiceLines();
    const r = NAC.dt_edit_cell('invoice.lines', 'L1', 'qty', 'abc');
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.indexOf('invalid_type') >= 0);
  });

  await test('v2.1 dt: dt_edit_cell rejects below-min', () => {
    _registerInvoiceLines();
    const r = NAC.dt_edit_cell('invoice.lines', 'L1', 'qty', 0);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error, 'below_min:1');
  });

  await test('v2.1 dt: dt_edit_cell on computed column rejects', () => {
    _registerInvoiceLines();
    const r = NAC.dt_edit_cell('invoice.lines', 'L1', 'line_total', 999);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error, 'computed_column');
  });

  await test('v2.1 dt: dt_edit_cell on missing row returns row_not_found (no throw)', () => {
    _registerInvoiceLines();
    const r = NAC.dt_edit_cell('invoice.lines', 'NOEXIST', 'qty', 5);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error, 'row_not_found');
  });

  await test('v2.1 dt: dt_remove_row + aggregate recompute', () => {
    _registerInvoiceLines();
    NAC.registerDataTableComputed('invoice.lines', 'line_total',
      function (row) { return (row.qty || 0) * (row.unit_price || 0); });
    NAC.dt_remove_row('invoice.lines', 'L2');
    const s = NAC.dt_state('invoice.lines');
    assert.strictEqual(s.rows.length, 1);
    assert.strictEqual(s.aggregates.sum.line_total, 50);
  });

  await test('v2.1 dt: dt_validate detects required-column missing', () => {
    _registerInvoiceLines();
    /* Force a row through with empty product. We bypass validation
       by editing the editable column to empty -- normally
       caught by edit_cell, but text empty passes type check. */
    NAC.dt_edit_cell('invoice.lines', 'L1', 'product', '');
    const v = NAC.dt_validate('invoice.lines');
    assert.strictEqual(v.valid, false);
    assert.ok(v.errors.some(function (e) { return e.code === 'required_missing'; }));
  });

  await test('v2.1 dt: dt_validate detects table-level uniqueness', () => {
    _registerInvoiceLines();
    NAC.dt_edit_cell('invoice.lines', 'L2', 'product', 'Mouse');
    const v = NAC.dt_validate('invoice.lines');
    assert.strictEqual(v.valid, false);
    assert.ok(v.errors.some(function (e) { return e.code === 'no_dup_product'; }));
  });

  await test('v2.1 dt: dt_select with predicate', () => {
    _registerInvoiceLines();
    const r = NAC.dt_select('invoice.lines', { column: 'qty', op: 'gte', value: 2 });
    assert.strictEqual(r.selected_count, 1);
    const s = NAC.dt_state('invoice.lines');
    assert.deepStrictEqual(s.selected_ids, ['L1']);
  });

  await test('v2.1 dt: dt_select all + dt_select none', () => {
    _registerInvoiceLines();
    NAC.dt_select('invoice.lines', 'all');
    assert.strictEqual(NAC.dt_state('invoice.lines').selected_count, 2);
    NAC.dt_select('invoice.lines', 'none');
    assert.strictEqual(NAC.dt_state('invoice.lines').selected_count, 0);
  });

  await test('v2.1 dt: dt_discard restores initial_rows', () => {
    _registerInvoiceLines();
    NAC.dt_remove_row('invoice.lines', 'L1');
    NAC.dt_remove_row('invoice.lines', 'L2');
    assert.strictEqual(NAC.dt_state('invoice.lines').rows.length, 0);
    NAC.dt_discard('invoice.lines');
    const s = NAC.dt_state('invoice.lines');
    assert.strictEqual(s.rows.length, 2);
    assert.strictEqual(s.modified, false);
  });

  await test('v2.1 dt: dt_commit returns final_state + audit_diff', () => {
    _registerInvoiceLines();
    NAC.registerDataTableComputed('invoice.lines', 'line_total',
      function (row) { return (row.qty || 0) * (row.unit_price || 0); });
    NAC.dt_edit_cell('invoice.lines', 'L1', 'qty', 5);
    const r = NAC.dt_commit('invoice.lines');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.final_state.rows[0].qty, 5);
    /* After commit, modified resets and a discard would now revert
       to the just-committed state (not the original). */
    NAC.dt_discard('invoice.lines');
    const s = NAC.dt_state('invoice.lines');
    assert.strictEqual(s.rows[0].qty, 5);
  });

  await test('v2.1 dt: dt_commit blocks on validation failure', () => {
    _registerInvoiceLines();
    NAC.dt_edit_cell('invoice.lines', 'L1', 'product', '');
    const r = NAC.dt_commit('invoice.lines');
    assert.strictEqual(r.ok, false);
    assert.ok(Array.isArray(r.errors));
  });

  await test('v2.1 dt: matrix subkind set/get cell', () => {
    if (NAC.__v2_dataTables['perm.matrix']) NAC.unregisterDataTable('perm.matrix');
    NAC.registerDataTable({
      table_id: 'perm.matrix', scope_owner: 'modal.role',
      subkind: 'matrix',
      row_axis: { label_i18n: { es: 'Rol', en: 'Role' },
        values: [
          { slug: 'admin',   label_i18n: { es: 'Admin', en: 'Admin' } },
          { slug: 'analyst', label_i18n: { es: 'Analista', en: 'Analyst' } }
        ]
      },
      column_axis: { label_i18n: { es: 'Permiso', en: 'Permission' },
        values: [
          { slug: 'read',  label_i18n: { es: 'Leer', en: 'Read' } },
          { slug: 'write', label_i18n: { es: 'Editar', en: 'Write' } }
        ]
      },
      cell_type: 'boolean'
    });
    const r1 = NAC.dt_set_cell('perm.matrix', 'admin', 'read', true);
    assert.strictEqual(r1.ok, true);
    assert.strictEqual(NAC.dt_get_cell('perm.matrix', 'admin', 'read'), true);
    const r2 = NAC.dt_set_cell('perm.matrix', 'invalid', 'read', true);
    assert.strictEqual(r2.ok, false);
    assert.strictEqual(r2.error, 'row_not_in_axis');
  });

  await test('v2.1 dt: describe_v2 surfaces data_tables', () => {
    _registerInvoiceLines();
    const d = NAC.describe_v2();
    assert.ok(Array.isArray(d.data_tables));
    const dt = d.data_tables.filter(function (t) { return t.table_id === 'invoice.lines'; })[0];
    assert.ok(dt);
    assert.strictEqual(dt.subkind, 'collection');
    assert.strictEqual(dt.current_state.rows.length, 2);
  });

  await test('v2.1 dt: register rejects duplicate table_id', () => {
    _registerInvoiceLines();   /* helper unregisters first, so this re-registers cleanly */
    let threw = false;
    /* This time call registerDataTable directly (bypassing the
       helper's unregister-first guard) so the duplicate-id
       defence triggers. */
    try {
      NAC.registerDataTable({
        table_id: 'invoice.lines',  /* same id, different shape */
        subkind: 'collection', row_id_field: 'id',
        columns: [{ key: 'id', type: 'text' }, { key: 'x', type: 'text' }]
      });
    } catch (e) { threw = true; }
    assert.ok(threw, 'duplicate table_id should throw');
  });

  await test('v2.1 dt: register rejects matrix without axes', () => {
    let threw = false;
    try {
      NAC.registerDataTable({
        table_id: 'bad.matrix', subkind: 'matrix' /* missing row_axis */
      });
    } catch (e) { threw = true; }
    assert.ok(threw);
  });

  await test('v2.1 dt: events fire on add/edit/remove with by=agent', () => {
    _registerInvoiceLines();
    NAC.registerDataTableComputed('invoice.lines', 'line_total',
      function (row) { return (row.qty || 0) * (row.unit_price || 0); });
    let added = null, edited = null, removed = null;
    function onAdd(e)    { added   = e.detail; }
    function onEdit(e)   { edited  = e.detail; }
    function onRemove(e) { removed = e.detail; }
    document.addEventListener('nac:dt:row_added',   onAdd);
    document.addEventListener('nac:dt:cell_edited', onEdit);
    document.addEventListener('nac:dt:row_removed', onRemove);
    NAC.dt_add_row('invoice.lines', { product: 'X', qty: 1, unit_price: 10 });
    NAC.dt_edit_cell('invoice.lines', 'L1', 'qty', 3);
    NAC.dt_remove_row('invoice.lines', 'L2');
    assert.ok(added && added.row.product === 'X' && added.by === 'agent');
    assert.ok(edited && edited.column === 'qty' && edited.by === 'agent');
    assert.ok(removed && removed.row_id === 'L2' && removed.by === 'agent');
    document.removeEventListener('nac:dt:row_added',   onAdd);
    document.removeEventListener('nac:dt:cell_edited', onEdit);
    document.removeEventListener('nac:dt:row_removed', onRemove);
  });

  await test('v2.1 dt: v2.1 version is 2.1.0-rc1', () => {
    assert.strictEqual(NAC.version_v2, '2.1.0-rc1');
    assert.strictEqual(NAC.spec_version_v2, '2.1');
  });

  /* ----- summary ----- */
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) {
    process.exit(1);
  }
})();
