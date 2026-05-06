---
name: Bug report
about: Report a defect in spec, reference impl, runner, or manual
title: "[bug] "
labels: bug, needs-triage
assignees: ''
---

## Where is the bug

- [ ] spec (`spec/NAC-v1.0.md` -- normative text)
- [ ] reference impl (`js/nac.js`)
- [ ] runner / driver
- [ ] manual (`docs/MANUAL.md`)
- [ ] examples (`examples/`)
- [ ] tests (`tests/`)
- [ ] validator (`validator/`)
- [ ] other (describe)

## NAC version

- spec version: <!-- e.g. 1.0.0 -->
- reference impl version: <!-- e.g. js/nac.js commit hash -->

## What you observed

<!-- Concise description of the misbehavior. Include the exact
NAC manifest snippet, the call you made, and the response you got. -->

## What you expected

<!-- The behavior the spec mandates (cite the section, e.g. "spec
section 4.2 Pillar P3 -- state must be reported..."). -->

## Reproduction steps

1.
2.
3.

## Environment

- OS:
- Browser / runtime:
- Plugin slug under test:

## Logs / output

```
<!-- paste any error trace, console output, or NAC.snapshot_state()
result that helps localize the issue -->
```

## Severity hint

- [ ] blocks adoption (cannot ship without fix)
- [ ] degraded (workaround available)
- [ ] cosmetic / docs

## Proposed fix (optional)

<!-- If you already know how to fix it, describe the change here.
Bonus points if you also open a PR linking this issue. -->
