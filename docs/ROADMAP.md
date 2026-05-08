# NAC Roadmap

This document is the public roadmap for NAC (Native Accessibility
Contract). It maps released versions, the next release in flight, and
the items deferred to v2.x.

The contract is **strict-superset** between minor versions and breaks
only at major versions. v2.0 will be the first major break since v1.0;
the breakage is removal of legacy field aliases (sec 6.2.28). Every
v1.x plugin that already migrated to canonical fields per
`docs/MIGRATION_v1_to_v2.md` works on v2.0 unchanged.

---

## v2.0 (current target)

**Status**: in flight. v1.9.0 is the patch round before the v2.0
announce; once merged, v2.0 ships as a clean cut that removes legacy
field aliases. Estimated public announce: when the v1.9 patch round
clears the Claude arbiter pass.

The release closes every action item the four-AI peer review of v1.7
(Microsoft Copilot, DeepSeek, Mistral Le Chat, Grok) and the five-AI
panel of v1.8 (the four above + ChatGPT) marked as `should land
before 2.0`.

### v1.8 -> v1.9 patches (closed in v1.9.0)

All of the following landed in v1.9.0 (commits in `nac-spec`
main tagged 2026-05-08):

- **Sec 3.1** `data-nac-skip-reason` REQUIRED when `data-nac-validate=
  "skip"` is set. Format: `<category>[;remediate-by=YYYY-MM-DD][;tracker=
  <id>]`. Validator emits `skip_without_reason` (error at NAC-3) and
  `skip_remediation_overdue` (warn) when the date has passed.
- **Sec 3.1** ARIA bridge for `data-nac-a11y-hint`. Runtime mounts a
  hidden `aria-live` region and appends per-element hint text via
  `aria-describedby` so screen readers consume hints today, without
  waiting for vendors to learn NAC.
- **Sec 3.1** `data-nac-braille-label` for refreshable braille
  displays. Surfaced by `NAC.describe()`/`find()` as `braille_label`.
- **Sec 6.2.27** Normative performance budget table: validate <= 50ms
  for 1000 elements, describe <= 30ms, _emit overhead <= 0.5ms per
  event. `NAC.perf_probe()` produces a structured timing report.
- **Sec 6.2.27** `validate_event_conformance` and
  `check_canonical_shape` enforce ProvenanceBlock presence
  (`source.type` in `'user' | 'agent' | 'script'`).
- **Sec 6.2.30** Reason taxonomy extended: `aria_busy`, `inert`,
  `readonly`.
- **Sec 6.2.32 NEW** `nac:action:confirm:requested` /
  `:granted` / `:denied` event family. `NAC.confirm_action(action_id,
  opts)` and `NAC.set_confirm_handler(fn)` runtime API. NAC-3
  conformant pages MUST route any action with `irreversible` /
  `requires_confirmation` / `data_loss` hint through this flow.
- **Sec 6.2.33 NEW** Action `undoable` flag in manifest. Surfaced on
  `describe()`/`find()` output. `NAC.action_undoable(action_id)` and
  `NAC.action_undo_window_ms(action_id)` runtime API.
- **Sec 7.3.2** Drift tolerance window 200 ms (configurable) to avoid
  false positives on React 18 / Vue 3 / Svelte 5 hydration.
- **Sec 7.3.3** Normative ARIA-to-NAC mapping table:
  `aria-disabled`, `aria-busy`, `aria-hidden`, `aria-readonly`,
  `inert` -> `nac:command:rejected` reasons.
- **Sec 7.3.4** Worked examples (combobox, modal, datagrid, accordion,
  tabs).
- **Sec 13.4** Drag-type case-insensitive + whitespace-trimmed
  matching.
- **Sec 13.4.1 NEW** Drag-type registry. 24 canonical type patterns
  (`text/*`, `image/*`, `application/json+card`, `card/<slug>`,
  `row/<entity>`, `file/<ext>`, `tag`, `note`, `event`,
  `chart-series`, `tree-node`). Validator emits `drag_type_unknown`
  warning for ad-hoc types so cross-app interop is preserved.
- **Sec 13.10 NEW** Test harness utilities normative:
  `NAC.assert_event_fired`, `NAC.assert_event_count`,
  `NAC.perf_probe`.
- **Sec 13.11 NEW** Event replay buffer (informative).
  `window.__NAC_PENDING__` array, `NAC.replay_pending(buffer)` helper,
  runtime auto-replays at install.
- Codemod (`tools/migrate-legacy-events.js`) extended with
  `--inject-source-script` flag that scans `NAC.click()` /
  `fill()` / `drag_drop()` / `expand()` / `sort()` / `set_slider()` /
  `go_to_section()` call sites that lack `opts.source` and injects
  `{ source: { type: 'script' } }`.

---

## v2.1 (deferred from v1.8/v1.9 panel)

These items are valuable but did NOT block the v2.0 announce. They
land as a single MINOR release within ~3 months of v2.0.

- **Provenance authenticity**: optional HMAC signing of
  `source: { type: 'agent', tool, ... }` so an audit pipeline can
  verify the agent identity is not forged. Spec extension to
  ProvenanceBlock + reference helpers `NAC.sign_provenance(detail,
  key)` and `NAC.verify_provenance(detail, key)`.
- **Hierarchical provenance chains**: support for nested delegation
  (`browser-extension -> local-orchestrator -> cloud-agent`) via
  `source.parent` recursive field. ChatGPT v1.8 finding.
- **Capability/version negotiation**: plugin manifests declare their
  required `nac_version_range`, host runtime validates compatibility
  before mounting, plugin can declare optional capabilities the host
  may not have. ChatGPT v1.8 finding.
- **Cross-origin iframe support**: `postMessage` wrappers for
  `nac:*` events with origin allowlist. New sec 14. DeepSeek v1.8
  finding.
- **Framework integration guides** (React / Vue / Svelte): worked
  hooks + examples + common patterns. DeepSeek + Grok + ChatGPT
  v1.8 finding.
- **Independent interoperability test suite**: separate repo /
  package containing canonical scenarios that any NAC runtime must
  pass. ChatGPT v1.8 finding.
- **Manifest attention profile**: presets (`high_contrast`,
  `reduced_motion`, `extended_pulse_duration`) declared per plugin
  manifest, runtime applies the matching CSS custom properties
  automatically. Mistral + Grok + Copilot v1.8 finding.
- **`prefers-contrast` media query integration** for the focus
  pulse + section-visited highlight CSS (sec 7.6).
- **`data-nac-confirmation-message`** i18n key for standardised
  interposition text. Grok v1.8 finding.
- **`session_boundary` and `audit_required`** added to the
  `data-nac-a11y-hint` vocabulary. DeepSeek v1.8 finding.
- **Hint priority ordering normative**: spec rule for which hint
  takes precedence when multiple apply (currently advisory in
  AUTHORING_PATTERNS.md sec 3.1; promote to normative in v2.1).
- **`emit_dual` polyfill** for older NAC runtimes (gradual rollout).
- **Runtime warning** when a legacy event fires without a canonical
  counterpart (helps catch incomplete migrations).
- **CI dashboard / reporting tool** for conformance results.

---

## v2.x (post v2.1, no fixed date)

Items that are interesting but not yet shaped into normative spec.

- **Guided task flows**: declarative multi-step task primitives with
  step dependencies, reversible checkpoints, interruption recovery.
  ChatGPT v1.8 finding for cognitive disability accommodations.
- **Closed shadow root NAC.reset()**: re-open the closed-shadow-DOM
  scope decision (currently out of scope per sec 7.4) with a
  postMessage bridge pattern.
- **Standardised remediation conventions** for `nac:command:rejected`
  reason codes: a normative table mapping each reason to the
  recommended next action (retry/backoff, requery collection,
  request user confirmation, etc).
- **Performance benchmarks for very large pages** (10K+ elements).
- **Mobile NAC**: data-nac-* on React Native, Flutter, native iOS /
  Android via accessibility API bridges. Currently web-only.
- **Test harness extensions**: visual regression baseline for
  attention signals, screen-reader fixture runners.

---

## Yujin Framework (parallel product, separate repo)

The first enterprise-grade implementation of NAC v2.0 is **Yujin
Framework**, a commercial development framework that ships in
parallel with NAC v2.0's public announce. Yujin Framework is a
separate product with a separate repo (TBD); this section is
informative for NAC adopters who want to know what the reference
adopter is building.

**Scope (Yujin Framework v1.0):**
- Full NAC-3 strict compliance built in. Every primitive emits
  canonical events with ProvenanceBlock by default.
- Per-tenant **DESA + UAT + PROD** environments with separate
  databases provisioned at instance creation.
- Per-tenant **MAIN repo** (the tenant's code is theirs).
- Configuration assistant (AI-driven) that generates **NAC-3 strict
  compliant** UI / workflow / forms; runs the conformance test in
  CI and autofixes when needed.
- Automated dev -> test -> prod pipeline with **100% coverage** and
  **explicit user approval** before production cut-over.
- Integrated payment via **MercadoPago** (Stripe arrives later for
  non-LatAm markets).
- Public marketing site refined for the framework sale.

**Out of scope (Yujin Framework v1.0):**
- Tenant administration, billing, dunning, subscription management,
  catalogue marketplace -- these live in the **Yujin parent**
  (the existing yujin.app instance hosted on GoDaddy PROD), which
  acts as the operator console for the framework.

**Catalogue model (informative):**
- Catalogues live in the Yujin parent and are sold as **purchasable
  bundles**. The "Activate" button in the parent shows a description
  of the bundle's capability + opens a payment flow; on payment
  success, the bundle is downloaded into the tenant's instance.
- Catalogues developed BY the tenant (in their Yujin Hijo) are
  **owned by the tenant** -- their property, not Yujin parent's.
  Two distinct license terms apply:
  - **Purchased bundles**: perpetual license, source available, no
    redistribution.
  - **Tenant-developed catalogues**: 100% tenant ownership,
    MIT-equivalent in spirit.
- These terms will be formalised in a public licensing document
  before the v1.0 announce.

**Legal framework (REQUIRED before commercial launch):**
- Master service agreement (MSA) for Yujin Framework subscribers
  covering: scope of service, uptime SLA, data handling, payment
  terms, termination, IP ownership of tenant code, ownership of
  purchased bundles, indemnity, limitation of liability.
- Disclaimer of responsibility (deslinde de responsabilidades)
  signed formally by every user before instance provisioning. The
  user MUST accept the agreement explicitly via UI checkbox +
  signature; instance creation does not proceed without it.
- These documents are framework-specific and live in the framework
  repo; they are NOT NAC spec items. NAC remains MIT-licensed and
  vendor-neutral.

**Release coordination:**
- NAC v2.0 announces first as the public spec.
- Yujin Framework v1.0 announces 6-12 weeks later as the first
  production-grade NAC v2.0 reference implementation.
- Staggered announces (rather than simultaneous) so a delay in the
  framework does not delay the spec's public availability.

**Why this matters for NAC adopters**: Yujin Framework will
publish its conformance-test results, its bundle catalogue, and
its assistant's NAC-3 generation patterns as informative reference
material. Other framework authors targeting NAC compliance can
study them as a worked example without licensing the framework
itself.

---

## How to influence the roadmap

- File issues at github.com/pkuschnirof/nac-spec/issues with the
  label `roadmap`.
- Submit a peer review against the current release (the prompt
  template is in `PromptEvaluacion3.txt` style).
- Send a worked patch under MIT.

The roadmap is updated on every minor release.

---

## Versioning policy

- **MAJOR**: breaking changes to public API or attribute semantics.
  Existing NAC-3 plugins MUST be re-audited.
- **MINOR**: new pillars / roles / attributes / events added without
  breaking existing plugins. Existing NAC-3 plugins remain valid.
- **PATCH**: clarifications, doc updates, runtime bug fixes, test
  additions. No public-API change.
