# Case Study: Yujin CRM migration to NAC v2.0

**Status**: TEMPLATE -- to be populated during the actual migration
(scheduled for phase 5.5 of the v2.0 roadmap, Aug-Sep 2026).
**Adopter**: Yujin CRM (RPAForce CRM V2). Multi-tenant SaaS, ~50
interactive UI components, ~15 hubs, ~25 modal types, partial
10-locale i18n catalog, parcial ARIA coverage at start.
**Migration window**: TBD (post v2.0.0 tag, before phase 6 closing
review).
**License**: MIT.

---

## 0. Why this case study exists

Reviewers evaluating NAC v2.0 see the spec, the reference runtime,
the conformance suite, and synthetic perf fixtures. None of those
prove that adoption works on a real codebase with real friction.
This document is the ground truth: an honest commit-by-commit
account of a brownfield app moving to NAC v2.0 strict, including
the parts that did not work.

It is **not a marketing document**. Findings include failures.

---

## 1. Adopter context (filled at migration start)

| Dimension | Value |
|---|---|
| Repo | `https://github.com/pkuschnirof/rpaforce-crm` |
| Frontend stack | Vanilla JS + PHP heredoc templates (no React/Vue/Svelte) |
| LOC pre-migration | TBD |
| Interactive components | TBD |
| Modals | TBD |
| Hubs | TBD |
| Locales supported | 10 (es, en, pt, fr, it, de, ja, zh, hi, ar) |
| i18n catalog completeness | TBD% (partial baseline) |
| ARIA coverage | TBD% (partial baseline) |
| Third-party widgets integrated | Stripe Elements, Slack widget, ElevenLabs voice, Google TTS |
| Test suite size | TBD specs |
| Pre-migration NAC compliance level | NAC-0 (none) |
| Target post-migration level | NAC-3 strict |

---

## 2. Pre-migration baseline measurements

To be captured BEFORE first migration commit. Reviewers need this
to validate the cost model in scope doc appendix A.

### 2.1 Code metrics

| Metric | Value |
|---|---|
| Lines of JS | TBD |
| Lines of PHP heredoc UI | TBD |
| Number of `aria-label` attributes already present | TBD |
| Number of `data-i18n-key` already present | TBD |
| Number of focus-trap implementations across modals | TBD (each modal that has its own) |
| Lines of NAC-related code (yujin-nac3.js + yujin-nac3-shell.js if kept from slice 1) | TBD |

### 2.2 Performance baseline (real Yujin pages)

Measured on three device tiers per scope doc section 5.

| Page | Mid-tier laptop 2026 | Mid-tier mobile 2026 | Low-tier mobile 2026 |
|---|---|---|---|
| Login + Dashboard load | TBD ms TTI | TBD | TBD |
| Catalog browser (400 sazanami cards) | TBD ms render | TBD | TBD |
| Pipeline runs list (~5000 rows virtualized) | TBD ms scroll p95 | TBD | TBD |
| Open contact modal | TBD ms | TBD | TBD |

### 2.3 Accessibility baseline

- axe-core findings count: TBD
- Lighthouse a11y score: TBD
- Manual screen reader test result (NVDA + VoiceOver): TBD

---

## 3. Migration narrative (commit-by-commit)

To be filled as commits land. Format:

### Commit 1 -- ...

**Hash**: `xxxxxxx`
**Date**: YYYY-MM-DD
**Author**: F worker / G worker / H worker / I worker / Sumi / Pablo

**What changed**:
- ...

**Files touched**:
- ...

**LOC delta**: +X / -Y

**Time spent (Sumi-time)**: TBD min

**Surprises / friction**:
- ...

**Findings worth flagging to peer review**:
- ...

---

(Repeat per commit through entire migration.)

---

## 4. Post-migration measurements (mirror of section 2)

### 4.1 Code metrics delta

| Metric | Pre | Post | Delta |
|---|---|---|---|
| Lines of JS | TBD | TBD | TBD |
| Lines of NAC-related boilerplate | TBD | TBD | TBD |
| `aria-label` attributes (manual) | TBD | TBD | replaced by NAC manifest derivation |
| Focus-trap implementations (manual) | TBD | TBD (should be 0) | NAC handles |
| Average lines per interactive component | TBD | TBD (target ~5 lines per component vs ~30 baseline) | scope doc appendix A predicts ~87% reduction |

### 4.2 Performance delta

| Page | Pre | Post | Delta |
|---|---|---|---|
| Catalog browser render | TBD | TBD | should be within 5% of baseline (NAC overhead) |
| Pipeline runs scroll p95 | TBD | TBD | should be within 5% |
| Modal open + focus settle | TBD | TBD | may be slightly slower (focus trap install) but more predictable |
| `NAC.describe()` cost on full page | n/a | TBD | new metric -- target <30ms low-tier mobile |

### 4.3 Accessibility delta

| Metric | Pre | Post |
|---|---|---|
| axe-core findings | TBD | TBD (target zero new, all pre-existing closed via NAC) |
| Lighthouse a11y | TBD | TBD (target 95+) |
| Manual SR test | TBD | TBD |
| Voice control test (Talon mock) | n/a (not previously testable) | TBD |
| AI agent operability test (Claude Computer Use mock) | n/a | TBD success rate on common flows |

### 4.4 NAC conformance level achieved

- Conformance suite finding count: TBD
- NAC-3 strict pass: yes/no
- Open conformance failures + reason: TBD

---

## 5. Aggregate cost (the question reviewers really care about)

| Metric | Value | Comparison to scope doc estimate |
|---|---|---|
| Total Sumi-time (dev-hours) | TBD | scope doc appendix A predicts ~36h brownfield Yujin |
| Total Pablo-time (review + decisions + i18n) | TBD | -- |
| Total wall-clock days | TBD | -- |
| % auto-coverage by codemod | TBD | scope doc target ~60% |
| % manual cleanup | TBD | scope doc target ~40% |
| Components that required design changes (no auto path) | TBD | -- |
| i18n catalog entries net-new added | TBD | -- |

---

## 6. Gaps and friction findings (the input the reviewers want most)

To be filled as findings emerge.

### 6.1 Primitives that worked as designed

- ...

### 6.2 Primitives that worked but needed extra glue

- ...

### 6.3 Primitives that did NOT cover the case (gap that emerged)

- ...

### 6.4 Tooling gaps

- ...

### 6.5 Documentation gaps

- ...

### 6.6 Things the codemod could not handle

- ...

### 6.7 Performance findings

- ...

### 6.8 Accessibility findings

- ...

### 6.9 Things that surprised us

- ...

---

## 7. Lessons learned (for future adopters)

To be written after migration completes.

- ...

---

## 8. What would have been different if Yujin started greenfield with NAC v2.0

A counterfactual. Estimate based on the brownfield experience:

- Estimated greenfield cost for equivalent app: TBD (scope doc
  predicts ~10h dev for 50-component greenfield).
- Largest cost component avoided: TBD.
- Largest cost component still present (not eliminable by
  greenfield): TBD (probably i18n catalog -- it is not NAC's job).

---

## 9. Recommendations to NAC spec authors based on this experience

To be written. Items here become candidates for v2.0.1 patch or
v2.1 inclusion.

- ...

---

## 10. Verifiability

Reviewers can reproduce the metrics:

```bash
git clone https://github.com/pkuschnirof/rpaforce-crm
cd rpaforce-crm
git log --oneline | grep "feat(nac3)" | head
# every commit in the migration is tagged with feat(nac3) prefix
# and links to this case study in the body.
```

Conformance results:
```bash
# from a checkout of yujin sandbox post-migration:
NAC.validate_global({nac_level: 3})
# expected: zero error-severity findings.
```

Perf measurements:
```bash
# Lighthouse traces published in case-studies/yujin-perf-traces/
# (separate directory, large files, not in this doc).
```

---

## 11. Honest disclosure

- Yujin is the spec author's primary commercial vehicle. It is NOT
  an independent third party. The case study's value is as
  ground-truth-by-the-author, not third-party validation.
- An independent third-party migration case study is a v2.0.x or
  v2.1 priority.
- Findings here include the author's own blind spots; reviewers
  are explicitly invited to dispute interpretation.

---

**Last updated**: 2026-05-09 (template).
**Next update**: at first migration commit.
**Owner**: Sumi + Pablo.
