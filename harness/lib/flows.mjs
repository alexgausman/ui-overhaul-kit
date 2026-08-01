/**
 * Task flows measured the way a user experiences them: how many clicks, how many
 * full document loads, how long, and whether the entry point was reachable at
 * all from where the task starts.
 *
 * A flow declares the task in the owner's words and then drives it. The runner
 * owns the counting so flows cannot flatter themselves.
 */
export async function runFlow(page, flow, { baseUrl }) {
  const clicks = [];
  let fullLoads = 0;
  const onLoad = () => {
    fullLoads += 1;
  };

  const record = { id: flow.id, task: flow.task, start: flow.start ?? "/" };
  const startedAt = Date.now();

  page.on("load", onLoad);
  try {
    await page.goto(`${baseUrl}${record.start}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    fullLoads = 0; // The initial page load is the starting position, not a cost.

    const context = {
      page,
      baseUrl,
      /** Every user-visible click goes through here so the count is honest. */
      async click(target, label, options = {}) {
        const locator = typeof target === "string" ? page.locator(target) : target;
        const before = fullLoads;
        const started = Date.now();
        await locator.first().click(options);
        if (options.waitForUrl) await page.waitForURL(options.waitForUrl, { timeout: 30000 });
        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, { timeout: 30000 });
        }
        if (options.settleMs) await page.waitForTimeout(options.settleMs);
        clicks.push({
          label,
          ms: Date.now() - started,
          causedFullLoad: fullLoads > before
        });
      },
      /**
       * Typing a URL is not something a user can do by pointing at the screen.
       * When a flow has to reach a page with no link to it, that is recorded as
       * its own kind of step rather than hidden as a free navigation.
       */
      async goto(pathname, label) {
        const started = Date.now();
        await page.goto(new URL(pathname, baseUrl).toString(), {
          waitUntil: "domcontentloaded"
        });
        await page.waitForLoadState("load").catch(() => {});
        clicks.push({
          label: label ?? `type the URL ${pathname}`,
          ms: Date.now() - started,
          causedFullLoad: true,
          urlEntry: true
        });
      },
      /** Typing is not a click, but it is effort; recorded separately. */
      async type(target, text, label) {
        const locator = typeof target === "string" ? page.locator(target) : target;
        await locator.first().fill(text);
        clicks.push({ label: label ?? `type "${text}"`, ms: 0, causedFullLoad: false, typing: true });
      },
      note(message) {
        record.notes = [...(record.notes ?? []), message];
      },
      /**
       * A claim about the task that has to hold, rather than an observation
       * filed for later.
       *
       * This exists because of a specific failure mode: a flow recorded "this
       * page offers no way to do the task" as a note — prose, in a JSON blob,
       * among a hundred other numbers — and nothing happened until the owner
       * hit it himself. A note is evidence; an expectation is a claim that
       * fails loudly. Anything a flow already knows about whether the task
       * actually *worked* belongs here, not in note().
       *
       * The highest-value expectations are about what the click did to the
       * page: that the thing you acted on is still there, that its label
       * changed, that you did not get bounced to another route.
       */
      expect(condition, message) {
        const met = Boolean(condition);
        record.expectations = [...(record.expectations ?? []), { message, met }];
        if (!met) record.unmet = [...(record.unmet ?? []), message];
        return met;
      },
      /**
       * Measures a mutating action without performing it: the POST is answered
       * locally with the response the app would have sent, so the click cost and
       * the resulting full page load are real while the database is untouched.
       * Used for actions the UI offers no way to undo.
       */
      async interceptMutations(pattern = "**/api/**") {
        record.dryRun = true;
        await page.route(pattern, async (route) => {
          const request = route.request();
          if (request.method() !== "POST") return route.fallback();
          const accept = request.headers()["accept"] ?? "";
          if (accept.includes("application/json")) {
            return route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ ok: true, watchedCount: 0, totalCount: 0 })
            });
          }
          const body = new URLSearchParams(request.postData() ?? "");
          const returnTo = body.get("returnTo") || "/";
          return route.fulfill({
            status: 303,
            headers: { location: new URL(returnTo, baseUrl).toString() }
          });
        });
      }
    };

    record.result = (await flow.run(context)) ?? null;
    record.ok = true;
  } catch (error) {
    record.ok = false;
    record.error = String(error).split("\n").slice(0, 3).join(" ").slice(0, 300);
  } finally {
    page.off("load", onLoad);
  }

  // Cleanup runs after the measurement is frozen, so undoing test data never
  // shows up as task cost. It receives whatever `run` returned, so a flow can
  // undo exactly what it did — sweeping "anything that looks like test data"
  // is how a harness deletes real user data.
  if (flow.cleanup) {
    try {
      await flow.cleanup({ page, baseUrl, result: record.result });
      record.cleanedUp = true;
    } catch (error) {
      record.cleanupError = String(error).split("\n")[0].slice(0, 200);
    }
  }
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});

  record.elapsedMs = Date.now() - startedAt;
  record.clicks = clicks.filter((entry) => !entry.typing && !entry.urlEntry).length;
  record.typedFields = clicks.filter((entry) => entry.typing).length;
  record.urlEntries = clicks.filter((entry) => entry.urlEntry).length;
  record.fullDocumentLoads = fullLoads;
  record.steps = clicks;
  // A flow that ran without throwing but failed its own expectations did not
  // succeed at the task, and should not read as a green row.
  record.unmetCount = (record.unmet ?? []).length;
  return record;
}
