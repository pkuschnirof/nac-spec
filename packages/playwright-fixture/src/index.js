/* @nac-spec/playwright-fixture -- skeleton (v2.0-rc2 Mistral T7-F2).
   NAC-aware Playwright fixture exposing:
     - page.nac.find(slug)        -- locator by NAC slug
     - page.nac.invoke(slug)      -- click+sign in one call
     - page.nac.snapshot()        -- describe_v2() result
     - expect.toMatchNacSnapshot  -- manifest diff vs baseline
   Phase 4 fills out via @playwright/test fixture API. */
'use strict';

module.exports = {
  test: null,    /* placeholder for the extended test runner */
  expect: null,
  /* Skeleton API for Phase 4 implementation. */
  __skeleton: true
};
