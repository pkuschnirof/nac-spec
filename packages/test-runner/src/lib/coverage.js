/* ===============================================================
   coverage.js -- sitemap + tree coverage report.

   Two reports:
     - sitemapCoverageReport(): which sitemap paths were ever
       resolved by a test in this run? (path-level UI coverage)
     - treeCoverageReport(): which tree slugs were ever
       dispatched? (slug-level UI coverage)

   Both produce a structured report a CI can post as a PR comment
   or a Grafana panel can chart over time.

   ASCII-only.
   =============================================================== */
'use strict';

/**
 * @param {object} args
 * @param {Array<{slug, ...}>}   args.sitemap_paths    -- describe_v2().sitemap.paths
 * @param {Array<string>}        args.reached_slugs    -- slugs touched by tests in this run
 * @returns {{
 *   total_paths: number,
 *   reached_paths: number,
 *   percent: number,
 *   reached: Array<string>,
 *   missing: Array<{slug, label_i18n}>,
 *   by_tag:  Array<{tag, total, reached, percent}>
 * }}
 */
function sitemapCoverageReport(args) {
  var paths = args.sitemap_paths || [];
  var reachedSet = _toSet(args.reached_slugs || []);
  var reached = [];
  var missing = [];
  var tagAgg = {};
  paths.forEach(function (p) {
    var hit = reachedSet[p.slug];
    if (hit) {
      reached.push(p.slug);
    } else {
      missing.push({ slug: p.slug, label_i18n: p.label_i18n || null });
    }
    var tags = Array.isArray(p.tags) ? p.tags : [];
    tags.forEach(function (t) {
      if (!tagAgg[t]) tagAgg[t] = { tag: t, total: 0, reached: 0 };
      tagAgg[t].total++;
      if (hit) tagAgg[t].reached++;
    });
  });
  var total = paths.length;
  var hitN = reached.length;
  return {
    total_paths: total,
    reached_paths: hitN,
    percent: total ? +(100 * hitN / total).toFixed(1) : 0,
    reached: reached.sort(),
    missing: missing.sort(_bySlug),
    by_tag: Object.keys(tagAgg).map(function (t) {
      var x = tagAgg[t];
      return {
        tag: x.tag,
        total: x.total,
        reached: x.reached,
        percent: x.total ? +(100 * x.reached / x.total).toFixed(1) : 0
      };
    }).sort(function (a, b) { return a.tag < b.tag ? -1 : 1; })
  };
}

/**
 * @param {object} args
 * @param {Array<{slug, ...}>}   args.tree_entries     -- describe_v2().v2_scope_entries (+ v1 plugin elements)
 * @param {Array<string>}        args.dispatched_slugs -- slugs actually dispatched (clicked, filled, etc.)
 * @returns same shape as sitemapCoverageReport (no by_tag).
 */
function treeCoverageReport(args) {
  var entries = args.tree_entries || [];
  var hits = _toSet(args.dispatched_slugs || []);
  var reached = [];
  var missing = [];
  entries.forEach(function (e) {
    if (hits[e.slug]) {
      reached.push(e.slug);
    } else {
      missing.push({ slug: e.slug, role: e.role || null, label_i18n: e.label_i18n || null });
    }
  });
  var total = entries.length;
  var hitN = reached.length;
  return {
    total_slugs: total,
    reached_slugs: hitN,
    percent: total ? +(100 * hitN / total).toFixed(1) : 0,
    reached: reached.sort(),
    missing: missing.sort(_bySlug)
  };
}

function _toSet(arr) {
  var s = Object.create(null);
  for (var i = 0; i < arr.length; i++) s[arr[i]] = true;
  return s;
}
function _bySlug(a, b) { return a.slug < b.slug ? -1 : 1; }

module.exports = {
  sitemapCoverageReport: sitemapCoverageReport,
  treeCoverageReport: treeCoverageReport
};
