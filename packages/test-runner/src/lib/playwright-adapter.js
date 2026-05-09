/* ===============================================================
   playwright-adapter.js -- run a NAC plan against a Playwright page.

   This is the glue between the pure planner and a real browser
   session. Optional dependency: @playwright/test. When the user
   does not install it, planner + assertions + coverage still work.

   Public API:
     runIntent(page, opts) -> Promise<result>
     snapshot(page)        -> Promise<describe_v2()>
     dispatchByNacId(page, slug, opts) -> Promise<{ok, error?}>

   Result shape:
   {
     passed: boolean,
     intent: string,
     resolved_slug: string,
     strategy: 'tree_dispatch'|'sitemap_navigate'|'reject',
     steps: [
       { action, target_slug, started_at, ended_at, latency_ms,
         status: 'ok'|'fail'|'skipped', error?: string }
     ],
     latency_ms_total: number,
     log: Array<string>,
     dispatched_slugs: Array<string>   -- for coverage report
   }

   ASCII-only.
   =============================================================== */
'use strict';

var planner = require('./planner');

/**
 * Read describe_v2() from the page.
 * Throws if NAC v2.0-rc5+ is not loaded.
 */
async function snapshot(page) {
  return await page.evaluate(function () {
    if (!window.NAC || typeof window.NAC.describe_v2 !== 'function') {
      throw new Error('NAC v2.0 runtime not present on page');
    }
    return window.NAC.describe_v2();
  });
}

/**
 * Dispatch a single NAC action by slug. Tries native click on
 * data-nac-id, falls back to NAC.invoke if available.
 */
async function dispatchByNacId(page, slug, opts) {
  opts = opts || {};
  return await page.evaluate(function (args) {
    var slug = args.slug;
    var action = args.action;
    var value = args.value;
    var el = document.querySelector('[data-nac-id="' + slug + '"]');
    if (!el) return { ok: false, error: 'element_not_found' };
    if (action === 'fill') {
      try {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.focus();
          el.value = value == null ? '' : String(value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true };
        }
        return { ok: false, error: 'fill_on_non_input' };
      } catch (e) {
        return { ok: false, error: 'fill_threw:' + (e && e.message) };
      }
    }
    if (action === 'focus') {
      try { el.focus(); return { ok: true }; }
      catch (e) { return { ok: false, error: 'focus_threw:' + e.message }; }
    }
    /* default: click */
    try { el.click(); return { ok: true }; }
    catch (e) { return { ok: false, error: 'click_threw:' + e.message }; }
  }, { slug: slug, action: opts.action || 'click', value: opts.value });
}

/**
 * v2.1: dispatch a data-table operation in the page context.
 * Returns the runtime call result (or {ok:false, error} when
 * the runtime is missing or the table is not registered).
 */
async function dispatchDataTableOp(page, op) {
  return await page.evaluate(function (args) {
    if (!window.NAC) return { ok: false, error: 'nac_missing' };
    var op = args.op;
    var fn = window.NAC[op.method];
    if (typeof fn !== 'function') {
      return { ok: false, error: 'method_not_available:' + op.method };
    }
    try {
      return fn.apply(null, op.args || []);
    } catch (e) {
      return { ok: false, error: 'threw:' + (e && e.message) };
    }
  }, { op: op });
}

/**
 * Decorate an anchor's href with a continuation query, then click.
 * Used when the planner returned step.requires_page_break_guard:true
 * and step.carry_intent_via_query.
 */
async function clickAnchorWithContinuation(page, slug, query) {
  return await page.evaluate(function (args) {
    var el = document.querySelector('[data-nac-id="' + args.slug + '"]');
    if (!el) return { ok: false, error: 'anchor_not_found' };
    if (el.tagName !== 'A' || !el.getAttribute('href')) {
      /* not an anchor; just click */
      try { el.click(); return { ok: true, page_break: false }; }
      catch (e) { return { ok: false, error: 'click_threw:' + e.message }; }
    }
    var href = el.getAttribute('href');
    var sep = href.indexOf('?') >= 0 ? '&' : '?';
    el.setAttribute('href', href + sep + args.query);
    el.click();
    return { ok: true, page_break: true };
  }, { slug: slug, query: query });
}

/**
 * Run an intent end-to-end.
 *
 * @param {Page} page                    -- Playwright Page
 * @param {object} opts
 * @param {string} opts.intent           -- "configurar SMTP"
 * @param {object} [opts.fill_values]    -- map slug -> value
 * @param {string} [opts.expected_terminal_slug]
 * @param {number} [opts.timeout_ms=30000]
 * @param {number} [opts.step_delay_ms=300]
 * @param {string} [opts.continuation_query='nac_autopilot']
 * @param {string} [opts.continuation_value='runner']
 * @param {function} [opts.onLog]
 */
async function runIntent(page, opts) {
  var log = [];
  var dispatched = [];
  var t0 = Date.now();
  function logLine(msg) {
    log.push(msg);
    if (typeof opts.onLog === 'function') opts.onLog(msg);
  }
  var timeout = opts.timeout_ms || 30000;
  var stepDelay = opts.step_delay_ms || 300;
  var continuationQuery = opts.continuation_query || 'nac_autopilot';
  var continuationValue = opts.continuation_value || 'runner';

  try {
    /* 1. Snapshot the initial page. */
    var snap = await Promise.race([
      snapshot(page),
      _timeout(timeout, 'snapshot timed out')
    ]);
    logLine('snapshot ok: nac_version=' + snap.nac_version
      + ' scopes=' + (snap.v2_scope_entries || []).length
      + ' sitemap_paths=' + (snap.sitemap ? snap.sitemap.paths.length : 0));

    /* 2. Plan. */
    var pl = planner.plan({
      intent: opts.intent,
      snapshot: snap,
      fill_values: opts.fill_values || {},
      continuation_query: continuationQuery,
      continuation_value: continuationValue
    });
    logLine('plan: strategy=' + pl.strategy
      + ' resolved_slug=' + (pl.resolved_slug || '<none>')
      + ' confidence=' + pl.confidence
      + ' steps=' + pl.steps.length);

    if (pl.strategy === 'reject') {
      return _result(false, opts.intent, pl, [], log, dispatched, t0);
    }

    /* 3. Execute steps. */
    var stepResults = [];
    for (var i = 0; i < pl.steps.length; i++) {
      var step = pl.steps[i];
      if (Date.now() - t0 > timeout) {
        logLine('TIMEOUT after ' + (i) + ' step(s)');
        stepResults.push(_stepFail(step, 'timeout'));
        break;
      }
      if (step.on_continuation && !_continuationActive(page, continuationQuery, continuationValue)) {
        /* The page broke; skip this step on the source page,
           the destination page's own runner will handle it. */
        logLine('skip on_continuation step (' + step.target_slug
          + ') -- waiting for destination page');
        stepResults.push(_stepSkipped(step, 'awaits_continuation'));
        continue;
      }
      var sStart = Date.now();
      var disp;
      if (step.requires_page_break_guard) {
        var query = step.carry_intent_via_query
          || (continuationQuery + '=' + continuationValue);
        disp = await clickAnchorWithContinuation(page, step.target_slug, query);
        logLine('step ' + (i + 1) + ': click ' + step.target_slug
          + (disp.page_break ? ' (page break + continuation)' : ''));
        if (disp.ok && disp.page_break) {
          /* Wait for navigation to settle, then refresh snapshot. */
          await page.waitForLoadState('domcontentloaded', { timeout: timeout });
          await _sleep(stepDelay);
          /* Re-plan against the new page. */
          var newSnap = await snapshot(page);
          var newPlan = planner.plan({
            intent: opts.intent,
            snapshot: newSnap,
            fill_values: opts.fill_values || {},
            continuation_query: continuationQuery,
            continuation_value: continuationValue
          });
          logLine('post-nav plan: strategy=' + newPlan.strategy
            + ' resolved_slug=' + (newPlan.resolved_slug || '<none>'));
          /* Replace pending steps with the fresh plan's steps. */
          if (newPlan.strategy !== 'reject') {
            var continuation = newPlan.steps.filter(function (s) {
              return !s.requires_page_break_guard;
            });
            var pending = pl.steps.slice(i + 1).filter(function (s) {
              return !s.requires_page_break_guard;
            });
            pl.steps = pl.steps.slice(0, i + 1)
              .concat(continuation.length ? continuation : pending);
          }
        }
      } else {
        disp = await dispatchByNacId(page, step.target_slug, {
          action: step.action, value: step.value
        });
        logLine('step ' + (i + 1) + ': ' + step.action + ' '
          + step.target_slug
          + (step.action === 'fill' && step.value !== undefined
              ? ' value="' + step.value + '"' : '')
          + (disp.ok ? '' : ' [' + disp.error + ']'));
      }
      var sEnd = Date.now();
      stepResults.push({
        action: step.action,
        target_slug: step.target_slug,
        started_at: sStart,
        ended_at: sEnd,
        latency_ms: sEnd - sStart,
        status: disp.ok ? 'ok' : 'fail',
        error: disp.error || undefined
      });
      if (disp.ok) dispatched.push(step.target_slug);
      if (!disp.ok) break;
      await _sleep(stepDelay);
    }

    var lastSlug = stepResults.length
      ? stepResults[stepResults.length - 1].target_slug
      : null;
    var passed = stepResults.length > 0
      && stepResults.every(function (s) { return s.status === 'ok' || s.status === 'skipped'; })
      && (!opts.expected_terminal_slug || lastSlug === opts.expected_terminal_slug);
    logLine('result: passed=' + passed + ' last_slug=' + lastSlug);
    return _result(passed, opts.intent, pl, stepResults, log, dispatched, t0);
  } catch (e) {
    logLine('runIntent threw: ' + (e && e.message));
    return _result(false, opts.intent, null, [], log, dispatched, t0, e);
  }
}

function _timeout(ms, msg) {
  return new Promise(function (_, reject) {
    setTimeout(function () { reject(new Error(msg)); }, ms);
  });
}
function _sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}
function _continuationActive(/*page, q, v*/) {
  /* We can't inspect the URL without an await round-trip; the
     planner only flags on_continuation steps when the runner is
     supposed to defer them. For our purposes, when the runner
     reaches an on_continuation step, the page break must already
     have happened (the planner ordered them after the click). So
     return true; the destination page will execute them. */
  return true;
}
function _stepSkipped(step, reason) {
  return {
    action: step.action, target_slug: step.target_slug,
    started_at: 0, ended_at: 0, latency_ms: 0,
    status: 'skipped', error: reason
  };
}
function _stepFail(step, reason) {
  return {
    action: step.action, target_slug: step.target_slug,
    started_at: 0, ended_at: 0, latency_ms: 0,
    status: 'fail', error: reason
  };
}
function _result(passed, intent, plan, steps, log, dispatched, t0, err) {
  return {
    passed: passed,
    intent: intent,
    resolved_slug: plan ? plan.resolved_slug : null,
    strategy: plan ? plan.strategy : 'reject',
    confidence: plan ? plan.confidence : 0,
    steps: steps,
    latency_ms_total: Date.now() - t0,
    log: log,
    dispatched_slugs: dispatched,
    error: err ? (err.message || String(err)) : undefined
  };
}

module.exports = {
  runIntent: runIntent,
  snapshot: snapshot,
  dispatchByNacId: dispatchByNacId,
  dispatchDataTableOp: dispatchDataTableOp,
  clickAnchorWithContinuation: clickAnchorWithContinuation
};
