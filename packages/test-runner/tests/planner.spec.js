/* planner.spec.js -- plan() decision tree. */
'use strict';

var runner = require('../src/index');
var fx = require('./fixtures');

test('plan: tree slug -> tree_dispatch single step', function () {
  var p = runner.plan({
    intent: 'Dashboard',
    snapshot: fx.snapshotPageA
  });
  assert.strictEqual(p.strategy, 'tree_dispatch');
  assert.strictEqual(p.steps.length, 1);
  assert.strictEqual(p.steps[0].action, 'click');
});

test('plan: SMTP from page A -> sitemap_navigate with page-break guard', function () {
  var p = runner.plan({
    intent: 'configurar SMTP',
    snapshot: fx.snapshotPageA,
    continuation_value: 'smtp_demo'
  });
  assert.strictEqual(p.strategy, 'sitemap_navigate');
  assert.strictEqual(p.resolved_slug, 'settings.system.smtp');
  assert.ok(p.steps.length >= 2);
  assert.strictEqual(p.steps[0].requires_page_break_guard, true);
  assert.ok(p.steps[0].carry_intent_via_query.indexOf('smtp_demo') >= 0);
});

test('plan: explicit slug bypasses matcher', function () {
  var p = runner.plan({
    intent: { resolved_slug: 'settings.system.smtp.save' },
    snapshot: fx.snapshotPageB
  });
  assert.strictEqual(p.strategy, 'tree_dispatch');
  assert.strictEqual(p.resolved_slug, 'settings.system.smtp.save');
});

test('plan: unresolvable intent -> reject with candidates', function () {
  var p = runner.plan({
    intent: 'do something impossible xyz999',
    snapshot: fx.snapshotPageA
  });
  assert.strictEqual(p.strategy, 'reject');
  assert.ok(Array.isArray(p.candidates_top3));
});

test('plan: fill_values produce fill steps with values', function () {
  var p = runner.plan({
    intent: { resolved_slug: 'settings.system.smtp.host' },
    snapshot: fx.snapshotPageB,
    fill_values: { 'settings.system.smtp.host': 'smtp.gmail.com' }
  });
  assert.strictEqual(p.steps[0].action, 'fill');
  assert.strictEqual(p.steps[0].value, 'smtp.gmail.com');
});

test('plan: trace is human-readable', function () {
  var p = runner.plan({
    intent: 'Settings',
    snapshot: fx.snapshotPageA
  });
  assert.ok(p.trace.length > 0);
  assert.ok(p.trace[0].indexOf('intent') >= 0);
});

test('assertPlanShape: passes on matching plan', function () {
  var p = runner.plan({
    intent: 'configurar SMTP',
    snapshot: fx.snapshotPageA,
    continuation_value: 'x'
  });
  runner.assertPlanShape(p, {
    strategy: 'sitemap_navigate',
    slug: 'settings.system.smtp',
    has_page_break: true
  });
});

test('assertPlanShape: throws on mismatch', function () {
  var p = runner.plan({
    intent: 'Dashboard',
    snapshot: fx.snapshotPageA
  });
  var threw = false;
  try {
    runner.assertPlanShape(p, { strategy: 'sitemap_navigate' });
  } catch (e) {
    threw = true;
    assert.strictEqual(e.name, 'NACAssertionError');
  }
  assert.ok(threw, 'should throw');
});

test('assertConfidence: passes when above threshold', function () {
  var r = runner.resolveIntent({
    intent: 'topbar.dashboard',
    snapshot: fx.snapshotPageA
  });
  runner.assertConfidence(r, 0.8);
});

test('assertConfidence: throws below threshold', function () {
  var r = runner.resolveIntent({
    intent: 'topbar.dashboard',
    snapshot: fx.snapshotPageA
  });
  var threw = false;
  try { runner.assertConfidence(r, 1.5); } catch (e) { threw = true; }
  assert.ok(threw);
});
