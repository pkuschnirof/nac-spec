# Pull request

## Summary

<!-- One paragraph describing the change. -->

## Type of change

- [ ] spec edit (`spec/NAC-v1.0.md`)
- [ ] reference impl change (`js/nac.js`)
- [ ] runner / validator change
- [ ] manual update (`docs/MANUAL.md`)
- [ ] new test case under `tests/`
- [ ] new example under `examples/`
- [ ] new vendor port under a sibling repo (link below)
- [ ] release infra (CHANGELOG, badges, CI)
- [ ] other (describe)

## Linked issue

<!-- Closes #N -- use "Closes" so GitHub auto-closes on merge. -->

Closes #

## Checklist

### For every PR

- [ ] commit messages explain the WHY, not just the WHAT
- [ ] no merge commits (rebase against `main`)
- [ ] license-compatible (MIT) for any pasted snippet
- [ ] ASCII-only in normative spec text and reference impl

### When the PR touches the spec

- [ ] cited the section number in the diff (e.g. "section 4.2 P3")
- [ ] declared semver impact (PATCH / MINOR / MAJOR) in CHANGELOG
- [ ] backwards-compatible with 1.x adopters, OR documented the
      migration path
- [ ] referenced at least one production deployment that motivated
      the change (per spec section 10)

### When the PR touches the reference impl

- [ ] tests under `tests/` cover the new behavior
- [ ] no breaking changes to the public API surface (or bumped
      MAJOR + documented in CHANGELOG)
- [ ] zero runtime dependencies (impl stays single-file, vendor-
      friendly)

### When the PR adds a port to another language

- [ ] linked the new repo under a sibling org (or under your
      account with naming `nac-<language>`)
- [ ] passing the published tests
- [ ] license-compatible (MIT or compatible)

## Manual test plan

<!-- Step-by-step what a reviewer can run to verify the change. -->

1.
2.
3.

## Screenshots / output

<!-- Optional: paste console output, screenshots, or
NAC.snapshot_state() before/after. -->

## Notes for reviewer

<!-- Anything else the reviewer should know -- known limitations,
follow-up issues, design tradeoffs. -->
