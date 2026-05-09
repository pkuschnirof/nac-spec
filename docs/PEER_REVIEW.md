# Independent Peer Review Pass

NAC v1.9.0 is the result of an iterative review-and-respond cycle
across six independent AI systems. This document records each
reviewer's verdict, the items they flagged, and the spec/runtime
section that closed each item.

This file is the public, link-able evidence of NAC's review history.
If you are evaluating NAC for adoption and want to know whether the
contract has been stress-tested by parties outside the author, this
is where to look.

**License of this document:** MIT, same as the spec.

---

## Why this review process

NAC's primary beneficiary is a human with a disability whose access
to a UI depends on the contract being right. The cost of "wrong" is
not a CI failure -- it is a user locked out of a system they need.
A small spec written by a single author cannot earn the trust that
contract requires.

Six independent AI reviewers were asked the same structured prompt
across two rounds (v1.7 -> v1.8 in late April 2026, v1.8 -> v1.9 in
early May 2026). Each was given the full normative spec, the
reference runtime source, the reference demo, and the prior
reviewer comments. Each was asked the same closing question:

> *Can NAC be announced as v2.0 today, or does something specific
> block it?*

Each reviewer's verdict + their flagged items + the v1.9 spec
section that addressed each item is recorded below. The author's
work was to respond to every item the panel marked
`should-land-before-2.0` and either close it or document a
justified deferral to v2.1.

---

## Round 1: v1.7 -> v1.8 four-AI panel (April 2026)

The v1.7 round used four reviewers. The aggregate produced ~15
action items; 8 landed in v1.8.0. The remaining 7 were carried into
the v1.8 -> v1.9 round below.

(Round 1 detail is in spec history; the relevant claims are the
v1.8 baseline this document audits.)

---

## Round 2: v1.8 -> v1.9 five-AI panel (May 2026)

The v1.8 round added ChatGPT to the four v1.7 reviewers. Each
reviewer was given v1.8 spec + runtime + the prompt
`PromptEvaluacion3.txt` (in the repo) and produced a structured
review across 10 tasks (T1..T10). The closing-recommendation lines
below are direct quotes; the items are paraphrased with normative
references to where each landed in v1.9.

### DeepSeek (Pensamiento Profundo)

**Position on v2.0 readiness:** *"yes, but with ARIA drift
tolerance window and inert preflight"* -- announce v2.0 after
adding those two items (estimated 40 hours of work). Without them,
teams will abandon after the first ARIA false positive on a
React/Vue app.

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| ARIA drift tolerance window (200ms) | **CLOSED** -- sec 7.3.2 |
| `inert` ancestor preflight | **CLOSED** -- sec 7.3.3 (`inert` -> `nac:command:rejected` reason=`inert`) |
| Performance benchmark normative | **CLOSED** -- sec 6.2.27 perf budget table |
| Test harness for custom plugins | **CLOSED** -- sec 13.10 (`assert_event_fired`, `assert_event_count`, `perf_probe`) |
| `data-nac-braille-label` for refreshable braille displays (deaf-blind population) | **CLOSED** -- sec 3.1 |
| Drag-type case-insensitive matching | **CLOSED** -- sec 13.4 + sec 13.4.1 drag-type registry |
| `prefers-contrast: more` media query for focus pulse | **CLOSED** -- sec 7.6 |
| Hint priority normative ordering | **CLOSED** -- sec 3.1 (9-entry order + `sort_hints_by_priority`) |
| Cross-origin iframe support | **DEFERRED to v2.1** |

DeepSeek's deaf-blind recommendation (line 511 of the v1.8 review)
is the highest-leverage single line in the panel: it identified
deaf-blind users as a population that the v1.8 contract did not
serve at all, and proposed a 20-line runtime fix. v1.9 ships it.

### ChatGPT

**Position on v2.0 readiness:** *"yes, I would recommend NAC v1.8.0
today for enterprise apps serving users with motor or cognitive
disabilities, particularly where voice control or AI delegation
matters. The contract is no longer just 'automation-friendly'; it
is becoming meaningfully auditable. The remaining risks are
ecosystem discipline and governance, not conceptual viability."*

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| HMAC signing of `source` ProvenanceBlock | **CLOSED** -- sec 6.2.1 (`source.signature` + `sign_provenance`/`verify_provenance`) |
| Recursive `source.parent` for nested delegation chains | **CLOSED** -- sec 6.2.1 |
| `recommended_remediation` field on rejection events | **CLOSED** -- sec 6.2.30 (13-entry normative lookup table) |
| Action confirmation as wire-level event | **CLOSED** -- sec 6.2.32 `nac:action:confirm:{requested,granted,denied}` |
| Capability/version negotiation in manifest | **DEFERRED to v2.1** (justification: needs careful design to avoid breaking v1.x strict-superset invariant) |
| Framework integration guides (React/Vue/Svelte) | **DEFERRED to v2.1** (doc work, not blocking) |
| Independent interoperability test suite | **DEFERRED to v2.1** (separate repo) |

ChatGPT's three deferrals are the only deferrals where the
reviewer's explicit gate was *not* fully met by v1.9. The
v1.9 closing arbiter (Claude, below) accepted these deferrals as
defensible but flagged capability negotiation as the v2.1
critical-path item.

### Mistral Le Chat

**Position on v2.0 readiness:** v2.0-after-helper. Mistral's
position emphasised cognitive-accessibility primitives and
auditability, plus governance around `skip`. Closing
recommendation: *"add first-class support for 'guided task flows'
aimed at cognitive accessibility... declarative notion of step
dependencies, reversible checkpoints, or interruption recovery
would materially help users with executive-function variability
and AI-assisted delegation."*

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| ARIA bridge for `data-nac-a11y-hint` | **CLOSED** -- sec 3.1 (hidden `aria-live` region + `aria-describedby` append) |
| Drag-type registry (24 canonical patterns) | **CLOSED** -- sec 13.4.1 |
| ProvenanceBlock validation in conformance | **CLOSED** -- sec 6.2.27 |
| `attention_profile` manifest field with presets | **CLOSED** -- sec 13.5 (5 presets: default / high_contrast / reduced_motion / extended_pulse / maximum_salience) |
| `skip_no_remediate_date` validator finding (skip drifts permanent risk) | **CLOSED** -- sec 3.1 |
| Hint priority normative | **CLOSED** -- sec 3.1 |
| Guided task flows for cognitive disability | **DEFERRED to v2.x** (post v2.1, no fixed date -- not yet shaped into normative spec) |

### Grok Fast

**Position on v2.0 readiness:** *"Announce v2.0 after landing the 3
critical items above"* -- conditional yes. Of the v1.7 panel, Grok
had been the most-yes ("yes-with-patches"); v1.8 closed several of
his patches and v1.9 closed the remainder.

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| Drag-type registry | **CLOSED** -- sec 13.4.1 |
| ARIA bridge for a11y_hint | **CLOSED** -- sec 3.1 |
| `nac:action:confirm` wire-level event family | **CLOSED** -- sec 6.2.32 |
| `data-nac-confirmation-message` per-element override | **CLOSED** -- sec 3.1 |
| Action `undoable` flag for AI agents | **CLOSED** -- sec 6.2.33 (`action_undoable`, `action_undo_window_ms`) |
| `attention_profile` presets | **CLOSED** -- sec 13.5 |

Grok's `data-nac-confirmation-message` recommendation (line 1206
of v1.8 review) was the most-cited item across the panel because
it served voice-control users specifically: a localized, declared
confirmation message that voice tools and AI agents could read
directly without the host re-implementing for every action.

### Microsoft Copilot

**Position on v2.0 readiness:** *"I would recommend NAC v1.8.0 for
an enterprise team building for motor/cognitive disabilities
provided the team commits to (a) a short retrofit plan for
provenance and stable IDs, and (b) governance around
data-nac-validate='skip' usage; otherwise the contract's benefits
will be diluted."* -- conditional yes contingent on adopter
discipline + spec-side hardening on provenance authenticity and
skip governance.

**Items flagged + status in v1.9:**

| Item | Status |
|---|---|
| Machine-readable skip justification (`data-nac-skip-reason`) | **CLOSED** -- sec 3.1 (REQUIRED at NAC-3 with categories + remediate-by date) |
| Provenance authenticity (HMAC) | **CLOSED** -- sec 6.2.1 (HMAC-SHA256 + constant-time compare) |
| ARIA-to-NAC mapping table normative | **CLOSED** -- sec 7.3.3 |
| Replay buffer for events fired before NAC loads | **CLOSED** -- sec 13.11 (`window.__NAC_PENDING__` + `replay_pending`) |
| `attention_profile` preset (cross-flagged with Mistral + Grok) | **CLOSED** -- sec 13.5 |
| CI dashboard / reporting tool | **DEFERRED to v2.1** |

Copilot's `data-nac-skip-reason` line (line 1325 of v1.8 review)
was, like DeepSeek's braille label, a single-line recommendation
that fundamentally changed the contract: skip without justification
becomes a permanent escape hatch, so v1.9 promotes
`data-nac-skip-reason` to REQUIRED at NAC-3 with a normative
category list and an optional `remediate-by=YYYY-MM-DD` token. The
validator emits both `skip_without_reason` (error) and
`skip_no_remediate_date` (warn).

---

## Round 3: v1.9 Closing Arbitration -- Claude (May 2026)

After the five v1.8 panel reviews + author response cycle landed
in v1.9.0 (commit `185c7df` on the `nac-spec` repo, tag `v1.9.0`),
a closing arbitration pass was run with Claude. The arbiter was
given the full v1.8 panel reviews + the v1.9 delta + the prompt
`PromptEvaluacion4_Claude.txt` (in the repo). The arbiter's role
was to determine whether the panel's gates had been met and
whether v2.0 could announce.

**Verdict (verbatim):** *"Conditional YES -- v2.0 can announce
within the next week, with disclosures and a verifiable release
tag... The v1.8 panel's bars are met or defensibly justified-
deferred. The 22 closed items in v1.9 trace cleanly to specific
reviewer findings; nothing was closed by relabeling. The deferred
items are real gaps but each has a stated reason that holds up.
Veto: NOT EXERCISED."*

**Scores per axis (closing pass):**

| Axis | Score | One-line |
|---|---|---|
| Spec clarity | 8/10 | Each section has rationale + reviewer attribution |
| AI/test tooling utility | 9/10 | Test harness + replay + perf_probe + provenance is a complete primitive set |
| Adoption ease (typical web team) | 6/10 | Real cost; rewards design-system discipline, punishes its absence |
| Ambition vs feasibility | 7/10 | 22+ items in one round is a lot |
| Public 2.0 readiness | 8/10 | If evidence reflects HEAD: ready with disclosures |

**Aggregate of v1.8 panel verdict audit (per Claude arbiter):**

- DeepSeek: bar **fully met**.
- ChatGPT: bar **partially met** with stated justification (capability negotiation, framework guides, interop suite all deferred to v2.1 with defensible reasons).
- Mistral: bar **fully met**.
- Grok: bar **fully met**.
- Microsoft Copilot: bar **fully met**.

**Required before announce (3 conditions):**

1. **`git tag v1.9.0`** on commit `185c7df`. Without a tag,
   "v1.9.0 is on main" is unverifiable for any reviewer hitting raw
   URLs through different CDN edges. **DONE** (tag pushed).
2. **Disclose v2.1 deferrals in the announce.** Specifically:
   capability/version negotiation, cross-origin iframes, framework
   integration guides, independent interop test suite, CI dashboard.
3. **Disclose limitations honestly.** Single reference
   implementation (no second-party port yet), perf budget validated
   only against synthetic 1000-element fixture, conformance
   verified via self-test only.

**Substantive concerns deferred to v2.1 priorities (per arbiter):**

1. **HMAC signing should become MANDATORY at NAC-3** for events
   with `source.type === 'agent'`. v1.9 ships the helpers
   (`sign_provenance`, `verify_provenance`) but the spec keeps
   signing optional. The arbiter's argument: *"An audit pipeline
   that accepts unsigned `source: { type: 'agent' }` is back to
   where it started... For users in regulated environments
   (healthcare, finance, legal -- exactly the populations the
   `audit_required` hint serves), this is the gap that swallows
   the rest of the work."* **Critical-path for v2.1.**
2. **Second independent runtime implementation.** Without it,
   "spec" reduces to "what the reference impl does." Without a
   second party port, the contract has not been validated as
   independently implementable.
3. **`aria-haspopup` and `aria-current` in the ARIA-to-NAC mapping
   table** (sec 7.3.3 extension).
4. **`undo_window_ms` REQUIRED when `undoable=true`** (sec 6.2.33
   tightening).

---

## Aggregate

**Six independent reviewers across two rounds + one closing
arbitration pass produced 30+ action items. v1.9.0 closed 22+ of
them. 5 are explicitly deferred to v2.1 with stated reasons. 1
deferred to v2.x (post v2.1, no date -- guided task flows for
cognitive disability).**

**Reviewer-attributed closures in v1.9:**

| Reviewer | Items closed in v1.9 |
|---|---|
| DeepSeek | drift window, inert preflight, perf budget, test harness, braille label, drag case-insensitive, prefers-contrast, hint priority |
| ChatGPT | HMAC signing, source.parent chains, recommended_remediation, confirm event family |
| Mistral | ARIA bridge, drag-type registry, ProvenanceBlock conformance, attention_profile, skip_no_remediate_date warn, hint priority |
| Grok | drag-type registry, ARIA bridge, confirm event, confirmation-message, undoable flag, attention_profile |
| Microsoft Copilot | skip-reason REQUIRED, HMAC, ARIA-NAC mapping, replay buffer, attention_profile |
| Claude (arbiter) | tag verification, disclosures honest, conditional-yes verdict |

---

## Round 3: v1.9 -> v2.0 review (in progress, May 2026)

This round reviews `v2.0.0-rc1` (commits f251a32 + ec0d305 +
9350339 on `main`). The prompt is `PromptEvaluacion5.txt` (URL-fetch
variant) and `PromptEvaluacion5_Inline.txt` (embedded-bundle variant
for reviewers that cannot fetch raw URLs).

**Operational note**: at the time of this writing only Grok 4 was
able to fetch + read the 14 required documents. The remaining
panellists (DeepSeek, ChatGPT, Mistral Le Chat, MS Copilot, Claude
arbiter) reported inability to fetch the canonical raw URLs. The
inline-bundle prompt was created to unblock that -- same review
contract, documents embedded.

### Grok 4 (Fast Model) -- 2026-05-09

**Verdict:** `yes-with-conditions`.
**Score axes:**
- Spec clarity: 9/10
- AI/test tooling: 8/10
- Adoption ease: 7/10 (improved from Claude's 6/10 in v1.9 closing
  via the new primitives)
- Ambition vs feasibility: 8/10
- v2 announce ready: 8/10

**One-liner:** *"Strong v2.0-rc1 with excellent primitives and
security hardening; address WebView quirks, i18n strictness, and
tooling gaps for tag."*

**Findings flagged (3 conditions; zero blockers):**

| ID | Severity | Code | Source |
|---|---|---|---|
| T4-F1 | high | `istrusted_webview_quirks` | scope doc 130-136 + spec 285-288 |
| T5-F1 | medium | `i18n_strict_incremental` | i18n guide 100-109 + spec 352 |
| T7-F1 | high | `tooling_gaps_frameworks` | packages/README + roadmap 173-184 |

**T4-F1 (high)**: `event.isTrusted` derivation is mostly correct
for standard browsers but mobile WebView contexts (Cordova,
Capacitor, React Native WebView), assistive tech polyfills, and
synthetic event runners can produce inconsistent values. Suggested
fix: explicit guidance in spec sec 15.10 + fallback path for
known-good assistive tech (Talon, Voice Access, OS-level Computer
Use) in the enforcement matrix.

**T5-F1 (medium)**: NAC-3 default of `error` severity on missing
locale blocks incremental SaaS rollouts where languages are added
one-at-a-time after launch. Suggested fix: default to `warn` at
NAC-3 for missing locales, with opt-in to `error` via
`set_validation_tolerance({i18n_strict: 'error'})`. Tightening
remains available; the gate moves from default to opt-in.

**T7-F1 (high)**: Tooling skeleton list (9 packages) misses
Solid / Qwik / Lit / Web Components frameworks; Storybook /
Playwright / Cypress integrations; telemetry exporters
(Sentry / Datadog / OpenTelemetry); VSCode language server for
manifest schema validation. Suggested fix: prioritise these in
phase 4 or roll into v2.0.1 patch series.

**T11 answer to Q11 (i18n L1 vs L2)**: keep L1 (strong
recommendation; L2 would bloat NAC and conflict with established
i18n libraries).

**Demo evaluation**: source-only structural confirmation (Grok
runtime could not interactively navigate the live demo). 10
locales + CJK/RTL structurally covered.

**Additional observation from Grok**: Yujin case study template is
honest but should be populated before final tag for credibility.

**Author response to Grok's three conditions**:

- **T4-F1**: ACCEPTED. Spec sec 15.10 + scope doc sec 4b will be
  extended with a non-normative annex listing tested assistive
  tech behaviour + WebView quirks. Action item recorded for v2.0
  pre-tag patch.
- **T5-F1**: ACCEPTED with refinement. Default NAC-3 i18n severity
  becomes `warn` with opt-in to `error`; this matches the v1.9
  pattern for `data-nac-skip-reason` (warn at NAC-3 by default,
  error opt-in). Spec sec 15.11 to be updated.
- **T7-F1**: PARTIALLY ACCEPTED. Solid/Qwik/Lit + Storybook +
  Playwright + telemetry + VSCode LS will be added to roadmap
  phase 4 + roadmap phase 5.5 (post-tag patch series). Without
  these v2.0 ships as adoptable but not maximally ergonomic for
  every framework -- that is acceptable for the tag if we
  document the gap honestly in the v2.0 announce.

These three findings + author responses are now part of the v2.0.0
release evidence. Verbatim Grok response retained in
`docs/peer-review-round3-grok.txt`.

### Mistral AI Le Chat -- 2026-05-09

**Verdict:** `yes-with-conditions`.
**Score axes:**
- Spec clarity: 9/10
- AI/test tooling: 8/10
- Adoption ease: 7/10
- Ambition vs feasibility: 8/10
- v2 announce ready: **7/10** (one notch lower than Grok at 8)

**One-liner:** *"NAC v2.0 is a strong, well-designed evolution
with robust primitives and a clear vision, but requires minor
adjustments to tooling, performance targets, and adoption claims
before announcement to avoid overpromising."*

**Findings flagged (13 findings; zero blockers; 5 high, 6 medium,
2 low):**

| ID | Severity | Code | Concurs with Grok? |
|---|---|---|---|
| T2-F1 | high | `missing_second_tightening_change` | NEW (Grok did not catch) |
| T2-F2 | medium | `provenance_block_field_addition` | NEW |
| T4-F1 | medium | `mobile_webview_attestation_gap` | YES (Grok T4-F1 high) |
| T4-F2 | low | `os_level_agent_attestation` | NEW |
| T5-F1 | medium | `gettext_format_gap` | NEW |
| T5-F2 | high | `i18n_strict_too_aggressive_at_nac3` | YES (Grok T5-F1 medium; Mistral elevates) |
| T6-F1 | high | `mutationobserver_throttle_too_low` | YES (Grok T6-F1 medium; Mistral elevates) |
| T6-F2 | medium | `describe_perf_budget_too_tight` | NEW (specific numbers) |
| T7-F1 | high | `missing_framework_support` | YES (Grok T7-F1 high; same Solid/Qwik/Lit) |
| T7-F2 | high | `missing_testing_integrations` | YES (Grok mentioned; Mistral specifies Playwright/Cypress/Storybook) |
| T7-F3 | medium | `missing_telemetry_export` | YES (Grok mentioned; Mistral specifies Sentry/Datadog/OTel) |
| T7-F4 | low | `vscode_language_server_missing` | YES (Grok mentioned) |
| T8-F1 | high | `convergence_timeline_overly_optimistic` | DISPUTE (Grok said "defensible"; Mistral says "weak" + extend 3-5y) |
| T9-F1 | medium | `boilerplate_reduction_overstated` | NEW (Mistral disputes the 5200-line claim) |

**Cross-reviewer concurrence on key issues**:

1. **WebView quirks (Grok T4-F1 + Mistral T4-F1)**: both reviewers
   independently flag mobile WebView (Cordova/Capacitor/RN) as
   needing explicit guidance + fallback. Mistral additionally
   proposes `NAC.setMobileWebViewAttestation(fn)` hook.

2. **i18n_strict default too aggressive (Grok T5-F1 medium ->
   Mistral T5-F2 high)**: both agree on the concern; Mistral
   elevates severity to high and proposes EITHER opt-in via
   `set_validation_tolerance({i18n_strict:'warn'})` OR introducing
   a NAC-4 level for full strictness.

3. **MutationObserver throttle 50ms (Grok T6-F1 medium ->
   Mistral T6-F1 high)**: both agree throttle is too low; Mistral
   elevates and proposes 100ms default + tunable
   `set_perf_tolerance({mutation_throttle_ms:n})`.

4. **Tooling gaps (Grok T7-F1 + Mistral T7-F1/F2/F3/F4)**:
   complete concurrence. Mistral itemises more specifically:
   Solid + Qwik + Lit (frameworks), Playwright + Cypress +
   Storybook (testing), Sentry + Datadog + OTel (telemetry),
   VSCode LS (IDE).

**Mistral findings NOT in Grok review (NEW)**:

- **T2-F1 missing_second_tightening_change (high)**: the RFC
  claims one tightening change at NAC-3 (HMAC) but spec sec
  15.12 makes i18n_strict mandatory at NAC-3 too. The author's
  strict-superset claim should explicitly list BOTH. Easy fix in
  RFC sec 11.1 + spec sec 15.14 + CHANGELOG.

- **T2-F2 provenance_block_field_addition (medium)**: v2.0 adds
  fields to ProvenanceBlock (`user_gesture_attested`, `signature`,
  `signature_chain`, `os_level`). Additive, but v1.9 clients
  doing strict shape validation may break. Easy fix: add explicit
  note in spec 15.14 that v1.9 clients MUST tolerate unknown
  fields.

- **T6-F2 describe_perf_budget_too_tight (medium)**: specific
  Svelte compiler benchmarks suggest 30ms target for 1000
  elements is unachievable on low-tier mobile 2026; Mistral
  proposes 50ms target / 150ms hard-fail. Concrete numbers.

- **T9-F1 boilerplate_reduction_overstated (medium)**: the
  "5200 lines eliminated for 50 components" claim in scope doc
  appendix A implies 104 lines/component, which Mistral calls
  implausible. Realistic estimate: 20-30 lines/component =
  1000-1500 total. Author should revise to a verifiable number
  cited from Yujin case study post-migration.

**Mistral findings DISPUTING Grok**:

- **T8-F1 convergence_timeline (Mistral high vs Grok "defensible")**:
  Mistral argues ARIA had W3C + browser backing + WCAG legal
  mandates; NAC has none of those. Proposes extending timeline
  to 3-5 years + contingency: if no major vendor by 2029, invest
  in `@nac-spec/rules-*` as first-class (not community-curated).

**Author response to Mistral's findings**:

- **T2-F1 (high)**: ACCEPTED. Genuinely missed by Sumi. RFC sec
  11.1 + spec sec 15.14 + CHANGELOG to be updated explicitly
  acknowledging both NAC-3 tightening changes. Pre-tag patch.
- **T2-F2 (medium)**: ACCEPTED. Spec sec 15.14 to add explicit
  note about v1.9 client tolerance of unknown ProvenanceBlock
  fields. Pre-tag patch.
- **T4-F1 (medium)**: ACCEPTED (already accepted from Grok).
  Mistral additionally proposes `NAC.setMobileWebViewAttestation(fn)`
  hook -- evaluating; lean toward including in v2.0 but may
  defer impl to v2.0.x.
- **T4-F2 (low)**: ACCEPTED. Add `source.os_level` optional
  metadata field to ProvenanceBlock + matrix row for OS-level
  agents in spec sec 15.10.
- **T5-F1 (medium)**: ACCEPTED for documentation. Add gettext
  bridge guidance to I18N_INTEGRATION_GUIDE.md sec 7.5; CLI
  conversion tool deferred to `@nac-spec/codemod` phase 4.
- **T5-F2 (high)**: ACCEPTED with refinement. Default NAC-3
  i18n severity becomes `warn`; opt-in to `error` via
  `set_validation_tolerance`. NAC-4 level deferred to v2.1+.
- **T6-F1 (high)**: ACCEPTED. Throttle default 100ms; tunable
  via `set_perf_tolerance({mutation_throttle_ms:n})`.
- **T6-F2 (medium)**: ACCEPTED. Perf budget revised: describe()
  target 50ms / hard-fail 150ms; adopt hard-fail 20ms;
  autoRegister throttle 100ms.
- **T7-F1/F2/F3/F4 (high/high/medium/low)**: ACCEPTED. Tooling
  ecosystem expansion list confirmed. Solid/Qwik/Lit + Playwright
  + Sentry telemetry interface land in phase 4. Cypress +
  Storybook + Datadog + OTel + VSCode LS to v2.0.x patches.
- **T8-F1 (high)**: ACCEPTED. Convergence timeline extended in
  scope doc to 3-5 years. Contingency plan added: if no major
  vendor adopts by 2029, `@nac-spec/rules-*` becomes first-class
  spec-repo concern (not just community).
- **T9-F1 (medium)**: ACCEPTED. Author revises boilerplate
  reduction claim to verifiable range "1000-1500 lines for a
  50-component app", with final number TBD from Yujin case study
  post-migration (phase 5.5).

Verbatim Mistral response retained at
`docs/peer-review-round3-mistral.txt`.

### Round 3 -- closed concurrent conditions (rc1 -> rc2, 2026-05-09)

Per author decision (option 2 of three options), conditions raised
**concurrently** by Grok 4 + Mistral Le Chat are closed in
v2.0.0-rc2. Conditions raised by only one reviewer remain open
until a second reviewer concurs or disputes (arbitrage path).

| Concurrent condition | Closed in rc2 via |
|---|---|
| T4-F1 mobile_webview_attestation_gap | `setMobileWebViewAttestation(fn)` runtime hook + spec annex sec 15.10 with platform-behaviour table |
| T5-F1+F2 i18n_strict default too aggressive | Default severity `error` -> `warn` at NAC-3; opt-in to `error` via `set_validation_tolerance({i18n_strict: 'error'})`. Spec sec 15.12 + I18N_INTEGRATION_GUIDE.md sec 2.3 updated. |
| T6-F1 mutationobserver_throttle_too_low | Default 50ms -> 100ms; tunable via `set_perf_tolerance({mutation_throttle_ms: <n>})`. Spec sec 15.13. |
| T7-F1 missing_framework_support | 5 new package skeletons: `solid-plugin`, `qwik-plugin`, `lit-preprocessor`, `playwright-fixture`, `telemetry`. Roadmap phase 4 expanded. |

Plus T6-F2 (Mistral solo, perf budget tightness) absorbed into
the same rc2 perf budget revision since it was the same area.

### Round 3 -- conditions held open (awaiting arbitrage)

| Open condition | Severity | Reviewer | Held until |
|---|---|---|---|
| T2-F1 missing_second_tightening_change | high | Mistral solo | second reviewer concurs |
| T2-F2 provenance_block_field_addition | medium | Mistral solo | second reviewer concurs |
| T8-F1 convergence_timeline_overly_optimistic | high | Mistral high vs Grok "defensible" | DISPUTE -- third reviewer breaks tie |
| T9-F1 boilerplate_reduction_overstated | medium | Mistral solo | Yujin migration produces real numbers (phase 5.5) |

### DeepSeek-V3 -- 2026-05-09

**Verdict:** `yes-with-conditions`.
**Score axes:**
- Spec clarity: 9/10
- AI/test tooling: 8/10
- Adoption ease: 7/10
- Ambition vs feasibility: 8/10
- v2 announce ready: **8/10** (matches Grok; one notch above Mistral)

**One-liner:** *"La base contractual de v2.0 es solida y segura;
la adopcion practica depende de cerrar los gaps de tooling y
afinar la gestion de isTrusted antes del tag."*

**Findings flagged**: 12 findings; zero blockers; 1 high, 9 medium, 2 low.

**Concurrencias clave con Grok + Mistral**:

- **T4-F1 isTrusted context inconsistencies (high)** -- CONCURRE
  con Grok T4-F1 high + Mistral T4-F1 medium. **3/3 reviewers
  flag the issue**. Already closed in rc2 with
  `setMobileWebViewAttestation` hook + spec sec 15.10 annex.
- **T5-F1 i18n_strict default too aggressive (medium)** --
  CONCURRE con Grok T5-F1 medium + Mistral T5-F2 high. **3/3**.
  Already closed in rc2 (default `warn` + opt-in `error`).
- **T7-F1 tooling gaps (high)** + **T7-F2 codemod_coverage_optimistic
  (medium)** -- CONCURRE con Grok T7-F1 high + Mistral
  T7-F1+F2+F3 high. **3/3**. Already closed in rc2 with 5 new
  tooling skeletons.
- **T8-F1 convergence_assumption_untested (medium)** -- CONCURRE
  con Mistral T8-F1 high (both say "weak"). **DISPUTE RESOLVED
  AGAINST GROK**: 2/3 reviewers (Mistral + DeepSeek) say "weak"
  vs Grok 1/3 says "defensible". Author MUST act on this.
- **T9-F1 adoption_cost_too_optimistic (medium)** -- CONCURRE
  con Mistral T9-F1 medium. **2/3**. Both reviewers explicitly
  note that 10h greenfield + 36h brownfield assume "tooling
  perfectly working + experienced team". DeepSeek proposes
  1.5x-2x first-adoption multiplier.

**DISPUTA RESOLVED -- T8-F1 convergence assumption**:

| Reviewer | Verdict | Severity |
|---|---|---|
| Grok 4 | "defensible" (ARIA precedent) | not flagged |
| Mistral Le Chat | "weak" -- ARIA had W3C + WCAG, NAC has none | high |
| DeepSeek-V3 | "weak" -- value prop for vendors not as clear as legal accessibility | medium |

**Verdict**: 2/3 majority says **WEAK**. Author MUST extend
convergence timeline 2-4 -> 3-5 years + add explicit contingency
plan + (per DeepSeek suggestion) proactive vendor outreach
effort in roadmap phase 5.5 or 6.

**Hallazgos NEW de DeepSeek (sin concurrencia aun)** -- runtime
bugs y doc gaps que ningun otro reviewer detecto:

| Finding | Severity | Type | Author response |
|---|---|---|---|
| T3.1 scope.slug empty string passes validation | low | runtime bug | ACCEPT-cheap-fix: add `slug.length === 0` check in `_validateLeaf` |
| T3.2 autoRegister orphan slug without parent scope | low | runtime gap | ACCEPT: emit `nac:autoregister_orphan_warn` event |
| T3.3 adopt + closed Shadow DOM silent fail | low | doc gap | ACCEPT: add note to spec sec 15.3 |
| T3.4 bridgeShadowRoot duplicate registration on repeat call | medium | runtime bug | ACCEPT: add WeakSet of bridged hosts |
| T3.5 bridgeIframe redirect/reload no-retry | medium | runtime gap | DEFER to v2.0.x (edge case, complex fix) |
| T3.6 declareVirtual idempotency not enforced | low | runtime gap | ACCEPT-doc: clarify in spec that resolver caller responsibility |
| T3.7 captureEphemeral toasts <100ms missed | low | known limitation | ACCEPT-doc only: add note to spec sec 15.7 |
| T6-F1 perf hard-fail 5%/5s too lax | medium | spec policy | DISPUTE OPEN: held for 4th reviewer |
| Q9 `data-nac-action` SHOULD vs MUST at NAC-3 | n/a (open question) | policy | DISPUTE OPEN: held for arbiter |
| adopt observe:true needs additional debounce | n/a (observation) | runtime perf | ACCEPT: implement in next runtime patch |

**Author response summary**:

- **6 NEW DeepSeek findings ACCEPT** (4 runtime bug fixes + 2 doc
  notes -- all cheap, schedule for rc3 patch).
- **2 NEW DeepSeek findings DEFER** to v2.0.x post-tag (complex).
- **2 DISPUTE OPEN** held for 4th reviewer (Claude arbiter or
  ChatGPT) to confirm or reject.
- **Convergence assumption (T8-F1) NOW ACTIONABLE** since
  2/3 reviewers concurrent on "weak". Pre-tag patch:
  - scope doc sec 6: timeline 2-4y -> 3-5y, add contingency
  - roadmap phase 5.5 or 6: proactive vendor outreach effort
- **Adoption cost (T9-F1) NOW ACTIONABLE** since 2/3 reviewers
  concurrent on "optimistic". Pre-tag patch:
  - scope doc appendix A: add 1.5x-2x first-adoption multiplier
  - revise "5200 lines eliminated" claim to verifiable range
    (Mistral T9-F1 also flagged this), final number from Yujin
    case study phase 5.5.

Verbatim DeepSeek response:
`docs/peer-review-round3-deepseek.txt`.

### CONCURRENCE MATRIX (3 reviewers complete: Grok + Mistral + DeepSeek)

The Round 3 verdict aggregates as follows. Conditions with 2/3 or
3/3 concurrence are author-actionable; conditions raised by 1
reviewer are held for arbitrage with a 4th reviewer.

| Condition | Grok | Mistral | DeepSeek | Concurrence | Status |
|---|---|---|---|---|---|
| isTrusted WebView quirks (T4-F1) | high | medium | high | **3/3** | CLOSED rc2 |
| i18n_strict default too aggressive | medium | high | medium | **3/3** | CLOSED rc2 |
| Tooling gaps (Solid/Qwik/Lit/Storybook/etc) | high | high+high+medium+low | high | **3/3** | CLOSED rc2 |
| MutationObserver throttle 50ms | medium | high | -- | **2/3** | CLOSED rc2 |
| describe perf budget tight | -- | medium | -- | 1/3 | CLOSED rc2 (absorbed in perf revision) |
| **Convergence assumption WEAK** (T8-F1) | "defensible" | high | medium | **2/3 (DISPUTE RESOLVED)** | OPEN -- ACT NOW |
| **Adoption cost OPTIMISTIC** (T9-F1) | -- | medium | medium | **2/3** | OPEN -- ACT NOW |
| OS-level agent metadata (T4-F2) | -- | low | medium | **2/3** | OPEN -- ACT NOW (cheap) |
| 2nd tightening (i18n_strict) (T2-F1) | -- | high | -- | 1/3 | OPEN -- await arbiter |
| ProvenanceBlock additive fields (T2-F2) | -- | medium | -- | 1/3 | OPEN -- await arbiter |
| 6 DeepSeek runtime bugs/gaps | -- | -- | low/medium | 1/3 | OPEN -- 4 ACCEPT (cheap) + 2 DEFER |
| perf hard-fail 5%/5s too lax (T6-F1 DS) | -- | -- | medium | 1/3 | OPEN -- await arbiter |
| `data-nac-action` SHOULD vs MUST (Q9 DS) | -- | -- | open Q | 1/3 | OPEN -- await arbiter |

### Claude-Opus-4.7 -- 2026-05-09 (closing arbiter)

**Verdict:** `yes-with-conditions` with **1 BLOCKER + 8 conditions**.
**Score axes:**
- Spec clarity: 7/10
- AI/test tooling: 8/10
- Adoption ease: 7/10
- Ambition vs feasibility: 7/10
- v2 announce ready: **7/10** (matches Mistral; one notch below Grok and DeepSeek)

**One-liner:** *"NAC v2.0 (rc2 in artifact, rc1 in prompt label) is
structurally sound and closes major Mistral/Grok concurrent
findings, but the gesture-buffer leak in the rc2 isTrusted
attestation runtime is a fourth impersonation path that nullifies
the user-attestation defence within 100ms of any user gesture and
must be fixed before tag."*

**THE BLOCKER -- T4-F1 gesture_buffer_leak_breaks_user_attestation**

This is the most consequential finding of the entire Round 3.
None of Grok, Mistral, or DeepSeek detected it. Author verified
it on 2026-05-09: the bug is real in
`js/nac-v2-extensions.js:158-188`.

**Bug**: `_captureGestureFromDom` captures `event.isTrusted` from
ANY click/keydown/touchstart on `document` into a single global
variable `_lastGestureTrusted` with a 100ms freshness window. The
`_readGestureAttested()` function checks only the time window, NOT
the identity of the originating element. When `_invoke(slug)` runs
within 100ms of any user gesture anywhere, it reads the leaked
`true` and accepts `source.type='user'` for ANY element the
attacker chooses.

**Cost-of-attack reduction**: from "kernel access or browser
exploit" (claimed in scope doc sec 4b) to "any script that can time
itself within 100ms of any user gesture" (trivial in practice).
This is a FOURTH impersonation path the threat model in sec 4b
does not cover.

**Why this is critical**: the v2.0 user-attestation defence (the
single most-load-bearing security primitive added in v2.0)
collapses to v1.9's "trust the declared source.type" baseline
during ~50% of any active user session. Audit pipelines accepting
`type='user' + attested=true` based on this leak are back where
v1.9 was -- which is exactly the gap the closing v1.9 arbiter
called critical-path.

**Fix scope**: ~30 LOC in runtime + 1-paragraph spec patch.
Strategy:
1. Capture not just `isTrusted` but also `e.target` and
   `e.composedPath()`.
2. In `_invoke(slug)`, verify that `entry.element` is in the
   captured composed path before honoring `attested`.
3. Drop `GESTURE_FRESH_MS` from 100ms to 16ms (one frame), or
   require synchronous handler chain from the originating event.

This finding is a blocker against tag. Author MUST fix in rc3
before any closing arbitration on a public release.

**8 CONDITIONS (high + medium)**:

| ID | Severity | Code | Concurrence |
|---|---|---|---|
| T2-F1 | medium | `changelog_missing_v1_7_through_v2_0_entries` | Claude solo (verified true) |
| T2-F2 | high | `provenanceblock_field_addition_unannounced` | Claude + Mistral T2-F2 = **2/4** |
| T2-F3 | high | `second_tightening_change_at_nac3_undisclosed` | Claude + Mistral T2-F1 = **2/4** |
| T4-F2 | medium | `bridgeIframe_no_handshake_signature` | Claude solo (real runtime bug) |
| T6-F1 | medium | `cumulative_batch_cost_unbudgeted` | Claude solo |
| T8-F1 | high | `convergence_timeline_arbitrage_breaker` | Claude TIE-BREAKS dispute: 3/4 weak (Mistral + DeepSeek + Claude) vs Grok defensible |
| T9-F1 | high | `yujin_case_study_unpopulated_blocks_brownfield_validation` | Claude solo + roadmap reads same way |
| T9-F2 | medium | `boilerplate_5200_lines_implausible` | Claude + Mistral + DeepSeek = **3/4** |

**Plus 7 medium/low findings new from Claude (no concurrence)**:
T4-F3 os_level field unenforced, T4-F4 os_level matrix gate, T5-F1
L1 claim violated by DOM writes (proposes "L1.5" framing), T5-F2
gettext bridge missing, T5-F3 gender-neutral example contested,
T5-F4 RTL dir global scope, T6-F2 HMAC sign 3ms cold-start, T7-F1
codemod 60% optimistic (also DeepSeek), T7-F2 cookbook 30 patterns
unscoped, T7-F3 Storybook deferred, T9-F3 greenfield 10h skips
i18n catalog cost, T10-F1 demo inaccessible.

**Important Claude observation (OBS-1 + OBS-3)**: this Claude
review is NOT the v2.0 final closing arbiter. The roadmap
phase 6 closing review is supposed to consume the Yujin case
study (phase 5.5) which is currently a TEMPLATE with all metrics
TBD. So the present Round 3 is "interim closing" pending case
study; a Round 4 final closing happens post-Yujin migration.

**Verdict comparison v1.9 closing vs Round 3 (Claude pass)**:

| Pass | Verdict | Conditions | Severity |
|---|---|---|---|
| v1.9 closing (May 2026) | yes-with-conditions | 3 (tag verify, deferral disclosure, single-impl disclosure) | all reasonable |
| v2.0 Round 3 (Claude pass) | yes-with-conditions | **1 BLOCKER + 8 conditions** | 1 critical + others process/honest disclosure |

Claude notes: "condition density is higher because the surface is
larger (8 primitives + i18n contract + threat model + tooling vs
v1.9's spec polish); the verdict shape is the same."

Verbatim Claude review at:
`docs/peer-review-round3-claude.txt`.

### CONCURRENCE MATRIX (4 reviewers complete: Grok + Mistral + DeepSeek + Claude)

After Claude's pass, the Round 3 verdict pool stabilises with
4 valid reviewers (Microsoft Copilot insufficient-evidence, see
below; ChatGPT pending). Concurrence threshold ≥2/4 makes the
condition author-actionable.

| Condition | Grok | Mistral | DeepSeek | Claude | Concurrence | Status |
|---|---|---|---|---|---|---|
| isTrusted WebView quirks (T4-F1 from earlier rounds) | high | medium | high | (closed in rc2) | 3/4 | ✅ closed rc2 |
| i18n_strict default too aggressive | medium | high | medium | (closed in rc2) | 3/4 | ✅ closed rc2 |
| Tooling gaps (Solid/Qwik/Lit/etc) | high | high+ | high | (rc2 expansion confirmed) | 3/4 | ✅ closed rc2 |
| MutationObserver throttle 50ms | medium | high | -- | -- | 2/4 | ✅ closed rc2 |
| describe perf budget tight | -- | medium | -- | -- | 1/4 | ✅ closed rc2 |
| **GESTURE BUFFER LEAK (BLOCKER)** | -- | -- | -- | **blocker** | **1/4 BLOCKER** | ⚠️ MUST FIX rc3 |
| **Convergence assumption WEAK (T8-F1)** | "defensible" | high | medium | high | **3/4 (Grok minority)** | ⏳ ACT NOW rc3 |
| **Boilerplate 5200 implausible (T9-F2)** | -- | medium | medium | medium | **3/4** | ⏳ ACT NOW rc3 |
| **Adoption cost optimistic (T9-F1)** | -- | medium | medium | -- | 2/4 | ⏳ ACT NOW rc3 |
| **2nd tightening i18n_strict (T2-F3)** | -- | high | -- | high | 2/4 | ⏳ ACT NOW rc3 |
| **ProvenanceBlock fields warning (T2-F2)** | -- | medium | -- | high | 2/4 | ⏳ ACT NOW rc3 |
| **codemod 60% optimistic (T7-F1)** | -- | -- | medium | medium | 2/4 | ⏳ ACT NOW rc3 |
| **bridgeIframe HMAC missing (T4-F2)** | -- | -- | -- | medium | 1/4 | ⏳ ACT runtime bug |
| **CHANGELOG missing entries (T2-F1)** | -- | -- | -- | medium | 1/4 | ⏳ ACT verifiable doc bug |
| **Cumulative batch cost (T6-F1)** | -- | -- | -- | medium | 1/4 | held pending arbiter (low priority) |
| **L1 claim violated by DOM writes (T5-F1)** | -- | -- | -- | medium | 1/4 | ACT-doc-fix (L1.5 framing) |
| **Yujin case study unpopulated (T9-F1)** | -- | -- | T9-F1-DS | high | 2/4 | already gated to phase 5.5 |
| **OS-level metadata (T4-F2 from earlier)** | -- | low | medium | (rc2 partial) | 2-3/4 | ✅ closed rc2 (partial) |
| 6 DeepSeek runtime bugs/gaps | -- | -- | low/medium | -- | 1/4 | scheduled rc3 cheap fixes |

### Pending: ChatGPT (full app)

The Round 3 verdict pool stabilises with ChatGPT (full chat app)
+ Claude as the closing arbiter. Once those two respond, all
held-open 1/3 findings either reach 2/3+ concurrence (act on
them) or stay at 1/3 (defer to v2.0.x patches with disclosure in
the v2.0 announce).

### Microsoft Copilot (GPT-4o backend) -- 2026-05-09: insufficient-evidence (BOTH variants)

**Result**: review could NOT be completed. Two attempts both
failed for orthogonal reasons:

**Attempt 1 (URL-fetch variant)**: reviewer runtime cannot access
external URLs. All 14 canonical documents `COULD_NOT_FETCH`. Per
prompt rule R1, verdict ceiling auto-downgraded to
insufficient-evidence. Expected outcome.

**Attempt 2 (inline bundle variant)**: the bundle (~95K tokens,
6656 lines) was **TRUNCATED in transmission** to the Copilot chat
interface. Reviewer only received header + partial README.md;
remaining 13 documents never arrived. Likely cause: Copilot
interface input limit (sub-50K tokens guess) is smaller than the
backing model's nominal 128K context window.

This is a transmission failure, NOT a spec issue. Both attempts
recorded verbatim at `docs/peer-review-round3-copilot.txt` for
transparency, but **neither contributes findings** to the Round 3
verdict pool.

**Workaround in flight**: the author is creating
`PromptEvaluacion5_Mini.txt` with only the 3 core documents (RFC
+ spec NAC-v2.0 + runtime nac-v2-extensions.js, ~30K tokens) for
interfaces with smaller input caps. T7/T8/T9 tasks under the mini
variant will remain insufficient-evidence by design (the docs
they need exceed 30K when included), but T2-T6 and T11-T12 can
proceed with full citations.

### DeepSeek, ChatGPT (full ChatGPT app, not Copilot), Claude arbiter -- pending

Pending re-attempt. The author distributed
`PromptEvaluacion5_Inline.txt` (embedded bundle variant) for
reviewers that cannot fetch raw URLs. Re-runs once those
reviewers respond.

---

## How to verify this independently

```bash
git clone https://github.com/pkuschnirof/nac-spec
cd nac-spec
git checkout v1.9.0
git log -1 --format="%H %s"
# 185c7df fix(nac-1.9): drift cleanup -- README Status block + ROADMAP v2.1 list

# For v2.0.0-rc1:
git log --oneline | head -10
```

The full review corpus lives in:
- `PromptEvaluacion3.txt` (v1.8 round, 5 reviewer outputs verbatim)
- `PromptEvaluacion4_Claude.txt` (v1.9 closing arbiter prompt)
- `EvidenciaInline_v1.9.txt` (the inline-content prompt that broke
  the closing arbiter's CDN cache, included for transparency about
  how the arbiter pass was actually run)
- `PromptEvaluacion5.txt` (v2.0 Round 3 prompt -- URL-fetch variant)
- `PromptEvaluacion5_Inline.txt` (v2.0 Round 3 prompt -- embedded
  bundle variant for reviewers that cannot fetch raw URLs)
- `docs/peer-review-round3-grok.txt` (Grok 4 verbatim review)

**The cost of being wrong about a v2.0 announce is on the author,
not on you.** If you are evaluating NAC for adoption and find the
contract does not hold, file an issue. The peer review pass is
necessary but not sufficient -- production deployment is the next
test.

---

**License:** MIT.
**Authors:** Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, Sumi.
**Last updated:** 2026-05-09 (Round 3 in progress; Grok 4 first responder).
