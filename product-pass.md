# Product Pass

A sibling flow to the UI overhaul: same skeleton — observe, critique against
evidence, write it up, owner decides — pointed at a different question. The UI
pass asks *is this well made?* The product pass asks **should this exist, does
its organization make sense, and what's missing?** Run it at a longer cadence:
after a feature phase lands, not weekly.

## The one condition that changes everything

A UI pass ships commits, because every change can be verified the same hour by
a harness run. Product judgments cannot: "this feature now makes sense" is
validated slowly, through use. So a product pass **ships a findings-and-
proposals document, not implementation**. The owner picks from it; the picks
become ordinary work afterwards. An agent allowed to restructure the product
in the same breath as critiquing it produces confident rearrangements with no
feedback loop behind them — hold the line on this even when a proposal seems
obviously right.

## The observation layer

What screenshots are to a UI pass, these are to a product pass:

1. **Revealed usage.** The app's own database says which features are actually
   used. Counts and last-activity dates per feature — items created, actions
   taken, through which surface. A feature with real UI, real backend, and
   zero rows is the product equivalent of an orphaned route, and the query
   that finds it is mechanical, not vibes. Build a small read-only usage
   script for the app if one doesn't exist (it becomes part of the repo, like
   the harness config). Note the features that *can't* be measured — pure
   browsing surfaces with no instrumentation — because "we have no idea if
   this is used" is itself a finding.
2. **The feature ↔ task map.** Take the task worksheet (the same one the UI
   pass measures) and map features to tasks. Three things fall out: features
   serving no task, tasks served poorly or not at all, and tasks served by
   several overlapping features — the raw material for consolidation.
3. **The feature inventory.** Every surface and verb the app exposes, from
   the routes and the codebase — including the ones the owner forgot exist.

## The evidence rule

Same spirit as the UI methodology's "a claim traces to a number or a pixel",
adapted: **every finding and every proposed avenue must cite at least one
of** — a usage number, a task from the worksheet, data the app already holds,
or an observed workaround (the owner doing something manually that the app
could do). Generic product advice ("add onboarding", "add social features",
"gamify it") is the product equivalent of meh UI: plausible, unfalsifiable,
and unanchored. If a proposal can't cite its evidence, it doesn't go in the
report.

## Symmetric consideration

Proposing additions is free and unaccountable; killing and merging is the
harder, higher-value call — and it will not happen unless the methodology
demands it. For every feature area, the pass must answer *keep / grow / merge
/ shrink / remove*, not just "what could we add?" Overlapping surfaces that
grew historically (three discovery pages, two places to write the same note)
are prime material: is the segregation intuitive, or just accretion?

## The personal / general lens

Every finding gets tagged **personal** (grounded in this owner's actual usage
and stated needs) or **general** (how it would fare for a second user, or as
a shipped product). Rules:

- **Infer the audience from the repo and state the inference in the report**
  ("single-user personal tool; personal evidence outweighs general
  speculation") rather than asking the owner to configure it. If the repo
  already serves multiple users, the weighting flips.
- For a single-user repo, the general lens means **concept portability**:
  what's entangled with founder-specific data, what would need renaming or
  re-explaining for a stranger, which mental models are idiosyncratic.
  Concept-level clarity is cheap to record now and expensive to retrofit.
- The general lens must **never** license proposing generalization
  infrastructure (multi-tenancy, onboarding flows, billing) for hypothetical
  users. Those are roadmap decisions, not pass findings.
- Where the lenses conflict, personal wins: it has ground truth; general is
  hypothesis.

## The report

One dated document under `docs/product/`, kept forever like the UI reports.
A structure that fits the method:

1. **How this app presents itself** — inferred purpose and audience, stated
   plainly so the owner can correct the premise.
2. **Feature inventory with revealed usage** — the table the rest cites.
3. **Findings** — organization and segregation critique, orphaned features,
   overlaps, unmeasurable surfaces, concept-portability notes; each with
   evidence and a personal/general tag.
4. **Proposals, ranked** — each with the verdict class (keep / grow / merge /
   shrink / remove / new avenue), its evidence, a rough cost, a confidence,
   and the lens tag. New avenues obey the evidence rule like everything else.
5. **What was deliberately not proposed** — the tempting generic moves the
   evidence didn't support. This section keeps the pass honest.
6. **Timing and spend** — same discipline as UI passes: wall-clock and token
   estimates, total and per phase.

## Failure modes to design against

- **Advice slop** — proposals with no evidence citation. The rule above
  exists for this; enforce it mechanically when reviewing the draft.
- **Roadmap fantasy** — building for users who don't exist yet. The general
  lens describes, it does not mandate.
- **Addition bias** — a report that only adds. If nothing is proposed for
  merging or removal, say why explicitly; "everything earns its place" is a
  legitimate but unusual verdict that needs defending.
- **Verdict without priority** — twenty co-equal proposals is not a
  recommendation. Rank, and say what you'd do first and why.
