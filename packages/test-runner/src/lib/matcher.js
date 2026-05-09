/* ===============================================================
   matcher.js -- intent-to-slug resolution.

   Takes a natural-language intent and a describe_v2() snapshot,
   returns the best slug match plus the top-3 candidates (used
   for the recovery affordance contract, sec 16.4).

   Pure JS, zero dependencies, deterministic. Same algorithm runs
   in node (planning tests) and in the browser (autopilot).

   Matching strategy (in order):
     1. Exact slug match.                            score = 1.0
     2. label_i18n exact match in any locale.        score = 0.95
     3. label_i18n contains intent token.            score = 0.7..0.85
        (longer prefix match scores higher)
     4. Slug contains every word of the intent.      score = 0.6..0.75
     5. Levenshtein < 30%.                           score = 0.3..0.5

   ASCII-only.
   =============================================================== */
'use strict';

/* ---------- normalisation ---------- */
function _norm(s) {
  if (s == null) return '';
  /* lowercase + strip diacritics + collapse whitespace.
     Combining diacritics block U+0300..U+036F written as a
     unicode-escape regex to keep this file 100% ASCII. */
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function _tokens(s) {
  return _norm(s).split(/[^a-z0-9]+/).filter(Boolean);
}

/* ---------- Levenshtein ---------- */
function _lev(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  var m = a.length, n = b.length;
  var prev = new Array(n + 1);
  var cur  = new Array(n + 1);
  for (var j = 0; j <= n; j++) prev[j] = j;
  for (var i = 1; i <= m; i++) {
    cur[0] = i;
    for (var k = 1; k <= n; k++) {
      var cost = a.charCodeAt(i - 1) === b.charCodeAt(k - 1) ? 0 : 1;
      cur[k] = Math.min(
        prev[k] + 1,
        cur[k - 1] + 1,
        prev[k - 1] + cost
      );
    }
    for (var x = 0; x <= n; x++) prev[x] = cur[x];
  }
  return prev[n];
}

/* ---------- candidate building ---------- */

/* Each candidate is { slug, source: 'tree'|'sitemap', label_i18n, role }. */
function _collectCandidates(snapshot) {
  var out = [];
  if (snapshot && Array.isArray(snapshot.v2_scope_entries)) {
    snapshot.v2_scope_entries.forEach(function (e) {
      out.push({
        slug: e.slug,
        source: 'tree',
        label_i18n: e.label_i18n || null,
        role: e.role || null
      });
    });
  }
  /* v1 plugins exposed by describe_v2() too. Each element keeps
     its actions[] array so the scorer can search action labels. */
  if (snapshot && Array.isArray(snapshot.v1_plugins)) {
    snapshot.v1_plugins.forEach(function (plugin) {
      if (Array.isArray(plugin.elements)) {
        plugin.elements.forEach(function (el) {
          out.push({
            slug: el.id,
            source: 'tree',
            label_i18n: el.label_i18n || null,
            role: el.role || null,
            actions: el.actions || null
          });
        });
      }
    });
  }
  if (snapshot && snapshot.sitemap && Array.isArray(snapshot.sitemap.paths)) {
    snapshot.sitemap.paths.forEach(function (p) {
      out.push({
        slug: p.slug,
        source: 'sitemap',
        label_i18n: p.label_i18n || null,
        role: null,
        affordance_to_navigate: p.affordance_to_navigate || null,
        tags: p.tags || null
      });
    });
  }
  return out;
}

/* ---------- scoring ---------- */
function _scoreCandidate(intentNorm, intentTokens, cand) {
  /* 1. Exact slug match */
  if (_norm(cand.slug) === intentNorm) {
    return { score: 1.0, reason: 'slug_exact' };
  }
  /* 2. label_i18n exact match in any locale */
  if (cand.label_i18n) {
    var locales = Object.keys(cand.label_i18n);
    for (var i = 0; i < locales.length; i++) {
      var lab = _norm(cand.label_i18n[locales[i]]);
      if (lab === intentNorm) {
        return { score: 0.95, reason: 'label_exact:' + locales[i] };
      }
    }
  }
  /* 3. label_i18n contains every intent token (in any locale).
        Search both element-level label_i18n and action-level
        labels (actions[i].label_i18n) so manifests that put the
        verb's user-facing string under actions[] don't get
        dropped. */
  var labelBags = [];
  if (cand.label_i18n) labelBags.push(cand.label_i18n);
  if (Array.isArray(cand.actions)) {
    cand.actions.forEach(function (a) {
      if (a && a.label_i18n) labelBags.push(a.label_i18n);
    });
  }
  for (var bagIdx = 0; bagIdx < labelBags.length; bagIdx++) {
    var bag = labelBags[bagIdx];
    var locs = Object.keys(bag);
    for (var j = 0; j < locs.length; j++) {
      var labN = _norm(bag[locs[j]]);
      var hits = 0;
      for (var k = 0; k < intentTokens.length; k++) {
        if (labN.indexOf(intentTokens[k]) >= 0) hits++;
      }
      if (intentTokens.length > 0 && hits === intentTokens.length) {
        /* full match -- score scales by token count and locale */
        var s = 0.7 + Math.min(0.15, intentTokens.length * 0.03);
        return { score: s, reason: 'label_contains_all:' + locs[j] };
      }
      /* partial token match. Threshold is half the tokens (with
         floor 1) so a 2-token intent matches on at least 1 hit
         and a 4-token intent on at least 2. This keeps stopword
         tolerance ("open Settings" -> 1 hit on "settings" is
         enough) while preventing single-token false positives
         on long intents. */
      var minHits = Math.max(1, Math.floor(intentTokens.length / 2));
      if (intentTokens.length > 0 && hits >= minHits) {
        return { score: 0.5 + 0.2 * (hits / intentTokens.length),
                 reason: 'label_contains_some:' + locs[j] };
      }
    }
  }
  /* 4. Slug contains every intent token (e.g. "smtp" matches "settings.system.smtp") */
  var slugN = _norm(cand.slug);
  var slugHits = 0;
  for (var x = 0; x < intentTokens.length; x++) {
    if (slugN.indexOf(intentTokens[x]) >= 0) slugHits++;
  }
  if (intentTokens.length > 0 && slugHits === intentTokens.length) {
    return { score: 0.6 + Math.min(0.15, intentTokens.length * 0.03),
             reason: 'slug_contains_all' };
  }
  if (intentTokens.length > 0 && slugHits > 0) {
    return { score: 0.3 + 0.25 * (slugHits / intentTokens.length),
             reason: 'slug_contains_some' };
  }
  /* 5. Levenshtein on slug or normalised first label */
  var dist = _lev(slugN, intentNorm);
  var maxLen = Math.max(slugN.length, intentNorm.length, 1);
  var ratio = dist / maxLen;
  if (ratio < 0.3) {
    return { score: 0.5 - ratio, reason: 'lev_slug:' + dist };
  }
  return { score: 0, reason: 'no_match' };
}

/* ---------- public API ---------- */

/**
 * Resolve a natural-language intent to the best matching slug.
 *
 * @param {object} args
 * @param {string} args.intent             -- user phrase, any locale
 * @param {object} args.snapshot           -- describe_v2() result
 * @param {string} [args.preferred_source] -- 'tree' or 'sitemap' (when both match equally)
 * @returns {{
 *   resolved_slug:  string|null,
 *   resolved_source:'tree'|'sitemap'|null,
 *   confidence:     number,
 *   reason:         string,
 *   candidates:     Array<{slug, score, source, reason}>
 * }}
 */
function resolveIntent(args) {
  var intent = args.intent;
  var snapshot = args.snapshot;
  var preferred = args.preferred_source || null;
  if (typeof intent !== 'string' || !intent.trim()) {
    return {
      resolved_slug: null, resolved_source: null,
      confidence: 0, reason: 'empty_intent', candidates: []
    };
  }
  var intentNorm = _norm(intent);
  var intentTokens = _tokens(intent);
  var cands = _collectCandidates(snapshot);
  var scored = cands.map(function (c) {
    var s = _scoreCandidate(intentNorm, intentTokens, c);
    return Object.assign({}, c, { score: s.score, reason: s.reason });
  })
  .filter(function (c) { return c.score > 0; })
  /* prefer tree-source on score tie if caller asked, else higher score wins */
  .sort(function (a, b) {
    if (a.score !== b.score) return b.score - a.score;
    if (preferred && a.source === preferred && b.source !== preferred) return -1;
    if (preferred && b.source === preferred && a.source !== preferred) return 1;
    /* default: tree wins ties (visible-tree-is-authority bias) */
    if (a.source === 'tree' && b.source !== 'tree') return -1;
    if (b.source === 'tree' && a.source !== 'tree') return 1;
    return 0;
  });

  if (!scored.length) {
    return {
      resolved_slug: null, resolved_source: null,
      confidence: 0, reason: 'no_candidates', candidates: []
    };
  }
  var top = scored[0];
  /* threshold: confidence < 0.4 means the top match is a stretch
     and the recovery affordance contract should kick in (sec 16.4). */
  if (top.score < 0.4) {
    return {
      resolved_slug: null, resolved_source: null,
      confidence: top.score, reason: 'below_threshold',
      candidates: scored.slice(0, 3).map(function (c) {
        return { slug: c.slug, score: c.score, source: c.source, reason: c.reason };
      })
    };
  }
  return {
    resolved_slug:   top.slug,
    resolved_source: top.source,
    confidence:      top.score,
    reason:          top.reason,
    candidates:      scored.slice(0, 3).map(function (c) {
      return { slug: c.slug, score: c.score, source: c.source, reason: c.reason };
    })
  };
}

module.exports = {
  resolveIntent: resolveIntent,
  /* exposed for unit tests */
  _norm: _norm,
  _tokens: _tokens,
  _lev: _lev,
  _collectCandidates: _collectCandidates
};
