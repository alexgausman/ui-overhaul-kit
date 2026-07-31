import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * WORKED EXAMPLE — the real app config from TV Gaus, the personal TV-tracking
 * app this kit was extracted from. Kept verbatim because it demonstrates every
 * feature: routes with stable content ids, dark-mode opt-ins, empty/error
 * routes, interaction states, and flows with cleanup and dry-run interception.
 * Copy `example.mjs`, not this, as your starting point.
 *
 * Fixed show ids are used on purpose: a screenshot matrix is only a baseline if
 * later runs render the same content.
 */
const SHOW = {
  // In My Shows, cached episode guide, poster and overview present.
  detail: "tvtime-show%3A305288", // Stranger Things
  // Has stored similar-search runs, so /similar shows results rather than an
  // empty state.
  similar: "tmdb%3A156933", // Presumed Innocent
  // In My Shows with no note and no signal, so note/signal flows start from a
  // clean field and can be restored exactly. (Verified against the database;
  // it is currently the only such row, so re-verify if this flow starts
  // failing.)
  blankSlate: { id: "tmdb%3A215995", title: "Smoke" }
};

const tvGaus = {
  name: "tv-gaus",
  // Loopback only: the harness carries a real owner session.
  baseUrl: process.env.HARNESS_BASE_URL ?? "http://127.0.0.1:3020",

  auth: {
    command: ["npm", "run", "--silent", "ui:session"],
    cwd: PROJECT_ROOT,
    file: path.join(PROJECT_ROOT, "data", "runtime", "harness-session.json")
  },

  colorSchemes: ["light", "dark"],

  routes: [
    {
      id: "login",
      label: "Sign in",
      path: "/login",
      auth: false,
      notes: "The only page a visitor can reach signed out."
    },
    {
      id: "home",
      label: "Home",
      path: "/",
      waitFor: "main",
      schemes: ["light", "dark"],
      notes: "Landing page after sign-in."
    },
    {
      id: "catalog-mine",
      label: "Catalog — My Shows",
      path: "/browse",
      waitFor: ".show-table, .empty-state",
      schemes: ["light", "dark"]
    },
    {
      id: "catalog-all",
      label: "Catalog — All Shows",
      path: "/browse?scope=all",
      waitFor: ".show-table, .empty-state"
    },
    {
      id: "catalog-starred",
      label: "Catalog — Starred",
      path: "/browse?scope=starred",
      waitFor: ".show-table, .empty-state"
    },
    {
      id: "catalog-empty",
      label: "Catalog — no results",
      path: "/browse?scope=all&q=zzzqqqxyz",
      waitFor: ".show-table, .empty-state",
      notes: "Empty state for a search that matches nothing."
    },
    {
      id: "show-detail",
      label: "Show detail",
      path: `/shows/${SHOW.detail}`,
      waitFor: ".show-hero",
      schemes: ["light", "dark"]
    },
    {
      id: "show-similar",
      label: "Similar shows",
      path: `/shows/${SHOW.similar}/similar`,
      waitFor: ".similar-panel, main"
    },
    { id: "discover", label: "Discover", path: "/discover", waitFor: ".discovery-list, main" },
    { id: "recall", label: "Recall", path: "/recall", waitFor: ".recall-list, main" },
    {
      id: "notes",
      label: "Notes",
      path: "/notes",
      waitFor: ".notes-list, main",
      schemes: ["light", "dark"]
    },
    { id: "settings", label: "Settings", path: "/settings", waitFor: ".settings-card" },
    {
      id: "not-found",
      label: "Unknown show",
      path: "/shows/does-not-exist",
      notes: "What a bad link looks like."
    }
  ],

  /**
   * States a plain page screenshot never shows. Empty, loading, hover and focus
   * are where hand-written CSS usually turns out to have been written once and
   * never looked at again.
   */
  states: [
    {
      id: "episode-picker",
      label: "Episode picker modal",
      path: "/notes",
      notes: "The only way to log a watched episode.",
      async setup(page) {
        await page.locator(".watch-pill-button").first().click();
        await page.waitForSelector(".episode-chip", { timeout: 20000 });
      }
    },
    {
      id: "provider-disclosure",
      label: "Provider options expanded",
      path: "/browse?scope=starred",
      async setup(page) {
        await page.locator(".provider-disclosure summary").first().click();
      }
    },
    {
      id: "focus-ring",
      label: "Keyboard focus on the first row control",
      path: "/browse?scope=starred",
      notes: "Where a keyboard user is after tabbing into the results.",
      async setup(page) {
        await page.locator(".show-table tbody button").first().focus();
      }
    },
    {
      id: "notes-empty",
      label: "Notes — nothing left to note",
      path: "/notes?filter=todo&q=zzzqqq",
      notes: "The empty state of the page the owner uses most."
    },
    {
      id: "similar-idle",
      label: "Similar shows — before a run",
      path: `/shows/${SHOW.detail}/similar`,
      notes: "A show with no stored similar runs."
    }
  ],

  /**
   * The tasks the owner named, measured end to end. Each one starts where a
   * person would plausibly be standing when they decide to do it — that is the
   * part a click count usually hides.
   */
  flows: [
    {
      id: "add-to-my-shows",
      task: "1. Add a show to My Shows while browsing the catalog",
      start: "/browse?scope=all&excludeLibrary=1",
      async run({ page, click, note }) {
        const row = page.locator(".show-table tbody tr").first();
        const title = (await row.locator(".show-title").first().innerText()).trim();
        await click(
          row.locator('button[aria-label^="Add"]'),
          `Add "${title}" to My Shows`,
          { settleMs: 400 }
        );
        note("Inline on the catalog row, optimistic, no reload.");
        return { title };
      },
      async cleanup({ page }) {
        await page.locator('.show-table tbody tr button[aria-label^="Remove"]').first().click();
        await page.waitForTimeout(600);
      }
    },

    {
      id: "star-from-catalog",
      task: "2. Star a show from the catalog",
      start: "/browse?scope=all&excludeLibrary=1",
      async run({ page, click }) {
        const row = page.locator(".show-table tbody tr").first();
        await click(row.locator('button[aria-label^="Star"]'), "Star", { settleMs: 400 });
      },
      async cleanup({ page }) {
        const row = page.locator(".show-table tbody tr").first();
        await row.locator('button[aria-label^="Unstar"]').first().click();
        await page.waitForTimeout(300);
        // Starring implies My Shows membership; put that back too.
        const remove = row.locator('button[aria-label^="Remove"]');
        if (await remove.count()) {
          await remove.first().click();
          await page.waitForTimeout(400);
        }
      }
    },

    {
      id: "star-from-show-page",
      task: "2b. Star a show from its own detail page",
      start: `/shows/${SHOW.detail}`,
      async run({ page, note }) {
        const controls = await page.locator(".show-hero .show-state-controls").count();
        const anywhere = await page.locator("main .show-state-controls").count();
        note(
          controls || anywhere
            ? "Star control present on the detail page."
            : "No star or My Shows control anywhere on the detail page — you must go back to the catalog."
        );
        return { controlsInHero: controls, controlsOnPage: anywhere };
      }
    },

    {
      id: "set-signal",
      task: "3. Set a signal on a show you are looking at",
      start: `/shows/${SHOW.blankSlate.id}`,
      async run({ page, click, type, note, goto }) {
        const onDetail = await page.locator(".signal-picker").count();
        if (onDetail) {
          note("Signal picker is on the show page.");
          await click(".signal-step >> nth=4", "Pick a signal level", { settleMs: 400 });
          return { reachedFrom: "show page" };
        }
        const notesLink = page.locator('a[href^="/notes"]');
        if (await notesLink.count()) {
          note("No signal control on the show page; following its link to /notes.");
          await click(notesLink.first(), "Go to Notes", { waitForUrl: "**/notes*" });
        } else {
          note(
            "No signal control on the show page, and no link to /notes either — you have to know the URL or go back to the catalog first."
          );
          await goto("/notes", "Type /notes into the address bar");
        }
        await type('input[name="q"]', SHOW.blankSlate.title, "Type the show name");
        await click('.notes-controls button[type="submit"]', "Search", {
          waitForSelector: ".notes-card"
        });
        const card = page.locator(".notes-card").first();
        await click(card.locator(".signal-step").nth(4), "Pick a signal level", {
          settleMs: 500
        });
        return { reachedFrom: "/notes" };
      },
      async cleanup({ page }) {
        const active = page.locator(".notes-card .signal-step-active").first();
        if (await active.count()) {
          await active.click();
          await page.waitForTimeout(500);
        }
      }
    },

    {
      id: "write-note",
      task: "4. Write a note on a show you are looking at",
      start: `/shows/${SHOW.blankSlate.id}`,
      async run({ page, click, type, note, goto }) {
        const onDetail = await page.locator(".note-input").count();
        if (onDetail) {
          note("Note field is on the show page.");
          await type(".note-input", "harness note", "Type the note");
          return { reachedFrom: "show page" };
        }
        note("No note field on the show page — notes live only on /notes.");
        const notesLink = page.locator('a[href^="/notes"]');
        if (await notesLink.count()) {
          await click(notesLink.first(), "Go to Notes", { waitForUrl: "**/notes*" });
        } else {
          await goto("/notes", "Type /notes into the address bar");
        }
        await type('input[name="q"]', SHOW.blankSlate.title, "Type the show name");
        await click('.notes-controls button[type="submit"]', "Search", {
          waitForSelector: ".notes-card"
        });
        await type(".notes-card .note-input", "harness note", "Type the note");
        await page.locator(".notes-card .note-input").first().blur();
        await page.waitForTimeout(900);
        return { reachedFrom: "/notes" };
      },
      async cleanup({ page }) {
        const field = page.locator(".notes-card .note-input").first();
        if (await field.count()) {
          await field.fill("");
          await field.blur();
          await page.waitForTimeout(1200);
        }
      }
    },

    {
      id: "log-episodes",
      task: "5. Log the episodes you watched tonight",
      start: `/shows/${SHOW.detail}`,
      async run({ page, click, note, goto, interceptMutations }) {
        // Nothing is written: the episode POST is answered locally.
        await interceptMutations();
        const onDetail = await page.locator(".watch-pill-button").count();
        if (!onDetail) {
          note(
            "The show page lists every episode but has no way to mark one watched; the only episode logger is the pill on /notes."
          );
          const notesLink = page.locator('a[href^="/notes"]');
          if (await notesLink.count()) {
            await click(notesLink.first(), "Go to Notes", { waitForUrl: "**/notes*" });
          } else {
            await goto("/notes", "Type /notes into the address bar");
          }
          await page.waitForSelector(".notes-card");
        }
        await click(".watch-pill-button", "Open the episode picker", {
          waitForSelector: ".episode-modal"
        });
        await page.waitForSelector(".episode-chip", { timeout: 20000 });
        await click(".episode-chip >> nth=2", "Mark through episode 3", { settleMs: 400 });
      }
    },

    {
      id: "similar-search",
      task: "6. Run a similar-show search from the catalog",
      start: "/browse?scope=all",
      async run({ page, click, note }) {
        const row = page.locator(".show-table tbody tr").first();
        await click(row.locator(".show-title").first(), "Open the show", {
          waitForSelector: ".show-hero"
        });
        const link = page.locator('.show-similar-link a, a[href$="/similar"]');
        if (!(await link.count())) {
          note("No similar-search entry point on the show page.");
          return;
        }
        await click(link.first(), "Open Similar shows", { waitForSelector: "main" });
        note(
          "The Run button is one further click; it is not pressed here because a real run costs an API call and about 90 seconds."
        );
      }
    },

    {
      id: "triage-discover",
      task: "7. Triage one card in the discover queue",
      start: "/discover",
      async run({ page, click, note, interceptMutations }) {
        // The exposure ledger has no undo in the UI, so the POST is answered
        // locally instead of being written.
        await interceptMutations();
        const card = page.locator(".discovery-card").first();
        if (!(await card.count())) {
          note("Discover queue is empty.");
          return;
        }
        await click(card.locator('button[aria-label^="Interested"]'), "Interested", {
          settleMs: 600
        });
        note("Plain form POST: every verdict reloads the whole queue.");
      }
    },

    {
      id: "find-show-by-name",
      task: "8. Find a specific show by name from wherever you are",
      start: "/discover",
      async run({ page, click, type, note }) {
        const globalSearch = page.locator('header button[aria-label="Search shows"]');
        if (await globalSearch.count()) {
          note("Global search lives in the app chrome, on every page.");
          await click(globalSearch, "Open search", { waitForSelector: '[role="dialog"] input' });
          await type('[role="dialog"] input', "Sherlock", "Type the title");
          await page.waitForSelector('[role="dialog"] li button', { timeout: 15000 });
          await click('[role="dialog"] li button', "Open the result", {
            waitForSelector: ".show-hero"
          });
          return { via: "global search" };
        }
        note("No search anywhere except the catalog filter panel.");
        await click('a[href="/browse"]', "Back to the catalog", {
          waitForSelector: ".filter-panel"
        });
        await type('.filter-panel input[name="q"]', "Sherlock", "Type the title");
        await click('.filter-panel button[type="submit"]', "Search", {
          waitForSelector: ".show-table, .empty-state"
        });
        return { via: "catalog filter" };
      }
    },

    {
      id: "what-to-watch",
      task: "9. Answer “what should I watch tonight?”",
      start: "/browse",
      async run({ page, click, type, note }) {
        note(
          "No guided path exists; this is the shortest assembly from the catalog filters — My Shows, unwatched episodes, on a service I have."
        );
        await click('.check-field:has-text("Has unwatched episodes") input', "Has unwatched episodes");
        await page
          .locator('.filter-panel select[name="provider"]')
          .selectOption({ label: /Netflix/ })
          .catch(() => {});
        await type('.filter-panel input[name="minImdbRating"]', "7.5", "Type a rating floor");
        await click('.filter-panel button[type="submit"]', "Search", {
          waitForSelector: ".show-table, .empty-state"
        });
        const rows = await page.locator(".show-table tbody tr").count();
        return { rows };
      }
    },

    {
      id: "where-does-it-stream",
      task: "10. See where a show streams",
      start: `/shows/${SHOW.detail}`,
      async run({ page, note }) {
        const onDetail = await page.locator(".provider-availability").count();
        note(
          onDetail
            ? "Streaming availability is on the show page."
            : "The show page never says where it streams; that data is only a catalog column and filter."
        );
        return { providerBlocksOnDetail: onDetail };
      }
    }
  ]
};

export default tvGaus;
