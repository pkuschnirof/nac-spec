# NAC v2.0 -- Native Accessibility Contract

**Spec version**: 2.1 (spec sec 1-18).
**Reference runtime versions** (TWO versions coexist by design,
NOT a drift):
- `NAC.version = '1.9.0'`: the v1.x runtime base in `js/nac.js`.
  Strict-superset baseline that all v1.x plugins still target.
- `NAC.version_v2 = '2.1.0-rc1'`: the v2 extensions layer in
  `js/nac-v2-extensions.js` that attaches additional primitives
  (scope, autoRegister, sitemap, data-table, etc) to the same
  `window.NAC` object without modifying the v1.x surface.

The README badge tracks `version_v2` (the user-visible spec
version). Adopters check `NAC.version_v2 >= '2.1.0-rc1'` to
gate v2.1 features; legacy code that probes `NAC.version`
keeps working unchanged. Reviewers MUST NOT flag this as
version drift -- it is the documented layered-runtime
pattern (RFC sec 11).

**Status**: Draft -- Round 6 peer review in progress.
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
  (O(unique-scope-paths) typically <1000 entries; ~50 bytes
  per entry, so <50KB even at 1000). Hosts that dynamically
  create + discard scopes during a long-running session MUST
  call `NAC.gcIntermediateScopes(activePathSet)` periodically
  to prune stale entries, or `NAC.gcIntermediateScopes()`
  (no-arg) on full-shell teardown to clear the index.

  **When to call gcIntermediateScopes (added rc6):**

  | Host pattern | Recommended cadence |
  |---|---|
  | Static demo / single-page brochure | Never -- never grows. |
  | Standard SPA, <50 navigations / hour | On full shell teardown only. |
  | Long-running SPA (>1h sessions, >100 navigations / hour) | Every 5 min via `setInterval`, OR every 100 navigations. Pass `activePathSet` (a `Set<string>` of scope paths still in use) to keep the index minimal. |
  | App with feature-flag-driven scope creation/disposal | Every time a flag flips. |
  | Performance-sensitive embedded widget inside a host SPA | Wrap your scope tree in a single root scope; on widget unmount, call `gcIntermediateScopes()` to drop the entire subtree. |

  Diagnostic: `describe_v2().v2_intermediate_scopes.length`
  surfaces the current count. Adopters concerned about memory
  budget can sample this value over time and call GC when it
  exceeds a threshold (e.g. 500).

  The spec does NOT mandate a specific cadence; the decision
  belongs to the host because only the host knows its
  navigation pattern. NAC-3 conformance does require that
  long-running deployments document their GC strategy in
  their adopter playbook.

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

**`opts.type` is restricted to `'script'` or `'agent'` (rc6,
Claude R6 MEDIUM)**. The runtime MUST NOT honour `opts.type='user'`;
attempting to claim user attestation from a script-level call is a
laundering vector that bypasses the identity-binding check
(rc3 T4-F1 fix) entirely. The runtime MUST log the attempt as
finding `script_override_claims_user` (severity: error, surfaced
via `validate_global_v2()`), force the override to `type='script'`,
and emit a `console.warn` so the developer is aware. Hosts that
genuinely need user-gesture attestation use the real DOM event
path (which the rc3 identity binding validates); the override is
testing-only and stays so by construction.

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

## 16. Intermediary system prompt contract (NEW v2.0-rc4)

### 16.1 Why this section exists (philosophy)

NAC's purpose is dual:

1. **The system disappears**. A human user interacts with any NAC-
   conformant UI through natural language (voice, chat, RPA). They
   do NOT have to learn backend specifics, slug names, or
   navigation hierarchy. The intermediary LLM consumes the NAC
   manifest and resolves ambiguity.

2. **Equality of access for humans, bots, agents, and AI**. The
   same NAC-conformant UI is operated identically by a screen-
   reader user, a voice-control runner, a chat-driven assistant,
   an RPA bot, an autonomous AI agent, or a Computer-Use
   instance. None of them need backend training, schema knowledge,
   or special API access. They all consume the same manifest with
   the same security guarantees (HMAC + isTrusted attestation +
   audit log).

These two principles are NOT separate features. They are the same
contract from two perspectives: the system disappears for humans
because operators of every kind --including AI-- access it through
the same manifest layer.

If an LLM intermediary applies a whitelist, hardcodes plugin
slugs, or refuses operations on elements that ARE in the manifest,
**both principles fail simultaneously**. The user perceives a
system with rules to learn (principle 1 broken), and bots/agents
that see the manifest are systematically refused (principle 2
broken). This section makes those failures non-conformant.

### 16.2 Normative requirements for intermediaries

An LLM intermediary that consumes a NAC manifest from a frontend
and dispatches actions back MUST:

1. **Treat the manifest as the single source of truth for
   operability.** Specifically: every slug present in
   `NAC.describe()` output is operable. Every slug NOT present
   is not. The intermediary MUST NOT maintain a separate
   whitelist or blacklist of allowed plugins/elements.
2. **Resolve ambiguity by exhausting matching heuristics in this
   priority order**:
   - exact textContent match
   - exact label_i18n match in user's current locale
   - exact label_i18n match in any other locale (English fallback)
   - fuzzy contains in textContent / label
   - aria-label contains
   - semantic role + position ("the third button on the panel")
3. **NEVER respond "I don't have access" or "I can't do that" or
   "I have no control over this" when the element exists in the
   manifest.** The element's presence in the manifest IS the
   permission. If the element should not be operable in a given
   context, the host removes it from the manifest (e.g., via
   `NAC.gcIntermediateScopes`, `tenant_entity_toggles`, or feature
   flags), NOT via intermediary refusal.
4. **On failed match, return `nac:command_rejected`** with the
   top-3 similarity candidates so the user gets recovery
   affordance. The user MUST NOT be told the system is incapable
   when it is not.
5. **Process the entire manifest, not just a subset**. Some
   intermediaries truncate the manifest to fit a token budget;
   when truncation occurs, it MUST preserve the slug + label at
   minimum so the disambiguation heuristics still function.
6. **Honour HMAC at NAC-3**: every dispatched action emitted by
   the intermediary MUST carry `source.type='agent'` +
   `source.signature` per sec 6.2.27.

Implementations of intermediary system prompts SHOULD ship a
test suite that:
- Verifies a manifest with N plugins produces M correct
  resolutions for M user prompts.
- Verifies that adding a new plugin to the manifest at runtime
  makes its elements immediately resolvable.
- Verifies that the intermediary does NOT refuse elements that
  ARE in the manifest.

### 16.3 What the intermediary receives (visibility scope)

Two complementary inputs:

- **Visible tree** (`NAC.describe_v2()` output): the elements
  operable RIGHT NOW. Authoritative for `can-operate` decisions.
  Authoritative for security: if the element is not in the tree,
  do NOT invoke.

- **Sitemap** (`NAC.declareSitemap()` output, OPTIONAL primitive,
  see sec 17): the catalog of paths the system KNOWS to exist,
  with navigation affordances for getting from current state to
  each path. Used by the intermediary to plan multi-step
  navigation.

The intermediary uses the sitemap to PLAN ("user wants SMTP
config; SMTP is at `settings.system.smtp`; current visible tree
shows `topbar.settings` button; plan: click settings, wait for
re-render, then resolve again").

The intermediary uses the visible tree to AUTHORIZE ("can I
actually click `topbar.settings` right now? yes, it is in the
visible tree; dispatch NAC.click").

Authority lives in the visible tree always. The sitemap is
navigational metadata, not permission.

### 16.4 Failure modes the intermediary MUST avoid

| Failure mode | Why it breaks the contract |
|---|---|
| Whitelist of allowed plugins | Principle 2 violated: bots/agents that see manifest are systematically refused. |
| Hardcoded slug list | Principle 1 violated: user has to learn what slugs the system "knows about". |
| Refusing on uncertainty | The user perceives the system as gatekeeper, not facilitator. The fallback is `nac:command_rejected` with top-3 candidates, not "I can't". |
| Stale manifest cache | The intermediary refuses elements that just appeared. Manifest must be re-snapshot per turn or via SSE. |
| Treating sitemap as authority | The intermediary invokes elements not in visible tree, bypassing security. Authority is visible-tree-only. |
| Whitelist of allowed languages | Principle 1 violated: user must learn the supported languages. The 10-locale catalog + `NAC.locale()` resolves this; intermediary respects whatever locale the user uses. |

### 16.5 Conformance test for intermediaries (added to validate_global_v2)

A NAC-3-conformant intermediary integration MUST pass:

- A "new plugin appears at runtime" test: register a plugin via
  `NAC.register({plugin_slug:'X', elements:[...]})` AFTER the
  user session begins; the intermediary MUST resolve subsequent
  user requests against `X` without code/prompt change.
- A "no whitelist refusal" test: send a user request matching a
  manifest slug; the intermediary response MUST include an action
  dispatch, not a refusal.

The validator MAY ship these tests as part of `@nac-spec/cookbook`
patterns 12 + 13 (target rc6+).

### 16.6 Security framing of equality of access (added rc5)

NAC's intermediary contract has a non-obvious security
property: by routing AI / bot / agent operators through the
SAME UI surface that humans use -- and refusing to provide a
privileged backend channel for "convenience" -- the host
contracts the attack surface to a single boundary.

NAC-3-conformant deployments MUST NOT:

- Issue admin API keys, raw DB credentials, or service-account
  bearer tokens to AI/bot/agent operators when the same task
  could be accomplished by dispatching NAC events on the UI the
  human user is already authorised against.
- Define a privileged operator class (e.g. `source.type='admin'`,
  `source.type='superuser'`) outside the three already specified
  in section 9 (`user`, `agent`, `bot`). Any operator class
  added by extension MUST go through the same HMAC + isTrusted
  + audit pipeline.
- Maintain a parallel "agent-only" endpoint surface that bypasses
  the manifest. If an action is reachable by an agent, an
  authorised human MUST be able to reach the same action through
  the same manifest entry.

Conformance: a deployment claiming NAC-3 conformance with an
agent integration MUST document that the agent's authorisation
boundary is identical to the human user's authorisation boundary
on the same session. Auditors look for one boundary, not two.

Rationale: a compromised agent (prompt injection, supply-chain
attack, model jailbreak) has a blast radius bounded by the
operator's UI scope -- the same scope a malicious human user
could reach. No privilege escalation primitive is offered. This
is the same security envelope that makes the "system disappears"
principle (16.1) safe to ship -- a system that disappears for
the user disappears equally for an attacker who took over the
agent. RFC sec 0a.1 carries the full framing.

---

## 17. Sitemap primitive (NEW v2.0-rc4, OPTIONAL)

### 17.1 Why a sitemap layer

For apps with a small number of screens (1-10), the visible tree
is enough. The user says "click X", the LLM finds X in
`describe_v2()`, dispatches the click.

For apps with many screens (100+), the visible tree is a
projection of one current view. The user says "configurar SMTP";
SMTP is not visible because we are on the dashboard. The LLM
needs to KNOW that SMTP exists and HOW to navigate there.

The pre-v2.0 workaround: the intermediary's training data
included the app's structure. This violated principle 2 of sec 16
(equality of access without backend training).

The v2.0-rc4 solution: a declarative sitemap primitive that the
host registers, and the intermediary consumes alongside the
visible tree.

### 17.2 Public API

```javascript
NAC.declareSitemap({
  paths: [
    {
      slug: 'settings.system.smtp',
      label_i18n: { es: 'Configuracion SMTP', en: 'SMTP settings', ... },
      affordance_to_navigate: [
        { action: 'click', target: 'topbar.settings' },
        { action: 'click', target: 'settings.system' },
        { action: 'click', target: 'settings.system.smtp' }
      ],
      requires_permission: ['admin'],  /* optional, for hint only */
      tags: ['integration', 'mail', 'configuration']
    },
    /* ... */
  ]
});
```

`describe_v2()` exposes the sitemap via a new field
`sitemap: { paths: [...] }`. Intermediaries serialise the sitemap
into their context alongside the visible tree.

### 17.3 Authority separation (CRITICAL)

The sitemap is **navigational metadata only**. It is NOT
authoritative for `can-operate` decisions.

| Question | Answered by |
|---|---|
| Can I click slug X right now? | visible tree (`describe_v2().v2_scope_entries`). Yes if present, no if not. |
| Does slug X exist somewhere in the system? | sitemap (`describe_v2().sitemap.paths`). |
| How do I navigate to slug X? | sitemap `affordance_to_navigate`. |
| Does the user have permission for X? | host's authorization layer (NAC does not implement permissions; `requires_permission` is hint metadata only). |

The intermediary MUST resolve in this order:
1. Is the slug in the visible tree? If yes, dispatch immediately.
2. Is the slug in the sitemap? If yes, plan the navigation
   sequence using `affordance_to_navigate`. Each step in the
   sequence MUST be re-validated against the visible tree before
   dispatch.
3. Otherwise, return `nac:command_rejected` with top-3
   candidates.

### 17.4 When to use sitemap

- Apps with 50+ logical screens / paths.
- Apps where the user can ask for paths not currently visible.
- Apps that want to publish their full UI surface to documentation
  / search (the sitemap doubles as a UI map for accessibility
  audits).

When NOT to use:
- Single-page apps with all affordances visible at once.
- Demos / examples (the visible tree is enough).

### 17.5 Sitemap format extensibility

The `paths[].tags` field is for host-defined categorisation
(searchable). The `requires_permission` field is for hint UI
only. Future extensions may add `deprecated_since`,
`replaces_path`, `availability_window`, etc.; all additive.

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

## 18. Data-table primitive (NEW v2.1)

### 18.1 Why this section exists

Sections 1-17 cover navigation, dispatch, sitemap, and operator
identity. They are NOT enough to describe the most common shape
of structured data in any non-trivial UI: **a tabular collection
embedded in a modal, panel, or section, edited transactionally,
committed when the parent scope saves**. Examples drawn from a
typical CRM or ERP:

- Lines of an invoice (modal "Edit invoice")
- Items of a purchase order
- Roster of attendees in an event
- Permission matrix (role x permission, Salesforce-style)
- Audit trail (read-only)
- Pre-flight of a bulk action ("you are about to delete these 23 rows")
- Wizard review step
- Cart in checkout

Without a first-class primitive, every adopter rolls their own
attribute/event/manifest convention. The result: the chatbot
intermediary cannot say "delete the keyboard line"; the test
runner cannot say "add a row with product Mouse and quantity 3
and save"; the RPA bot polls the DOM for row visibility. NAC
v2.1 closes this with a normative primitive.

Distinction from a future grid primitive (sec 19, deferred):
data-table is **transactional** (commit on parent-scope save),
**non-virtualised** (typical 5-200 rows, all in DOM),
**scope-bound** (lives only while its modal/panel is alive). A
grid is persistent, often virtualised, and saves cell-by-cell.
The semantics are different enough that conflating them in one
primitive is harmful.

### 18.2 Two subkinds

**`collection`** -- the common case. Rows have business-key
identity; columns are attributes. Operations: add row, remove
row, edit cell, select. Example: invoice lines.

**`matrix`** -- 2D grid where rows AND columns are slugs (not
arbitrary keys). The cell is the intersection. Operations: set
cell (truthy/falsy or value). Example: permission matrix.

A third subkind **`readonly`** exists as a degenerate
collection: same shape but no edit/add/remove operations are
exposed. Used for audit logs, pre-flight previews, etc.

### 18.3 Manifest

Hosts declare a data-table via `NAC.registerDataTable(spec)`:

```javascript
NAC.registerDataTable({
  table_id: 'invoice.lines',          /* canonical slug */
  scope_owner: 'modal.invoice_edit',  /* slug of the parent scope */
  subkind: 'collection',              /* 'collection' | 'matrix' | 'readonly' */
  transactional: true,                /* commit on scope_owner save */
  row_id_field: 'line_id',            /* unique key per row */
  columns: [
    {
      key: 'product',
      label_i18n: { es: 'Producto', en: 'Product', /* ...10 locales */ },
      type: 'text',
      editable: true,
      required: true
    },
    {
      key: 'qty',
      label_i18n: { es: 'Cantidad', en: 'Quantity', /* ... */ },
      type: 'number',
      editable: true,
      min: 1,
      max: 9999,
      required: true
    },
    {
      key: 'unit_price',
      label_i18n: { es: 'Precio unitario', en: 'Unit price', /* ... */ },
      type: 'currency',
      editable: false
    },
    {
      key: 'line_total',
      label_i18n: { es: 'Total linea', en: 'Line total', /* ... */ },
      type: 'currency',
      computed: true,
      computed_from: ['qty', 'unit_price']
    }
  ],
  supports: ['add_row', 'remove_row', 'edit_cell'],
  selection_mode: 'multiple',
  aggregates: {
    sum: ['line_total'],
    count: ['*']
  },
  initial_rows: [
    { line_id: 'L1', product: 'Mouse',   qty: 2, unit_price: 25,  line_total: 50 },
    { line_id: 'L2', product: 'Teclado', qty: 1, unit_price: 140, line_total: 140 }
  ],
  validators: [
    /* per-row: qty must be > 0 (already covered by column.min,
       but re-stated here for cross-row rules) */
    { kind: 'row',   code: 'qty_positive',     column: 'qty', op: 'gt', value: 0 },
    /* table-level: no two rows may have the same product */
    { kind: 'table', code: 'no_duplicate_product', unique_columns: ['product'] }
  ]
});
```

Matrix subkind manifest has `row_axis` + `column_axis` instead
of `columns`:

```javascript
NAC.registerDataTable({
  table_id: 'permissions.matrix',
  scope_owner: 'modal.role_editor',
  subkind: 'matrix',
  transactional: true,
  row_axis: {
    label_i18n: { es: 'Rol', en: 'Role' },
    values: [
      { slug: 'admin',   label_i18n: { es: 'Administrador', en: 'Admin' } },
      { slug: 'analyst', label_i18n: { es: 'Analista', en: 'Analyst' } }
    ]
  },
  column_axis: {
    label_i18n: { es: 'Permiso', en: 'Permission' },
    values: [
      { slug: 'deals.read',   label_i18n: { es: 'Leer pipeline', en: 'Read deals' } },
      { slug: 'deals.write',  label_i18n: { es: 'Editar pipeline', en: 'Write deals' } }
    ]
  },
  cell_type: 'boolean',
  initial_cells: [
    { row: 'admin',   col: 'deals.read',  value: true },
    { row: 'admin',   col: 'deals.write', value: true },
    { row: 'analyst', col: 'deals.read',  value: true }
  ]
});
```

### 18.4 Public API (collection subkind)

| Method | Returns | Description |
|---|---|---|
| `NAC.dt_state(table_id)` | `{rows, aggregates, modified, valid, selected}` | Full snapshot at any point. |
| `NAC.dt_add_row(table_id, valuesByColumn)` | `{row_id}` | Adds a row. Required columns must be present. Returns generated row_id (or the one provided). |
| `NAC.dt_remove_row(table_id, row_id)` | `void` | Removes the row. No-op if not found. |
| `NAC.dt_edit_cell(table_id, row_id, column_key, value)` | `{ok, error?}` | Updates a cell. Validates type, min/max. Returns `{ok:false, error:'invalid_type'}` on failure (no exception). |
| `NAC.dt_read_aggregate(table_id, agg_key, column_key)` | number\|null | Returns the live aggregate value (sum, avg, count, custom). |
| `NAC.dt_validate(table_id)` | `{valid, errors:[{code, row_id?, column?, message_i18n}]}` | Runs all validators. |
| `NAC.dt_select(table_id, target)` | `{selected_count}` | `target` is `'all'`, `'visible'`, a row_id, an array of row_ids, or a predicate `{column, op, value}`. |
| `NAC.dt_commit(table_id)` | `{audit_diff}` | Called by the host when the parent scope saves. Emits `nac:dt:committed`. |
| `NAC.dt_discard(table_id)` | `void` | Called when the parent scope cancels. Restores `initial_rows`. Emits `nac:dt:discarded`. |

### 18.5 Public API (matrix subkind)

| Method | Returns | Description |
|---|---|---|
| `NAC.dt_set_cell(table_id, row_slug, col_slug, value)` | `{ok, error?}` | Sets a cell at the intersection. |
| `NAC.dt_get_cell(table_id, row_slug, col_slug)` | value\|undefined | Reads a cell. |
| `NAC.dt_state(table_id)` | `{cells, modified, valid}` | Snapshot. |
| `NAC.dt_commit(table_id)` / `dt_discard(table_id)` | -- | Same as collection. |

### 18.6 Events

All events bubble on `document` with `bubbles: true`.

| Event | Detail |
|---|---|
| `nac:dt:registered` | `{table_id, schema}` |
| `nac:dt:row_added` | `{table_id, row, by: 'user'\|'agent'}` |
| `nac:dt:row_removed` | `{table_id, row_id, by}` |
| `nac:dt:cell_edited` | `{table_id, row_id, column, old, new, by}` |
| `nac:dt:matrix_cell_set` | `{table_id, row, col, old, new, by}` |
| `nac:dt:aggregate_changed` | `{table_id, agg_key, column, old, new}` |
| `nac:dt:validation_failed` | `{table_id, errors}` |
| `nac:dt:committed` | `{table_id, final_state, audit_diff}` |
| `nac:dt:discarded` | `{table_id}` |
| `nac:dt:selection_changed` | `{table_id, selected_count, selected_ids}` |

The `by` discriminator is REQUIRED at NAC-3 (sec 9 source-type
contract): `'user'` for direct DOM events with isTrusted=true,
`'agent'` for any operator-class invocation (chat, RPA, test
runner). Audit pipelines downstream use this to attribute
changes.

### 18.7 Authority separation

The runtime owns the **in-memory state** of the table. The host
owns the **persistence**. On `nac:dt:committed`, the host's own
save handler (HTTP POST to backend, IndexedDB write, etc.)
takes the `final_state` and persists it. NAC does NOT touch the
network.

This means:

- The runtime state is the single source of truth WHILE the
  modal is open.
- A discard reverts cleanly to `initial_rows` without round-trip.
- The chatbot / RPA / test runner sees one consistent state.
- Validators run client-side (NAC) AND server-side (host) -- the
  client-side ones provide immediate feedback; the host enforces
  on commit.

### 18.8 Computed columns

A column with `computed: true` and `computed_from: [...]` is
recalculated automatically:

1. When any column in `computed_from` changes (cell edit, row add).
2. After every `dt_add_row` / `dt_edit_cell`.
3. The host registers the recompute function via
   `NAC.registerDataTableComputed(table_id, column_key, fn)`,
   where `fn(row, allRows) => value`. A common case is
   `(row) => row.qty * row.unit_price`.

Without a registered fn, computed columns hold the value passed
in `initial_rows` and are never updated -- the validator emits
`computed_column_no_fn` warning at NAC-3.

### 18.9 Validators

Two kinds:

- **`row`** validator: runs per row.
  `{kind:'row', code, column, op:'gt'|'lt'|'eq'|'in'|'matches', value}`
- **`table`** validator: runs across all rows.
  `{kind:'table', code, unique_columns? | min_rows? | max_rows? | custom_fn?}`

`dt_validate()` returns `{valid: boolean, errors: [{code, row_id?,
column?, message_i18n}]}` so the host can localise error
messages per the user's current locale.

A `dt_commit()` call MUST first run `dt_validate()`. If it
fails, commit aborts and emits `nac:dt:validation_failed`. The
host SHOULD wire the parent modal's Save button to `dt_validate`
+ `dt_commit` in that order.

### 18.10 i18n requirements

Every column's `label_i18n`, every aggregate's display name,
every validator's `message_i18n`, every matrix axis's `label_i18n`,
every matrix row/col `label_i18n`: REQUIRED to carry **all 10
supported locales** (es, en, pt, fr, it, de, ja, zh, hi, ar) at
NAC-3. Missing locales degrade silently in v2.1 with a warn-level
`validate_global_v2` finding `dt_i18n_missing_locale`. The
catalog-lint CI gate (in adopters' build pipelines) should
upgrade to error.

### 18.11 Snapshot serialisation

`describe_v2()` is extended with `data_tables: [...]`. Each
table contributes a snapshot:

```javascript
{
  table_id: 'invoice.lines',
  scope_owner: 'modal.invoice_edit',
  subkind: 'collection',
  schema: { columns, supports, aggregates, validators_summary },
  current_state: { rows, aggregates, modified, valid, selected_count }
}
```

Intermediary LLMs (sec 16) see this in their context. The chat
prompt rule is: "When the user refers to a row by a column value
(e.g. 'the keyboard line'), match against `current_state.rows`
in any locale that the row's column values may carry."

### 18.12 Conformance test (added to validate_global_v2)

A NAC-3-conformant data-table integration MUST:

- `dt_state()` returns a stable snapshot consistent with the
  events emitted up to that point.
- `dt_commit()` after `dt_discard()` is a no-op (idempotent
  cleanup).
- `dt_edit_cell()` on a non-existent row_id returns
  `{ok:false, error:'row_not_found'}` -- never throws.
- All 6 voice cases pass against the demo fixture (see
  `tests/data_table_voice_cases.spec.js`):
  1. "agrega una linea" -> `dt_add_row`
  2. "borra la linea del teclado" -> `dt_remove_row` after slug
     resolution against rows
  3. "cambia la cantidad de la primera linea a 5" -> `dt_edit_cell`
  4. "leeme el total" -> `dt_read_aggregate('sum', 'line_total')`
  5. "guarda" -> `dt_validate` then `dt_commit`
  6. "cancelar" -> `dt_discard`

### 18.13 Backwards compatibility

v2.1 is a strict superset of v2.0. Adopters who do not call
`registerDataTable()` see no behaviour change. The new APIs
appear on `NAC.*` but are no-ops in their absence (calling
`dt_state()` for an unregistered `table_id` returns `null`
without throwing).

---

## 19. End-to-end intent chain conformance test (NEW v2.1)

### 19.1 Why this section exists

NAC v2.0+ describes a multi-stage pipeline: a user expresses an
ambiguous, incomplete, metaphorical, or locale-mixed natural-
language intent; the intermediary LLM (sec 16) reads the
manifest + sitemap + data_tables (sec 17, 18) and emits a
typed action; the runtime (sec 15.* + 18.*) dispatches that
action; the dispatch causes a canonical event to fire (sec 6.2
of v1.9 + sec 18.6 of v2.1).

Each stage has its own conformance contract. **None of those
contracts catch a stage-boundary regression.** The reference
implementation already had one: a backend compactor that
silently dropped `data_tables` from the snapshot before the
LLM saw it, so rule 14 of the system prompt ("iterate
current_state.rows to resolve row identity") had no rows to
iterate. Spec correct, frontend correct, runtime correct,
backend wrong -- all unit tests pass, end-to-end demo
hallucinates.

The fix-class for that whole error mode is **mandatory
end-to-end chain testing**. v2.1 codifies it as a NAC-3
conformance requirement.

### 19.2 The four-stage chain

For every intent the host claims to support, an end-to-end
chain test MUST verify all four stages:

| Stage | What is verified |
|---|---|
| **1. Intent detection** | The intermediary LLM, given the live `describe_v2()` snapshot, classifies the user's natural-language phrase into one of the documented action kinds (sec 16 vocabulary). The test asserts which kind was selected, NOT the natural-language ack the LLM emits. |
| **2. Disambiguated dispatch** | The kind + parameters resolve to a concrete invocation against the runtime (e.g. `NAC.dt_remove_row('invoice.lines', 'L5')`). The test asserts the parameters, drawn from the snapshot the LLM saw, match what the runtime needs. |
| **3. Runtime event emission** | The runtime, on receiving the dispatch, emits the canonical event(s) documented in sec 6.2 / 18.6. The test asserts the event type AND the detail payload shape. |
| **4. Side-effect coherence** | The post-dispatch state of the runtime reflects the intent (row removed, cell edited, table committed, navigation completed). The test asserts via `describe_v2()` re-snapshot. |

Skipping any stage produces false confidence:

- Skipping stage 1 misses LLM regressions (silent kind drift,
  prompt template changes, model upgrade hallucinations).
- Skipping stage 2 misses parameter resolution bugs (row_id
  resolved to wrong row because the snapshot was incomplete --
  the bug-class that motivated this section).
- Skipping stage 3 misses runtime regressions where the
  dispatch succeeds but the canonical event is not fired
  (downstream audit pipelines silently lose visibility).
- Skipping stage 4 misses cosmetic-only fixes (the action
  acked, the event fired, but the visible state of the table
  did not change because of a subscription gap).

### 19.3 Public test primitive

The reference test runner ships `runChainTest`:

```javascript
const { runChainTest } = require('@nac-spec/test-runner');

const result = await runChainTest({
  intent:        'borra los auriculares',
  page:          playwrightPage,                  // OR snapshot:
  expected: {
    stage_1_kind:        'dt_remove_row',
    stage_2_params: {
      table_id:          'invoice.lines',
      row_id_resolves_via: { column: 'product', value: 'Auriculares' }
    },
    stage_3_event: {
      type:              'nac:dt:row_removed',
      detail_match: { table_id: 'invoice.lines' }
    },
    stage_4_state_assertion: (afterSnap) => {
      const dt = afterSnap.data_tables
        .find(t => t.table_id === 'invoice.lines');
      const stillThere = dt.current_state.rows
        .some(r => r.product === 'Auriculares');
      return { passed: !stillThere,
               note: stillThere ? 'row still in table' : 'row gone' };
    }
  }
});
// result: { passed, stages: [{name, passed, evidence}], log, latency_ms }
```

The primitive runs the same agentic dispatch path the
production agent uses, captures the LLM's chosen kind, the
resolved parameters, every event fired during the dispatch
window, and the post-state -- then matches against
`expected.stage_*`.

When `page` is supplied (Playwright), the test is
end-to-end against a real browser. When `snapshot` is
supplied (a frozen `describe_v2()`), the test runs offline
against the matcher + planner only -- useful for rapid
iteration on a snapshot fixture without spinning up a
browser. Both modes verify the same four stages.

### 19.4 Conformance mandate

**A NAC-3 deployment is non-conformant if it lacks chain
tests covering at least:**

| Operator domain | Required chain test count |
|---|---|
| Data-table collection (sec 18) | 1 add + 1 edit + 1 remove + 1 commit + 1 read_aggregate |
| Data-table matrix (sec 18) | 1 set_cell |
| Sitemap navigation (sec 17) | 1 cross-page intent |
| Confirm-dialog (sec 6.2.32) | 1 destructive intent + voice yes/no answer |
| Locale switch (rule 13) | 1 change_locale meta-command |
| Plain click (sec 16 baseline) | 1 single-click intent + 1 click_by_verb |

A deployment with five data-tables, three sitemap paths, and
two destructive actions ships at least 11 chain tests. The
adopter's CI MUST run them on every push; a red chain test
blocks merge. Validators MAY ship a `validate_chain_coverage()`
helper that reads the deployment's data_tables / sitemap /
confirm registry and reports missing chain-test slugs.

This is intentionally stricter than v2.0's spec test
(`tests/nac-v2-extensions.spec.js`, 59 unit tests) because
unit tests cannot detect the stage-boundary bug class -- only
chain tests can.

### 19.5 Reference fixtures

The reference implementation includes:

- `packages/test-runner/tests/chain.spec.js` -- 8 chain tests
  exercising every required intent class against the
  `example-v21-data-table.php` demo (or its offline snapshot
  fixture). All 8 must pass before tagging any v2.x release.
- `packages/test-runner/src/lib/chain-test.js` -- the
  `runChainTest` implementation. Pure, browser-independent
  for snapshot mode; uses Playwright for live mode.
- `tests/fixtures/v21-data-table-snapshot.json` -- a frozen
  `describe_v2()` of the demo that lets adopters run the
  chain tests offline as part of their unit-test suite.

### 19.6 Why this is normative, not advisory

The spec previously said NAC-3 conformance requires HMAC,
isTrusted attestation, and i18n catalogue completeness (sec
9, 10, 11). It said nothing about end-to-end coherence, so an
implementation could pass every conformance check while
silently breaking the user-facing flow. The Pablo session of
2026-05-09 (data-table demo) was the proof.

Sec 19 closes that hole: NAC-3 conformance is now AND of:

- Static contract conformance (HMAC + isTrusted + i18n + ASCII).
- Unit-test coverage on the runtime primitives.
- End-to-end chain test coverage on the user-facing intents.

Adopters who ship without chain tests do not get the NAC-3
badge. The cost of writing chain tests is bounded (a typical
business app needs 15-30 of them); the cost of NOT writing
them is recurring silent regressions that destroy adopter
trust.

---

## Cross-references

- Formal RFC: `RFC_v2.0.0.md`
- Scope discussion: `docs/NAC_v20_SCOPE_AND_ECOSYSTEM.md`
- Operational plan: `docs/NAC_v20_ROADMAP_ACTIONABLE.md`
- I18n integration: `docs/I18N_INTEGRATION_GUIDE.md`
- Data-table guide: `docs/V2_1_DATA_TABLE_GUIDE.md` (NEW v2.1)
- Chain test guide: `docs/V2_1_CHAIN_TEST_GUIDE.md` (NEW v2.1)
- Tooling skeletons: `packages/`
- Adopter case study: `case-studies/yujin.md` (in progress)
- v1.9 baseline spec: `spec/NAC-v1.0.md`

---

**Last updated**: 2026-05-09 (v2.1 added sec 18 data-table).
**Maintainer**: Pablo Adrian Kuschniroff, Sumi.
