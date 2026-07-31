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

## Lessons already paid for

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
- **Expect the audit to find real defects, not just polish gaps.** The first
  run found unreadable text (1.15:1 contrast), pages reachable only by typing
  the URL, and links with no accessible name. Fix broken before beautiful.
