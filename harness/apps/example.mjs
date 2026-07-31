/**
 * Skeleton app config. Copy this file to `apps/<your-app>.mjs`, fill it in,
 * then run `node harness/run.mjs audit --app <your-app> --label baseline`.
 *
 * Everything app-specific lives here; the harness itself never needs editing.
 * See `apps/tv-gaus.mjs` for a complete worked example with states, flows,
 * cleanup, and dry-run mutation interception.
 */
const app = {
  name: "example",

  // MUST be loopback when auth is set — the harness refuses to send a real
  // session anywhere else. Point it at your local dev server or instance.
  baseUrl: process.env.HARNESS_BASE_URL ?? "http://127.0.0.1:3000",

  // How the harness gets signed in. Three options (see lib/session.mjs):
  //   1. command + file: run your app's "mint a session" script, then read the
  //      cookie it wrote ({ cookieName, value, expiresAt }). Recommended —
  //      see examples/app-session-script.ts for a reference implementation
  //      that reuses the app's own session machinery (never a bypass).
  //   2. cookies: an async callback returning Playwright cookie objects.
  //   3. null: app has no auth; everything is captured signed-out.
  auth: null,

  // Capture dark mode too by listing both; routes opt in via `schemes`.
  colorSchemes: ["light"],

  // Every route worth looking at, including error and empty states. Use fixed,
  // stable content ids in paths so later runs render the same content and
  // before/after comparisons mean something.
  routes: [
    { id: "home", label: "Home", path: "/", waitFor: "main" },
    {
      id: "not-found",
      label: "Unknown page",
      path: "/does-not-exist",
      notes: "What a bad link looks like."
    }
    // { id: "detail", label: "Detail", path: "/things/123", waitFor: ".hero",
    //   schemes: ["light", "dark"], skip: ["palette"] },
  ],

  // Interaction states a plain page screenshot never shows: open modals,
  // expanded disclosures, keyboard focus, hover, empty and error states.
  states: [
    // { id: "menu-open", label: "Nav menu open", path: "/",
    //   async setup(page) { await page.locator("button.menu").click(); } },
  ],

  // The tasks your users actually do, measured end to end. Start each flow
  // where a person would plausibly be standing when they decide to do it —
  // the trip to the page is usually where the friction hides. Use `cleanup`
  // to undo what a flow changed (it runs after the measurement is frozen),
  // or `interceptMutations()` inside `run` when the UI offers no undo.
  flows: [
    // { id: "sign-up", task: "1. Create an account", start: "/",
    //   async run({ click, type, note }) { … } },
  ],

  // Selector for the main content area, used by the "wasted space" heuristic.
  contentSelector: "main"
};

export default app;
