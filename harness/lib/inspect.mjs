/**
 * In-page measurements that turn "does this look good?" into checkable numbers.
 *
 * Everything here is deliberately mechanical — horizontal overflow, tap-target
 * sizes, type sizes, how much of the viewport is actually used. Open-ended
 * self-critique of a screenshot drifts into generic praise; a list of elements
 * under 24px does not.
 */
export async function measureLayout(page, { contentSelector = "main" } = {}) {
  return page.evaluate((selector) => {
    const doc = document.documentElement;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const overflowsHorizontally = doc.scrollWidth > viewportWidth + 1;
    const offenders = [];
    if (overflowsHorizontally) {
      for (const element of Array.from(document.querySelectorAll("body *"))) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right <= viewportWidth + 1) continue;
        // A wide table inside its own scroller is a deliberate design, not a
        // broken page. Only elements that push the *document* wider count.
        if (insideScroller(element)) continue;
        offenders.push({
          selector: describe(element),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        });
      }
    }

    const interactive = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, [role="button"], summary'
      )
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    });

    const smallTargets = interactive
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: describe(element),
          text: (element.textContent ?? "").trim().slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })
      // WCAG 2.2 AA "Target Size (Minimum)" is 24x24 CSS px.
      .filter((item) => item.width < 24 || item.height < 24);

    const typeSizes = {};
    const smallText = [];
    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const text = Array.from(element.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent.trim())
        .join(" ")
        .trim();
      if (!text) continue;
      const style = getComputedStyle(element);
      const size = Math.round(Number.parseFloat(style.fontSize));
      typeSizes[size] = (typeSizes[size] ?? 0) + 1;
      if (size < 12) {
        smallText.push({ selector: describe(element), size, text: text.slice(0, 40) });
      }
    }

    const content = document.querySelector(selector);
    const contentRect = content ? content.getBoundingClientRect() : null;

    // How much horizontal room the content actually occupies at this width —
    // the cheap proxy for "wasted space" / "stretched too wide".
    const contentWidthRatio = contentRect
      ? Math.round((contentRect.width / viewportWidth) * 100) / 100
      : null;

    return {
      viewport: { width: viewportWidth, height: viewportHeight },
      documentHeight: doc.scrollHeight,
      screensTall: Math.round((doc.scrollHeight / viewportHeight) * 10) / 10,
      overflowsHorizontally,
      scrollWidth: doc.scrollWidth,
      overflowOffenders: offenders.slice(0, 12),
      interactiveCount: interactive.length,
      smallTargets: smallTargets.slice(0, 20),
      smallTargetCount: smallTargets.length,
      distinctTypeSizes: Object.keys(typeSizes)
        .map(Number)
        .sort((a, b) => a - b),
      smallText: smallText.slice(0, 12),
      smallTextCount: smallText.length,
      contentWidthRatio,
      // Fixed/sticky chrome tells you whether navigation survives scrolling.
      stickyElements: Array.from(document.querySelectorAll("body *"))
        .filter((element) => {
          const position = getComputedStyle(element).position;
          return position === "fixed" || position === "sticky";
        })
        .map(describe)
        .slice(0, 10)
    };

    function insideScroller(element) {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    function describe(element) {
      const id = element.id ? `#${element.id}` : "";
      const classes =
        typeof element.className === "string" && element.className.trim()
          ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "";
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    }
  }, contentSelector);
}

/**
 * Every in-app link on the page, so the run can be turned into a navigation
 * graph. "Which pages can you actually get to from here?" is the question that
 * exposes orphaned routes, and it is not visible in any single screenshot.
 */
export async function measureLinks(page, origin) {
  return page.evaluate((base) => {
    const links = new Map();
    for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
      let url;
      try {
        url = new URL(anchor.getAttribute("href"), base);
      } catch {
        continue;
      }
      if (url.origin !== new URL(base).origin) continue;
      const key = url.pathname;
      const rect = anchor.getBoundingClientRect();
      const existing = links.get(key);
      const inChrome = Boolean(anchor.closest("header, nav"));
      // "Above the fold" is a fair proxy for discoverable without hunting.
      const nearTop = rect.top < 400;
      if (existing) {
        existing.count += 1;
        existing.inChrome = existing.inChrome || inChrome;
        existing.nearTop = existing.nearTop || nearTop;
      } else {
        links.set(key, {
          pathname: key,
          count: 1,
          inChrome,
          nearTop,
          text: (anchor.textContent ?? "").trim().slice(0, 40)
        });
      }
    }
    return [...links.values()];
  }, origin);
}

/**
 * Colour tokens actually in use. A design system diff needs the real palette,
 * not the one the stylesheet claims.
 */
export async function measurePalette(page) {
  return page.evaluate(() => {
    const counts = { color: {}, background: {}, border: {}, radius: {}, font: {} };
    const bump = (bucket, value) => {
      if (!value || value === "rgba(0, 0, 0, 0)" || value === "none") return;
      counts[bucket][value] = (counts[bucket][value] ?? 0) + 1;
    };
    for (const element of Array.from(document.querySelectorAll("body *")).slice(0, 4000)) {
      const style = getComputedStyle(element);
      bump("color", style.color);
      bump("background", style.backgroundColor);
      bump("border", style.borderTopColor === style.borderBottomColor ? style.borderTopColor : null);
      bump("radius", style.borderTopLeftRadius);
      bump("font", `${style.fontWeight} ${style.fontSize}`);
    }
    const top = (bucket) =>
      Object.entries(counts[bucket])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([value, count]) => ({ value, count }));
    return {
      color: top("color"),
      background: top("background"),
      border: top("border"),
      radius: top("radius"),
      font: top("font")
    };
  });
}
