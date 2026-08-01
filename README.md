# UI Overhaul Kit

A repeatable flow for getting an AI coding agent to take a web app's frontend
from "meh" to finished-product quality — and to *prove* the improvement rather
than assert it. Nothing in it is tool-specific — the harness is plain Node, the
templates are plain prose — though every run behind the numbers below was
Claude Code, so that is the path with road-testing behind it.

## Why this works when "make my UI better" doesn't

AI-built frontends turn out mediocre for a specific reason: the model writes
JSX against a mental image, never looks at the rendered result, and nobody
measures anything. This kit fixes that with four pieces that only work
together:

1. **Senses** — a Playwright observation harness (`harness/`) that gives the
   agent screenshots across viewports, load timings, accessibility scans, a
   navigation graph, and per-task click costs.
2. **A written mandate** — a brief (`templates/brief-template.md`) that records
   what the agent may do (install tools, adopt a design system, rebuild from
   scratch), what's out of bounds, and what "good" means for *your* app.
3. **Audit before changes** — a no-changes baseline run and written report, so
   every later change is measured against evidence instead of vibes.
4. **A documentation trail** — dated reports, before/after galleries, and one
   commit per verified change, reviewed by you in batches instead of live.

First real-world run (a personal TV-tracking app): serious accessibility
violations fell **3,039 → 101**, home-page TTFB **1,001ms → 127ms**, the page
went from 14.6 to 2.2 screens tall, two orphaned routes were discovered by the
navigation graph, and every route stopped overflowing horizontally — each
claim traceable to a `results.json` in the evidence trail.

## Quickstart

Paste [`templates/bootstrap-prompt.md`](templates/bootstrap-prompt.md) into a
fresh agent session — Claude Code, Codex, or anything comparable — in the repo
you want overhauled. That is the setup.

The agent fetches this kit, reads your codebase, and comes back with what it
worked out plus about five questions only you can answer — what bothers you
about the UI, what it may do without asking, your data and deploy rules, and
corrections to the task list it drafted. It writes your brief from those
answers and shows it to you before acting on it. Then it builds the harness,
runs a no-changes baseline audit, and writes the report.

Read [`methodology.md`](methodology.md) while it works — two minutes, and it's
what the agent is following.

Two things worth knowing going in:

- **The brief is a mandate, not paperwork.** The agent interviews you instead of
  autofilling it because the permissions in it are real: installing tools,
  rebuilding pages, writing to your data, deploying. Read what it drafts before
  you approve it.
- **Name a design system.** It defaults to Tailwind + shadcn/ui (`base-nova`
  style); change that if you want something else, but name *something* concrete
  — a design system is what turns "does this look good?" into checkable diffs.

Setting up by hand, or continuing an overhaul in a later chat? Use
[`templates/continue-prompt.md`](templates/continue-prompt.md).

## The product pass (sibling flow)

The UI pass asks *is this well made?* The **product pass** asks *should this
exist, does its organization make sense, and what's missing?* Same skeleton —
observe, critique against evidence, write it up, owner decides — but its
observation layer is revealed usage from the app's own database plus a
feature ↔ task map instead of screenshots, and it ships a
findings-and-proposals **document rather than commits**, because product
judgments can't be verified by a harness run the same hour. Method in
[`product-pass.md`](product-pass.md); start one with
[`templates/product-pass-prompt.md`](templates/product-pass-prompt.md). Run it
after a feature phase lands, not weekly.

## What's in the box

| Path | What it is |
| --- | --- |
| `methodology.md` | The UI flow itself: principles, run scopes, and lessons learned in production |
| `product-pass.md` | The sibling flow: feature usefulness, organization, and gaps — evidence-anchored, proposals not commits |
| `templates/product-pass-prompt.md` | The single message that starts a product pass |
| `harness/` | The portable observation harness (Playwright + axe-core; one config file per app) |
| `harness/apps/example.mjs` | Skeleton app config to copy |
| `harness/apps/tv-gaus.mjs` | Complete worked example from the app this kit was extracted from |
| `templates/bootstrap-prompt.md` | **Start here** — the single message that sets everything up |
| `templates/brief-template.md` | The mandate document the agent drafts with you, committed to your repo |
| `templates/continue-prompt.md` | Resuming in a later chat, or starting from a manual setup |
| `templates/task-worksheet.md` | How to write the task list the click-mapping measures |
| `examples/app-session-script.ts` | Reference session-mint script for authenticated apps |

## Requirements

- Node 20.9+ and a local (loopback) instance of your app to point the harness
  at — with auth, the harness *refuses* to run against anything non-loopback.
- An agent that can **run shell commands**, **edit files in a repo**, and
  **read images**.

That third one is not a nicety. The entire premise is that the agent looks at
its own output, and a screenshot it cannot open is a file on disk. An agent
without vision can still read every number in `results.json` — contrast, tap
targets, overflow, click costs — and that alone is worth running, but it will
not catch the things only a picture shows.

### Per-project agent instructions

Whatever tool you use, the brief tells the agent to respect your repo's house
rules. Those live in a different filename per tool: Codex and Gemini CLI read
`AGENTS.md`, Claude Code reads `CLAUDE.md`. Keeping byte-identical copies drifts
immediately — make one real and symlink the rest:

```sh
ln -sfn AGENTS.md CLAUDE.md
```

One file, every tool, no mirroring step. (Learned the hard way on the project
this kit came from, which maintained three diverging copies for months.)

## Origin

Extracted from the frontend overhaul of TV Gaus, a single-user TV-tracking
app, where the flow was developed and battle-tested in July 2026. The harness
is included as working code, not pseudocode — it produced every number above.
