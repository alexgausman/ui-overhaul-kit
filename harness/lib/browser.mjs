import { chromium } from "playwright";

export async function launch({ headless = true } = {}) {
  return chromium.launch({ headless });
}

export async function newContext(browser, { viewport, colorScheme, cookies }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.isMobile),
    colorScheme: colorScheme ?? "light",
    reducedMotion: "reduce",
    // Deterministic screenshots: no OS locale/timezone drift between runs.
    locale: "en-CA",
    timezoneId: "America/Toronto"
  });
  if (cookies?.length) await context.addCookies(cookies);
  return context;
}

/** Console errors and failed requests are evidence, so every page collects them. */
export function collectPageProblems(page) {
  const problems = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on("console", (message) => {
    if (message.type() === "error") problems.consoleErrors.push(truncate(message.text()));
  });
  page.on("pageerror", (error) => problems.pageErrors.push(truncate(String(error))));
  page.on("requestfailed", (request) => {
    problems.failedRequests.push(
      truncate(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "failed"}`)
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.failedRequests.push(truncate(`${response.status()} ${response.url()}`));
    }
  });
  return problems;
}

function truncate(value, max = 240) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
