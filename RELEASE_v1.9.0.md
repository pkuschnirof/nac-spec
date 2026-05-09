## NAC v1.9.0 -- the v2.0 patch round

**Release date**: 2026-05-08
**Tag commit**: [`185c7df`](https://github.com/pkuschnirof/nac-spec/commit/185c7df)
**Strict superset of**: v1.8.0, v1.7.0, v1.6.x, v1.5.x, v1.4.x, v1.3.x, v1.2, v1.1, v1.0
**License**: MIT

NAC v1.9.0 is the closing release before the v2.0 public announce. It lands every action item the **5-AI peer review panel** of v1.8 (Microsoft Copilot, DeepSeek, Mistral Le Chat, Grok, ChatGPT) marked as `should-land-before-2.0`, plus a broader patch surface (test harness, event replay, performance budget, drag-type registry, action confirmation event family, action undoable flag).

### What v1.9 adds (TL;DR)

**For users with disabilities** (the population NAC was built for):

- **ARIA bridge for `data-nac-a11y-hint`** (sec 3.1). Runtime mounts a hidden `aria-live` region and bridges every hint via `aria-describedby`. **Screen readers consume hints today, without vendor support.**
- **`data-nac-braille-label`** (sec 3.1) for refreshable braille displays (14-20 cells). Deaf-blind users get concise labels ("Del" instead of "Delete invo" truncated). DeepSeek's v1.8 underserved-population recommendation, shipped.
- **`data-nac-confirmation-message`** (sec 3.1) for per-element override of confirmation text. Voice tools and AI agents read directly without host re-implementation. Grok's v1.8 finding.
- **Hint vocabulary additions** (sec 3.1): `session_boundary`, `audit_required`. PHILOSOPHY.md narrative connects each tag to a specific disability population.
- **Hint priority normative** (sec 3.1) -- 9-entry order so screen-reader and AI-agent priority cannot diverge.

**For AI agents and audit pipelines**:

- **`nac:action:confirm:requested/granted/denied`** wire-level event family (sec 6.2.32) with `NAC.confirm_action()` + `NAC.set_confirm_handler()`. Promotes confirmation from advisory hint to wire-level contract. Mistral + ChatGPT + Grok finding.
- **`source.signature`** HMAC-SHA256 + **`source.parent`** recursive ProvenanceBlock for nested delegation chains. Helpers: `NAC.sign_provenance()` + `NAC.verify_provenance()` with constant-time compare. Microsoft Copilot + ChatGPT finding.
- **`recommended_remediation`** field (sec 6.2.30) auto-populated on every emitted `:rejected` / `:failed` event. 13-entry normative lookup table mapping each reason to its canonical next-action verb. ChatGPT finding.
- **Action `undoable` flag** (sec 6.2.33) in the manifest. AI agents can downgrade interposition pressure on recoverable actions; voice tools can omit confirm.

**For developers + testing**:

- **Performance budget table** (sec 6.2.27, normative): validate <= 50ms for 1000 elements, describe <= 30ms, `_emit` overhead <= 0.5ms per event. `NAC.perf_probe()` produces a structured timing report. DeepSeek finding.
- **Test harness primitives** (sec 13.10): `NAC.assert_event_fired()`, `NAC.assert_event_count()`, `NAC.perf_probe()`. Replace brittle selectors in Playwright/Cypress with declarative event matching.
- **Event replay buffer** (sec 13.11, informative): `window.__NAC_PENDING__` array for hosts that load NAC asynchronously. Microsoft Copilot finding.
- **ARIA-to-NAC mapping table** (sec 7.3.3, normative): `aria-disabled`, `aria-busy`, `aria-hidden`, `aria-readonly`, HTML `inert` reject before invocation with matching reason on `nac:command:rejected`. Microsoft Copilot finding.
- **Drift tolerance window** 200 ms (sec 7.3.2, configurable) avoids false positives on React 18 / Vue 3 / Svelte 5 hydration. DeepSeek finding.
- **Drag-type registry** (sec 13.4.1, normative): 24 canonical type patterns. Validator emits `drag_type_unknown` warning so cross-app interop is preserved. Mistral finding.
- **`@media (prefers-contrast: more)`** override block (sec 7.6, REQUIRED at NAC-3) for low-vision users on high-contrast OS themes. DeepSeek finding.
- **`manifest.attention_profile`** (sec 13.5) with 5 presets (default / high_contrast / reduced_motion / extended_pulse / maximum_salience). Mistral + Grok + Microsoft Copilot finding.

**Brownfield adoption**:

- **`data-nac-skip-reason` REQUIRED** when `data-nac-validate="skip"` is set (sec 3.1). Format: `<category>[;remediate-by=YYYY-MM-DD][;tracker=<id>]`. Validator emits `skip_without_reason` (error at NAC-3) and `skip_no_remediate_date` (warn). Closes the "skip drifts permanent" risk Mistral / Microsoft Copilot / DeepSeek flagged.
- **Codemod `--inject-source-script`** flag (`tools/migrate-legacy-events.js`) auto-injects `source: { type: 'script' }` into existing call sites. Heuristic skips lines containing `agent`/`tool`/`claude`/`voice`/`talon` keywords for human review.

### Independent peer review pass

NAC v1.9 went through **6 independent AI reviewers** across two structured rounds plus a closing arbitration:

- **Round 2** (v1.8 -> v1.9, May 2026): Microsoft Copilot, DeepSeek, Mistral Le Chat, Grok, ChatGPT. 30+ action items; 22+ closed in v1.9.
- **Closing arbitration**: Claude returned **conditional YES** for the v2.0 announce, scoring the spec 8/10 on adoption readiness.

Full audit trail with reviewer attribution per closed item: [`docs/PEER_REVIEW.md`](docs/PEER_REVIEW.md).

### Honest disclosures (per closing arbiter's required condition)

- **Single reference implementation.** No second-party port yet. First PRs to Python / Swift / Kotlin / Rust get co-author credit on v2.1 changelog.
- **Performance budget validated against synthetic 1000-element fixture only.** Production-scale tuning needed.
- **Conformance verified via self-test only.** Independent interop suite is on the v2.1 roadmap.
- **HMAC provenance signing ships in v1.9 but is OPTIONAL at NAC-3.** v2.1 makes it mandatory for `source.type='agent'` events -- the closing arbiter's single substantive recommendation.

Items deferred to **v2.1** with stated reasons:
1. Capability/version negotiation in manifest (ChatGPT finding -- needs careful design to avoid breaking the v1.x strict-superset invariant)
2. Cross-origin iframe support (DeepSeek -- security work)
3. Framework integration guides for React/Vue/Svelte (DeepSeek + Grok + ChatGPT -- doc work, not blocking)
4. Independent interoperability test suite (ChatGPT)
5. CI dashboard / reporting tool (Microsoft Copilot)

### How to upgrade

v1.9 is a **strict superset of v1.8.0**. Every v1.8 plugin remains valid. Every v1.7 plugin remains valid. No breaking changes.

For pages still using v1.6.x legacy event field names, the codemod handles ProvenanceBlock injection automatically:

```bash
node tools/migrate-legacy-events.js --inject-source-script --path src/
```

### Try it

- **Live demo**: https://yujin.app/nac-spec/example.php (30+ widget cards, 10 locales, autopilot tour)
- **Spec**: [`spec/NAC-v1.0.md`](spec/NAC-v1.0.md)
- **Manual**: [`docs/MANUAL.md`](docs/MANUAL.md)
- **Authoring patterns**: [`docs/AUTHORING_PATTERNS.md`](docs/AUTHORING_PATTERNS.md)
- **Peer review trail**: [`docs/PEER_REVIEW.md`](docs/PEER_REVIEW.md)
- **Roadmap**: [`docs/ROADMAP.md`](docs/ROADMAP.md)

### Looking for

- **Language ports**: Python, Swift, Kotlin, Rust, Go. First PRs get co-author credit on v2.1 changelog.
- **Apps shipping NAC-3 in production**: add your deployment to [`docs/NAC_REGISTRY.md`](docs/NAC_REGISTRY.md).
- **Feedback** on the spec, especially edge cases around dynamic content, virtualized lists, multi-step flows, closed shadow roots (out of scope per sec 7.4 -- the open question that breaks everyone's date picker).

### Sustaining the maintainer

NAC is built and maintained by one person. The spec stays MIT regardless. For teams that adopt NAC and want the work to continue, sponsorship rails are:

- **Polar.sh** (recurring + one-time, 5 tiers): https://buy.polar.sh/polar_cl_mqEuONOGSTr3bn9P8XSQRRFryST2htj4xDv1p0nNDJW
- **GitHub Sponsors** (waitlist; will activate when GitHub approves the AR setup, typically 1-2 weeks after KYC)
- **Yujin** (the production showcase using NAC end-to-end): https://yujin.app

### Authors

Pablo Adrian Kuschniroff <pablo.kuschnirof@gmail.com>, Sumi.

### Full CHANGELOG

[`CHANGELOG.md` -- entry [1.9.0]](CHANGELOG.md).
