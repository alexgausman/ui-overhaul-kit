/**
 * Navigation timings straight from the browser. The interesting number for a
 * server-rendered app is TTFB — it is where "click, then wait" comes from — but
 * LCP and total transfer say whether the page feels fast once bytes arrive.
 */
export async function measureNavigation(page) {
  await page.waitForLoadState("load");
  return page.evaluate(async () => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(
      performance.getEntriesByType("paint").map((entry) => [entry.name, Math.round(entry.startTime)])
    );

    const lcp = await new Promise((resolve) => {
      let value = null;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) value = entry.startTime;
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(value === null ? null : Math.round(value));
        }, 400);
      } catch {
        resolve(null);
      }
    });

    const resources = performance.getEntriesByType("resource");
    const transferBytes = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);

    return {
      ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
      responseMs: nav ? Math.round(nav.responseEnd - nav.responseStart) : null,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
      loadMs: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      firstContentfulPaintMs: paints["first-contentful-paint"] ?? null,
      largestContentfulPaintMs: lcp,
      documentBytes: nav ? nav.transferSize || 0 : 0,
      resourceCount: resources.length,
      resourceTransferBytes: transferBytes
    };
  });
}

/**
 * Client-side navigation cost: click a link, wait for the destination to render,
 * and record whether the browser did a full document load on the way.
 */
export async function measureClientNavigation(page, { click, expectUrl, expectSelector }) {
  let fullLoads = 0;
  const onLoad = () => {
    fullLoads += 1;
  };
  page.on("load", onLoad);

  const started = Date.now();
  await click();
  if (expectUrl) await page.waitForURL(expectUrl, { timeout: 30000 });
  if (expectSelector) await page.waitForSelector(expectSelector, { timeout: 30000 });
  const elapsed = Date.now() - started;

  page.off("load", onLoad);
  return { elapsedMs: elapsed, fullDocumentLoads: fullLoads };
}
