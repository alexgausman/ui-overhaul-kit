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
npm test
```

The harness keeps its own `package.json` on purpose: Playwright and axe-core
never enter your app's dependency tree or Docker build.

The browser-backed tests exercise geometry contracts and axe under a strict
Content Security Policy; on a minimal Linux host, Playwright may first require
its documented browser system dependencies.

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
| `screens/state-<id>--<viewport>[-<scheme>].png` | Modals, disclosures, focus rings, empty states |
| `gallery.html` | Everything above on one scrollable page, with problem flags |
| `results.json` | Every measurement — timings, layout, a11y, links, task costs |

## What it measures

- **Timings** — TTFB, FCP, LCP, DOMContentLoaded, document and resource bytes.
- **Layout** — document height in screens, horizontal overflow *and the elements
  causing it* (ignoring anything inside a deliberate scroll container),
  effective click/tap targets under 24×24, visibly small controls whose
  associated label still provides a usable target, text under 12px, the set of
  distinct type sizes, sticky chrome, content width ratio.
- **Alignment contracts** — app-declared geometry checks for centered content,
  shared sibling edges / heights / centerlines, and equal-size action groups.
  Failures print as `FLAG` during a run and appear in the gallery instead of
  relying on someone to notice a few crooked pixels in a full-page image.
- **Accessibility** — axe-core against WCAG 2.0/2.1/2.2 A+AA, including
  `incomplete` colour-contrast results, which is where a modal on an
  unresolvable background hides.
- **Affordance** — whether a control *looks like* what it does. Computed
  `cursor` on every interactive element; a real-pointer hover probe that diffs
  the control's computed style **and its subtree** before and after (so
  feedback delivered by a parent's `group-hover` to a child still counts);
  controls floating over artwork with a translucent background and no
  `backdrop-filter`; and artwork in a repeated card that is not a click target
  while its title is. One probe per component variant, desktop only, since
  hover is a pointer-device state.
- **Navigation** — every in-app link per page, so the run can be turned into a
  graph and orphaned routes fall out of it.
- **Palette** — the colours, radii and type weights actually computed on the
  page, which is what a design-system diff needs.
- **Task cost** — per flow: clicks, URL entries, typed fields, full document
  loads, elapsed time, and a per-step trace of which click reloaded the page.
- **Task outcome** — a flow's `expect(condition, message)` assertions. Unmet
  expectations print under the flow line, render red in the gallery, and turn
  the run's verdict from `ok` to `UNMET`. Use `note()` for observations and
  `expect()` for anything that decides whether the task actually worked.

Assertions should cover contextual boundaries as well as the happy-path result.
If an action belongs only in one view, assert that it is visible there and absent
where it would be misleading. That turns leaked controls and broken CSS scoping
into failed task evidence instead of a screenshot detail someone must notice.

### The affordance checks are the ones humans notice first

They exist because a build that passed a full screenshot-and-axe audit was
still handed back by its owner with: the cursor is an arrow, the button does
nothing on hover, I cannot see the button against the artwork, and I cannot
click the poster. None of those is visible in a screenshot, and none is an axe
rule. Two implementation details decide whether the numbers mean anything:

- **Parse alpha from whatever colour syntax the engine returns.** Tailwind v4
  computes `oklab(L a b / .15)`, not `rgba(…)`. A parser that only knows the
  comma form reports every translucent control as fully opaque.
- **Fingerprint the subtree, not just the hovered element.** A card link whose
  poster scales on hover changes nothing about the link itself. Checking only
  the hovered element flags healthy components as dead and buries the real
  ones.

## Writing an app config

Copy `apps/example.mjs` to `apps/<your-app>.mjs` and fill it in. Read
`apps/tv-gaus.mjs` for a complete worked example — routes with stable content
ids, interaction states, and flows with cleanup and dry-run interception. Then:

```sh
node harness/run.mjs audit --app <your-app> --label baseline
```

Recurring visual primitives can declare geometry contracts in the app config:

```js
alignmentChecks: [
  {
    id: "badge-content",
    label: "Badge text is centered",
    type: "content-centered",
    selector: ".badge",
    tolerance: 1
  },
  {
    id: "action-group",
    label: "Sibling actions are equal-size",
    type: "equal-size",
    selector: ".actions",
    childSelector: ":scope > button",
    properties: ["width", "height"],
    tolerance: 1
  }
]
```

Use `aligned-children` when siblings should share metrics such as `top`,
`height`, `centerX`, or `centerY`. Checks whose selectors are absent or do not
yet have enough visible elements are recorded as skipped, so one shared list can
cover several routes and open interaction states. Text measurements wait for
webfonts to settle and use a configurable pixel tolerance.

Interaction states receive layout, alignment, accessibility, console, page-error,
and failed-request measurements as well as their screenshot. Opening a modal or
disclosure should not reduce the harness to visual evidence alone.

Routes and states capture only the first configured color scheme by default.
Opt an entry into more with `schemes: ["light", "dark"]`. State screenshot
filenames and merge keys include the non-default scheme, just like routes do.
For an app that stores its own theme preference instead of following
`prefers-color-scheme`, configure the browser context before its first page:

```js
async prepareColorScheme(context, colorScheme) {
  await context.addInitScript(
    (scheme) => localStorage.setItem("theme", scheme),
    colorScheme
  );
}
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
- Some workflows cannot be tested honestly without real writes: database
  constraints, generated files, uploads, and multi-step server state are common
  examples. Run those against a disposable database or data-directory snapshot
  mounted only by the loopback test instance. Never mount the authoritative
  source, record a source manifest or hash before and after, and destroy the
  snapshot when the run ends. This is the third safety mode alongside exact
  `cleanup()` and intercepted mutations.
