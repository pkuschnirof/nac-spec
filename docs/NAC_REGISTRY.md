# NAC Adoption Registry

Public registry of apps shipping NAC conformance in production.

If your app uses `data-nac-*` attributes + emits the canonical
`nac:*` events + ships a NAC manifest, send a PR adding a row
below. Listing your app here helps the spec evolve with real
deployment evidence and helps other adopters find peer
implementations.

## How to add your app

Open a PR against `docs/NAC_REGISTRY.md` adding a row to the
table below. Required fields:

- **App / Product**: the public name + URL
- **NAC level**: `NAC-1` / `NAC-2` / `NAC-3` (per spec sec 6).
  NAC-3 means the app passes `NAC.validate()` with zero hard
  errors.
- **Spec version**: `v1.0`, `v1.7`, `v1.9`, etc.
- **Deployment date**: when NAC went live in production.
- **Industry**: SaaS / e-commerce / healthcare / education /
  government / public-sector / etc.
- **Maintainer contact**: GitHub handle or email (so adopters
  can reach you for peer questions).
- **Public link**: ideally a page that the visitor can operate
  via NAC.click() from their DevTools without login. If only
  available behind login, a video/screenshot is acceptable.

The registry is kept honest by community review. If a row is
disputed (e.g. "this app says NAC-3 but the validator finds 12
errors"), file an issue tagged `registry-dispute` and the
maintainer will resolve it.

## Registry

| App / Product | URL | NAC Level | Spec | Deployed | Industry | Maintainer |
|---|---|---|---|---|---|---|
| Yujin CRM (Patch Manager) | https://yujin.app/crm | NAC-3 | v1.9 | 2026-05-05 | SaaS / CRM | [@pkuschnirof](https://github.com/pkuschnirof) |
| NAC reference demo | https://yujin.app/nac-spec/example.php | NAC-3 | v1.9 | 2026-05-08 | reference / OSS | [@pkuschnirof](https://github.com/pkuschnirof) |

## Pending evaluations

Apps that have opened a registry PR but are still under review
appear here. If you see an app you can validate, leave a comment
on the PR.

(none currently)

## Notes

- The registry is informative, not normative. A row here does not
  certify the maintainer of NAC has audited the listed app's
  conformance. The registry exists as a discovery + peer-evidence
  surface, not a compliance certificate.
- Apps that drop NAC support after listing should update their
  row (mark the deployed-date end + level back to "withdrawn") so
  the registry stays honest.
- Companies offering paid NAC consulting can list their service
  via a separate PR against `docs/NAC_VENDORS.md` (TODO; ping the
  maintainer).
