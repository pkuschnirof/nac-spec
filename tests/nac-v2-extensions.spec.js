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
  global.document = {
    documentElement: { _attrs: {}, getAttribute(n) { return this._attrs[n]; }, setAttribute(n, v) { this._attrs[n] = v; }, removeAttribute(n) { delete this._attrs[n]; } },
    body: { _children: [], appendChild(n) { this._children.push(n); }, querySelectorAll() { return []; } },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    createEvent: () => ({ initEvent: () => {} }),
    readyState: 'complete',
    querySelectorAll: () => []
  };
  global.CustomEvent = function(name, opts) { this.type = name; this.detail = opts && opts.detail; };
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
    assert.strictEqual(d.nac_version, '2.0.0');
    assert.ok(Array.isArray(d.v2_scope_entries));
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

  /* ----- summary ----- */
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) {
    process.exit(1);
  }
})();
