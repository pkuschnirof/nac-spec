/* @nac-spec/test-runner -- public entry.
   ASCII-only. */
'use strict';

var planner    = require('./lib/planner');
var matcher    = require('./lib/matcher');
var assertions = require('./lib/assertions');
var coverage   = require('./lib/coverage');
var chainTest  = require('./lib/chain-test');

/* Playwright adapter is loaded lazily so the package works in
   environments without @playwright/test installed. */
function _loadAdapter() {
  return require('./lib/playwright-adapter');
}

module.exports = {
  /* pure / no-DOM */
  plan: planner.plan,
  resolveIntent: matcher.resolveIntent,
  sitemapCoverageReport: coverage.sitemapCoverageReport,
  treeCoverageReport: coverage.treeCoverageReport,
  assertNavigationCompletes: assertions.assertNavigationCompletes,
  assertPlanShape: assertions.assertPlanShape,
  assertConfidence: assertions.assertConfidence,
  NACAssertionError: assertions.NACAssertionError,

  /* End-to-end chain conformance test (NAC v2.1 spec sec 19) */
  runChainTest: chainTest.runChainTest,

  /* with-Playwright */
  get runIntent()                 { return _loadAdapter().runIntent; },
  get snapshot()                  { return _loadAdapter().snapshot; },
  get dispatchByNacId()           { return _loadAdapter().dispatchByNacId; },
  get dispatchDataTableOp()       { return _loadAdapter().dispatchDataTableOp; },
  get clickAnchorWithContinuation() { return _loadAdapter().clickAnchorWithContinuation; },

  version: '0.3.0'
};
