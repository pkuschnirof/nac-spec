# NAC Migrator Tool -- Commercial Feasibility Analysis

**Status**: Strategic analysis, draft.
**Date**: 2026-05-09.
**Authors**: Pablo Adrian Kuschniroff, Sumi.
**License**: MIT.

This document captures the strategic analysis of how close NAC is to
offering a useful migrator tool for adopters, and what the path to a
commercially-viable product looks like.

It is the companion to `NAC_v20_SCOPE_AND_ECOSYSTEM.md` and
`NAC_v20_ROADMAP_ACTIONABLE.md`.

---

## 1. The four tiers of "useful migrator tool"

A migrator tool is "useful" depending on what level of self-service
it offers. Four tiers, each with a distinct customer + price point:

| Tier | What it does | Customer | Price | Technical coverage |
|---|---|---|---|---|
| **1** | CLI scans repo + emits PR with inferred NAC annotations | individual dev / OSS maintainer | free | 60% auto-fill |
| **2** | Tier 1 + DevTools live + cookbook 30 patterns + rules library third-party | mid-tier dev team | free / open-core | 75-80% auto + guided manual |
| **3** | Tier 2 + SaaS dashboard (paste repo URL -> PR + cost estimate + continuous compliance monitor) | enterprise team / agency | freemium $99-$2k+/mo | 90-95% with human gates |
| **4** | Tier 3 + Yujin services (humans + AI in loop, SLA) | corporate compliance / regulated industry | $5k-$50k/engagement | 99% + audit |

---

## 2. Coverage delivered when v2.0 ships

| Migrator component | v2.0 plan delivers? | Gap |
|---|---|---|
| Codemod CLI (`@nac-spec/codemod`) | YES (phase 4 roadmap item) | -- |
| Babel plugin React | YES (phase 4) | RSC support deferred |
| Vue 3 plugin | YES (phase 4) | -- |
| Svelte preprocessor | YES (phase 4) | -- |
| DevTools browser extension | YES (phase 4) | Manifest V3 first, Firefox port follows |
| Cookbook 30 patterns | YES (phase 4) | -- |
| Rules library `@nac-spec/rules-*` | YES (Stripe/Slack/Mapbox seeded) | rest via community |
| Conformance suite | YES (phase 5) | -- |
| Perf benchmark per device tier | YES (phase 5) | -- |
| `bridgeShadowRoot` + `bridgeIframe` | YES (phase 3) | iframe cross-origin requires receiver compliance |
| `declareVirtual` for large lists | YES (phase 3) | -- |
| `setTenantPrefix` multi-tenant | YES (phase 3) | -- |

**Verdict**: when v2.0 ships, typical adopter has **Tier 1 + Tier 2
plug-and-play**.

---

## 3. Pieces missing between Tier 2 and Tier 3 (sellable SaaS)

These are net-new pieces NOT in the v2.0 roadmap:

| Missing piece | Effort | Why it matters |
|---|---|---|
| **SaaS dashboard** (web app ingests repo URL, runs codemod, returns PR + report) | ~15-20 days Sumi + 1-2 days AWS infra | without this, adopter must run codemod locally -- friction |
| **Cost estimator** (scans repo + estimates dev hours pre-migration) | ~4 days | adopter wants to know "is this 10h or 100h?" before committing |
| **i18n catalog auto-generator** (Claude/GPT translates strings -> 10 locales with human review gated) | ~7 days | autoRegister's biggest gap: i18n requires 10-locale catalog; without auto-gen it is tedious manual work |
| **Continuous compliance monitor** (CI hook re-runs conformance on each adopter PR) | ~8 days | recurring revenue (Tier 3 self-justifies on this) |
| **NAC-aware visual regression** (Playwright fixture diffs snapshots + manifest) | ~10 days | enterprise requirement |
| **Migration SDK for "minor" frameworks** (Solid, Qwik, Lit, vanilla Web Components) | ~6 days per framework | beyond React/Vue/Svelte stays manual today |
| **Onboarding flow + landing migrate.nac-spec.io** (UX, copy, signup, payment) | ~7 days + design | commercial product needs marketing surface |
| **Pricing + Stripe integration** | ~3 days | obvious |
| **Support tooling** (intercom, KB, Discord) | ~2 days setup | expected |

**Total for Tier 3 MVP**: ~60-70 days post v2.0 release. With v2.0
mid-Aug 2026, **Tier 3 SaaS sellable mid-Nov to mid-Dec 2026**.

---

## 4. Pieces missing between Tier 3 and Tier 4 (premium service)

| Piece | Why |
|---|---|
| **Documented success cases** | without testimonials + verifiable metrics ("Yujin saved X hours migrating"), no premium sale |
| **Human team to operate engagements** | service business needs humans in loop -- Yujin solo (Pablo + Sumi) does not scale beyond 2-3 concurrent deals |
| **Contractual SLAs + insurance** | enterprise buys with paper, not README |
| **Compliance certifications** (SOC2 lite, GDPR DPA, EAA audit-ready) | enterprise requirement |
| **Sales motion** (outbound, conference talks, partner program) | dedicated marketing |
| **Pricing benchmark** vs Deque axe / Tenon / Microsoft accessibility insights | competitive intel |

**Estimate**: 6-12 months post Tier 3 + 1-2 visible success cases.
Realistic 2027-Q1 to 2027-Q3 depending on traction.

---

## 5. Yujin as first reference customer (the high-leverage play)

"How close are we" depends crucially on **one visible real case**.
Yujin is that case:

- Yujin will migrate to NAC v2.0 strict in ~36h dev using v2.0 tools
  (per scope doc cost analysis).
- That migration documents itself as a case study (commit-by-commit,
  metrics before/after).
- Published as `nac-spec/case-studies/yujin.md`.
- Proves the migrator works -- without this, everything else is
  marketing.

**This means the Yujin migration has dual purpose**:
1. Yujin gains NAC compliance (its commercial story).
2. NAC gains its first visible adopter (the migrator's commercial
   story).

**Timing**: if Yujin migrates September 2026 (post v2.0), case study
ready October. Tier 3 SaaS launching November has fresh testimony.
That meaningfully accelerates Tier 3 adoption curve.

---

## 6. Implied business model

If the four tiers ship progressively:

| Product | Pricing draft | Revenue model | Realistic Y1 TAM |
|---|---|---|---|
| Tier 1 CLI | free | adoption funnel | -- |
| Tier 2 framework plugins + cookbook | free | adoption funnel | -- |
| Tier 3 SaaS dashboard | $99/mo starter / $499 pro / $2k+ enterprise | MRR | 50-200 paying tenants Y1 = $5k-$50k MRR |
| Tier 4 services | $5k-$50k per engagement | one-time + retainer | 5-15 deals Y1 = $50k-$500k |
| **Continuous monitor** subscription | $50-$200/mo | sticky MRR | 100-500 customers Y1 |

**Conservative Y1 post-v2.0 arithmetic**: $200k-$800k ARR if Yujin
case study + 1-2 third-party adopters validate the convergence
assumption.

---

## 7. The real catch (non-technical)

Technically the useful migrator tool exits with v2.0+3-4 months.
**But what sells the tool is the external pressure that forces
migration**:

- **EAA** (June 2025 in force) already weighs for EU companies.
- **ADA web case law** US pressures but slow.
- **AI Computer Use ops** growing but early.
- **Voice/Vision Pro** not yet dominant category.

Today most teams view NAC as "nice to have", not "audit required".
The migrator tool is necessary but not sufficient. **The sellable
product takes off when one of three events happens**:

1. Visible EAA fine to a famous company (EU lawsuit) -> flood of
   compliance demand.
2. Anthropic Computer Use or competitor publishes "operates better
   on NAC-3 apps" -> explicit integration.
3. A top-tier design system (Material, Carbon, Fluent) ships NAC
   compliance as feature -> cascade.

**Without one of these catalysts, Tier 3 lives in early-adopter
mode (10-30 customers) and Tier 4 in consultancy mode (3-5 deals).
With one, the curve inflects.**

---

## 8. Decision summary

| Horizon | Available product | Confidence |
|---|---|---|
| **2026-08** (v2.0 ships) | Tier 1 + Tier 2 free + Yujin as reference customer in-flight | high |
| **2026-10** | Yujin case study published | high (conditional on phase 0 starting now) |
| **2026-11-12** | Tier 3 SaaS MVP launchable | medium -- depends on Sumi bandwidth parallel to other fronts |
| **2027-Q1+** | Tier 4 services with first paid cases | low-medium -- depends on market catalyst |

---

## 9. Recommendation

Tier 1 + Tier 2 are **natural complement to v2.0** (already in
roadmap). Decide Tier 3 once v2.0 ships + Yujin migration clarifies
the real cost. Tier 4 activates when the first paying customer asks
for it.

The tactical immediate decision: the Yujin case study is the
highest-leverage move. **If Yujin migrates well -> migrator tool has
proof**. If Yujin does not migrate (someone pivots) -> migrator tool
loses its commercial anchor.

**Should the Yujin case study become an explicit phase 7 or 8 item
in the v2.0 roadmap?** Today it does not appear there.

---

-- Pablo & Sumi, 2026-05-09
