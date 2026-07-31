# UI Overhaul Kit

A repeatable flow for getting an AI coding agent (built for Claude Code, but
nothing here is exclusive to it) to take a web app's frontend from "meh" to
finished-product quality — and to *prove* the improvement rather than assert it.

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

1. **Copy `harness/` into your repo** (it has its own `package.json`, so your
   app's dependency tree and Docker build stay untouched):

   ```sh
   cp -r harness/ your-app/harness/
   cd your-app/harness && npm install && npx playwright install chromium
   ```

2. **Describe your app** in `harness/apps/<your-app>.mjs` — base URL, routes,
   interaction states, task flows, auth recipe. Start from
   `harness/apps/example.mjs`; read `harness/apps/tv-gaus.mjs` for a complete
   worked example. If your app has auth, add a session-mint script to your app
   (pattern: `examples/app-session-script.ts`). You can also just ask the
   agent to write the app config and session script — point it at the worked
   example.

3. **Fill in the brief**: copy `templates/brief-template.md` to
   `docs/frontend-overhaul.md` in your repo and complete the placeholders —
   your complaints, your permissions, your design system. It defaults to
   Tailwind + shadcn/ui (`base-nova` style); change that if you want something
   else, but name *something* concrete: a design system is what turns "does
   this look good?" into checkable diffs.

4. **Read `methodology.md`** (2 minutes) so you know what the agent should be
   doing and why. It's also what the brief tells the *agent* to follow.

5. **Kick it off**: paste `templates/kickoff-prompt.md` (placeholders filled)
   into a fresh Claude Code chat. The agent builds/adapts the harness, runs
   the baseline audit, writes the report, and then starts improving in small
   screenshot-verified commits. You review the galleries and reports under
   `docs/frontend/` whenever you have time.

## What's in the box

| Path | What it is |
| --- | --- |
| `methodology.md` | The flow itself: principles, run scopes, and lessons learned in production |
| `harness/` | The portable observation harness (Playwright + axe-core; one config file per app) |
| `harness/apps/example.mjs` | Skeleton app config to copy |
| `harness/apps/tv-gaus.mjs` | Complete worked example from the app this kit was extracted from |
| `templates/brief-template.md` | The mandate document — fill in and commit to your repo |
| `templates/kickoff-prompt.md` | The message that starts the agent |
| `templates/task-worksheet.md` | How to write the task list the click-mapping measures |
| `examples/app-session-script.ts` | Reference session-mint script for authenticated apps |

## Requirements

- Node 20.9+ and a local (loopback) instance of your app to point the harness
  at — with auth, the harness *refuses* to run against anything non-loopback.
- An agent that can run shell commands and read images (built with
  [Claude Code](https://claude.com/claude-code) in mind).

## Origin

Extracted from the frontend overhaul of TV Gaus, a single-user TV-tracking
app, where the flow was developed and battle-tested in July 2026. The harness
is included as working code, not pseudocode — it produced every number above.
