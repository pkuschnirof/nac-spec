# NAC v2.0 -- Native Accessibility Contract

**Version**: 2.0.0 (spec) / 2.0.0 (reference runtime).
**Status**: Draft -- Round 3 peer review pending.
**Date**: 2026-05-09.
**License**: MIT.
**Replaces**: Sec 6.2.27 of v1.9 spec (validator behaviour) is
extended; all other v1.9 sections retained verbatim.
**Strict superset of**: NAC v1.9.0 (commit `185c7df`, tag `v1.9.0`).

This document is the normative spec for NAC v2.0. It is intentionally
a **delta document**: the v1.9 spec (`spec/NAC-v1.0.md`) remains the
authoritative baseline; v2.0 sections below extend or, where
explicitly noted, refine it.

For the formal RFC walk-through (with rationale, threat model, and
implementation outline), see `RFC_v2.0.0.md`. This file is the
spec-as-reference; that file is the spec-as-explanation.

---

## Section structure (v2.0 deltas)

- **15.1** Hierarchical scope constructor
- **15.2** Auto-registration from DOM
- **15.3** Adopt third-party non-compliant
- **15.4** Bridge Shadow DOM
- **15.5** Bridge same-vendor iframes
- **15.6** Declare virtual manifests
- **15.7** Capture ephemeral UI
- **15.8** Multi-tenant prefix
- **15.9** HMAC mandatory at NAC-3
- **15.10** isTrusted attestation
- **15.11** i18n contract (L1: format + resolver + lint)
- **15.12** Conformance levels reaffirmed
- **15.13** Performance budget at NAC-3
- **15.14** Backward compatibility -- strict superset proof

---

## 15.1 Hierarchical scope constructor

### Normative requirement

Implementations of NAC v2.0 MUST provide `NAC.scope(spec)` which
returns a sub-API supporting `scope()` recursion + `register()` of
elements. The returned slug for a registered element MUST be the
parent chain joined by separator `.`, plus the leaf slug.

### Constraints

- Slug component MUST match `[a-zA-Z0-9_-]+` (no separator inside).
- Maximum scope depth: 6 levels (root + 5 children). Implementations
  MUST throw `NacError('depth_exceeded')` past this limit.
- Implementations SHOULD emit `nac:depth_warn` event past 4 levels.
- Re-registration of the same slug MUST be idempotent under
  same-element calls, and MUST emit `nac:duplicate_warn` event under
  different-element calls. Behaviour at NAC-3 strict mode: the
  validator emits `error` finding `duplicate_strict`.
- Each registered element MUST have its `data-nac-id` attribute set
  to the full slug.
- Each registered element MUST have its `data-nac-parent` attribute
  set to the space-separated ancestor chain.

### API signature

```typescript
interface ScopeNode {
  id: string;                       // full slug from root
  depth: number;                    // 1..6
  label_i18n: I18nMap | null;
  scope(spec: ScopeSpec): ScopeNode;
  register(spec: RegisterSpec): RegisteredEntry;
}

interface RegisteredEntry {
  id: string;                       // full slug
  invoke(params?: object): Promise<any>;
}
```

---

## 15.2 Auto-registration from DOM

### Normative requirement

Implementations MUST provide `NAC.autoRegister(el, opts)` and
`NAC.autoRegister.watch(containerEl, opts)`. Both MUST walk the
ancestor chain of `el` looking for the nearest `[data-nac-scope]`
attribute and use its value as parent prefix.

### Constraints

- Default throttle: 50ms (debounce window for `watch`).
- Configurable via `opts.throttleMs`.
- Per-page hard cap: 200 `autoRegister` calls per second. Excess
  silently batched.
- The registered slug = `<ancestor-scope> + '.' + <leaf>`. Leaf
  is `el.id`, else `el.dataset.nacAction`, else
  `'auto_' + hash(el.outerHTML.slice(0,100))`.
- `MutationObserver` MUST clean up on element removal:
  manifest entry deleted, `nac:unregistered` event emitted.
- **i18n strict mode** (default at NAC-3): registration MUST be
  skipped (with `nac:i18n_skipped` event) when `el` has neither
  `data-i18n-key` (resolving against the registered catalog) nor
  an explicit `label_i18n` in the manifest. Permissive mode allows
  mono-locale registration with `_autoderived: true` flag.

---

## 15.3 Adopt third-party non-compliant

### Normative requirement

Implementations MUST provide `NAC.adopt(rule)` taking a CSS selector
plus a `derive` object of pure functions deriving slug, role,
intent, label_i18n, and irreversible flag.

### Constraints

- Selector is matched against the document on initial call AND
  (when `observe: true`) on subsequent DOM mutations.
- Each match registers as a manifest entry under `parent.derived_slug`.
- `derive` functions MUST NOT throw; if they do, the rule is skipped
  for that element and `nac:adopt_failed` is emitted.
- Mono-locale `label_i18n` from `derive.label_i18n` carries
  `_autoderived: true`. NAC-3 strict mode emits
  `i18n_mono_locale_autoderived` finding (warn).
- Stable_id strategy: by default, slug is recomputed each invocation.
  Hosts MAY set `stable_id_strategy: 'frozen-on-first-encounter'` to
  freeze after first registration.

### Pre-baked rules library

Implementations MAY ship `@nac-spec/rules-<vendor>` packages
containing rules for famous third-party widgets. These are
independently versioned from the core spec.

---

## 15.4 Bridge Shadow DOM

### Normative requirement

Implementations MUST provide `NAC.bridgeShadowRoot(host)` which
walks the open shadow root of `host` recursively (max 6 levels of
nested shadow roots) and merges all `[data-nac-id]` elements found
into the manifest.

### Constraints

- Closed shadow roots cannot be penetrated. The implementation
  MUST emit `nac:shadow_blocked` event with the host element
  reference when called on a closed-shadow host.
- Nested shadow root depth limit: 6. Past this, MUST emit
  `nac:shadow_depth_exceeded`.

---

## 15.5 Bridge same-vendor iframes

### Normative requirement

Implementations MUST provide `NAC.bridgeIframe(iframeEl, opts)`
implementing the "NAC iframe channel v1" wire protocol over
`postMessage`.

### Wire protocol

1. Parent posts `{ns:'nac.iframe.v1', cmd:'handshake', version:'2.0'}`.
2. Iframe responds `{ns:'nac.iframe.v1', cmd:'handshake_ack', version:'2.0', manifest_version:1}`.
3. Parent posts `{ns:'nac.iframe.v1', cmd:'describe'}`.
4. Iframe responds `{ns:'nac.iframe.v1', cmd:'describe_result', manifest:{...}}`.
5. Parent merges manifest prefixed `iframe.<iframeId>.<innerSlug>`.

### Trust model

- `trusted_origins` is a hard allowlist. Messages from other origins
  MUST be silently dropped + emit `nac:iframe_untrusted`.
- Cross-origin agent-source events MUST sign with both the iframe's
  HMAC secret AND the parent's HMAC secret. The `source.signature_chain[]`
  field carries the chained signatures.

### Constraints

- `timeout_ms` default 5000ms; longer handshakes fail with
  `iframe_handshake_timeout`.
- Major version mismatch (parent v2 vs iframe v3+) emits
  `nac:iframe_version_mismatch` and rejects.

---

## 15.6 Declare virtual manifests

### Normative requirement

Implementations MUST provide `NAC.declareVirtual(spec)` taking a
`slug_pattern` (containing `{i}`), a `count` (number or function),
and a `resolver(i): ManifestEntry` function.

### Constraints

- `describe()` MUST report virtualized blocks with `is_virtual: true`
  flag plus a sample of head + middle + tail (10 entries).
- `find('<pattern with i resolved>')` MUST call `resolver(i)` on
  demand.
- `resolver` SHOULD be synchronous-or-fast (target: <10ms p95).
  Async resolvers MUST be flagged with `nac:virtual_async` so the
  agent expects latency.
- Re-declaring the same `slug_pattern` replaces the previous block.

---

## 15.7 Capture ephemeral UI

### Normative requirement

Implementations MUST provide `NAC.captureEphemeral(opts)` which
records insertions + removals of `[data-nac-id]` elements that
happen within `duration_ms` (default 3000) into a ring buffer of
size `ring_size` (default 100).

### Constraints

- The ring buffer entries MUST include `slug`, `role`, `label`,
  `added_at`, `removed_at`, `duration_ms`.
- `describe()` MUST expose `ephemeral_log` field with the buffer
  contents.
- Memory cap: `ring_size * ~500 bytes` per page.

---

## 15.8 Multi-tenant prefix

### Normative requirement

Implementations MUST provide `NAC.setTenantPrefix(slug)` which
prepends the prefix to every subsequent registration slug.

### Constraints

- Prefix MUST be set before first `register()` call. Calling
  `setTenantPrefix` after registrations have started MUST throw
  `tenant_prefix_locked`.
- Duplicate-id lint MUST become tenant-prefix-aware.
- `describe()` MUST expose `tenant_prefix` field.

---

## 15.9 HMAC mandatory at NAC-3

### Normative requirement (extending v1.9 sec 6.2.27)

`validate_event_conformance` MUST verify that every captured event
detail with `source.type === 'agent'` carries a `source.signature`
that successfully verifies against the host's registered HMAC secret
via `verify_provenance(detail, secret) === true`.

Events with `source.type === 'agent'` AND missing or invalid signature
MUST be counted as failures (severity `error` at NAC-3).

The runtime helper `check_canonical_shape(eventType, detail)` MUST
return `{ok: false, reason: 'agent_source_missing_signature' | 'agent_source_invalid_signature'}`
under the same conditions.

### Secret registration

`NAC.set_provenance_secret(secretOrSecrets)` accepts `string |
string[]`. The verifier tries each secret in order; first match wins.
This supports rotation overlap.

### Constraints

- HMAC algorithm: SHA-256.
- Constant-time compare REQUIRED for verification.
- NAC-1 and NAC-2 keep signing OPTIONAL. Only NAC-3 enforces.

---

## 15.10 isTrusted attestation

### Normative requirement

The runtime MUST capture `event.isTrusted` of the originating DOM
event (click/keydown/keyup/touchstart/pointerdown) at the moment of
NAC action invocation, and MUST copy it into
`source.user_gesture_attested: boolean`.

### Enforcement matrix at NAC-3

| `source.type` | `signature` required | `user_gesture_attested` required |
|---|---|---|
| `'user'` | no | yes, must be `true` |
| `'agent'` | yes (HMAC) | not constrained |
| `'script'` | no | must be `false` |

### Forbidden combinations at NAC-3

- `'user'` + `attested=false` -> finding `user_gesture_unattested`
- `'agent'` + missing/invalid signature -> finding
  `agent_source_missing_signature` / `agent_source_invalid_signature`
- `'script'` + `attested=true` -> finding `script_claims_user_gesture`

### Manual override

Testing tools MAY call `NAC.attestUserGesture({trusted: false, type: 'script'})`
to declare an upcoming synthetic interaction as a script. The
runtime MUST honour this override for the next NAC action invocation
(within 100ms freshness window) and ignore it thereafter.

### Mobile WebView attestation hook (v2.0-rc2, Mistral T4-F1)

Mobile WebView contexts (Cordova, Capacitor, React Native WebView,
Ionic, Flutter WebView) have inconsistent `Event.isTrusted`
semantics across platforms. Some platforms always return false for
synthesised events from the host shell; others propagate the OS-
level trust status; others depend on the WebView engine version.

Hosts running in those environments MUST register a custom
attestation function via:

```javascript
NAC.setMobileWebViewAttestation(function (event) {
  // Return true if this gesture corresponds to a real user touch
  // verifiable through the platform's native APIs (e.g.,
  // Capacitor's Haptics plugin event timestamp, RN's
  // GestureResponderEvent, Cordova's touch event with native
  // signature). Return false otherwise.
  return platformVerifiedUserGesture(event);
});

// Or restore default isTrusted-based derivation:
NAC.setMobileWebViewAttestation(null);
```

The custom attestor receives the raw DOM event and returns the
attested value. If the function throws, the runtime falls back to
`event.isTrusted`. Implementations MUST log a `nac:webview_attestor_error`
event in this case so the host can detect bugs in the attestor.

### Known WebView behaviours (non-normative)

This is a non-normative annex documenting platform behaviour
observed by the spec authors and review panel. Hosts SHOULD
verify against their target platform.

| Platform | `isTrusted` for real touch | Recommended attestor source |
|---|---|---|
| Capacitor (iOS) | `true` | `event.isTrusted` (default ok) |
| Capacitor (Android) | `true` (since v5.0) | `event.isTrusted` (default ok) |
| Cordova / PhoneGap | inconsistent across versions | platform-specific touch event handler |
| React Native WebView | `false` for JS-bridged events | `react-native-gesture-handler` event ID |
| Flutter WebView | `false` for synthesised | Flutter platform channel timestamp |
| Ionic Capacitor 6+ | `true` | `event.isTrusted` (default ok) |
| Tauri | `true` | `event.isTrusted` (default ok) |
| Electron | `true` | `event.isTrusted` (default ok) |

OS-level Computer Use (Anthropic's Computer Use, Talon in
privileged mode, Voice Access OS-level): produces `isTrusted=true`
because the OS dispatches real input events. The matrix in this
section permits this case as `type='agent' + attested=true`; hosts
that want to distinguish API-driven agents from OS-level agents
SHOULD set `source.os_level: true` as optional metadata (added in
v2.0-rc2 per Mistral T4-F2).

### `os_level` metadata field (v2.0-rc2, Mistral T4-F2)

Optional ProvenanceBlock field. When `source.type === 'agent'`,
hosts MAY set `source.os_level: true` to indicate the agent is
operating via OS-level events (Computer Use, Talon privileged,
Voice Access OS-level). The spec validator does not enforce this
field; it is for audit-log clarity only.

---

## 15.11 i18n contract (L1: format + resolver + lint)

### Normative requirement

Implementations MUST provide:

- `NAC.registerCatalog(obj)` -- merges into global catalog, last-key-wins.
- `NAC.t(key, opts?)` -- resolves to current locale (or `opts.locale`),
  falls back through `es -> en -> first-available`, returns key
  literal if catalog miss.
- `NAC.locale(code?)` -- getter when called without args, setter when
  called with a code. Setter MUST emit `nac:locale_changed` event AND
  set `dir="rtl"` on document root when locale is RTL.
- `NAC.setSupportedLocales(arr)` -- extends/replaces the supported
  list. Default 10: `[es,en,pt,fr,it,de,ja,zh,hi,ar]`.
- `NAC.setRTLLocales(arr)` -- extends/replaces the RTL list. Default
  4: `[ar,he,fa,ur]`.

### Catalog format (canonical)

```typescript
type Catalog = {
  [key: string]: {
    [locale: string]: string
  }
};
```

- Key: `[a-z0-9_.-]+`. No spaces, no Unicode.
- Value: non-empty string per locale.
- Sub-keys for plurals/cases: `key.singular`, `key.plural`,
  `key.genitive`, etc. Implementations MUST NOT auto-select sub-keys
  based on count (CLDR rules); host's i18n library decides.

### Validation findings (NAC-3)

| Finding | Severity | Trigger |
|---|---|---|
| `i18n_missing_locale` | error | key has fewer than supported locales |
| `i18n_orphan_key` | warn | catalog key not consumed by any registered manifest |
| `i18n_unused_locale` | warn | locale defined but no element uses it |
| `i18n_invalid_locale` | error | locale code not in supported list |
| `i18n_string_empty` | error | locale value is empty |
| `i18n_string_too_long` | warn | value > 1000 chars |
| `i18n_html_unescaped` | warn | value contains HTML markup |
| `i18n_mono_locale_autoderived` | warn | autoRegistered/adopted with `_autoderived: true` |

### Out of scope (deliberate)

- DOM mutation -- the host's i18n library does that.
- Plurals/gender selection -- host's i18n library does that.
- Number/date formatting -- `Intl.NumberFormat` / `Intl.DateTimeFormat`.
- Auto-translation -- adopters use Crowdin/Lokalise/AI; NAC validates
  the result.

See `docs/I18N_INTEGRATION_GUIDE.md` for the integration playbook.

---

## 15.12 Conformance levels reaffirmed

### NAC-1 (basic operability)
- All public APIs available.
- HMAC OPTIONAL.
- isTrusted attestation OPTIONAL.
- i18n_strict OPTIONAL.

### NAC-2 (audit-aware)
- HMAC RECOMMENDED (validator emits warnings on missing).
- isTrusted attestation RECOMMENDED.
- i18n_strict RECOMMENDED.

### NAC-3 (strict)
- HMAC MANDATORY for `source.type='agent'`.
- isTrusted attestation MANDATORY (per matrix in 15.10).
- i18n_strict RECOMMENDED at default `warn` severity (v2.0-rc2,
  Grok T5-F1 + Mistral T5-F2: error severity blocks incremental
  SaaS rollouts; default eased to warn). Hosts that need full
  strictness opt in via
  `set_validation_tolerance({i18n_strict: 'error'})`.
- Validator emits findings per the configured severity.
- Perf budget enforced (15.13).
- Duplicate-id lint MAY be set to error severity.

---

## 15.13 Performance budget at NAC-3

Revised in v2.0-rc2 per concurrent reviewer feedback (Grok T6-F1
medium + Mistral T6-F1 high + Mistral T6-F2 medium): targets and
hard-fail thresholds eased to match real Snapdragon 6 Gen 1
benchmarks. The previous rc1 numbers were tighter than typical
React/Svelte reconciliation overhead, risking false negatives in
conformance.

| Operation | Target (low-tier mobile 2026) | Hard fail | rc1 -> rc2 change |
|---|---|---|---|
| Boot register 1000 elements | 50ms | 100ms | unchanged |
| `autoRegister` per mutation | 2ms | 5ms | unchanged |
| `adopt` selector match per mutation | 5ms | **20ms** | was 15ms |
| `describe()` any size (with pagination) | **50ms** | **150ms** | was 30ms / 100ms |
| HMAC sign per command | 3ms | 10ms | unchanged |
| `NAC.t()` resolution | <0.1ms | 1ms | unchanged |
| Virtual resolver per call | <10ms | 50ms | unchanged |
| MutationObserver throttle (default) | **100ms** | tunable | was 50ms |

The MutationObserver throttle default is now **100ms** for
`autoRegister.watch` and `captureEphemeral` (was 50ms in rc1).
Hosts tune via `set_perf_tolerance({mutation_throttle_ms: <n>})`
when their workload requires lower latency. Going below 50ms is
discouraged on mid- and low-tier devices.

Implementations MUST expose `perf_probe` for conformance suite
measurement. Findings of type `perf_budget_exceeded` MUST emit at
error severity at NAC-3 when measurements exceed hard fail
threshold for >5% of samples in a 5-second window.

---

## 15.14 Backward compatibility -- strict superset proof

### Public API diff

See RFC_v2.0.0 section 11.1 for the full table. Summary:

- Zero v1.9 public API removed.
- Zero v1.9 event renamed.
- Zero v1.9 attribute removed.
- Zero behavioural change to v1.9 NAC-1 + NAC-2 plugin contracts.
- Single semantically-tightening change at NAC-3: agent-source
  events without HMAC signature are rejected. This is the intended
  behaviour change for the regulated-environments use case the
  closing v1.9 arbiter flagged.

### Implementation requirement

Implementations of v2.0 MUST:

1. Keep v1.9.0's public API surface intact.
2. Emit a `nac:v2_installed` event when the v2 layer is active.
3. Expose `NAC.version` reading `'2.0.0'`.

Implementations MAY ship as a single bundle containing both the
v1.9 baseline AND the v2.0 extensions (the reference impl uses
`nac.js` + `nac-v2-extensions.js`).

---

## Cross-references

- Formal RFC: `RFC_v2.0.0.md`
- Scope discussion: `docs/NAC_v20_SCOPE_AND_ECOSYSTEM.md`
- Operational plan: `docs/NAC_v20_ROADMAP_ACTIONABLE.md`
- I18n integration: `docs/I18N_INTEGRATION_GUIDE.md`
- Tooling skeletons: `packages/`
- Adopter case study: `case-studies/yujin.md` (in progress)
- v1.9 baseline spec: `spec/NAC-v1.0.md`

---

**Last updated**: 2026-05-09.
**Maintainer**: Pablo Adrian Kuschniroff, Sumi.
