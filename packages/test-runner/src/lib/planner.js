/* ===============================================================
   planner.js -- intent -> ordered action plan.

   Given:
     - a describe_v2() snapshot of the current page
     - a natural-language intent (or an explicit slug)
     - optional context: locale, preferred_source, max_depth

   Returns a deterministic plan: the sequence of actions a runner
   (Playwright, autopilot in the page, RPA) must execute to fulfil
   the intent. Pure JS, no DOM, fully unit-testable.

   The plan respects spec sec 17.3 authority separation: if the
   resolved slug is in the visible tree, the plan dispatches
   directly. If only the sitemap has it, the plan is a multi-step
   navigation; each step is re-validated against the destination
   page's tree before dispatch (the runner does the re-validation
   when it actually runs).

   Plan shape:
   {
     strategy: 'tree_dispatch' | 'sitemap_navigate' | 'reject',
     resolved_slug: string|null,
     confidence: number,
     steps: [
       { action: 'click'|'fill'|'navigate'|'focus',
         target_slug: string,
         value?: any,
         requires_page_break?: boolean,    // navigate to a new page
         carry_intent_via_query?: string   // resume continuation
       }
     ],
     candidates_top3?: [...],   // present when strategy === 'reject'
     trace: [...]               // human-readable explanation
   }

   ASCII-only.
   =============================================================== */
'use strict';

var matcher = require('./matcher');

function _trace(arr, msg) { arr.push(msg); }

/**
 * Build an action plan for a natural-language intent.
 *
 * @param {object} args
 * @param {string|object} args.intent      -- user phrase, OR { resolved_slug, fill_values? }
 * @param {object}        args.snapshot    -- describe_v2() result
 * @param {string}        [args.locale]    -- preferred user locale (es, en, ...)
 * @param {string}        [args.continuation_query='nac_autopilot'] -- query name carrying intent across pages
 * @param {string}        [args.continuation_value]                 -- value put in the query
 * @param {object}        [args.fill_values]    -- map slug -> value (planner uses for `fill` steps)
 * @returns {object} plan
 */
function plan(args) {
  var trace = [];
  var snapshot = args.snapshot || {};
  var fillValues = args.fill_values || {};
  var continuationQuery = args.continuation_query || 'nac_autopilot';
  var continuationValue = args.continuation_value || null;

  /* ---------- 1. resolve intent to a slug ---------- */
  var resolvedSlug, resolvedSource, confidence, candidates;
  if (typeof args.intent === 'object' && args.intent && args.intent.resolved_slug) {
    resolvedSlug = args.intent.resolved_slug;
    /* find source -- check v2 scopes AND v1 plugins.elements */
    var inV2Tree = (snapshot.v2_scope_entries || []).some(function (e) {
      return e.slug === resolvedSlug;
    });
    var inV1Tree = !!_findInV1Plugins(snapshot, resolvedSlug);
    var inSitemap = (snapshot.sitemap && snapshot.sitemap.paths || []).some(function (p) {
      return p.slug === resolvedSlug;
    });
    resolvedSource = (inV2Tree || inV1Tree) ? 'tree'
                    : (inSitemap ? 'sitemap' : null);
    confidence = 1.0;
    candidates = [];
    _trace(trace, 'explicit slug resolution: ' + resolvedSlug
      + ' (source=' + resolvedSource + ')');
  } else {
    var resolved = matcher.resolveIntent({
      intent: typeof args.intent === 'string' ? args.intent : '',
      snapshot: snapshot,
      preferred_source: args.preferred_source || 'tree'
    });
    resolvedSlug   = resolved.resolved_slug;
    resolvedSource = resolved.resolved_source;
    confidence     = resolved.confidence;
    candidates     = resolved.candidates;
    _trace(trace, 'intent="' + (args.intent || '')
      + '" -> slug=' + (resolvedSlug || '<none>')
      + ' source=' + (resolvedSource || '<none>')
      + ' confidence=' + confidence
      + ' reason=' + resolved.reason);
  }

  /* ---------- 2. reject path (sec 16.4 recovery) ---------- */
  if (!resolvedSlug || !resolvedSource) {
    _trace(trace, 'reject: confidence below threshold OR slug not in tree+sitemap');
    return {
      strategy: 'reject',
      resolved_slug: null,
      confidence: confidence,
      steps: [],
      candidates_top3: candidates,
      trace: trace
    };
  }

  /* ---------- 3. tree-dispatch path ---------- */
  if (resolvedSource === 'tree') {
    var entry = (snapshot.v2_scope_entries || []).filter(function (e) {
      return e.slug === resolvedSlug;
    })[0]
    || _findInV1Plugins(snapshot, resolvedSlug);
    var role = (entry && entry.role) || null;
    var step = {
      action: _roleToAction(role, fillValues, resolvedSlug),
      target_slug: resolvedSlug
    };
    if (step.action === 'fill' && Object.prototype.hasOwnProperty.call(fillValues, resolvedSlug)) {
      step.value = fillValues[resolvedSlug];
    }
    _trace(trace, 'tree_dispatch: 1 step (' + step.action + ' ' + step.target_slug + ')');
    return {
      strategy: 'tree_dispatch',
      resolved_slug: resolvedSlug,
      confidence: confidence,
      steps: [step],
      trace: trace
    };
  }

  /* ---------- 4. sitemap-navigate path ---------- */
  if (resolvedSource === 'sitemap') {
    var path = (snapshot.sitemap.paths || []).filter(function (p) {
      return p.slug === resolvedSlug;
    })[0];
    if (!path || !Array.isArray(path.affordance_to_navigate) || !path.affordance_to_navigate.length) {
      _trace(trace, 'reject: sitemap entry missing affordance_to_navigate');
      return {
        strategy: 'reject',
        resolved_slug: null,
        confidence: confidence,
        steps: [],
        candidates_top3: candidates,
        trace: trace
      };
    }
    var steps = path.affordance_to_navigate.map(function (a, idx) {
      var step = {
        action: a.action || 'click',
        target_slug: a.target,
      };
      /* The first nav step typically lives on the current page; the
         click on a real anchor causes the browser to navigate. The
         runner is responsible for detecting the page break and
         carrying the continuation query (nac_autopilot=...). We
         flag the first step so the runner knows to instrument the
         href before clicking. */
      if (idx === 0) {
        step.requires_page_break_guard = true;
        if (continuationValue) {
          step.carry_intent_via_query = continuationQuery + '=' + continuationValue;
        }
      }
      return step;
    });
    /* If the caller declared fill_values for the resolved slug + the
       slug itself looks like an action ending (like .save), tack on a
       final dispatch step that the continuation will execute on the
       destination page. */
    if (Object.keys(fillValues).length) {
      Object.keys(fillValues).forEach(function (k) {
        steps.push({
          action: 'fill',
          target_slug: k,
          value: fillValues[k],
          on_continuation: true
        });
      });
    }
    _trace(trace, 'sitemap_navigate: ' + steps.length + ' step(s) planned via '
      + path.affordance_to_navigate.length + '-step affordance');
    return {
      strategy: 'sitemap_navigate',
      resolved_slug: resolvedSlug,
      confidence: confidence,
      steps: steps,
      trace: trace
    };
  }

  /* unreachable */
  return {
    strategy: 'reject',
    resolved_slug: null,
    confidence: 0,
    steps: [],
    candidates_top3: candidates,
    trace: trace
  };
}

function _findInV1Plugins(snapshot, slug) {
  var plugins = snapshot.v1_plugins || [];
  for (var i = 0; i < plugins.length; i++) {
    var els = plugins[i].elements || [];
    for (var j = 0; j < els.length; j++) {
      if (els[j].id === slug) return els[j];
    }
  }
  return null;
}

function _roleToAction(role, fillValues, slug) {
  /* explicit fill_values override -- caller wants to fill */
  if (Object.prototype.hasOwnProperty.call(fillValues, slug)) return 'fill';
  switch (role) {
    case 'textbox':
    case 'searchbox':
    case 'combobox':
    case 'spinbutton':
      return 'fill';
    case 'navigation':
    case 'link':
      return 'click';
    case 'button':
    case 'action':
    default:
      return 'click';
  }
}

module.exports = { plan: plan };
