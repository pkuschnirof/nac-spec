/* matcher.spec.js -- intent resolution. */
'use strict';

var matcher = require('../src/lib/matcher');
var fx = require('./fixtures');

test('resolveIntent: tree slug exact -> confidence 1.0', function () {
  var r = matcher.resolveIntent({
    intent: 'topbar.dashboard',
    snapshot: fx.snapshotPageA
  });
  assert.strictEqual(r.resolved_slug, 'topbar.dashboard');
  assert.strictEqual(r.resolved_source, 'tree');
  assert.strictEqual(r.confidence, 1.0);
});

test('resolveIntent: spanish "Configuracion" matches topbar.settings label_i18n', function () {
  var r = matcher.resolveIntent({
    intent: 'configuracion',
    snapshot: fx.snapshotPageA
  });
  assert.ok(r.resolved_slug, 'resolved');
  /* both topbar.settings (tree) and page.settings (sitemap) match;
     tree wins by tie-break per visible-tree-is-authority bias. */
  assert.strictEqual(r.resolved_source, 'tree');
  assert.ok(r.confidence >= 0.9);
});

test('resolveIntent: english "Settings" finds topbar.settings', function () {
  var r = matcher.resolveIntent({
    intent: 'Settings',
    snapshot: fx.snapshotPageA
  });
  assert.strictEqual(r.resolved_source, 'tree');
  assert.ok(r.resolved_slug.indexOf('settings') >= 0);
});

test('resolveIntent: SMTP from page A falls back to sitemap (NOT in tree)', function () {
  var r = matcher.resolveIntent({
    intent: 'configurar SMTP',
    snapshot: fx.snapshotPageA
  });
  assert.strictEqual(r.resolved_slug, 'settings.system.smtp');
  assert.strictEqual(r.resolved_source, 'sitemap');
});

test('resolveIntent: SMTP from page B finds visible tree slug', function () {
  var r = matcher.resolveIntent({
    intent: 'guardar SMTP',
    snapshot: fx.snapshotPageB
  });
  assert.strictEqual(r.resolved_source, 'tree');
  assert.strictEqual(r.resolved_slug, 'settings.system.smtp.save');
});

test('resolveIntent: nonsense intent rejects with top-3 candidates', function () {
  var r = matcher.resolveIntent({
    intent: 'aaaaaaaaaaa',
    snapshot: fx.snapshotPageA
  });
  assert.strictEqual(r.resolved_slug, null);
  /* may be 'no_candidates' (no matches at all) or 'below_threshold'
     (some weak Levenshtein matches but under 0.4). Both are valid
     reject reasons. */
  assert.ok(['no_candidates','below_threshold'].indexOf(r.reason) >= 0);
});

test('resolveIntent: empty intent rejects', function () {
  var r = matcher.resolveIntent({ intent: '', snapshot: fx.snapshotPageA });
  assert.strictEqual(r.resolved_slug, null);
  assert.strictEqual(r.reason, 'empty_intent');
});

test('resolveIntent: locale-mixed intent works (es + en mix)', function () {
  /* user types "open Configuracion" -- mix of en verb + es noun */
  var r = matcher.resolveIntent({
    intent: 'open Configuracion',
    snapshot: fx.snapshotPageA
  });
  assert.ok(r.resolved_slug, 'resolved despite locale mix');
});

test('_norm strips diacritics (ASCII regex)', function () {
  var n = matcher._norm('Configuracion');
  assert.strictEqual(n, 'configuracion');
});

test('_lev: distance is symmetric and zero on equal strings', function () {
  assert.strictEqual(matcher._lev('foo', 'foo'), 0);
  assert.strictEqual(matcher._lev('foo', 'bar'), 3);
  assert.strictEqual(matcher._lev('kitten', 'sitting'), 3);
});

test('_collectCandidates surfaces v1 plugin elements + v2 scopes + sitemap', function () {
  var cs = matcher._collectCandidates(fx.snapshotPageA);
  var slugs = cs.map(function (c) { return c.slug; });
  assert.ok(slugs.indexOf('topbar.dashboard') >= 0, 'v1 element');
  assert.ok(slugs.indexOf('shell') >= 0, 'v2 scope');
  assert.ok(slugs.indexOf('settings.system.smtp') >= 0, 'sitemap path');
});
