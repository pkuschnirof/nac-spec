/* ===============================================================
   assertions.js -- declarative test-runner assertions.

   Three primitives:
     - assertNavigationCompletes(result, expected_terminal_slug)
     - assertPlanShape(plan, expected)   // structural plan check
     - assertConfidence(result, threshold)

   All throw an AssertionError-shaped Error subclass on failure
   so they integrate cleanly with any test runner (node:test,
   mocha, jest, vitest, custom).

   ASCII-only.
   =============================================================== */
'use strict';

function NACAssertionError(message, details) {
  var e = new Error(message);
  e.name = 'NACAssertionError';
  e.details = details || {};
  return e;
}

/**
 * @param {object} result -- output of runIntent() or pure plan() execution
 * @param {string} expectedTerminalSlug -- the slug whose dispatch finalises the intent
 *
 * Passes when EITHER:
 *  - result.steps[last].target_slug === expectedTerminalSlug, AND
 *  - result.passed !== false (when present), AND
 *  - last step status === 'ok' (when present).
 *
 * Otherwise throws with a structured details object so the test
 * harness can render which step diverged.
 */
function assertNavigationCompletes(result, expectedTerminalSlug) {
  if (!result || !Array.isArray(result.steps) || !result.steps.length) {
    throw NACAssertionError(
      'assertNavigationCompletes: result has no steps',
      { result: result }
    );
  }
  var last = result.steps[result.steps.length - 1];
  if (last.target_slug !== expectedTerminalSlug) {
    throw NACAssertionError(
      'assertNavigationCompletes: last step target_slug ('
      + last.target_slug + ') !== expected (' + expectedTerminalSlug + ')',
      { last: last, expected: expectedTerminalSlug, all_steps: result.steps }
    );
  }
  if (result.passed === false) {
    throw NACAssertionError(
      'assertNavigationCompletes: result.passed === false',
      { result: result }
    );
  }
  if (last.status && last.status !== 'ok') {
    throw NACAssertionError(
      'assertNavigationCompletes: last step status=' + last.status,
      { last: last }
    );
  }
  return true;
}

/**
 * Structural check on a plan.
 *
 * Expected shape: { strategy, slug?, step_count?, has_page_break? }
 */
function assertPlanShape(plan, expected) {
  expected = expected || {};
  if (expected.strategy && plan.strategy !== expected.strategy) {
    throw NACAssertionError(
      'assertPlanShape: strategy=' + plan.strategy + ' expected=' + expected.strategy,
      { plan: plan, expected: expected }
    );
  }
  if (expected.slug && plan.resolved_slug !== expected.slug) {
    throw NACAssertionError(
      'assertPlanShape: resolved_slug=' + plan.resolved_slug + ' expected=' + expected.slug,
      { plan: plan, expected: expected }
    );
  }
  if (typeof expected.step_count === 'number' && plan.steps.length !== expected.step_count) {
    throw NACAssertionError(
      'assertPlanShape: steps.length=' + plan.steps.length + ' expected=' + expected.step_count,
      { plan: plan, expected: expected }
    );
  }
  if (expected.has_page_break != null) {
    var hasPB = plan.steps.some(function (s) { return s.requires_page_break_guard; });
    if (hasPB !== !!expected.has_page_break) {
      throw NACAssertionError(
        'assertPlanShape: has_page_break=' + hasPB + ' expected=' + expected.has_page_break,
        { plan: plan, expected: expected }
      );
    }
  }
  return true;
}

/**
 * Confidence floor check. Useful in CI to flag when matcher
 * confidence drops below a threshold (e.g. label_i18n drift,
 * locale missing, slug renamed).
 */
function assertConfidence(result, threshold) {
  if (typeof result.confidence !== 'number') {
    throw NACAssertionError(
      'assertConfidence: result.confidence is not a number',
      { result: result }
    );
  }
  if (result.confidence < threshold) {
    throw NACAssertionError(
      'assertConfidence: confidence=' + result.confidence
      + ' below threshold=' + threshold,
      { result: result, threshold: threshold }
    );
  }
  return true;
}

module.exports = {
  NACAssertionError: NACAssertionError,
  assertNavigationCompletes: assertNavigationCompletes,
  assertPlanShape: assertPlanShape,
  assertConfidence: assertConfidence
};
