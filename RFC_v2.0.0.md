# RFC v2.0.0 -- Native Accessibility Contract

**Status**: Request for Comments. Open for peer review.
**Author**: Pablo Adrian Kuschniroff, Sumi.
**Date**: 2026-05-09.
**License**: MIT.
**Replaces**: V1.9.1_HMAC_MANDATORY_PATCH.md (superseded -- absorbed into v2.0).

This RFC defines NAC v2.0.0 as the additive successor to v1.9.0.
It promotes 8 composition primitives, hardens the security model
against three impersonation paths, and adds an i18n contract layer
that does not replace existing i18n libraries.

It is the operative input for Round 3 of the peer review cycle. The
companion documents:

- `docs/NAC_v20_SCOPE_AND_ECOSYSTEM.md` -- the scope discussion
- `docs/NAC_v20_ROADMAP_ACTIONABLE.md` -- the operational plan
- `docs/I18N_INTEGRATION_GUIDE.md` -- adding new locales (this RFC mandates the format)
- `case-studies/yujin.md` -- adopter ground truth (in progress)

---

## 0. Abstract

NAC v2.0 is a **strict superset** of v1.9.0:

- All v1.9 plugin code keeps working unchanged.
- All v1.9 events, attributes, and helpers are retained verbatim.
- New capabilities are additive and opt-in (the duplicate-id lint
  promotion to `strict` is the single semantically-tightening change,
  and stays opt-in by default).

What v2.0 adds:

| Capability | Closes gap | Mandatory at NAC-3? |
|---|---|---|
| Hierarchical scope constructor | flat naming was unworkable for shell -> hub -> card -> modal | no -- additive |
| Auto-registration from DOM | dynamic plugin/agent UI required hand-written observers | no -- additive |
| Adopt third-party non-compliant | non-NAC widgets were invisible to the agent | no -- additive |
| Bridge Shadow DOM | Web Components were opaque | no -- additive |
| Bridge same-vendor iframes | trusted iframe content was opaque | no -- additive |
| Declare virtual manifests | virtualized lists hid 99% of rows from the agent | no -- additive |
| Capture ephemeral UI | toasts and dropdowns evaporated before describe() | no -- additive |
| Multi-tenant prefix | SaaS platforms collided on plugin slugs cross-tenant | no -- additive |
| HMAC mandatory for `source.type='agent'` | unsigned agent provenance was forgeable | **yes** |
| `user_gesture_attested` field | declared `'user'` was forgeable | **yes** |
| i18n contract (catalog format + resolver + lint) | label_i18n had no canonical shape | **format normative**, runtime usage opt-in |

---

## 1. Naming model -- hierarchical scope constructor

### 1.1 Public API

```javascript
const root = NAC.scope({
  slug: 'shell',                  // string, REQUIRED, no '.' allowed
  label_i18n: { es: '...', ... }, // OPTIONAL on intermediate scopes
});

const topbar = root.scope({slug: 'topbar'});

const button = topbar.register({
  slug: 'tb-me',
  intent: 'navigate',
  label_i18n: { es: 'Mi perfil', en: 'My profile', /* ... 10 locales ... */ },
  irreversible: false,
  element: btnEl
});

button.invoke();         // -> 'shell.topbar.tb-me' fires nac:command_*
console.log(button.id);  // 'shell.topbar.tb-me'
```

### 1.2 Semantics

- **Separator**: `.` (fixed, not configurable in v2.0). Author may
  re-open this in v2.1 RFC; reasoning here: ecosystem fragmentation
  cost.
- **Idempotency**: re-registering the same slug at the same scope
  emits a `nac:duplicate_warn` event but **last-wins** the manifest
  entry (last call replaces previous). Strict mode throws instead.
- **Depth**: max 6 levels. Past 4 levels the runtime emits a
  `nac:depth_warn` (best-practice nudge). Past 6 levels the
  registration throws `NacError('depth_exceeded')`.
- **Parent chain**: every registered element exposes
  `el.dataset.nacParent` listing the ancestor slugs separated by
  spaces. This lets the runtime walk from a DOM element up to its
  scope tree without re-parsing the slug.
- **Idempotent under React/Vue re-render**: `register()` checks
  `_manifests[slug]` for identical input + element-ref and skips
  silently when re-rendered with no change.

### 1.3 Migration from v1.9 flat slugs

Plugins that registered as `{plugin_slug: 'cc.my_plugin', elements: [...]}`
keep working with no change. The flat form is preserved as a
**special case** of the hierarchical model: `cc.my_plugin` is the
root scope, each `elements[].id` is a leaf slug.

For new code, the hierarchical API is preferred. The flat API is
documented as legacy in the v2.0 manual.

### 1.4 Errors

| Error code | Reason |
|---|---|
| `slug_invalid` | slug contains `.` or is empty |
| `depth_exceeded` | scope tree deeper than 6 levels |
| `duplicate_strict` | slug already registered + strict mode set |

---

## 2. Auto-registration from DOM

### 2.1 Public API

```javascript
NAC.autoRegister(el, {
  inheritScope: true,           // walk ancestors for [data-nac-scope]
  derive: {
    role: 'auto',               // tag-based heuristic
    label: 'auto',              // textContent or aria-label
    intent: 'auto'              // tag-based heuristic
  },
  i18n_strict: true             // require data-i18n-key OR label_i18n declared
});
```

### 2.2 Semantics

- Walks ancestors of `el` looking for `[data-nac-scope="X"]`. If
  found, registered slug becomes `X.derived_leaf`. If not, slug is
  derived under the global scope.
- Leaf slug derivation: `el.id` if present, else `el.dataset.nacAction`
  if present, else `hash(el.outerHTML.slice(0, 100))`.
- Heuristics for `role`:
  - `<button>` / `[role="button"]` -> `button`
  - `<input type="text">` / `<textarea>` -> `field`
  - `<input type="checkbox">` -> `toggle`
  - `<select>` / `[role="combobox"]` -> `select`
  - `<a href>` -> `link`
  - default -> `interactive`
- Heuristics for `label`: `aria-label` attr, then `textContent`
  trimmed.
- **i18n_strict mode** (default at NAC-3): if `el` has neither
  `data-i18n-key` (pointing to a registered catalog key) nor an
  explicit `label_i18n` in `derive`, the registration is **skipped**
  with `nac:i18n_skipped` warn event. Permissive mode allows
  mono-locale registration with `_autoderived: true` flag.

### 2.3 MutationObserver hook

```javascript
NAC.autoRegister.watch(containerEl, {throttleMs: 50});
// Any descendant with [data-nac-action] inside this container is
// auto-registered as it appears; auto-unregistered as it disappears.
```

- Throttle: 50ms default (debounce). Configurable per watch.
- GC: on DOM removal, the manifest entry is removed too. Verifies
  via `MutationObserver` removed nodes + `Node.isConnected`.
- Per-page hard cap: 200 `autoRegister` calls per second. Excess
  silently batched into next throttle tick.

### 2.4 Errors

| Error code | Reason |
|---|---|
| `auto_register_no_action` | `derive.role='auto'` couldn't infer role + no `data-nac-action` |
| `i18n_skipped` | strict mode + no `data-i18n-key` and no explicit `label_i18n` |

---

## 3. Adopt third-party non-compliant

### 3.1 Public API

```javascript
NAC.adopt({
  selector: '.stripe-payment-button',
  parent: 'shell.checkout',
  derive: {
    slug: el => el.dataset.action || hash(el.textContent),
    role: () => 'button',
    intent: () => 'commit',
    label_i18n: el => ({
      es: el.getAttribute('aria-label'),
      en: el.getAttribute('aria-label')
      // mono-locale fallback flag _autoderived: true added by runtime
    }),
    irreversible: el => el.classList.contains('btn-danger')
  },
  observe: true  // re-evaluate on DOM mutations within scope
});
```

### 3.2 Semantics

- The runtime registers a scoped `MutationObserver` on the nearest
  ancestor that already has a NAC scope. Default scope: `document.body`.
- For each rule in `adopt`, the observer matches `selector` against
  added nodes (and existing matching descendants on registration).
- For each match, `derive` functions run synchronously. The
  resulting manifest entry is registered under `parent.slug`.
- **Stable_id strategy**: by default, the slug is recomputed from
  `derive.slug` on each invocation. Hosts that need stability across
  third-party refactors set `stable_id_strategy: 'frozen-on-first-encounter'`
  to lock the slug after first registration.
- `observe: true` re-evaluates the rule on DOM mutations. `false`
  applies once at boot.

### 3.3 i18n in adopt rules

A non-compliant third-party renders text in the **current** user
locale only. The adopter has three options:

1. **Provide a catalog**: `derive.label_i18n: el => ({es:'...', en:'...', ...})`
   for all 10 locales. Best path; works with the i18n contract.
2. **Wrap with intercept**: the adopter intercepts the third-party's
   render and translates per locale. NAC's runtime does NOT do this.
3. **Mono-locale fallback**: `derive.label_i18n: el => ({[NAC.locale()]: el.textContent})`.
   Manifest entry carries `_autoderived: true` flag. NAC-3 strict
   mode emits `i18n_mono_locale` finding (warn).

### 3.4 Pre-baked rules library

`@nac-spec/rules-stripe`, `@nac-spec/rules-slack`, `@nac-spec/rules-mapbox`
ship in the `rules/` directory of this repo as reference implementations.
Each is independently versioned. Community is invited to contribute.

### 3.5 Errors

| Error code | Reason |
|---|---|
| `selector_invalid` | not a valid CSS selector |
| `derive_threw` | a derive function threw; the rule is skipped + emits `nac:adopt_failed` |
| `parent_unknown` | `parent` slug does not exist when rule fires |

---

## 4. Bridge Shadow DOM

### 4.1 Public API

```javascript
NAC.bridgeShadowRoot(host);
// host = element with .shadowRoot

// Semantics: walks the open shadow root recursively, treating every
// [data-nac-id] inside as if it were in the light DOM. Manifest
// merges. describe() returns merged tree.
```

### 4.2 Limits

- Closed shadow roots cannot be penetrated (browser security). The
  bridge fails gracefully, emits `nac:shadow_blocked` event with the
  host element reference. The host application must decide how to
  proceed (re-implement using open shadow, or expose declarative
  slots).
- Nested shadow roots are walked recursively up to 6 levels.
- The bridge does NOT shadow-pierce ARIA: shadow root elements still
  expose ARIA only within their root. NAC manifest provides the
  cross-shadow operability that ARIA cannot.

### 4.3 Errors

| Error code | Reason |
|---|---|
| `shadow_root_closed` | host.shadowRoot is null (closed mode) |
| `shadow_depth_exceeded` | nested shadow roots > 6 levels |

---

## 5. Bridge same-vendor iframes

### 5.1 Wire protocol -- "NAC iframe channel v1"

Iframe receiver also loads `nac.js`. Parent and iframe negotiate via
`postMessage`:

```javascript
// Parent
NAC.bridgeIframe(iframeEl, {
  postMessageNamespace: 'nac.iframe.v1',
  trusted_origins: ['https://js.stripe.com'],
  timeout_ms: 5000
});

// Iframe (loaded inside)
NAC.exposeToParent({
  origin: 'https://parent.example.com'
});
```

### 5.2 Handshake

1. Parent posts `{ns:'nac.iframe.v1', cmd:'handshake', version:'2.0'}`.
2. Iframe responds `{ns:'nac.iframe.v1', cmd:'handshake_ack', version:'2.0', manifest_version:1}`.
3. Parent posts `{ns:'nac.iframe.v1', cmd:'describe'}`.
4. Iframe responds `{ns:'nac.iframe.v1', cmd:'describe_result', manifest:{...}}`.
5. Parent merges the manifest into its describe() output, prefixed
   with `iframe.{iframeId}.{innerSlug}`.

### 5.3 Trust model

- `trusted_origins` is a hard allowlist. Messages from other origins
  are silently dropped + emit `nac:iframe_untrusted`.
- HMAC signature is REQUIRED on every cross-origin message. Both
  parent and iframe must agree on the secret out-of-band.
- Cross-origin agent-source events MUST sign with the iframe's HMAC
  secret AND the parent's HMAC secret (chained signature in the
  ProvenanceBlock `source.signature_chain[]`).

### 5.4 Limits

- Same-origin iframes work without the channel (DOM is accessible).
- Cross-origin to non-NAC iframes (e.g. ads, analytics) cannot be
  bridged. By design, not by gap.
- `timeout_ms` defaults to 5000ms. Longer handshakes fail with
  `iframe_handshake_timeout`.

### 5.5 Errors

| Error code | Reason |
|---|---|
| `iframe_untrusted` | message origin not in `trusted_origins` |
| `iframe_handshake_timeout` | no `handshake_ack` within timeout |
| `iframe_version_mismatch` | iframe and parent run different NAC majors |
| `iframe_signature_invalid` | HMAC chain verification failed |

---

## 6. Declare virtual manifests

### 6.1 Public API

```javascript
NAC.declareVirtual({
  slug_pattern: 'pipeline.runs.row.{i}',
  count: 10000,
  resolver: function(i) {
    // synchronous-or-fast (target: <10ms p95)
    return {
      slug: `pipeline.runs.row.${i}`,
      role: 'row',
      label_i18n: rows[i].label_i18n,
      element: null  // virtual; no DOM until scrolled into view
    };
  },
  hint: {
    visible_range: () => [scrollTopIdx, scrollBottomIdx]
  }
});
```

### 6.2 Semantics

- `describe()` reports the count + a sample of 10 (head + middle +
  tail) instead of materialising 10k entries.
- `find('pipeline.runs.row.7392')` calls `resolver(7392)` on demand.
- `hint.visible_range()` lets the agent prioritise visible rows when
  asked to "click the highlighted row".
- Async resolvers (DB fetch, IndexedDB) are allowed but emit
  `nac:virtual_async` flag in `describe()` so the agent expects
  latency.

### 6.3 Limits

- One virtual block per slug pattern (re-declaring replaces).
- `count` may be `() => liveCount` for dynamic counts; resolver
  must handle out-of-range gracefully.
- Resolver MUST be idempotent within a single `describe()` call.

### 6.4 Errors

| Error code | Reason |
|---|---|
| `virtual_resolver_threw` | resolver(i) threw |
| `virtual_resolver_slow` | resolver took > 50ms p95 (warn) |

---

## 7. Capture ephemeral UI

### 7.1 Public API

```javascript
NAC.captureEphemeral({
  duration_ms: 3000,        // events visible for less than this fall in the buffer
  ring_size: 100,           // FIFO ring size
  on_capture: function(ev) { /* optional hook */ }
});

// Reading:
NAC.describe().ephemeral_log;  // last N captured ephemeral events
```

### 7.2 Semantics

- The runtime's MutationObserver tracks insertion + removal of
  `[data-nac-id]` elements. If an element is added and removed
  within `duration_ms`, its registration is captured into the ring
  buffer with timestamps + final state snapshot.
- Buffer is in-memory, per-page. Cleared on page reload.
- `describe().ephemeral_log` exposes the trail to the agent so
  "what was that error toast 3 seconds ago?" is answerable.

### 7.3 Limits

- Memory: ring buffer bounded at `ring_size` * ~500 bytes default
  = ~50KB.
- Does NOT capture state mutations on long-lived elements (use
  `nac:state_changed` events for that).

---

## 8. Multi-tenant prefix

### 8.1 Public API

```javascript
NAC.setTenantPrefix('acme');
// All subsequent register() calls prepend 'acme.'
// Duplicate-id lint becomes cross-tenant aware.
```

### 8.2 Semantics

- Prefix is set once per page load. Cannot change mid-session
  (would invalidate every existing slug).
- Duplicate-id lint distinguishes `acme.cc.my_plugin.X` from
  `bigco.cc.my_plugin.X` correctly.
- `describe()` exposes `tenant_prefix` field.

### 8.3 Errors

| Error code | Reason |
|---|---|
| `tenant_prefix_locked` | called twice in one session |

---

## 9. HMAC mandatory at NAC-3 + isTrusted attestation

### 9.1 ProvenanceBlock additions

v2.0 ProvenanceBlock extends v1.9.0:

```typescript
interface ProvenanceBlock {
  type: 'user' | 'agent' | 'script';
  tool?: string;
  // v1.9.0 fields ...

  // v2.0 NEW:
  user_gesture_attested: boolean;       // derived from Event.isTrusted
  signature?: string;                   // HMAC-SHA256, REQUIRED for type='agent' at NAC-3
  signature_chain?: string[];           // for cross-iframe signing
  os_level?: boolean;                   // optional metadata: agent driving via OS-level events
}
```

### 9.2 Enforcement matrix at NAC-3

| `source.type` | `signature` required | `user_gesture_attested` required |
|---|---|---|
| `'user'` | no | **yes, must be `true`** |
| `'agent'` | **yes (HMAC)** | not constrained |
| `'script'` | no | **must be `false`** |

Forbidden combinations at NAC-3:
- `'user'` + `attested=false` -> `user_gesture_unattested`
- `'agent'` + missing/invalid signature -> `agent_source_missing_signature` / `agent_source_invalid_signature`
- `'script'` + `attested=true` -> `script_claims_user_gesture`

### 9.3 isTrusted derivation

The runtime captures `event.isTrusted` at the originating DOM event
(click/keydown/touch) and copies it into `source.user_gesture_attested`
automatically. The consumer does not call this directly. Only
testing tools that need to simulate user gestures can call:

```javascript
NAC.attestUserGesture({trusted: false, type: 'script'});
```

### 9.4 HMAC secret registration

```javascript
NAC.set_provenance_secret(secretOrSecrets);
// secret: string | string[]
// Multiple secrets supported for rotation overlap.
```

Hosts SHOULD source the secret from a server-rendered template OR
per-user vault. SHOULD NOT bake it into static JS. Rotation
SHOULD overlap (old + new accepted simultaneously) for at least
24 hours.

### 9.5 Performance impact

- HMAC sign per command: ~0.3-3ms (low-tier mobile worst case).
- isTrusted read: ~0.001ms (free).
- v2.0 perf budget allows 1.0ms `_emit` for agent events
  specifically (relaxed from v1.9's 0.5ms blanket).

### 9.6 Errors

| Error code | Reason |
|---|---|
| `agent_source_missing_signature` | `type='agent'` + no signature |
| `agent_source_invalid_signature` | signature does not verify |
| `user_gesture_unattested` | `type='user'` + `attested=false` |
| `script_claims_user_gesture` | `type='script'` + `attested=true` |

---

## 10. i18n contract (L1.5: format + resolver + lint, mutates accessibility metadata only)

**Framing revision (rc3 per Claude T5-F1)**: the original L1
framing claimed "DOES NOT mutate the DOM". This was inaccurate.
The runtime DOES mutate `aria-label`, `role`, `data-nac-id`,
`data-nac-parent`, `data-nac-irreversible`, and `dir="rtl"` on
the document root. These are accessibility-metadata DOM writes,
not i18n textContent writes.

The honest framing is **L1.5**: NAC mutates accessibility
metadata (aria-label, role, dir, data-nac-* attrs) and NEVER
i18n textContent or strings consumed visually by users. This
distinction matters: accessibility metadata is what screen
readers and AI agents consume; textContent is what the human
user sees. NAC owns the former; the host's i18n library owns the
latter.

This section establishes NAC's L1.5 i18n contract. NAC v2.0
normalises the catalog format, provides a resolver helper, and
mutates accessibility metadata for the registered elements. NAC
DOES NOT mutate user-visible textContent. Existing i18n libraries
(react-intl, vue-i18n, i18next, FormatJS) continue to be the
runtime for textContent; NAC consumes the catalog they (or the
host directly) build, and writes the resolved strings into ARIA
attributes for assistive consumers.

### 10.1 Canonical catalog format

```json
{
  "<key>": {
    "es": "<string>",
    "en": "<string>",
    "pt": "<string>",
    "fr": "<string>",
    "it": "<string>",
    "de": "<string>",
    "ja": "<string>",
    "zh": "<string>",
    "hi": "<string>",
    "ar": "<string>"
  }
}
```

- Key: ASCII-safe identifier (`[a-z0-9_.-]+`). No spaces.
- Value object: 10 supported locales by default. Extensible via
  `NAC.setSupportedLocales([...])` (see I18N_INTEGRATION_GUIDE.md).
- Sub-keys for plurals/gender (NAC v2.0 keeps simple; advanced
  plurals stay in i18n libraries):
  - `contact.delete.singular`
  - `contact.delete.plural`
  - `contact.delete.genitive` (for languages with grammatical cases)

### 10.2 API

```javascript
NAC.registerCatalog(catalogObject);
// Merges into the global catalog. Last-key-wins.

NAC.t('contact.delete', {locale: 'es'});
// 'Eliminar contacto'

NAC.t('contact.delete');
// Uses NAC.locale() (current).

NAC.locale();        // get current
NAC.locale('es');    // set + emit nac:locale_changed event

NAC.setSupportedLocales(['es', 'en', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'hi', 'ar', 'ca', 'kk']);
// Extend beyond default 10. Validator picks up new locales automatically.
```

### 10.3 Lint at NAC-3

`validate_global({i18n_strict: true})` emits findings:

| Finding | Severity | Reason |
|---|---|---|
| `i18n_missing_locale` | error at NAC-3 | A key has fewer than supported locales |
| `i18n_orphan_key` | warn | A catalog key not consumed by any registered manifest |
| `i18n_unused_locale` | warn | A locale defined in catalog but used by no element |
| `i18n_mono_locale_autoderived` | warn | An adopted/autoRegistered element with `_autoderived: true` |
| `i18n_invalid_locale` | error | Locale code not in supported list |

### 10.4 What NAC i18n contract does NOT do (L1.5 framing per rc3)

- Does NOT replace react-intl / vue-i18n / FormatJS / i18next.
- Does NOT mutate textContent or visible user-facing strings.
  (NAC DOES mutate accessibility metadata: aria-label, role,
  data-nac-* attrs. That's the L1.5 distinction; see sec 10
  intro.)
- Does NOT handle plurals beyond sub-keys (i18n libraries handle).
- Does NOT format numbers/dates (`Intl.NumberFormat` / `Intl.DateTimeFormat`
  do that).
- Does NOT auto-translate. Adopters use Crowdin / Lokalise / Claude
  / GPT to fill catalogs; NAC validates the result.

### 10.5 Migration from v1.9

v1.9 consumers passing `label_i18n: {es:..., en:...}` inside
`register()` keep working. v2.0 also accepts:

```javascript
NAC.registerCatalog({
  'contact.delete': {es:'Eliminar contacto', en:'Delete contact', ...}
});
NAC.register({
  slug: 'contact.delete-btn',
  i18n_key: 'contact.delete',  // resolves via catalog
  // ...
});
```

Both forms coexist.

---

## 11. Backward compatibility -- strict superset proof

### 11.1 Public API diff (v1.9 -> v2.0)

| API | v1.9 status | v2.0 status |
|---|---|---|
| `NAC.register(manifest)` | shipping | unchanged |
| `NAC.register(slug, manifest)` (back-compat) | shipping | unchanged |
| `NAC.click(slug)` | shipping | unchanged |
| `NAC.fill(slug, value)` | shipping | unchanged |
| `NAC.expand(slug)`, `tab()`, `sort()`, `drag_drop()`, `tree_*()`, `reset()` | shipping | unchanged |
| `NAC.describe()` | shipping | extended (adds `tenant_prefix`, `ephemeral_log`, virtual entries with `is_virtual: true`) |
| `NAC.list(role)` | shipping | unchanged |
| `NAC.find(slug, opts)` | shipping | unchanged |
| `NAC.validate_global(opts)` | shipping | extended (new findings: i18n_*, user_gesture_*, agent_source_*) |
| `NAC.set_validation_tolerance(opts)` | shipping | extended |
| `NAC.sign_provenance(detail, secret)` | shipping | unchanged |
| `NAC.verify_provenance(detail, secret)` | shipping | unchanged |
| `NAC.set_provenance_secret(secret)` | NEW v1.9.1 DRAFT, never shipped | shipped in v2.0 |
| `NAC.scope(spec)` | -- | NEW |
| `NAC.autoRegister(el, opts)` | -- | NEW |
| `NAC.adopt(rule)` | -- | NEW |
| `NAC.bridgeShadowRoot(host)` | -- | NEW |
| `NAC.bridgeIframe(iframeEl, opts)` | -- | NEW |
| `NAC.declareVirtual(spec)` | -- | NEW |
| `NAC.captureEphemeral(opts)` | -- | NEW |
| `NAC.setTenantPrefix(slug)` | -- | NEW |
| `NAC.attestUserGesture(opts)` | -- | NEW |
| `NAC.t(key, opts?)` | -- | NEW |
| `NAC.registerCatalog(obj)` | -- | NEW |
| `NAC.locale(code?)` | -- | NEW |
| `NAC.setSupportedLocales(arr)` | -- | NEW |
| Event `nac:command_pending/done/failed/rejected` | shipping | unchanged |
| Event `nac:registered/unregistered` | shipping | unchanged |
| Event `nac:duplicate_warn` | -- | NEW |
| Event `nac:depth_warn` | -- | NEW |
| Event `nac:i18n_skipped` | -- | NEW |
| Event `nac:adopt_failed` | -- | NEW |
| Event `nac:shadow_blocked` | -- | NEW |
| Event `nac:iframe_untrusted/handshake_timeout/version_mismatch/signature_invalid` | -- | NEW |
| Event `nac:virtual_async` | -- | NEW |
| Event `nac:locale_changed` | -- | NEW |
| Attribute `data-nac-id` | shipping | unchanged |
| Attribute `data-nac-plugin` | shipping | unchanged |
| Attribute `data-nac-action` | shipping | unchanged + recommended at NAC-3 for autoRegister |
| Attribute `data-nac-scope` | -- | NEW |
| Attribute `data-nac-parent` | -- | NEW (auto-set by runtime) |
| Attribute `data-nac-irreversible` | shipping | unchanged |
| Attribute `data-nac-watch` | -- | NEW (opt-in container for autoRegister scope) |
| Attribute `data-i18n-key` | -- | NEW |

### 11.2 Strict superset claim

**Every v1.9.0 client keeps working under v2.0 at NAC-1 and
NAC-2.** Verification:

1. No public API removed.
2. No event renamed or removed.
3. No attribute removed.
4. No semantic tightening that changes existing behaviour AT
   NAC-1 OR NAC-2.
5. The duplicate-id lint upgrade to `strict` is opt-in (default
   stays `warn`).

**At NAC-3 there are TWO intentional tightening changes** (rc3
update per Mistral T2-F1 + Claude T2-F3 2/4 concurrence):

1. **HMAC mandatory** for `source.type='agent'` events. Unsigned
   agent events emit `agent_source_missing_signature` finding.
2. **i18n_strict findings** in `validate_global()` output (warn
   severity by default in rc2+, opt-in to error). Even though
   warn-default, this is a behavioural change in
   `validate_global()` output -- v1.9 hosts that asserted "zero
   warnings" in CI will get failing builds against v2.0 NAC-3
   without `set_validation_tolerance({i18n_strict:'silent'})`
   opt-out.
3. **Identity binding on user attestation** (rc3 BLOCKER fix per
   Claude T4-F1). NAC-3 rejects `source.type='user'` events when
   the invocation target is NOT in the captured event composedPath.
   v1.9 had no attestation, so this is additive at NAC-1/NAC-2,
   tightening at NAC-3.

These three tightening changes apply ONLY to NAC-3. NAC-1 and
NAC-2 clients are unaffected.

The client-visible deltas a v1.9 plugin can experience at NAC-3:
- If it emits `source.type='agent'` events WITHOUT signature,
  those events are now rejected.
- If it consumed `validate_global()` output and asserted
  `errors.length === 0 && warnings.length === 0` in CI, the
  i18n_strict findings will fail the assertion until silent
  tolerance is set or the catalog is filled.
- If it emits `source.type='user'` events from a code path that
  is not synchronously inside an originating user gesture (e.g.
  promise-resolved-later handlers), those events are now rejected
  with `user_gesture_path_mismatch`.

All other v1.9 plugin code is unaffected.

---

## 12. Performance budget at NAC-3

| Operation | Target | Hard fail (NAC-3 enforcement) |
|---|---|---|
| Boot register 1000 elements | 50ms | 100ms |
| `autoRegister` per mutation | 2ms | 5ms |
| `adopt` selector match per mutation | 5ms | 15ms |
| `describe()` any size (with pagination) | 30ms | 100ms |
| HMAC sign per command | 3ms | 10ms |
| `NAC.t()` resolution | <0.1ms | 1ms |
| Virtual resolver per call | <10ms | 50ms |

Budget enforced via `perf_probe` in conformance suite. Measurements
on low-tier mobile 2026 (Snapdragon 6 Gen 1 reference). Higher
tiers automatically meet the budget.

---

## 13. Conformance levels

### NAC-1 (basic operability)
- All public APIs available.
- HMAC OPTIONAL.
- isTrusted attestation OPTIONAL.
- i18n_strict OPTIONAL.

### NAC-2 (audit-aware)
- HMAC RECOMMENDED.
- isTrusted attestation RECOMMENDED.
- i18n_strict RECOMMENDED.
- Validator emits warnings on missing.

### NAC-3 (strict)
- HMAC MANDATORY for `source.type='agent'`.
- isTrusted attestation MANDATORY.
- i18n_strict MANDATORY.
- Validator emits errors on missing.
- Perf budget enforced.

---

## 14. Deferrals to v2.1+

| Item | Reason for deferral |
|---|---|
| Capability/version negotiation in manifest | needs careful design to avoid breaking strict-superset invariant |
| Independent runtime port (Python/Rust/Kotlin) | community-driven; not blocked on v2.0 |
| iOS/Android native NAC | requires separate spec (UIKit/Compose) |
| Guided task flows for cognitive disability | not yet shaped into normative spec |
| L2 i18n runtime (NAC mutates DOM) | scope creep + ecosystem conflict |
| Closed shadow root penetration | browser security; not feasible without browser support |
| Cross-origin to non-NAC iframes | structural limit |

---

## 15. Open questions for reviewers

Same 10 questions as in `docs/NAC_v20_SCOPE_AND_ECOSYSTEM.md`,
section 11. This RFC supplies the formal API answers; reviewers
validate or challenge.

Additional question raised post-scope-doc:

**Q11**: i18n contract is L1 (format + resolver + lint, no DOM
mutation). Reviewers, do you agree this is the right depth, or
should NAC v2.0 push to L2 (full runtime)? Sumi's argument for
L1 in scope doc section "Mi opinión sobre i18n" is the reasoning.

---

## 16. Author's confidence

| Section | Confidence |
|---|---|
| 1. Scope constructor | high |
| 2. autoRegister | medium-high |
| 3. Adopt | medium (selector perf risk) |
| 4. Bridge Shadow DOM | medium-high |
| 5. Bridge iframes | low (postMessage protocol needs its own RFC review) |
| 6. Virtual manifest | medium |
| 7. Ephemeral capture | medium-high |
| 8. Tenant prefix | high |
| 9. HMAC + isTrusted | high (Pablo's user impersonation concern resolved) |
| 10. i18n contract L1 | medium-high (depends on reviewer L1 vs L2 verdict) |
| 11. Backward compat | high (strict superset verifiable) |
| 12. Perf budget | medium (numbers pending real benchmark) |

---

**Reviewers receive this RFC + NAC_v20_SCOPE_AND_ECOSYSTEM.md +
I18N_INTEGRATION_GUIDE.md + case-studies/yujin.md (in progress) for
Round 3 review. Reviewer prompt is `PromptEvaluacion5.txt` (to be
authored alongside this RFC).**

-- Pablo & Sumi, 2026-05-09
