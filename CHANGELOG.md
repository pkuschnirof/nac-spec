# Changelog

All notable changes to NAC (Native Accessibility Contract) are documented
in this file.

This project adheres to [Keep a Changelog 1.1](https://keepachangelog.com)
and uses [Semantic Versioning 2.0.0](https://semver.org).

Versioning conventions for the spec:

- **MAJOR**  -- breaking changes to the public API contract or to existing
  `data-nac-*` attribute semantics. Existing NAC-3 plugins MUST be
  re-audited.
- **MINOR**  -- new pillars, new roles, new attributes added without
  breaking existing plugins. Existing NAC-3 plugins remain valid.
- **PATCH**  -- clarifications, doc updates, reference-impl bug fixes,
  test additions, badge tweaks. No public-API change.

---

## [Unreleased]

Nothing yet.

## [2.0.0-rc2] - 2026-05-09

PATCH-style update on top of rc1. Closes the four concurrent
conditions raised by Round 3 reviewers Grok 4 and Mistral Le Chat
(both reviewers independently flagged the same issues). Conditions
flagged by only one reviewer (4 from Mistral) await a second
reviewer for arbitrage and stay open at rc2.

### Closed concurrent conditions

- **T4-F1 mobile_webview_attestation_gap** (Grok high + Mistral
  medium). Added `NAC.setMobileWebViewAttestation(fn)` runtime
  hook (sec 15.10). When registered, the function substitutes
  `Event.isTrusted` derivation per platform requirements
  (Capacitor, Cordova, RN WebView, Flutter, Tauri). Spec annex
  with platform-specific behaviour table added (non-normative).
  Implementation in `js/nac-v2-extensions.js`.

- **T5-F1 + T5-F2 i18n_strict default too aggressive** (Grok
  medium + Mistral high). Default NAC-3 i18n severity changed
  from `error` to `warn`. Hosts opt in to error severity via
  `NAC.set_validation_tolerance({i18n_strict: 'error'})`. Spec
  sec 15.12 + I18N_INTEGRATION_GUIDE.md sec 2.3 updated.

- **T6-F1 mutationobserver_throttle_too_low** (Grok medium +
  Mistral high). Default MutationObserver throttle bumped from
  50ms to 100ms for `autoRegister.watch` and `captureEphemeral`.
  Tunable per-page via new `NAC.set_perf_tolerance({
  mutation_throttle_ms: <n> })`. Spec sec 15.13 perf budget
  table updated.

- **T6-F2 describe_perf_budget_too_tight** (Mistral medium). Perf
  budget revised: describe() target 30ms -> 50ms, hard-fail
  100ms -> 150ms. adopt hard-fail 15ms -> 20ms. Numbers align
  with real Snapdragon 6 Gen 1 benchmarks Mistral cited.

- **T7-F1 missing_framework_support** (Grok high + Mistral high).
  Five new tooling skeletons added in `packages/`:
  - `@nac-spec/solid-plugin`
  - `@nac-spec/qwik-plugin`
  - `@nac-spec/lit-preprocessor`
  - `@nac-spec/playwright-fixture` (Mistral T7-F2)
  - `@nac-spec/telemetry` (interface for Sentry/Datadog/OTel,
    Mistral T7-F3)

  Roadmap phase 4 expanded to include them (~17-19 days wall-clock
  with 4 workers, was 14-16 in rc1).

  Cypress + Storybook + VSCode-LS + Sentry/Datadog/OTel adapters
  + i18n codemod deferred to v2.0.x patch series (sec 6.2 of
  roadmap).

- **T7-F2 missing_testing_integrations** (Mistral high).
  Playwright fixture skeleton added (`@nac-spec/playwright-
  fixture`). Cypress + Storybook deferred to v2.0.x.

- **T7-F3 missing_telemetry_export** (Mistral medium). Base
  interface skeleton added (`@nac-spec/telemetry`). Sentry +
  Datadog + OpenTelemetry adapters land as separate community
  packages in v2.0.x.

### Open conditions awaiting second reviewer (NOT closed at rc2)

These were raised by a single reviewer; held open until a second
reviewer concurs or disputes:

- **T2-F1 missing_second_tightening_change** (Mistral high) --
  RFC claims one NAC-3 tightening change but i18n_strict was a
  second. Easy doc fix; held for arbitrage to confirm framing.
- **T2-F2 provenance_block_field_addition** (Mistral medium) --
  warn that v1.9 clients with strict shape validation may break.
- **T8-F1 convergence_timeline_overly_optimistic** (Mistral high
  vs Grok "defensible") -- ACTIVE DISPUTE between reviewers.
  Held for third reviewer to break tie.
- **T9-F1 boilerplate_reduction_overstated** (Mistral medium) --
  the "5200 lines" claim revision held until Yujin migration
  produces real numbers (phase 5.5).

### Runtime API additions

- `NAC.setMobileWebViewAttestation(fn)` -- mobile WebView
  attestation hook.
- `NAC.set_perf_tolerance(opts)` -- runtime perf tunables.
- `NAC.get_perf_tolerance()` -- read current values.
- `NAC.set_validation_tolerance(opts)` -- runtime validation
  severity tunables (i18n_strict: warn | error | silent).
- `NAC.get_validation_tolerance()` -- read current values.

### Test suite

22/22 unit tests pass (was 18/18 in rc1; 4 new tests added for
the rc2 APIs).

### Reviewer attribution

- Grok-4-2026 (first responder, 2026-05-09):
  T4-F1, T5-F1, T6-F1, T7-F1.
- Le Chat (Mistral AI, 2026-05-09):
  T4-F1, T4-F2, T5-F2, T6-F1, T6-F2, T7-F1, T7-F2, T7-F3.

Verbatim reviews retained at:
- `docs/peer-review-round3-grok.txt`
- `docs/peer-review-round3-mistral.txt`

### Migration impact rc1 -> rc2

- **Plugin code**: NO change required.
- **Tests against rc1**: any test asserting i18n_missing_locale in
  `findings.errors` array MUST update to either check
  `findings.warnings` OR call
  `set_validation_tolerance({i18n_strict: 'error'})` first.
- **Perf benchmarks**: budgets eased. No previously-failing
  measurement should newly fail under rc2 numbers.
- **WebView hosts**: SHOULD register
  `setMobileWebViewAttestation` if running in
  Cordova/Capacitor/RN/Flutter/Ionic context.

## [2.0.0-rc1] - 2026-05-09

MAJOR release candidate. v2.0 is a strict superset of v1.9.0.
8 new composition primitives + HMAC mandatory at NAC-3 +
isTrusted attestation closing user/script impersonation +
i18n contract layer (L1: format + resolver + lint, no DOM
mutation) + tooling ecosystem skeletons.

This is the **release candidate** pending Round 3 peer review.
Tag `v2.0.0` only after arbiter sign-off.

### Spec additions (sec 15.x in `spec/NAC-v2.0.md`)

- **15.1** Hierarchical scope constructor `NAC.scope(spec)` -- closes
  the flat-naming limitation flagged for hierarchical UIs (shell
  -> hub -> card -> modal). Max depth 6, separator `.` fixed,
  re-registration idempotent under same-element.
- **15.2** Auto-registration `NAC.autoRegister(el, opts)` +
  `NAC.autoRegister.watch(container, opts)` -- closes the
  dynamic-UI gap. MutationObserver + ancestor scope walk +
  throttle 50ms. i18n_strict default at NAC-3.
- **15.3** Adopt third-party non-compliant `NAC.adopt(rule)` --
  closes the largest adopter-side gap (~30-60% of typical
  production UIs are third-party). Selector + derive functions +
  `_autoderived` flag for mono-locale fallback.
- **15.4** Bridge Shadow DOM `NAC.bridgeShadowRoot(host)` -- walks
  open shadow roots up to 6 levels nested. Closed shadow roots
  emit `nac:shadow_blocked`.
- **15.5** Bridge same-vendor iframes `NAC.bridgeIframe(iframeEl, opts)`
  -- "NAC iframe channel v1" wire protocol over postMessage with
  trusted_origins allowlist + signature_chain for cross-origin
  agent events. Closes the cross-origin iframe gap DeepSeek
  deferred from v1.8.
- **15.6** Declare virtual manifests `NAC.declareVirtual(spec)` --
  virtualized lists where 50 of 10000 rows are in DOM. Resolver
  on-demand keeps the agent operable on row 9472 without
  materialising it.
- **15.7** Capture ephemeral UI `NAC.captureEphemeral(opts)` --
  ring buffer of toasts / dropdowns / drag previews so the agent
  can read "what was that 3-second toast?" after it disappears.
- **15.8** Multi-tenant prefix `NAC.setTenantPrefix(slug)` -- SaaS
  platform deployments where the same plugin slug appears in N
  tenants. Cross-tenant lint awareness.
- **15.9** HMAC mandatory at NAC-3 -- closes the v1.9 closing
  arbiter's critical-path recommendation. Agent-source events
  MUST sign; validator emits error severity at NAC-3 when
  unsigned. `NAC.set_provenance_secret(s)` accepts string |
  string[] for rotation overlap.
- **15.10** isTrusted attestation -- closes the user/script
  impersonation paths the v1.9.1 HMAC patch alone left open.
  `source.user_gesture_attested` field auto-derived from DOM
  `Event.isTrusted`. Three-way enforcement matrix at NAC-3:
  user must attest, agent must sign, script must declare false.
  Forbidden combinations explicit (`user_gesture_unattested`,
  `script_claims_user_gesture`).
- **15.11** i18n contract L1 -- canonical 10-locale catalog format
  + `NAC.t(key, opts)` resolver + `NAC.locale(code)` getter/setter
  + `NAC.setSupportedLocales(arr)` extender + `NAC.setRTLLocales(arr)`.
  Validator findings: `i18n_missing_locale`, `i18n_invalid_locale`,
  `i18n_string_empty`, `i18n_orphan_key`, `i18n_unused_locale`,
  `i18n_mono_locale_autoderived`. NAC does NOT mutate DOM;
  existing i18n libraries (react-intl, vue-i18n, i18next) keep
  being the runtime. See `docs/I18N_INTEGRATION_GUIDE.md` for the
  full integration playbook.
- **15.12** Conformance levels reaffirmed (NAC-1/2/3).
- **15.13** Performance budget at NAC-3 with hard fail thresholds
  on low-tier mobile 2026.
- **15.14** Backward compatibility -- strict superset proof.

### Runtime (`js/nac-v2-extensions.js` -- ~620 lines)

- New extension file loaded after `js/nac.js` v1.9.0. Attaches v2
  primitives onto `window.NAC` without touching the v1.9 surface.
- Implements all 8 primitives + HMAC + isTrusted + i18n contract.
- 18 unit tests pass (`tests/nac-v2-extensions.spec.js`).
- ASCII-only.

### Reference demo

- New file `yujin.app/nac-spec/example-v20.php` -- showcases all
  v2.0 primitives + 10-locale switcher + HMAC sign demo +
  isTrusted distinction in real time.
- The v1.9 demo `example.php` stays alive for **side-by-side
  comparison**. Reviewers can navigate both.

### Tooling ecosystem (`packages/`)

Skeletons for 9 npm-publishable packages:
- `@nac-spec/babel-plugin-react`
- `@nac-spec/vue-plugin`
- `@nac-spec/svelte-preprocessor`
- `@nac-spec/devtools` (Chrome / Firefox extension)
- `@nac-spec/codemod` (CLI for brownfield migration)
- `@nac-spec/cookbook` (30 patterns; index defined, content phase 4)
- `@nac-spec/rules-stripe`
- `@nac-spec/rules-slack`
- `@nac-spec/rules-mapbox`

Skeletons define the API surface; full implementation work mapped
in `docs/NAC_v20_ROADMAP_ACTIONABLE.md` phase 4.

### Documentation

- `RFC_v2.0.0.md` (~750 lines) -- formal RFC.
- `docs/NAC_v20_SCOPE_AND_ECOSYSTEM.md` (~700 lines) -- input for
  Round 3 peer review.
- `docs/NAC_v20_ROADMAP_ACTIONABLE.md` (~450 lines) -- operational
  plan with 7 phases + Yujin case study + demo refactor + Pablo
  decision gates.
- `docs/I18N_INTEGRATION_GUIDE.md` -- authoritative document on
  adding new locales (Pablo's explicit ask).
- `docs/MIGRATOR_TOOL_ANALYSIS.md` -- commercial feasibility
  analysis: 4 tiers, $200k-$800k Y1 ARR projection.
- `case-studies/yujin.md` -- TEMPLATE for population during
  actual migration.

### Migration impact (v1.9.0 -> v2.0.0-rc1)

- **Plugin code**: NO change required for NAC-1 + NAC-2.
- **NAC-3 audit pipelines**: now reject unsigned agent events +
  user-claiming-untrusted events + script-claiming-trusted
  events. This is the intended behaviour change.
- **AI agents and tools** (Computer Use, browser-use, Talon, voice
  control): must sign agent events OR declare `source.type='script'`
  for testing tools.
- **i18n**: existing 10-locale catalogs already in compliant
  format pass `i18n_strict` lint at NAC-3 unchanged. Catalogs
  with fewer locales emit findings until completed.

### Reviewer attribution

- HMAC mandatory at NAC-3: closing v1.9 arbiter (Claude, 2026-05-08).
- isTrusted attestation closing user impersonation: Pablo Adrian
  Kuschniroff (2026-05-09).
- 8 composition primitives: scope doc collaborative analysis
  (Pablo + Sumi, 2026-05-09).
- L1 i18n contract: collaborative (Pablo asked the question,
  Sumi recommended L1 over L2; Pablo approved).
- Convergence assumption + tooling list: collaborative.

### Known limits in v2.0-rc1

- Bridge iframe wire protocol may need its own RFC sub-review
  (Sumi confidence: low).
- `adopt` selector perf on DOM-heavy pages requires real
  benchmark (pending phase 5.5 Yujin migration).
- Tooling skeletons are not production-ready; full impl in phase 4.
- No independent runtime port yet (Python/Rust/Kotlin) -- v2.1+.
- Closed Shadow DOM penetration impossible by browser security
  (out of scope).

### Pablo decision gates remaining before tag

1. Round 3 peer review pass on RFC + spec + scope + i18n guide.
2. Phase 3 + 4 implementation completion.
3. Phase 4.5 demo refactor + cross-browser smoke.
4. Phase 5 conformance + perf benchmarks pass.
5. Phase 5.5 Yujin migration case study published.
6. Phase 6 closing peer review arbiter sign-off.
7. `git tag v2.0.0` on the chosen commit.

---

## [1.9.0] - 2026-05-08

MINOR release. The v2.0 patch round closing every gap the
five-AI panel of v1.8 (Microsoft Copilot, DeepSeek, Mistral Le
Chat, Grok, ChatGPT) flagged as `should land before 2.0` plus
the broader patch surface (test harness, event replay,
performance budget, drag-type registry, action confirmation
event family, action undoable flag). Strict superset of v1.8.0
-- every v1.8 plugin remains valid.

### Spec sec 6.2

- **6.2.27** Performance budget normative table: validate <=
  50ms for 1000 elements, describe <= 30ms, _emit overhead <=
  0.5ms per event, etc. DeepSeek v1.8 finding.
- **6.2.32 NEW** Action confirmation event family
  (`nac:action:confirm:requested` / `granted` / `denied`)
  promotes confirmation from advisory hint to wire-level
  contract. NAC-3 conformant pages MUST route any action with
  `requires_confirmation` / `irreversible` / `data_loss` hint
  through `NAC.confirm_action()`. Mistral + ChatGPT + Grok
  v1.8 finding.
- **6.2.33 NEW** Action undoable flag in manifest. Surfaced on
  `describe()`/`find()` as `undoable`. AI agents can downgrade
  interposition pressure on recoverable actions; voice tools
  can omit confirm step.

### Spec sec 13

- **13.4.1 NEW** Drag-type registry: 24 canonical type patterns
  (text/*, image/*, application/json, card/*, row/*, file/*,
  tag, note, event, chart-series, tree-node). Custom types still
  work; validator emits `drag_type_unknown` warning so cross-app
  interop is preserved. Mistral v1.8 finding.
- **13.10 NEW** Test harness utilities normative:
  `NAC.assert_event_fired(eventType, opts)`,
  `NAC.assert_event_count(eventType, n, opts)`,
  `NAC.perf_probe(opts)` for the perf budget check. DeepSeek
  v1.8 finding.
- **13.11 NEW** Event replay buffer pattern (informative).
  `window.__NAC_PENDING__` array, `NAC.replay_pending(buffer)`
  helper, runtime auto-replays at install. Microsoft Copilot
  v1.8 finding.

### Spec

- **Sec 3.1** `data-nac-skip-reason` REQUIRED when
  `data-nac-validate="skip"` is set. Format:
  `<category>[;remediate-by=YYYY-MM-DD][;tracker=<id>]`. Categories:
  `third_party_widget`, `legacy_unmodifiable`, `wip_remediation`,
  `closed_shadow_root`, `experimental`. Closes the brownfield
  footgun risk Mistral / Copilot / DeepSeek flagged in v1.8.
- **Sec 3.1** ARIA bridge for `data-nac-a11y-hint`. The runtime
  mounts one hidden `aria-live="polite"` region per page and
  appends per-element hint text via `aria-describedby`. Screen
  readers consume hints today, without waiting for vendor
  support. Mistral v1.8 finding.
- **Sec 3.1** NEW `data-nac-braille-label` attribute for
  refreshable braille displays. Surfaced on
  `NAC.describe()`/`find()` as `braille_label`. DeepSeek v1.8
  finding (deaf-blind population was under-served).
- **Sec 6.2.27** Self-test enforces ProvenanceBlock presence.
  `validate_event_conformance` now fails when a captured event
  detail lacks `source.type` set to a valid value
  (`'user' | 'agent' | 'script'`). `check_canonical_shape` does
  the same. Mistral + Copilot v1.8 finding.
- **Sec 6.2.30** Reason taxonomy on `nac:command:rejected`
  extended with `aria_busy`, `inert`, `readonly`.
- **Sec 7.3.2** Drift tolerance window: validator defers
  `aria_nac_state_mismatch` evaluation by 200 ms (configurable)
  so async hydration on React 18 / Vue 3 / Svelte 5 does not
  trigger false-positive failures. DeepSeek v1.8 finding.
- **Sec 7.3.3** NEW: normative ARIA-to-NAC preflight mapping
  table. `aria-disabled`, `aria-busy`, `aria-hidden`,
  `aria-readonly`, `inert` reject before invocation with the
  matching reason on `nac:command:rejected`. Copilot v1.8
  finding.
- **Sec 7.3.4** NEW: worked ARIA + NAC coexistence examples for
  combobox, modal dialog, virtualized datagrid, accordion, tabs.

### Runtime (`js/nac.js`)

- Bumped to `1.9.0`; `spec_version` to `1.9`.
- `_ariaPreflight(el, kind)` walks ancestors for `inert` /
  `aria-disabled`, checks the target itself for `aria-busy` /
  `aria-readonly`. `click()` and `fill()` invoke it before the
  host handler runs and route rejections through
  `_emitCommandRejected`.
- `_dragTypesCompatible` now case-insensitive + whitespace-trimmed
  (DeepSeek v1.8 finding).
- A11y hint ARIA bridge: `_ensureHintRegion` mounts the hidden
  live region; `_bridgeOneA11yHint` appends per-element hint
  text + `aria-describedby`; `_installA11yHintBridge` runs once
  at install + observes mutations.
- `_localizeHintTag` with English defaults +
  `NAC.set_a11y_hint_localizer(fn)` hook.
- `_serializeElement` (`describe()` / `find()` output) gains
  `braille_label`.
- `check_canonical_shape` requires `source.type` to be one of
  `'user'`, `'agent'`, `'script'`.
- `validate()` emits `skip_without_reason` (error at NAC-3) and
  `skip_remediation_overdue` (warn) findings.
- New public API: `NAC.set_a11y_hint_localizer(fn)`.

### Docs

- `docs/ROADMAP.md` (NEW) -- public roadmap with three horizons
  plus a Yujin Framework section covering scope, two-license
  model (purchased bundles vs tenant-developed catalogues),
  legal framework (MSA + deslinde de responsabilidades), and
  staggered release coordination with NAC v2.0.
- `docs/AUTHORING_PATTERNS.md` (NEW) -- worked patterns for ARIA
  + NAC coexistence, skip-reason enforcement (right way / wrong
  way / audit-friendly format), hint escalation semantics per
  consumer type (voice control / screen readers / AI agents /
  RPA bots), localisation hook, custom hints.
- README, AI_INSTRUCTIONS, MANUAL, API_REFERENCE, IMPACT_TESTING
  bumped from v1.8.0 -> v1.9.0 with new "What v1.9.0 adds"
  sections.

### Reviewer attribution

- skip-reason requirement: Mistral, Microsoft Copilot, DeepSeek.
- ARIA bridge for a11y_hint: Mistral.
- braille label: DeepSeek (underserved population).
- ProvenanceBlock conformance enforcement: Mistral, Microsoft
  Copilot.
- ARIA preflight + mapping table: Microsoft Copilot, DeepSeek.
- Drift tolerance window: DeepSeek.
- Drag-type case-insensitive: DeepSeek.

## [1.8.0] - 2026-05-07

MINOR release. Lands every action item from the four-AI peer
review of v1.7.0 (Microsoft Copilot, DeepSeek, Mistral Le Chat,
Grok). Strict superset of v1.7 -- every v1.7 plugin remains
valid; the new primitives are additive and opt-in.

### Spec

- **Sec 6.2.1** Added `ProvenanceBlock` TypeScript interface.
  Every `nac:*` event detail now carries
  `source: { type: 'user' | 'agent' | 'script', id?, tool? }`.
  Default `{type:'script'}` when the runtime emits without
  context. Required at NAC-3. Closes the silent-failure gap
  reviewers identified for users delegating UI work to AI
  assistants.
- **Sec 6.2.1** Added precedence rule: canonical fields win
  over legacy aliases when both are present.
- **Sec 6.2.1** Added emission order rule: canonical event
  fires synchronously BEFORE its legacy alias, same task tick.
- **Sec 6.2.27** Added `legacy_event_field` warning dedup
  requirement (per-session, by event_type+field). DeepSeek
  finding: a chatty page could fire 400+ identical warnings
  per single user action.
- **Sec 6.2.27** Promoted self-test to a normative NAC-3
  requirement -- the runtime MUST expose
  `validate_event_conformance` and CI gates SHOULD treat
  `fail > 0` as a hard error. Mistral action item.
- **Sec 6.2.27** Added `skip_subtree_contains_interactives`
  finding (severity `warn`) when a `data-nac-validate="skip"`
  region contains operable surface.
- **Sec 6.2.30 (NEW)** `nac:command:rejected` and
  `nac:command:failed` event families. Closes the case where
  an AI claims success based on event emission while the UI
  silently ignored the command.
- **Sec 6.2.31 (NEW)** Stable persistent IDs required for
  paginated/virtualized collections. Voice control + AI
  delegation collapse on virtualized 5000-row lists otherwise.
- **Sec 3.1 (NEW)** `data-nac-validate="skip"` declarative
  attribute (third-party widget escape hatch) +
  `data-nac-a11y-hint` declarative attribute (irreversible /
  requires_confirmation / dangerous / long_running / costly /
  external_side_effect / data_loss) so voice and screen-reader
  tooling can interpose confirmations BEFORE invocation.
- **Sec 13.4** Drag-drop type validation: `data-nac-drag-type`
  on source + `data-nac-drag-accept` (CSV or `*`) on target.
  Mismatch rejects with `NacError('drag_type_mismatch')` AND
  emits `nac:command:rejected`.
- **Sec 13.9 (NEW)** `NAC.emit_dual()`, `NAC.command_rejected()`,
  `NAC.command_failed()`, `NAC.check_canonical_shape()`,
  `NAC.validate_event_conformance()` interface declarations.
- **Sec 7.6 (NEW)** Public CSS custom properties for the focus
  pulse + section-visited highlight (`--nac-focus-pulse-*` and
  `--nac-section-visited-*`). `prefers-reduced-motion` respect
  is normative.

### Runtime (`js/nac.js`)

- Apply default `source: {type:'script'}` to every emitted
  event when caller did not set one.
- New helpers: `_validateSkipAncestor`, `_emitCommandRejected`,
  `_emitCommandFailed`, `_dragTypesCompatible`, `_legacyWarn`
  (deduplicated).
- `NAC.click()` now emits `nac:command:rejected` for
  not_found / disabled / hidden targets BEFORE throwing the
  matching `NacError`. Hidden detection uses
  `getBoundingClientRect` width+height + aria-hidden so
  position:fixed elements are not misclassified.
- `NAC.fill()` likewise emits rejected for not_found / disabled.
- `NAC.drag_drop()` emits rejected for not_found / role_mismatch
  / drag_type_mismatch and emits `nac:command:failed` from its
  catch path on unexpected throws.
- `NAC.validate()` skips elements inside `data-nac-validate=
  "skip"` subtrees and emits a `skip_subtree_contains_
  interactives` warning for every skip region with operable
  descendants.
- `_serializeElement` (`describe()` output) gains an `a11y_hint`
  array parsed from `data-nac-a11y-hint`.
- 5 new public APIs: `NAC.emit_dual`, `NAC.command_rejected`,
  `NAC.command_failed`, `NAC.check_canonical_shape`,
  `NAC.validate_event_conformance`.
- Bumped runtime to `1.8.0` and `spec_version` to `1.8`.

### Demo (`yujin.app/nac-spec/example.php`)

- Three new cards: **Skip-validate region** (third-party
  widget mock + a button that runs `validate()` and surfaces
  the skip-subtree warning); **Dangerous action with a11y
  hint** (delete button declares `irreversible|requires_
  confirmation|data_loss`; click reads `NAC.find().a11y_hint`
  and composes a confirm interposing on it); **Drag-type
  accept/reject** (3 typed sources + 2 zones; 'try mismatch'
  button drives `NAC.drag_drop` with a tag onto a files-only
  zone so the user sees `nac:command:rejected` fire).
- Conformance self-test extended: families list + canonical
  shapes table for `nac:command:rejected` and
  `nac:command:failed`; seq[] adds two new probes.
- CSS focus-pulse rule rewritten to consume the public custom
  properties from sec 7.6.

### Migration tooling

- New `tools/migrate-legacy-events.js` codemod -- a Node script
  that scans a project tree, finds event listener handlers
  reading legacy field names (`detail.nac_id` for action /
  field / tab events, etc.), and rewrites them to read the
  canonical field with a fallback (`detail.field_id ??
  detail.nac_id`). Idempotent; safe to run repeatedly.
- New `docs/MIGRATION_v1_to_v2.md` -- ahead-of-schedule guide
  for the v2.0 hard-break that drops legacy aliases. Lists
  every alias pair and recommends running the codemod once
  the v1.8 dual-emit dust settles.

### Reviewer attribution

- ProvenanceBlock + `nac:command:*`: Microsoft Copilot,
  DeepSeek (silent-failure / audit gap).
- `data-nac-validate="skip"` + escape hatch: DeepSeek,
  Microsoft Copilot, Mistral Le Chat (third-party widget
  brownfield abandonment).
- `data-nac-a11y-hint`: Mistral Le Chat (cognitive disability
  + irreversible action interposition).
- Drag type validation: DeepSeek (drag_drop did not validate
  operation kind).
- Migration codemod + dual-emit helper: Microsoft Copilot,
  DeepSeek (proposed hard break + codemod), Mistral Le Chat
  (proposed `NAC.emit_dual` helper).
- Self-test as runtime + NAC-3 normative: Mistral Le Chat.
- Stable persistent IDs for virtualized lists: Grok, DeepSeek.
- Focus pulse CSS custom properties: Mistral Le Chat, Grok.
- Legacy_event_field warning dedup: DeepSeek.

## [1.7.0] - 2026-05-07

MINOR release. Closes the v1.6 peer review's #1 abandonment
cause: "the validator is reactive, not preventive". Pre-v1.7,
the spec normativised event NAMES but left detail FIELD NAMES
under-specified, so consumer-side validators (wizards, test
runners, dashboards) had to write defensive regex matches
against ambiguous nac_id fields that meant different things in
different events. v1.7.0 fixes this with normative section 6.2
"Canonical event detail shapes": every nac:* event family now
has a TypeScript-style interface declaring its required +
optional fields, with each widget family getting its own
entity-specific id (action_id, field_id, tab_id, section_id,
column_id, source_id, target_id, list_id, item_id, ...).

Strict superset of v1.6.6. Legacy field names (e.g. nac_id in
action / field / tab events, column_nac_id, from_nac_id,
target_nac_id, etc) stay accepted by the runtime matcher with
a `legacy_event_field` validator finding (warn at NAC-2, warn
at NAC-3 with hard-error opt-in). v2.0 drops legacy entirely.

### Spec additions (normative)

- **Section 6.2 Canonical event detail shapes** (NEW). 27
  subsections covering ~45 events across every widget family
  declared in sec 6.1. Each subsection lists the canonical
  TypeScript interface plus migration note.

  Sec 6.2.28 ships the legacy -> canonical migration table:

  | Legacy field | Canonical |
  |---|---|
  | `nac_id` (in action / field / tab / accordion / section / table events) | per-family entity id |
  | `column_nac_id` | `column_id` |
  | `filter_nac_id` | `filter_id` |
  | `from_nac_id` | `source_id` |
  | `over_nac_id` | `target_id` |
  | `target_nac_id` (drag) | `target_id` |
  | `plugin_slug` | `plugin` |

- **Section 6.2.27 Validator behaviour at NAC-3**. New findings:
  `legacy_event_field` (warn / opt-in error),
  `missing_required_event_field` (error at NAC-3),
  `unknown_event_family` (warn).

### Runtime additions (js/nac.js v1.7.0)

- `_eventMatchesElement` now matches against ~30 canonical
  field-name aliases plus the v1.6.x legacy aliases, all
  treated as equally valid match targets.
- Reference runtime emitters (`drag_drop`, `plugin:reset`,
  etc) emit BOTH canonical and legacy fields for the
  transition window. Hosts SHOULD do the same.
- `global.NAC.version === '1.7.0'`,
  `global.NAC.spec_version === '1.7'`.

### Demo additions

The reference demo at yujin.app/nac-spec/example.php gained
11 new widget cards covering every event family in sec 6.2
that wasn't already exercised:

| Card | Plugin slug | Events covered |
|---|---|---|
| Stepper | stepper_demo | step:advanced, step:back |
| Tree | tree_demo | tree:expanded, :collapsed, :selected |
| Toast | toast_demo | toast:shown, toast:dismissed |
| Drawer | drawer_demo | drawer:opened, drawer:closed |
| Calendar | calendar_demo | calendar:view_changed, :event_selected |
| Chart | chart_demo | chart:data_loaded, :series_toggled |
| Map | map_demo | map:focused, map:marker_selected |
| Richtext | richtext_demo | richtext:formatted, :link_inserted |
| Breadcrumb | breadcrumb_demo | breadcrumb:navigated |
| Carousel | carousel_demo | carousel:advanced |
| Timeline | timeline_demo | timeline:loaded |

Each emits canonical detail shapes per sec 6.2.

### Self-test additions

New `selftest.event_conformance` button (next to "Run NAC
self-test") + global `window.runEventConformance()`. It:

1. Subscribes to every `nac:*` event family in sec 6.2.
2. Programmatically clicks the trigger of every showcase
   widget.
3. Captures every event emitted.
4. Verifies each canonical event has its required fields
   (per sec 6.2 interfaces) plus the universal `plugin` +
   `plugin_instance_id`.
5. Reports per family `[PASS] / [FAIL] / [MISS]` plus a
   total event count, written into `selftest.output`.

A v1.7-conformant page passes every PASS check; a partially
compliant page sees FAIL for the event families it ships but
emits with non-canonical shape; a page lacking a family sees
MISS for events it never fires.

## [1.6.6] - 2026-05-07

PATCH release. Two role-event-family additions for table
controls plus matcher detail-field aliases. Strict superset of
v1.6.5.

### sort-control + filter-control roles

Pre-v1.6.6: `NAC.click('table.demo.sort.city')` timed out at
5s because the sort-button has `data-nac-role="sort-control"`
and emits `nac:table:sort_changed` when clicked, while the
runtime listened only for the action-contract events.

`_CLICK_EVENT_FAMILY` now includes:

| role | success event |
|---|---|
| `sort-control` | `nac:table:sort_changed` |
| `filter-control` | `nac:table:filter_changed` |

Both events identify which control fired via `column_nac_id`
or `filter_nac_id` in `event.detail`, not the generic `nac_id`
field (which carries the table itself). The matcher's
nac_id-equality check is widened to accept these aliases.

### What's NOT in the runtime (companion changes ship in
the rpaforce repo demo)

Two related fixes that deal with model behaviour rather than
runtime contracts ship in the demo's backend + frontend
(`crm_desa/api/v1/yujin.php` + `yujin.app/nac-spec/js/example.js`):

- yjNacDemo drops `say` actions whose text duplicates the
  `message` field (Claude has a habit of restating the
  message as a say action which produced duplicate chat
  bubbles + duplicate TTS reads).
- The agent tour falls back to a DOM scan of `[data-nac-plugin]`
  roots when `NAC.system_map()` returns 0 views (demos that
  never call `NAC.register()` still have visible plugin
  cards; "Encontre 0 plugins" was misleading).

## [1.6.5] - 2026-05-07

PATCH release. Closes two regressions discovered by Pablo while
voice-testing v1.6.4. Strict superset of v1.6.4.

### Detached-option click match (runtime)

Pre-v1.6.5 behaviour: `NAC.click('cities.option.3')` STILL
timed out at 5s even with the v1.6.4 matcher, because the
host's click handler does `cityList.innerHTML = ''` BEFORE
emitting `nac:field:changed`. By the time the event fires the
clicked LI is detached; `el.closest('[data-nac-plugin]')`
returns null, the v1.6.4 plugin-scope check rejected the match.

Fix: `NAC.click()` now caches plugin slug, option `data-nac-value`
and option `textContent` BEFORE invoking `el.click()`. The
matcher accepts a `cachedCtx` 4th argument and uses it when the
DOM walk fails. Net effect: the matcher works for elements that
get detached during their own click handler.

### Section visibility on wide viewports (runtime)

Pre-v1.6.5 behaviour: `NAC.go_to_section()` called
`scrollIntoView()` and emitted `nac:section:reached`. On a wide
desktop where every section is already visible, smooth-scroll
is a no-op -- the agent tour produces zero visible feedback,
just chat narration. Pablo: "no hace foco ni desplaza, no se ve
efecto visible".

Fix: `go_to_section()` now also sets
`[data-nac-section-visited="1"]` on the target section for
1500ms so the host CSS can paint a visible highlight (red
border + glow ring) regardless of whether scroll moved the
viewport. The reference demo's example.css ships the matching
rule.

### Per-element focus pulse CSS (demo)

Companion change in the demo's `example.css` (not normative):
adds a CSS rule for `[data-nac-focus-pulse="1"]` so EVERY
NAC-driven element pulses red briefly when operated. Pre-v1.6.5
the focus-pulse attribute was set by `_focusElement` for 600ms
but had no styling, so only buttons that flipped to
`data-nac-state="active"` (e.g. `Run NAC self-test`) showed
visible feedback. Now click / fill / select / tab on any
element produces a consistent red flash.

## [1.6.4] - 2026-05-07

PATCH release. NAC.click resolves two real-world matcher gaps
that v1.6.3 left open. Both surfaced in voice-mode testing
where the dispatched action ran correctly but the runtime threw
timeout because no event matched the listener. Strict superset
of v1.6.3.

### Combobox option click

Pre-v1.6.4 behaviour: `NAC.click('cities.option.3')` timed out
at 5s even though the option was visibly selected and the
field's value updated. Diagnosis: the host emits
`nac:field:changed` on the parent field's nac_id (e.g.
`cities.search`), not the option's. The clicked option lives
in a sibling `<ul>` outside the field, so `el.closest()` and
`fieldHost.contains()` both miss; the matcher rejected the
event as belonging to a different field.

`_eventMatchesElement` now accepts the match for combobox
options when:

1. Clicked element has `data-nac-role="option"`.
2. Option and the field that fired share the same
   `data-nac-plugin` scope.
3. Option's `data-nac-value` (or trimmed `textContent`) equals
   `event.detail.new_value`.

The match is plugin-scoped so unrelated fields cannot
accidentally resolve a click on an option in another widget.

### Toggle-class field click (checkbox / radio / toggle / switch)

Pre-v1.6.4 behaviour: `NAC.click('field.spread')` (a checkbox)
timed out because the host wired only a native `change` handler
and emitted no NAC event; the role-aware listener for
`nac:action:succeeded` never resolved.

The runtime now synthesises `nac:field:changed` itself after
`el.click()` when:

- Element role is `field`.
- `data-nac-field-type` is `checkbox`, `radio`, `toggle`, or
  `switch`.
- The host did NOT itself emit `nac:field:changed` within
  ~32ms (a brief listener detects this and skips the synthesis
  to avoid double-emit on well-behaved hosts).

The synthesised event carries the new boolean / value plus a
`synthesised: true` marker so consumers that care can
distinguish runtime-emitted from host-emitted signals.

`field` is also added to `_CLICK_EVENT_FAMILY` so the matcher
listens for `nac:field:changed` natively for this role.

### Net effect

After v1.6.4 deploys, the user-reported timeouts:
- `cities.option.3: timeout` -> resolved on the
  nac:field:changed event from the cities.search field.
- `field.spread: timeout` -> resolved on the synthesised event.

No host-side change required; both fixes live entirely in the
runtime.

## [1.6.3] - 2026-05-07

PATCH release. Two fixes shipped together because they were
raised in the same user-testing session of v1.6.2. Strict
superset of v1.6.2.

### Runtime: NAC.click is role-aware

User-reported bug 2026-05-07: agent picked Buenos Aires from
the cities combobox correctly, but NAC.click('cities.option.4')
timed out with "did not emit nac:action:succeeded" even though
the field changed. Diagnosis: `cities.option.*` has
`data-nac-role="option"` and emits `nac:field:changed`;
NAC.click only listened for `nac:action:succeeded` /
`nac:action:failed`. Same pattern affects every non-action role
with click semantics (tab, breadcrumb-item, accordion-toggle,
step, pagination-item, confirm-button).

`js/nac.js` v1.6.3 makes `NAC.click` consult a role-event-family
map and listen for the appropriate success / failure events:

| role | success | failure |
|---|---|---|
| `action` (default) | `nac:action:succeeded` | `nac:action:failed` |
| `option` | `nac:field:changed` | -- |
| `tab` | `nac:tab:activated` | -- |
| `breadcrumb-item` | `nac:breadcrumb:navigated` | -- |
| `accordion-toggle` | `nac:accordion:expanded` | `nac:accordion:collapsed` |
| `step` | `nac:step:advanced` | -- |
| `pagination-item` | `nac:table:page_changed` | -- |
| `confirm-button` | `nac:confirm:resolved` | `nac:confirm:cancelled` |

For non-action roles the runtime ALSO listens for the action-
contract events as a safety net so a host that emits both
contracts on the same element still works. Unknown / missing
`data-nac-role` keeps the action default for back-compat. Event
filtering walks `event.detail.nac_id`, `target_nac_id`,
`from_nac_id`, `tab_id`, `section_id`, `step_id`, `id`,
`breadcrumb_id`, plus `event.target` containment, so a
background event on an unrelated element does not resolve the
click prematurely.

### Demo backend: tier rotation on parse failure

User-reported bug 2026-05-07 (related): chat occasionally
shows "No pude entender la respuesta del modelo. Probemos de
nuevo." after a single attempt. User instruction verbatim: "No
quiero el matcher local, hay que reintentar el comando contra
la cadena de fallback antes de devolver un error."

`crm_desa/api/v1/yujin.php yjNacDemo` now walks the AiClient
chain explicitly when a tier returns ok=true with unparseable
content. Each next tier sees a stricter "JSON ONLY, exact shape"
reminder appended to the system prompt. Only when EVERY real
tier (claude, deepseek, groq -- canned excluded) fails does the
handler return `parse_degraded: true` with a localised error
message ("I could not structure a response after trying every
provider. Please rephrase and try again."). The local-matcher
fallback that v1.6.2 used has been removed per user request --
the chain rotation IS the retry policy, and the user accepts a
clean error after exhausting the chain.

`AiClient::callTier($tier, $payload, ...)` is the new public
single-tier dispatcher used by yjNacDemo to bypass the chain
logic. The standard `AiClient::call` still handles tier
rotation on TIER failures (network, http 5xx); the new
`callTier` lets callers implement content-aware rotation on
top.

### Demo frontend

- `dispatchAgenticAction` no longer routes `parse_degraded` to
  `interpret(prompt)` (the local matcher); it just shows the
  localised `badge_parse_degraded` message in 10 locales.
- New i18n key `badge_parse_degraded` with full 10-locale
  coverage (es en pt fr it de ja zh hi ar).
- Cache bump v27 -> v28.

## [1.6.2] - 2026-05-07

PATCH release. Implements `NAC.drag_drop` (spec sec 13.4),
which had been declared in the spec since v1.1 but never landed
in the runtime. Discovered same-day by user-testing the v1.6.1
demo: an agent asked to "drag Alpha to the right list" timed
out because the runtime had no programmatic way to invoke a
cross-list drag. The agent fell back to `NAC.click` on the
draggable, which had `data-nac-role="draggable"` (not
`"action"`), so no `nac:action:succeeded` event ever fired and
the awaitable-write contract timed out at 5s. Symptom for the
user: bot says "Voy a arrastrar Alpha", then two timeout
errors. Strict superset of v1.6.1; every v1.6.1 plugin remains
valid.

### Runtime additions

- **`NAC.drag_drop(source_nac_id, target_nac_id, opts?)` (NEW)**.
  Signature matches what spec sec 13.4 declared in v1.1:
  - `source_nac_id` MUST resolve to an element with
    `data-nac-role="draggable"`.
  - `target_nac_id` MUST resolve to an element with
    `data-nac-role="drop-target"`.
  - `opts.to_index` (optional) for ordered drop-targets.
  - `opts.value` (optional) passed through to
    `nac:drag:dropped`.
  - Returns `Promise<{ok, source, target}>` or rejects with
    `NacError('not_found' | 'role_mismatch' | 'invalid')`.
  - Honors v1.4.1 focus barrier on the source (scroll into
    view + visual pulse).
  - Emits the canonical drag event sequence with v1.6.1's
    default-on per-plugin bus + plugin_instance_id payload:
    `nac:drag:started` -> `nac:drag:over` -> `nac:drag:dropped`.
    On failure: `nac:drag:cancelled`.
  - Removes any `.ne-drag-empty` placeholder in the target
    (matches the demo's existing UX).

### Demo backend additions

- **`yjNacDemo` allowedKinds += `drag_drop`** (with extra fields
  `target_nac_id` + optional `to_index`).
- **System prompt teaches the model** when to use `drag_drop`
  vs `click`, with an explicit warning: "NEVER use 'click' on a
  draggable" (the precise mistake that caused the user-reported
  bug).

### Demo frontend additions

- **`dispatchAgenticAction case 'drag_drop'`** routes to
  `NAC.drag_drop()`. Cache bump v25 -> v26.

### Why the gap existed

The spec's sec 13.4 has declared `NAC.drag_drop` since v1.1
(2026-04). The runtime focused on the in-list `reorder` verb
(v1.4) and never circled back. The yujin.app demo wired HTML5
drag-and-drop directly so humans could use the demo, but no
programmatic invocation path existed. The seven v1.6 reviewers
did not catch it because none of them tried drag-and-drop
through the agent. v1.6.2 closes the loop.

### Implication for NAC consumers

Any UI that ships `data-nac-role="draggable"` /
`data-nac-role="drop-target"` is now operable end-to-end via
the documented contract. Test runners + voice + RPA + agentic
chat all converge on the same `NAC.drag_drop` entry point.

## [1.6.1] - 2026-05-07

PATCH release responding to AI peer review of v1.6.0. Seven
reviewers (ChatGPT, Mistral Le Chat, Microsoft Copilot, Claude
4.7 Deep Thinking, DeepSeek, HuggingChat, Grok) evaluated the
spec, runtime, manual, API reference, philosophy doc, and the
public demo. The full reviews are pasted into
`docs/AI_REVIEWS_OF_NAC_SPEC_v1.6.md`; this CHANGELOG entry
records what shipped in response. Strict superset of v1.6.0;
every v1.6.0 plugin remains valid.

### Headline finding from the v1.6 review

Five of seven reviewers raised the same root cause: the
ARIA dual-source-of-truth tax. Keeping `data-nac-state` and
`aria-*` in sync inside batched frameworks (React 18 concurrent,
Vue Suspense, Svelte 5 effects) is non-trivial; the validator
catches drift only ex-post; teams hit a CI failure wall after
the first 10 screens; abandonment follows. v1.6.1 attacks this
on three fronts: spec hard-error, runtime tolerance config, and
a written-out design-system layer pattern in MANUAL.md.

### Spec additions (normative)

- **Section 7.3.2 Drift findings are hard-errors at NAC-3
  (NEW)**. `aria_nac_state_mismatch` and `aria_first_state` MUST
  be emitted as `severity: 'error'` and MUST set
  `report.has_errors === true` so CI blocks the build. Hosts
  that need to retire historic violations incrementally MAY
  demote to warn-level via
  `NAC.set_validation_tolerance({drift_findings:'warn'})`,
  making suppression an explicit, audited choice. Driven by
  Mistral, Copilot, Claude 4.7, HuggingChat, DeepSeek.

- **Section 7.4 Per-plugin event buses default-on (TIGHTENED)**.
  `nac:*` events MUST be dispatched on the plugin root in
  addition to `document`. v1.6.0 said hosts MAY opt in to the
  per-plugin bus; v1.6.1 makes both dispatch surfaces mandatory.
  Driven by Claude 4.7's "data-nac-plugin-bus should arguably be
  the default", echoed by Mistral, Copilot, HuggingChat.

- **Section 7.4 Closed shadow roots out of scope (CLARIFIED)**.
  All seven reviewers raised this. v1.6.1 declares closed shadow
  roots explicitly out of scope and documents the canonical
  bridge pattern: composed-bubble + host-side public-method
  driver + manifest field `"shadow_root":"closed"` so validators
  skip the unreachable DOM checks. The spec does not attempt a
  workaround that would either require WHATWG changes or break
  the encapsulation guarantee the closed root provides.

### Runtime additions

- **`NAC.is_blocked()` (NEW)**. Canonical "is the UI accepting
  operator input right now?" probe. Returns
  `{blocked:bool, reasons:[{kind,nac_id,severity}]}`. Replaces
  the v1.6 antipattern of inferring blocking state from
  `feedback[].severity`. Wraps `list_pending_confirms()` +
  open-modal detection + busy-action detection. Driven by
  ChatGPT, DeepSeek, Mistral.

- **`NAC.set_validation_tolerance(cfg)` (NEW)** and
  **`NAC.get_validation_tolerance()` (NEW)**. Hosts retiring
  historic findings incrementally can register a
  `tolerated_violations` payload that excludes specific
  `(kind, nac_id)` pairs from `.ok` / `.has_errors` while
  surfacing them in `.tolerated[]` for audit. Typically loaded
  from a `tolerated_violations.json` committed alongside the
  codebase. Driven by Mistral, Claude 4.7's "register-time
  console.warn is ignored; 50+ plugin first run sea of red".

- **`validate_global().has_errors` (NEW)**. Explicit boolean for
  CI integration so build scripts do not need to introspect
  `.duplicates.length`.

### Documentation additions

- **MANUAL.md Design-system layer pattern (NEW chapter)**.
  Concrete React 18 + Vue 3 + Svelte 5 primitives that emit NAC
  + ARIA atomically using `flushSync` / `nextTick` /
  `Promise.resolve` commit barriers. Five of seven reviewers
  identified the lack of this pattern as the #1 abandonment
  cause; the chapter writes out the answer.

- **MANUAL.md Event correctness, framework-specific timing
  (NEW section)**. Per-framework commit-barrier table
  (React/Vue/Svelte/Angular/Qwik) for the `data-nac-state` ↔
  `aria-*` boundary. Driven by HuggingChat: "React 18 with
  concurrent features, useTransition or useDeferredValue batch
  and defer DOM commits by design".

- **README.md Honest expectations (NEW section)**. Replaces the
  stale "1 hour" pitch with a realistic cost frame (~1 day per
  screen with AI agent + 1-2 days to build the design-system
  layer up front). Adds a best-fit / worst-fit table so teams
  self-select before adopting. Driven by Copilot, Claude 4.7,
  HuggingChat: "the surface no longer matches the 'one hour'
  claim".

### Demo + backend fixes

- **NAC + Yujin demo (yujin.app/nac-spec/example.php)**: when
  the AI fallback chain (Claude → DeepSeek → Groq) exhausts and
  lands on the canned tier, the backend now short-circuits BEFORE
  attempting JSON parse. Returns the localised "AI temporarily
  unavailable" apology with `unavailable: true` flag instead of
  the previous misleading "could not understand the model
  response" parse-error path. Frontend shows a distinct
  `unavailable` badge state and skips the local-matcher
  degradation (the chain already exhausted every provider).

- **`AiClient::cannedResponse` (rpaforce CRM)**: returned dict
  now includes `last_error` so callers can log which tier failed
  last. Diagnoses prod-config drift (e.g. missing per-tenant
  Groq key) from server logs without manual debugging.

### Score deltas v1.4 -> v1.6 (recorded for reference)

| Axis | v1.4 baseline | v1.6 (7 reviewers) |
|---|---|---|
| Clarity | 7.25 | 7.71 |
| Usefulness | 8.75 | 8.79 |
| Ease of adoption | 5.50 | 5.57 |
| Ambition vs feasibility | 7.75 | 7.71 |

Ease-of-adoption staying flat at 5.57 is the gap v1.6.1 is
designed to close in v1.7+, once the design-system layer
pattern has had time to absorb the dual-attribute tax in real
codebases.

### Deferred to v1.7

The following items from the v1.6 review action list were
captured but NOT shipped in v1.6.1: A1 default timeout
normative, A2 emit-template snippets, A5 reset-completion
semantics, A6 discoverable verbs, A7 NacElement.value
semantics, R1 set_default_timeout, R3 parallel/lazy
validate_global, R5 bridge_shadow_root helper, R6 reset
provider context, D4 out-of-scope state doc, D5
vendor-extension namespace. They are tracked for v1.7 once
v1.6.1 has had at least two weeks of adoption signal in the
field.

## [1.6.0] - 2026-05-06

MINOR release. Adds the **`NAC.reset()` plugin reset primitive**,
the operator-side counterpart to the lifecycle events in P4. An
operator can now ask any NAC-compliant plugin -- or the whole
page -- to return to its declared initial state. Strict superset
of v1.5.4; every v1.0..v1.5.4 plugin remains valid (the reset
primitive is opt-in via `set_reset_provider`, with a generic
fallback when no provider is registered).

### Spec additions (normative)

- **Section 9.3 Plugin reset primitive**. Defines
  `NAC.reset(plugin_slug?)` resolution order:
  1. Custom provider for the named plugin (registered via
     `NAC.set_reset_provider(slug, fn)`) -- run it, emit
     `nac:plugin:reset { plugin: <slug> }`.
  2. No specific plugin -> every registered provider runs in
     order, then a generic reset of the whole document, then a
     final `nac:plugin:reset { plugin: '*' }`.
  3. Specific plugin without provider -> generic reset scoped
     to that plugin root.
- **Generic reset rules** (normative). Without a custom
  provider, the runtime MUST clear every
  `[data-nac-role="field"]` (honouring `data-nac-default-value`
  if declared), set every cleared field to
  `data-nac-state="pristine"`, dispatch input + change events,
  apply `data-nac-default-state` per element, hide every
  `[data-nac-default-hidden]` region.
- **`NacResetResult` shape**. `{ ok, plugin, source: 'custom'
  | 'generic' | 'custom+generic', plugins?, error? }`.
- **`nac:plugin:reset` event**. Bubbles + composed (per spec
  7.4); detail `{ plugin, timestamp }`.
- **NAC-3 compliance**: at NAC-3 `NAC.reset()` MUST exist, the
  generic reset rules MUST work for any plugin without a
  custom provider, and custom providers MUST emit
  `nac:plugin:reset` on completion. NAC-1 / NAC-2 MAY expose
  reset.

### Reference runtime (`js/nac.js`)

- New module-scope `_resetProviders` map keyed by plugin slug.
- `NAC.set_reset_provider(slug, fn)` registers a provider.
- `NAC.reset(plugin_slug?)` async function resolves to a
  `NacResetResult`.
- `_genericReset(slug?)` walks the plugin root (or the whole
  document) and applies the four generic-reset rules.
- `_emitResetEvent(slug)` fires `nac:plugin:reset` with the
  v1.4.1 composed:true scoping rules.
- Version constant bumped to `1.6.0`. Spec version `1.6`.

### Reference demo (`yujin.app/nac-spec/`)

- example.js registers a custom reset provider for
  `example_demo` that closes the secret modal, collapses every
  expanded sumi-e icon, clears the four text inputs, resets the
  mood select + spread checkbox, returns the volume slider to
  50, restores the cities card if minimised, switches back to
  the first tab, collapses any expanded accordion sections,
  removes table sort indicators, and smooth-scrolls to the top
  of the page.
- The autopilot now calls `NAC.reset('example_demo')` as its
  FIRST step before the audio prewarm + the rest of the seq.
  An 800ms pause after the reset settles the smooth-scroll +
  card restore + tab swap before the demo begins. Repeatable
  autopilot runs no longer compound state from the prior run.
- New SECTION_I18N key `auto.reset` (10 locales).

### Documentation

- `docs/API_REFERENCE.md` adds rows for `reset`, and
  `set_reset_provider`. NAC.version constant updated to
  `1.6.0`. Version history block notes 1.6.0.
- README badge bumps v1.5 -> v1.6, with the reset addition
  called out in the lead block.
- MANUAL adds a "Plugin reset" section pointing at spec 9.3.
- AI_INSTRUCTIONS last-updated bumped 1.5.4 -> 1.6.0 with the
  reset primitive in the timeline.

## [1.5.4] - 2026-05-06

Demo-only patch release. Reference runtime contract is unchanged
from v1.5.1; this release ships:

### Reference demo (`yujin.app/nac-spec/`)

- **Exhaustive 10-locale i18n sweep** on every visible string
  in the demo. The Yujin standard locale set
  (`es en pt fr ja zh hi ar de it`) covers the topbar tagline,
  every card heading + sub-title, the lead paragraph, every
  side-panel header, the secret modal title + body + close
  button, every form label + select option, every wizard
  prompt (18 steps + intro + next-step prefix + idle blurb),
  every autopilot bot line (intro + 9 step acknowledgements +
  closing v1.2 paragraph), and every runtime acknowledgement
  (tab activations, accordion expansions, slider volume,
  table sort, table filter, pagination, drag-drop). Total:
  ~75 SECTION_I18N keys, each across 10 locales.
- **Templated localised messages** via a tiny `tFmt(key, vars)`
  helper that substitutes `{value}`, `{dir}`, `{q}` placeholders
  at render time so messages like "Volume at 70%" /
  "Volumen en 70%" / "ボリューム 70%" / "音量 70%" stay
  grammatical across all locales.
- **WIZARD_STEPS** entries now carry a `prompt_key` instead of
  a literal Spanish prompt. The wizard's render / start / skip
  / tryAdvance paths resolve the key via `t()` at display time
  so a mid-tour locale switch updates remaining steps without
  a reload.
- **Autopilot bot lines** routed through `t('auto.*')`. The
  hands-free demo plays in any of the 10 locales depending on
  the dropdown selection.
- **Runtime feedback** (sortable table acks, drag-drop
  confirmations, pagination, file upload simulation) routed
  through `t()` / `tFmt()` -- zero hardcoded Spanish strings
  remain in `js/example.js`.

### Backend

- The agentic chat backend's system prompt continues to honour
  rule 7: "the user may write in any of the 10 locales; match
  user intent against `label_i18n` in ANY locale; reply in the
  user's locale". The 10-locale `label_i18n` maps shipped on
  every action / field / tab in v1.5.1 are what make this work
  end-to-end -- a user typing "弹一个 Do" lands NAC.click
  ('note.c') because the manifest carries `label_i18n.zh`
  alongside `label_i18n.es`.

Runtime version constant bumped to `1.5.4` for traceability.
Plugins do NOT need any change. The runtime contract
(attributes + events + driver API) is unchanged from v1.5.1.

This release is the technical realisation of NAC's first
principle ("the system disappears"). For non-Spanish visitors,
the demo no longer leaks Spanish strings into the chat replies,
the wizard prompts, or the autopilot narration. The system
disappears for them too.

## [1.5.1] - 2026-05-06

Patch release. Two surface areas:

### Spec additions (normative)

- **P7.1 Cross-plugin uniqueness + `NAC.validate_global()`**.
  Answers the user question "how does NAC avoid duplicate
  nac_ids across a large system". Three layers:
  1. Convention (P1 reaffirmed): every `nac_id` SHOULD be
     prefixed with its plugin slug + `.`.
  2. Register-time warning: `NAC.register()` logs
     `console.warn('[NAC] duplicate nac_ids ...')` when a new
     manifest declares an id another plugin already uses.
  3. CI gate: `NAC.validate_global()` returns a structured
     `NacGlobalReport` with `duplicates`, `orphans` (DOM-only
     ids), `unmounted` (manifest-only ids), and
     `convention_violations` (ids not following the
     `plugin_slug.<path>` grammar).
- **P7.2 Recommended nac_id grammar** (informative).
  `plugin_slug "." element_path` with examples. Grammar is
  informative -- runtimes accept any non-empty string -- but
  the CI gate flags violations.

### Reference implementation (`js/nac.js`)

- `register()` runs the cross-plugin duplicate check and emits
  a `console.warn` when it finds collisions. Best-practice
  nudge; never throws.
- `_collectManifestIds(manifest)` helper walks every
  contract-bearing array (`actions`, `fields`, `tabs`, `kpis`,
  `charts`, `rows.cells`, `breadcrumbs.items`).
- `NAC.validate_global()` exposed from `window.NAC.*`. Returns
  the `NacGlobalReport` shape from spec P7.1 above.

### Reference demo (`yujin.app/nac-spec/`)

- **Full 10-locale i18n**. The Yujin standard locale set
  (`es en pt fr ja zh hi ar de it`) covers every UI chrome
  string in the demo plus every action / field / tab in the
  manifests of `example_demo` and `example_assistant`. Locale
  detection chain: `?lang=` URL param > html `lang` attr >
  `navigator.language` > `en`. Runtime override via
  `window.setNacDemoLang('zh')`.
- **TTS BCP-47 lang** now follows the detected locale (was
  hardcoded `es-AR` for both Web Speech synthesis and the
  speech recognizer).
- **System prompt updated** so the LLM knows it MUST match
  user intent against `label_i18n` in any of the 10 locales,
  not just the page's primary locale. A user typing
  `弹一个 Do` ("play a Do" in Chinese) on a
  Spanish-locale page still hits `note.c` because the
  manifest carries `label_i18n.zh` alongside `label_i18n.es`.
  The bot's reply is in the user's locale.
- **Robustness**: `nacDemoSnapshotTree()` now wraps the entire
  snapshot in try/catch + per-plugin `NAC.manifest()` call in
  its own try, so a single brittle plugin does not abort the
  whole agentic dispatch silently.

The runtime contract from v1.5.0 is unchanged. v1.5.1 plugins
are interchangeable with v1.5.0 plugins; the new
`validate_global()` and the duplicate-id warning are additive.

## [1.5.0] - 2026-05-06

MINOR release. The runtime contract (attributes + events +
driver API) is unchanged from v1.4.2; v1.5.0 documents the
canonical NAC + LLM agentic loop and ships a reference
implementation on the public demo. Strict superset of v1.4.2;
every v1.0..v1.4.2 plugin remains valid.

### Spec additions (informative)

- **Section 9.1 NAC + LLM agentic loop**. Four-step canonical
  pattern: `NAC.describe()` snapshot, backend POST that holds
  the API key, structured-output system prompt, sequential
  dispatch via NAC primitives. Covers failure modes
  (provider down, tree too large, model returns non-JSON,
  unknown nac_id) and recommends provider chaining
  (primary + fallback).
- **Section 9.2 Canonical system prompt**. Pseudo-code that
  any implementer can adapt to their target model. Constrains
  the LLM to the seven action kinds (`click`,
  `click_by_verb`, `fill`, `select`, `tab`, `tab_by_label`,
  `say`) and a strict JSON output shape.

The runtime in `js/nac.js` is byte-identical to v1.4.2
behavioural-wise; only the version constant bumped to `1.5.0`
and the header CHANGELOG block updated. The pattern
documented in 9.1 lives entirely on the demo + backend
sides; vendors who copy the demo can swap their own backend
without touching the runtime.

### Reference demo + backend (`yujin.app/nac-spec/`)

- `js/example.js` chat upgraded from a hardcoded local matcher
  to an **agentic dispatcher**:
  - Snapshots the page via `NAC.describe()` + `NAC.manifest()`.
  - POSTs the snapshot + the user prompt to
    `https://yujin.app/crm/api/v1/yujin/nac-demo`.
  - Renders the model's `message` field as a chat reply.
  - Dispatches the model's `actions[]` sequentially through
    `NAC.click` / `NAC.fill` / `NAC.tab` etc, with a 250ms
    pause between actions so the human sees each focus pulse
    from v1.4.2.
  - Falls through to the legacy local matcher when the
    backend is unreachable, returns a non-2xx, or times out
    after 25s. The demo always works offline; agentic mode
    is the upgrade path.
  - A small "modo agente" / "modo offline" badge above the
    chat bar shows which path responded.
- `crm_desa/api/v1/yujin.php` adds **`yjNacDemo()`** behind
  `POST /api/v1/yujin/nac-demo`. Public (no API key), CORS-
  gated to the same origins as `/yujin/chat`, rate-limited
  20/min/session + 60/min/IP + 400/day/IP. The handler:
  1. Validates session_id, prompt (1..2000 chars), lang,
     history (max 10 turns), nac_tree (object).
  2. Runs the YujinSafety prompt-injection scan on the user
     turn.
  3. Compacts the tree (max 200 elements/plugin, 10 plugins,
     60 KB cap).
  4. Composes a structured-output system prompt embedding
     the tree + the seven NAC action kinds.
  5. Calls **Claude Sonnet** primary via existing
     `ClaudeClient::call()` (uses the org rotation pool +
     BYOK awareness already in production).
  6. Falls back to **DeepSeek free** via existing
     `DeepSeekClient::call()` if Claude returns non-OK.
  7. Sanitises model output through `YujinSafety::
     sanitizeOutput()`, defensively extracts JSON from any
     markdown fences the model may have slipped, validates
     each action against the seven allowed kinds, drops
     unknown kinds rather than 5xx-ing.
  8. Returns `{ message, actions[], model, fallback_used,
     tokens_in, tokens_out }`.
  - API keys never appear in the response. The `model`
    field is the only identifier the client sees.

### Notes for implementers vendoring the demo

- The frontend reads `window.NAC_DEMO_ENDPOINT` first if
  defined, otherwise defaults to `/crm/api/v1/yujin/nac-demo`
  (relative to `location.origin`). Vendors point this at
  their own backend.
- The backend pattern ports cleanly to other languages: the
  composition is "compact tree + system prompt + LLM call +
  JSON parse + action validation". The reference PHP
  implementation is ~250 lines; equivalent Python or Node
  ports would be similar.
- The system prompt is informative, not normative. Any prompt
  that produces the same output shape is compliant. See spec
  section 9.2 for pseudo-code.

## [1.4.2] - 2026-05-06

Patch release responding to Microsoft Copilot's review of
v1.4.1 (Copilot was the first reviewer to read v1.4.1; the
earlier three reviewed v1.4.0). v1.4.2 closes 9 new action
items (3.5-A through 3.5-I) without adding new role / event /
attribute vocabulary. Strict superset of v1.4.1; every
v1.0..v1.4.1 plugin remains valid.

### Spec changes (normative)

- **P5.0 Return shapes** (new). NacElement, NacSnapshot,
  NacKpiReadout, NacFeedback, NacEvent, NacResult,
  NacStateSnapshot all formalised as normative TypeScript
  interfaces. Pre-v1.4.2 these names appeared only in P5
  function signatures without bodies. AI test runners reading
  the spec cold can now rely on `describe().kpis[i].value`
  and similar.
- **6.1 Required vs optional event families per level** (new).
  NAC-3 event requirements split between universal (every
  plugin emits) and conditional (plugin emits only when its
  manifest declares the corresponding widget family). A plugin
  that ships zero accordions does not need to emit
  `nac:accordion:expanded`. The validator implements the
  conditional table.
- **7.3.1 Direction of mirroring** (new). NAC drives, ARIA
  mirrors. The reverse direction is intentionally NOT defined.
  ARIA-first codebases adopting NAC must rewrite touchpoints
  so NAC is the authoritative source for every state mapped in
  section 7.3. Validator emits error `aria_first_state` when
  reverse mirroring detected.
- **7.5 Confirm-dialog contract** (new). Promoted from v1.3
  section 15.5 narrative + API_REFERENCE to a normative section
  of chapter 7. Defines DOM shape (`data-nac-role=
  "confirm-dialog"`, `data-nac-state="pending|resolved|
  cancelled"`), lifecycle event family
  (`nac:confirm:requested`, `:resolved`, `:cancelled`), focus
  trap requirement, validator findings
  (`confirm_dialog_no_focus_trap`,
  `confirm_dialog_missing_aria`).
- **7.4 plugin-id rule tightened**. Pre-v1.4.2 said hosts
  SHOULD set `data-nac-plugin-id` per instance; v1.4.2 makes
  it MUST when two roots with the same `data-nac-plugin` slug
  are simultaneously in the DOM. Validator error
  `duplicate_plugin_no_instance_id`.
- **P5 click_by_verb / tab_by_label tie-break rules**
  formalised. First-manifest-match-wins for both. Label
  matching is case-insensitive trim across every declared
  locale (locale-aware via `Intl.Collator` permitted but
  optional). Validator emits warns `duplicate_verb` and
  `duplicate_tab_label`.

### Reference implementation (`js/nac.js`)

- **`validate()`** gains four LINTs aligned with the new
  normative rules: `duplicate_verb`, `duplicate_tab_label`,
  `duplicate_plugin_no_instance_id`, plus the v1.4.1
  `aria_nac_state_mismatch` already present.
- **Focus follow** on every write entry point (`click`,
  `fill`, `select`, `tab`, `navigate_breadcrumb`). The
  internal helper `_focusElement(el)` runs
  `scrollIntoView({block:'center'})`, focuses the element
  (transiently adding `tabindex=-1` for non-focusable roles),
  pulses `[data-nac-focus-pulse]` for 600ms, and emits
  `nac:focus:moved`. A minimal default stylesheet is injected
  once on install. Opt out per call via `el.__nac_skip_focus`
  or globally via `NAC.config.focus_on_action = false`. This
  closes a UX gap surfaced 2026-05-06: before this change,
  programmatic clicks happened invisibly off-screen and the
  page stayed static while the agent operated.

### Demo fixes (`yujin.app/nac-spec/`)

- `js/example.js` `interpret()` rewritten. Pre-v1.4.2 used
  substring match on single letters (`'c'`) and short
  syllables (`'do'`, `'re'`, `'mi'`, `'sol'`) which collide
  with extremely common words: 'toca', 'tocate', 'secreto',
  'cerrar', 'mira'. Every chat input dispatched note.c
  regardless of intent. v1.4.2 tokenises the input
  (whole-word match), strips Spanish accents via NFD +
  combining range, reorders priority so action keywords
  (secret, autopilot, wizard) beat the note fallback. Fixes
  the "patito de Homero" bug.
- `AudioContext` unlock is now global. Pre-v1.4.2,
  programmatic `el.click()` from chat dispatch did not count
  as user gesture, so `AudioContext` stayed suspended and
  piano notes were silent. v1.4.2 attaches a capture-phase
  `pointerdown / mousedown / touchstart / keydown` listener
  on `document` that resumes the context. One real
  interaction anywhere on the page unlocks audio for the
  session.
- `js/example.js` `drive()` and `drive_fill()` now route
  through `NAC.click()` / `NAC.fill()` so the new focus
  follow applies on chat-driven operations.

### Documentation

- `docs/MANUAL.md` adds two new chapters:
  - **Framework integration patterns**: React 18, Vue 3,
    Svelte 5, Angular 17 examples for atomic
    `data-nac-state` + `aria-*` updates per section 7.2,
    plus `aria_lag_ms` guidance for batched-update edge
    cases. Lifecycle event hook table per framework.
  - **Event correctness**: the five patterns (single async,
    optimistic, async chain, retries with attempt counter,
    AbortController cancellation, race-condition gate). NAC-3
    summary checklist before declaring compliance.
- `docs/API_REFERENCE.md` updated to reflect v1.4.2 runtime
  (`NAC.version === '1.4.2'`).

### Reviewer credit

Action items addressed in this release were surfaced by
Microsoft Copilot (free, web). Three more free-tier reviewers
are queued: ChatGPT, Mistral, Kimi, Qwen, Gemini retry, plus
Perplexity. Full reviews preserved verbatim in
`docs/AI_REVIEWS_OF_NAC_SPEC.md`.

## [1.4.1] - 2026-05-06

Patch release responding to the AI peer review of 2026-05-06.
DeepSeek (free, browsing on), Claude (claude.ai free,
3-of-6 documents fetched), and Grok Fast (free) reviewed the
spec + reference implementation independently from cold and
produced 11 action items consolidated in
`docs/AI_REVIEWS_OF_NAC_SPEC.md` section 3. v1.4.1 closes all
of them. The spec base remains v1.4 -- no new role, event, or
attribute vocabulary was added; v1.4.1 only tightens existing
contracts and makes implicit rules explicit.

### Spec changes (normative)

- **1.5.1 Reference deployments and demo surfaces** (new). The
  public demo at `yujin.app/nac-spec/example.php` is a piano +
  fields + tabs + accordion + dropzone showcase. The
  `patch_manager` example identifiers used throughout this
  document live behind admin auth at yujin.app/crm and are
  illustrative quotations, not assertions about the public
  demo. Cold AI reviewers (DeepSeek, Grok Fast) fabricated
  against the headline example; Claude flagged the gap
  honestly. Section 1.5.1 names both surfaces and clarifies
  which snippets target which.
- **1.5.2 Adoption cost: the implementer is an AI coding
  agent** (new). The "1 hour onboarding" claim in section 1.5
  was correct under the assumption "an AI coding agent is the
  implementer". All three reviewers read it as
  "human-developer onboarding time" and produced estimates of
  2-3 days, days-to-weeks, and 1-2 engineer-weeks. v1.4.1
  reframes the claim explicitly: NAC ships agent-readable
  instructions (`AI_INSTRUCTIONS.md`, `CLAUDE.md`,
  `AGENTS.md`, `GEMINI.md`) and is designed to be applied by
  an agent in minutes per screen. The human role is review,
  not authoring.
- **7.1 Awaitable-write contract** (new normative section).
  Writes MUST resolve only on the success/fail event, or
  reject with `NacError('timeout', ...)`. The pre-v1.4.1
  reference implementation's 200 ms phantom-success path is
  retracted as a flake-factory bug, not a permitted variant.
- **7.2 NAC vs ARIA authority rules** (new normative table).
  Defines who wins when `data-nac-state` and `aria-*`
  disagree on the same element, per consumer kind.
- **7.3 NAC state to ARIA attribute mapping** (new normative
  table). Canonical mapping for every NAC state token that
  has an ARIA equivalent.
- **7.4 Event scoping** (new normative section). All `nac:*`
  events MUST emit `composed: true` and a payload field
  `plugin_instance_id`. Per-plugin event buses are optional
  via `data-nac-plugin-bus="enabled"`. Closes the multi-mount
  identity gap that Grok Fast flagged.
- **P5.1 Active-plugin resolution algorithm** (new normative
  subsection). The `_activePlugin()` heuristic that
  `js/nac.js` always implemented (most-recently-mounted
  state=ready plugin in DOM order, with documented fallback)
  is now part of the spec contract.
- **14.3.5 Layer declaration** (new). Adds
  `NAC.system_map_layers(): { a, b, c, preferred }` so agents
  do not probe by exception.

### Documentation

- `docs/API_REFERENCE.md` (new). One-page cheat sheet of every
  `window.NAC.*` method introduced in v1.0..v1.4.1, grouped by
  version, with signature, error throws, and the spec section
  that formalises each method. DeepSeek's review missed
  `NAC.tab()` and `NAC.list_pending_confirms()` because the
  canonical TypeScript interface block in P5 is dense; the
  cheat sheet closes that gap.
- README quick-links section added pointing at API_REFERENCE,
  MANUAL, AI_INSTRUCTIONS, CLAUDE/AGENTS/GEMINI entry points.
- Section pointers added to the top of v1.1 / v1.2 / v1.3 /
  v1.4 narrative chapters, each routing readers to the
  relevant API_REFERENCE rows. The narrative still explains
  *why* each primitive exists; the cheat sheet shows *how* to
  call it.

### Reference implementation (`js/nac.js`)

- **`click()`** rewritten. Single deterministic Promise that
  races `nac:action:succeeded` (resolve `{ ok: true, ... }`)
  against `nac:action:failed` (resolve `{ ok: false, ... }`)
  against a configurable timeout (`opts.timeout` or
  `NAC.config.default_timeout_ms`, default 5000 ms) that
  rejects with `NacError('timeout', ...)`. The 200 ms
  short-circuit `resolve({ ok: true, event: null })` from
  v1.0..v1.4.0 is gone.
- **`validate()`** strengthened. Returns
  `{ ok, missing, errors, manifest, timestamp }`. The new
  `errors` array reports six new finding categories:
  `missing_in_dom`, `field_type_mismatch`,
  `field_type_undeclared`, `options_unresolved`,
  `depends_on_orphan`, `row_cell_missing`,
  `breadcrumb_item_missing`, `aria_nac_state_mismatch`. The
  legacy `missing` array is preserved for back-compat.
- **`click_by_verb(plugin, verb, opts)`** added. Convenience
  wrapper that resolves verb -> nac_id via the manifest
  (then DOM scan) before delegating to `click()`. Designed
  for voice agents that hear "apply all" rather than
  `patch_manager.apply_all`.
- **`tab_by_label(plugin, label, opts)`** added. Same shape
  as `click_by_verb` but for tabs; matches against
  `tabs[].label`, `tabs[].label_i18n`, and DOM
  `aria-label` / textContent.
- **`system_map_layers()`** added. Synchronous declaration
  of which discovery layers (A precomputed map, B per-view
  transitions, C capabilities) the host implements.
- **`_emit()`** sets `composed: true` and normalises detail
  to include `plugin` (aliased from legacy `plugin_slug`)
  plus `plugin_instance_id`. Optional per-plugin-root bus
  dispatch when `data-nac-plugin-bus="enabled"`.
- **`register()`** now accepts both `register(manifest)` (the
  canonical form documented in MANUAL.md and
  AI_INSTRUCTIONS.md) and `register(slug, manifest)` (the
  shape some integrators copied from third-party RPC
  conventions). Both forms produce identical state.

### Demo fixes (`yujin.app/nac-spec/`)

- `js/example.js` lines 32 and 59 used the two-argument
  `register('slug', obj)` form, which threw
  `NacError('invalid', 'manifest object required')` before
  v1.4.1 and broke every interactive element on the public
  demo. Both call sites switched to the canonical
  `register(obj)` form.
- `assets/favicon.svg` placed at the path the demo pages
  requested (was 404).
- `example.php` asset version bumped from `v5` to `v6` for
  cache invalidation.

### Reviewer credit

Action items addressed in this release were surfaced by:
- DeepSeek (chat.deepseek.com, free): 3.4-A, 3.4-B
  (validator), 3.3-A (cheat sheet motivated by missed
  methods).
- Claude (claude.ai, free): 3.4-A (corroborated), 3.2-B,
  3.2-D (ARIA overlap), 3.4-C, 3.2-A (versioning), 3.2-C
  (system_map layers), 3.3-C (demo mismatch).
- Grok Fast (grok.com, free): 3.2-E (event scoping), 3.2-A
  (corroborated softly).

Full reviews preserved verbatim in
`docs/AI_REVIEWS_OF_NAC_SPEC.md`. The synthesis section of
that file was the source-of-truth for v1.4.1 scope.

## [1.4.0] - 2026-05-06

Strict superset of v1.3. Every v1.0 / v1.1 / v1.2 / v1.3 plugin
remains valid; every v1.0..v1.3 operator continues to work. Adds
vocabulary for four UI primitive families that v1.3 left
under-specified: hierarchical breadcrumbs, carousels, timelines /
activity feeds, and in-place reordering within a single list.

### Added

- **Spec section 16** -- "Navigation and ordering primitives
  extension (v1.4, normative)". Strict superset of sections
  1-15 covering 4 widget families:
  - **A. Breadcrumb** -- `role=breadcrumb / breadcrumb-item`,
    states `current | navigable`, verb `navigate_to_crumb`,
    event `nac:breadcrumb:navigated { id, depth, path,
    target_depth }`. Driver: `NAC.list_breadcrumbs`,
    `NAC.navigate_breadcrumb`. Manifest: optional
    `breadcrumbs[]` array.
  - **B. Carousel** -- `role=carousel / carousel-slide /
    carousel-dot`, states `playing | paused`, verbs
    `slide_next | slide_prev | slide_to | pause_autoplay |
    play_autoplay`, events `nac:carousel:slide_changed |
    autoplay_paused | autoplay_resumed`. Driver:
    `NAC.list_carousels`, `carousel_state`, `carousel_advance`,
    `carousel_to`, `carousel_autoplay`. Manifest: optional
    `carousels[]` array. The naming gap (v1.1 already used
    `slider` for continuous numeric input) is closed.
  - **C. Timeline / activity feed** -- `role=timeline /
    timeline-item`, states `live | static` and `visible |
    hidden`, verbs `load_older | load_newer`, events
    `nac:timeline:item_clicked | scrolled_to | loaded_more |
    item_appeared`. Driver: `NAC.list_timelines`,
    `timeline_load_older`, `timeline_load_newer`,
    `timeline_state`. Manifest: optional `timelines[]` array
    declaring ordering, live status, and pagination support.
  - **D. Reorder-within-list** -- new verb `reorder` on
    existing v1.1 `draggable`, new event
    `nac:list:reordered { list_id, item_id, from_index,
    to_index }` emitted INSTEAD of `nac:drag:dropped` when
    source and target resolve to the same parent list. Driver:
    `NAC.reorder(list_id, item_id, to_index)`. Optional
    manifest hint: `supports_reorder: true` on a `NacRowDef`.
- 7 new roles, 7 new states, 9 new verbs, 10 new events, 11
  new driver functions, 3 new manifest arrays.

### NAC-3 v1.4 compliance

A plugin claiming NAC-3 v1.4 MUST satisfy NAC-3 v1.3 plus
declare appropriate roles/events/manifest entries for every
v1.4 widget it ships, AND emit `nac:list:reordered` for any
in-list drag-reorder.

### Backwards compatibility

Every v1.4 addition is additive. v1.0..v1.3 operators ignore
unknown roles/events/manifest arrays per section 16.8. v1.4
operators drive v1.0..v1.3 plugins via documented fallbacks
(e.g. `NAC.navigate_breadcrumb` clicks the `<a>` matching the
item label when no `breadcrumb` role is registered).

The semver impact of v1.4 is **MINOR**.

## [1.3.0] - 2026-05-06

Strict superset of v1.2. Every v1.0 / v1.1 / v1.2 plugin
remains valid; every v1.0 / v1.1 / v1.2 operator continues
to work. Adds vocabulary for sixteen UI primitive families
that were observable on most production web apps but had no
formal NAC role.

### Added

- **Spec section 14.7** -- "Section navigation (page-level
  landmarks)". `data-nac-role="section"` plus
  `data-nac-id="page.section.<slug>"` plus optional
  `data-nac-label`. New driver functions
  `NAC.list_sections()` and `NAC.go_to_section(id)`. New event
  `nac:section:reached`. Reference impl wires an
  IntersectionObserver per section so visibility flips emit
  `nac:state:changed` automatically.
- **Spec section 15** -- "Common UI primitives extension
  (v1.3, normative)". Strict superset of sections 1-14
  covering 16 widget families:
  - **A. Toast / banner / alert** -- `role=toast | banner |
    confirm-dialog`, events `nac:toast:fired | dismissed`,
    `nac:banner:displayed | dismissed`. Driver: `NAC.toast`,
    `list_toasts`, `dismiss_toast`, `list_banners`,
    `dismiss_banner`.
  - **B. Toggle / switch** -- new `field_type="toggle"`,
    instant-action boolean distinct from `checkbox`.
  - **C. Stepper** -- `role=stepper / step`, events
    `nac:step:advanced | back | completed | error`. Driver:
    `step_next | step_back | step_to | step_state`.
  - **D. Tree** -- `role=tree / treenode`, events
    `nac:tree:expanded | collapsed | selected`. Driver:
    `tree_expand | tree_collapse | tree_select | tree_path`.
  - **E. Calendar with events** -- `role=calendar /
    calendar-event`, events `nac:calendar:event_clicked |
    moved`, `view_changed`, `date_selected`. Driver:
    `calendar_view | calendar_go_to | calendar_select_event |
    calendar_list_events`.
  - **F. Rich text editor** -- new `field_type="richtext"` +
    formatting verbs. Events `nac:richtext:format_applied |
    link_inserted | mention_picked`. Driver:
    `richtext_format | richtext_insert_link |
    richtext_insert_mention`.
  - **G. Tag input** -- new `field_type="tag-input"`,
    free-input + suggestions. Events `nac:tags:added |
    removed`. Driver: `add_tag | remove_tag | list_tags`.
  - **H. Rating** -- new `field_type="rating"` (`min`, `max`,
    `step`, `icon` in manifest). Driven via `NAC.fill`.
  - **I. Confirmation dialog** -- `role=confirm-dialog`,
    events `nac:confirm:requested | confirmed | cancelled`.
    Driver: `NAC.confirm(prompt, opts) -> Promise<boolean>`,
    `list_pending_confirms`.
  - **J. Drawer / bottom-sheet** -- `role=drawer |
    bottom-sheet`, events `nac:drawer:opened | closed |
    peek`. Driver: `open_drawer | close_drawer | peek_drawer`.
  - **K. Pagination standalone** -- generalises v1.1's
    `pagination-control` role beyond tables.
  - **L. Chart** -- `role=chart / chart-series / chart-point /
    chart-legend`, manifest array `charts[]`. Events
    `nac:chart:point_clicked | hovered | series_toggled |
    filtered`. Driver: `chart_data | chart_toggle_series |
    chart_filter`.
  - **M. Map** -- `role=map / map-marker / map-layer`,
    manifest array `maps[]`. Events `nac:map:marker_clicked |
    zoom_changed | moved | layer_toggled`. Driver:
    `map_focus | map_select_marker | map_toggle_layer |
    list_markers`.
  - **N. Avatar + presence** -- `role=avatar /
    presence-indicator`, states `online | away | busy |
    offline`. Event `nac:presence:changed`.
  - **O. Floating action button** -- `role=fab` (specialised
    primary action, often above bottom-sheet).
  - **P. Empty state + skeleton** -- `role=empty-state /
    skeleton`, kinds `no-results | first-time |
    no-permission | error`. Events `nac:empty:displayed |
    cta_clicked`; skeleton uses `nac:state:changed` loading
    -> done.
- **33 new lifecycle events** across the 16 families.
- **35 new driver API functions** on `window.NAC`.
- **3 new manifest extensions**: `charts[]`, `maps[]`, plus
  the rating / tag-input / richtext field-level options.
- **NAC-3 v1.2 compliance level** kept as is; new
  **NAC-3 v1.3** level defined for plugins shipping any of
  the v1.3 widgets.
- **Reference impl `js/nac.js`** bumped from 1.2.1 to 1.3.0.
  ~600 LOC added covering the 16 families. Still zero deps.
  Still ASCII-pure. node --check passes.

### Demo

- **`yujin.app/nac-spec/example-v13.php`** (new, standalone)
  -- 16 cards, one per primitive family. Every interaction
  driveable through `window.NAC`. The page registers
  manifests for each family, wires a system_map provider so
  it shows up in `NAC.system_map()`, and a banner that
  declares `nac:banner:displayed` on boot. CSS in
  `css/example-v13.css`. JS in `js/example-v13.js`.

### Migration

- A v1.0 / v1.1 / v1.2 plugin is valid v1.3 without
  modification.
- A v1.0..v1.2 operator parses a v1.3 plugin without crashing
  (unknown roles -> `region`, unknown field-types -> `text`,
  unknown verbs -> opaque actions, unknown events ignored,
  unknown manifest arrays silently skipped).
- A v1.3 operator drives a v1.0..v1.2 plugin without retrofit
  -- absence of any new role / event / driver function
  downgrades to the equivalent v1.2 path.
- semver impact: **MINOR**. No breaking change.

### Demo

- **`yujin.app/nac-spec/example.php`** (cache buster v4):
  - Every top-level `<section>` (intro, demos grid, wizard,
    chat, manifest panel) now carries `data-nac-role="section"`
    + `data-nac-id="page.section.<slug>"`.
  - New "Self-test & introspect" card added before the events
    log. Five buttons:
    - **Show navmap** -- inline `NAC.system_map()` JSON.
    - **Show capabilities** -- inline `NAC.capabilities()`
      JSON.
    - **List sections** -- `NAC.list_sections()` rendered as
      `id  [visible|hidden]  label`.
    - **Run NAC self-test** -- in-browser version of the
      Python runner. Walks every registered plugin, exercises
      the first 3 actions + first 2 fields per plugin, plus
      6 static gap rules (R1 button without nac-id, R2 plugin
      root without manifest, R3 field without field-type,
      R4 section without label, R5 page section without role,
      R6 action without verb). Outputs a per-test breakdown
      plus an expandable gap report inline.
    - **AI agent: tour the page** -- discovers plugins via
      `system_map()`, walks every section via
      `go_to_section()`, exercises one action per plugin,
      narrating in the chat panel via `botSpeak`.
  - Self-test card carries minimize / maximize / restore
    chrome buttons like the other v1.2 cards.

### Documented

- **CHANGELOG** notes Self-test panel + AI agent tour as
  Demo additions.

### Demo (continued)

- **18-step wizard.** `yujin.app/nac-spec/example.php`
  (cache buster v5): the guided tour now covers v1.0
  primitives (piano + modal + form, steps 1-8), v1.1 widgets
  (tabs / accordion / combobox / slider / table, steps 9-13)
  and v1.2 widgets (remote autocomplete + chrome minimize +
  system map + section navigation, steps 14-17). Step 18 is
  the terminal. Each step is validated via the matching NAC
  event: `nac:tab:changed`, `nac:section:expanded`,
  `nac:slider:value_changed`, `nac:plugin:minimized`,
  `nac:section:reached`, etc. The wizard listens to twelve
  event types (was four).
- **Autopilot extended** to drive all 17 actionable wizard
  steps end-to-end: piano notes -> modal -> form fill ->
  switch tab -> expand accordion -> pick country ->
  raise slider -> sort table -> remote autocomplete ->
  minimize -> fetch system map -> go to chat section. Closes
  with a one-line summary in the assistant chat.

## [1.2.0] - 2026-05-06

Strict superset of v1.1. Every v1.0/v1.1 plugin remains valid;
every v1.0/v1.1 operator continues to work. Adds three
capability blocks the public spec was asked about by early
readers:

- **A** -- dropdowns whose options come from JSON or DB tables
  (including high-cardinality remote autocompletes).
- **B** -- plugin window chrome: minimize, maximize, restore,
  fullscreen.
- **C** -- first-contact discovery: an agent connecting to an
  unknown system can call `NAC.system_map()` once and obtain a
  complete navigation tree + capability inventory before
  acting.

### Added

- **Spec section 14** -- "Discoverability and dynamic data
  extensions (v1.2, normative)". Strict superset of sections
  1-13.
- **4 new verbs** in `data-nac-action`: `minimize`, `maximize`,
  `restore`, `toggle_fullscreen`.
- **3 new state values** on plugin roots: `minimized`,
  `maximized`, `normal` (the four-way set
  `minimized | maximized | normal | fullscreen` is mutually
  exclusive).
- **4 new lifecycle events** on `document`, bubbling:
  `nac:plugin:minimized`, `nac:plugin:maximized`,
  `nac:plugin:restored`, `nac:plugin:fullscreen_changed`.
- **3 new options events** on `document`, bubbling:
  `nac:options:loading`, `nac:options:loaded`,
  `nac:options:invalidated`.
- **8 new driver API functions** on `window.NAC`:
  `options(field_id)`, `search_options(field_id, query, limit?)`,
  `invalidate_options(field_id, reason?)`,
  `set_options_resolver(plugin, field_id, fn)`,
  `minimize(plugin)`, `maximize(plugin)`, `restore(plugin)`,
  `fullscreen(plugin, on?)`.
- **4 new discovery functions** on `window.NAC`:
  `system_map()`, `capabilities()`,
  `set_system_map_provider(fn)`, `set_capabilities_provider(fn)`.
- **3 new manifest extensions** on `fields[]`:
  `options_source` (`static | dynamic | remote`),
  `depends_on: [field_id]`, `search_supported: true`,
  `min_chars`.
- **1 new manifest extension** on the manifest root:
  `transitions: [{to_view, via_action, conditions?,
  side_effects?}]` -- per-view edges of the navigation graph.
- **Error namespace** `NAC.errors` with stable codes:
  `RemoteSourceRequiresSearch`, `OptionsUnavailable`,
  `SystemMapNotProvided`, `CapabilitiesNotProvided`.
- **Compliance level NAC-3 v1.2** defined. A v1.0/v1.1 plugin
  MAY claim NAC-3 v1.0/v1.1 (baseline) without v1.2 conformance.

### Demo

- **`yujin.app/nac-spec/example.php`** -- two new cards added:
  Remote autocomplete (5000-city catalog with debounced
  search, `options_source=remote`, full options-event flow)
  and System map (buttons that call `NAC.system_map()` and
  `NAC.capabilities()` and pretty-print the result). Both
  cards carry minimize / maximize / restore window-chrome
  buttons exercised through `NAC.minimize/maximize/restore`.
  Asset cache buster bumped to `v3`.
- **`yujin.app/nac-spec/example-navmap.php`** (new) -- a
  separate scenario page: an "agent panel" lands on three
  unknown plugins (inventory, customers, orders), calls
  `NAC.system_map()` once to discover the graph, then plans
  and executes a 3-step task ("create order for Acme Corp,
  $1500, high priority") via NAC.search_options + NAC.fill +
  NAC.click + NAC.wait_for. No selectors. No DOM scraping.
  All NAC events are observed live in the right-hand log.
- **`js/nac.js`** reference impl bumped from 1.0.0 / spec 1.0
  to 1.2.0 / spec 1.2. ~280 LOC added across options
  resolvers, chrome verbs, and discovery providers. Still
  zero dependencies. Still ASCII-pure.

### Documented

- **`docs/IMPACT_RPA.md`** (new) -- long-form treatment of how
  NAC changes the economics of an RPA factory. Covers the
  selector-driven status quo, the five concrete savings (no
  more selector hunting, no more redesign breakage, no more
  flake, no more screenshot scraping, no more double
  maintenance with QA), an incremental migration path from an
  existing UiPath / Automation Anywhere / Power Automate
  factory, and the comparative table against XPath, image/OCR,
  vision-LLM agents and recorders.
- **`docs/IMPACT_TESTING.md`** (new) -- parallel treatment for
  QA automation. Covers what stops being a test problem under
  NAC (selector maintenance, race-condition flake,
  localisation breakage, theme/redesign breakage,
  cross-framework portability), what NAC explicitly does NOT
  change (unit tests, visual regression, accessibility audits,
  performance), the migration path for an existing
  Playwright/Cypress/Selenium suite, and the test-pyramid
  reshape that follows.
- **`README.md`** -- "Impact on RPA and automated testing"
  section pointing at the two new docs; badge bumped to v1.2.
- **`docs/MANUAL.md`** -- "Testing with the runner" section
  cross-references `IMPACT_TESTING.md` and `IMPACT_RPA.md`.

### Migration

- A v1.0/v1.1 plugin is valid v1.2 without modification.
- A v1.0/v1.1 operator parses a v1.2 plugin without crashing
  (unknown verbs treated as opaque, unknown manifest fields
  silently skipped, unknown events ignored).
- A v1.2 operator drives a v1.0/v1.1 plugin without retrofit:
  absent `options_source` is read as `static`, absent
  `transitions[]` is read as a leaf view, absent system map +
  capabilities downgrades to per-view planning.
- semver impact: **MINOR**. No breaking change.

## [1.1.0] - 2026-05-06

Strict superset of v1.0. Every v1.0 plugin is still valid; every
v1.0 operator still works. Adds vocabulary for nine widget
families that v1.0 left under-specified.

### Added

- **Spec section 13** -- "Widget extensions (v1.1, normative)".
  Strict superset of sections 1-12 covering tabs (formalised),
  accordions, sliders, comboboxes, datepickers, sortable /
  filterable / paginated tables, drag-and-drop, file uploads,
  tooltips, popovers, and notifications.
- **15 new roles** in P2 vocabulary: `tablist`, `tabpanel`,
  `accordion-section`, `slider`, `dropzone`, `draggable`,
  `drop-target`, `tooltip-trigger`, `tooltip-content`,
  `popover-trigger`, `popover-content`, `sort-control`,
  `filter-control`, `pagination-control`, `notification`.
- **9 new field-types**: `combobox`, `multi-select`, `range`,
  `time`, `date-range`, `color`, `email`, `tel`, `url`. The
  pre-existing v1.0 `multi` remains valid; `multi-select` is the
  formalised name.
- **22 new events** across 8 widget families (tabs lifecycle,
  accordion section, slider, datepicker, drag-and-drop, dropzone
  / file upload, table operations, tooltips and popovers,
  notifications). All under the `nac:*` namespace.
- **12 new driver API functions** on `window.NAC`: `expand`,
  `collapse`, `pick_date`, `set_slider`, `sort`, `filter`,
  `go_to_page`, `drag_drop`, `upload_file`, `show_tooltip`,
  `hide_tooltip`, `show_popover`, `hide_popover`. Implementations
  MAY route some through `fill` or `click` internally; the
  contract only requires the named function and the
  corresponding event.
- **6 optional manifest extensions** for capability
  introspection: `accordion_sections`, `sliders`, `tables`,
  `drag_zones`, `dropzones`, `notifications_channel`.
- **7 new state values**: `expanded`, `collapsed`, `dragging`,
  `drop-target-over`, `uploading`, `sorting`, `filtering`.
- **Compliance level NAC-3 v1.1** defined. A v1.0 plugin MAY
  claim NAC-3 v1.0 (baseline) without v1.1 conformance.

### Documented

- **`docs/PHILOSOPHY.md`** -- long-form treatment of the two
  product principles that produced NAC ("the system disappears"
  + "the agent acts as a human, not as another system"), the
  six implications of principle 2, the full NAC vs MCP
  comparison, and what the principles rule out of NAC's scope.
- **Spec section 1.5** -- "Rationale -- why not just ARIA"
  added as part of the normative document. Lists the seven gaps
  NAC closes, the scope mismatch with the ARIA WG, and the
  coexistence pattern.
- **Spec section 1.6** -- "The two principles that produced
  NAC" added (normative). Constrains future spec extensions:
  any addition that violates either principle is out of scope.
- **Spec section 1.7** -- "NAC vs MCP -- complementary
  contracts" added (normative). Codifies the layered usage rule
  so adopters do not treat NAC and MCP as competing.
- **`README.md`** -- new top-level "The thesis in two
  principles" section + extended "NAC vs ARIA" section + new
  "NAC vs MCP" section with comparison table.
- **`docs/MANUAL.md`** -- "Mental model" reframed around the
  two principles + new "NAC vs ARIA -- when to use what" section
  with decision matrix and coexistence pattern.

### AI tooling

- `AI_INSTRUCTIONS.md` (new, canonical at repo root) -- single
  source of truth for AI coding assistants working with NAC.
  Templates for attributes, events, manifest, decision order,
  anti-patterns.
- Vendor-specific instruction files at the conventions each
  tool respects: `CLAUDE.md` (Anthropic Claude Code),
  `GEMINI.md` (Google Gemini Code Assist), `AGENTS.md` (OpenAI
  Operator / Aider / Devin / multi-agent), `.cursorrules`
  (Cursor), `.windsurfrules` (Codeium Windsurf), and
  `.github/copilot-instructions.md` (GitHub Copilot). Each
  file references `AI_INSTRUCTIONS.md` as canonical.

### Changed

- Spec header section: "Spec version" updated from v1.0 to v1.1
  (extends v1.0; sections 1-12 unchanged).
- Glossary entry for `NAC` now reads "Native Accessibility
  Contract" (formerly "Navegabilidad Automatica Compliance").
  Both expansions refer to the same contract; the English form
  is canonical for the public spec, the Spanish form is
  preserved as the original drafting name.

### Migration

- A v1.0 plugin is valid v1.1 without modification.
- A v1.0 operator parses a v1.1 plugin without crashing
  (unknown roles -> `region`, unknown field-types -> `text`,
  unknown events -> ignored).
- A v1.1 operator drives a v1.0 plugin without retrofit (v1.1
  driver functions degrade to v1.0 equivalents when v1.1
  manifest entries are absent).
- semver impact: **MINOR**. No breaking change.

## [1.0.1] - 2026-05-05

### Fixed

- `js/nac.js` `_serializeElement` label resolver: when an element has
  no `aria-label` and no associated `<label for=>`, NAC now walks into
  the element looking for `[data-nac-role=label]`, `.yj-kpi-label`,
  `.yj-tab-label`, or trims the elements own `textContent` (capped 80
  chars). Pure observability fix; P6 still requires `aria-label` on
  interactive elements -- the resolver only improves serialization for
  display-only nodes whose label is not an a11y target.
- Validated against yujin.app/crm Patch Manager mvp60 plugin. NAC SCORE
  22/22.

## [1.0.0] - 2026-05-05

### Added

- Initial public release. Spec normative document
  (`spec/NAC-v1.0.md`) defines the seven pillars:
  - **P1** stable identity (`data-nac-id`).
  - **P2** roles + semantics (`data-nac-role`,
    `data-nac-field-type`, `data-nac-action` verbs).
  - **P3** state exposed (`data-nac-state`,
    `data-nac-error`).
  - **P4** events published (`nac:action:dispatching` /
    `succeeded` / `failed`, `nac:tab:changed`,
    `nac:field:changed`).
  - **P5** programmatic API (`window.NAC.describe / list / find /
    click / fill / select / tab / wait_for / read_feedback /
    screenshot / validate`).
  - **P6** i18n + a11y (`I18n.t` for every visible string,
    `aria-label`, WCAG AA contrast, `role="tab"` +
    `aria-selected`).
  - **P7** manifest declared (`manifest_nac` enumerates fields,
    actions, tabs, kpis, rows, charts; validator
    `NAC.validate(slug)` MUST pass at runtime).
- Reference JavaScript implementation `js/nac.js` (439 LOC, zero
  dependencies, MIT licensed).
- Practical authoring + operating + testing manual
  (`docs/MANUAL.md`).
- MIT License with citation request honoring Pablo Adrian Kuschniroff + Sumi
  (the AI partner).
- First production deployment: yujin.app/crm Centro de Control
  (Patch Manager + Plan tiles, NAC-3 verified).

### Reference deployments

- yujin.app/crm Centro de Control -- NAC-3 in production since
  2026-05-05 (Patch Manager mvp60 SCORE 22/22, Plan tile NAC-3
  certified).

[Unreleased]: https://github.com/pkuschnirof/nac-spec/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/pkuschnirof/nac-spec/releases/tag/v1.0.0
