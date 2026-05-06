---
name: Pillar / role / attribute proposal
about: Propose a new pillar, role, attribute, or required field for the spec
title: "[proposal] "
labels: proposal, needs-rfc
assignees: ''
---

## Summary

<!-- One paragraph: what are you proposing and why does it belong
in NAC? -->

## Spec section affected

- [ ] new pillar (would extend the current 7 pillars in spec section 3)
- [ ] new role (would extend section 4.2)
- [ ] new attribute on an existing role
- [ ] new manifest field
- [ ] new event in the lifecycle (section 5)
- [ ] new mode in `modes_supported`
- [ ] other (describe)

## Production deployment reference (REQUIRED per spec section 10)

NAC v1.0 spec mandates that every new pillar / role / attribute
must come with at least one real production deployment that
validates the proposal. List it here:

- Repo / product:
- Live URL or screenshot:
- Plugin slug or surface where it is exercised:
- What problem the proposed change solves there:

Proposals without a production deployment reference will be parked
under `needs-deployment-evidence` until one is provided.

## Concrete change

### Spec text diff

```
<!-- proposed normative text. Use diff style: -old / +new / or
just a new paragraph if it is additive. Quote the section number
and heading. -->
```

### Reference impl diff (if applicable)

```js
<!-- proposed change to js/nac.js or new helper. -->
```

### Manual update

```
<!-- proposed addition to docs/MANUAL.md so adopters know how to
exercise the new feature. -->
```

## Backwards compatibility

- [ ] additive only (existing manifests keep working)
- [ ] requires bump to NAC 1.1 (MINOR)
- [ ] requires bump to NAC 2.0 (MAJOR -- breaks 1.x adopters)

## Test cases

<!-- New cases under `tests/` that exercise the proposed change.
List the scenarios you would write. -->

## Alternatives considered

<!-- What else you tried, and why this proposal wins. -->

## Adoption path

<!-- How would existing 1.0 adopters migrate? Is there a codemod?
Can the validator detect missing fields automatically? -->
