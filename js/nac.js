/* =====================================================================
   NAC v1.0 -- Navegabilidad Automatica Compliance
   Reference JavaScript implementation.
   MIT License -- Pablo Kuschnirof + Sumi, 2026.
   =====================================================================

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

  function register(manifest) {
    if (!manifest || typeof manifest !== 'object') {
      throw NacError('invalid', 'manifest object required');
    }
    const slug = String(manifest.plugin_slug || '').trim();
    if (!slug) throw NacError('invalid', 'manifest.plugin_slug required');
    if (!manifest.version) manifest.version = '1.0.0';
    if (!manifest.nac_version) manifest.nac_version = '1.0';
    _manifests[slug] = manifest;
    document.dispatchEvent(new CustomEvent('nac:registered', {
      detail: { plugin: slug, version: manifest.version },
    }));
    return true;
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

  /* ---------- Public write API ------------------------------------ */

  async function click(nac_id, opts) {
    const el = _findElement(nac_id, opts);
    if (!el) throw NacError('not_found', 'No element with nac_id=' + nac_id);
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
      throw NacError('disabled', 'Element ' + nac_id + ' is disabled');
    }
    const succeed = wait_for('nac:action:succeeded', opts && opts.timeout || 5000)
      .then(function (r) { return { ok: true, event: r }; })
      .catch(function () { return null; });
    const fail = wait_for('nac:action:failed', opts && opts.timeout || 5000)
      .then(function (r) { return { ok: false, event: r }; })
      .catch(function () { return null; });
    el.click();
    const races = await Promise.race([
      succeed.then(function (r) { return r ? r : null; }),
      fail.then(function (r)    { return r ? r : null; }),
      new Promise(function (resolve) { setTimeout(function () { resolve({ ok: true, event: null }); }, 200); }),
    ]);
    return races || { ok: true, event: null };
  }

  async function fill(nac_id, value, opts) {
    const el = _findElement(nac_id, opts);
    if (!el) throw NacError('not_found', 'No field with nac_id=' + nac_id);
    if (el.disabled) throw NacError('disabled', 'Field ' + nac_id + ' is disabled');
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
    if (opt) { opt.click(); return { ok: true }; }
    throw NacError('not_found', 'option ' + option + ' not present in ' + nac_id);
  }

  async function tab(plugin, tab_key) {
    const root = document.querySelector('[data-nac-plugin="' + plugin + '"]');
    if (!root) throw NacError('not_found', 'plugin ' + plugin + ' not mounted');
    const tabEl = root.querySelector(
      '[data-nac-role="tab"][data-nac-id="' + tab_key + '"]'
    );
    if (!tabEl) throw NacError('not_found', 'tab ' + tab_key + ' missing');
    tabEl.click();
    try {
      await wait_for('nac:tab:changed', 1500);
    } catch (e) { /* tolerated */ }
    return { ok: true };
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

  function validate(plugin_slug) {
    const m = _manifests[plugin_slug];
    if (!m) return { ok: false, code: 'no_manifest' };
    const root = document.querySelector('[data-nac-plugin="' + plugin_slug + '"]');
    if (!root) return { ok: false, code: 'plugin_not_mounted' };
    const found = {};
    Array.prototype.forEach.call(
      root.querySelectorAll('[data-nac-id]'),
      function (el) { found[el.getAttribute('data-nac-id')] = true; }
    );
    const missing = [];
    function check(arr) {
      (arr || []).forEach(function (e) {
        if (!found[e.nac_id]) missing.push(e.nac_id);
      });
    }
    check(m.fields); check(m.actions); check(m.tabs);
    check(m.kpis);   check(m.charts);
    if (m.rows && m.rows.cells) {
      /* row cells appear inside repeating row markup; presence
         optional if the table is empty. Validator only flags missing
         when at least one row exists. */
    }
    return {
      ok:        missing.length === 0,
      missing:   missing,
      manifest:  m,
      timestamp: Date.now(),
    };
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

  /* ---------- Install -------------------------------------------- */

  global.NAC = {
    __nac_v1_installed: true,
    version:      '1.2.1',
    spec_version: '1.2',
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
    /* utility */
    wait_for:        wait_for,
    screenshot:      screenshot,
    validate:        validate,
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
    /* v1.2 -- section landmarks */
    list_sections:               list_sections,
    go_to_section:               go_to_section,
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
