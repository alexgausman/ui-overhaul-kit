# Methodology

The flow the agent follows. Written for the agent as much as for you — the
brief template tells it to read this file. Adapt freely; record deviations in
your project's `docs/frontend/README.md` as they happen.

## Principles

1. **Observe before changing.** Build the observation harness first, then run
   a no-changes baseline audit. Every claim in every report should trace to a
   number in a `results.json` or a pixel in a screenshot. "It looks better" is
   not a finding.

2. **Prefer mechanical critique to open-ended critique.** An agent asking
   itself "does this look good?" drifts into generic praise. Contrast ratios,
   tap-target sizes, document height in screens, clicks per task, horizontal
   overflow, inbound-link counts — these can't flatter. Reserve open-ended
   judgment for what the numbers can't see (hierarchy, tone, whether a page
   communicates what you can do), and do it against the design system's
   vocabulary, ideally in a separate pass from the one that wrote the code.

3. **Measure tasks from where the user is standing.** A task's cost includes
   getting to the page. Most real friction hides in the trip: the control
   that exists only on one page, the route with no link pointing at it. The
   navigation graph (every in-app link, per page) is what finds orphaned
   routes — screenshots never show what *isn't* there.

4. **Small verified steps.** Each change gets a harness run and its own
   commit, so any step is individually revertible and the gallery shows what
   it did. Long runs are mostly observation plus many small verified changes
   — never one big unsupervised redesign.

5. **The owner is the taste gate, batched.** The owner reviews galleries and
   dated reports when they have time — never block on them for individual
   steps, and never ask them to watch live.

6. **A design system is the reference, not a suggestion.** Adopting one
   (default here: Tailwind + shadcn/ui, `base-nova` style) is what makes
   critique checkable: real tokens, spacing scale, type scale, component
   states to diff against. Hand-rolled CSS accumulates write-once-look-never
   states; a system makes their absence visible.

7. **Keep the evidence.** Runs and reports are dated, kept, and never
   overwritten — they are the before/after trail that proves the work.

8. **Record what passes cost.** Every pass write-up states its full
   wall-clock duration plus coarse phase durations (observation / data
   gathering vs iterating vs write-up — no per-step detail), and an
   estimated token spend for the pass and the same phases, in dollars where
   known. Check the clock at the start and at phase boundaries; order of
   magnitude is fine for tokens, but state how the estimate was made (the
   agent tool's cost readout, or rough accounting). This is what keeps the
   run-scope estimates below honest and tells the owner what a given scope
   actually buys.

## The sequence

1. **Harness** — adapt `harness/` to the app (one config file; session-mint
   script if the app has auth). Verify it produces a gallery.
2. **Baseline audit** — full matrix (all routes × viewports × color schemes),
   interaction states, all task flows. Write the report. A structure that
   worked: *broken things* (defects, not style) → *unreachable pages* →
   *task costs* → *performance* → *layout/responsiveness* → *design critique*
   → *what's worth keeping* → *priorities*. "Worth keeping" matters: an
   overhaul that flattens what already worked is a regression with extra
   steps.
3. **Owner reads the audit**, adjusts priorities, confirms the design-system
   choice.
4. **Foundation step** — design system, tokens, app shell/navigation. Run the
   matrix again; the report states what measurably changed.
5. **Iterate by priority** — page by page, flow by flow. Each step: change →
   run → compare → commit → short write-up. Inline optimistic actions (no
   full-page reloads for one-click verbs) are usually the highest-value UX
   class of fix.
6. **Periodic full audit** — the same report structure as the baseline, so
   numbers line up column for column.

## Run scopes

- **Audit (~1h):** observation only, no changes. Produces the report and
  gallery. This is also the recurring health check.
- **Focused pass (1–2h):** one page or one flow. Baseline numbers for it,
  change, verify, write up.
- **Deep run (~8h, e.g. overnight):** many small gated iterations across the
  app, each screenshot-verified and committed separately, ending in a report
  and a before/after gallery for morning review. Not one long redesign.

These are budgets, not forecasts. Two things follow, and the agent should be
told both:

- **A scope is measured, not felt.** An agent has no sense of elapsed time and
  cannot estimate its own remaining runtime; it will cheerfully believe it is
  an hour into a run that has taken three. The only thing that makes a budget
  real is checking the clock at phase boundaries — which principle 8 already
  requires for the write-up, so the cost is zero.
- **Stopping badly is worse than not starting.** A run that hits its budget
  mid-refactor and stops leaves the repo in a state the owner has to untangle
  before they can even read the report. Stop at the next commit boundary:
  finish the change in hand, verify it, commit it, write the pass up, and say
  what you would have done next. That last sentence is what makes the following
  session cheap.

## Folding owner feedback back into the flow

Owner-reported misses are the flow's best fuel — and its biggest
overengineering risk. The wrong response is a micro-rule per miss: judgment
checklists spend *agent attention*, which is the scarcest budget in a pass,
and a bloated checklist gives trivia and load-bearing concerns the same
weight. The cost of a check depends on who pays it: a harness collector is
code and runs free forever; a checklist item is attention and dilutes.

Triage every miss through this rubric:

1. **Is it an instance of a class?** If not, just fix it — the pass report
   is the record. Not every miss deserves a rule.
2. **Can the class be checked mechanically?** Add a harness collector
   (computed styles, contrast sampling, state diffing, real-write flow
   coverage). Prefer this over any checklist wording — laundry lists are
   fine when code pays for them.
3. **Does an existing principle already cover it?** Then the failure was
   application, not absence. Note the miss against the principle; don't add
   a duplicate rule.
4. **Is it owner taste?** No rule. The batched gallery review *is* the
   mechanism — an owner catching a taste call in a five-second skim is the
   system working, not failing.

Guard the checklist's budget: a judgment-checklist addition must plausibly
catch *other future* misses, not just re-litigate this one — and prune on
every retrospective, don't only append.

From the first real application of this rubric (seven owner-reported misses,
one pass): four were mechanical and became **one** collector, one became a
flow assertion, one was an application failure against an existing principle,
and one was taste and got no rule at all. **Zero checklist items were added
and two were pruned.** Expect that shape. If a retrospective is producing a
new rule per miss, the rubric is not being applied.

Two patterns worth naming, because they recur:

- **A miss that a note already recorded is an application failure, not a
  missing rule.** If the harness observed it and the pass did not act, fix the
  mechanism that let the observation be ignored — that is what `expect()` is
  for — rather than adding a rule telling the agent to read its own output
  more carefully.
- **A destructive action wearing the icon of a constructive one is a design
  bug, not a labelling bug.** When the owner's reading of a control differs
  from what it does, their reading is usually the right design. Fix the verb,
  not the tooltip.

Learned during the first production use of this flow; take them as defaults.

- **Give the harness its own `package.json`.** Playwright and axe-core must
  not enter the app's dependency tree or Docker image.
- **Session safety is non-negotiable.** The harness carries a real session;
  refuse non-loopback hosts in code (not in a comment), mint sessions with
  the app's own machinery (short-lived, mode-600, gitignored, revocable), and
  never add an auth bypass to the app. Revoke when done.
- **Flows must clean up after the measurement is frozen**, so restoring state
  never counts as task cost. For actions the UI can't undo, answer the POST
  locally (`interceptMutations`) — real click costs, no writes. Then check
  for semantically-empty residue rows anyway, and document how to clear them.
- **Use fixed content ids in routes.** A screenshot matrix is only a baseline
  if later runs render the same content.
- **Cap full-page screenshots** (JPEG, ~8,000px) and record the true height —
  a 56,000px page as PNG is 50MB of unreadable evidence per run.
- **Keep axe's `incomplete` color-contrast results.** Contrast against a
  background axe can't resolve (stacked modals, translucent overlays) lands
  there, and it's exactly where a missing color token hides. Undefined CSS
  variables fail silently — the scan is what catches them.
- **Merge re-runs into an existing label** instead of replacing the run, so
  iterating on one flow doesn't silently shrink the matrix.
- **Screenshot interaction states, not just pages** — modals, disclosures,
  focus rings, empty states. That's where unreviewed styling accumulates.
- **Measure interaction states, not just their screenshots.** An open modal or
  disclosure gets the same layout, geometry, accessibility, and runtime-error
  checks as the page beneath it; otherwise the most weakly reviewed UI is also
  the least observed UI.
- **Encode recurring alignment misses as relationships, not coordinates.**
  Content centered in its container, sibling centerlines, shared edges, and
  equal-size action groups survive responsive layouts. Absolute pixel positions
  do not. Keep selectors app-specific and the collector generic.
- **Expect the audit to find real defects, not just polish gaps.** The first
  run found unreadable text (1.15:1 contrast), pages reachable only by typing
  the URL, and links with no accessible name. Fix broken before beautiful.
- **Run the after-state audit even when you are sure.** In one pass it caught
  a contrast regression the agent had introduced in that same pass — dimming a
  disabled control to `opacity: 0.8` dropped its text to 4.21:1 on 41 rows.
  Budget a rebuild-and-redeploy cycle for what the after-state finds; assuming
  the after-state is a formality is how a fix ships a new defect.
- **Verify against a production build, not the dev server.** A dev server with
  a broken HMR socket serves pages where *nothing hydrates*: every control is
  inert while every screenshot looks perfect. A harness pointed at it reports
  every interactive flow as broken and you will debug your own code for an
  hour. Build, serve the build, then measure.
- **A cleanup must undo what the flow did, not what looks like test data.**
  Pass the flow's own result into `cleanup()` and delete exactly those ids.
  The tempting version — "remove every unlocked watched episode on this show"
  — is correct against your test fixture and destroys real user data on the
  owner's row.
- **Client-boundary directives are contagious.** Marking a card `"use client"`
  also converts everything exported from that module, and a sibling component
  that takes an icon *component* or a formatter *function* from a server page
  will then render nothing — silently, with the error only in the server log.
  Split the module at the boundary and say why in a comment.
