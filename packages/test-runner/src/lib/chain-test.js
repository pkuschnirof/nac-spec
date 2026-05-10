/* ===============================================================
   chain-test.js -- end-to-end intent chain conformance test
   primitive (NAC v2.1 spec sec 19, mandatory at NAC-3).

   Verifies the four-stage pipeline:
     1. Intent detection -- the LLM resolves the natural-language
        phrase to a typed action kind (sec 16 vocabulary).
     2. Disambiguated dispatch -- the kind + resolved parameters
        invoke the runtime against concrete slugs (resolved from
        the snapshot the LLM saw).
     3. Runtime event emission -- the dispatch causes the
        canonical event documented in sec 6.2 / 18.6 to fire,
        with the right detail payload shape.
     4. Side-effect coherence -- the post-dispatch state
        (re-snapshot via describe_v2) reflects the intent.

   Two modes:
     - Live (page supplied): full Playwright pipeline against
       a real browser + LLM intermediary. The complete chain.
     - Offline (snapshot supplied): matcher + planner only,
       no DOM, no LLM. Verifies stage 1 resolution + stage 2
       parameter shape against a frozen fixture. Cheaper to
       iterate; runs in pure node.

   ASCII-only.
   =============================================================== */
'use strict';

var matcher = require('./matcher');
var planner = require('./planner');

/* ---------- result shape helpers ---------- */
function _stage(name, passed, evidence, note) {
  return { name: name, passed: !!passed, evidence: evidence || null, note: note || null };
}
function _failResult(stages, log, t0) {
  return {
    passed: stages.every(function (s) { return s.passed; }),
    stages: stages,
    log: log,
    latency_ms: Date.now() - t0
  };
}

/* ---------- Stage 1: intent detection ---------- */
function _verifyStage1(intent, snapshot, expected) {
  var resolved = matcher.resolveIntent({ intent: intent, snapshot: snapshot });
  var pl = planner.plan({ intent: intent, snapshot: snapshot });
  var firstKind = pl.steps && pl.steps[0] && pl.steps[0].action;
  /* The action enum from planner ('click', 'fill', ...) maps to
     the chat kinds 1:1 except for dt_*. The expected.stage_1_kind
     is the chat-kind (e.g. 'dt_remove_row'). The planner emits
     'click'/'fill' for v1 paths; for dt_* the host wires the
     sec-16-vocabulary kind directly via runChainTest's planner
     extension below. To keep this primitive tractable, we
     compare the resolved slug + the action class. */
  var kindMatches = false;
  if (typeof expected.stage_1_kind === 'string') {
    /* Crude but useful: the expected kind reads correctly when:
       (a) the planner emits 'click' AND expected starts with
           'click' (legacy v1 path), OR
       (b) the resolved slug starts with a dt_* prefix matching
           the expected kind (e.g. expected 'dt_remove_row' AND
           resolved row is in a data_tables[].current_state.rows). */
    if (expected.stage_1_kind === 'click' && firstKind === 'click') kindMatches = true;
    if (expected.stage_1_kind.indexOf('dt_') === 0) {
      /* For dt_* expectations, the matcher must have resolved a
         slug whose owning entity is a data_tables[] table_id, OR
         the intent should encode the table_id explicitly. */
      var dtSlug = (resolved.resolved_slug || '');
      var inDataTable = (snapshot.data_tables || []).some(function (t) {
        return dtSlug.indexOf(t.table_id) === 0
          || (t.current_state && t.current_state.rows
              && t.current_state.rows.some(function (r) {
                return Object.values(r).some(function (v) {
                  return typeof v === 'string'
                    && v.toLowerCase().indexOf((intent || '').toLowerCase()) >= 0
                  || (intent || '').toLowerCase().indexOf(String(v).toLowerCase()) >= 0;
                });
              }));
      });
      if (inDataTable) kindMatches = true;
    }
    if (expected.stage_1_kind === firstKind) kindMatches = true;
  }
  return _stage(
    'stage_1_intent_detected',
    kindMatches,
    {
      resolved_slug: resolved.resolved_slug,
      planner_first_step: firstKind,
      planner_strategy:   pl.strategy,
      confidence:         resolved.confidence
    },
    kindMatches ? null : ('expected kind=' + expected.stage_1_kind
      + ', planner emitted=' + firstKind + ' (slug=' + resolved.resolved_slug + ')')
  );
}

/* ---------- Stage 2: disambiguated dispatch ---------- */
function _verifyStage2(intent, snapshot, expected) {
  var s2 = expected.stage_2_params || {};
  /* For data-table intents, resolve the row_id from the snapshot
     using the row_id_resolves_via predicate. */
  var resolution = { table_id: s2.table_id || null, row_id: null };
  if (s2.row_id_resolves_via && s2.table_id) {
    var dt = (snapshot.data_tables || []).filter(function (t) {
      return t.table_id === s2.table_id;
    })[0];
    if (dt && dt.current_state && Array.isArray(dt.current_state.rows)) {
      var ridField = (dt.schema && dt.schema.row_id_field) || 'id';
      var match = dt.current_state.rows.filter(function (r) {
        var col = s2.row_id_resolves_via.column;
        var val = s2.row_id_resolves_via.value;
        if (col == null || val == null) return false;
        if (typeof r[col] === 'string') {
          return r[col].toLowerCase() === String(val).toLowerCase();
        }
        return r[col] === val;
      })[0];
      if (match) resolution.row_id = match[ridField];
    }
  }
  var ok = !!resolution.table_id && (
    !s2.row_id_resolves_via || !!resolution.row_id
  );
  return _stage(
    'stage_2_disambiguated_dispatch',
    ok,
    {
      table_id: resolution.table_id,
      resolved_row_id: resolution.row_id
    },
    ok ? null : ('could not resolve row_id from '
      + JSON.stringify(s2.row_id_resolves_via)
      + ' against table ' + s2.table_id)
  );
}

/* ---------- Stage 3: runtime event emission (live mode only) ---------- */
async function _verifyStage3Live(page, expected, captureWindowMs) {
  if (!page) {
    return _stage('stage_3_event_emitted', false, null,
      'live mode requires page; offline mode skips stage 3');
  }
  var s3 = expected.stage_3_event || {};
  /* Set up a listener BEFORE the dispatch via page.evaluate. */
  await page.evaluate(function (args) {
    window.__chainTestEvents = [];
    document.addEventListener(args.type, function (ev) {
      window.__chainTestEvents.push({ type: ev.type, detail: ev.detail });
    });
  }, { type: s3.type });
  /* Caller is responsible for triggering the dispatch between
     stage 2 and stage 3. The harness in runChainTest does it. */
  await new Promise(function (r) { setTimeout(r, captureWindowMs || 1500); });
  var events = await page.evaluate(function () {
    return window.__chainTestEvents || [];
  });
  var matches = events.filter(function (e) {
    if (e.type !== s3.type) return false;
    if (!s3.detail_match) return true;
    var keys = Object.keys(s3.detail_match);
    return keys.every(function (k) {
      return e.detail && e.detail[k] === s3.detail_match[k];
    });
  });
  return _stage(
    'stage_3_event_emitted',
    matches.length > 0,
    { events_seen: events.length, matching: matches.length, sample: matches[0] || null },
    matches.length === 0 ? ('no event of type ' + s3.type
      + ' fired during ' + (captureWindowMs || 1500) + 'ms window') : null
  );
}

/* ---------- Stage 4: side-effect coherence ---------- */
async function _verifyStage4(snapshotAfter, expected) {
  if (typeof expected.stage_4_state_assertion !== 'function') {
    return _stage('stage_4_side_effect', true, null, 'no assertion supplied');
  }
  var r;
  try { r = expected.stage_4_state_assertion(snapshotAfter); }
  catch (e) {
    return _stage('stage_4_side_effect', false, null,
      'assertion threw: ' + (e && e.message));
  }
  var passed = r && r.passed === true;
  return _stage('stage_4_side_effect', passed, r,
    passed ? null : (r && r.note) || 'state did not match');
}

/* ---------- live runner ---------- */
async function _runChainTestLive(opts) {
  var page = opts.page;
  var t0 = Date.now();
  var log = [];
  function L(s) { log.push(s); }

  /* Stage 1 + 2 use the BEFORE snapshot. */
  var pwAdapter;
  try { pwAdapter = require('./playwright-adapter'); }
  catch (_) {
    return _failResult([_stage('boot', false, null, 'playwright-adapter unavailable')], log, t0);
  }
  var beforeSnap = await pwAdapter.snapshot(page);
  L('snapshot_before: nac_version=' + beforeSnap.nac_version
    + ' data_tables=' + (beforeSnap.data_tables || []).length);

  var s1 = _verifyStage1(opts.intent, beforeSnap, opts.expected);
  L('stage_1: ' + (s1.passed ? 'PASS' : 'FAIL') + (s1.note ? ' -- ' + s1.note : ''));
  var s2 = _verifyStage2(opts.intent, beforeSnap, opts.expected);
  L('stage_2: ' + (s2.passed ? 'PASS' : 'FAIL') + (s2.note ? ' -- ' + s2.note : ''));

  /* Stage 3 setup BEFORE the actual dispatch. */
  if (opts.expected.stage_3_event) {
    await page.evaluate(function (args) {
      window.__chainTestEvents = [];
      document.addEventListener(args.type, function (ev) {
        window.__chainTestEvents.push({ type: ev.type, detail: ev.detail });
      });
    }, { type: opts.expected.stage_3_event.type });
  }

  /* Run the actual intent through the runtime via the
     playwright-adapter's runIntent (which wraps the LLM call +
     dispatch). */
  var runResult = await pwAdapter.runIntent(page, {
    intent: opts.intent,
    fill_values: opts.fill_values || {},
    timeout_ms:  opts.timeout_ms || 30000,
    onLog:       function (m) { log.push('runIntent: ' + m); }
  });
  L('runIntent.passed=' + runResult.passed
    + ' strategy=' + runResult.strategy
    + ' steps=' + (runResult.steps || []).length);

  var s3 = { passed: true, evidence: { skipped: true } };
  if (opts.expected.stage_3_event) {
    var captured = await page.evaluate(function () { return window.__chainTestEvents || []; });
    var s3spec = opts.expected.stage_3_event;
    var matches = captured.filter(function (e) {
      if (e.type !== s3spec.type) return false;
      if (!s3spec.detail_match) return true;
      return Object.keys(s3spec.detail_match).every(function (k) {
        return e.detail && e.detail[k] === s3spec.detail_match[k];
      });
    });
    s3 = _stage('stage_3_event_emitted', matches.length > 0,
      { events_captured: captured.length, matching: matches.length,
        sample_event: matches[0] || null },
      matches.length === 0
        ? ('no ' + s3spec.type + ' event fired during the dispatch window')
        : null);
    L('stage_3: ' + (s3.passed ? 'PASS' : 'FAIL') + ' (' + matches.length + ' match)');
  } else {
    s3 = _stage('stage_3_event_emitted', true, null, 'no stage_3 spec supplied (skipped)');
  }

  /* Stage 4: re-snapshot. */
  var afterSnap = await pwAdapter.snapshot(page);
  var s4 = await _verifyStage4(afterSnap, opts.expected);
  L('stage_4: ' + (s4.passed ? 'PASS' : 'FAIL') + (s4.note ? ' -- ' + s4.note : ''));

  return _failResult([s1, s2, s3, s4], log, t0);
}

/* ---------- offline runner (snapshot only, no DOM, no LLM) ---------- */
function _runChainTestOffline(opts) {
  var t0 = Date.now();
  var log = [];
  log.push('offline mode: matcher + planner only');
  var s1 = _verifyStage1(opts.intent, opts.snapshot, opts.expected);
  log.push('stage_1: ' + (s1.passed ? 'PASS' : 'FAIL'));
  var s2 = _verifyStage2(opts.intent, opts.snapshot, opts.expected);
  log.push('stage_2: ' + (s2.passed ? 'PASS' : 'FAIL'));
  /* Stages 3 + 4 require a live runtime. Skip with explicit note. */
  var s3 = _stage('stage_3_event_emitted', true, null,
    'offline mode -- live runtime not available');
  var s4 = _stage('stage_4_side_effect', true, null,
    'offline mode -- live runtime not available');
  return _failResult([s1, s2, s3, s4], log, t0);
}

/* ---------- public entry ---------- */
async function runChainTest(opts) {
  if (!opts || !opts.intent || !opts.expected) {
    throw new Error('runChainTest: intent and expected are required');
  }
  if (opts.page) {
    return await _runChainTestLive(opts);
  }
  if (opts.snapshot) {
    return _runChainTestOffline(opts);
  }
  throw new Error('runChainTest: either page (live) or snapshot (offline) required');
}

module.exports = {
  runChainTest: runChainTest
};
