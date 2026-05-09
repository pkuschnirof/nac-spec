/* ===============================================================
   nac-v2-extensions.js -- NAC v2.0 additive extensions to v1.9
   ---------------------------------------------------------------
   Strict superset: this file LOADS AFTER nac.js v1.9.0 and ATTACHES
   the v2.0 primitives onto window.NAC without modifying the v1.9
   surface. Every v1.9 client keeps working unchanged.

   Provides:
     - NAC.scope(spec)                      hierarchical constructor
     - NAC.autoRegister(el, opts)           DOM-driven registration
     - NAC.adopt(rule)                      third-party non-compliant
     - NAC.bridgeShadowRoot(host)           Shadow DOM bridge
     - NAC.bridgeIframe(iframeEl, opts)     same-vendor iframe bridge
     - NAC.declareVirtual(spec)             virtualized lists
     - NAC.captureEphemeral(opts)           transient UI capture
     - NAC.setTenantPrefix(slug)            multi-tenant naming
     - NAC.attestUserGesture(opts)          isTrusted attestation
     - NAC.t(key, opts?)                    i18n resolver
     - NAC.registerCatalog(catalog)         i18n catalog registration
     - NAC.locale(code?)                    locale getter/setter
     - NAC.setSupportedLocales(arr)         extend supported list
     - NAC.setRTLLocales(arr)               extend RTL list
     - NAC.set_provenance_secret(secret)    HMAC secret registration

   And tightens (only at NAC-3):
     - check_canonical_shape: agent must sign + user_gesture_attested
     - validate_global: i18n_strict mode

   Spec: spec/NAC-v2.0.md + RFC_v2.0.0.md
   ASCII-only.
   =============================================================== */
(function (global) {
  'use strict';
  if (!global.NAC) {
    console.error('[NAC v2] requires nac.js v1.9.0+ to be loaded first');
    return;
  }
  if (global.NAC.__nac_v2_installed) return;
  global.NAC.__nac_v2_installed = true;

  var NAC = global.NAC;
  var SEPARATOR = '.';
  var MAX_DEPTH = 6;
  var WARN_DEPTH = 4;

  /* ------------------------------------------------------------- locales */

  var SUPPORTED_LOCALES_DEFAULT = ['es','en','pt','fr','it','de','ja','zh','hi','ar'];
  var RTL_LOCALES_DEFAULT       = ['ar','he','fa','ur'];
  var _supported = SUPPORTED_LOCALES_DEFAULT.slice();
  var _rtl       = RTL_LOCALES_DEFAULT.slice();
  var _currentLocale = (function () {
    try {
      var l = (document.documentElement.getAttribute('lang')
            || navigator.language
            || 'es').slice(0, 2).toLowerCase();
      return _supported.indexOf(l) >= 0 ? l : 'es';
    } catch (_) { return 'es'; }
  })();
  var _catalog = Object.create(null);

  function setSupportedLocales(arr) {
    if (!Array.isArray(arr) || !arr.length) {
      throw new Error('[NAC v2] setSupportedLocales requires non-empty array');
    }
    _supported = arr.slice();
  }
  function setRTLLocales(arr) {
    if (!Array.isArray(arr)) throw new Error('[NAC v2] setRTLLocales requires array');
    _rtl = arr.slice();
  }
  /* v2.0-rc3 (Claude T5-F4): some hosts ship multi-locale
     content in one DOM (e.g. user in 'ar' viewing untranslated
     English log lines); auto-flipping dir=rtl on documentElement
     globally breaks the LTR content's BIDI. Hosts opt out via
     setAutoRTL(false), then manage dir on a sub-tree element. */
  var _autoRTL = true;
  function setAutoRTL(enabled) { _autoRTL = !!enabled; }

  function locale(code) {
    if (code === undefined) return _currentLocale;
    if (_supported.indexOf(code) < 0) {
      console.warn('[NAC v2] locale', code, 'not in supported list');
    }
    _currentLocale = code;
    /* Auto-apply dir=rtl unless host opted out via setAutoRTL(false). */
    if (_autoRTL) {
      try {
        if (_rtl.indexOf(code) >= 0) {
          document.documentElement.setAttribute('dir', 'rtl');
        } else {
          document.documentElement.removeAttribute('dir');
        }
      } catch (_) {}
    }
    document.dispatchEvent(new CustomEvent('nac:locale_changed', {
      detail: { locale: code, autoRTL: _autoRTL }, bubbles: true
    }));
  }
  function registerCatalog(obj) {
    if (!obj || typeof obj !== 'object') {
      throw new Error('[NAC v2] registerCatalog requires object');
    }
    Object.keys(obj).forEach(function (k) { _catalog[k] = obj[k]; });
  }
  function t(key, opts) {
    opts = opts || {};
    var loc = opts.locale || _currentLocale;
    var entry = _catalog[key];
    if (!entry) return opts.fallback || key;
    if (entry[loc]) return entry[loc];
    /* Fallback chain: requested -> es -> en -> first available */
    if (entry.es) return entry.es;
    if (entry.en) return entry.en;
    var firstKey = Object.keys(entry)[0];
    return firstKey ? entry[firstKey] : (opts.fallback || key);
  }

  /* ------------------------------------------------------------- HMAC */

  var _provenanceSecrets = [];
  function set_provenance_secret(s) {
    if (typeof s === 'string') _provenanceSecrets = [s];
    else if (Array.isArray(s)) _provenanceSecrets = s.slice();
    else if (s == null) _provenanceSecrets = [];
    else throw new Error('[NAC v2] set_provenance_secret expects string|string[]');
    /* v2.0-rc3 (Claude T6-F2): warm the crypto path now that we
       have a secret registered; first agent sign won't pay the
       cold-start cost. */
    if (_provenanceSecrets[0] && typeof NAC.sign_provenance === 'function') {
      try {
        NAC.sign_provenance({ _warmup: true, ts: Date.now() }, _provenanceSecrets[0])
          .catch(function () {});
      } catch (_) {}
    }
  }
  /* sign / verify provenance helpers exist in v1.9 already; reuse them */
  function _hasSecrets() { return _provenanceSecrets.length > 0; }

  async function _verify_with_registered(detail) {
    if (!_hasSecrets()) return false;
    if (typeof NAC.verify_provenance !== 'function') return false;
    for (var i = 0; i < _provenanceSecrets.length; i++) {
      try {
        var ok = await NAC.verify_provenance(detail, _provenanceSecrets[i]);
        if (ok) return true;
      } catch (_) {}
    }
    return false;
  }

  /* ------------------------------------------------------------- isTrusted */

  /* v2.0-rc3 (Claude T4-F1 BLOCKER fix): the gesture buffer is now
     bound to the originating event's composedPath, NOT a global
     flag. _readGestureAttested(forElement) verifies that the
     element being invoked is in the captured path before honoring
     attested. Without this, any user click anywhere on the page
     leaked attested=true to ANY subsequent _invoke within the
     freshness window -- the FOURTH impersonation path Claude
     surfaced.

     Additionally: GESTURE_FRESH_MS reduced 100ms -> 16ms (one
     animation frame). Genuine click handlers run synchronously
     (or via microtask), well within 16ms. Promise-resolved-later
     handlers no longer count as user-attested -- which is the
     security-correct behaviour. */
  var _lastGestureTrusted = null;
  var _lastGestureTime = 0;
  var _lastGesturePath = null;          /* Array<EventTarget> from e.composedPath() */
  var GESTURE_FRESH_MS = 16;             /* was 100 in rc2 */

  /* v2.0-rc2 (Mistral T4-F1): mobile WebView contexts (Cordova,
     Capacitor, React Native WebView) have inconsistent isTrusted
     semantics. Hosts running in those environments register a
     custom derivation function via setMobileWebViewAttestation so
     the platform-specific signal substitutes for browser
     event.isTrusted. */
  var _mobileWebViewAttestor = null;

  function setMobileWebViewAttestation(fn) {
    if (fn != null && typeof fn !== 'function') {
      throw new Error('[NAC v2] setMobileWebViewAttestation expects function|null');
    }
    _mobileWebViewAttestor = fn;
  }

  function _captureGestureFromDom() {
    var handler = function (e) {
      /* When a custom WebView attestor is registered, its return
         value (or function call given the event) substitutes the
         raw isTrusted reading. */
      if (_mobileWebViewAttestor) {
        try {
          var attested = !!_mobileWebViewAttestor(e);
          _lastGestureTrusted = attested;
        } catch (err) {
          _lastGestureTrusted = !!e.isTrusted;
        }
      } else {
        _lastGestureTrusted = !!e.isTrusted;
      }
      _lastGestureTime = Date.now();
      /* v2.0-rc3: capture the composed path so _invoke can verify
         identity. Polyfill for ancient browsers via target ancestor
         walk (composedPath() ships in all browsers >= 2018). */
      try {
        if (typeof e.composedPath === 'function') {
          _lastGesturePath = e.composedPath();
        } else {
          _lastGesturePath = [];
          var n = e.target;
          while (n) { _lastGesturePath.push(n); n = n.parentNode; }
        }
      } catch (_) {
        _lastGesturePath = e.target ? [e.target] : [];
      }
    };
    ['click','keydown','keyup','touchstart','pointerdown'].forEach(function (n) {
      document.addEventListener(n, handler, { capture: true, passive: true });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _captureGestureFromDom);
  } else {
    _captureGestureFromDom();
  }

  /* v2.0-rc3: _readGestureAttested now requires the element being
     invoked. Returns the captured attested flag ONLY if:
       (a) the gesture is within GESTURE_FRESH_MS (16ms) AND
       (b) `forElement` is in the captured composedPath (or no
           element was captured -- legacy callers).
     Returns null in all other cases (matrix treats null as
     not-attested -> 'user' source rejected at NAC-3). */
  function _readGestureAttested(forElement) {
    if (Date.now() - _lastGestureTime > GESTURE_FRESH_MS) return null;
    if (!forElement) return _lastGestureTrusted; /* legacy fallback */
    if (!_lastGesturePath || !_lastGesturePath.length) return _lastGestureTrusted;
    /* Identity check: only honor attested when the target element
       is in the originating event's path. Closes Claude T4-F1. */
    if (_lastGesturePath.indexOf(forElement) >= 0) {
      return _lastGestureTrusted;
    }
    return null;
  }

  var _scriptOverride = null;
  function attestUserGesture(opts) {
    opts = opts || {};
    _scriptOverride = {
      trusted: !!opts.trusted,
      type: opts.type || 'script',
      ts: Date.now()
    };
  }

  /* ------------------------------------------------------------- perf tolerance */

  /* v2.0-rc2 (Grok+Mistral T6-F1): default throttle bumped 50ms ->
     100ms after concurrent reviewer feedback that 50ms drops
     events on bursty UIs. set_perf_tolerance({mutation_throttle_ms,
     describe_target_ms, etc}) lets hosts tune for their workload. */
  var _perfTolerance = {
    mutation_throttle_ms: 100,        /* was 50 in rc1 */
    describe_target_ms: 50,            /* was 30 in rc1 (Mistral T6-F2) */
    describe_hard_fail_ms: 150,        /* was 100 in rc1 */
    adopt_hard_fail_ms: 20,            /* was 15 in rc1 */
    autoregister_hard_fail_ms: 5
  };

  function set_perf_tolerance(opts) {
    if (!opts || typeof opts !== 'object') {
      throw new Error('[NAC v2] set_perf_tolerance expects object');
    }
    Object.keys(opts).forEach(function (k) {
      if (k in _perfTolerance && typeof opts[k] === 'number' && opts[k] > 0) {
        _perfTolerance[k] = opts[k];
      }
    });
  }
  function get_perf_tolerance() { return Object.assign({}, _perfTolerance); }

  /* ------------------------------------------------------------- validation tolerance */

  /* v2.0-rc2 (Grok T5-F1 + Mistral T5-F2): NAC-3 default i18n
     severity bumped from 'error' to 'warn' after concurrent
     reviewer feedback that mandatory at NAC-3 blocks incremental
     SaaS rollouts. Hosts that want strict 'error' behaviour opt
     in via set_validation_tolerance({i18n_strict: 'error'}). */
  var _validationTolerance = {
    i18n_strict: 'warn'  /* 'warn' (default) | 'error' | 'silent' */
  };

  function set_validation_tolerance(opts) {
    if (!opts || typeof opts !== 'object') {
      throw new Error('[NAC v2] set_validation_tolerance expects object');
    }
    if (opts.i18n_strict && ['warn', 'error', 'silent'].indexOf(opts.i18n_strict) >= 0) {
      _validationTolerance.i18n_strict = opts.i18n_strict;
    }
  }
  function get_validation_tolerance() { return Object.assign({}, _validationTolerance); }

  /* ------------------------------------------------------------- scope */

  var _scopes = Object.create(null);

  function _validateLeaf(slug) {
    if (!slug || typeof slug !== 'string') {
      throw new Error('[NAC v2] slug required');
    }
    /* v2.0-rc3 (DeepSeek T3.1): empty string passes the typeof
       check + indexOf check, then produces malformed slugs. Reject
       it explicitly. */
    if (slug.length === 0) {
      throw new Error('[NAC v2] slug_invalid: empty string');
    }
    if (slug.indexOf(SEPARATOR) >= 0) {
      throw new Error('[NAC v2] slug_invalid: contains "' + SEPARATOR + '"');
    }
  }

  function scope(spec) {
    spec = spec || {};
    _validateLeaf(spec.slug);
    return _makeSubScope(spec.slug, [spec.slug], spec);
  }

  function _makeSubScope(currentSlug, chain, spec) {
    var depth = chain.length;
    if (depth > MAX_DEPTH) {
      throw new Error('[NAC v2] depth_exceeded: ' + chain.join(SEPARATOR));
    }
    if (depth === WARN_DEPTH + 1) {
      document.dispatchEvent(new CustomEvent('nac:depth_warn', {
        detail: { path: chain.join(SEPARATOR), depth: depth }, bubbles: true
      }));
    }

    var node = {
      id:    chain.join(SEPARATOR),
      depth: depth,
      label_i18n: spec ? spec.label_i18n || null : null,
    };
    /* v2.0-rc3 (Claude T3.1): track intermediate nodes that carry
       a label_i18n so describe_v2 can expose them. Leaf nodes go
       through register() and end up in _scopes; intermediate
       (non-leaf) nodes need a separate index. */
    if (node.label_i18n) {
      _intermediateScopes[node.id] = {
        depth: depth,
        label_i18n: node.label_i18n
      };
    }
    Object.assign(node, {

      scope: function (childSpec) {
        _validateLeaf(childSpec.slug);
        var childChain = chain.concat([childSpec.slug]);
        return _makeSubScope(childSpec.slug, childChain, childSpec);
      },

      register: function (regSpec) {
        _validateLeaf(regSpec.slug);
        var fullSlug = chain.concat([regSpec.slug]).join(SEPARATOR);

        var entry = {
          slug:        fullSlug,
          intent:      regSpec.intent || 'navigate',
          source:      regSpec.source || 'human',
          label_i18n:  regSpec.label_i18n || null,
          desc_i18n:   regSpec.desc_i18n || null,
          a11y_hint:   regSpec.a11y_hint || null,
          irreversible:!!regSpec.irreversible,
          role:        regSpec.role || null,
          element:     regSpec.element || null,
          handler:     typeof regSpec.handler === 'function' ? regSpec.handler : null,
          autoderived: false,
          parent_chain: chain.slice(),
          registered_at: Date.now()
        };

        /* Idempotent: re-register with same slug + same element silently
           updates; re-register with same slug + different element warns. */
        var prior = _scopes[fullSlug];
        if (prior) {
          if (prior.element === entry.element) {
            _scopes[fullSlug] = entry;
          } else {
            document.dispatchEvent(new CustomEvent('nac:duplicate_warn', {
              detail: { slug: fullSlug, prior: prior, next: entry }, bubbles: true
            }));
            _scopes[fullSlug] = entry; /* last-wins */
          }
        } else {
          _scopes[fullSlug] = entry;
        }

        if (entry.element) {
          entry.element.setAttribute('data-nac-id', fullSlug);
          entry.element.setAttribute('data-nac-parent', chain.join(' '));
          if (entry.role) entry.element.setAttribute('role', entry.role);
          if (entry.label_i18n) {
            var lbl = t.bind(null);
            var labelText = (function () {
              if (entry.label_i18n[_currentLocale]) return entry.label_i18n[_currentLocale];
              if (entry.label_i18n.es) return entry.label_i18n.es;
              if (entry.label_i18n.en) return entry.label_i18n.en;
              return fullSlug;
            })();
            if (!entry.element.getAttribute('aria-label')) {
              entry.element.setAttribute('aria-label', labelText);
            }
          }
          if (entry.irreversible) {
            entry.element.setAttribute('data-nac-irreversible', '1');
          }
        }

        return {
          id: fullSlug,
          invoke: function (params) { return _invoke(fullSlug, params); }
        };
      }
    });
    return node;
  }

  function _invoke(slug, params) {
    var entry = _scopes[slug];
    if (!entry) return Promise.reject(new Error('unknown_slug:' + slug));
    var src = (params && params.source) || entry.source || 'human';

    var attested;
    if (_scriptOverride && Date.now() - _scriptOverride.ts < GESTURE_FRESH_MS) {
      attested = _scriptOverride.trusted;
      _scriptOverride = null;
    } else {
      /* v2.0-rc3 (Claude T4-F1 BLOCKER fix): pass entry.element so
         _readGestureAttested can verify identity, not just freshness.
         Closes the gesture-buffer leak. */
      attested = _readGestureAttested(entry.element);
    }

    /* v2.0-rc3 (Claude T4-F3): os_level pass-through. When source is
       'agent' AND host opts in (e.g. for Computer Use telemetry),
       params.os_level is propagated into provenance for audit. */
    var osLevel = (params && params.os_level === true) ? true : null;

    var prov = {
      slug:    slug,
      intent:  entry.intent,
      source:  src,
      type:    src,
      user_gesture_attested: attested,
      ts:      Date.now(),
      params:  params || null
    };
    if (osLevel === true) prov.os_level = true;

    /* Agent + irreversible -> decline path */
    if (src === 'agent' && entry.irreversible) {
      var hint = entry.a11y_hint
        ? (entry.a11y_hint[_currentLocale] || entry.a11y_hint.es)
        : null;
      document.dispatchEvent(new CustomEvent('nac:command_rejected', {
        detail: { slug: slug, reason: 'agent_declined_irreversible', hint: hint, ts: Date.now() },
        bubbles: true
      }));
      return Promise.reject(new Error('agent_declined_irreversible'));
    }

    /* Sign if we can (agent must) */
    var signPromise;
    if (typeof NAC.sign_provenance === 'function' && _provenanceSecrets[0]) {
      signPromise = NAC.sign_provenance(prov, _provenanceSecrets[0]);
    } else {
      signPromise = Promise.resolve(null);
    }

    return signPromise.then(function (sig) {
      if (sig) prov.signature = sig;
      var detail = { provenance: prov, signature: sig, version: 'v2.0' };
      document.dispatchEvent(new CustomEvent('nac:command_pending', {
        detail: detail, bubbles: true
      }));
      var run = entry.handler
        ? Promise.resolve().then(function () { return entry.handler(params || {}, detail); })
        : Promise.resolve(null);
      return run.then(function (result) {
        document.dispatchEvent(new CustomEvent('nac:command_done', {
          detail: Object.assign({}, detail, { result: result }), bubbles: true
        }));
        return result;
      }, function (err) {
        document.dispatchEvent(new CustomEvent('nac:command_failed', {
          detail: Object.assign({}, detail, { error: String(err) }), bubbles: true
        }));
        throw err;
      });
    });
  }

  /* ------------------------------------------------------------- autoRegister */

  function _findScopeAncestor(el) {
    var anc = el.parentElement;
    while (anc) {
      if (anc.hasAttribute && anc.hasAttribute('data-nac-scope')) {
        return anc.getAttribute('data-nac-scope');
      }
      anc = anc.parentElement;
    }
    return null;
  }

  function _deriveLeafSlug(el) {
    if (el.id) return el.id;
    if (el.dataset && el.dataset.nacAction) return el.dataset.nacAction;
    /* v2.0-rc3 (Claude T3.2): the rc1 fallback hashed only
       el.outerHTML.slice(0,100) which produces identical hashes for
       400 cards rendered from the same template (template prefixes
       are byte-identical). The fix mixes in: tag name + textContent
       (more discriminating) + position-in-parent (guaranteed
       unique). Collisions still possible when two truly identical
       elements exist; idempotent register handles those by
       last-wins-same-element. */
    var src = '';
    src += el.tagName || '';
    src += '|';
    src += (el.textContent || '').trim().slice(0, 60);
    src += '|';
    if (el.parentNode) {
      try {
        var siblings = el.parentNode.children;
        for (var s = 0; s < siblings.length; s++) {
          if (siblings[s] === el) { src += '@' + s; break; }
        }
      } catch (_) {}
    }
    src += '|';
    src += (el.outerHTML || '').slice(0, 80);
    var h = 0;
    for (var i = 0; i < src.length; i++) {
      h = ((h << 5) - h) + src.charCodeAt(i);
      h |= 0;
    }
    return 'auto_' + (Math.abs(h)).toString(36);
  }

  function _deriveRole(el) {
    var tag = el.tagName.toLowerCase();
    var attrRole = el.getAttribute('role');
    if (attrRole) return attrRole;
    if (tag === 'button') return 'button';
    if (tag === 'a' && el.hasAttribute('href')) return 'link';
    if (tag === 'input') {
      var t = el.getAttribute('type') || 'text';
      if (t === 'checkbox' || t === 'radio') return 'toggle';
      return 'field';
    }
    if (tag === 'textarea') return 'field';
    if (tag === 'select') return 'select';
    return 'interactive';
  }

  function _deriveLabel(el) {
    var aria = el.getAttribute('aria-label');
    if (aria) return aria;
    return (el.textContent || '').trim().slice(0, 200);
  }

  function autoRegister(el, opts) {
    opts = opts || {};
    if (!el) throw new Error('[NAC v2] autoRegister requires element');
    var leaf = _deriveLeafSlug(el);
    var parentSlug = opts.inheritScope !== false ? _findScopeAncestor(el) : null;
    /* v2.0-rc3 (DeepSeek T3.2): warn on orphan slugs (no parent
       scope ancestor found). Easy to happen on pages with multiple
       dynamic regions; without a warn the slug ends up huerfano
       silently. */
    if (opts.inheritScope !== false && !parentSlug) {
      try {
        document.dispatchEvent(new CustomEvent('nac:autoregister_orphan_warn', {
          detail: { leaf: leaf, element: el }, bubbles: true
        }));
      } catch (_) {}
    }
    var fullSlug = parentSlug ? (parentSlug + SEPARATOR + leaf) : leaf;

    /* i18n strict check */
    var i18nKey = el.getAttribute('data-i18n-key');
    var labelI18n = null;
    var autoderived = false;
    if (i18nKey && _catalog[i18nKey]) {
      labelI18n = _catalog[i18nKey];
    } else if (i18nKey) {
      /* Key declared but catalog missing the entry */
      if (opts.i18n_strict !== false) {
        document.dispatchEvent(new CustomEvent('nac:i18n_skipped', {
          detail: { slug: fullSlug, key: i18nKey, reason: 'catalog_missing' },
          bubbles: true
        }));
        return null;
      }
    } else {
      /* No data-i18n-key. In strict (default) we skip; in permissive
         we mono-locale fallback */
      if (opts.i18n_strict !== false && opts.i18n_strict !== 'permissive') {
        document.dispatchEvent(new CustomEvent('nac:i18n_skipped', {
          detail: { slug: fullSlug, reason: 'no_data_i18n_key' },
          bubbles: true
        }));
        return null;
      }
      var derivedLabel = _deriveLabel(el);
      labelI18n = {};
      labelI18n[_currentLocale] = derivedLabel;
      autoderived = true;
    }

    var role = (opts.derive && opts.derive.role === 'auto')
      ? _deriveRole(el)
      : (opts.derive && opts.derive.role) || _deriveRole(el);

    var entry = {
      slug:        fullSlug,
      intent:      'navigate',
      source:      'human',
      label_i18n:  labelI18n,
      role:        role,
      element:     el,
      autoderived: autoderived,
      registered_at: Date.now()
    };
    _scopes[fullSlug] = entry;
    el.setAttribute('data-nac-id', fullSlug);
    if (parentSlug) {
      el.setAttribute('data-nac-parent', parentSlug.split(SEPARATOR).join(' '));
    }
    if (role && !el.getAttribute('role')) el.setAttribute('role', role);
    if (labelI18n && !el.getAttribute('aria-label')) {
      var lab = labelI18n[_currentLocale] || labelI18n.es || labelI18n.en || fullSlug;
      el.setAttribute('aria-label', lab);
    }
    return entry;
  }

  /* MutationObserver-based watch */
  var _watchObservers = [];
  autoRegister.watch = function (containerEl, opts) {
    opts = opts || {};
    /* v2.0-rc2: default throttle pulled from _perfTolerance (100ms),
       caller may still override per-watch via opts.throttleMs. */
    var throttleMs = opts.throttleMs || _perfTolerance.mutation_throttle_ms;
    var pending = false;
    var queue = [];

    /* v2.0-rc3 (Claude T6-F1): chunk batches > 50 elements via
       requestIdleCallback (or setTimeout fallback) to stay under
       the cumulative-batch perf budget. Per-element cost stays the
       same; main thread is yielded between sub-batches so the
       page stays responsive. */
    var CHUNK_SIZE = 50;
    function _yieldThen(fn) {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(fn, { timeout: 100 });
      } else {
        setTimeout(fn, 0);
      }
    }
    function processOne(entry) {
      if (entry.added) {
        if (entry.el.hasAttribute && entry.el.hasAttribute('data-nac-action')) {
          try { autoRegister(entry.el, opts); } catch (_) {}
        }
        /* Descend into added subtree */
        if (entry.el.querySelectorAll) {
          entry.el.querySelectorAll('[data-nac-action]').forEach(function (x) {
            try { autoRegister(x, opts); } catch (_) {}
          });
        }
      } else {
        /* Removed: clean manifest */
        if (entry.el.getAttribute) {
          var slug = entry.el.getAttribute('data-nac-id');
          if (slug && _scopes[slug]) delete _scopes[slug];
        }
      }
    }
    function flush() {
      var batch = queue.splice(0);
      pending = false;
      if (batch.length <= CHUNK_SIZE) {
        batch.forEach(processOne);
        return;
      }
      /* Chunked path: yield between sub-batches. */
      var idx = 0;
      function step() {
        var end = Math.min(idx + CHUNK_SIZE, batch.length);
        for (; idx < end; idx++) processOne(batch[idx]);
        if (idx < batch.length) _yieldThen(step);
      }
      step();
    }

    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) queue.push({ added: true, el: n });
        });
        m.removedNodes.forEach(function (n) {
          if (n.nodeType === 1) queue.push({ added: false, el: n });
        });
      });
      if (!pending) {
        pending = true;
        setTimeout(flush, throttleMs);
      }
    });
    obs.observe(containerEl, { childList: true, subtree: true });
    _watchObservers.push(obs);
    /* Also process existing descendants */
    containerEl.querySelectorAll('[data-nac-action]').forEach(function (el) {
      try { autoRegister(el, opts); } catch (_) {}
    });
    return obs;
  };

  /* ------------------------------------------------------------- adopt */

  function adopt(rule) {
    if (!rule || !rule.selector) throw new Error('[NAC v2] adopt requires selector');
    rule.parent = rule.parent || null;
    rule.observe = rule.observe !== false;

    function process(el) {
      try {
        var leaf = (rule.derive && rule.derive.slug)
          ? rule.derive.slug(el)
          : _deriveLeafSlug(el);
        var fullSlug = rule.parent
          ? (rule.parent + SEPARATOR + leaf)
          : leaf;
        var role = (rule.derive && rule.derive.role)
          ? rule.derive.role(el)
          : _deriveRole(el);
        var labelI18n = (rule.derive && rule.derive.label_i18n)
          ? rule.derive.label_i18n(el)
          : (function () { var o={}; o[_currentLocale]=_deriveLabel(el); return o; })();
        var irreversible = (rule.derive && rule.derive.irreversible)
          ? rule.derive.irreversible(el)
          : false;
        var entry = {
          slug:         fullSlug,
          intent:       (rule.derive && rule.derive.intent && rule.derive.intent(el)) || 'navigate',
          source:       'human',
          label_i18n:   labelI18n,
          role:         role,
          element:      el,
          irreversible: irreversible,
          adopted:      true,
          registered_at: Date.now()
        };
        _scopes[fullSlug] = entry;
        el.setAttribute('data-nac-id', fullSlug);
        if (role && !el.getAttribute('role')) el.setAttribute('role', role);
        if (labelI18n && !el.getAttribute('aria-label')) {
          var lab = labelI18n[_currentLocale] || labelI18n.es || labelI18n.en || fullSlug;
          el.setAttribute('aria-label', lab);
        }
        if (irreversible) el.setAttribute('data-nac-irreversible', '1');
      } catch (e) {
        document.dispatchEvent(new CustomEvent('nac:adopt_failed', {
          detail: { rule: rule.selector, error: String(e) }, bubbles: true
        }));
      }
    }

    /* v2.0-rc3 (Claude T3.3): scope the observer to a host-supplied
       containerEl (smaller subtree) when provided, instead of always
       attaching to document.body. Reduces mutation-observer cost
       on DOM-heavy pages with N rules. */
    var scopedRoot = (rule.containerEl && rule.containerEl.nodeType === 1)
      ? rule.containerEl
      : document.body;

    /* Initial pass: query within the scoped root, not always document. */
    scopedRoot.querySelectorAll(rule.selector).forEach(process);

    /* Observer */
    if (rule.observe) {
      var obs = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches(rule.selector)) process(n);
            if (n.querySelectorAll) {
              n.querySelectorAll(rule.selector).forEach(process);
            }
          });
        });
      });
      obs.observe(scopedRoot, { childList: true, subtree: true });
    }
    return rule;
  }

  /* ------------------------------------------------------------- bridges */

  /* v2.0-rc3 (DeepSeek T3.4): dedup bridged hosts via WeakSet so
     repeat calls on the same host do not produce duplicate
     registrations. */
  var _bridgedShadowHosts = new WeakSet();

  function bridgeShadowRoot(host, depth) {
    depth = depth || 0;
    if (depth > 6) {
      document.dispatchEvent(new CustomEvent('nac:shadow_depth_exceeded', {
        detail: { host: host }, bubbles: true
      }));
      return;
    }
    if (!host || !host.shadowRoot) {
      document.dispatchEvent(new CustomEvent('nac:shadow_blocked', {
        detail: { host: host, reason: 'closed_or_missing' }, bubbles: true
      }));
      return;
    }
    /* v2.0-rc3: skip if already bridged. */
    if (_bridgedShadowHosts.has(host)) return;
    _bridgedShadowHosts.add(host);
    /* Walk shadow root: any [data-nac-id] becomes operable; any
       [data-nac-action] auto-registers */
    var sr = host.shadowRoot;
    sr.querySelectorAll('[data-nac-action]').forEach(function (el) {
      try { autoRegister(el, { i18n_strict: 'permissive' }); } catch (_) {}
    });
    /* Recurse */
    sr.querySelectorAll('*').forEach(function (el) {
      if (el.shadowRoot) bridgeShadowRoot(el, depth + 1);
    });
  }

  function bridgeIframe(iframeEl, opts) {
    opts = opts || {};
    var ns = opts.postMessageNamespace || 'nac.iframe.v1';
    var trusted = opts.trusted_origins || [];
    var timeout = opts.timeout_ms || 5000;
    var iframeId = iframeEl.id || 'iframe_' + Math.random().toString(36).slice(2,8);

    /* v2.0-rc3 (Claude T4-F2): the spec mandates HMAC chain on
       cross-origin agent-source events. We additionally require
       that handshake_ack and describe_result messages carry
       signature fields verifiable against our registered HMAC
       secret. Without this, a compromised trusted-origin (XSS in
       a vendor's CDN) can ride on the allowlist trust to inject
       manifest entries unchecked. */
    return new Promise(function (resolve, reject) {
      var done = false;
      function listener(ev) {
        if (trusted.length && trusted.indexOf(ev.origin) < 0) {
          document.dispatchEvent(new CustomEvent('nac:iframe_untrusted', {
            detail: { origin: ev.origin }, bubbles: true
          }));
          return;
        }
        var d = ev.data;
        if (!d || d.ns !== ns) return;
        if (d.cmd === 'handshake_ack') {
          if (done) return;
          /* v2.0-rc3: verify signature on handshake_ack if HMAC
             secret registered. Skip verification when no secret
             is registered (NAC-1/NAC-2 path); enforce at NAC-3
             via the validator. */
          if (_hasSecrets() && d.signature) {
            _verify_with_registered({ ns: d.ns, cmd: d.cmd, version: d.version, signature: d.signature })
              .then(function (ok) {
                if (!ok) {
                  done = true;
                  window.removeEventListener('message', listener);
                  document.dispatchEvent(new CustomEvent('nac:iframe_signature_invalid', {
                    detail: { iframeId: iframeId, message: 'handshake_ack' }, bubbles: true
                  }));
                  reject(new Error('iframe_signature_invalid'));
                  return;
                }
                _continueHandshakeAck();
              });
            return;
          }
          if (_hasSecrets() && !d.signature) {
            /* Secret registered but iframe did not sign -> reject
               at NAC-3 (warn at NAC-2). */
            document.dispatchEvent(new CustomEvent('nac:iframe_signature_missing', {
              detail: { iframeId: iframeId, message: 'handshake_ack' }, bubbles: true
            }));
            /* Continue without rejecting hard -- enforcement is
               validator's job. */
          }
          _continueHandshakeAck();

          function _continueHandshakeAck() {
            done = true;
            if (d.version && d.version.split('.')[0] !== '2') {
              document.dispatchEvent(new CustomEvent('nac:iframe_version_mismatch', {
                detail: { theirs: d.version, ours: '2.0' }, bubbles: true
              }));
              reject(new Error('iframe_version_mismatch'));
              return;
            }
            window.removeEventListener('message', listener);
            resolve({ iframeId: iframeId, version: d.version, signed: !!d.signature });
          }
        }
      }
      window.addEventListener('message', listener);
      iframeEl.contentWindow.postMessage(
        { ns: ns, cmd: 'handshake', version: '2.0' },
        trusted.length ? trusted[0] : '*'
      );
      setTimeout(function () {
        if (!done) {
          done = true;
          window.removeEventListener('message', listener);
          document.dispatchEvent(new CustomEvent('nac:iframe_handshake_timeout', {
            detail: { iframeId: iframeId }, bubbles: true
          }));
          reject(new Error('iframe_handshake_timeout'));
        }
      }, timeout);
    });
  }

  /* ------------------------------------------------------------- virtual */

  var _virtuals = [];
  function declareVirtual(spec) {
    if (!spec || !spec.slug_pattern || typeof spec.resolver !== 'function') {
      throw new Error('[NAC v2] declareVirtual requires {slug_pattern, count, resolver}');
    }
    _virtuals.push(spec);
    return spec;
  }
  /* v2.0-rc3 (Claude T3.6 / DeepSeek T3.6): escape regex
     metacharacters in the static parts of the pattern before
     substituting {i}. Without this, `pipeline.runs.row.{i}` would
     match `pipelineXrunsXrowX7` (because `.` is a regex wildcard);
     a malicious URL or DOM-injected slug could hit arbitrary
     pattern. */
  function _escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function _resolveVirtual(slug) {
    for (var i = 0; i < _virtuals.length; i++) {
      var v = _virtuals[i];
      /* Split on {i} so we can escape the static parts. */
      var parts = v.slug_pattern.split('{i}');
      var pat = parts.map(_escapeRegex).join('(\\d+)');
      var m = slug.match(new RegExp('^' + pat + '$'));
      if (m) {
        var idx = parseInt(m[1], 10);
        var count = typeof v.count === 'function' ? v.count() : v.count;
        if (idx >= 0 && idx < count) {
          var t0 = performance.now();
          var entry = v.resolver(idx);
          var elapsed = performance.now() - t0;
          if (elapsed > 50) {
            document.dispatchEvent(new CustomEvent('nac:virtual_resolver_slow', {
              detail: { slug: slug, elapsed_ms: elapsed }, bubbles: true
            }));
          }
          return entry;
        }
      }
    }
    return null;
  }

  /* ------------------------------------------------------------- ephemeral */

  var _ephemeralRing = [];
  var _ephemeralOpts = null;
  function captureEphemeral(opts) {
    opts = opts || {};
    _ephemeralOpts = {
      duration_ms: opts.duration_ms || 3000,
      ring_size:   opts.ring_size   || 100,
      on_capture:  opts.on_capture  || null
    };
    var liveTimers = new Map();
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.getAttribute && n.getAttribute('data-nac-id')) {
            var slug = n.getAttribute('data-nac-id');
            liveTimers.set(slug, { added_at: Date.now(), node: n });
          }
        });
        m.removedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.getAttribute && n.getAttribute('data-nac-id')) {
            var slug = n.getAttribute('data-nac-id');
            var live = liveTimers.get(slug);
            if (live && (Date.now() - live.added_at) <= _ephemeralOpts.duration_ms) {
              var capture = {
                slug: slug,
                role: n.getAttribute('role'),
                label: n.textContent.trim().slice(0, 200),
                added_at: live.added_at,
                removed_at: Date.now(),
                duration_ms: Date.now() - live.added_at
              };
              _ephemeralRing.push(capture);
              if (_ephemeralRing.length > _ephemeralOpts.ring_size) {
                _ephemeralRing.shift();
              }
              if (_ephemeralOpts.on_capture) _ephemeralOpts.on_capture(capture);
            }
            liveTimers.delete(slug);
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return obs;
  }

  /* ------------------------------------------------------------- tenant */

  var _tenantPrefix = null;
  function setTenantPrefix(slug) {
    if (_tenantPrefix !== null) {
      throw new Error('[NAC v2] tenant_prefix_locked: already set to ' + _tenantPrefix);
    }
    _validateLeaf(slug);
    _tenantPrefix = slug;
  }
  function getTenantPrefix() { return _tenantPrefix; }

  /* ------------------------------------------------------------- describe v2 */

  /* Augment v1.9's describe() with v2 additions when called.
     We don't replace the v1.9 function; we expose a new
     `describe_v2()` and decorate the v1 result. */
  /* v2.0-rc3 (Claude T3.1): track intermediate scope nodes so
     describe_v2 can expose their label_i18n. Without this,
     a catalog declares `shell.topbar` label but no consumer
     reads it because the intermediate node has no element. */
  var _intermediateScopes = Object.create(null);

  function describe_v2() {
    var v1 = (typeof NAC.describe === 'function') ? NAC.describe() : { plugins: [] };
    var scopeEntries = Object.keys(_scopes).map(function (k) {
      var e = _scopes[k];
      return {
        slug: e.slug,
        role: e.role,
        intent: e.intent,
        autoderived: e.autoderived || false,
        adopted: e.adopted || false,
        irreversible: e.irreversible || false,
        parent_chain: e.parent_chain || null,
        has_element: !!e.element
      };
    });
    var intermediateScopes = Object.keys(_intermediateScopes).map(function (k) {
      return {
        slug: k,
        depth: _intermediateScopes[k].depth,
        label_i18n: _intermediateScopes[k].label_i18n,
        is_intermediate: true
      };
    });
    var virtual_summary = _virtuals.map(function (v) {
      var count = typeof v.count === 'function' ? v.count() : v.count;
      return { slug_pattern: v.slug_pattern, count: count };
    });
    return {
      nac_version: '2.0.0-rc3',
      timestamp: Date.now(),
      tenant_prefix: _tenantPrefix,
      v1_plugins: v1.plugins || [],
      v2_scope_entries: scopeEntries,
      v2_intermediate_scopes: intermediateScopes,
      virtual: virtual_summary,
      ephemeral_log: _ephemeralRing.slice(),
      locale: _currentLocale,
      supported_locales: _supported.slice()
    };
  }

  /* ------------------------------------------------------------- validate v2 */

  function validate_global_v2(opts) {
    opts = opts || {};
    var findings = { errors: [], warnings: [] };
    /* v2.0-rc2 (Grok T5-F1 + Mistral T5-F2): severity for missing-
       locale findings now honours the tolerance setting. Default
       at NAC-3 is 'warn'; hosts that need NAC-4-equivalent strict
       mode opt in via set_validation_tolerance({i18n_strict:'error'})
       OR pass opts.i18n_strict_severity explicitly. */
    var severity = opts.i18n_strict_severity || _validationTolerance.i18n_strict;
    if (severity === 'silent') return findings;
    var bucket = severity === 'error' ? findings.errors : findings.warnings;

    if (opts.i18n_strict) {
      Object.keys(_catalog).forEach(function (key) {
        var entry = _catalog[key];
        var missing = _supported.filter(function (loc) { return !entry[loc]; });
        if (missing.length) {
          bucket.push({
            code: 'i18n_missing_locale',
            key: key,
            missing: missing,
            severity: severity
          });
        }
        Object.keys(entry).forEach(function (loc) {
          if (_supported.indexOf(loc) < 0) {
            /* invalid_locale always error: catalog has nonsense key */
            findings.errors.push({
              code: 'i18n_invalid_locale',
              key: key,
              locale: loc
            });
          }
          /* empty_string honours severity tolerance too */
          if (typeof entry[loc] === 'string' && entry[loc].length === 0) {
            bucket.push({ code: 'i18n_string_empty', key: key, locale: loc, severity: severity });
          }
          if (typeof entry[loc] === 'string' && entry[loc].length > 1000) {
            findings.warnings.push({ code: 'i18n_string_too_long', key: key, locale: loc });
          }
        });
      });
      /* Mono-locale autoderived warn (always warn -- this is a
         drift signal, not a correctness signal). */
      Object.keys(_scopes).forEach(function (slug) {
        if (_scopes[slug].autoderived) {
          findings.warnings.push({ code: 'i18n_mono_locale_autoderived', slug: slug });
        }
      });
    }
    return findings;
  }

  /* ------------------------------------------------------------- exports */

  /* Attach v2 surface to NAC namespace without overwriting v1.9 */
  NAC.scope                  = scope;
  NAC.autoRegister           = autoRegister;
  NAC.adopt                  = adopt;
  NAC.bridgeShadowRoot       = bridgeShadowRoot;
  NAC.bridgeIframe           = bridgeIframe;
  NAC.declareVirtual         = declareVirtual;
  NAC.captureEphemeral       = captureEphemeral;
  NAC.setTenantPrefix        = setTenantPrefix;
  NAC.getTenantPrefix        = getTenantPrefix;
  NAC.attestUserGesture      = attestUserGesture;
  NAC.setMobileWebViewAttestation = setMobileWebViewAttestation;
  NAC.t                      = t;
  NAC.registerCatalog        = registerCatalog;
  NAC.locale                 = locale;
  NAC.setSupportedLocales    = setSupportedLocales;
  NAC.setRTLLocales          = setRTLLocales;
  NAC.setAutoRTL             = setAutoRTL;
  NAC.set_provenance_secret  = set_provenance_secret;
  NAC.set_perf_tolerance     = set_perf_tolerance;
  NAC.get_perf_tolerance     = get_perf_tolerance;
  NAC.set_validation_tolerance = set_validation_tolerance;
  NAC.get_validation_tolerance = get_validation_tolerance;
  NAC.describe_v2            = describe_v2;
  NAC.validate_global_v2     = validate_global_v2;

  /* Convenience: expose internals for tests */
  NAC.__v2 = {
    SUPPORTED_LOCALES_DEFAULT: SUPPORTED_LOCALES_DEFAULT,
    SEPARATOR: SEPARATOR,
    MAX_DEPTH: MAX_DEPTH,
    _scopes: _scopes,
    _catalog: _catalog,
    _virtuals: _virtuals,
    _ephemeralRing: _ephemeralRing
  };

  /* v2.0-rc3 (Claude T6-F2): warm SubtleCrypto's HMAC sign path
     at boot so the cold-start cost is paid once, not at first
     agent action. Best-effort: fails silently when no secret is
     registered yet (which is fine -- adopters that wire HMAC
     register the secret at boot). */
  function _warmCrypto() {
    if (typeof NAC.sign_provenance !== 'function') return;
    if (!_provenanceSecrets[0]) return;
    try {
      NAC.sign_provenance({ _warmup: true, ts: Date.now() }, _provenanceSecrets[0])
        .catch(function () {}); /* silently swallow warmup errors */
    } catch (_) {}
  }
  /* Defer warm to next tick so the secret-registration call has a
     chance to land first. Hosts that register the secret AFTER
     boot can manually call NAC.set_provenance_secret() which
     re-warms. */
  setTimeout(_warmCrypto, 0);

  /* Bump version constants */
  NAC.version_v2      = '2.0.0-rc3';
  NAC.spec_version_v2 = '2.0';

  document.dispatchEvent(new CustomEvent('nac:v2_installed', {
    detail: { version: '2.0.0' }, bubbles: true
  }));
})(typeof window !== 'undefined' ? window : globalThis);
