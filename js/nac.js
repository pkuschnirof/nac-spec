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

  /* ---------- v1.3: helpers shared across primitives ------------- */

  function _emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, {
      detail: detail || {}, bubbles: true,
    }));
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

  /* ---------- Install -------------------------------------------- */

  global.NAC = {
    __nac_v1_installed: true,
    version:      '1.3.0',
    spec_version: '1.3',
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
