# NAC philosophy

> NAC was not invented to be a clever spec. It was extracted from
> two product principles that, taken seriously, force its shape.
> This document states those principles and explains why they
> produce the contract you see in `spec/NAC-v1.0.md` -- and why
> they place NAC in a different category than MCP, RPA scripting
> tools, or "AI button-clicking" frameworks.

## Principle 1 -- "The system disappears"

A modern UI exists because a human needs to do work. The UI is
not the work. The UI is the surface through which the work
happens. Every minute the user spends learning the UI is a
minute stolen from the work.

A well-built system disappears: the user has the intent and the
work happens, with the UI mediating invisibly. The screen, the
buttons, the modals are not the point; the outcome is.

Most software fails this principle because every feature adds a
new menu, a new modal, a new keyboard shortcut, a new place to
click. The user is forced to maintain a mental model of the
system itself, on top of the mental model of the work.

NAC's first principle is to take "the system disappears"
seriously and extend it to non-human operators. If the UI is
transparent for the human, it should be transparent for any
operator -- voice, chat, AI agent, RPA bot, automated test --
that acts on behalf of a human or alongside one.

That requires a contract that the UI publishes and any operator
consumes uniformly. ARIA is an instance of that for screen
readers; NAC is the instance for autonomous operators.

## Principle 2 -- "The AI agent has full access to the system as
if it were a human"

When an AI agent operates a system, there are two design
choices:

(A) Give the agent **privileged access**: an API key, a database
    cursor, a service-to-service token, an SDK that lets it call
    the backend directly. The agent operates the system as
    *another system*.

(B) Give the agent **human-equivalent access**: it uses the same
    UI the human uses, the same buttons, the same forms, the
    same modals, the same permission checks. The agent operates
    the system as a *human*.

NAC chooses (B) explicitly.

### Why (B) and not (A)

1. **Permission parity.** A human cannot delete a record without
   the "Delete" button being enabled by their role. An agent
   operating via UI gets the same gate for free. An agent
   operating via API has to re-implement permissions, and gets
   them wrong. The button is the permission; the agent that
   clicks the button gets the permission as the human would.

2. **Audit parity.** Every action the human takes leaves an
   audit trail under their identity. An agent acting on behalf
   of the user, via the UI, leaves the same audit trail. An
   agent acting via API leaves no equivalent trace, or leaves
   it under a service identity that is hard to attribute.

3. **i18n + UX parity.** A button that translates to "Aceptar"
   in Spanish, "OK" in English, "%@" in Japanese is one button.
   The agent driving via NAC sees one `data-nac-id` and gets the
   right thing. The agent driving via API rebuilds string
   matching per locale and breaks on the next translation
   update.

4. **Drift resistance.** When a backend changes its endpoint,
   API parameters, or response shape, an API-driven agent
   breaks. A UI-driven agent does not -- as long as the UI still
   has the button "Apply", the agent driving by NAC keeps
   working. The contract lives at the surface, where it is
   observable, not at the boundary, where it is hidden.

5. **No backdoor surface.** An API-key-driven agent is a
   permanent backdoor: if the agent identity leaks, every system
   it accesses is exposed. A UI-driven agent goes through the
   same login + MFA + session lifecycle as any user. There is
   no privileged surface to leak.

6. **The system disappears for the agent too.** The agent is
   not learning your backend; it is acting through your UI. Your
   backend is free to be refactored, sharded, replaced -- as
   long as the UI semantics stay, the agent stays operational.

### What this looks like in practice

Same screen. Same login. Same session. Same buttons. Same
permissions:

```
[ User ] -> click "Apply all" -> permission check -> backend executes
[ Agent via NAC ] -> NAC.click("apply_all") -> same permission check -> same backend
[ Agent via voice ] -> "apretá apply all" -> NAC.click("apply_all") -> same path
[ Test runner ] -> NAC.click("apply_all") -> same path, deterministic
```

One path. Four operators. Identical behavior, identical
permissions, identical audit.

## NAC vs MCP -- complementary, not competing

The Model Context Protocol (Anthropic, 2024-2026) is the modern
form of choice (A): expose your system to LLMs as a server with
typed tools. It is excellent at what it does. We use it.

But MCP and NAC sit on different layers and answer different
questions.

| Question | MCP answers | NAC answers |
|---|---|---|
| How does the agent reach the system? | As another system. Connects to a server, calls typed tools, receives typed responses | As a human. Opens the page, clicks buttons, fills fields, reads results |
| What does the agent know? | The backend tool surface (function names, params, returns) | The UI surface (plugins, actions, fields, states) |
| Permissions enforced where? | Re-implemented inside each MCP tool | Inherited from the existing UI permission gate |
| Surface stability over time | Breaks when backend changes | Stable as long as UI keeps the same button |
| Audit identity | Service identity (must be linked back to user) | User identity (same login session) |
| Best for | Server-to-server integrations, batch jobs, headless work, data pipelines | UI-driven assistance, voice/chat, RPA, automated UI tests |
| i18n / locale handling | Per-tool string handling | Free, from the UI |
| What disappears | The integration (no UI needed) | The system (UI mediates invisibly) |

**The two are layered and complementary.** A real product uses
both:

- An assistant that **drafts an invoice** for the user uses
  **NAC** to fill the invoice form on the user's screen, leaving
  the human in the loop, with the same permissions and audit
  trail as the human would.
- The same assistant, when asked to **summarise sales for the
  quarter**, uses **MCP** to query a read-only sales server,
  bypassing the UI because no UI mediation is needed for an
  aggregate read.

The rule of thumb:

- **Acting on behalf of the user with permissions, audit and
  identity? -> NAC.**
- **Reading data or running headless backend work? -> MCP.**
- **Both? -> use both, on the same agent.**

## Why this matters for the spec shape

The two principles directly produce the spec:

- **Principle 1 ("system disappears")** demands that the
  contract be on the surface of the UI, not behind it. Hence
  `data-nac-*` attributes ON the DOM, hence events emitted ON
  the page, hence `window.NAC` exposed to whoever loads the
  page. No hidden gateway.

- **Principle 2 ("agent as human")** demands that the contract
  expose what a human sees and does, not what the backend does.
  Hence verbs (`apply / submit / refresh`) instead of HTTP
  methods. Hence states (`idle / loading / success / error`)
  instead of HTTP status codes. Hence `manifest_nac` describes
  what the user can *do*, not what the backend can *expose*.

Every attribute, every event, every API function in the spec
maps to one of these two principles. If a v1.1 / v1.2 / v1.3 /
v1.4 / v1.5 extension (or any future version) cannot be
justified under at least one of them, it does not belong in
NAC. The five superset releases shipped to date were each
audited against this rule before merging.

## What this rules out

- **NAC will not standardise direct backend access.** That is
  MCP's job, and the principles forbid it.
- **NAC will not standardise pixel scraping.** Reading
  screenshots is the antithesis of "the system disappears". If
  the operator has to look at pixels, the contract failed.
- **NAC will not standardise selector engines, XPath, CSS-path
  recipes.** Those exist because contracts failed. NAC is the
  contract.
- **NAC will not introduce per-vendor extensions.** A vendor
  that wants its own surface should use a sibling spec
  (their own `data-vendor-*` namespace), not pollute NAC's
  vocabulary.

## What NAC does for people with disabilities

> Added 2026-05-07. Until v1.6.2 this document framed NAC almost
> exclusively in terms of "agents and tools" -- AI assistants,
> RPA bots, test runners. That framing is correct but
> incomplete. The downstream beneficiary of every NAC primitive
> is, more often than not, a human who could not reach the
> system any other way.

### NAC complements ARIA, but the consequence is human

ARIA targets assistive technologies that present the UI to
people with disabilities (screen readers, refreshable Braille,
switch access). ARIA describes structure. NAC adds operability
on top: a contract for *driving* the UI, not just *announcing*
it. That distinction matters because the population it serves
overlaps almost entirely with the population ARIA serves.
Examples, by disability type:

- **Motor disabilities** (limited dexterity, tremor, paralysis,
  RSI). Voice control software like Talon, Voice Access,
  Dragon, or browser voice modes already operates UIs by name,
  but their reliability collapses on UIs without stable
  semantic IDs. NAC's `data-nac-id` + `label_i18n` is exactly
  the contract those tools need: "click apply", "open patch
  manager", "drag Alpha to the right list" all become
  deterministic regardless of layout, theme, or rendering
  framework. The user's intent maps to one nac_id; the runtime
  drives the UI; the user never has to memorise pixel
  positions or DOM structure.
- **Visual disabilities** (blindness, low vision, dyschromatopsia,
  cataract, photophobia). Screen readers consume ARIA, but
  ARIA stops at structure. `NAC.describe()` returns a
  manifest-grade snapshot of every operable element with its
  current state, label in the user's preferred locale,
  feedback messages, and pending confirms -- a richer model
  than the accessibility tree alone. A screen reader plus
  `NAC.describe()` produces a narration the user can navigate
  by intent ("what can I do here?") instead of by widget
  taxonomy.
- **Cognitive disabilities** (dyslexia, autism spectrum,
  ADHD, executive-function variation, chronic fatigue). NAC's
  agentic loop pattern (spec sec 9.1, 9.2) lets a user
  delegate multi-step UI work to an AI assistant in plain
  language: "extract last quarter's sales report and email it
  to the team." For a user who finds 10-step UI navigation
  exhausting or impossible to plan, the agent becomes the
  prosthetic. The 10-locale demo at yujin.app/nac-spec
  shows this concretely: the bot accepts "tocate un Do" /
  "play a C" / "弹一个 Do" and the agent dispatches the click
  for the user.
- **Hearing disabilities** (deafness, hard of hearing). NAC
  itself does not produce audio, but its event model lets
  custom UAs build consistent visual confirmations for every
  action: `nac:action:succeeded` is a deterministic signal a
  visual notification system can subscribe to without parsing
  app-specific DOM. The contract removes the per-app
  engineering tax that currently keeps assistive notification
  layers limited to a small set of supported sites.
- **Disabilities that vary day to day** (chronic illness, pain
  flares, medication side effects, mental health). On a hard
  day, the same person who navigates the UI fluently on a
  good day can delegate the work to an agent through NAC and
  not lose access to the system. A contract that supports
  agentic operation IS an accessibility feature for users
  whose capabilities are not stable across sessions.

### Why this is not just "AI accessibility"

Disability advocacy correctly distrusts framings that reduce
accessibility to "let an AI do it for you" -- agency matters,
and over-reliance on opaque AI is a real risk. NAC's design
mitigates that risk because the contract is the same whether
the operator is the user, an assistive tool the user
controls, an AI the user delegates to, or a test runner the
user inspects:

- **The user keeps the surface.** Whatever an agent can do via
  NAC, the user can also do via the same UI buttons +
  manifest. There is no privileged backdoor; the agent is a
  proxy, not a substitute.
- **The contract is auditable.** `NAC.snapshot_state()` +
  `audit log of nac:action:succeeded` events let a user (or
  their advocate) verify what an agent did. ARIA cannot do
  this; backend APIs cannot do this; only a UI-surface
  contract can.
- **The contract is portable.** A user who relies on a
  specific assistive tool (voice control, switch access,
  agentic chat, eye tracker) is not locked to a vendor: any
  NAC consumer reads the same `data-nac-*` attributes. If
  one tool stops being maintained, another can replace it
  without re-instrumenting the apps.

### The operational consequence

Every spec change that lowers the cost of NAC adoption is, in
practice, an accessibility change. The v1.6.1 hard-error drift
gate forces design-system layers to emit ARIA + NAC atomically,
which means the screen reader and the agent see the same
state in lockstep. The v1.6.1 design-system pattern in
[`MANUAL.md`](MANUAL.md) is also the cheapest path for a team
that wants to ship accessible UIs at scale -- the same
primitive that makes the agent reliable makes the screen
reader reliable. The two needs converge.

NAC's stated audience ("AI agents, voice assistants, RPA bots,
test runners") is the *technical surface*. The audience that
benefits in practice is broader: it includes everyone for whom
the human-default UI is a barrier, and a deterministic
operable contract is an accommodation.

---

## Closing thought

The deepest reason NAC exists is simple:

> If the UI is good enough for a human, it should be good
> enough for any operator. If it is not good enough for any
> operator, it is probably not good enough for the human
> either.

The corollary, which v1.6.2 makes explicit:

> "Any human" includes humans whose access to the UI depends
> on assistive tools, voice, agents, or whatever they need.
> NAC is the contract that keeps the system reachable for all
> of them.

A system that disappears for the human is the same system that
disappears for the agent. NAC is the contract that makes that
possible.
