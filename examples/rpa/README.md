# NAC examples for RPA platforms

Working samples that drive a NAC-compliant page from the three
dominant enterprise RPA platforms: UiPath, Automation Anywhere
and Blue Prism. Each example performs the same scenario against
the live demo at https://yujin.app/nac-spec/example-navmap.php
so you can compare the integration shapes apples-to-apples.

The shared scenario:

1. Open the page in the platform's browser activity / object.
2. Call `NAC.system_map()` to discover what the system does.
3. Search for a customer ("Acme Corp") via
   `NAC.search_options('customers.search', q, 5)`.
4. Pick the first result.
5. Fill `orders.amount = 1500` + `orders.priority = 'high'` via
   `NAC.fill`.
6. Click `orders.submit` via `NAC.click`.
7. Wait for `nac:action:succeeded` via `NAC.wait_for`.
8. Read the success message and write it to a process log.

That whole flow is ~15 lines of code in any platform. Compare
this with a selector-driven implementation that has to record
each click against fragile XPaths.

## Folder map

```
examples/rpa/
+-- uipath/                     UiPath Studio sample
|   +-- README.md
|   +-- nac_drive.xaml          xaml workflow (Invoke JavaScript activity chain)
|   +-- nac_helpers.js          shared JS lib loaded via Inject Script
+-- automation_anywhere/        Automation Anywhere A360 sample
|   +-- README.md
|   +-- nac_drive.atmx          bot file
|   +-- nac_helpers.js          shared JS lib (Run JavaScript Code action)
+-- blue_prism/                 Blue Prism sample
|   +-- README.md
|   +-- nac_drive.bprelease     release file
|   +-- NAC_Web_Object.xml      Web Object with NAC-aware Stages
|   +-- nac_helpers.js          shared JS lib injected via Inject JS Fragment
+-- shared/
    +-- nac_helpers.js          canonical helper library (all 3 vendors copy it)
```

## Why "execute JavaScript" is enough

Every enterprise RPA platform has a primitive that runs a
JavaScript snippet in the current browser tab and returns a
result:

| Platform | Activity / action |
|---|---|
| UiPath  | `Invoke JavaScript` (UiPath.UIAutomation.Activities) |
| Automation Anywhere | `Run JavaScript Code` (Browser package) |
| Blue Prism | `Inject JS Fragment` + `Get JS Result` Stages on a Web Object |
| Power Automate Desktop | `Run JavaScript on web page` |
| Robocorp | `Browser.Library.execute_javascript` |

NAC turns this primitive into a complete operation contract.
Instead of asking "click the third div with class
.btn-primary", the bot says `NAC.click('orders.submit')`. Same
primitive; better target.

## Prerequisites for running the examples

1. The target page must have `js/nac.js` loaded. (The yujin.app
   demo does; a brownfield app may not -- in that case load it
   yourself with one extra `Inject JS` step.)
2. Manifests must be registered. The demo registers them
   automatically on boot. For your own apps, see
   `tools/nacify` to migrate.
3. The bot account needs no special privileges. NAC operates
   as a regular page visitor would. This is the principle:
   "agent acts as a human, not as another system".

## What the samples don't do

- They don't replace your orchestrator. UiPath Orchestrator,
  AA Control Room and Blue Prism Server still own scheduling,
  queues, credentials, audit and human handoff.
- They don't replace your authentication. The bot still logs
  in through your normal SSO / OTP flow first; NAC takes over
  once the page is loaded.
- They don't sandbox the JS. Whatever NAC can do, the bot can
  do. Constrain by browser session, not by NAC.

See `docs/IMPACT_RPA.md` for the full operational argument.
