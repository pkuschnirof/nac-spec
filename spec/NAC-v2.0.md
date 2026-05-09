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
- Slug component MUST NOT be empty (v2.0-rc3, DeepSeek T3.1 fix).
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
- **Intermediate scope label_i18n exposure** (v2.0-rc3, Claude T3.1):
  intermediate scope nodes (depths 2..N-1) MAY carry `label_i18n`
  even though they have no element binding. Implementations MUST
  expose these in `describe_v2()` output via the
  `v2_intermediate_scopes` field so consumers (assistive tech,
  agent IA) can render breadcrumb-style labels like "Shell ->
  Topbar -> Profile" in their UX.
- **Intermediate scope index growth** (v2.0-rc4, Mistral T7-F2):
  the index of intermediate scopes grows monotonically with
  unique scope paths. Realistic SPA cases are bounded
  (O(unique-scope-paths) typically <1000 entries). Hosts that
  dynamically create + discard scopes during a long-running
  session MUST call `NAC.gcIntermediateScopes(activePathSet)`
  periodically to prune stale entries, or `NAC.gcIntermediateScopes()`
  (no-arg) on full-shell teardown to clear the index.

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
  position-aware hash of (tagName + textContent + position-in-parent
  + outerHTML[0..80]) introduced rc3 (Claude T3.2 fix for hash
  collisions across templated cards).
- **Position-aware slug stability** (v2.0-rc4 documented limitation,
  Mistral T6-F1): the position-in-parent component of the hash
  means slugs CHANGE when the host reorders children (drag-drop
  reorder, list shuffle, virtualised re-render). Hosts that
  require stable IDs across reordering MUST either:
  (a) provide explicit `id` attributes on each interactive element
      (most preferred -- the runtime uses `el.id` as the leaf
      directly when present);
  (b) provide explicit `data-nac-action` slugs (also preferred);
  (c) for `adopt`-rule paths, set
      `stable_id_strategy: 'frozen-on-first-encounter'` to lock
      the derived slug after first registration.
  Without one of those mitigations, voice-control bookmarks or
  agent-saved slug references break under reordering. This is a
  documented trade-off between hash collision avoidance (the rc3
  fix) and slug stability under reordering.
- `MutationObserver` MUST clean up on element removal:
  manifest entry deleted, `nac:unregistered` event emitted.
- **i18n strict mode** (default at NAC-3): registration MUST be
  skipped (with `nac:i18n_skipped` event) when `el` has neither
  `data-i18n-key` (resolving against the registered catalog) nor
  an explicit `label_i18n` in the manifest. Permissive mode allows
  mono-locale registration with `_autoderived: true` flag.

### `data-nac-action` requirement (v2.0-rc4, Claude T8.2 codification)

At NAC-3, `data-nac-action` SHOULD be present on the target
element when its action is to be auto-derived. If absent, the
runtime MUST fall back to action inference from semantic role
(`<button>` -> click, `<a href>` -> navigate, `<input type=text>` ->
fill, etc.). The fallback path is REQUIRED by spec; bare SHOULD
without fallback is insufficient.

Whenever the runtime infers an action via this fallback path, the
validator MUST emit finding `data_nac_action_autoderived` (warn
severity by default at NAC-3). Hosts in regulated environments
that require explicit declaration opt in:

```javascript
NAC.set_validation_tolerance({autoderived_action: 'error'});
```

Mirrors the i18n_strict tolerance pattern from rc2. Rationale:
forcing `data-nac-action` as MUST would hard-fail any plugin
that legitimately uses semantic HTML (a `<button>` with
`aria-label` is unambiguously a click action without needing the
attribute). Bare SHOULD is too lax for audit pipelines; SHOULD
+ required-fallback + tolerance knob threads the needle.

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

### Scoped container (v2.0-rc3, Claude T3.3)

`adopt` rules MAY include a `containerEl: HTMLElement` field. When
present, the observer attaches to that subtree (not `document.body`).
This bounds the cost of selector matching for DOM-heavy pages
running many adopt rules concurrently. Recommended when a rule
targets a known UI region (e.g. third-party widget container) and
not the whole page.

### Derive function performance (v2.0-rc3, Claude T3.3)

`derive.slug`, `derive.role`, `derive.label_i18n`, etc. run
synchronously inside the MutationObserver callback. They MUST NOT
exceed 5ms per call on low-tier mobile 2026; implementations
SHOULD measure and emit `nac:adopt_derive_slow` event when a
derive exceeds the budget for >5% of samples. An untrusted
third-party rules library running a slow derive (e.g.
`el.textContent` on a 5MB DOM node) regresses the host's mutation
observer hot path silently otherwise.

### Closed Shadow DOM limitation (v2.0-rc3, DeepSeek T3.3)

`adopt` rules do NOT penetrate closed Shadow DOM. If a target
element is inside a closed shadow root (browser security
constraint), the rule fails silently. Penetrating open shadow
roots is the responsibility of `bridgeShadowRoot` (sec 15.4),
not `adopt`. Implementations SHOULD emit `nac:adopt_blocked` when
detection is possible (e.g. when the rule's CSS selector targets
a known custom-element host with closed shadow).

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

## 15.5 Bridge same-vendor iframes (rc4 hardened)

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

### NAC-3 fail-closed enforcement (v2.0-rc4, Mistral T7-F1)

At NAC-3 conformance level, the runtime MUST fail-closed when:

- `bridgeIframe` is invoked but `set_provenance_secret` has NOT
  been called. New finding `iframe_no_secret_at_nac3` emitted;
  promise rejects with `iframe_no_secret_at_nac3`.
- An incoming `handshake_ack` or `describe_result` carries no
  `signature` field while a secret IS registered. New finding
  `iframe_signature_missing` (already declared in rc3) escalates
  to error severity at NAC-3 and rejects.

Hosts opt into NAC-3 enforcement either by passing
`opts.nac_level: 3` to `bridgeIframe()` OR by globally setting
`set_validation_tolerance({iframe_strict: 'error'})`.

NAC-1 and NAC-2 keep fail-open behaviour (rc3 default) for
backwards compatibility: missing secret + missing signature emits
`nac:iframe_signature_missing` but allows the handshake to
complete.

### describe_result HMAC verification (v2.0-rc4, Mistral T4-F2.1)

The original rc3 implementation verified HMAC only on
`handshake_ack`. The spec mandate (cross-origin agent-source HMAC
chain) extends to all messages, not just the handshake. rc4
verifies signatures on `describe_result` messages too:

- If a secret is registered AND `describe_result.signature`
  verifies: emit `nac:iframe_describe_received` with the manifest.
- If signature missing: emit `nac:iframe_signature_missing` and
  drop the manifest at NAC-3 (or pass through with warn at lower
  levels).
- If signature invalid: emit `nac:iframe_signature_invalid` and
  drop unconditionally.

The handshake promise still settles on `handshake_ack`; subsequent
`describe_result` messages are exposed via the
`nac:iframe_describe_received` event for callers that subscribe.

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
- **Resolver idempotency** (v2.0-rc3, DeepSeek T3.6): the
  resolver MUST be idempotent within a single `describe()` call.
  Implementations DO NOT enforce this -- it is a caller
  contract. Resolvers that mutate state across calls (e.g.
  incrementing a counter) produce inconsistent manifest output.
- **Pattern regex safety** (v2.0-rc3, Claude T3.6): runtime MUST
  escape regex metacharacters in the static parts of the pattern
  before substituting `{i}`. Patterns containing `.`, `[`, `]`,
  `*`, `+`, `?` are common (e.g. `pipeline.runs.row.{i}`); without
  escaping a malicious URL or DOM-injected slug could match
  arbitrary patterns.

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
- **Fast-toast limitation** (v2.0-rc3, DeepSeek T3.7): elements
  added and removed within the MutationObserver throttle window
  (100ms default in rc2+) are not captured. Toasts shorter than
  ~100ms are not reliably observable; hosts SHOULD ensure toast
  duration exceeds the throttle to be agent-visible.
- **PII risk** (v2.0-rc3, Claude T3.7): the captured `label`
  field includes up to 200 chars of `textContent`. Hosts that
  render PII in ephemeral toasts (e.g. "Updated SSN for Jane
  Doe") expose that PII in the in-memory ring buffer for
  `ring_size * duration_ms` seconds. Hosts handling regulated
  data SHOULD set `data-nac-sensitive="true"` on such elements;
  the runtime MUST omit `label` (and store only slug + role)
  for sensitive entries. Implementation note: this is a v2.0-rc3
  spec-side normative requirement; reference runtime ships
  detection in v2.0.x patch.

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

### Identity binding (v2.0-rc3, Claude T4-F1 BLOCKER fix)

**Critical security requirement**: the captured `isTrusted` MUST
also bind to the originating event's `composedPath()`. The runtime
MUST NOT store the attested flag in a global without identity
binding.

When `NAC.invoke(slug)` runs, the runtime MUST verify that
`entry.element` is present in the captured `composedPath` before
honoring `attested=true`. If the invocation target is NOT in the
path, the runtime MUST treat `attested=null` (unknown) and the
matrix MUST reject the event at NAC-3 with finding
`user_gesture_path_mismatch`.

**Why**: without identity binding, a script can wait for any real
user gesture, then within the freshness window invoke any other
element with `source.type='user'` and inherit the leaked attested
flag. This is the FOURTH impersonation path (gesture-buffer leak)
that the original three-path threat model in scope doc sec 4b did
not cover. Without the fix, cost-of-attack collapses from "kernel
access" to "any script timed within the freshness window of any
user gesture".

**Freshness window**: reduced from 100ms (rc2) to **16ms** (rc3,
one animation frame). Genuine click handlers run synchronously or
via microtask, well within 16ms. Promise-resolved-later handlers
no longer count as user-attested -- which is the security-correct
behaviour.

### Enforcement matrix at NAC-3

| `source.type` | `signature` required | `user_gesture_attested` required | Identity binding required |
|---|---|---|---|
| `'user'` | no | yes, must be `true` | yes (target in composedPath) |
| `'agent'` | yes (HMAC) | not constrained | not required |
| `'script'` | no | must be `false` | not required |

### Forbidden combinations at NAC-3

- `'user'` + `attested=false` -> finding `user_gesture_unattested`
- `'user'` + invocation target NOT in captured event path ->
  finding `user_gesture_path_mismatch` (v2.0-rc3 NEW)
- `'agent'` + missing/invalid signature -> finding
  `agent_source_missing_signature` / `agent_source_invalid_signature`
- `'script'` + `attested=true` -> finding `script_claims_user_gesture`
- `'agent'` + `attested=true` + `os_level` not declared (v2.0-rc3,
  Claude T4-F4) -> finding `agent_attested_without_os_level`

### Manual override

Testing tools MAY call `NAC.attestUserGesture({trusted: false, type: 'script'})`
to declare an upcoming synthetic interaction as a script. The
runtime MUST honour this override for the next NAC action invocation
(within 16ms freshness window in rc3+, was 100ms in rc2) and ignore
it thereafter.

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

| Operation | Target (low-tier mobile 2026) | Hard fail | rc1 -> rc3 change |
|---|---|---|---|
| Boot register 1000 elements | 50ms | 100ms | unchanged |
| `autoRegister` per mutation | 2ms | 5ms | unchanged |
| `adopt` selector match per mutation | 5ms | **20ms** | was 15ms (rc2) |
| `describe()` any size (with pagination) | **50ms** | **150ms** | was 30ms / 100ms (rc2) |
| HMAC sign per command | 3ms | 10ms | unchanged |
| HMAC sign cold-start (first call after boot) | -- | **20ms** | NEW rc3 (Claude T6-F2) |
| `NAC.t()` resolution | <0.1ms | 1ms | unchanged |
| Virtual resolver per call | <10ms | 50ms | unchanged |
| MutationObserver throttle (default) | **100ms** | tunable | was 50ms (rc2) |
| **`autoRegister.watch` cumulative batch** | **50ms** | **100ms** | NEW rc3 (Claude T6-F1) |
| Gesture freshness window | -- | **16ms** | was 100ms (rc2); rc3 BLOCKER fix Claude T4-F1 |

The MutationObserver throttle default is now **100ms** for
`autoRegister.watch` and `captureEphemeral` (was 50ms in rc1).
Hosts tune via `set_perf_tolerance({mutation_throttle_ms: <n>})`
when their workload requires lower latency. Going below 50ms is
discouraged on mid- and low-tier devices.

### Cumulative-batch budget (rc3, Claude T6-F1)

When `autoRegister.watch` flushes a batch of >50 elements in a
single throttle tick (e.g. a catalog re-render adding 400 cards),
implementations MUST chunk the batch and yield between sub-batches
of 50 to keep the main thread responsive. The reference runtime
uses `requestIdleCallback(step, {timeout: 100})` (or `setTimeout(step, 0)`
fallback) per sub-batch. Cumulative blocking budget: 50ms target,
100ms hard-fail per single throttle window.

Implementations MUST expose `perf_probe` for conformance suite
measurement. Findings of type `perf_budget_exceeded` MUST emit at
error severity at NAC-3 when measurements exceed hard fail
threshold for >**2%** of samples in a 5-second window
(rc4 update per Claude T8.1 middle-ground arbitration; was 5% in
rc2/rc3). Rationale: 5%/5s = ~1 hitched describe() per 20s on
Snapdragon 6 Gen 1 = breaks screen-reader reading flow. 1%/10s
window proposed by DeepSeek masks bursty stalls during route
transitions. 2%/5s same window width as rc3, tighter rate,
captures sustained slowness AND bursts.

Hosts that need looser thresholds tune via
`NAC.set_perf_tolerance({perf_budget_fail_rate_pct: <n>})`.
Hosts that need tighter thresholds for accessibility-critical UX
can drop to 1%.

---

## 15.14 Backward compatibility -- strict superset proof

### Public API diff

See RFC_v2.0.0 section 11.1 for the full table. Summary:

- Zero v1.9 public API removed.
- Zero v1.9 event renamed.
- Zero v1.9 attribute removed.
- Zero behavioural change to v1.9 NAC-1 + NAC-2 plugin contracts.

**Four semantically-tightening changes at NAC-3** (rc4 update;
rc3 listed three, rc4 adds bridgeIframe fail-closed per Mistral
T7-F1):

1. **HMAC mandatory** for `source.type='agent'` events.
2. **i18n_strict findings** in `validate_global()` output (warn
   default, opt-in error). v1.9 hosts asserting zero warnings in
   CI must update assertions or set tolerance to silent.
3. **Identity-bound user attestation** (rc3 BLOCKER fix). NAC-3
   rejects `source.type='user'` when the invocation target is not
   in the originating event's composedPath, with finding code
   `user_gesture_path_mismatch`.
4. **`bridgeIframe` fail-closed at NAC-3** (rc4, Mistral T7-F1).
   NAC-3 rejects `bridgeIframe` invocations when no
   `provenance_secret` is registered, and rejects
   `handshake_ack`/`describe_result` messages without
   signature.

NAC-1 and NAC-2 are unaffected.

### ProvenanceBlock additive fields tolerance (rc3, Mistral T2-F2 + Claude T2-F2)

v2.0 adds new optional fields to the ProvenanceBlock structure:
`user_gesture_attested`, `signature`, `signature_chain`,
`os_level`. v1.9 audit pipelines that perform STRICT shape
validation (e.g. JSON-Schema with
`additionalProperties: false` semantics) will reject v2.0 events
as malformed.

**Normative requirement at NAC-3**: v2.0-aware audit pipelines
MUST treat unknown ProvenanceBlock fields as additive-only.
Forward-compat policy: pipelines reject events ONLY for KNOWN
violation patterns (missing signature, missing
user_gesture_attested), NEVER for unknown extra fields.

**Recommendation for v1.9 hosts**: before adopting v2.0 producers,
patch v1.9 strict-shape validators to ignore-unknown. This is a
one-line change in most JSON Schema configurations.

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
