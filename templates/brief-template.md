# Frontend Overhaul: Brief and Mandate

<!-- Copy this file to docs/frontend-overhaul.md in your repo, replace every
     ⟨placeholder⟩, delete these comments, and commit it. This is the document
     the agent reads first and returns to; changes of direction get recorded
     here. Be generous with permissions and honest about boundaries — a long
     leash with a documentation requirement outperforms step-by-step approval. -->

Written ⟨date⟩ as the starting document for a chat dedicated to frontend work
on ⟨app name⟩ (⟨one-line description; where it runs; who uses it⟩).

## The goal

Make ⟨app name⟩ look and behave like a **finished, marketable product**. The
specific complaints to fix:

<!-- Name what bothers you in your own words. The originals, for reference: -->
1. **Polish** — it looks "meh": not good-looking, not cohesive.
2. **Responsiveness** — it doesn't hold up across viewports.
3. **Interaction efficiency** — common actions take multiple clicks and full
   page loads; things are buried or obscure.
4. Pages should exhibit what the user can do — no empty wasted space, no
   overcrowding either.
5. ⟨your app-specific complaints⟩

## Mandate and permissions (⟨owner name⟩, ⟨date⟩)

A **long leash**: do what you judge to be a good job and adapt as you go, as
long as it's all documented.

Concretely pre-approved (no need to re-ask):

- Install dev dependencies and tools (Playwright + headless Chromium, and
  whatever else earns its place).
- ⟨If your app has auth:⟩ a **server-side, loopback-only authenticated harness
  session** so the headless browser can see the app. Build it with the app's
  own session machinery — short-lived, revocable, never an auth bypass.
- Adopting **⟨Tailwind + shadcn/ui, `base-nova` style⟩** as the design system.
- Restructuring or rebuilding the UI, up to and including from scratch, when
  that produces a better outcome than incremental patching.
- Implementing without asking, when ready.

Boundaries that still stand:

- ⟨Data-layer rules: what must never be touched or deleted⟩
- ⟨Deploy rules: how this app ships; whether to iterate against a second local
  instance rather than production⟩
- ⟨House rules: changelog, docs, commit discipline, anything from your
  CLAUDE.md/AGENTS.md that applies⟩
- Undo any test data the harness creates through the UI.

## The method

Follow `⟨path to methodology.md — copy it into your repo or link the kit⟩`.
Short version: build the observation harness first, run a no-changes baseline
audit and write the report, then iterate in small screenshot-verified commits,
batching owner review through galleries and dated reports under
`docs/frontend/`. Adapt freely; record deviations in `docs/frontend/README.md`.

## Run scope

<!-- The default shape of a session, so later chats inherit it instead of
     re-negotiating. Any single session can override this by saying so. -->

- Default scope when I don't say otherwise: ⟨audit only / focused pass /
  deep run⟩
- Stop at the baseline audit for me to read: ⟨yes / no⟩
- ⟨Any hard limits: spend, time of day, "never run unattended against
  production"⟩

Whatever the scope: stop cleanly. Finish and commit the change in hand, verify
it with a run, write the pass up, and say where you stopped and what's next —
never leave a change half-applied. Check the clock at phase boundaries rather
than estimating elapsed time.

## The app, briefly

<!-- What the agent needs to orient: stack, how to run it locally, where the
     frontend code lives, anything already known-good it shouldn't regress. -->

- Stack: ⟨framework, styling approach, component library if any⟩
- Run locally: ⟨command and port⟩
- Frontend code: ⟨paths⟩
- Known good, don't regress: ⟨e.g. hard-won performance fixes⟩

## Task list for the click map

<!-- The tasks you actually do, in your words — see the kit's
     task-worksheet.md. If you don't want to write these now, tell the agent
     to draft them from the app and correct the draft during the audit. -->

| # | Task | Where it starts |
|---|------|-----------------|
| 1 | ⟨e.g. Add an item to my list while browsing⟩ | ⟨e.g. the catalog⟩ |
| 2 | … | … |

## Success criteria

- First-glance reaction is "this looks like a real product", not "meh".
- Holds up at phone width. Real loading/empty states everywhere.
- The tasks above are 1–2 clicks from wherever you are, without full reloads.
- Pages communicate what you can do; no dead space, no crowding.
- The owner reviews via galleries/reports, not live supervision.
- ⟨anything else that would make *you* call it done⟩

## Documentation expectations (the flip side of the long leash)

- Decisions and direction changes land in this doc or `docs/frontend/`.
- Audit reports, galleries, and measurements are kept, not overwritten — they
  are the evidence trail of before → after.
- ⟨your changelog/commit conventions⟩
