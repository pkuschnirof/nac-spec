# Contributing to NAC

NAC (Native Accessibility Contract) is an open contract for making
modern UIs reliably operable by AI agents, voice assistants, RPA
runners, and traditional accessibility tools. Contributions are
welcome -- spec edits, reference-impl bug fixes, new test cases,
ports to other languages, and badge variants.

This document explains how to participate.

By contributing, you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## How to file an issue

We accept three kinds of issues. Each has a template under
`.github/ISSUE_TEMPLATE/`:

- **Bug report** -- something is broken in the spec text, the
  reference implementation `js/nac.js`, the test runner, or the
  manual. Open `bug_report.md`.
- **Pillar / role proposal** -- you found a use case the current 7
  pillars do not cover and want to propose an extension. Open
  `pillar_proposal.md`. **Required:** at least one production
  reference deployment (per `spec/NAC-v1.0.md` section 10) -- new
  attribute types or roles MUST land with at least one consumer
  that exercises the proposed change.
- **Vendor port** -- you ported NAC to a new language or platform
  (Python / Swift / Kotlin / Rust / ...). Open `vendor_port.md`
  to advertise your port and document spec parity.

---

## How to propose a new role / attribute / pillar

The spec is normative; we do not add attributes lightly. Open a
`pillar_proposal.md` issue first, get tentative buy-in, then submit a
PR that:

1. Edits `spec/NAC-v1.0.md` with the new attribute / role / pillar
   text. The spec PR MUST justify why the existing seven pillars are
   insufficient.
2. Updates `js/nac.js` (reference impl) with the matching helper or
   serializer change.
3. Updates `docs/MANUAL.md` so authors learn how to use the new
   surface.
4. Adds at least one test under `tests/` that exercises the new
   attribute end-to-end via the runner.
5. Adds a CHANGELOG.md entry under `## [Unreleased]` and bumps the
   semver appropriately. See "Versioning" below.
6. Names at least one production reference deployment. The reference
   deployment is a non-negotiable per spec section 10. If you cannot
   point to a real consumer, the PR stays in draft until one exists.

The PR will go through a normal review. Spec changes that pass review
land on `main` and ship in the next semver MINOR (or MAJOR if
breaking).

---

## Versioning

NAC follows Semantic Versioning 2.0.0:

- **MAJOR** -- breaks the public API contract or changes the
  semantics of an existing `data-nac-*` attribute. Existing NAC-3
  plugins MUST be re-audited.
- **MINOR** -- adds a new pillar, role, or attribute without breaking
  existing plugins. Existing NAC-3 plugins remain valid.
- **PATCH** -- doc clarifications, reference-impl bug fixes, test
  additions. No public-API change.

Every PR that touches the spec or the public API MUST bump the
version in CHANGELOG.md and justify the bump in the PR description.
Patch-only PRs (CI tweaks, README typos) skip the version bump.

---

## Porting NAC to another language or platform

NAC is platform-agnostic. We invite ports to Python (Selenium, Playwright,
RPA runners), Swift (iOS), Kotlin (Android), Rust (CLI tools), Go, and
beyond. Any port MUST honor the API contract defined in
`spec/NAC-v1.0.md` section 5:

- `register(slug, plugin_def)` / `unregister(slug)`.
- `manifest(slug)` returns the plugin manifest.
- `describe()` returns the live-DOM serialization.
- `list(filter)` enumerates matching nodes.
- `find(nac_id)` returns a single node by id.
- `read_feedback()` returns role=feedback content.
- `click(nac_id, opts)`, `fill(nac_id, value)`,
  `select(nac_id, value)`, `tab(plugin_slug, tab_id)`,
  `wait_for(predicate, timeout)`, `screenshot(area)`,
  `validate(slug)`.

When you ship the port, file a `vendor_port.md` issue documenting
which pillars (P1..P7) the port enforces and the repository URL. We
will list the port from the README so users can find it.

---

## Showing the NAC-3 badge in your README

Add this snippet to the project that consumes NAC-3:

```markdown
[![NAC Level 3](https://github.com/pkuschnirof/nac-spec/raw/main/docs/badge/nac-3.svg)](https://github.com/pkuschnirof/nac-spec)
```

Use `nac-2.svg` if you only meet pillars P1..P4 (silver), `nac-1.svg`
for P1..P3 (bronze), `nac-0.svg` for "trying but not yet compliant"
(rojo). Pick the level that honestly reflects your audit.

---

## How to set up a dev environment

NAC has zero runtime dependencies. The reference impl is plain JS,
the validator is plain JS, the runner is plain JS. To run the test
suite locally:

```bash
git clone https://github.com/pkuschnirof/nac-spec.git
cd nac-spec
# Open tests/ files in any browser, or run the headless runner
# (instructions in runner/README.md once it exists).
```

For spec edits, just open `spec/NAC-v1.0.md` in your editor.

---

## How to ask for help

- File an issue with the right template.
- Ping `@pkuschnirof` in the issue body if it is urgent.
- Email `pablo.kuschnirof@gmail.com` only for security disclosures
  (see `SECURITY.md` once it exists).

We try to triage within 72 hours. NAC is a small project; please be
patient and kind. The Code of Conduct applies to all interactions.
