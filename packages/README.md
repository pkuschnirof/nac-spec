# NAC v2.0 -- @nac-spec/* tooling packages

Skeletons for the v2.0 ecosystem tooling. Each subdirectory is an
independently versioned npm-publishable package.

| Package | Status | Purpose |
|---|---|---|
| `babel-plugin-react` | skeleton | auto-inject `data-nac-id` from React component name + key prop |
| `vue-plugin` | skeleton | analogous for Vue 3 SFC |
| `svelte-preprocessor` | skeleton | analogous for Svelte |
| `solid-plugin` | skeleton (rc2) | SolidJS plugin (added per Mistral T7-F1) |
| `qwik-plugin` | skeleton (rc2) | Qwik plugin (added per Mistral T7-F1) |
| `lit-preprocessor` | skeleton (rc2) | Lit preprocessor + auto bridgeShadowRoot (Mistral T7-F1) |
| `devtools` | skeleton | Chrome / Firefox extension (Manifest V3): live manifest tree, validate, fix suggestions |
| `codemod` | skeleton | CLI tool: scan codebase, infer NAC annotations, output PR. ~60% auto-coverage target |
| `playwright-fixture` | skeleton (rc2) | NAC-aware Playwright fixture (Mistral T7-F2) |
| `telemetry` | skeleton (rc2) | base interface for Sentry/Datadog/OTel adapters (Mistral T7-F3) |
| `cookbook` | skeleton | 30 resolved patterns: form, dropdown, autocomplete, modal-with-form, virtualized list, etc. |
| `rules-stripe` | skeleton | pre-baked `NAC.adopt` rules for Stripe Elements |
| `rules-slack` | skeleton | analogous for Slack widget |
| `rules-mapbox` | skeleton | analogous for Mapbox GL JS |

**Deferred to v2.0.x post-tag** (per Mistral T7-F2/F4):
- `cypress-plugin` -- Cypress integration
- `storybook-addon` -- Storybook addon for per-story manifest validation
- `vscode-ls` -- VS Code language server for manifest schema

**Status of these skeletons (2026-05-09)**: API surfaces defined,
boilerplate scaffolded, real implementation work mapped in
`docs/NAC_v20_ROADMAP_ACTIONABLE.md` phase 4.

**Each package** ships:
- `package.json` (npm metadata)
- `README.md` (purpose + usage)
- `src/` or `index.js` (entrypoint -- skeleton today, full impl in phase 4)

**Independent versioning**: each package follows its own semver. No
lockstep with `nac-spec` core. The peer review focus is the API
surface (covered by RFC v2.0.0); implementation maturity follows.

---

## Publishing strategy

Spec author owns:
- `@nac-spec/babel-plugin-react`
- `@nac-spec/vue-plugin`
- `@nac-spec/svelte-preprocessor`
- `@nac-spec/devtools`
- `@nac-spec/codemod`
- `@nac-spec/cookbook`
- `@nac-spec/rules-stripe` (seeded; community can fork)
- `@nac-spec/rules-slack` (seeded)
- `@nac-spec/rules-mapbox` (seeded)

Community ownership encouraged for:
- `@nac-spec/rules-{any-other-widget}`

The `nac-spec/rules/` git directory in this repo is the seed +
canonical reference. Community-maintained rules can move to their
own repos with their own maintainers.
