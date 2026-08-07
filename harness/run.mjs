#!/usr/bin/env node
/**
 * UI observation harness.
 *
 *   node harness/run.mjs audit   --app tv-gaus --label baseline
 *   node harness/run.mjs shots   --app tv-gaus --viewports mobile,desktop
 *   node harness/run.mjs flows   --app tv-gaus
 *   node harness/run.mjs compare --app tv-gaus --against baseline
 *
 * The harness knows nothing about any particular app. Everything specific lives
 * in harness/apps/<app>.mjs — base URL, routes, viewports, auth recipe, flows.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppConfig } from "./lib/config.mjs";
import { resolveAuth } from "./lib/session.mjs";
import { collectPageProblems, launch, newContext } from "./lib/browser.mjs";
import { measureLayout, measureLinks, measurePalette } from "./lib/inspect.mjs";
import { measureAffordance, parkPointer } from "./lib/affordance.mjs";
import { measureNavigation } from "./lib/timings.mjs";
import { scanAccessibility } from "./lib/a11y.mjs";
import { measureAlignment } from "./lib/alignment.mjs";
import { runFlow } from "./lib/flows.mjs";
import { renderGallery, writeJson, writeText } from "./lib/report.mjs";

const FULL_PAGE_MAX_HEIGHT = 8000;

const HARNESS_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.dirname(HARNESS_ROOT);

const [command = "audit", ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);

const appName = flags.app ?? "tv-gaus";
const config = await loadAppConfig(appName, HARNESS_ROOT);

const label = flags.label ?? command;
const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.resolve(
  PROJECT_ROOT,
  flags.out ?? path.join("docs", "frontend", "runs", `${stamp}-${label}`)
);

const wantShots = command === "audit" || command === "shots";
const wantFlows = command === "audit" || command === "flows";
const wantStates = command === "audit" || command === "states";
// Interaction states are about the component, not the breakpoint; two widths
// is enough to see both the desktop and the cramped version.
const STATE_VIEWPORTS = new Set(["desktop", "mobile"]);

const viewportFilter = flags.viewports ? new Set(flags.viewports.split(",")) : null;
const routeFilter = flags.routes ? new Set(flags.routes.split(",")) : null;
const viewports = config.viewports.filter((v) => !viewportFilter || viewportFilter.has(v.name));
const routes = config.routes.filter((r) => !routeFilter || routeFilter.has(r.id));

mkdirSync(outDir, { recursive: true });

console.log(`app        ${config.name}`);
console.log(`base url   ${config.baseUrl}`);
console.log(`output     ${path.relative(PROJECT_ROOT, outDir)}`);

const auth = await resolveAuth(config);
console.log(`auth       ${auth.cookies.length ? `session from ${path.relative(PROJECT_ROOT, auth.source)}` : "anonymous"}`);

const browser = await launch();
const started = Date.now();
const runs = [];
const stateResults = [];
const flowResults = [];

try {
  if (wantShots) {
    for (const colorScheme of config.colorSchemes) {
      for (const viewport of viewports) {
        const contexts = new Map();
        // Public routes are captured signed-out, which is how they are actually
        // seen; reusing the authenticated context would just redirect away.
        const contextFor = async (authenticated) => {
          if (!contexts.has(authenticated)) {
            contexts.set(
              authenticated,
              await newContext(browser, {
                viewport,
                colorScheme,
                cookies: authenticated ? auth.cookies : []
              })
            );
          }
          return contexts.get(authenticated);
        };
        for (const route of routes) {
          if (route.schemes && !route.schemes.includes(colorScheme)) continue;
          if (!route.schemes && colorScheme !== config.colorSchemes[0]) continue;

          const context = await contextFor(route.auth !== false);
          const page = await context.newPage();
          const problems = collectPageProblems(page);
          const suffix = colorScheme === config.colorSchemes[0] ? "" : `-${colorScheme}`;
          const base = `${route.id}--${viewport.name}${suffix}`;
          const foldName = `${base}-fold.png`;
          const fullName = `${base}-full.jpg`;
          const foldFile = path.join(outDir, "screens", foldName);
          const fullFile = path.join(outDir, "screens", fullName);

          const entry = {
            routeId: route.id,
            routeLabel: route.label,
            path: route.path,
            notes: route.notes,
            viewport: viewport.name,
            colorScheme,
            width: viewport.width,
            height: viewport.height,
            // The fold is the first impression; the full page is the evidence.
            screenshot: path.join("screens", foldName),
            fullPage: path.join("screens", fullName)
          };

          try {
            const response = await page.goto(`${config.baseUrl}${route.path}`, {
              waitUntil: "domcontentloaded",
              timeout: 45000
            });
            entry.status = response?.status() ?? null;
            entry.finalUrl = page.url().replace(config.baseUrl, "");
            if (route.waitFor) {
              await page.waitForSelector(route.waitFor, { timeout: 20000 }).catch(() => {});
            }
            await page.waitForLoadState("load").catch(() => {});
            // Posters stream in from TMDB; a screenshot taken before they land
            // misrepresents the page.
            await page.waitForTimeout(600);

            entry.timings = await measureNavigation(page).catch(() => null);
            entry.layout = await measureLayout(page, {
              contentSelector: config.contentSelector
            }).catch(() => null);
            entry.alignment = await measureAlignment(page, config.alignmentChecks).catch(() => null);
            if (viewport.name === "desktop" && colorScheme === config.colorSchemes[0]) {
              entry.links = await measureLinks(page, config.baseUrl).catch(() => null);
            }
            if (!route.skip.includes("a11y")) {
              entry.a11y = await scanAccessibility(page).catch(() => null);
            }
            if (!route.skip.includes("palette") && viewport.name === "desktop") {
              entry.palette = await measurePalette(page).catch(() => null);
            }
            // Hover is a pointer-device state and the probes cost real seconds,
            // so affordance runs once per route at desktop width.
            if (
              !route.skip.includes("affordance") &&
              viewport.name === "desktop" &&
              colorScheme === config.colorSchemes[0]
            ) {
              entry.affordance = await measureAffordance(page).catch(() => null);
              // The probes leave the pointer on the page; a screenshot must not
              // inherit a hover state from the measurement that preceded it.
              await parkPointer(page).catch(() => {});
            }

            // Locator-based hover probes scroll distant controls into view.
            // A fold capture must still mean the top of the page.
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(50);

            mkdirSync(path.dirname(foldFile), { recursive: true });
            await page.screenshot({ path: foldFile, animations: "disabled" });
            // A 56,000px page is not readable evidence and costs tens of
            // megabytes per run; capture the top and record the true height.
            const documentHeight = entry.layout?.documentHeight ?? viewport.height;
            const capped = documentHeight > FULL_PAGE_MAX_HEIGHT;
            entry.fullPageTruncated = capped;
            await page.screenshot({
              path: fullFile,
              fullPage: true,
              animations: "disabled",
              type: "jpeg",
              quality: 78,
              ...(capped
                ? {
                    clip: {
                      x: 0,
                      y: 0,
                      width: viewport.width,
                      height: FULL_PAGE_MAX_HEIGHT
                    }
                  }
                : {})
            });
            entry.ok = true;
          } catch (error) {
            entry.ok = false;
            entry.error = String(error).split("\n")[0].slice(0, 240);
          }

          // Router prefetches are cancelled when the page closes; that is the
          // harness ending, not a broken request.
          entry.problems = summarizeProblems(problems);
          runs.push(entry);
          const routeVerdict = !entry.ok
            ? "FAIL"
            : entry.alignment?.failedCount
              ? "FLAG"
              : "ok  ";
          console.log(
            `  ${routeVerdict} ${route.id} @ ${viewport.name}${suffix}` +
              (entry.timings?.ttfbMs != null ? ` — ttfb ${entry.timings.ttfbMs}ms` : "") +
              (entry.layout?.overflowsHorizontally ? " — H-OVERFLOW" : "") +
              alignmentSummary(entry.alignment) +
              affordanceSummary(entry.affordance)
          );
          await page.close();
        }
        for (const context of contexts.values()) await context.close();
      }
    }
  }

  if (wantStates && config.states.length) {
    for (const viewport of viewports.filter((v) => STATE_VIEWPORTS.has(v.name))) {
      const context = await newContext(browser, {
        viewport,
        colorScheme: config.colorSchemes[0],
        cookies: auth.cookies
      });
      for (const state of config.states) {
        const page = await context.newPage();
        const problems = collectPageProblems(page);
        const name = `state-${state.id}--${viewport.name}.png`;
        const entry = {
          routeId: `state-${state.id}`,
          routeLabel: state.label,
          path: state.path,
          notes: state.notes ?? "",
          viewport: viewport.name,
          colorScheme: config.colorSchemes[0],
          width: viewport.width,
          height: viewport.height,
          screenshot: path.join("screens", name),
          isState: true
        };
        try {
          await page.goto(`${config.baseUrl}${state.path}`, {
            waitUntil: "domcontentloaded",
            timeout: 45000
          });
          await page.waitForLoadState("load").catch(() => {});
          if (state.setup) await state.setup(page);
          await page.waitForTimeout(400);
          entry.layout = await measureLayout(page, {
            contentSelector: config.contentSelector
          }).catch(() => null);
          entry.alignment = await measureAlignment(page, config.alignmentChecks).catch(() => null);
          entry.a11y = await scanAccessibility(page).catch(() => null);
          mkdirSync(path.join(outDir, "screens"), { recursive: true });
          await page.screenshot({
            path: path.join(outDir, "screens", name),
            animations: "disabled"
          });
          entry.ok = true;
        } catch (error) {
          entry.ok = false;
          entry.error = String(error).split("\n")[0].slice(0, 240);
        }
        entry.problems = summarizeProblems(problems);
        stateResults.push(entry);
        const stateVerdict = !entry.ok
          ? "FAIL"
          : entry.alignment?.failedCount
            ? "FLAG"
            : "ok  ";
        console.log(
          `  ${stateVerdict} state ${state.id} @ ${viewport.name}` +
            (entry.layout?.overflowsHorizontally ? " — H-OVERFLOW" : "") +
            alignmentSummary(entry.alignment)
        );
        await page.close();
      }
      await context.close();
    }
  }

  if (wantFlows && config.flows.length) {
    const context = await newContext(browser, {
      viewport: viewports.find((v) => v.name === "desktop") ?? viewports[0],
      colorScheme: config.colorSchemes[0],
      cookies: auth.cookies
    });
    const page = await context.newPage();
    for (const flow of config.flows) {
      const result = await runFlow(page, flow, { baseUrl: config.baseUrl });
      flowResults.push(result);
      const verdict = !result.ok ? "FAIL" : result.unmetCount ? "UNMET" : "ok ";
      console.log(
        `  ${verdict} flow ${result.id} — ${result.clicks} clicks, ` +
          `${result.fullDocumentLoads} full loads, ${(result.elapsedMs / 1000).toFixed(1)}s` +
          (result.ok ? "" : ` — ${result.error}`) +
          (result.unmetCount ? `\n       ↳ ${result.unmet.join("\n       ↳ ")}` : "")
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}

// Re-running part of an audit should refine the report, not amputate it. A
// filtered `shots` run keeps every capture it did not redo, so iterating on one
// route does not silently shrink the matrix the report is computed from.
const previous = readPrevious(path.join(outDir, "results.json"));
if (previous?.runs?.length) {
  const captured = new Set(
    runs.map((r) => `${r.routeId}|${r.viewport}|${r.colorScheme}`)
  );
  runs.push(
    ...previous.runs.filter(
      (r) => !r.isState && !captured.has(`${r.routeId}|${r.viewport}|${r.colorScheme}`)
    )
  );
  const states = new Set(stateResults.map((r) => `${r.routeId}|${r.viewport}`));
  stateResults.push(
    ...previous.runs.filter((r) => r.isState && !states.has(`${r.routeId}|${r.viewport}`))
  );
}
if (previous?.flows?.length) {
  const ran = new Set(flowResults.map((f) => f.id));
  flowResults.push(...previous.flows.filter((f) => !ran.has(f.id)));
}

const summary = {
  app: config.name,
  baseUrl: config.baseUrl,
  command,
  label,
  startedAt: new Date(started).toISOString(),
  durationMs: Date.now() - started,
  viewports: viewports.map((v) => v.name),
  routes: routes.map((r) => r.id),
  runs: [...runs, ...stateResults],
  flows: flowResults
};

writeJson(path.join(outDir, "results.json"), summary);
if (runs.length) {
  writeText(
    path.join(outDir, "gallery.html"),
    renderGallery({
      title: `${config.name} — ${label}`,
      subtitle: `${new Date(started).toISOString().replace("T", " ").slice(0, 16)} UTC · ${config.baseUrl} · ${runs.length} screenshots`,
      runs: [...runs, ...stateResults],
      flows: flowResults
    })
  );
}

console.log(`\ndone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(`results  ${path.relative(PROJECT_ROOT, path.join(outDir, "results.json"))}`);
if (wantShots) {
  console.log(`gallery  ${path.relative(PROJECT_ROOT, path.join(outDir, "gallery.html"))}`);
}

function parseFlags(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function readPrevious(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function dedupe(values) {
  return [...new Set(values)];
}

function summarizeProblems(problems) {
  const failed = dedupe(problems.failedRequests);
  return {
    consoleErrors: problems.consoleErrors.slice(0, 6),
    pageErrors: problems.pageErrors.slice(0, 6),
    failedRequests: failed.filter((line) => !line.includes("_rsc=")).slice(0, 6),
    cancelledPrefetches: failed.filter((line) => line.includes("_rsc=")).length
  };
}

/** Affordance failures are cheap to print and easy to ignore in a JSON blob. */
function affordanceSummary(affordance) {
  if (!affordance) return "";
  const parts = [];
  if (affordance.wrongCursorCount) parts.push(`${affordance.wrongCursorCount} cursor`);
  if (affordance.noHoverFeedbackCount) parts.push(`${affordance.noHoverFeedbackCount} no-hover`);
  if (affordance.unreadableOverImageryCount) {
    parts.push(`${affordance.unreadableOverImageryCount} translucent`);
  }
  if (affordance.deadImageCount) parts.push(`${affordance.deadImageCount} dead-img`);
  return parts.length ? ` — ${parts.join(", ")}` : "";
}

function alignmentSummary(alignment) {
  if (!alignment?.failedCount) return "";
  return ` — ${alignment.failedCount} ALIGNMENT`;
}
