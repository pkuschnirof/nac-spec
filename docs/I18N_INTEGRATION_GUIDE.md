# NAC v2.0 -- I18N Integration Guide

**Status**: Authoritative document for adding new locales to NAC.
**Audience**: NAC adopters + spec maintainers + peer reviewers.
**Date**: 2026-05-09.
**License**: MIT.

This guide is **mandatory reading** for any NAC v2.0 adopter who:
- Ships in 1+ locale (everyone, basically).
- Wants to extend NAC's default 10 supported locales.
- Wants to integrate NAC's i18n contract with their existing i18n
  library (react-intl, vue-i18n, i18next, FormatJS, others).

It is also one of the documents distributed to the peer review
panel (Round 3 of NAC v2.0 review) so reviewers can independently
validate the i18n contract design.

---

## 0. TL;DR

- NAC v2.0 ships with 10 default locales: `es, en, pt, fr, it, de, ja, zh, hi, ar`.
- NAC's i18n is a **contract layer (L1.5)**: it normalises the
  catalog format and provides a resolver helper. NAC mutates
  ACCESSIBILITY METADATA (aria-label, role, dir=rtl, data-nac-*
  attrs) but NEVER user-visible textContent. Existing i18n
  libraries continue to be the runtime for textContent
  rendering. This is the rc3 honest revision of the L1 framing
  per Claude T5-F1.
- Adding the 11th locale to NAC: **30 seconds in spec, 30 seconds
  in runtime**. Adding the 11th locale to a consumer's catalog
  scales linearly with catalog size and is the real cost.
- Strategy: NAC defines what "complete" means; tooling (Crowdin,
  Lokalise, AI-assisted) fills the catalog; humans review.

---

## 1. The 10 default supported locales

NAC v2.0 ships with these by canonical default:

| Code | Language | Family | Notes |
|---|---|---|---|
| `es` | Spanish | Latin / European | author's reference locale |
| `en` | English | Latin / European | de-facto fallback |
| `pt` | Portuguese | Latin / European | covers BR + PT |
| `fr` | French | Latin / European | -- |
| `it` | Italian | Latin / European | -- |
| `de` | German | Germanic | grammatical cases (use sub-keys) |
| `ja` | Japanese | CJK | layout width verification needed |
| `zh` | Chinese | CJK | covers Simplified by default; Traditional via `zh-Hant` extension |
| `hi` | Hindi | Indic | Devanagari script; technical jargon may lack established translations |
| `ar` | Arabic | Semitic / RTL | RTL handling auto via NAC; BIDI nuance review needed |

**Why these 10**: market coverage (~80% of global digital users
combined) + linguistic family diversity (covers RTL, CJK, Indic,
gender-cased Germanic, Latin Romance) so the spec is stress-tested
against script complexity.

These are the **default**, not a closed set. See section 4 for
extending.

---

## 2. The catalog format (canonical)

The contract NAC v2.0 normalises:

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

### 2.1 Key naming rules

- ASCII-safe identifier: `[a-z0-9_.-]+`
- Hierarchy via dots: `contact.delete`, `pipeline.runs.list_header`
- Sub-keys for plurals/cases: `contact.delete.singular`,
  `contact.delete.plural`, `contact.delete.genitive` (German),
  `contact.delete.dative` (German), etc.
- No spaces, no Unicode in keys.

### 2.2 Value rules

- Each locale must be a non-empty string.
- Strings MAY contain interpolation tokens `{name}` -- the
  interpolation engine is the host's i18n library, not NAC.
- Strings MAY contain HTML markup -- but NAC does NOT escape; the
  consumer is responsible for safe rendering.
- Strings MUST be valid UTF-8.

### 2.3 NAC strict mode (NAC-3)

**Updated v2.0-rc2** (Grok T5-F1 + Mistral T5-F2 concurrent
finding): at NAC-3 the validator emits **warn**-severity findings
by default for missing locales, NOT error. The original rc1
behaviour (error severity) blocked incremental SaaS rollouts where
languages are added after launch one at a time. Hosts that need
strict-error semantics opt in:

```javascript
// Default (rc2): missing locales surface as warnings.
NAC.validate_global({i18n_strict: true});
// Returns: { errors: [], warnings: [{code: 'i18n_missing_locale', ...}] }

// Opt-in to strict error severity:
NAC.set_validation_tolerance({i18n_strict: 'error'});
NAC.validate_global({i18n_strict: true});
// Returns: { errors: [{code: 'i18n_missing_locale', ...}], warnings: [] }

// Or opt-out entirely:
NAC.set_validation_tolerance({i18n_strict: 'silent'});
```

**Severity semantics**:
- `'warn'` (default at NAC-3): findings are visible but do not
  fail conformance. Adopters can deploy at NAC-3 with incomplete
  catalog and fill gaps incrementally.
- `'error'` (opt-in): findings fail conformance. Use when a
  release gate requires 100% locale coverage.
- `'silent'` (escape hatch): no findings emitted. Use only when
  i18n is intentionally deferred (e.g. early greenfield prototype).

NAC-2 keeps `warn` semantics; NAC-1 ignores.

---

## 3. Adding a new locale -- mechanical steps

This section walks through adding the **11th locale** (e.g.
Catalan, `ca`) to NAC + a consumer.

### 3.1 In NAC spec + runtime (~30 seconds + ~10 LOC)

The 10 default locales are listed in:

- `spec/NAC-v2.0.md` section "Default supported locales" (one
  paragraph; add the new code).
- `js/nac.js` line ~50 (one constant array; add the new code):

```javascript
const SUPPORTED_LOCALES_DEFAULT = [
  'es', 'en', 'pt', 'fr', 'it', 'de',
  'ja', 'zh', 'hi', 'ar',
  'ca'  // <-- new
];
```

If the new locale is **RTL**, also add to:

```javascript
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];
//                                          ^^ add here if RTL
```

If the new locale is **CJK** and needs font fallback adjustment,
add to the design tokens (host responsibility, not NAC).

The validator's `i18n_missing_locale` check picks up the new
locale automatically -- no validator change.

**Total NAC-side cost: ~5 minutes including running the test
suite + bumping `version` patch.**

### 3.2 In a consumer (existing app, ~500 keys)

The cost scales with catalog size:

| Step | Effort | Tooling |
|---|---|---|
| 1. Run AI-assisted bulk translation of 500 keys | 30-60 min wall-clock | Crowdin, Lokalise, OpenAI/Anthropic API loop |
| 2. Native speaker review (technical jargon) | 2-4h | human reviewer |
| 3. Smoke test in app (CJK width, RTL flip, Indic shaping) | 1h | manual visual + automated screenshot |
| 4. Validator pass at NAC-3 | seconds | `NAC.validate_global({i18n_strict: true})` |
| 5. Commit + release | minutes | git |

**Total consumer-side cost: 4-6 hours for ~500 keys with
AI-assisted tooling. Without tooling: ~10-12 hours.**

### 3.3 In a greenfield app (~50 keys)

Trivial: ~1h with AI assist + 30min review.

---

## 4. Extending the supported locales beyond the 10 default

The default 10 cover ~80% of global users. Some adopters need
locales outside that list:

- **Catalan (`ca`)** -- regional Spain, no UI without it for some markets.
- **Kazakh (`kk`)**, **Vietnamese (`vi`)**, **Swahili (`sw`)** -- market-specific.
- **Hebrew (`he`)** -- Israel; RTL.
- **Persian (`fa`)** -- Iran/Afghanistan; RTL.
- **Urdu (`ur`)** -- Pakistan; RTL with Indic script.
- **Korean (`ko`)** -- CJK family.
- **Russian (`ru`)** -- Cyrillic, grammatical cases.
- **Turkish (`tr`)** -- vowel harmony, agglutinative; long words can break layouts.
- **Indonesian (`id`)** -- large user base, low complexity.

### 4.1 API to extend

```javascript
NAC.setSupportedLocales([
  'es', 'en', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'hi', 'ar',
  'ca', 'kk', 'vi', 'he', 'fa', 'ru', 'tr', 'id'
]);
```

**This is per-page setup**, called before `validate_global` first
runs. The validator picks up the extended list automatically.

### 4.2 Catalog implications

Once `setSupportedLocales` extends the list, every key in every
catalog the host registers MUST cover the extended list at NAC-3.
Missing entries become `i18n_missing_locale` errors.

In practice: extend the list in one PR, fill the catalog in the
next PR (or in parallel branches). Validator emits errors during
the gap; deploy at NAC-2 in the meantime.

### 4.3 RTL extension

If extending to a RTL language not in NAC's default RTL list:

```javascript
NAC.setRTLLocales(['ar', 'he', 'fa', 'ur']);
```

The runtime auto-applies `dir="rtl"` to the document root when
`NAC.locale()` matches. Host-level CSS using `:dir(rtl)` selectors
+ logical properties (`margin-inline-start`, `padding-inline-end`)
works automatically.

### 4.4 CJK extension

CJK locales (`zh-Hant`, `ko`, `ja`) need font fallback. NAC does NOT
manage fonts; the host's design tokens / CSS handles this. NAC's
contribution: the locale code is recognized, the catalog format is
the same.

Recommended host-side font stack:

```css
body {
  font-family:
    /* Latin */ 'Inter', system-ui, sans-serif,
    /* CJK */ 'Noto Sans JP', 'Noto Sans SC', 'Noto Sans TC', 'Noto Sans KR',
    /* Indic */ 'Noto Sans Devanagari', 'Noto Sans Bengali',
    /* Arabic */ 'Noto Sans Arabic',
    /* fallback */ system-ui, sans-serif;
}
```

---

## 5. Cost matrix per locale family

For consumers planning multilingual rollout. Numbers are
approximate, based on AI-assisted tooling + native speaker review,
on a ~500-key catalog.

| Family | Locales | AI auto-accuracy | Review effort | Total per locale |
|---|---|---|---|---|
| Latin Romance | es, fr, pt, it, ca, ro | 95%+ | 2h | ~4-5h |
| Latin Slavic | pl, cs, sk, sl, hr | 92% | 2.5h | ~5h |
| Cyrillic | ru, uk, sr, bg, mk, kk | 90% | 3h | ~5-6h |
| Germanic | en, de, nl, sv, no, da | 95%+ (en) / 90% (de cases) | 2-4h | ~4-7h |
| CJK | ja, zh-CN, zh-Hant, ko | 90% text + layout verification | 4h (native review + width test) | ~7-8h |
| RTL Semitic | ar, he | 80% (BIDI nuance) | 5h (BIDI review) | ~8-10h |
| RTL Persian | fa, ur | 75% | 5h | ~8-10h |
| Indic | hi, bn, ta, te, gu, mr | 85% (technical jargon weak) | 6h (native + glossary) | ~9-11h |
| Southeast Asian | vi, id, th, ms | 88% | 3h | ~5-7h |
| Turkic | tr, az, uz | 85% | 4h | ~6-8h |
| Other African / Niche | sw, ha, yo, am, lo | 75% (LLM training thin) | 8h (often need professional) | ~12-16h |

**Strategic insight for adopters**: budget ~5-10 hours per locale
post-tooling. The catalog disciplines + AI tools are the cost
multiplier; without them, ~3x.

---

## 6. Pluralisation, gender, and grammatical cases

NAC v2.0's i18n contract handles these via **sub-keys**, not via
runtime logic. NAC does NOT implement CLDR plural rules.

### 6.1 Plurals

```json
{
  "contact.deleted.message.zero": {"es": "Sin contactos eliminados", ...},
  "contact.deleted.message.one":  {"es": "1 contacto eliminado", ...},
  "contact.deleted.message.two":  {"es": "2 contactos eliminados", ...},
  "contact.deleted.message.few":  {"es": "...", ...},
  "contact.deleted.message.many": {"es": "...", ...},
  "contact.deleted.message.other":{"es": "...", ...}
}
```

Sub-key suffixes follow Unicode CLDR plural categories:
`zero`, `one`, `two`, `few`, `many`, `other`.

The host's i18n library selects the right sub-key based on the
count. NAC's `NAC.t()` does not auto-select; it returns the literal
key requested.

### 6.2 Grammatical cases (German, Russian, Hungarian, Finnish, Turkish)

```json
{
  "contact.title.nominative": {"de": "Kontakt", ...},
  "contact.title.genitive":   {"de": "Kontakts", ...},
  "contact.title.dative":     {"de": "Kontakt", ...},
  "contact.title.accusative": {"de": "Kontakt", ...}
}
```

Languages with cases REQUIRE the host UI to call the right sub-key.
This is a host-side concern; NAC normalises only the storage format.

### 6.3 Gender (French, Spanish, German, Italian)

```json
{
  "user.greeting.masculine": {"fr": "Bienvenu", "es": "Bienvenido", ...},
  "user.greeting.feminine":  {"fr": "Bienvenue", "es": "Bienvenida", ...},
  "user.greeting.neutral":   {"fr": "Bienvenue", "es": "Te damos la bienvenida", ...}
}
```

---

## 7. Bridging existing i18n libraries

NAC's contract format is compatible with most JSON-based i18n
libraries:

### 7.1 react-intl / FormatJS

Convert react-intl `messages.json` to NAC catalog:

```javascript
// react-intl format
{
  "contact.delete": "Delete contact"
}

// NAC catalog format (after merging per-locale files)
{
  "contact.delete": {
    "en": "Delete contact",
    "es": "Eliminar contacto",
    /* ... */
  }
}
```

Tooling: a 30-line script merges `messages.{locale}.json` into the
NAC catalog at build time.

### 7.2 vue-i18n

Vue-i18n's nested message format converts cleanly:

```javascript
// vue-i18n
const messages = {
  en: { contact: { delete: 'Delete contact' } }
};

// flatten to NAC keys
{
  "contact.delete": { "en": "Delete contact", /* ... */ }
}
```

### 7.3 i18next

i18next's namespace concept maps to NAC's slug hierarchy:
`{ns:'contact', key:'delete'}` -> `contact.delete`.

### 7.4 Host's responsibility

The host loads the NAC catalog (via `NAC.registerCatalog`) AND
keeps using its existing i18n library for DOM mutation. NAC reads;
the library mutates.

### 7.5 gettext (.po) bridge -- target v2.0.x (rc3, Mistral T5-F1 + Claude T5-F2)

gettext .po is the i18n format used by the WordPress ecosystem
(40%+ of the public web), Drupal, Django sites, GNU/Linux app
catalogues, and any C/C++/Go shop. By number of adopters globally,
it is the largest single legacy i18n format. **NAC v2.0 does NOT
yet ship a direct bridge for gettext .po**; the conversion path is
covered by `@nac-spec/codemod-i18n` (target: v2.0.x patch series).

Until that ships, adopters using gettext can convert manually:

```bash
# Sample workflow (not yet automated as @nac-spec/codemod-i18n):
for locale in es en pt fr de ja zh hi ar it; do
  msgcat path/to/$locale.po -o /tmp/$locale.json --to-code=UTF-8 ...
done
# Then merge per-locale JSONs into the NAC catalog format.
```

A reference Python script is planned for the announce. WordPress
shops reading this guide should plan for "post-tag NAC adoption"
unless they're willing to do manual conversion.

### 7.6 RTL global-scope warning (rc3, Claude T5-F4)

NAC's default `locale('ar')` sets `dir="rtl"` on
`document.documentElement`. SaaS hosts where one user is in `ar`
and another tenant's content is rendered in LTR within the same
DOM (e.g. side panel showing untranslated English log lines)
will see broken bidi. Such hosts MUST opt out:

```javascript
NAC.setAutoRTL(false);
// Then the host manages dir on a sub-tree element manually.
```

---

## 8. AI-assisted catalog filling

Every adopter eventually wants to translate catalog entries via
AI. NAC does not ship a translator (out of scope) but recommends
this workflow:

### 8.1 Recommended pipeline

```bash
# 1. Identify missing keys
nac validator --i18n-missing > missing.json

# 2. Run AI translation
nac translate --from en --to es,pt,fr,it,de,ja,zh,hi,ar \
  --provider anthropic --review-mode gated \
  missing.json > draft.json

# 3. Native review per locale (optional but recommended at NAC-3)
nac translate --review --reviewer-locale ja draft.json

# 4. Merge into catalog
nac catalog --merge draft.json

# 5. Re-validate
nac validator --i18n-strict
```

The `nac translate` CLI is shipped as `@nac-spec/codemod` and uses
provider APIs (Anthropic Claude, OpenAI, Google Translate) with a
glossary file the adopter maintains for technical terms.

### 8.2 Glossary file

```json
// glossary.json
{
  "deal": {"es": "oportunidad", "en": "deal", "pt": "negocio"},
  "kawa": {"es": "kawa", "en": "kawa", "ja": "川"},
  "sazanami": {"es": "sazanami", "en": "sazanami", "ja": "さざなみ"}
}
```

Glossary entries override AI-generated translations. Critical for
brand terms, technical jargon, and culturally-specific concepts.

---

## 9. Validation findings reference

The `validate_global({i18n_strict: true})` call emits these
findings:

| Finding | Severity (NAC-3) | Reason |
|---|---|---|
| `i18n_missing_locale` | error | A key has fewer than supported locales |
| `i18n_orphan_key` | warn | A catalog key is not consumed by any registered manifest |
| `i18n_unused_locale` | warn | A locale defined in catalog is used by no element |
| `i18n_invalid_locale` | error | A locale code is not in the supported list |
| `i18n_mono_locale_autoderived` | warn | An adopted/autoRegistered element with `_autoderived: true` flag |
| `i18n_string_empty` | error | A locale value is an empty string |
| `i18n_string_too_long` | warn | A locale value exceeds 1000 chars (likely error) |
| `i18n_html_unescaped` | warn | A locale value contains HTML; flagged so consumer reviews escaping |

---

## 10. FAQ for adopters + reviewers

### Q: Why doesn't NAC just translate strings via AI at runtime?

**A**: scope creep + ecosystem conflict. NAC stays a contract; the
host's i18n library does the runtime. Adopters who want runtime
auto-translation can integrate Anthropic/OpenAI/Google Translate
APIs directly; NAC validates the result.

### Q: What if an adopter ships in only 2 locales?

**A**: extend `setSupportedLocales(['es', 'en'])` to cover only what
shipping. NAC-3 lint then expects only those 2 in each key. Other
locales become permitted-but-unrequired.

### Q: Can a key omit some locales at NAC-2?

**A**: yes. NAC-2 emits warnings; NAC-3 emits errors. Most adopters
ship at NAC-2 during initial rollout, then promote to NAC-3 once
the catalog is complete.

### Q: How do I handle text that should NOT be translated (e.g. brand names)?

**A**: include the same value across all locales. The validator
does not enforce uniqueness, only presence:

```json
{
  "brand.name": {
    "es": "Yujin", "en": "Yujin", /* ... all same ... */
  }
}
```

### Q: Can I store catalogs server-side and load lazily?

**A**: yes. `NAC.registerCatalog(obj)` accepts incremental loads.
Code-split per locale and call `registerCatalog({es: ...})` only
when needed.

### Q: Does NAC track per-key version history?

**A**: no. Catalog versioning is the host's responsibility (git +
i18n library tooling). NAC operates on the current snapshot.

### Q: How does NAC handle bidi-marker insertion (RTL/LTR mixing)?

**A**: it does NOT. The host's CSS + `unicode-bidi: isolate` +
manual marker insertion handle BIDI. NAC only flags `dir="rtl"` on
the document root for RTL locales.

### Q: What if a third-party widget (NAC-adopted) ships only in English?

**A**: `derive.label_i18n` returns `{[NAC.locale()]: el.textContent}`
mono-locale. The runtime sets `_autoderived: true` flag. NAC-3 emits
`i18n_mono_locale_autoderived` warning. The adopter has two paths:

1. Provide a manual catalog for the widget's strings (covers all 10
   locales).
2. Wrap the widget with an intercept layer that translates per
   locale before rendering.

---

## 11. Worked example -- adding Catalan to Yujin

To make this concrete, the steps Yujin would follow if adding
`ca` (Catalan) as the 11th locale:

### Step 1 -- spec + runtime side (5 minutes)

```javascript
// In Yujin app's bootstrap, BEFORE NAC.boot()
NAC.setSupportedLocales([
  'es', 'en', 'pt', 'fr', 'it', 'de',
  'ja', 'zh', 'hi', 'ar',
  'ca'  // NEW
]);
```

### Step 2 -- catalog filling (4-6 hours, with tooling)

1. Yujin's catalog has ~500 keys (estimated).
2. Run `nac translate --to ca --provider anthropic --glossary ./glossary.json`
   on the ~500 keys not already in `ca`.
3. Native Catalan reviewer reviews translations (2-4 hours; can
   be a contractor or community contributor).
4. Glossary updated for technical terms specific to Yujin domain
   (kawa, sazanami, sumi-e, etc.).

### Step 3 -- visual smoke test (1 hour)

- Switch Yujin's UI to `ca` via `NAC.locale('ca')`.
- Walk the principal hubs (sidebar, dashboard, sazanami catalog,
  reports) checking layouts.
- Check that text length doesn't break grids or tables (Catalan
  averages ~10% longer than Spanish; usually safe).
- Verify CJK font fallback still works (since `ca` is Latin, no
  font issues).

### Step 4 -- validator pass (seconds)

```javascript
NAC.validate_global({i18n_strict: true});
// Expected: zero `i18n_missing_locale` for `ca`.
```

### Step 5 -- ship

Commit the catalog + the `setSupportedLocales` line. Deploy. End
users with Catalan locale preference (`navigator.language === 'ca'`)
auto-load Catalan strings via the host's i18n library.

**Total Yujin-side cost: ~5-7 hours including review + smoke
testing.**

**Total NAC-side cost: 0 (the spec was designed extensible).**

---

## 12. Spec maintainer guidance

When NAC v2.x patches add a new default-supported locale (e.g.
adding Russian to the canonical 10):

1. Update `spec/NAC-v2.0.md` "Default supported locales" table.
2. Update `js/nac.js` `SUPPORTED_LOCALES_DEFAULT` array.
3. Update `tests/i18n.spec.js` to include the new locale in
   missing-locale-detection tests.
4. Update the I18N_INTEGRATION_GUIDE.md cost matrix (section 5).
5. Add a CHANGELOG entry: "Default supported locales extended to
   include `xx` (was N, now N+1)."
6. Bump the patch version (this is additive, non-breaking).

---

## 13. Distribution to peer panel

This document is part of the v2.0 review bundle:

- `RFC_v2.0.0.md` -- the formal RFC
- `docs/NAC_v20_SCOPE_AND_ECOSYSTEM.md` -- scope discussion
- `docs/NAC_v20_ROADMAP_ACTIONABLE.md` -- operational plan
- **`docs/I18N_INTEGRATION_GUIDE.md`** -- this document
- `case-studies/yujin.md` -- adopter ground truth (in progress)

Reviewers are invited to challenge:

- Is L1 (contract + resolver, no DOM mutation) the right depth, or
  should NAC ship L2 (full runtime)?
- Are the 10 default locales the right starting set?
- Is the cost matrix in section 5 realistic, or should NAC publish
  cheaper estimates (and risk ecosystem disappointment) or higher
  estimates (and risk discouraging adoption)?
- Is the strict-mode default at NAC-3 (error on missing locale) too
  aggressive for typical SaaS rollout patterns?
- Does the bridge to existing i18n libraries (section 7) work for
  non-JSON formats (e.g. gettext .po, YAML)?

---

**Last updated**: 2026-05-09.
**Maintainer**: NAC spec authors (Pablo Adrian Kuschniroff, Sumi).
**Issues**: file at `https://github.com/pkuschnirof/nac-spec/issues`.
