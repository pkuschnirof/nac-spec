/* =====================================================================
   NAC v1.6.3 -- Native Accessibility Contract / Navegabilidad Automatica
                 Compliance.
   Reference JavaScript implementation. Spec: spec/NAC-v1.0.md.
   MIT License -- Pablo Adrian Kuschniroff + Sumi, 2026.
   =====================================================================

   v1.6.3 (2026-05-07) -- patch release. NAC.click is now role-aware
   on the success-event side: it picks the right success / failure
   event family based on the target's data-nac-role, instead of
   listening only for nac:action:succeeded / nac:action:failed.
   Pre-v1.6.3, click() on a combobox option (data-nac-role="option")
   timed out at 5s even though the option was selected and the
   widget emitted nac:field:changed -- the runtime simply was not
   listening for that event. v1.6.3 maps:
     role="action"          -> nac:action:succeeded / :failed
     role="option"          -> nac:field:changed
     role="tab"             -> nac:tab:activated
     role="breadcrumb-item" -> nac:breadcrumb:navigated
     role="accordion-toggle"-> nac:accordion:expanded / :collapsed
     role="step"            -> nac:step:advanced
     role="pagination-item" -> nac:table:page_changed
     role="confirm-button"  -> nac:confirm:resolved / :cancelled
   Unknown / missing role keeps the action default for back-compat.
   For non-action roles the runtime ALSO listens for the action-
   contract events as a safety net so a host that emits both
   contracts on the same element still works. Strict superset of
   v1.6.2; every v1.6.2 plugin remains valid.

   v1.6.2 (2026-05-07) -- patch release. Implements NAC.drag_drop
   (spec sec 13.4), which had been declared in the spec since v1.1
   but never landed in the runtime. Discovered by user-testing the
   v1.6.1 demo: an agent asked to "drag Alpha to the right list"
   timed out because the runtime had no way to invoke a cross-list
   drag programmatically. The signature matches what the spec
   already declared:
     NAC.drag_drop(source_nac_id, target_nac_id, opts?)
   Source MUST be data-nac-role="draggable", target MUST be
   data-nac-role="drop-target". Emits the canonical drag event
   sequence (started -> over -> dropped) with v1.6.1's default-on
   per-plugin bus + plugin_instance_id payload. Optional opts
   accept to_index (for ordered drop-targets) and value (passed
   through to nac:drag:dropped).
   Strict superset of v1.6.1; every v1.6.1 plugin remains valid
   (the new method is additive). Demo backend yjNacDemo gains a
   drag_drop action kind in its allowedKinds + system prompt;
   demo frontend dispatchAgenticAction routes drag_drop actions
   through the new runtime method.

   v1.6.1 (2026-05-07) -- patch release responding to AI peer review of
   v1.6.0 (ChatGPT, Mistral Le Chat, Microsoft Copilot, Claude 4.7 Deep
   Thinking, DeepSeek, HuggingChat, Grok). Strict superset of v1.6.0;
   every v1.6.0 plugin remains valid.

   - NAC.is_blocked() canonical "is the UI accepting input?" probe.
     Replaces the v1.6 antipattern of inferring blocking state from
     feedback[].severity. Returns {blocked, reasons[]} so callers can
     branch on confirm-dialog / modal / busy-action.
     Driven by ChatGPT, DeepSeek, Mistral peer reviews.
   - NAC.set_validation_tolerance() / get_validation_tolerance().
     Hosts retiring historic findings incrementally can register a
     tolerated_violations payload that demotes specific
     (kind, nac_id) pairs out of the .ok / .has_errors gate while
     keeping them visible in .tolerated[] for audit. Driven by
     Mistral, Claude 4.7: "register-time console.warn is ignored;
     50+ plugin first run sea of red".
   - validate_global() now also exposes .has_errors as an explicit CI
     boolean so build scripts do not need to introspect .duplicates
     length.
   - Spec sec 7.3.2 (new): aria/nac drift findings are hard-errors at
     NAC-3 by default; opt-in demote via set_validation_tolerance
     drift_findings='warn'. Driven by 5 of 7 v1.6 reviewers.
   - Spec sec 7.4 (tightened): per-plugin event buses are default-on,
     not opt-in; both root-level and document-level dispatch are
     mandatory in v1.6.1+. Driven by Claude 4.7's "data-nac-plugin-bus
     should arguably be the default" plus Mistral / Copilot /
     HuggingChat raising the same finding under different wording.
   - Spec sec 7.4 (clarified): closed shadow roots are explicitly out
     of scope; the only canonical pattern is bridge-via-public-method
     + manifest "shadow_root":"closed" so validators skip the
     unreachable DOM checks. Every reviewer raised this.
   - Docs: README pitch rewritten to "1 day per screen + 1 day for
     the design-system layer", removing the stale "1 hour" claim that
     three reviewers (Copilot, Claude 4.7, HuggingChat) flagged as
     no longer matching the surface size. New MANUAL.md chapters
     "Design-system layer pattern" and "Event emission patterns" hit
     the two #1 abandonment causes head-on.

   v1.6.0 (2026-05-06) -- MINOR release. Adds NAC.reset(slug?)
   plugin reset primitive (spec section 9.3) + companion
   NAC.set_reset_provider(slug, fn) so plugins can declare
   their custom reset semantics. Without a registered provider
   the runtime falls back to a generic reset that walks the
   plugin root, clears every [data-nac-role="field"] (honouring
   data-nac-default-value), applies data-nac-default-state and
   data-nac-default-hidden, and emits nac:plugin:reset on
   completion. Strict superset of v1.5.4; every v1.0..v1.5.4
   plugin remains valid (the new primitive is opt-in).

   v1.5.4 (2026-05-06) -- demo-only patch. Ships exhaustive
   10-locale i18n on every visible string of the reference demo
   at yujin.app/nac-spec/example.php. The runtime contract here
   is byte-identical to v1.5.1 -- only the version constant
   bumped for traceability.

   v1.5.1 (2026-05-06) -- patch release. Two additions on top of
   v1.5.0:
   - register() now logs a console.warn when a new manifest
     declares a nac_id that already exists in another registered
     plugin. Best-practice nudge at dev-time; runtime never throws.
   - NAC.validate_global() new function returns structured cross-
     plugin findings: duplicates, DOM orphans (data-nac-id present
     but not in any manifest), unmounted manifest entries, and
     convention violations (nac_id missing the plugin-slug prefix).
     CI gates that want NAC-3 drift to be a hard fail call this
     after the per-plugin validate(slug) loop. Spec section P7.1.
   Plus the demo got 10-locale label_i18n maps and UI chrome
   translations in the same release; the runtime contract there is
   unchanged.

   v1.5.0 (2026-05-06) -- MINOR release. Adds the canonical NAC + LLM
   agentic loop pattern as informative spec sections 9.1 and 9.2.
   The reference public demo at yujin.app/nac-spec/example.php now
   ships an agentic chat backed by Claude Sonnet (primary) +
   DeepSeek free (fallback) via the new public endpoint
   /api/v1/yujin/nac-demo. API keys live server-side and never
   reach the browser. The runtime contract in this file is unchanged
   from v1.4.2; v1.5.0 is a SPEC + DEMO release.

   v1.4.2 (2026-05-06) -- patch release responding to Microsoft
   Copilot's review of v1.4.1. Strict superset of v1.4.1; every
   v1.4.1 plugin remains valid. Changes from v1.4.1:
   - 3.5-A: P5 return shapes formalised normatively in spec
            section P5.0 (NacElement, NacSnapshot, NacKpiReadout,
            NacFeedback, NacEvent, NacResult, NacStateSnapshot).
            Runtime already conformed; spec catches up.
   - 3.5-B: click_by_verb tie-break rule (first manifest match
            wins). Validator emits warn 'duplicate_verb'.
   - 3.5-C: tab_by_label matching: case-insensitive trim across
            every declared locale; first match wins. Validator
            emits warn 'duplicate_tab_label'.
   - 3.5-D: confirm-dialog promoted from API_REFERENCE narrative
            to normative spec section 7.5 with full DOM shape,
            lifecycle event family (nac:confirm:requested |
            resolved | cancelled), validator findings.
   - 3.5-E: NAC-3 MUST/MAY split per event family in spec sec
            6.1. Events required only for widget families the
            plugin actually uses.
   - 3.5-G: NAC-drives, ARIA-mirrors single direction made
            normative in spec sec 7.3.1. Validator emits error
            'aria_first_state' when reverse mirroring detected.
   - 3.5-H: data-nac-plugin-id promoted from SHOULD to MUST when
            multiple instances of the same plugin slug coexist.
            Validator error 'duplicate_plugin_no_instance_id'.
   - v1.4.1 focus-follow on every write entry point (click,
     fill, select, tab, breadcrumb): scrollIntoView + focus +
     visual pulse + nac:focus:moved event. Opt out via
     NAC.config.focus_on_action = false. (Originally v1.4.1
     scope but landed in v1.4.2.)

   v1.4.1 (2026-05-06) -- previous patch release responding to
   AI peer review of 2026-05-06 (DeepSeek + Claude + Grok Fast).
   See CHANGELOG.md for the v1.4.1 surface. Highlights:
   - 3.4-A: click() no longer phantom-resolves after 200 ms.
   - 3.4-B: validate() now reports structured errors[].
   - 3.4-C: click_by_verb / tab_by_label added.
   - 3.2-E: events emit composed: true + plugin_instance_id.
   - 14.3.5: system_map_layers() synchronous declaration.
   - register() accepts (manifest) and (slug, manifest).

   This file installs `window.NAC` -- the operator API defined by
   spec/NAC-v1.0.md sections 5 and 7. It is plugin-host agnostic:
   any UI that follows the data-attribute conventions will be
   navigable through it.

   No build step. No dependencies. ASCII-pure. Works in any modern
   browser (Chrome 90+, Firefox 88+, Safari 14+).

   Usage:
     <script src="nac.js"></script>
     // Then anywhere:
     await NAC.click('apply_all');
     const snap = NAC.describe();

   Plugin authors register their manifest at boot:
     NAC.register({
       plugin_slug: 'my_plugin',
       version: '1.0.0',
       i18n_namespace: 'cc.my_plugin',
       fields: [...], actions: [...], tabs: [...], kpis: [...],
     });

   ASCII-pure throughout (no accented chars, no emojis).
   ===================================================================== */

(function (global) {
  'use strict';

  if (global.NAC && global.NAC.__nac_v1_installed) return;

  /* ---------- Errors ---------------------------------------------- */

  function NacError(code, message, extra) {
    const e = new Error(message || code);
    e.name = 'NacError';
    e.code = code;
    Object.assign(e, extra || {});
    return e;
  }

  /* ---------- Registry -------------------------------------------- */

  const _manifests = Object.create(null);
  const _instances = Object.create(null);

  /* register(manifest)            -- canonical, plugin_slug inside manifest
     register(slug, manifest)      -- v1.4.1: accepted for back-compat with
                                      integrators that match the typical
                                      "id-then-payload" RPC shape. If both
                                      slug and manifest.plugin_slug are
                                      present, manifest.plugin_slug wins so
                                      the manifest stays canonical. If only
                                      the slug arg is present, it is copied
                                      into manifest.plugin_slug. */
  function register(arg1, arg2) {
    let manifest;
    if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
      manifest = arg2;
      if (!manifest.plugin_slug) manifest.plugin_slug = arg1;
    } else {
      manifest = arg1;
    }
    if (!manifest || typeof manifest !== 'object') {
      throw NacError('invalid', 'manifest object required');
    }
    const slug = String(manifest.plugin_slug || '').trim();
    if (!slug) throw NacError('invalid', 'manifest.plugin_slug required');
    if (!manifest.version) manifest.version = '1.0.0';
    if (!manifest.nac_version) manifest.nac_version = '1.0';

    /* v1.5.1 cross-plugin duplicate-id detection.
       Spec section P7 expects nac_ids to be plugin-namespaced
       ('plugin.element' convention). When two manifests register
       the same nac_id, find()/click() resolution becomes
       order-dependent and brittle. We log a console.warn at
       register-time so authors notice during dev. The runtime
       does NOT throw -- this is a best-practice nudge, not a
       hard rule. validate_global() formalises the same check as
       a structured finding consumable by CI. */
    try {
      const newIds = _collectManifestIds(manifest);
      for (const otherSlug in _manifests) {
        if (otherSlug === slug) continue;
        const otherIds = _collectManifestIds(_manifests[otherSlug]);
        const dupes = newIds.filter(function (id) {
          return otherIds.indexOf(id) >= 0;
        });
        if (dupes.length) {
          /* Use console.warn (not error -- a duplicate is bad
             practice but not a fatal). Authors who want to fail
             CI on this gate it via validate_global(). */
          (typeof console !== 'undefined' && console.warn) &&
          console.warn('[NAC] duplicate nac_ids between plugin "'
            + slug + '" and "' + otherSlug + '":', dupes);
        }
      }
    } catch (e) { /* never block register() on the lint */ }

    _manifests[slug] = manifest;
    document.dispatchEvent(new CustomEvent('nac:registered', {
      detail: { plugin: slug, version: manifest.version },
    }));
    return true;
  }

  /* Helper for the duplicate-id lint and validate_global().
     Collects every nac_id declared in the manifest's actions[],
     fields[], tabs[], kpis[], rows.cells[], breadcrumbs[], etc. */
  function _collectManifestIds(m) {
    const out = [];
    const groups = ['actions', 'fields', 'tabs', 'kpis', 'charts'];
    groups.forEach(function (g) {
      const arr = (m && m[g]) || [];
      arr.forEach(function (x) {
        if (x && x.nac_id) out.push(String(x.nac_id));
      });
    });
    if (m && m.rows && Array.isArray(m.rows.cells)) {
      m.rows.cells.forEach(function (c) {
        if (c && c.nac_id) out.push(String(c.nac_id));
      });
    }
    if (m && Array.isArray(m.breadcrumbs)) {
      m.breadcrumbs.forEach(function (b) {
        if (b && Array.isArray(b.items)) {
          b.items.forEach(function (i) {
            if (i && i.nac_id) out.push(String(i.nac_id));
          });
        }
      });
    }
    return out;
  }

  function unregister(slug) {
    delete _manifests[slug];
    delete _instances[slug];
  }

  function manifest(slug) {
    if (slug == null) {
      return Object.keys(_manifests).map(function (k) { return _manifests[k]; });
    }
    return _manifests[slug] || null;
  }

  /* ---------- Element discovery ----------------------------------- */

  function _allElements() {
    return Array.prototype.slice.call(
      document.querySelectorAll('[data-nac-id]')
    );
  }

  function _activePlugin() {
    /* Most recently mounted plugin with state=ready wins. Falls back
       to topmost plugin root in the DOM order. */
    const plugins = Array.prototype.slice.call(
      document.querySelectorAll('[data-nac-plugin]')
    );
    if (!plugins.length) return null;
    const ready = plugins.filter(function (p) {
      return p.getAttribute('data-nac-plugin-state') === 'ready';
    });
    return (ready.length ? ready[ready.length - 1] : plugins[plugins.length - 1])
      .getAttribute('data-nac-plugin');
  }

  function _findElement(nac_id, opts) {
    opts = opts || {};
    const targetPlugin = opts.plugin || _activePlugin();
    let candidates = _allElements().filter(function (el) {
      return el.getAttribute('data-nac-id') === nac_id;
    });
    if (targetPlugin) {
      const scoped = candidates.filter(function (el) {
        const root = el.closest('[data-nac-plugin]');
        return root && root.getAttribute('data-nac-plugin') === targetPlugin;
      });
      if (scoped.length) candidates = scoped;
    }
    return candidates[0] || null;
  }

  function _serializeElement(el) {
    if (!el) return null;
    const root = el.closest('[data-nac-plugin]');
    return {
      nac_id:     el.getAttribute('data-nac-id'),
      plugin:     root ? root.getAttribute('data-nac-plugin') : null,
      role:       el.getAttribute('data-nac-role') || null,
      state:      el.getAttribute('data-nac-state') || 'idle',
      field_type: el.getAttribute('data-nac-field-type') || null,
      action:     el.getAttribute('data-nac-action') || null,
      error:      el.getAttribute('data-nac-error') || null,
      label:      el.getAttribute('aria-label')
                || (el.id && document.querySelector('label[for="' + el.id + '"]')
                       ? document.querySelector('label[for="' + el.id + '"]').textContent.trim()
                       : null)
                /* Fallback for KPI/feedback/static elements: look for an
                   inner labeled child by convention. Resolves the case
                   where the visible label is rendered as a child node
                   (e.g. <div class="yj-kpi-label">Applied</div>) without
                   aria-label on the wrapper. NAC v1.0 P6 still requires
                   aria-label for inputs and actions; this fallback only
                   helps observability (NAC.list / describe). */
                || (function () {
                       const inner = el.querySelector('[data-nac-role="label"], .yj-kpi-label, .yj-tab-label');
                       if (inner && inner.textContent) return inner.textContent.trim();
                       /* Last resort: trim el's own textContent capped at 80 chars. */
                       const t = (el.textContent || '').trim();
                       return t ? t.slice(0, 80) : null;
                   })(),
      value:      _readElementValue(el),
      visible:    _isVisible(el),
      disabled:   el.disabled === true || el.getAttribute('aria-disabled') === 'true',
    };
  }

  function _readElementValue(el) {
    if (el.tagName === 'INPUT') {
      if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
      return el.value;
    }
    if (el.tagName === 'SELECT') {
      if (el.multiple) {
        return Array.prototype.slice.call(el.selectedOptions)
          .map(function (o) { return o.value; });
      }
      return el.value;
    }
    if (el.tagName === 'TEXTAREA') return el.value;
    if (el.hasAttribute('contenteditable')) return el.textContent;
    return null;
  }

  function _isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = el.ownerDocument.defaultView.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  /* ---------- Public read API ------------------------------------- */

  function describe() {
    const plugins = Array.prototype.slice.call(
      document.querySelectorAll('[data-nac-plugin]')
    ).map(function (root) {
      return {
        plugin:       root.getAttribute('data-nac-plugin'),
        plugin_state: root.getAttribute('data-nac-plugin-state') || 'idle',
        elements:     Array.prototype.slice.call(
          root.querySelectorAll('[data-nac-id]')
        ).map(_serializeElement),
      };
    });
    return {
      nac_version: '1.0',
      timestamp:   Date.now(),
      url:         location.href,
      active:      _activePlugin(),
      plugins:     plugins,
    };
  }

  function list(role) {
    const all = _allElements().map(_serializeElement);
    if (!role) return all;
    return all.filter(function (e) { return e.role === role; });
  }

  function find(nac_id, opts) {
    return _serializeElement(_findElement(nac_id, opts));
  }

  function read_feedback() {
    return _allElements()
      .filter(function (el) {
        return el.getAttribute('data-nac-role') === 'feedback';
      })
      .map(function (el) {
        return {
          nac_id:  el.getAttribute('data-nac-id'),
          state:   el.getAttribute('data-nac-state') || 'idle',
          message: el.textContent.trim(),
          error:   el.getAttribute('data-nac-error') || null,
        };
      });
  }

  function snapshot_state() {
    const errs = _allElements()
      .filter(function (el) {
        return el.getAttribute('data-nac-state') === 'invalid'
            || el.getAttribute('data-nac-state') === 'error';
      })
      .map(_serializeElement);
    return {
      timestamp: Date.now(),
      active:    _activePlugin(),
      errors:    errs,
      feedback:  read_feedback(),
    };
  }

  /* ---------- Event awaiter --------------------------------------- */

  function wait_for(eventName, timeout_ms) {
    timeout_ms = timeout_ms || 5000;
    return new Promise(function (resolve, reject) {
      let done = false;
      function onEvt(e) {
        if (done) return;
        done = true;
        document.removeEventListener(eventName, onEvt);
        clearTimeout(t);
        resolve({ event: eventName, detail: e.detail || null });
      }
      const t = setTimeout(function () {
        if (done) return;
        done = true;
        document.removeEventListener(eventName, onEvt);
        reject(NacError('timeout',
          'Event ' + eventName + ' did not fire within ' + timeout_ms + 'ms'));
      }, timeout_ms);
      document.addEventListener(eventName, onEvt);
    });
  }

  /* ---------- v1.4.1: focus-follow on programmatic operations ----- */
  /* When NAC drives an element (click / fill / select / tab) the
     human reviewer wants to SEE what the agent did. Without this
     helper, programmatic clicks happen invisibly off-screen and
     the page stays static -- bad for demos and accessibility.

     Behaviour, applied uniformly to every write entry point:
     1. scrollIntoView({ behavior:'smooth', block:'center' }) so
        the element is on screen.
     2. el.focus({ preventScroll: true }) when focusable. If the
        element is not natively focusable (a div with role=action),
        we set tabindex=-1 temporarily and remove it on blur so
        the focus ring fires anyway. preventScroll is honoured
        because we already scrolled above with smooth behaviour.
     3. Add a brief class data-nac-focus-pulse for ~600ms so a
        CSS rule (host-defined or fallback inline) shows a visual
        pulse. Custom hosts MAY style
        [data-nac-focus-pulse] { outline: ... }; the runtime injects
        a minimal stylesheet once on install if no rule exists yet.
     4. Emit nac:focus:moved on document so other listeners
        (test runners, screen-recorder, autopilot) can sync. */
  function _focusElement(el) {
    if (!el) return;
    /* Honour opt-out per call: someone passed { focus: false }. */
    if (el.__nac_skip_focus) { delete el.__nac_skip_focus; return; }
    /* Honour global opt-out via NAC.config.focus_on_action = false. */
    if (global.NAC && global.NAC.config
        && global.NAC.config.focus_on_action === false) return;
    /* v1.5.5: back to block: 'center'. The previous 'nearest'
       avoided rapid jumping but lost context -- elements landed
       at the bottom of the viewport, where the human eye loses
       the surrounding cards. Centering keeps the focused
       element vertically middle on screen so the agent's
       progress is always trackable, no matter how far apart the
       targets are. The 1800ms autopilot tick (also v1.5.4-fix)
       gives smooth-scroll enough time to settle between steps. */
    try {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center',
                            inline: 'nearest' });
      }
    } catch (e) { /* older browsers ignore options */ }
    /* Make non-focusable elements focusable transiently. */
    let addedTabindex = false;
    if (!el.matches('a[href], button, input, select, textarea, '
                    + '[tabindex], [contenteditable]')) {
      el.setAttribute('tabindex', '-1');
      addedTabindex = true;
    }
    try { el.focus({ preventScroll: true }); }
    catch (e) { try { el.focus(); } catch (e2) { /* swallow */ } }
    if (addedTabindex) {
      const cleanup = function () {
        el.removeAttribute('tabindex');
        el.removeEventListener('blur', cleanup);
      };
      el.addEventListener('blur', cleanup);
    }
    /* Visual pulse. Add attribute, remove after 600ms. */
    el.setAttribute('data-nac-focus-pulse', '1');
    setTimeout(function () {
      el.removeAttribute('data-nac-focus-pulse');
    }, 600);
    /* Emit observer event. */
    const root = el.closest('[data-nac-plugin]');
    document.dispatchEvent(new CustomEvent('nac:focus:moved', {
      detail: {
        plugin: root ? root.getAttribute('data-nac-plugin') : null,
        plugin_instance_id: root
          ? (root.getAttribute('data-nac-plugin-id') || null)
          : null,
        nac_id: el.getAttribute('data-nac-id') || null,
        timestamp: Date.now(),
      },
      bubbles: true,
      composed: true,
    }));
  }
  /* Inject a minimal pulse stylesheet once at install time. Hosts
     can override by defining a higher-specificity rule. */
  function _ensureFocusStyle() {
    if (document.getElementById('nac-focus-pulse-style')) return;
    if (!document.head) return;
    const s = document.createElement('style');
    s.id = 'nac-focus-pulse-style';
    s.textContent =
      '[data-nac-focus-pulse]{'
      + 'outline:2px solid #4f46e5;'
      + 'outline-offset:2px;'
      + 'box-shadow:0 0 0 4px rgba(79,70,229,.25);'
      + 'transition:outline-color .15s ease, box-shadow .15s ease;'
      + '}';
    document.head.appendChild(s);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _ensureFocusStyle);
    } else {
      _ensureFocusStyle();
    }
  }

  /* ---------- Public write API ------------------------------------ */

  /* v1.6.3: success-event family per role. NAC.click is the
     canonical "fire the user's primary intent on this element"
     verb, but different widget families emit different success
     events:
       role="action"          -> nac:action:succeeded / :failed
       role="option"          -> nac:field:changed (combobox/select)
       role="tab"             -> nac:tab:activated
       role="breadcrumb-item" -> nac:breadcrumb:navigated
       role="accordion-toggle"-> nac:accordion:expanded / :collapsed
       role="step"            -> nac:step:advanced
       role="pagination-item" -> nac:table:page_changed
       role="confirm-button"  -> nac:confirm:resolved / :cancelled
     Pre-v1.6.3 the runtime only listened for nac:action:succeeded,
     so click() on any non-action role timed out at 5s even when the
     widget reacted correctly. v1.6.3 picks the right event family
     based on data-nac-role on the target. Unknown / missing role
     keeps the action default for back-compat. */
  const _CLICK_EVENT_FAMILY = {
    'action':           ['nac:action:succeeded', 'nac:action:failed'],
    'option':           ['nac:field:changed'],
    'tab':              ['nac:tab:activated'],
    'breadcrumb-item':  ['nac:breadcrumb:navigated'],
    'accordion-toggle': ['nac:accordion:expanded', 'nac:accordion:collapsed'],
    'step':             ['nac:step:advanced'],
    'pagination-item':  ['nac:table:page_changed'],
    'confirm-button':   ['nac:confirm:resolved', 'nac:confirm:cancelled'],
  };

  async function click(nac_id, opts) {
    /* v1.4.1: removed the 200ms phantom-success leg. Now click()
       races real lifecycle events against a configurable timeout
       and rejects with NacError('timeout', ...) if none fire.
       Default timeout 5000ms; override via opts.timeout.
       v1.6.3: success-event family is role-aware (see _CLICK_EVENT_FAMILY). */
    const el = _findElement(nac_id, opts);
    if (!el) throw NacError('not_found', 'No element with nac_id=' + nac_id);
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
      throw NacError('disabled', 'Element ' + nac_id + ' is disabled');
    }
    const role = el.getAttribute('data-nac-role') || 'action';
    const family = _CLICK_EVENT_FAMILY[role] || _CLICK_EVENT_FAMILY['action'];
    /* The first event in each family is the "success" signal; if a
       second entry exists it is the "failure" signal. Some families
       (option, tab, breadcrumb, step, pagination) have no failure
       counterpart -- the widget either succeeds or stays silent
       (and the timeout catches the silent case). Always also listen
       for nac:action:succeeded/failed as a fallback so hosts that
       emit both contracts (e.g. a tab that is also an action) work. */
    const successEvents = [family[0]];
    const failureEvents = family.length > 1 ? [family[1]] : [];
    if (role !== 'action') {
      successEvents.push('nac:action:succeeded');
      failureEvents.push('nac:action:failed');
    }
    const timeout_ms = (opts && opts.timeout) || 5000;
    const result = new Promise(function (resolve, reject) {
      let settled = false;
      function onSucceeded(e) {
        if (settled) return;
        /* Filter: the event must mention this element via either
           event.target or detail.nac_id matching. Without this, a
           background nac:field:changed from another field would
           resolve our click prematurely. */
        if (!_eventMatchesElement(e, el, nac_id)) return;
        settled = true;
        cleanup();
        resolve({ ok: true, event: { event: e.type, detail: e.detail || null } });
      }
      function onFailed(e) {
        if (settled) return;
        if (!_eventMatchesElement(e, el, nac_id)) return;
        settled = true;
        cleanup();
        resolve({ ok: false, event: { event: e.type, detail: e.detail || null } });
      }
      function cleanup() {
        successEvents.forEach(function (n) { document.removeEventListener(n, onSucceeded); });
        failureEvents.forEach(function (n) { document.removeEventListener(n, onFailed); });
        clearTimeout(t);
      }
      const t = setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(NacError('timeout',
          'click(' + nac_id + ', role=' + role + ') did not emit any of [' +
          successEvents.concat(failureEvents).join(', ') + '] within ' +
          timeout_ms + 'ms'));
      }, timeout_ms);
      successEvents.forEach(function (n) { document.addEventListener(n, onSucceeded); });
      failureEvents.forEach(function (n) { document.addEventListener(n, onFailed); });
    });
    _focusElement(el);
    el.click();
    return result;
  }

  /* v1.6.3 helper: an event "matches" the clicked element when its
     detail names the same nac_id, OR when its target IS the element
     (or a descendant), OR when no nac_id appears in detail (defensive
     -- we take the event as a match rather than miss it on a sloppy
     emitter and time out). */
  function _eventMatchesElement(e, el, nac_id) {
    var d = e && e.detail;
    if (d && (d.nac_id === nac_id || d.from_nac_id === nac_id ||
              d.target_nac_id === nac_id || d.tab_id === nac_id ||
              d.section_id === nac_id || d.step_id === nac_id ||
              d.id === nac_id || d.breadcrumb_id === nac_id)) {
      return true;
    }
    if (e.target && (e.target === el || (el.contains && el.contains(e.target)))) {
      return true;
    }
    /* Field-change events fire on the parent field when an option
       is clicked; resolve those too. */
    if (e.type === 'nac:field:changed' && d && d.nac_id) {
      var parentField = el.closest('[data-nac-id="' + d.nac_id + '"]');
      if (parentField) return true;
      /* Or: the element is a descendant of an element whose nac_id
         matches the field that fired. */
      var fieldHost = document.querySelector(
        '[data-nac-role="field"][data-nac-id="' + d.nac_id + '"], ' +
        '[data-nac-role="combobox"][data-nac-id="' + d.nac_id + '"]');
      if (fieldHost && fieldHost.contains(el)) return true;
    }
    return !d; /* defensive: emitter sloppy, no detail at all -> match */
  }

  async function fill(nac_id, value, opts) {
    const el = _findElement(nac_id, opts);
    if (!el) throw NacError('not_found', 'No field with nac_id=' + nac_id);
    if (el.disabled) throw NacError('disabled', 'Field ' + nac_id + ' is disabled');
    _focusElement(el);
    const ft = el.getAttribute('data-nac-field-type');

    if (ft === 'checkbox' || ft === 'radio') {
      el.checked = !!value;
    } else if (el.tagName === 'SELECT') {
      el.value = String(value);
    } else if (el.hasAttribute('contenteditable')) {
      el.textContent = String(value == null ? '' : value);
    } else {
      el.value = String(value == null ? '' : value);
    }

    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('nac:field:changed', {
      detail: {
        plugin:    (el.closest('[data-nac-plugin]') || {}).getAttribute
                     && el.closest('[data-nac-plugin]').getAttribute('data-nac-plugin'),
        nac_id:    nac_id,
        value:     value,
        timestamp: Date.now(),
      },
    }));
    return { ok: true };
  }

  async function select(nac_id, option, opts) {
    const el = _findElement(nac_id, opts);
    if (!el) throw NacError('not_found', 'No select with nac_id=' + nac_id);
    _focusElement(el);
    if (el.tagName === 'SELECT') {
      if (el.multiple && Array.isArray(option)) {
        Array.prototype.forEach.call(el.options, function (o) {
          o.selected = option.indexOf(o.value) >= 0;
        });
      } else {
        el.value = String(option);
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }
    /* Non-native select widget: try clicking the option element. */
    const root = el.closest('[data-nac-plugin]') || document;
    const opt = root.querySelector('[data-nac-id="' + nac_id + '.' + option + '"]')
             || root.querySelector('[data-nac-id="' + option + '"]');
    if (opt) { _focusElement(opt); opt.click(); return { ok: true }; }
    throw NacError('not_found', 'option ' + option + ' not present in ' + nac_id);
  }

  async function tab(plugin, tab_key) {
    const root = document.querySelector('[data-nac-plugin="' + plugin + '"]');
    if (!root) throw NacError('not_found', 'plugin ' + plugin + ' not mounted');
    const tabEl = root.querySelector(
      '[data-nac-role="tab"][data-nac-id="' + tab_key + '"]'
    );
    if (!tabEl) throw NacError('not_found', 'tab ' + tab_key + ' missing');
    _focusElement(tabEl);
    tabEl.click();
    try {
      await wait_for('nac:tab:changed', 1500);
    } catch (e) { /* tolerated */ }
    return { ok: true };
  }

  /* ---------- v1.4.1: voice/agent ergonomic helpers --------------- */
  /* Both helpers added 2026-05-06 in response to AI peer review
     action item 3.4-C. A voice agent that hears "apply all" or
     "switch to the failed tab" should not need to call manifest()
     first to map the spoken phrase to a nac_id. These helpers do
     the lookup automatically. They are convenience wrappers over
     click() and tab(); the underlying contracts (awaitable-write,
     timeouts, throws) are unchanged. */

  async function click_by_verb(plugin, verb, opts) {
    if (!verb) throw NacError('invalid', 'click_by_verb requires a verb');
    /* Resolve plugin: explicit arg, or active plugin if null. */
    const targetPlugin = plugin || _activePlugin();
    /* Search the manifest first for an action with matching verb. */
    let matched = null;
    if (targetPlugin && _manifests[targetPlugin]) {
      const actions = _manifests[targetPlugin].actions || [];
      for (let i = 0; i < actions.length; i++) {
        if (actions[i] && actions[i].verb === verb) {
          matched = actions[i];
          break;
        }
      }
    }
    if (!matched) {
      /* Fallback: scan DOM within plugin scope for [data-nac-action]. */
      const root = targetPlugin
        ? document.querySelector('[data-nac-plugin="' + targetPlugin + '"]')
        : document;
      if (root) {
        const el = root.querySelector(
          '[data-nac-action="' + verb + '"]');
        if (el && el.getAttribute('data-nac-id')) {
          matched = { nac_id: el.getAttribute('data-nac-id'), verb: verb };
        }
      }
    }
    if (!matched || !matched.nac_id) {
      throw NacError('not_found',
        'No action with verb="' + verb + '" found in plugin "'
        + (targetPlugin || '<active>') + '"');
    }
    return await click(matched.nac_id,
      Object.assign({}, opts || {},
        targetPlugin ? { plugin: targetPlugin } : {}));
  }

  async function tab_by_label(plugin, label, opts) {
    if (!label) throw NacError('invalid', 'tab_by_label requires a label');
    const targetPlugin = plugin || _activePlugin();
    if (!targetPlugin) throw NacError('not_found',
      'tab_by_label requires a plugin (no active plugin)');
    /* Search manifest first for a tab whose label matches (case-insensitive,
       checks label, label_i18n keyed by current locale, or i18n.<lang>.label). */
    const m = _manifests[targetPlugin];
    let matched = null;
    if (m && Array.isArray(m.tabs)) {
      const lc = label.toLowerCase().trim();
      for (let i = 0; i < m.tabs.length; i++) {
        const t = m.tabs[i];
        if (!t) continue;
        const candidates = [];
        if (t.label) candidates.push(t.label);
        if (t.label_i18n && typeof t.label_i18n === 'object') {
          for (const k in t.label_i18n) {
            if (typeof t.label_i18n[k] === 'string') {
              candidates.push(t.label_i18n[k]);
            }
          }
        }
        if (t.nac_id) candidates.push(t.nac_id);
        for (let j = 0; j < candidates.length; j++) {
          if (String(candidates[j]).toLowerCase().trim() === lc) {
            matched = t;
            break;
          }
        }
        if (matched) break;
      }
    }
    /* Fallback: scan DOM tabs within plugin and match aria-label / textContent. */
    if (!matched) {
      const root = document.querySelector(
        '[data-nac-plugin="' + targetPlugin + '"]');
      if (root) {
        const tabs = Array.prototype.slice.call(
          root.querySelectorAll('[data-nac-role="tab"]'));
        const lc = label.toLowerCase().trim();
        for (let i = 0; i < tabs.length; i++) {
          const txt = (tabs[i].getAttribute('aria-label')
                       || tabs[i].textContent || '').toLowerCase().trim();
          if (txt === lc || txt.indexOf(lc) >= 0) {
            matched = { nac_id: tabs[i].getAttribute('data-nac-id') };
            break;
          }
        }
      }
    }
    if (!matched || !matched.nac_id) {
      throw NacError('not_found',
        'No tab matching label="' + label + '" in plugin "'
        + targetPlugin + '"');
    }
    return await tab(targetPlugin, matched.nac_id);
  }

  /* ---------- Visualization mode ---------------------------------- */

  function set_mode(mode) {
    const valid = ['modal', 'maximized', 'new_tab', 'new_window'];
    if (valid.indexOf(mode) < 0) {
      throw NacError('invalid', 'mode must be one of ' + valid.join(','));
    }
    document.dispatchEvent(new CustomEvent('nac:mode:requested', {
      detail: { mode: mode, timestamp: Date.now() },
    }));
  }

  /* ---------- Screenshot (best-effort) ---------------------------- */

  async function screenshot() {
    /* Best-effort: serialize the active plugin DOM to data URL.
       For real screenshots, the runner uses Playwright's screenshot
       primitive; this is a fallback for in-page operators. */
    const root = document.querySelector('[data-nac-plugin="' + _activePlugin() + '"]')
              || document.body;
    const xml = new XMLSerializer().serializeToString(root);
    return 'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">'
        + '<foreignObject width="100%" height="100%">'
        + '<div xmlns="http://www.w3.org/1999/xhtml">' + xml + '</div>'
        + '</foreignObject></svg>'
      )));
  }

  /* ---------- Manifest -> DOM validator --------------------------- */

  /* v1.4.1 (added 2026-05-06):
     Strengthened in response to AI peer review action item 3.4-B.
     Pre-v1.4.1 the validator only checked ID presence, which made
     P7's "drift is a CI blocker" promise vacuous. v1.4.1 adds
     checks for: field type alignment (manifest.type vs
     data-nac-field-type), options resolver presence, depends_on
     graph integrity, table column declarations, breadcrumb path
     consistency, ARIA-NAC state mirroring (per spec 7.3 mapping
     table). All findings are returned as a structured errors
     array with severity. The legacy `missing` array is preserved
     for back-compat so existing CI scripts keep working. */
  function validate(plugin_slug) {
    const m = _manifests[plugin_slug];
    if (!m) return { ok: false, code: 'no_manifest' };
    const root = document.querySelector('[data-nac-plugin="' + plugin_slug + '"]');
    if (!root) return { ok: false, code: 'plugin_not_mounted' };
    const found = {};
    const elemByNacId = {};
    Array.prototype.forEach.call(
      root.querySelectorAll('[data-nac-id]'),
      function (el) {
        const id = el.getAttribute('data-nac-id');
        found[id] = true;
        elemByNacId[id] = el;
      }
    );
    const missing = [];
    const errors = [];
    function pushErr(severity, code, nac_id, msg, extra) {
      const e = { severity: severity, code: code, nac_id: nac_id || null, message: msg };
      if (extra) for (const k in extra) e[k] = extra[k];
      errors.push(e);
    }
    /* 1. Presence (legacy check). */
    function checkPresence(arr, kind) {
      (arr || []).forEach(function (e) {
        if (!e || !e.nac_id) return;
        if (!found[e.nac_id]) {
          missing.push(e.nac_id);
          pushErr('error', 'missing_in_dom', e.nac_id,
            kind + ' "' + e.nac_id + '" declared in manifest but not present in DOM');
        }
      });
    }
    checkPresence(m.fields,  'field');
    checkPresence(m.actions, 'action');
    checkPresence(m.tabs,    'tab');
    checkPresence(m.kpis,    'kpi');
    checkPresence(m.charts,  'chart');

    /* 2. Field type alignment: manifest.type must match
       data-nac-field-type on the DOM element (when present). */
    (m.fields || []).forEach(function (f) {
      if (!f || !f.nac_id || !found[f.nac_id]) return;
      const el = elemByNacId[f.nac_id];
      if (!f.type) {
        pushErr('warn', 'field_type_undeclared', f.nac_id,
          'field has no manifest.type; use one of text/number/date/select/...');
        return;
      }
      const domType = el.getAttribute('data-nac-field-type');
      if (domType && domType !== f.type) {
        pushErr('error', 'field_type_mismatch', f.nac_id,
          'manifest declares type=' + f.type
          + ' but DOM has data-nac-field-type=' + domType,
          { manifest_type: f.type, dom_type: domType });
      }
    });

    /* 3. Options resolver presence: if a field has type=select or
       multi and the manifest does not embed static options, a
       resolver MUST be registered via set_options_resolver. */
    (m.fields || []).forEach(function (f) {
      if (!f || !f.nac_id) return;
      if (f.type !== 'select' && f.type !== 'multi') return;
      const hasStatic = Array.isArray(f.options) && f.options.length > 0;
      const hasResolver = !!_optionResolvers[
        _resolverKey(plugin_slug, f.nac_id)];
      const hasSource = !!f.options_source;
      if (!hasStatic && !hasResolver && !hasSource) {
        pushErr('error', 'options_unresolved', f.nac_id,
          'select/multi field has no static options, no resolver, no options_source');
      }
    });

    /* 4. depends_on graph integrity: every dependency target must
       exist in the same manifest (or be globally addressable). */
    (m.fields || []).forEach(function (f) {
      if (!f || !Array.isArray(f.depends_on)) return;
      f.depends_on.forEach(function (dep) {
        const depId = (typeof dep === 'string') ? dep : (dep && dep.field);
        if (!depId) return;
        const sameManifest = (m.fields || []).some(function (x) {
          return x && x.nac_id === depId;
        });
        if (!sameManifest) {
          pushErr('warn', 'depends_on_orphan', f.nac_id,
            'depends_on references "' + depId + '" which is not in this manifest');
        }
      });
    });

    /* 5. Table column declarations (v1.1 rows.cells): if rows
       exist in DOM, every declared cell column must be findable
       in at least one row. */
    if (m.rows && Array.isArray(m.rows.cells) && m.rows.cells.length) {
      const sampleRow = root.querySelector('[data-nac-role="row"]');
      if (sampleRow) {
        m.rows.cells.forEach(function (col) {
          if (!col || !col.nac_id) return;
          const cell = sampleRow.querySelector(
            '[data-nac-id$="' + col.nac_id + '"], '
            + '[data-nac-cell="' + col.nac_id + '"]');
          if (!cell) {
            pushErr('error', 'row_cell_missing', col.nac_id,
              'manifest declares row cell "' + col.nac_id
              + '" but no row element has it');
          }
        });
      }
    }

    /* 6. Breadcrumb path consistency (v1.4): every declared
       breadcrumb step must have a matching breadcrumb-item in DOM. */
    (m.breadcrumbs || []).forEach(function (b) {
      if (!b || !Array.isArray(b.items)) return;
      b.items.forEach(function (item) {
        if (!item || !item.nac_id) return;
        const el = root.querySelector(
          '[data-nac-role="breadcrumb-item"][data-nac-id="' + item.nac_id + '"]');
        if (!el) {
          pushErr('error', 'breadcrumb_item_missing', item.nac_id,
            'breadcrumb item "' + item.nac_id
            + '" declared in manifest but not present in DOM');
        }
      });
    });

    /* 7. ARIA-NAC state mirroring (spec section 7.3 mapping table).
       Reports a warning per element where data-nac-state maps to an
       ARIA attribute and the two disagree. */
    const _ariaMap = {
      loading:   { aria: 'aria-busy',     value: 'true'  },
      idle:      { aria: 'aria-busy',     value: 'false' },
      ready:     { aria: 'aria-busy',     value: 'false' },
      invalid:   { aria: 'aria-invalid',  value: 'true'  },
      error:     { aria: 'aria-invalid',  value: 'true'  },
      valid:     { aria: 'aria-invalid',  value: 'false' },
      expanded:  { aria: 'aria-expanded', value: 'true'  },
      collapsed: { aria: 'aria-expanded', value: 'false' },
      disabled:  { aria: 'aria-disabled', value: 'true'  },
      selected:  { aria: 'aria-selected', value: 'true'  },
      checked:   { aria: 'aria-checked',  value: 'true'  },
      pressed:   { aria: 'aria-pressed',  value: 'true'  },
    };
    Array.prototype.forEach.call(
      root.querySelectorAll('[data-nac-state]'),
      function (el) {
        const st = el.getAttribute('data-nac-state');
        const mapping = _ariaMap[st];
        if (!mapping) return;
        const ariaVal = el.getAttribute(mapping.aria);
        if (ariaVal !== null && ariaVal !== mapping.value) {
          const id = el.getAttribute('data-nac-id') || null;
          pushErr('warn', 'aria_nac_state_mismatch', id,
            'data-nac-state="' + st + '" expects '
            + mapping.aria + '="' + mapping.value
            + '" but element has ' + mapping.aria + '="' + ariaVal + '"',
            { state: st, aria_attr: mapping.aria,
              expected: mapping.value, actual: ariaVal });
        }
      });

    /* 8. Duplicate verb LINT (spec section P5 click_by_verb tie-break,
          v1.4.2). Plugin authors that declare two actions with the
          same verb force first-match-wins behaviour, which is
          deterministic but easy to misroute. */
    const _verbSeen = {};
    (m.actions || []).forEach(function (a) {
      if (!a || !a.verb) return;
      if (_verbSeen[a.verb]) {
        pushErr('warn', 'duplicate_verb', a.nac_id || null,
          'verb "' + a.verb + '" appears on multiple actions in this '
          + 'plugin; click_by_verb will pick the first in array order. '
          + 'Earlier nac_id: "' + _verbSeen[a.verb] + '"',
          { verb: a.verb, conflict_with: _verbSeen[a.verb] });
      } else {
        _verbSeen[a.verb] = a.nac_id || '<no-id>';
      }
    });

    /* 8.5 Duplicate plugin-mount-without-instance-id LINT
          (spec sec 7.4 plugin slug uniqueness, v1.4.2). Multi-mount
          of the same plugin slug without per-instance IDs makes
          driver calls non-deterministic. */
    {
      const sameSlug = Array.prototype.slice.call(
        document.querySelectorAll(
          '[data-nac-plugin="' + plugin_slug + '"]'));
      if (sameSlug.length > 1) {
        const ids = sameSlug.map(function (r) {
          return r.getAttribute('data-nac-plugin-id') || '';
        });
        const missing = sameSlug.filter(function (r) {
          return !r.getAttribute('data-nac-plugin-id');
        });
        const seen = {};
        const dupIds = [];
        ids.forEach(function (i) {
          if (!i) return;
          if (seen[i]) dupIds.push(i);
          else seen[i] = true;
        });
        if (missing.length || dupIds.length) {
          pushErr('error', 'duplicate_plugin_no_instance_id', null,
            sameSlug.length + ' instances of plugin "' + plugin_slug
            + '" simultaneously in DOM but '
            + (missing.length
                ? missing.length + ' lack data-nac-plugin-id'
                : 'two share data-nac-plugin-id "' + dupIds[0] + '"')
            + '. Each instance MUST carry a unique '
            + 'data-nac-plugin-id (spec 7.4).',
            { instance_count: sameSlug.length,
              missing_ids:    missing.length,
              duplicate_ids:  dupIds });
        }
      }
    }

    /* 9. Duplicate tab label LINT (spec section tab_by_label, v1.4.2).
          Tab labels are matched case-insensitive trim across every
          declared locale; duplicates after normalisation force
          first-match-wins. */
    const _labelSeen = {};
    (m.tabs || []).forEach(function (t) {
      if (!t) return;
      const collect = [];
      if (t.label) collect.push(t.label);
      if (t.label_i18n && typeof t.label_i18n === 'object') {
        for (const k in t.label_i18n) {
          if (typeof t.label_i18n[k] === 'string') {
            collect.push(t.label_i18n[k]);
          }
        }
      }
      collect.forEach(function (lab) {
        const norm = String(lab).toLowerCase().trim();
        if (!norm) return;
        if (_labelSeen[norm]) {
          pushErr('warn', 'duplicate_tab_label', t.nac_id || null,
            'tab label "' + lab + '" matches another tab after '
            + 'case-insensitive trim; tab_by_label will pick the '
            + 'first in array order. Earlier nac_id: "'
            + _labelSeen[norm] + '"',
            { label: lab, normalised: norm,
              conflict_with: _labelSeen[norm] });
        } else {
          _labelSeen[norm] = t.nac_id || '<no-id>';
        }
      });
    });

    const errCount = errors.filter(function (e) {
      return e.severity === 'error';
    }).length;
    return {
      ok:        errCount === 0,
      missing:   missing,        /* legacy back-compat */
      errors:    errors,         /* v1.4.1 structured findings */
      manifest:  m,
      timestamp: Date.now(),
    };
  }

  /* ---------- v1.5.1: cross-plugin validator --------------------- */
  /* validate_global() answers "are there duplicate nac_ids across
     ALL registered plugins, and are there orphan elements in the
     DOM that belong to no manifest?" The per-plugin validate(slug)
     cannot see across boundaries; this one can.

     Returns:
       {
         ok:         boolean,
         duplicates: [{nac_id, plugins:[...]}],   // same id in 2+ manifests
         orphans:    [{nac_id, in_dom:true, in_manifest:false, plugin_root:?}],
         unmounted:  [{nac_id, in_manifest:true, in_dom:false, plugin}],
         convention_violations: [{nac_id, plugin}], // nac_id missing 'plugin.' prefix
         plugin_count, total_ids,
         timestamp
       }

     A NAC-3 codebase that wants drift to be a CI blocker should run
     this in addition to the per-plugin validate(slug) loop. */
  function validate_global() {
    const out = {
      ok: true,
      duplicates: [],
      orphans:    [],
      unmounted:  [],
      convention_violations: [],
      plugin_count: 0,
      total_ids:    0,
      timestamp:    Date.now(),
    };

    /* Build a manifest-side index { nac_id -> [plugins] }. */
    const idIndex = Object.create(null);
    const slugList = Object.keys(_manifests);
    out.plugin_count = slugList.length;
    slugList.forEach(function (slug) {
      const m = _manifests[slug];
      const ids = _collectManifestIds(m);
      ids.forEach(function (id) {
        if (!idIndex[id]) idIndex[id] = [];
        if (idIndex[id].indexOf(slug) < 0) idIndex[id].push(slug);
      });
      /* Convention check: nac_id SHOULD start with the plugin slug
         followed by a dot. The spec calls this 'plugin-namespaced'
         in P1. Authors who ship 'apply_all' instead of
         'patch_manager.apply_all' silently lose the namespacing
         guard. */
      ids.forEach(function (id) {
        if (id.indexOf(slug + '.') !== 0 && id !== slug) {
          out.convention_violations.push({
            nac_id: id, plugin: slug,
            hint:   'expected prefix "' + slug + '."',
          });
        }
      });
    });
    out.total_ids = Object.keys(idIndex).length;

    /* Duplicates: any id that appears in 2+ manifests. */
    for (const id in idIndex) {
      if (idIndex[id].length >= 2) {
        out.duplicates.push({ nac_id: id, plugins: idIndex[id].slice() });
      }
    }

    /* Walk the DOM once. For every [data-nac-id]:
       - if not in idIndex, it is an orphan.
       - track DOM-side seen ids to compute unmounted = manifest \ DOM. */
    const inDom = Object.create(null);
    if (typeof document !== 'undefined') {
      const all = document.querySelectorAll('[data-nac-id]');
      Array.prototype.forEach.call(all, function (el) {
        const id = el.getAttribute('data-nac-id');
        if (!id) return;
        inDom[id] = true;
        if (!idIndex[id]) {
          /* Orphan in DOM but not in any manifest. Note: tabs
             frequently are declared in DOM-only because the host
             may add tabs dynamically; we report but at warn
             severity for the caller to decide. */
          const root = el.closest('[data-nac-plugin]');
          out.orphans.push({
            nac_id: id,
            in_dom: true,
            in_manifest: false,
            plugin_root: root ? root.getAttribute('data-nac-plugin') : null,
          });
        }
      });
    }

    /* Unmounted: declared in some manifest but not present in DOM. */
    for (const id in idIndex) {
      if (!inDom[id]) {
        out.unmounted.push({
          nac_id: id, in_manifest: true, in_dom: false,
          plugin: idIndex[id][0],
        });
      }
    }

    /* v1.6.1: tolerated_violations support. Hosts retiring historic
       findings incrementally can register a tolerated set via
       NAC.set_validation_tolerance({tolerated:[...]}); each finding
       still appears in the report under .tolerated[] but is excluded
       from the .ok / .has_errors gate so CI does not block on
       known-tracked debt. Flagged by Mistral, Claude 4.7 v1.6
       review: "register-time console.warn is ignored; 50+ plugin
       first run sea of red; teams need a tolerated-violations
       file". */
    out.tolerated = [];
    const tol = _validationTolerance || { tolerated: [] };
    if (Array.isArray(tol.tolerated) && tol.tolerated.length > 0) {
      const tolSet = Object.create(null);
      tol.tolerated.forEach(function (t) {
        const k = String(t.kind || '') + '::' + String(t.nac_id || '');
        tolSet[k] = t.until || true;
      });
      ['duplicates', 'orphans', 'unmounted', 'convention_violations'].forEach(function (kind) {
        const kept = [];
        out[kind].forEach(function (item) {
          const k = kind + '::' + item.nac_id;
          if (tolSet[k]) {
            out.tolerated.push({
              kind: kind, nac_id: item.nac_id, until: tolSet[k],
              original: item
            });
          } else {
            kept.push(item);
          }
        });
        out[kind] = kept;
      });
    }

    out.ok = !out.duplicates.length;
    /* v1.6.1: explicit has_errors flag for CI integration. Drift
       findings (duplicates) are hard-errors per spec sec 7.3.2;
       orphans + unmounted + convention_violations stay informative
       unless the host explicitly opts in via tolerance config. */
    out.has_errors = out.duplicates.length > 0;
    return out;
  }

  /* v1.6.1: tolerance config storage + setter. The shape:
       {
         tolerated: [
           { kind: 'duplicates'|'orphans'|'unmounted'
                  |'convention_violations',
             nac_id: 'plugin.slug',
             until: '2026-12-31'   // optional informative
           }, ...
         ],
         drift_findings: 'warn' | 'error'   // for sec 7.3.2 demote
       }
     Hosts typically load this from a tolerated_violations.json
     committed alongside the codebase, so what gets silenced is
     auditable in version control. */
  let _validationTolerance = null;
  function set_validation_tolerance(cfg) {
    _validationTolerance = cfg && typeof cfg === 'object' ? cfg : null;
  }
  function get_validation_tolerance() {
    return _validationTolerance;
  }

  /* ---------- v1.2: dynamic options ------------------------------- */

  /* Per-field option resolver. Plugin authors call
     NAC.set_options_resolver(plugin, field_id, fn) once at boot;
     fn(query, limit) -> Promise<Option[]>. Static manifest options
     are wrapped automatically when no resolver is set. */
  const _optionResolvers = Object.create(null);

  function _resolverKey(plugin, field_id) {
    return String(plugin || '') + '::' + String(field_id || '');
  }

  function set_options_resolver(plugin, field_id, fn) {
    if (typeof fn !== 'function') {
      throw NacError('invalid', 'resolver fn required');
    }
    _optionResolvers[_resolverKey(plugin, field_id)] = fn;
  }

  function _findFieldDef(field_id) {
    /* Walk every registered manifest, return the first matching
       fields[] entry with its plugin slug. */
    for (const slug in _manifests) {
      const m = _manifests[slug];
      const arr = (m && m.fields) || [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].id === field_id) {
          return { plugin: slug, field: arr[i] };
        }
      }
    }
    return null;
  }

  function _emitOptionsEvent(name, detail) {
    document.dispatchEvent(new CustomEvent('nac:options:' + name, {
      detail: detail, bubbles: true,
    }));
  }

  async function options(field_id) {
    const found = _findFieldDef(field_id);
    if (!found) {
      throw NacError('field_not_found', 'no field with id ' + field_id);
    }
    const f = found.field;
    const src = f.options_source || 'static';
    if (src === 'remote') {
      throw NacError('RemoteSourceRequiresSearch',
        'field ' + field_id + ' is remote; use NAC.search_options');
    }
    _emitOptionsEvent('loading', { field_id: field_id, source: src });
    let result;
    try {
      const resolver = _optionResolvers[_resolverKey(found.plugin, field_id)];
      if (resolver) {
        result = await resolver('', null);
      } else if (Array.isArray(f.options)) {
        result = f.options.slice();
      } else {
        result = [];
      }
    } catch (err) {
      _emitOptionsEvent('error', { field_id: field_id, source: src, message: String(err && err.message || err) });
      throw NacError('OptionsUnavailable', 'options fetch failed: ' + (err && err.message || err));
    }
    _emitOptionsEvent('loaded', { field_id: field_id, source: src, count: result.length });
    return result;
  }

  async function search_options(field_id, query, limit) {
    const found = _findFieldDef(field_id);
    if (!found) {
      throw NacError('field_not_found', 'no field with id ' + field_id);
    }
    const f = found.field;
    const src = f.options_source || 'static';
    const lim = Number(limit || 10);
    const q = String(query == null ? '' : query);
    _emitOptionsEvent('loading', { field_id: field_id, source: src, query: q });
    let result;
    try {
      const resolver = _optionResolvers[_resolverKey(found.plugin, field_id)];
      if (resolver) {
        result = await resolver(q, lim);
      } else if (Array.isArray(f.options)) {
        const ql = q.toLowerCase();
        result = f.options.filter(function (o) {
          if (!ql) return true;
          const lab = String(o.label || o.value || '').toLowerCase();
          return lab.indexOf(ql) !== -1;
        }).slice(0, lim);
      } else {
        result = [];
      }
    } catch (err) {
      _emitOptionsEvent('error', { field_id: field_id, source: src, query: q, message: String(err && err.message || err) });
      throw NacError('OptionsUnavailable', 'search failed: ' + (err && err.message || err));
    }
    _emitOptionsEvent('loaded', { field_id: field_id, source: src, query: q, count: result.length });
    return result;
  }

  function invalidate_options(field_id, reason, trigger_field_id) {
    _emitOptionsEvent('invalidated', {
      field_id: field_id,
      reason: reason || 'manual',
      trigger_field_id: trigger_field_id || null,
    });
  }

  /* ---------- v1.2: window chrome (min/max/restore) --------------- */

  function _findPluginRoot(plugin) {
    return document.querySelector('[data-nac-plugin="' + plugin + '"]')
        || document.querySelector('[data-nac-id="' + plugin + '"]');
  }

  function _setPluginState(plugin, newState) {
    const root = _findPluginRoot(plugin);
    if (!root) {
      throw NacError('plugin_not_found', 'no DOM root for plugin ' + plugin);
    }
    const prior = root.getAttribute('data-nac-state') || 'normal';
    root.setAttribute('data-nac-state', newState);
    return { prior: prior, root: root };
  }

  function _emitPluginGeometry(name, plugin, prior_state, extra) {
    const detail = Object.assign({ plugin: plugin, prior_state: prior_state }, extra || {});
    document.dispatchEvent(new CustomEvent('nac:plugin:' + name, {
      detail: detail, bubbles: true,
    }));
  }

  async function minimize(plugin) {
    const r = _setPluginState(plugin, 'minimized');
    _emitPluginGeometry('minimized', plugin, r.prior);
    return 'minimized';
  }

  async function maximize(plugin) {
    const r = _setPluginState(plugin, 'maximized');
    _emitPluginGeometry('maximized', plugin, r.prior);
    return 'maximized';
  }

  async function restore(plugin) {
    const r = _setPluginState(plugin, 'normal');
    _emitPluginGeometry('restored', plugin, r.prior);
    return 'normal';
  }

  async function fullscreen(plugin, on) {
    const root = _findPluginRoot(plugin);
    if (!root) {
      throw NacError('plugin_not_found', 'no DOM root for plugin ' + plugin);
    }
    const currentlyFs = !!document.fullscreenElement;
    const target = (typeof on === 'boolean') ? on : !currentlyFs;
    try {
      if (target && root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (!target && document.exitFullscreen && currentlyFs) {
        await document.exitFullscreen();
      }
    } catch (err) {
      /* permission denied or not supported -- fall back to state-only */
    }
    const newState = target ? 'fullscreen' : 'normal';
    const prior = root.getAttribute('data-nac-state') || 'normal';
    root.setAttribute('data-nac-state', newState);
    _emitPluginGeometry('fullscreen_changed', plugin, prior, { fullscreen: target });
    return newState;
  }

  /* ---------- v1.2: discovery (system map / capabilities) -------- */

  let _systemMapProvider = null;
  let _capabilitiesProvider = null;

  function set_system_map_provider(fn) {
    if (typeof fn !== 'function') {
      throw NacError('invalid', 'provider fn required');
    }
    _systemMapProvider = fn;
  }

  function set_capabilities_provider(fn) {
    if (typeof fn !== 'function') {
      throw NacError('invalid', 'provider fn required');
    }
    _capabilitiesProvider = fn;
  }

  async function system_map() {
    if (!_systemMapProvider) {
      throw NacError('SystemMapNotProvided', 'no system_map provider registered');
    }
    return await _systemMapProvider();
  }

  async function capabilities() {
    if (_capabilitiesProvider) {
      return await _capabilitiesProvider();
    }
    /* Fallback: synthesise a minimal CapabilityInventory from known
       manifests. This is what the spec calls "Layer C from Layer B". */
    const slugs = Object.keys(_manifests);
    const actions = [];
    for (let i = 0; i < slugs.length; i++) {
      const m = _manifests[slugs[i]];
      const acts = (m && m.actions) || [];
      for (let j = 0; j < acts.length; j++) {
        if (acts[j] && acts[j].id) {
          actions.push({ id: acts[j].id, label: acts[j].label || acts[j].id, verbs: [acts[j].verb || 'click'] });
        }
      }
    }
    return {
      entities: [],
      actions: actions,
      reports: [],
      dashboards: [],
      integrations: [],
      languages: [],
      _synthesised: true,
    };
  }

  /* ---------- v1.6.0: plugin reset primitive ----------------------
     Spec section 9.4 (informative). Lets a plugin declare how to
     return to its initial state -- clearing fields, closing
     modals, restoring minimised cards, resetting tabs / sort /
     filter, etc. Without a registered provider, the runtime
     falls back to a generic walk that clears every
     [data-nac-role="field"] and resets every
     [data-nac-default-state] within the plugin scope.
     Use case: agentic operators that want to "start fresh"
     before a new sequence (the canonical example: NAC.reset()
     called at the top of the autopilot demo so each run begins
     from a known state). */
  const _resetProviders = Object.create(null);

  function set_reset_provider(plugin_slug, fn) {
    if (typeof fn !== 'function') {
      throw NacError('invalid', 'reset provider fn required');
    }
    if (!plugin_slug) {
      throw NacError('invalid', 'plugin_slug required');
    }
    _resetProviders[String(plugin_slug)] = fn;
  }

  async function reset(plugin_slug) {
    /* Specific plugin + custom provider -> run it. */
    if (plugin_slug && _resetProviders[plugin_slug]) {
      try {
        await _resetProviders[plugin_slug]();
      } catch (e) {
        return { ok: false, plugin: plugin_slug, error: String(e) };
      }
      _emitResetEvent(plugin_slug);
      return { ok: true, plugin: plugin_slug, source: 'custom' };
    }
    /* No specific plugin -> run every registered provider in
       parallel + a global generic reset for the page. */
    if (!plugin_slug) {
      const slugs = Object.keys(_resetProviders);
      const results = {};
      for (let i = 0; i < slugs.length; i++) {
        try {
          await _resetProviders[slugs[i]]();
          results[slugs[i]] = { ok: true, source: 'custom' };
          _emitResetEvent(slugs[i]);
        } catch (e) {
          results[slugs[i]] = { ok: false, error: String(e) };
        }
      }
      _genericReset(null);
      _emitResetEvent('*');
      return { ok: true, plugin: '*', plugins: results,
        source: 'custom+generic' };
    }
    /* Specific plugin without registered provider -> generic
       fallback scoped to the plugin root. */
    const ok = _genericReset(plugin_slug);
    _emitResetEvent(plugin_slug);
    return { ok: ok, plugin: plugin_slug, source: 'generic' };
  }

  function _genericReset(plugin_slug) {
    const root = plugin_slug
      ? document.querySelector('[data-nac-plugin="' + plugin_slug + '"]')
      : document;
    if (!root) return false;
    /* Clear every NAC-instrumented field. Honours
       data-nac-default-value when declared. */
    Array.prototype.forEach.call(
      root.querySelectorAll('[data-nac-role="field"]'),
      function (el) {
        const def = el.getAttribute('data-nac-default-value');
        try {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.type === 'checkbox' || el.type === 'radio') {
              el.checked = (def === 'true' || def === '1');
            } else {
              el.value = def !== null ? def : '';
            }
          } else if (el.tagName === 'SELECT') {
            el.value = def !== null ? def : '';
          } else if (el.hasAttribute('contenteditable')) {
            el.textContent = def !== null ? def : '';
          }
          el.setAttribute('data-nac-state', 'pristine');
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) { /* swallow per-field */ }
      });
    /* Reset elements with a declared default state. */
    Array.prototype.forEach.call(
      root.querySelectorAll('[data-nac-default-state]'),
      function (el) {
        el.setAttribute('data-nac-state',
          el.getAttribute('data-nac-default-state'));
      });
    /* Hide every region that defaults hidden. Convention:
       data-nac-default-hidden="1" on a region the host wants
       reset to hidden. */
    Array.prototype.forEach.call(
      root.querySelectorAll('[data-nac-default-hidden]'),
      function (el) { el.hidden = true; });
    return true;
  }

  function _emitResetEvent(plugin) {
    document.dispatchEvent(new CustomEvent('nac:plugin:reset', {
      detail: { plugin: plugin || '*', timestamp: Date.now() },
      bubbles: true, composed: true,
    }));
  }

  /* v1.4.1 (added 2026-05-06, spec section 14.3.5):
     synchronous declaration of which discovery layers the host
     supports, so agents do not need to probe by exception. */
  function system_map_layers() {
    let hasB = false;
    const slugs = Object.keys(_manifests);
    for (let i = 0; i < slugs.length; i++) {
      const m = _manifests[slugs[i]];
      if (m && Array.isArray(m.transitions) && m.transitions.length) {
        hasB = true;
        break;
      }
    }
    const a = !!_systemMapProvider;
    const c = !!_capabilitiesProvider || slugs.length > 0;
    let preferred = null;
    if (a)      preferred = 'a';
    else if (hasB) preferred = 'b';
    else if (c)    preferred = 'c';
    return {
      a: a,
      b: hasB,
      c: c,
      preferred: preferred,
    };
  }

  /* ---------- v1.2: section navigation --------------------------- */

  function _findSection(sectionId) {
    return document.querySelector(
      '[data-nac-role="section"][data-nac-id="' + sectionId + '"]');
  }

  function list_sections() {
    const out = [];
    document.querySelectorAll('[data-nac-role="section"][data-nac-id]')
      .forEach(function (el) {
        out.push({
          id:    el.getAttribute('data-nac-id'),
          label: el.getAttribute('data-nac-label')
                 || (el.querySelector('h1,h2,h3,h4') || {}).textContent
                 || '',
          visible: el.getAttribute('data-nac-state') !== 'hidden',
        });
      });
    return out;
  }

  async function go_to_section(sectionId) {
    const sec = _findSection(sectionId);
    if (!sec) {
      throw NacError('section_not_found', 'no section with id ' + sectionId);
    }
    /* If the section sits inside a collapsed accordion or non-active
       tab, the v1.2 reference impl SHOULD lift those constraints
       before scrolling. We probe two well-known patterns and rely on
       the page's own NAC handlers; if neither matches, we just scroll. */
    const collapsedAcc = sec.closest('[data-nac-role="accordion-section"][data-nac-state="collapsed"]');
    if (collapsedAcc && typeof global.NAC.expand === 'function') {
      try { await global.NAC.expand(collapsedAcc.getAttribute('data-nac-id')); }
      catch (e) { /* not fatal */ }
    }
    const tabPanel = sec.closest('[data-nac-role="tabpanel"]');
    if (tabPanel && typeof global.NAC.tab === 'function') {
      const plugin = tabPanel.getAttribute('data-nac-plugin');
      const tabSlug = tabPanel.getAttribute('data-nac-tab');
      if (plugin && tabSlug) {
        try { await global.NAC.tab(plugin, tabSlug); }
        catch (e) { /* not fatal */ }
      }
    }
    sec.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    await new Promise(function (r) { setTimeout(r, 350); });
    document.dispatchEvent(new CustomEvent('nac:section:reached', {
      detail: {
        section_id: sectionId,
        label: sec.getAttribute('data-nac-label')
               || (sec.querySelector('h1,h2,h3,h4') || {}).textContent
               || '',
      },
      bubbles: true,
    }));
    return { ok: true, section_id: sectionId };
  }

  /* Auto-instrument visibility on sections via IntersectionObserver. */
  if (typeof IntersectionObserver !== 'undefined') {
    function _wireSectionObserver() {
      const els = document.querySelectorAll('[data-nac-role="section"][data-nac-id]');
      if (!els.length) return;
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          const newState = en.isIntersecting ? 'visible' : 'hidden';
          const prior = en.target.getAttribute('data-nac-state') || 'hidden';
          if (prior !== newState) {
            en.target.setAttribute('data-nac-state', newState);
            document.dispatchEvent(new CustomEvent('nac:state:changed', {
              detail: {
                nac_id: en.target.getAttribute('data-nac-id'),
                role: 'section',
                old_state: prior,
                new_state: newState,
              },
              bubbles: true,
            }));
          }
        });
      }, { threshold: 0.2 });
      els.forEach(function (el) { io.observe(el); });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _wireSectionObserver);
    } else {
      _wireSectionObserver();
    }
  }

  /* ---------- v1.3: helpers shared across primitives ------------- */

  /* v1.4.1 (added 2026-05-06):
     - composed: true so events cross shadow DOM closed boundaries
       (spec section 7.4).
     - alias plugin_slug -> plugin if a caller set the legacy field
       (spec section 7.4 deprecation rule).
     - attach plugin_instance_id from data-nac-plugin-id if a
       producer opted into the multi-instance pattern. */
  function _normalizeDetail(detail) {
    detail = detail || {};
    if (detail.plugin_slug && !detail.plugin) {
      detail.plugin = detail.plugin_slug;
    }
    if (detail.plugin && detail.plugin_instance_id === undefined) {
      const root = document.querySelector(
        '[data-nac-plugin="' + detail.plugin + '"]');
      detail.plugin_instance_id = root
        ? (root.getAttribute('data-nac-plugin-id') || null)
        : null;
    }
    return detail;
  }
  function _emit(name, detail) {
    detail = _normalizeDetail(detail);
    document.dispatchEvent(new CustomEvent(name, {
      detail: detail, bubbles: true, composed: true,
    }));
    /* Per-plugin bus dispatch (optional, spec sec 7.4): if a plugin
       root opted in via data-nac-plugin-bus="enabled", also fire on
       the root so per-instance subscribers see the event without
       payload filtering. */
    if (detail.plugin) {
      const root = document.querySelector(
        '[data-nac-plugin="' + detail.plugin + '"]'
        + (detail.plugin_instance_id
            ? '[data-nac-plugin-id="' + detail.plugin_instance_id + '"]'
            : ''));
      if (root && root.getAttribute('data-nac-plugin-bus') === 'enabled') {
        root.dispatchEvent(new CustomEvent(name, {
          detail: detail, bubbles: false, composed: true,
        }));
      }
    }
  }
  function _byId(id) {
    return document.querySelector('[data-nac-id="' + id + '"]');
  }

  /* ---------- v1.3: toast / banner / confirm --------------------- */

  let _toastSeq = 0;
  function toast(text, opts) {
    const o = opts || {};
    const id = o.id || ('nac.toast.' + (++_toastSeq));
    const ttl = Number(o.ttl_ms || 4000);
    const sev = o.severity || 'info';
    const wrap = (function () {
      let r = document.querySelector('[data-nac-role="toast-region"]');
      if (!r) {
        r = document.createElement('div');
        r.setAttribute('data-nac-role', 'toast-region');
        r.setAttribute('aria-live', 'polite');
        r.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(r);
      }
      return r;
    })();
    const el = document.createElement('div');
    el.setAttribute('data-nac-id', id);
    el.setAttribute('data-nac-role', 'toast');
    el.setAttribute('data-nac-state', 'visible');
    el.setAttribute('data-nac-severity', sev);
    el.style.cssText = 'background:#2b2118;color:#fffaf0;padding:10px 14px;border-radius:6px;font-family:system-ui,sans-serif;font-size:13px;max-width:340px;box-shadow:0 4px 12px rgba(0,0,0,0.18);pointer-events:auto;';
    el.textContent = text;
    wrap.appendChild(el);
    _emit('nac:toast:fired', { id: id, severity: sev, text: text, ttl_ms: ttl });
    if (ttl > 0) {
      setTimeout(function () {
        if (el.parentNode) {
          el.setAttribute('data-nac-state', 'dismissed');
          el.parentNode.removeChild(el);
          _emit('nac:toast:dismissed', { id: id, dismissed_by: 'timeout' });
        }
      }, ttl);
    }
    return id;
  }
  function list_toasts() {
    const out = [];
    document.querySelectorAll('[data-nac-role="toast"][data-nac-state="visible"]')
      .forEach(function (el) {
        out.push({
          id: el.getAttribute('data-nac-id'),
          text: el.textContent,
          severity: el.getAttribute('data-nac-severity') || 'info',
        });
      });
    return out;
  }
  function dismiss_toast(id) {
    const el = _byId(id);
    if (el && el.parentNode) {
      el.setAttribute('data-nac-state', 'dismissed');
      el.parentNode.removeChild(el);
      _emit('nac:toast:dismissed', { id: id, dismissed_by: 'programmatic' });
    }
  }

  function list_banners() {
    const out = [];
    document.querySelectorAll('[data-nac-role="banner"][data-nac-state="visible"]')
      .forEach(function (el) {
        out.push({
          id: el.getAttribute('data-nac-id'),
          text: (el.textContent || '').trim(),
          severity: el.getAttribute('data-nac-severity') || 'info',
        });
      });
    return out;
  }
  function dismiss_banner(id) {
    const el = _byId(id);
    if (!el) return;
    el.setAttribute('data-nac-state', 'dismissed');
    el.style.display = 'none';
    _emit('nac:banner:dismissed', { id: id });
  }

  /* ---------- v1.3: confirm dialog ------------------------------- */

  function confirm_dialog(prompt, opts) {
    const o = opts || {};
    const id = 'nac.confirm.' + Date.now();
    const danger = !!o.danger;
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.setAttribute('data-nac-id', id);
      overlay.setAttribute('data-nac-role', 'confirm-dialog');
      overlay.setAttribute('data-nac-state', 'pending');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;';
      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;border-radius:8px;padding:20px;max-width:440px;font-family:system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,0.3);';
      card.innerHTML =
        '<div style="font-size:14px;color:#2b2118;margin-bottom:16px;line-height:1.5;">' +
          String(prompt).replace(/[<>&]/g, function (c) {
            return ({ '<':'&lt;','>':'&gt;','&':'&amp;' })[c];
          }) +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button data-nac-id="' + id + '.cancel"  data-nac-role="action" data-nac-action="cancel" ' +
                  'style="padding:6px 14px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font:inherit;">' +
                  (o.cancel_label || 'Cancel') + '</button>' +
          '<button data-nac-id="' + id + '.confirm" data-nac-role="action" data-nac-action="confirm" ' +
                  'style="padding:6px 14px;border:0;border-radius:4px;background:' + (danger ? '#b91c1c' : '#ec407a') + ';color:#fff;cursor:pointer;font:inherit;">' +
                  (o.confirm_label || 'Confirm') + '</button>' +
        '</div>';
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      _emit('nac:confirm:requested', { id: id, prompt: prompt, danger: danger });

      function done(answer) {
        overlay.setAttribute('data-nac-state', answer ? 'confirmed' : 'cancelled');
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        _emit(answer ? 'nac:confirm:confirmed' : 'nac:confirm:cancelled', { id: id });
        resolve(!!answer);
      }
      card.querySelector('[data-nac-id="' + id + '.confirm"]').addEventListener('click', function () { done(true); });
      card.querySelector('[data-nac-id="' + id + '.cancel"]').addEventListener('click', function () { done(false); });
    });
  }
  function list_pending_confirms() {
    const out = [];
    document.querySelectorAll('[data-nac-role="confirm-dialog"][data-nac-state="pending"]')
      .forEach(function (el) {
        out.push({ id: el.getAttribute('data-nac-id') });
      });
    return out;
  }

  /* v1.6.1: NAC.is_blocked() -- canonical "is the UI accepting
     operator input right now?" probe. Replaces the v1.6 antipattern
     of inferring blocking state from feedback[].severity (flagged
     by ChatGPT, DeepSeek, Mistral peer reviews of v1.6.0).

     Returns:
       { blocked: boolean,
         reasons: [
           { kind: 'confirm-dialog' | 'modal' | 'busy-action',
             nac_id: string,
             severity: 'block' | 'soft' }
         ] }

     blocked === true when ANY reason is severity 'block'. Soft-
     reasons (transient busy states under 1s) are surfaced for
     telemetry but do not flip the boolean. Operators that just
     want the boolean read .blocked; operators that need to react
     differently per kind iterate .reasons. */
  function is_blocked() {
    const reasons = [];
    /* Pending confirm dialogs are always blocking. */
    list_pending_confirms().forEach(function (c) {
      reasons.push({
        kind: 'confirm-dialog',
        nac_id: c.id,
        severity: 'block'
      });
    });
    /* Open modals (data-nac-role="modal" with state open|opening)
       gate the surface beneath. data-nac-soft="true" opts out for
       non-blocking sheets / popovers. */
    document.querySelectorAll('[data-nac-role="modal"]')
      .forEach(function (el) {
        const state = el.getAttribute('data-nac-state') || '';
        if (state !== 'open' && state !== 'opening') return;
        const soft = el.getAttribute('data-nac-soft') === 'true';
        reasons.push({
          kind: 'modal',
          nac_id: el.getAttribute('data-nac-id') || '',
          severity: soft ? 'soft' : 'block'
        });
      });
    /* Actions in flight (data-nac-state="busy" or "loading") are
       surfaced as soft reasons so callers can choose to wait. */
    document.querySelectorAll('[data-nac-role="action"][data-nac-state="busy"], ' +
                              '[data-nac-role="action"][data-nac-state="loading"]')
      .forEach(function (el) {
        reasons.push({
          kind: 'busy-action',
          nac_id: el.getAttribute('data-nac-id') || '',
          severity: 'soft'
        });
      });
    const blocked = reasons.some(function (r) { return r.severity === 'block'; });
    return { blocked: blocked, reasons: reasons };
  }

  /* ---------- v1.3: stepper -------------------------------------- */

  function _stepperRoot(stepper_id) {
    return document.querySelector(
      '[data-nac-role="stepper"][data-nac-id="' + stepper_id + '"]');
  }
  function _stepperSteps(stepper_id) {
    const root = _stepperRoot(stepper_id);
    if (!root) return [];
    return Array.prototype.slice.call(
      root.querySelectorAll('[data-nac-role="step"]'));
  }
  function step_state(stepper_id) {
    const steps = _stepperSteps(stepper_id);
    let current = -1;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].getAttribute('data-nac-state') === 'current') { current = i; break; }
    }
    if (current < 0) {
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].getAttribute('data-nac-state') !== 'done') { current = i; break; }
      }
    }
    if (current < 0) current = steps.length - 1;
    return { current: current, total: steps.length };
  }
  function step_to(stepper_id, n) {
    const steps = _stepperSteps(stepper_id);
    if (!steps.length) throw NacError('stepper_not_found', stepper_id);
    n = Math.max(0, Math.min(steps.length - 1, Number(n)));
    const prior = step_state(stepper_id).current;
    steps.forEach(function (s, i) {
      if (i < n)      s.setAttribute('data-nac-state', 'done');
      else if (i === n) s.setAttribute('data-nac-state', 'current');
      else            s.setAttribute('data-nac-state', 'pending');
    });
    if (n > prior) _emit('nac:step:advanced', { stepper_id: stepper_id, from: prior, to: n, total: steps.length });
    else if (n < prior) _emit('nac:step:back', { stepper_id: stepper_id, from: prior, to: n });
    if (n === steps.length - 1) {
      _emit('nac:step:completed', { stepper_id: stepper_id, total: steps.length });
    }
    return { current: n, total: steps.length };
  }
  function step_next(stepper_id) {
    const s = step_state(stepper_id);
    return step_to(stepper_id, Math.min(s.total - 1, s.current + 1));
  }
  function step_back(stepper_id) {
    const s = step_state(stepper_id);
    return step_to(stepper_id, Math.max(0, s.current - 1));
  }

  /* ---------- v1.3: tree ----------------------------------------- */

  function _treeNode(node_id) {
    return document.querySelector(
      '[data-nac-role="treenode"][data-nac-id="' + node_id + '"]');
  }
  function tree_expand(node_id) {
    const n = _treeNode(node_id);
    if (!n) throw NacError('treenode_not_found', node_id);
    if (n.getAttribute('data-nac-state') === 'leaf') return;
    n.setAttribute('data-nac-state', 'expanded');
    Array.prototype.slice.call(n.children).forEach(function (c) {
      if (c.getAttribute && c.getAttribute('data-nac-role') === 'tree-children') {
        c.removeAttribute('hidden');
      }
    });
    const level = parseInt(n.getAttribute('data-nac-level') || '0', 10);
    _emit('nac:tree:expanded', { node_id: node_id, level: level });
  }
  function tree_collapse(node_id) {
    const n = _treeNode(node_id);
    if (!n) throw NacError('treenode_not_found', node_id);
    if (n.getAttribute('data-nac-state') === 'leaf') return;
    n.setAttribute('data-nac-state', 'collapsed');
    Array.prototype.slice.call(n.children).forEach(function (c) {
      if (c.getAttribute && c.getAttribute('data-nac-role') === 'tree-children') {
        c.setAttribute('hidden', 'hidden');
      }
    });
    const level = parseInt(n.getAttribute('data-nac-level') || '0', 10);
    _emit('nac:tree:collapsed', { node_id: node_id, level: level });
  }
  function tree_select(node_id) {
    const n = _treeNode(node_id);
    if (!n) throw NacError('treenode_not_found', node_id);
    const tree = n.closest('[data-nac-role="tree"]');
    if (tree) {
      tree.querySelectorAll('[data-nac-role="treenode"][data-nac-state="selected"]').forEach(function (other) {
        if (other !== n) other.setAttribute('data-nac-state', other.hasAttribute('data-nac-was-expanded') ? 'expanded' : 'collapsed');
      });
    }
    n.setAttribute('data-nac-state', 'selected');
    _emit('nac:tree:selected', { node_id: node_id, path: tree_path(node_id) });
  }
  function tree_path(node_id) {
    const n = _treeNode(node_id);
    if (!n) return [];
    const out = [];
    let cur = n;
    while (cur) {
      if (cur.getAttribute && cur.getAttribute('data-nac-role') === 'treenode') {
        out.unshift(cur.getAttribute('data-nac-id'));
      }
      if (cur.getAttribute && cur.getAttribute('data-nac-role') === 'tree') break;
      cur = cur.parentElement;
    }
    return out;
  }

  /* ---------- v1.3: tag-input ------------------------------------ */

  function _tagFieldRoot(field_id) {
    const el = document.querySelector(
      '[data-nac-role="field"][data-nac-field-type="tag-input"][data-nac-id="' + field_id + '"]');
    return el;
  }
  function add_tag(field_id, value) {
    const root = _tagFieldRoot(field_id);
    if (!root) throw NacError('field_not_found', field_id);
    const cur = list_tags(field_id);
    if (cur.indexOf(value) >= 0) return;
    cur.push(value);
    root.setAttribute('data-nac-value', cur.join('|'));
    _emit('nac:tags:added', { field_id: field_id, value: value, source: 'programmatic' });
  }
  function remove_tag(field_id, value) {
    const root = _tagFieldRoot(field_id);
    if (!root) throw NacError('field_not_found', field_id);
    const cur = list_tags(field_id).filter(function (v) { return v !== value; });
    root.setAttribute('data-nac-value', cur.join('|'));
    _emit('nac:tags:removed', { field_id: field_id, value: value });
  }
  function list_tags(field_id) {
    const root = _tagFieldRoot(field_id);
    if (!root) return [];
    const v = root.getAttribute('data-nac-value') || '';
    return v ? v.split('|') : [];
  }

  /* ---------- v1.3: drawer / bottom-sheet ------------------------ */

  function _drawer(id) {
    return document.querySelector(
      '[data-nac-role="drawer"][data-nac-id="' + id + '"], ' +
      '[data-nac-role="bottom-sheet"][data-nac-id="' + id + '"]');
  }
  function open_drawer(id, position) {
    const d = _drawer(id);
    if (!d) throw NacError('drawer_not_found', id);
    if (position) d.setAttribute('data-nac-position', position);
    d.setAttribute('data-nac-state', 'open');
    _emit('nac:drawer:opened', { id: id, position: d.getAttribute('data-nac-position') || 'right' });
  }
  function close_drawer(id) {
    const d = _drawer(id);
    if (!d) throw NacError('drawer_not_found', id);
    d.setAttribute('data-nac-state', 'closed');
    _emit('nac:drawer:closed', { id: id, dismissed_by: 'programmatic' });
  }
  function peek_drawer(id, height_pct) {
    const d = _drawer(id);
    if (!d) throw NacError('drawer_not_found', id);
    d.setAttribute('data-nac-state', 'peek');
    d.setAttribute('data-nac-peek-pct', String(height_pct || 25));
    _emit('nac:drawer:peek', { id: id, height_pct: Number(height_pct || 25) });
  }

  /* ---------- v1.3: calendar ------------------------------------- */

  function calendar_view(cal_id, view) {
    const c = document.querySelector(
      '[data-nac-role="calendar"][data-nac-id="' + cal_id + '"]');
    if (!c) throw NacError('calendar_not_found', cal_id);
    c.setAttribute('data-nac-view', view);
    _emit('nac:calendar:view_changed', { calendar_id: cal_id, view: view });
  }
  function calendar_go_to(cal_id, date) {
    const c = document.querySelector(
      '[data-nac-role="calendar"][data-nac-id="' + cal_id + '"]');
    if (!c) throw NacError('calendar_not_found', cal_id);
    c.setAttribute('data-nac-date', date);
    _emit('nac:calendar:date_selected', { calendar_id: cal_id, date: date });
  }
  function calendar_select_event(event_id) {
    const ev = _byId(event_id);
    if (!ev) throw NacError('calendar_event_not_found', event_id);
    ev.setAttribute('data-nac-state', 'selected');
    _emit('nac:calendar:event_clicked', {
      event_id: event_id,
      start: ev.getAttribute('data-nac-start') || null,
      end:   ev.getAttribute('data-nac-end')   || null,
    });
  }
  function calendar_list_events(cal_id /*, from, to */) {
    const c = document.querySelector(
      '[data-nac-role="calendar"][data-nac-id="' + cal_id + '"]');
    if (!c) return [];
    const out = [];
    c.querySelectorAll('[data-nac-role="calendar-event"]').forEach(function (e) {
      out.push({
        id: e.getAttribute('data-nac-id'),
        start: e.getAttribute('data-nac-start') || null,
        end:   e.getAttribute('data-nac-end')   || null,
        label: (e.getAttribute('data-nac-label') || e.textContent || '').trim(),
        state: e.getAttribute('data-nac-state') || 'confirmed',
      });
    });
    return out;
  }

  /* ---------- v1.3: chart ---------------------------------------- */

  function chart_data(chart_id) {
    const c = document.querySelector(
      '[data-nac-role="chart"][data-nac-id="' + chart_id + '"]');
    if (!c) throw NacError('chart_not_found', chart_id);
    const series = [];
    c.querySelectorAll('[data-nac-role="chart-series"]').forEach(function (s) {
      const points = [];
      s.querySelectorAll('[data-nac-role="chart-point"]').forEach(function (p) {
        points.push({
          x: p.getAttribute('data-nac-x'),
          y: Number(p.getAttribute('data-nac-y')),
          label: p.getAttribute('data-nac-label') || '',
          id: p.getAttribute('data-nac-id'),
        });
      });
      series.push({
        id: s.getAttribute('data-nac-id'),
        label: s.getAttribute('data-nac-label') || '',
        visible: s.getAttribute('data-nac-state') !== 'hidden',
        points: points,
      });
    });
    return { chart_id: chart_id, series: series };
  }
  function chart_toggle_series(chart_id, series_id, on) {
    const s = document.querySelector(
      '[data-nac-role="chart-series"][data-nac-id="' + series_id + '"]');
    if (!s) throw NacError('chart_series_not_found', series_id);
    const target = (typeof on === 'boolean') ? on : (s.getAttribute('data-nac-state') === 'hidden');
    s.setAttribute('data-nac-state', target ? 'visible' : 'hidden');
    _emit('nac:chart:series_toggled', { chart_id: chart_id, series: series_id, visible: target });
  }
  function chart_filter(chart_id, criteria) {
    _emit('nac:chart:filtered', { chart_id: chart_id, criteria: criteria });
  }

  /* ---------- v1.3: map ------------------------------------------ */

  function map_focus(map_id, lat, lng, zoom) {
    const m = document.querySelector(
      '[data-nac-role="map"][data-nac-id="' + map_id + '"]');
    if (!m) throw NacError('map_not_found', map_id);
    m.setAttribute('data-nac-lat',  String(lat));
    m.setAttribute('data-nac-lng',  String(lng));
    if (zoom != null) m.setAttribute('data-nac-zoom', String(zoom));
    _emit('nac:map:moved', { map_id: map_id, lat: Number(lat), lng: Number(lng) });
    if (zoom != null) {
      _emit('nac:map:zoom_changed', { map_id: map_id, zoom: Number(zoom) });
    }
  }
  function map_select_marker(marker_id) {
    const mk = document.querySelector(
      '[data-nac-role="map-marker"][data-nac-id="' + marker_id + '"]');
    if (!mk) throw NacError('map_marker_not_found', marker_id);
    mk.setAttribute('data-nac-state', 'selected');
    const map_id = (mk.closest('[data-nac-role="map"]') || {}).getAttribute
      ? mk.closest('[data-nac-role="map"]').getAttribute('data-nac-id')
      : null;
    _emit('nac:map:marker_clicked', {
      map_id: map_id,
      marker_id: marker_id,
      lat: Number(mk.getAttribute('data-nac-lat') || 0),
      lng: Number(mk.getAttribute('data-nac-lng') || 0),
      label: mk.getAttribute('data-nac-label') || '',
    });
  }
  function map_toggle_layer(map_id, layer_id, on) {
    const ly = document.querySelector(
      '[data-nac-role="map-layer"][data-nac-id="' + layer_id + '"]');
    if (!ly) throw NacError('map_layer_not_found', layer_id);
    const target = (typeof on === 'boolean') ? on : (ly.getAttribute('data-nac-state') === 'hidden');
    ly.setAttribute('data-nac-state', target ? 'visible' : 'hidden');
    _emit('nac:map:layer_toggled', { map_id: map_id, layer_id: layer_id, visible: target });
  }
  function list_markers(map_id) {
    const m = document.querySelector(
      '[data-nac-role="map"][data-nac-id="' + map_id + '"]');
    if (!m) return [];
    const out = [];
    m.querySelectorAll('[data-nac-role="map-marker"]').forEach(function (mk) {
      out.push({
        id: mk.getAttribute('data-nac-id'),
        lat: Number(mk.getAttribute('data-nac-lat') || 0),
        lng: Number(mk.getAttribute('data-nac-lng') || 0),
        label: mk.getAttribute('data-nac-label') || '',
        state: mk.getAttribute('data-nac-state') || 'idle',
      });
    });
    return out;
  }

  /* ---------- v1.3: richtext ------------------------------------- */

  function richtext_format(field_id, format, value) {
    _emit('nac:richtext:format_applied',
      { field_id: field_id, format: format, value: value || null });
  }
  function richtext_insert_link(field_id, text, url) {
    _emit('nac:richtext:link_inserted',
      { field_id: field_id, text: text, url: url });
  }
  function richtext_insert_mention(field_id, user_id, label) {
    _emit('nac:richtext:mention_picked',
      { field_id: field_id, user_id: user_id, label: label });
  }

  /* ---------- v1.4: breadcrumb ----------------------------------- */

  function _breadcrumbContainer(crumb_id) {
    return document.querySelector(
      '[data-nac-role="breadcrumb"][data-nac-id="' + crumb_id + '"]');
  }
  function _breadcrumbItems(rootEl) {
    if (!rootEl) return [];
    return Array.prototype.slice.call(
      rootEl.querySelectorAll('[data-nac-role="breadcrumb-item"]'));
  }
  function list_breadcrumbs() {
    var roots = document.querySelectorAll('[data-nac-role="breadcrumb"]');
    var out = [];
    Array.prototype.forEach.call(roots, function (root) {
      var items = _breadcrumbItems(root).map(function (el, idx) {
        var st = el.getAttribute('data-nac-state') || 'navigable';
        return {
          id:        el.getAttribute('data-nac-id'),
          label:     el.getAttribute('aria-label')
                       || el.textContent.trim(),
          depth:     idx,
          navigable: st === 'navigable',
          current:   st === 'current',
        };
      });
      out.push({
        id:    root.getAttribute('data-nac-id'),
        items: items,
      });
    });
    return out;
  }
  function navigate_breadcrumb(item_id) {
    var el = document.querySelector(
      '[data-nac-role="breadcrumb-item"][data-nac-id="'
        + item_id + '"]');
    if (!el) {
      // fallback: any anchor whose label matches
      el = document.querySelector('a[data-nac-id="' + item_id + '"]');
    }
    if (!el) {
      return Promise.reject(new NacError('not_found',
        'breadcrumb item not found: ' + item_id));
    }
    var root = el.closest('[data-nac-role="breadcrumb"]');
    var items = _breadcrumbItems(root);
    var depth = items.indexOf(el);
    var path = items.slice(0, depth + 1)
      .map(function (i) { return i.getAttribute('data-nac-id'); });
    _emit('nac:breadcrumb:navigated', {
      id:           root ? root.getAttribute('data-nac-id') : null,
      depth:        items.length - 1,
      path:         path,
      target_depth: depth,
    });
    _focusElement(el);
    el.click();
    return Promise.resolve({ ok: true });
  }

  /* ---------- v1.4: carousel ------------------------------------- */

  function _carousel(carousel_id) {
    return document.querySelector(
      '[data-nac-role="carousel"][data-nac-id="' + carousel_id + '"]');
  }
  function _carouselSlides(rootEl) {
    if (!rootEl) return [];
    return Array.prototype.slice.call(
      rootEl.querySelectorAll('[data-nac-role="carousel-slide"]'));
  }
  function _carouselCurrentIdx(rootEl) {
    var slides = _carouselSlides(rootEl);
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].getAttribute('data-nac-state') === 'active') return i;
    }
    return 0;
  }
  function list_carousels() {
    var roots = document.querySelectorAll('[data-nac-role="carousel"]');
    var out = [];
    Array.prototype.forEach.call(roots, function (root) {
      out.push({
        id:       root.getAttribute('data-nac-id'),
        total:    _carouselSlides(root).length,
        current_idx: _carouselCurrentIdx(root),
        autoplay: root.getAttribute('data-nac-state') === 'playing',
      });
    });
    return out;
  }
  function carousel_state(carousel_id) {
    var root = _carousel(carousel_id);
    if (!root) {
      throw new NacError('not_found',
        'carousel not found: ' + carousel_id);
    }
    var slides = _carouselSlides(root);
    return {
      current_idx: _carouselCurrentIdx(root),
      total:       slides.length,
      autoplay:    root.getAttribute('data-nac-state') === 'playing',
      slide_ids:   slides.map(function (s) {
        return s.getAttribute('data-nac-id');
      }),
    };
  }
  function _carousel_change(carousel_id, to_idx, trigger) {
    var root = _carousel(carousel_id);
    if (!root) {
      return Promise.reject(new NacError('not_found',
        'carousel not found: ' + carousel_id));
    }
    var slides = _carouselSlides(root);
    var total = slides.length;
    if (total === 0) {
      return Promise.reject(new NacError('invalid',
        'carousel has no slides'));
    }
    var from_idx = _carouselCurrentIdx(root);
    var bounded = ((to_idx % total) + total) % total;
    slides.forEach(function (s, i) {
      s.setAttribute('data-nac-state', i === bounded ? 'active' : 'inactive');
    });
    _emit('nac:carousel:slide_changed', {
      carousel_id: carousel_id,
      from_idx:    from_idx,
      to_idx:      bounded,
      total:       total,
      trigger:     trigger || 'programmatic',
    });
    return Promise.resolve({ ok: true });
  }
  function carousel_advance(carousel_id, delta) {
    var root = _carousel(carousel_id);
    if (!root) {
      return Promise.reject(new NacError('not_found',
        'carousel not found: ' + carousel_id));
    }
    var current = _carouselCurrentIdx(root);
    var d = (typeof delta === 'number') ? delta : 1;
    var trigger = d > 0 ? 'next' : 'prev';
    return _carousel_change(carousel_id, current + d, trigger);
  }
  function carousel_to(carousel_id, slide_idx) {
    return _carousel_change(carousel_id, slide_idx, 'dot');
  }
  function carousel_autoplay(carousel_id, on) {
    var root = _carousel(carousel_id);
    if (!root) {
      return Promise.reject(new NacError('not_found',
        'carousel not found: ' + carousel_id));
    }
    root.setAttribute('data-nac-state', on ? 'playing' : 'paused');
    _emit(on ? 'nac:carousel:autoplay_resumed'
             : 'nac:carousel:autoplay_paused',
      on ? { carousel_id: carousel_id }
         : { carousel_id: carousel_id, dismissed_by: 'programmatic' });
    return Promise.resolve({ ok: true });
  }

  /* ---------- v1.4: timeline ------------------------------------- */

  function _timeline(timeline_id) {
    return document.querySelector(
      '[data-nac-role="timeline"][data-nac-id="' + timeline_id + '"]');
  }
  function _timelineItems(rootEl) {
    if (!rootEl) return [];
    return Array.prototype.slice.call(
      rootEl.querySelectorAll('[data-nac-role="timeline-item"]'));
  }
  function list_timelines() {
    var roots = document.querySelectorAll('[data-nac-role="timeline"]');
    var out = [];
    Array.prototype.forEach.call(roots, function (root) {
      var items = _timelineItems(root);
      out.push({
        id:         root.getAttribute('data-nac-id'),
        is_live:    root.getAttribute('data-nac-state') === 'live',
        ordering:   root.getAttribute('data-nac-ordering') || 'newest_first',
        item_count: items.length,
      });
    });
    return out;
  }
  function timeline_state(timeline_id) {
    var root = _timeline(timeline_id);
    if (!root) {
      throw new NacError('not_found',
        'timeline not found: ' + timeline_id);
    }
    var items = _timelineItems(root);
    var times = items.map(function (it) {
      return it.getAttribute('data-nac-ts');
    }).filter(Boolean).sort();
    return {
      is_live:    root.getAttribute('data-nac-state') === 'live',
      ordering:   root.getAttribute('data-nac-ordering') || 'newest_first',
      oldest_ts:  times[0] || null,
      newest_ts:  times[times.length - 1] || null,
      item_count: items.length,
    };
  }
  function _timeline_load(timeline_id, direction, limit) {
    var root = _timeline(timeline_id);
    if (!root) {
      return Promise.reject(new NacError('not_found',
        'timeline not found: ' + timeline_id));
    }
    var resolver = root.__nac_timeline_resolver;
    var p;
    if (typeof resolver === 'function') {
      p = Promise.resolve(resolver(direction, limit || 20));
    } else {
      p = Promise.resolve([]);
    }
    return p.then(function (items) {
      var arr = items || [];
      _emit('nac:timeline:loaded_more', {
        timeline_id: timeline_id,
        direction:   direction,
        count:       arr.length,
      });
      return arr;
    });
  }
  function timeline_load_older(timeline_id, limit) {
    return _timeline_load(timeline_id, 'older', limit);
  }
  function timeline_load_newer(timeline_id, limit) {
    return _timeline_load(timeline_id, 'newer', limit);
  }

  /* ---------- v1.4: reorder (extends v1.1 drag-and-drop) --------- */

  function reorder(list_id, item_id, to_index) {
    var list = _byId(list_id);
    if (!list) {
      return Promise.reject(new NacError('not_found',
        'list not found: ' + list_id));
    }
    var item = list.querySelector(
      '[data-nac-role="draggable"][data-nac-id="' + item_id + '"]')
      || _byId(item_id);
    if (!item) {
      return Promise.reject(new NacError('not_found',
        'draggable item not found: ' + item_id));
    }
    var siblings = Array.prototype.slice.call(list.querySelectorAll(
      '[data-nac-role="draggable"]'));
    var from_index = siblings.indexOf(item);
    var bounded = Math.max(0, Math.min(to_index, siblings.length - 1));
    if (from_index === -1) {
      return Promise.reject(new NacError('invalid',
        'item is not a draggable child of list'));
    }
    if (from_index !== bounded) {
      var ref = siblings[bounded];
      if (bounded > from_index && ref && ref.nextSibling) {
        list.insertBefore(item, ref.nextSibling);
      } else if (ref) {
        list.insertBefore(item, ref);
      }
    }
    _emit('nac:list:reordered', {
      list_id:    list_id,
      item_id:    item_id,
      from_index: from_index,
      to_index:   bounded,
    });
    return Promise.resolve({ ok: true });
  }

  /* ---------- v1.6.2: drag_drop (implements spec sec 13.4) -------- */

  /* NAC.drag_drop(source_nac_id, target_nac_id, opts?)
     Programmatic drag-and-drop. Spec sec 13.4 declared this signature
     since v1.1 but the runtime never implemented it -- a user testing
     the v1.6.1 demo discovered the gap when the agent tried to invoke
     it via NAC.click on a draggable (which timed out). v1.6.2 closes
     the loop.

     Contract:
     - source MUST have data-nac-role="draggable".
     - target MUST have data-nac-role="drop-target".
     - Emits nac:drag:started immediately, nac:drag:over after the
       focus barrier, nac:drag:dropped after the DOM move settles.
       Each event carries plugin + plugin_instance_id per sec 7.4.
     - Honors v1.6.1 default-on per-plugin bus: events fire on both
       the plugin root and document.
     - Resolves on success { ok: true, source, target } or rejects
       with NacError('not_found' | 'invalid' | 'role_mismatch'). */
  function drag_drop(source_nac_id, target_nac_id, opts) {
    opts = opts || {};
    var source = _byId(source_nac_id);
    if (!source) {
      return Promise.reject(new NacError('not_found',
        'draggable not found: ' + source_nac_id));
    }
    var target = _byId(target_nac_id);
    if (!target) {
      return Promise.reject(new NacError('not_found',
        'drop-target not found: ' + target_nac_id));
    }
    if (source.getAttribute('data-nac-role') !== 'draggable') {
      return Promise.reject(new NacError('role_mismatch',
        'source must have data-nac-role="draggable", got: ' +
        (source.getAttribute('data-nac-role') || 'null')));
    }
    if (target.getAttribute('data-nac-role') !== 'drop-target') {
      return Promise.reject(new NacError('role_mismatch',
        'target must have data-nac-role="drop-target", got: ' +
        (target.getAttribute('data-nac-role') || 'null')));
    }

    /* v1.4.1 focus barrier: scroll source into view + visual pulse
       so a human reviewer sees what the agent is doing. */
    _focusElement(source);

    source.setAttribute('data-nac-state', 'dragging');
    _emit('nac:drag:started', { from_nac_id: source_nac_id });

    /* Tiny delay so the focus pulse is observable before the DOM
       move settles. Mirrors the demo's existing UX. */
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          target.setAttribute('data-nac-state', 'drop-target-over');
          _emit('nac:drag:over', {
            from_nac_id: source_nac_id,
            over_nac_id: target_nac_id,
          });
          /* Remove any "drop here" placeholder the demo stages. */
          var empty = target.querySelector('.ne-drag-empty');
          if (empty) empty.parentNode.removeChild(empty);
          /* Optional to_index for ordered drop-targets; otherwise
             append at end. */
          if (typeof opts.to_index === 'number') {
            var siblings = Array.prototype.slice.call(
              target.querySelectorAll('[data-nac-role="draggable"]'));
            var bounded = Math.max(0, Math.min(opts.to_index, siblings.length));
            var ref = siblings[bounded] || null;
            if (ref) target.insertBefore(source, ref);
            else target.appendChild(source);
          } else {
            target.appendChild(source);
          }
          source.setAttribute('data-nac-state', 'idle');
          target.setAttribute('data-nac-state', 'idle');
          _emit('nac:drag:dropped', {
            from_nac_id:   source_nac_id,
            target_nac_id: target_nac_id,
            value:         opts.value !== undefined ? opts.value : null,
          });
          resolve({ ok: true, source: source_nac_id, target: target_nac_id });
        } catch (err) {
          source.setAttribute('data-nac-state', 'idle');
          target.setAttribute('data-nac-state', 'idle');
          _emit('nac:drag:cancelled', {
            from_nac_id: source_nac_id,
            error:       err && err.message ? err.message : String(err),
          });
          reject(err instanceof Error ? err :
            new NacError('invalid', String(err)));
        }
      }, 80);
    });
  }

  /* ---------- Install -------------------------------------------- */

  global.NAC = {
    __nac_v1_installed: true,
    version:      '1.6.3',
    spec_version: '1.6',
    /* registry */
    register:        register,
    unregister:      unregister,
    manifest:        manifest,
    /* read */
    describe:        describe,
    list:            list,
    find:            find,
    read_feedback:   read_feedback,
    snapshot_state:  snapshot_state,
    /* write */
    click:           click,
    fill:            fill,
    select:          select,
    tab:             tab,
    set_mode:        set_mode,
    /* v1.4.1 -- voice/agent ergonomic helpers */
    click_by_verb:   click_by_verb,
    tab_by_label:    tab_by_label,
    /* utility */
    wait_for:        wait_for,
    screenshot:      screenshot,
    validate:        validate,
    /* v1.5.1 -- cross-plugin validator */
    validate_global: validate_global,
    /* v1.6.1 -- tolerance config for retiring historic findings */
    set_validation_tolerance: set_validation_tolerance,
    get_validation_tolerance: get_validation_tolerance,
    /* v1.6.1 -- canonical "is the UI blocked?" probe */
    is_blocked:      is_blocked,
    /* v1.2 -- dynamic options */
    options:                 options,
    search_options:          search_options,
    invalidate_options:      invalidate_options,
    set_options_resolver:    set_options_resolver,
    /* v1.2 -- window chrome */
    minimize:        minimize,
    maximize:        maximize,
    restore:         restore,
    fullscreen:      fullscreen,
    /* v1.2 -- discovery */
    system_map:                  system_map,
    capabilities:                capabilities,
    set_system_map_provider:     set_system_map_provider,
    set_capabilities_provider:   set_capabilities_provider,
    /* v1.4.1 -- discovery layer declaration */
    system_map_layers:           system_map_layers,
    /* v1.6.0 -- plugin reset primitive */
    reset:                       reset,
    set_reset_provider:          set_reset_provider,
    /* v1.2 -- section landmarks */
    list_sections:               list_sections,
    go_to_section:               go_to_section,
    /* v1.3 -- toast / banner / confirm */
    toast:                       toast,
    list_toasts:                 list_toasts,
    dismiss_toast:               dismiss_toast,
    list_banners:                list_banners,
    dismiss_banner:              dismiss_banner,
    confirm:                     confirm_dialog,
    list_pending_confirms:       list_pending_confirms,
    /* v1.3 -- stepper */
    step_next:                   step_next,
    step_back:                   step_back,
    step_to:                     step_to,
    step_state:                  step_state,
    /* v1.3 -- tree */
    tree_expand:                 tree_expand,
    tree_collapse:               tree_collapse,
    tree_select:                 tree_select,
    tree_path:                   tree_path,
    /* v1.3 -- tag-input */
    add_tag:                     add_tag,
    remove_tag:                  remove_tag,
    list_tags:                   list_tags,
    /* v1.3 -- drawer / bottom-sheet */
    open_drawer:                 open_drawer,
    close_drawer:                close_drawer,
    peek_drawer:                 peek_drawer,
    /* v1.3 -- calendar */
    calendar_view:               calendar_view,
    calendar_go_to:              calendar_go_to,
    calendar_select_event:       calendar_select_event,
    calendar_list_events:        calendar_list_events,
    /* v1.3 -- chart */
    chart_data:                  chart_data,
    chart_toggle_series:         chart_toggle_series,
    chart_filter:                chart_filter,
    /* v1.3 -- map */
    map_focus:                   map_focus,
    map_select_marker:           map_select_marker,
    map_toggle_layer:            map_toggle_layer,
    list_markers:                list_markers,
    /* v1.3 -- richtext */
    richtext_format:             richtext_format,
    richtext_insert_link:        richtext_insert_link,
    richtext_insert_mention:     richtext_insert_mention,
    /* v1.4 -- breadcrumb */
    list_breadcrumbs:            list_breadcrumbs,
    navigate_breadcrumb:         navigate_breadcrumb,
    /* v1.4 -- carousel */
    list_carousels:              list_carousels,
    carousel_state:              carousel_state,
    carousel_advance:            carousel_advance,
    carousel_to:                 carousel_to,
    carousel_autoplay:           carousel_autoplay,
    /* v1.4 -- timeline */
    list_timelines:              list_timelines,
    timeline_state:              timeline_state,
    timeline_load_older:         timeline_load_older,
    timeline_load_newer:         timeline_load_newer,
    /* v1.4 -- reorder (in-list) */
    reorder:                     reorder,
    /* v1.6.2 -- drag_drop (cross-list, implements spec sec 13.4) */
    drag_drop:                   drag_drop,
    /* v1.2 -- error codes */
    errors: {
      RemoteSourceRequiresSearch: 'RemoteSourceRequiresSearch',
      OptionsUnavailable:         'OptionsUnavailable',
      SystemMapNotProvided:       'SystemMapNotProvided',
      CapabilitiesNotProvided:    'CapabilitiesNotProvided',
    },
    /* config */
    config: {
      default_timeout_ms: 5000,
    },
    /* errors */
    NacError:        NacError,
  };

  document.dispatchEvent(new CustomEvent('nac:installed', {
    detail: { version: global.NAC.version, spec: global.NAC.spec_version },
  }));
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
