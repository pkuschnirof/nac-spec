# NAC v1.9 -> v2.0 Migration Guide

**Audience**: NAC v1.9 adopters planning v2.0 upgrade + peer
reviewers evaluating the migration path.
**Version this doc covers**: NAC v2.0.0-rc4 (May 2026).
**Status**: stable for adopters at NAC-1 + NAC-2; NAC-3 has 4
tightening changes that require explicit migration steps.
**License**: MIT.

---

## 0. TL;DR (one-page summary)

NAC v2.0 is a **strict superset of v1.9** at conformance levels
NAC-1 and NAC-2. Existing v1.9 plugins keep working unchanged.
At NAC-3 there are **four intentional tightening changes**
(security + auditability) that require explicit migration steps.

| You are at... | Migration cost | Action required |
|---|---|---|
| NAC-1 | none | Load `nac-v2-extensions.js`. Done. |
| NAC-2 | minimal | Load v2 extension. Optionally adopt new primitives where useful. |
| NAC-3 | meaningful | Walk the 4 NAC-3 tightening changes (sec 6 below). Most are 1-2 line fixes. |
| Greenfield app | 10-20h dev | Use the v2.0 `NAC.scope()` pattern from start. |
| Brownfield app w/ all primitives wired | 36-72h dev (1.5-2x first-adoption multiplier) | Follow brownfield path (sec 5 below). |
| Brownfield app w/ minimal layer | ~3h dev | Follow `example-v20-full.php` pattern (sec 4 path C). |

**v2.0 is additive at the API level**. You do NOT have to use any
new primitive to get the v2.0 stamp; staying at NAC-1/NAC-2 is fine
indefinitely. The new primitives address pain points (hierarchy,
auto-registration, third-party adoption, virtualised lists, etc.)
that adopters with non-trivial apps eventually hit.

---

## 1. Reading order

If you are an adopter:
1. This doc, sec 0-2 (overview).
2. This doc, sec 4 (pick your path).
3. This doc, sec 5 (brownfield step-by-step) OR sec 10 (side-by-side examples).
4. `docs/I18N_INTEGRATION_GUIDE.md` if you ship in 2+ locales.
5. `docs/PEER_REVIEW.md` if you want to see what reviewers flagged.

If you are a peer reviewer:
1. `RFC_v2.0.0.md` (the formal RFC).
2. `spec/NAC-v2.0.md` (normative deltas).
3. This doc, sec 6 + sec 11 (NAC-3 tightening + cost estimates).
4. `case-studies/yujin.md` (when populated post-Yujin migration).

If you have NEVER read NAC: start at the v1.9 spec
(`spec/NAC-v1.0.md`). Migration only makes sense with the v1.9
contract in hand.

---

## 2. Compatibility model

### 2.1 The strict-superset claim (with NAC-3 caveats)

The author's commitment: **every v1.9 plugin keeps working
unchanged at NAC-1 and NAC-2 under v2.0**. This is verifiable:

- Zero v1.9 public API removed.
- Zero v1.9 event renamed or removed.
- Zero v1.9 attribute removed.
- Zero behavioural change to v1.9 NAC-1 + NAC-2 plugin contracts.

At NAC-3 there are **four intentional tightening changes** (rc4
update; rc3 had three; rc4 added bridgeIframe fail-closed):

| # | Change | Why | What breaks |
|---|---|---|---|
| 1 | HMAC mandatory for `source.type='agent'` | regulated environments need verifiable agent provenance | unsigned agent events rejected |
| 2 | `i18n_strict` findings in `validate_global()` output | drift detection for catalog gaps | CI assertions of "zero warnings" need update OR `set_validation_tolerance({i18n_strict:'silent'})` opt-out |
| 3 | Identity-bound user attestation | closes user/script impersonation gap (BLOCKER fix from Round 3) | `source.type='user'` events from non-synchronous handlers rejected with `user_gesture_path_mismatch` |
| 4 | `bridgeIframe` fail-closed | spec mandate (HMAC chain) was unenforced in rc3 | bridgeIframe at NAC-3 requires `set_provenance_secret` first; missing-signature events rejected |

If your audit pipeline does NOT operate at NAC-3, none of these
breaks affect you.

### 2.2 ProvenanceBlock additive fields

v2.0 adds new optional fields to ProvenanceBlock:
`user_gesture_attested`, `signature`, `signature_chain`,
`os_level`. v1.9 audit pipelines that did STRICT shape validation
(JSON-Schema with `additionalProperties: false` semantics) will
reject v2.0 events as malformed.

**Required action**: patch v1.9 strict-shape validators to
ignore-unknown BEFORE adopting v2.0 producers. One-line fix in
most JSON Schema configs.

### 2.3 What is honestly NOT a strict superset

Two NAC-3 behaviours change in subtly visible ways even at warn
default:

- **`validate_global()` output gains warnings** (i18n_missing_locale,
  user_gesture_unattested, agent_attested_without_os_level,
  data_nac_action_autoderived, etc.). v1.9 hosts asserting empty
  warnings array in CI need to either update assertions OR set
  tolerance to silent.

- **Console output during boot** mentions v2.0 layer presence
  (`nac:v2_installed` event). Hosts that grep console for "no
  unexpected output" need update.

These are documentation issues, not API breaks. Mentioned for
transparency.

---

## 3. The 8 new primitives at a glance

Quick table for "do I need this?":

| Primitive | When to use | Skip if |
|---|---|---|
| `NAC.scope()` | UI is hierarchical (shell -> hub -> card -> modal). Most apps. | Flat plugin namespace works fine for you. |
| `NAC.autoRegister()` | UI elements appear/disappear at runtime (catalog cards, agent-injected buttons). | Static UI declared at build time. |
| `NAC.adopt()` | You integrate third-party widgets that are not NAC-aware (Stripe, Slack, Mapbox, etc). | All your UI is in-house. |
| `NAC.bridgeShadowRoot()` | You use Web Components / Lit / design system with Shadow DOM. | No Shadow DOM. |
| `NAC.bridgeIframe()` | You embed same-vendor iframes (Stripe Checkout, embedded analytics). | No iframe usage. |
| `NAC.declareVirtual()` | You have virtualised lists (10k+ rows visible 50 at a time). | Lists are paginated server-side. |
| `NAC.captureEphemeral()` | You show toasts, dropdowns, drag-previews that disappear within seconds. | No transient UI. |
| `NAC.setTenantPrefix()` | You ship multi-tenant SaaS where same plugin slug appears in N tenants. | Single-tenant. |

**Most adopters use 3-5 primitives, not all 8.** The minimal set
is `scope` + `autoRegister`; most other primitives are
opt-in-when-needed.

---

## 4. Three migration paths

### Path A: Greenfield (~10-20h dev)

You are starting a new app and want NAC v2.0 from day one.

**Steps**:
1. Load `js/nac.js` + `js/nac-v2-extensions.js`.
2. Decide your scope hierarchy (shell -> hub -> card -> modal).
3. Use `NAC.scope({slug, label_i18n}).register({slug, ...})` for
   every interactive element.
4. Add `data-nac-action="..."` to interactive elements (SHOULD
   at NAC-3; runtime auto-derives from semantic role as fallback).
5. Build your i18n catalog in the canonical 10-locale format
   (es, en, pt, fr, it, de, ja, zh, hi, ar). Use existing i18n
   library (react-intl, vue-i18n, etc.) for textContent rendering;
   register the same keys with `NAC.registerCatalog()` so NAC's
   resolver + lint work.
6. Decide conformance level: NAC-1 (basic), NAC-2 (audit-aware),
   NAC-3 (strict). At NAC-3, call `NAC.set_provenance_secret()`
   if any `source.type='agent'` events are emitted.
7. Run `NAC.validate_global_v2({i18n_strict: true})` in CI.

**Cost** (per scope doc appendix A revised in rc4):
- ~10h dev for NAC structural work on 50 components.
- ~50h i18n catalog filling for 10 locales (AI-assisted).
- 1.5x-2x multiplier for first 1-2 projects (learning curve).

**Total realistic greenfield**: 60-90h calendar including i18n.

### Path B: Brownfield with full rewrite (~36-72h dev)

You have an existing v1.9 app and want every component fully
adapted to v2.0 patterns.

**Steps** (in addition to Path A):
1. Run `npx @nac-spec/codemod scan <repo>` -- gets a coverage
   report and a PR-shaped diff with auto-inferred annotations.
   Auto-coverage: **35-60% range, brownfield median ~45%**
   (rc4 honest revision). The other 55% needs manual work.
2. For each manually-handled component, decide:
   - Keep v1.9 flat slug? (`plugin_slug.element_id` continues to
     work)
   - Migrate to scope hierarchy? (re-keys but enables breadcrumbs
     + intermediate scope label_i18n in `describe_v2()`)
3. Audit i18n catalog completeness. Run
   `NAC.validate_global_v2({i18n_strict: true})` and fill gaps.
4. Audit any `source.type='agent'` event emissions. Add
   `set_provenance_secret()` + `sign_provenance()` calls.

**Cost**: 36-72h dev for an app of Yujin scale (~50 components,
27 widgets, partial i18n + ARIA baseline). 1.5x-2x multiplier
for the first project.

### Path C: Brownfield with minimal layer (~3h dev)

You have an existing v1.9 app, the team is busy, and you want
v2.0 stamps WITHOUT touching the existing 27 widgets.

**This is what `example-v20-full.php` demonstrates.**

**Steps**:
1. Load `js/nac-v2-extensions.js` after `nac.js`.
2. Add ~80 lines of setup at boot (sec 5 below details each step).
3. Optionally add the introspection panel (~20 lines HTML +
   ~30 lines JS).
4. Test that v1.9 plugins still work unchanged. They do, by
   construction.

**Cost**: ~3h dev. Yields:
- Hierarchical scope tree built from existing `data-nac-plugin`
  attributes (every plugin becomes a scope under shell).
- HMAC sign/verify ready (call `set_provenance_secret`).
- `captureEphemeral` ring buffer running.
- `autoRegister.watch` on the cards container -- any new card
  inserted at runtime auto-registers.
- `describe_v2()` exposes the full enriched manifest.

**Limitation**: you do NOT get deep migration of any single
component. If a third-party widget needs `adopt` rules, you wire
that one widget. If a virtualised list needs `declareVirtual`,
you wire that one list. The 80-line setup gets you 70% of v2.0's
value for 5% of the work.

This is the **realistic adoption path** and what Yujin migration
phase 5.5 follows.

---

## 5. Step-by-step brownfield migration (Path C)

Concrete code from `example-v20-full.php` -- the production
template.

### Step 1: Load v2 extension

```html
<!-- Already loading nac.js v1.9.0 -->
<script src="js/nac.js"></script>

<!-- Add this AFTER nac.js, BEFORE your app code -->
<script src="js/nac-v2-extensions.js"></script>

<!-- Your app code stays unchanged -->
<script src="js/example.js"></script>
```

That's the only HTML change.

### Step 2: Set provenance secret + tenant prefix

At app boot, BEFORE any agent-source event fires:

```javascript
NAC.set_provenance_secret('your-tenant-shared-secret');
NAC.setTenantPrefix('your-tenant-slug');
```

The secret can be:
- A static string (only safe for greenfield demos).
- A server-rendered template variable (typical SaaS).
- A per-user value loaded from `/api/v1/me` (per-user vault).

The tenant prefix can be skipped if you are NOT multi-tenant.

### Step 3: Build scope tree from existing attributes

If your v1.9 app uses `data-nac-plugin="X"` on each plugin's root
(typical pattern), you can build the scope tree mechanically:

```javascript
var shellScope = NAC.scope({
  slug: 'shell',
  label_i18n: { es: 'Mi app', en: 'My app', /* + 8 more */ }
});

var pluginScopes = {};
document.querySelectorAll('[data-nac-plugin]').forEach(function (host) {
  var name = host.getAttribute('data-nac-plugin');
  if (pluginScopes[name]) return; /* dedupe */
  pluginScopes[name] = shellScope.scope({
    slug: name.replace(/[^a-zA-Z0-9_-]/g, '_'),
    label_i18n: { es: name, en: name }
  });
});
```

The leaf elements (`[data-nac-id]` inside each plugin) keep their
v1.9 slugs; they remain queryable via `NAC.find('plugin.element')`
unchanged.

### Step 4: autoRegister.watch on dynamic containers

If you have containers where new cards / rows / tiles appear at
runtime:

```javascript
var cardsRoot = document.querySelector('.cards-grid');
cardsRoot.setAttribute('data-nac-watch', '1');
NAC.autoRegister.watch(cardsRoot, {
  i18n_strict: 'permissive', /* or 'strict' if your i18n is complete */
  throttleMs: 100 /* default; tune via set_perf_tolerance */
});
```

Any element inserted into `cardsRoot` with `data-nac-action`
attribute auto-registers under the cardsRoot's nearest scope
ancestor.

### Step 5: captureEphemeral for transient UI

```javascript
NAC.captureEphemeral({
  duration_ms: 3000, /* default */
  ring_size: 50      /* tune for your toast volume */
});
```

Toasts that appear and disappear within 3s land in the ring
buffer. The agent reads them via `NAC.describe_v2().ephemeral_log`.

### Step 6: Audit i18n catalog at NAC-3

If you target NAC-3 strict, run:

```javascript
var findings = NAC.validate_global_v2({ i18n_strict: true });
console.log(findings.warnings); /* missing locales */
console.log(findings.errors);   /* if you opted into 'error' tolerance */
```

For typical SaaS rollouts where languages are added incrementally,
keep the rc4 default (`warn` severity). When the catalog is
complete, opt in to error:

```javascript
NAC.set_validation_tolerance({ i18n_strict: 'error' });
```

### Step 7: Decide NAC-3 conformance level

At NAC-1 / NAC-2 you are done after step 5. At NAC-3 you must:

- **HMAC mandatory**: ensure every `source.type='agent'` event is
  signed via `NAC.sign_provenance(detail, secret)`.
- **identity-bound user attestation**: emitted automatically when
  user clicks; agent-driven `source.type='user'` events get
  rejected. This is the BLOCKER fix from Round 3 -- automatic.
- **i18n_strict**: covered above.
- **bridgeIframe fail-closed**: when calling `bridgeIframe()`,
  pass `opts.nac_level: 3` OR set the global tolerance:
  `set_validation_tolerance({iframe_strict: 'error'})`.

### Step 8: Test

Run your existing test suite. v1.9 plugin code should not regress.

For new v2.0 surface:
```javascript
/* describe_v2() returns the live manifest the agent reads. */
var d = NAC.describe_v2();
assert(d.nac_version.startsWith('2.0'));
assert(d.v2_scope_entries.length > 0);
```

`tests/nac-v2-extensions.spec.js` in the spec repo has 30 example
tests you can copy.

### Step 9: Deploy

The v2.0 layer is hot-swappable. Ship `nac-v2-extensions.js`
behind a feature flag if you want progressive rollout. Roll back
by removing the script tag.

---

## 6. NAC-3 conformance changes (deep dive)

For adopters operating at NAC-3, these four changes need explicit
attention.

### 6.1 HMAC mandatory for `source.type='agent'`

**Before (v1.9)**: agent events fired without signature; audit
pipeline accepted on faith.

**After (v2.0 NAC-3)**: agent events without `source.signature`
get rejected with `agent_source_missing_signature`. Agent events
with invalid signature get rejected with
`agent_source_invalid_signature`.

**Migration**:
```javascript
/* Before */
document.dispatchEvent(new CustomEvent('nac:command_pending', {
  detail: { provenance: { slug: 'X', source: 'agent', ts: Date.now() } }
}));

/* After */
NAC.sign_provenance({ slug: 'X', source: 'agent', ts: Date.now() }, secret)
  .then(function (sig) {
    document.dispatchEvent(new CustomEvent('nac:command_pending', {
      detail: { provenance: { slug: 'X', source: 'agent', signature: sig, ts: Date.now() } }
    }));
  });
```

In practice, all of this is done by `NAC.invoke(slug)` which
handles signing transparently when the secret is registered.

### 6.2 i18n_strict findings

**Before (v1.9)**: no i18n validation in `validate_global()`.

**After (v2.0 NAC-3)**: catalog gaps surface as findings. Default
severity is `warn` (rc2+ default), opt-in to `error`.

**Migration**:
```javascript
/* If you assert "zero warnings" in CI: */
var findings = NAC.validate_global_v2({ i18n_strict: true });
assert(findings.errors.length === 0); /* still ok */
/* But: */
assert(findings.warnings.length === 0); /* may now fail */

/* Two options: fill the catalog, OR opt out: */
NAC.set_validation_tolerance({ i18n_strict: 'silent' });
```

### 6.3 Identity-bound user attestation (BLOCKER fix from Round 3)

**Before (rc1, rc2)**: `event.isTrusted` captured globally with
100ms freshness window. Any user click anywhere leaked
`attested=true` to ANY subsequent invoke. Cost-of-attack:
trivial.

**After (rc3+)**: `event.composedPath()` captured + bound to
specific element. `_invoke(slug)` verifies the invoked element is
in the captured path before honoring `attested`. Freshness window
reduced 100ms -> 16ms.

**Migration**: NONE if your `source.type='user'` events come from
synchronous click/keydown handlers (the typical path). The check
runs automatically.

**Watch out**: if you have `setTimeout(...)` or
`Promise.resolve().then(...)` handlers that emit
`source.type='user'` events more than 16ms after a real click,
those will get rejected with `user_gesture_path_mismatch`. The
fix is either:
- Move the work synchronously into the click handler, OR
- Declare the work as `source.type='script'` (honest), OR
- Tune the freshness window:
  `set_perf_tolerance({gesture_fresh_ms: 100})` (back to rc2 behaviour).

### 6.4 bridgeIframe fail-closed

**Before (rc3)**: bridgeIframe accepted handshake_ack without
verifying signature when no secret was registered. Compromised
trusted-origin (XSS in vendor CDN) could inject manifest.

**After (rc4 NAC-3)**: at NAC-3, bridgeIframe REQUIRES a registered
secret. Both `handshake_ack` and `describe_result` messages must
carry valid HMAC signature.

**Migration**:
```javascript
/* Before calling bridgeIframe at NAC-3: */
NAC.set_provenance_secret('your-secret');

/* Then either pass nac_level explicitly: */
NAC.bridgeIframe(iframeEl, {
  trusted_origins: ['https://js.stripe.com'],
  nac_level: 3
});

/* OR set the global tolerance: */
NAC.set_validation_tolerance({ iframe_strict: 'error' });
```

The iframe also must sign its messages. If you control the iframe
content, load nac.js + nac-v2-extensions.js inside and sign with
the same secret. If the iframe is third-party that does NOT yet
ship NAC compliance, NAC-3 conformance is not achievable for that
flow until the vendor adopts.

---

## 7. Common pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Forgetting `set_provenance_secret` at NAC-3 | All agent events rejected | Call before any agent-source event fires |
| Strict i18n with incomplete catalog | CI fails on warnings | Either fill catalog or set tolerance to `silent` |
| Position-aware slug under DOM reordering | Voice/agent bookmarks break after reorder | Use explicit `el.id` or `data-nac-action` for stable IDs |
| Closed Shadow DOM widgets | `bridgeShadowRoot` emits `nac:shadow_blocked` | Either open the shadow root OR use `adopt` with declarative selectors |
| `describe_result` HMAC missing | Iframe manifest dropped at NAC-3 | Sign every message from iframe, not just handshake |
| autoRegister fires on every React re-render | Slow performance | The runtime is idempotent (same slug + same element = silent skip) but if you re-create elements, throttle via `set_perf_tolerance({mutation_throttle_ms: 200})` |
| `_intermediateScopes` index growing forever | Memory leak in long-running SPA | Call `NAC.gcIntermediateScopes(activePathSet)` periodically |
| RTL `dir=rtl` flips entire document | LTR side panels break under ar locale | Call `NAC.setAutoRTL(false)` and manage `dir` on a sub-tree |

---

## 8. Performance considerations

### 8.1 Budget targets (rc4)

| Operation | Target (low-tier mobile 2026) | Hard fail |
|---|---|---|
| Boot register 1000 elements | 50ms | 100ms |
| `autoRegister` per mutation | 2ms | 5ms |
| `adopt` selector match per mutation | 5ms | 20ms (rc2/rc3 was 15ms) |
| `describe()` any size (paginated) | 50ms | 150ms |
| HMAC sign per command | 3ms | 10ms (cold start: 20ms first call) |
| `NAC.t()` resolution | <0.1ms | 1ms |
| Virtual resolver per call | <10ms | 50ms |
| MutationObserver throttle (default) | 100ms | tunable |
| `autoRegister.watch` cumulative batch | 50ms | 100ms |
| Hard-fail rate threshold | 2% over 5s window | tunable |

Hosts that need looser thresholds:
```javascript
NAC.set_perf_tolerance({
  describe_target_ms: 100,
  describe_hard_fail_ms: 250,
  perf_budget_fail_rate_pct: 5,
  mutation_throttle_ms: 200
});
```

### 8.2 Cumulative batch chunking

If your page injects 400+ cards in one tick (catalog re-render),
the rc4 runtime chunks `autoRegister.watch` flushes at 50 elements
per sub-batch with `requestIdleCallback` between. Cumulative
budget: 50ms target / 100ms hard-fail per single throttle window.

### 8.3 HMAC cold-start

The first `NAC.sign_provenance()` call after boot can be 5-15ms
(SubtleCrypto lazy-init). rc4 warms the path at boot when a secret
is registered. If your app registers the secret late, call:
```javascript
NAC.sign_provenance({ _warmup: true, ts: Date.now() }, secret)
  .catch(function () {});
```
once at startup to pay the cold-start cost up front.

---

## 9. Tooling

The v2.0 ecosystem ships these packages (all `@nac-spec/*`):

| Package | Status (rc4) | Purpose |
|---|---|---|
| `nac` (the runtime) | shipping | core spec runtime + v2 extensions |
| `babel-plugin-react` | skeleton | auto-inject `data-nac-id` from React component name |
| `vue-plugin` | skeleton | analogous for Vue 3 SFC |
| `svelte-preprocessor` | skeleton | analogous for Svelte |
| `solid-plugin` | skeleton (rc2) | SolidJS plugin |
| `qwik-plugin` | skeleton (rc2) | Qwik plugin |
| `lit-preprocessor` | skeleton (rc2) | Lit + auto bridgeShadowRoot |
| `devtools` | skeleton | Chrome / Firefox extension: live manifest tree |
| `codemod` | skeleton | brownfield migration CLI |
| `playwright-fixture` | skeleton (rc2) | NAC-aware Playwright fixture |
| `telemetry` | skeleton (rc2) | Sentry/Datadog/OTel adapter base |
| `cookbook` | skeleton (rc2 scope: 15 patterns at v2.0; 30 cumulative across v2.0.x) | resolved patterns |
| `rules-stripe` / `-slack` / `-mapbox` | skeleton | pre-baked `adopt` rules |

Storybook + Cypress + VSCode LSP + per-vendor telemetry adapters
ship in v2.0.x patches post-tag.

---

## 10. Side-by-side code examples

### 10.1 Hierarchical naming

**Before (v1.9 flat)**:
```javascript
NAC.register({
  plugin_slug: 'cc.my_plugin',
  elements: [
    { id: 'cc.my_plugin.save_button', role: 'button', label_i18n: {...} },
    { id: 'cc.my_plugin.cancel_button', role: 'button', label_i18n: {...} }
  ]
});
```

**After (v2.0 hierarchical)**:
```javascript
var ccScope = NAC.scope({ slug: 'cc' });
var pluginScope = ccScope.scope({ slug: 'my_plugin' });
pluginScope.register({
  slug: 'save_button', role: 'button', label_i18n: {...},
  element: document.getElementById('save')
});
pluginScope.register({
  slug: 'cancel_button', role: 'button', label_i18n: {...},
  element: document.getElementById('cancel')
});
```

The flat form continues to work; the hierarchical form is preferred
for new code and enables `describe_v2().v2_intermediate_scopes`
breadcrumb output.

### 10.2 Auto-registration on dynamic UI

**Before (v1.9 manual)**:
```javascript
function onCardAdded(cardEl) {
  cardEl.setAttribute('data-nac-id', 'hub.cards.' + cardEl.id);
  NAC.register({
    plugin_slug: 'hub',
    elements: [{ id: 'hub.cards.' + cardEl.id, role: 'button', ... }]
  });
}

var observer = new MutationObserver(function (muts) {
  muts.forEach(function (m) {
    m.addedNodes.forEach(function (n) {
      if (n.classList.contains('card')) onCardAdded(n);
    });
  });
});
observer.observe(cardsRoot, { childList: true });
```

**After (v2.0 autoRegister)**:
```html
<!-- Each card has data-nac-action declared in the markup -->
<button class="card" data-nac-action="open-card-7" data-i18n-key="card.open">Open</button>
```
```javascript
NAC.autoRegister.watch(cardsRoot);
/* Done. Every card with data-nac-action auto-registers. */
```

### 10.3 Third-party widget adoption

**Before (v1.9)**: manual wrapping or no NAC support at all.

**After (v2.0)**:
```javascript
NAC.adopt({
  selector: '.stripe-payment-button',
  parent: 'shell.checkout',
  derive: {
    slug:   function (el) { return el.dataset.action; },
    role:   function () { return 'button'; },
    intent: function () { return 'commit'; },
    label_i18n: function (el) {
      return { es: el.getAttribute('aria-label'), en: el.getAttribute('aria-label') };
    }
  },
  containerEl: document.querySelector('.checkout-area'), /* rc4: scope observer */
  observe: true
});
```

### 10.4 Virtualised list

**Before (v1.9)**: agent only sees the 50 rows in DOM.

**After (v2.0)**:
```javascript
NAC.declareVirtual({
  slug_pattern: 'pipeline.runs.row.{i}',
  count: 10000,
  resolver: function (i) {
    return {
      slug: 'pipeline.runs.row.' + i,
      role: 'row',
      label_i18n: rowLabelsCatalog[i],
      element: null /* lazy-rendered, agent operates without DOM */
    };
  }
});
```

The agent calls `NAC.find('pipeline.runs.row.7392')` and gets the
manifest entry on demand.

---

## 11. Cost estimate (rc4 honest revision)

These numbers reflect the rc4 revisions per Round 3 reviewer
feedback (Mistral T9-F1, DeepSeek T9-F1, Claude T9-F1). They are
**not marketing claims**; they are planning estimates pending real
metrics from the Yujin migration phase 5.5.

### 11.1 Greenfield app, 50 components

| Item | Estimate |
|---|---|
| NAC structural work (register, scope, validate) | ~10h dev |
| i18n catalog filling (10 locales, AI-assisted) | ~50h dev |
| Tooling integration (babel/vue/svelte plugin) | ~2h dev |
| Tests + smoke | ~3h dev |
| **Subtotal** | **~65h dev** |
| First-adoption multiplier (1.5x for 1st-2nd projects) | x1.5-2 |
| **Total realistic first-time greenfield** | **~100h calendar** |

### 11.2 Brownfield app, Yujin scale (~50 components, partial baseline)

| Item | Estimate |
|---|---|
| Codemod auto-coverage (35-60% range, median ~45%) | ~4h dev (run + review) |
| Manual cleanup (the remaining ~55%) | ~20h dev |
| i18n catalog gap fill (10-locale completion) | ~17h dev |
| Tests + smoke | ~5h dev |
| **Subtotal** | **~46h dev** |
| First-adoption multiplier (1.5x-2x) | x1.5-2 |
| **Total realistic first-time brownfield** | **~70-92h calendar** |

### 11.3 Brownfield with minimal layer (Path C)

| Item | Estimate |
|---|---|
| Setup block (~80 lines + script tag) | ~3h dev |
| Test that v1.9 plugins still work | ~1h dev |
| **Total** | **~4h calendar** |

### 11.4 Boilerplate elimination (revised rc4)

The rc1 docs claimed "5200 lines eliminated for 200-component
app". rc4 revises this honestly to **~1000-1500 lines** based on
realistic per-component delta of 6-12 lines (was 30 in rc1
worst-case calculation). Final number to be confirmed by Yujin
migration phase 5.5.

---

## 12. Migration checklist

For an adopter at the end of migration:

- [ ] `nac-v2-extensions.js` loaded after `nac.js`
- [ ] `NAC.set_provenance_secret(secret)` called at boot (if any
      `source.type='agent'` events emitted at NAC-3)
- [ ] `NAC.setTenantPrefix(slug)` called if multi-tenant
- [ ] Scope tree built (or accepted from v1.9 flat -- both ok)
- [ ] `NAC.autoRegister.watch(container)` called on dynamic
      containers, OR explicit `data-nac-watch` attribute set
- [ ] `NAC.captureEphemeral(opts)` called if you have toasts
- [ ] i18n catalog covers 10 locales (or
      `NAC.setSupportedLocales(reducedList)` set)
- [ ] `NAC.validate_global_v2({i18n_strict: true})` runs in CI
      with severity tolerance configured
- [ ] At NAC-3: `bridgeIframe` calls have `nac_level: 3` or global
      `iframe_strict: 'error'` tolerance
- [ ] At NAC-3: `data-nac-action` present on interactive elements
      OR `set_validation_tolerance({autoderived_action: 'silent'})`
      set explicitly
- [ ] At NAC-3: agent-source event emitters call
      `NAC.sign_provenance()` (or use `NAC.invoke(slug)` which
      handles it)
- [ ] If using third-party widgets: adopt rules registered via
      `NAC.adopt()` OR `@nac-spec/rules-<vendor>` package loaded
- [ ] If using Web Components: `NAC.bridgeShadowRoot()` called
      on each open shadow root host
- [ ] If using virtualised lists: `NAC.declareVirtual()` for each
- [ ] Tests pass against rc4 (27/27 in reference test suite +
      your own assertions)
- [ ] Performance benchmarked on low-tier mobile target
- [ ] If RTL: `NAC.setAutoRTL(false)` set if your DOM mixes LTR
      content under RTL locale
- [ ] Long-running SPA: `NAC.gcIntermediateScopes(activePathSet)`
      called periodically
- [ ] `describe_v2()` returns the manifest your agent expects
- [ ] CI publishes `case-study-conformance.json` snapshot for
      audit visibility

---

## 13. FAQ

### Q: Do I have to migrate at all?

No. v1.9 is stable and supported. Migrate when you need a
specific v2.0 feature (hierarchy, auto-registration, third-party
adoption, virtualised lists, ephemeral capture, multi-tenant
prefix, HMAC mandatory at NAC-3). If none of these apply, stay
at v1.9.

### Q: Can I run v1.9 and v2.0 side-by-side?

Yes. `nac-v2-extensions.js` loads as an additive layer. You can
ship the extension on a feature flag and roll back by removing
the script tag.

### Q: What if my CI fails on new warnings?

Two paths:
1. Fill the gaps (preferred -- adopt the new findings as honest
   signal).
2. Set `NAC.set_validation_tolerance({i18n_strict: 'silent'})` (or
   the relevant tolerance) to silence specific findings.

### Q: My agent is now rejected at NAC-3 because I don't have a secret.

Call `NAC.set_provenance_secret('...')` at boot before any agent
event. If you operate at NAC-1 or NAC-2, no secret needed.

### Q: My third-party widget needs adopt rules. Where do I get them?

Spec repo seeds `@nac-spec/rules-stripe`, `-slack`, `-mapbox`.
Community is expected to maintain the long tail. If your widget is
not covered, write rules in-house following the pattern in
`example-v20-primitives-showcase.php` section 3 + commit them
back to the rules repo as a community contribution.

### Q: My app uses `setTimeout(fn)` after a click and emits user events. Now they get rejected.

The 16ms freshness window in rc3+ is the correct behaviour
security-wise. Either:
- Move the user event emission synchronously into the click handler.
- Declare the work as `source.type='script'` (honest about
  scripted-after-click).
- Tune the freshness window with
  `set_perf_tolerance({gesture_fresh_ms: 100})` (returns rc2
  behaviour at the cost of weaker security).

### Q: Is the cost estimate (10h greenfield, 36h brownfield) realistic?

The numbers are pre-Yujin-migration estimates. The real numbers
land in `case-studies/yujin.md` after phase 5.5 of the v2.0
roadmap. Treat the current estimates as planning anchors with
1.5x-2x multiplier for first-time adopters.

### Q: What if I'm using Storybook / Cypress / Datadog and they're not in the v2.0 tooling list?

They are deferred to v2.0.x patch series. Storybook addon is
time-boxed to v2.0.1 (~2 weeks post-tag). Cypress + Datadog +
OpenTelemetry are community packages, target v2.0.x. Until then,
you can use v2.0 without them; the gap is in author-time
ergonomics, not runtime correctness.

### Q: Will v3.0 break my v2.0 plugins?

The author commits to the strict-superset invariant from v1.0
forward. v3.0 will preserve every public API of v2.0 at NAC-1 and
NAC-2. v3.0 might add new tightening at NAC-3 (analogous to v2.0
adding 4 changes vs v1.9). Those will be honestly documented in
v3.0's migration guide.

### Q: Does v2.0 work on IE11 / Safari 11 / mobile WebView contexts?

- IE11: NO. v2.0 uses WeakSet, Promise, MutationObserver with
  options, requestIdleCallback (with setTimeout fallback), and
  composedPath(). Some of these polyfill but the runtime targets
  evergreen browsers (last 2 versions of Chrome / Firefox /
  Safari / Edge).
- Safari 11: composedPath() ships in Safari 10+; should work but
  not officially tested.
- Mobile WebView: see `NAC.setMobileWebViewAttestation(fn)` hook
  documented in spec sec 15.10. Cordova / Capacitor / RN WebView /
  Flutter / Tauri / Electron each have specific behaviour
  documented.

### Q: How do I evaluate v2.0 before committing?

1. Open `https://yujin.app/nac-spec/example.php` (v1.9 stable).
2. Open `https://yujin.app/nac-spec/example-v20-primitives-showcase.php` (didactic).
3. Open `https://yujin.app/nac-spec/example-v20-full.php` (brownfield migration).
4. Click through all three. Compare. Read `README_DEMOS.md`.
5. Read `RFC_v2.0.0.md` if you want the formal contract.
6. Read `docs/PEER_REVIEW.md` if you want to see what reviewers
   flagged + how the author responded.

### Q: How do I report a v2.0 bug?

`https://github.com/pkuschnirof/nac-spec/issues`. Tag with
`v2.0` label. Include reproduction steps + Round 3 finding
codes (T1-F1, T4-F2.1, etc.) if your issue tracks back to a
known finding.

---

## 14. Help + community

- GitHub issues: `https://github.com/pkuschnirof/nac-spec/issues`
- Spec author email: pablo.kuschnirof@gmail.com
- Stack Overflow tag: `nac-spec` (community-driven; tag in
  questions about adoption pattern)
- Discord: TBD post-tag

---

## 15. Reviewer-specific notes

### 15.1 Round 3 evidence pool

Four reviewers completed the rc1/rc2/rc3 interim arbiter passes:

| Reviewer | Verdict on rc3 | Findings closed in rc4 |
|---|---|---|
| Grok 4 | proceed-to-round-4 | 1 medium (gesture 16ms) |
| Mistral Le Chat | iterate-rc4-first | 4 valid findings (1 false positive) -- ALL closed in rc4 |
| DeepSeek-V3 (impersonating Claude) | proceed-to-round-4 | 0 new blockers |
| Claude (Anthropic) | insufficient-evidence (CDN cache stale) | EvidenciaInline_v2.0_rc3 produced for re-eval |

Verbatim reviews retained at:
- `docs/peer-review-round3-grok.txt`
- `docs/peer-review-round3-mistral.txt`
- `docs/peer-review-round3-deepseek.txt`
- `docs/peer-review-round3-claude.txt`
- `docs/peer-review-round3-arbiter-mistral.txt`
- `docs/peer-review-round3-arbiter-grok.txt`
- `docs/peer-review-round3-arbiter-deepseek.txt`
- `docs/peer-review-round3-arbiter-claude.txt`

### 15.2 What Round 4 closing arbitration must demonstrate

Per Claude's T9-F2 in the rc3 interim pass, six concrete pass
criteria for Yujin case study + Round 4 closing:

1. Real perf metrics on rc4 budget rows (Snapdragon 6 Gen 1):
   describe() p50<50ms, p95<150ms; autoRegister p95<5ms;
   adopt p95<20ms; HMAC p95<10ms.
2. At least 1 cross-shadow-DOM widget bridged in production.
3. Sustained NAC-3 conformance for 4 new finding codes
   (user_gesture_path_mismatch, agent_attested_without_os_level,
   adopt_blocked, adopt_derive_slow).
4. Documented adopter time-to-first-action: median + p95.
5. At least 1 non-Spanish (RTL preferred) end-to-end.
6. Zero unrecovered HMAC verification failures across
   bridgeIframe handshake_ack + describe_result.

### 15.3 Open items at rc4 (deferred to Round 4 with Yujin data)

- T9-F1 yujin_case_study_unpopulated -- the case study TEMPLATE
  exists at `case-studies/yujin.md`; real metrics fill in phase
  5.5.
- T6-F1 deriveLeafSlug_position_in_parent_regression -- documented
  limitation; trade-off between hash collision avoidance and
  slug stability under reordering.
- T7-F2 _intermediateScopes growth -- bounded in realistic SPA
  cases; `gcIntermediateScopes` API for dynamic-spawn-and-discard
  scenarios.

### 15.4 What this guide does NOT cover

- L2 i18n runtime (NAC mutates DOM). Out of scope; spec stays at
  L1.5 (mutates accessibility metadata only).
- Independent runtime port (Python / Rust / Kotlin). Community-
  driven post-v2.0 tag.
- iOS / Android native NAC. Separate spec, v2.1+.
- Capability/version negotiation in manifest. Deferred to v2.1.

---

## 16. Document version

**This document**: NAC v1.9 -> v2.0 Migration Guide v1.0.
**Targets**: NAC v2.0.0-rc4.
**Last updated**: 2026-05-09.
**Authors**: Pablo Adrian Kuschniroff, Sumi.
**License**: MIT.

If v2.0 reaches GA tag without further iteration, this guide
remains valid as written. If iterations rc5+ land, this guide
will be updated and the rc4-specific numbers refreshed.

---

**End of migration guide.**
