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
- MIT License with citation request honoring Pablo Kuschnirof + Sumi
  (the AI partner).
- First production deployment: yujin.app/crm Centro de Control
  (Patch Manager + Plan tiles, NAC-3 verified).

### Reference deployments

- yujin.app/crm Centro de Control -- NAC-3 in production since
  2026-05-05 (Patch Manager mvp60 SCORE 22/22, Plan tile NAC-3
  certified).

[Unreleased]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/pkuschnirof/nac-spec/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/pkuschnirof/nac-spec/releases/tag/v1.0.0
