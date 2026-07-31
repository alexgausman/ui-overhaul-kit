# UI observation harness

A Playwright harness that lets an agent (or a person) *see* what a web app
actually looks like and how much work it costs to use it. Nothing app-specific
lives outside `apps/<app>.mjs` — porting it to a new app means writing one file.

The premise: AI-built frontends turn out mediocre because the model never looks
at its own output. So build senses first, measure, then change things.

## Setup

```sh
cd harness
npm install
npx playwright install chromium
```

The harness keeps its own `package.json` on purpose: Playwright and axe-core
never enter your app's dependency tree or Docker build.

## Usage

```sh
node harness/run.mjs audit --app <name> --label baseline   # everything
node harness/run.mjs shots --app <name> --viewports mobile,desktop --routes home
node harness/run.mjs flows --app <name> --label baseline   # task costs only
node harness/run.mjs states --app <name> --label baseline  # modals, focus, empty states
```

Output goes to `docs/frontend/runs/<date>-<label>/` in the parent project (or
`--out <dir>`). Re-running one command against an existing `--label` merges
into that run's `results.json` rather than replacing it, so you can iterate on
flows without re-shooting the whole screenshot matrix.

## What it produces

| File | What it is |
| --- | --- |
| `screens/<route>--<viewport>-fold.png` | The first screen — the first impression |
| `screens/<route>--<viewport>-full.jpg` | The whole page (capped at 8,000px) |
| `screens/state-<id>--<viewport>.png` | Modals, disclosures, focus rings, empty states |
| `gallery.html` | Everything above on one scrollable page, with problem flags |
| `results.json` | Every measurement — timings, layout, a11y, links, task costs |

## What it measures

- **Timings** — TTFB, FCP, LCP, DOMContentLoaded, document and resource bytes.
- **Layout** — document height in screens, horizontal overflow *and the elements
  causing it* (ignoring anything inside a deliberate scroll container), tap
  targets under 24×24, text under 12px, the set of distinct type sizes, sticky
  chrome, content width ratio.
- **Accessibility** — axe-core against WCAG 2.0/2.1/2.2 A+AA, including
  `incomplete` colour-contrast results, which is where a modal on an
  unresolvable background hides.
- **Navigation** — every in-app link per page, so the run can be turned into a
  graph and orphaned routes fall out of it.
- **Palette** — the colours, radii and type weights actually computed on the
  page, which is what a design-system diff needs.
- **Task cost** — per flow: clicks, URL entries, typed fields, full document
  loads, elapsed time, and a per-step trace of which click reloaded the page.

## Writing an app config

Copy `apps/example.mjs` to `apps/<your-app>.mjs` and fill it in. Read
`apps/tv-gaus.mjs` for a complete worked example — routes with stable content
ids, interaction states, and flows with cleanup and dry-run interception. Then:

```sh
node harness/run.mjs audit --app <your-app> --label baseline
```

## Safety

- When an app config declares `auth`, the harness carries a real session, so
  `lib/session.mjs` **refuses to attach it to a non-loopback host**. Point
  `baseUrl` at a local instance.
- The recommended auth recipe is a session minted server-side by the app's own
  script (see `../examples/app-session-script.ts`): short-lived, stored
  mode-600 in a gitignored path, revocable, validated by the app like any other
  session. Never build an auth bypass into the app for the harness's sake.
- Flows that mutate state should restore it: each declares a `cleanup` that
  runs *after* the measurement is frozen, so undoing never counts as task
  cost. For actions the UI cannot undo, call `interceptMutations()` — the POST
  is answered locally; the click cost and page reload are real, nothing is
  written. Check afterwards whether your app leaves semantically-empty residue
  rows anyway (ours did), and document how to clear them.
