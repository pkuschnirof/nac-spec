/* nac_helpers.js
 *
 * Shared helper library used by the UiPath, Automation Anywhere
 * and Blue Prism samples. The same JavaScript snippet works in
 * every "execute JavaScript" activity / action.
 *
 * Each function returns a JSON-stringified result (not an object)
 * because most RPA platforms exchange strings across the
 * JS<->orchestrator boundary. Strings are universal; objects need
 * mapping per platform.
 *
 * License: MIT.
 */

/* Wait until window.NAC is ready. Returns "ready" or "timeout". */
async function nacAwait(timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 8000);
  while (Date.now() < deadline) {
    if (window.NAC && window.NAC.__nac_v1_installed) return JSON.stringify({ status: 'ready' });
    await new Promise(r => setTimeout(r, 100));
  }
  return JSON.stringify({ status: 'timeout' });
}

/* Discover system map. Returns the SystemMap as a JSON string. */
async function nacSystemMap() {
  try {
    const map = await window.NAC.system_map();
    return JSON.stringify({ ok: true, map: map });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String(err && err.message || err) });
  }
}

/* Click a NAC action and wait for action:succeeded. */
async function nacClickAndWait(nacId, timeoutMs) {
  try {
    await window.NAC.click(nacId);
    const ev = await window.NAC.wait_for('action:succeeded', timeoutMs || 5000);
    return JSON.stringify({ ok: true, event: ev || null });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String(err && err.message || err) });
  }
}

/* Fill a NAC field (any field type). */
async function nacFill(nacId, value) {
  try {
    await window.NAC.fill(nacId, value);
    return JSON.stringify({ ok: true });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String(err && err.message || err) });
  }
}

/* Search options on a remote combobox. Returns the option list. */
async function nacSearchOptions(nacId, query, limit) {
  try {
    const opts = await window.NAC.search_options(nacId, query, limit || 10);
    return JSON.stringify({ ok: true, options: opts });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String(err && err.message || err) });
  }
}

/* Read the snapshot of the current view's state. */
function nacSnapshot() {
  try {
    return JSON.stringify({ ok: true, state: window.NAC.snapshot_state() });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String(err && err.message || err) });
  }
}

/* Capture all NAC events that fire while a code block runs.
 * Pass the block as a JS function source string; this helper will
 * eval() it (yes, in an RPA context the JS is trusted by definition). */
async function nacWithCapture(blockSrc) {
  const captured = [];
  const names = [
    'nac:action:dispatching', 'nac:action:succeeded', 'nac:action:failed',
    'nac:field:changed', 'nac:options:loaded', 'nac:plugin:opened'
  ];
  const handlers = {};
  names.forEach(n => {
    handlers[n] = ev => captured.push({ name: n, t: Date.now(), detail: ev.detail || {} });
    document.addEventListener(n, handlers[n]);
  });
  let result, err = null;
  try {
    /* eslint-disable-next-line no-eval */
    result = await eval('(async () => { ' + blockSrc + ' })()');
  } catch (e) {
    err = String(e && e.message || e);
  }
  names.forEach(n => document.removeEventListener(n, handlers[n]));
  return JSON.stringify({ ok: !err, error: err, result: result, events: captured });
}

/* Public API exposed on window so RPA "Run JS" activities can call
 * by name without copy-pasting the bodies. */
window.__nacRpa = {
  await:          nacAwait,
  systemMap:      nacSystemMap,
  clickAndWait:   nacClickAndWait,
  fill:           nacFill,
  searchOptions:  nacSearchOptions,
  snapshot:       nacSnapshot,
  withCapture:    nacWithCapture,
};
