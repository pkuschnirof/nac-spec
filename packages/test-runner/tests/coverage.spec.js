/* coverage.spec.js -- sitemap and tree coverage reports. */
'use strict';

var runner = require('../src/index');
var fx = require('./fixtures');

test('sitemapCoverageReport: 0 reached -> 0% with all missing', function () {
  var r = runner.sitemapCoverageReport({
    sitemap_paths: fx.snapshotPageA.sitemap.paths,
    reached_slugs: []
  });
  assert.strictEqual(r.total_paths, 3);
  assert.strictEqual(r.reached_paths, 0);
  assert.strictEqual(r.percent, 0);
  assert.strictEqual(r.missing.length, 3);
});

test('sitemapCoverageReport: partial -> reports both reached + missing', function () {
  var r = runner.sitemapCoverageReport({
    sitemap_paths: fx.snapshotPageA.sitemap.paths,
    reached_slugs: ['page.dashboard', 'settings.system.smtp']
  });
  assert.strictEqual(r.reached_paths, 2);
  assert.ok(r.percent > 60 && r.percent < 70);
  assert.strictEqual(r.missing.length, 1);
  assert.strictEqual(r.missing[0].slug, 'page.settings');
});

test('sitemapCoverageReport: by_tag breakdown', function () {
  var r = runner.sitemapCoverageReport({
    sitemap_paths: fx.snapshotPageA.sitemap.paths,
    reached_slugs: ['settings.system.smtp']
  });
  /* settings.system.smtp has tags integration, mail, configuration.
     page.settings has tag configuration too -> 1/2. */
  var byConfig = r.by_tag.filter(function (t) { return t.tag === 'configuration'; })[0];
  assert.ok(byConfig);
  assert.strictEqual(byConfig.total, 2);
  assert.strictEqual(byConfig.reached, 1);
  var byPage = r.by_tag.filter(function (t) { return t.tag === 'page'; })[0];
  assert.ok(byPage);
  assert.strictEqual(byPage.total, 2);
  assert.strictEqual(byPage.reached, 0);
});

test('treeCoverageReport: counts dispatched slugs', function () {
  var r = runner.treeCoverageReport({
    tree_entries: fx.snapshotPageB.v2_scope_entries,
    dispatched_slugs: ['shell', 'shell.settings']
  });
  assert.strictEqual(r.reached_slugs, 2);
  assert.strictEqual(r.total_slugs, 5);
  assert.strictEqual(r.percent, 40);
});
