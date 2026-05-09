/* @nac-spec/telemetry -- skeleton (v2.0-rc2 Mistral T7-F3).
   Base interface for NAC event export to observability stacks.
   Adapter packages (telemetry-sentry, telemetry-datadog,
   telemetry-otel) implement this interface. Phase 4 fills out the
   reference Sentry adapter; community owns Datadog + OTel. */
'use strict';

/* Default events of interest for telemetry export. */
var DEFAULT_EVENTS = [
  'nac:command_pending',
  'nac:command_done',
  'nac:command_failed',
  'nac:command_rejected',
  'nac:duplicate_warn',
  'nac:depth_warn',
  'nac:i18n_skipped',
  'nac:adopt_failed',
  'nac:shadow_blocked',
  'nac:iframe_untrusted',
  'nac:iframe_handshake_timeout',
  'nac:virtual_resolver_threw',
  'nac:virtual_resolver_slow',
  'nac:webview_attestor_error'
];

function attach(adapter, opts) {
  opts = opts || {};
  var events = opts.events || DEFAULT_EVENTS;
  if (!adapter || typeof adapter.report !== 'function') {
    throw new Error('[@nac-spec/telemetry] adapter must implement report(eventName, detail)');
  }
  events.forEach(function (eventName) {
    document.addEventListener(eventName, function (e) {
      try { adapter.report(eventName, e.detail || {}); }
      catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[@nac-spec/telemetry] adapter.report threw:', err);
        }
      }
    });
  });
  return function detach() {
    /* Phase 4: implement detach by tracking listeners */
  };
}

module.exports = {
  attach: attach,
  DEFAULT_EVENTS: DEFAULT_EVENTS
};
