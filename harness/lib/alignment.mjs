/**
 * Mechanical geometry checks for visual defects that screenshots reveal but
 * accessibility and overflow audits do not: off-centre content, uneven
 * control heights, and sibling actions that do not share an edge or centerline.
 *
 * The app declares relationships rather than expected pixel coordinates, so
 * the same contract can run across responsive viewports and interaction states.
 */
export async function measureAlignment(page, checks = []) {
  if (!checks.length) {
    return { checks: [], failedCount: 0, passedCount: 0, skippedCount: 0 };
  }

  // Text bounds can move when a webfont finishes loading. Wait for the browser's
  // font set so a one-pixel tolerance means the same thing on repeated runs.
  await page.evaluate(() => document.fonts?.ready).catch(() => {});

  return page.evaluate((definitions) => {
    const results = definitions.map((definition) => {
      const tolerance = Number(definition.tolerance ?? 1);
      const scopes = visible(document.querySelectorAll(definition.selector));

      if (definition.type === "content-centered") {
        const samples = scopes
          .map((element) => centeredContentSample(element, tolerance))
          .filter(Boolean);
        return summarize(definition, samples, tolerance);
      }

      if (definition.type === "aligned-children" || definition.type === "equal-size") {
        const defaultProperties = definition.type === "equal-size"
          ? ["width", "height"]
          : ["top", "height", "centerY"];
        const properties = definition.properties ?? defaultProperties;
        const samples = scopes
          .map((scope) => siblingSample(
            scope,
            definition.childSelector ?? ":scope > *",
            properties,
            tolerance
          ))
          .filter(Boolean);
        return summarize(definition, samples, tolerance);
      }

      return {
        id: definition.id,
        label: definition.label ?? definition.id,
        type: definition.type,
        status: "failed",
        tolerance,
        samples: [{
          selector: definition.selector,
          reason: `Unknown alignment check type: ${definition.type}`
        }]
      };
    });

    return {
      checks: results,
      failedCount: results.filter((result) => result.status === "failed").length,
      passedCount: results.filter((result) => result.status === "passed").length,
      skippedCount: results.filter((result) => result.status === "skipped").length
    };

    function centeredContentSample(element, tolerance) {
      const elementRect = element.getBoundingClientRect();
      const contentRect = textBounds(element);
      if (!contentRect) return null;
      const deltaX = round(Math.abs(centerX(elementRect) - centerX(contentRect)));
      const deltaY = round(Math.abs(centerY(elementRect) - centerY(contentRect)));
      return {
        selector: describe(element),
        text: (element.textContent ?? "").trim().slice(0, 40),
        deltaX,
        deltaY,
        passed: deltaX <= tolerance && deltaY <= tolerance
      };
    }

    function siblingSample(scope, childSelector, properties, tolerance) {
      const children = visible(scope.querySelectorAll(childSelector));
      if (children.length < 2) return null;
      const rects = children.map((element) => ({
        element,
        rect: element.getBoundingClientRect()
      }));
      const spreads = Object.fromEntries(
        properties.map((property) => {
          const values = rects.map(({ rect }) => metric(rect, property));
          return [property, round(Math.max(...values) - Math.min(...values))];
        })
      );
      return {
        selector: describe(scope),
        children: rects.map(({ element }) => describe(element)),
        spreads,
        passed: Object.values(spreads).every((spread) => spread <= tolerance)
      };
    }

    function summarize(definition, samples, tolerance) {
      if (!samples.length) {
        return {
          id: definition.id,
          label: definition.label ?? definition.id,
          type: definition.type,
          status: "skipped",
          tolerance,
          samples: []
        };
      }
      return {
        id: definition.id,
        label: definition.label ?? definition.id,
        type: definition.type,
        status: samples.every((sample) => sample.passed) ? "passed" : "failed",
        tolerance,
        samples: samples.filter((sample) => !sample.passed).slice(0, 8)
      };
    }

    function textBounds(element) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const rects = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim()) continue;
        const parent = node.parentElement;
        if (!parent || !isVisible(parent)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width > 0 && rect.height > 0) rects.push(rect);
        }
      }
      if (!rects.length) return null;
      const left = Math.min(...rects.map((rect) => rect.left));
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }

    function visible(elements) {
      return [...elements].filter(isVisible);
    }

    function isVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }

    function metric(rect, property) {
      if (property === "centerX") return centerX(rect);
      if (property === "centerY") return centerY(rect);
      return Number(rect[property] ?? 0);
    }

    function centerX(rect) {
      return rect.left + rect.width / 2;
    }

    function centerY(rect) {
      return rect.top + rect.height / 2;
    }

    function round(value) {
      return Math.round(value * 10) / 10;
    }

    function describe(element) {
      const id = element.id ? `#${element.id}` : "";
      const classes = typeof element.className === "string" && element.className.trim()
        ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    }
  }, checks);
}
