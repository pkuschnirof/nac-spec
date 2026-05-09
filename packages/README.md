# NAC v2.0 -- @nac-spec/* tooling packages

Skeletons for the v2.0 ecosystem tooling. Each subdirectory is an
independently versioned npm-publishable package.

| Package | Status | Purpose |
|---|---|---|
| `babel-plugin-react` | skeleton | auto-inject `data-nac-id` from React component name + key prop |
| `vue-plugin` | skeleton | analogous for Vue 3 SFC |
| `svelte-preprocessor` | skeleton | analogous for Svelte |
| `devtools` | skeleton | Chrome / Firefox extension (Manifest V3): live manifest tree, validate, fix suggestions |
| `codemod` | skeleton | CLI tool: scan codebase, infer NAC annotations, output PR. ~60% auto-coverage target |
| `cookbook` | skeleton | 30 resolved patterns: form, dropdown, autocomplete, modal-with-form, virtualized list, etc. |
| `rules-stripe` | skeleton | pre-baked `NAC.adopt` rules for Stripe Elements |
| `rules-slack` | skeleton | analogous for Slack widget |
| `rules-mapbox` | skeleton | analogous for Mapbox GL JS |

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
