/**
 * Affordance measurements: does a control *look* like what it does?
 *
 * The layout and a11y collectors answer "can you reach it" and "can you read
 * it". This one answers the class of question an owner asks in a five-second
 * skim — is the pointer a hand, does the thing react when I hover it, can I see
 * the button against the artwork behind it, is the image clickable. All four
 * are computable, and all four are invisible to a pass that only looks at
 * static screenshots. Every one of them was first reported by a human owner
 * on a build that had passed a full screenshot-and-axe audit.
 *
 * Everything here is per-element and mechanical. Nothing judges taste.
 */

const INTERACTIVE = 'a[href], button, [role="button"], summary, input, select, textarea';

/** Computed properties a hover state could plausibly change. */
const HOVER_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderBottomColor",
  "opacity",
  "boxShadow",
  "transform",
  "textDecorationLine",
  "outlineColor",
  "filter",
  "scale"
];

/**
 * Text entry legitimately wants an I-beam and a disabled control a barred
 * cursor; everything else a person can click should say so with a hand.
 */
const TEXT_ENTRY = new Set(["input", "textarea"]);
const TEXT_ENTRY_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
  ""
]);

export async function measureAffordance(page, { maxHoverProbes = 28 } = {}) {
  const candidates = await page.evaluate((selector) => {
    const seen = new Map();
    const out = [];

    for (const element of Array.from(document.querySelectorAll(selector))) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width < 1 || rect.height < 1) continue;
      if (style.visibility === "hidden" || style.display === "none") continue;

      const tag = element.tagName.toLowerCase();
      const classes =
        typeof element.className === "string" ? element.className.trim() : "";
      // One probe per distinct component variant, not per instance: a rail of
      // twelve identical cards is one hover state, and hovering all twelve buys
      // nothing but wall-clock.
      const signature = `${tag}|${classes}|${element.getAttribute("role") ?? ""}`;

      const entry = {
        signature,
        tag,
        type: element.getAttribute("type") ?? "",
        disabled: element.hasAttribute("disabled"),
        selector: describe(element),
        label:
          (element.getAttribute("aria-label") || element.textContent || "")
            .trim()
            .slice(0, 48),
        cursor: style.cursor,
        instances: 1,
        box: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        // Alpha of the control's own background, and whether it borrows one
        // from behind it. A control floating over artwork with a translucent
        // background is the "can't make out the check button" failure.
        backgroundAlpha: alphaOf(style.backgroundColor),
        backdropFilter: style.backdropFilter === "none" ? null : style.backdropFilter,
        overImagery: overImagery(element, rect)
      };

      const existing = seen.get(signature);
      if (existing) {
        existing.instances += 1;
        continue;
      }
      seen.set(signature, entry);
      out.push(entry);
    }

    // Artwork in a *list* of things that is not itself a click target, while
    // the title beside it is one. That asymmetry is invisible in a screenshot
    // and is what makes a poster grid feel half-wired.
    //
    // Restricted to repeated cards on purpose: a one-off hero image has no
    // obvious destination of its own, and flagging it would train the reader
    // to ignore this list.
    const deadImages = [];
    for (const image of Array.from(document.querySelectorAll("img"))) {
      const rect = image.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) continue;
      if (image.closest("a[href], button")) continue;
      const card = image.closest("article, li, tr, section, div");
      const link = card?.querySelector("a[href]");
      if (!link || !isRepeated(card)) continue;
      deadImages.push({
        selector: describe(image),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        alt: image.getAttribute("alt") ?? null,
        cardLink: link.getAttribute("href")
      });
    }

    /** One of several siblings built from the same template. */
    function isRepeated(card) {
      const parent = card?.parentElement;
      if (!parent) return false;
      const signature = `${card.tagName}|${typeof card.className === "string" ? card.className : ""}`;
      let matches = 0;
      for (const sibling of Array.from(parent.children)) {
        const siblingSignature = `${sibling.tagName}|${typeof sibling.className === "string" ? sibling.className : ""}`;
        if (siblingSignature === signature) matches += 1;
      }
      return matches > 1;
    }

    return { candidates: out, deadImages };

    /**
     * Alpha out of whatever colour syntax the engine hands back. Tailwind v4
     * computes to `oklab(L a b / .15)`, not `rgba(…)` — a parser that only
     * knows the comma form silently reports every translucent control as
     * opaque, which is exactly the failure this collector exists to catch.
     */
    function alphaOf(color) {
      if (!color || color === "transparent") return 0;
      const modern = /\/\s*([\d.]+)(%?)\s*\)\s*$/.exec(color);
      if (modern) {
        const value = Number.parseFloat(modern[1]) / (modern[2] ? 100 : 1);
        return Number.isFinite(value) ? Math.round(value * 100) / 100 : 1;
      }
      const legacy = /^rgba?\(([^)]+)\)$/.exec(color);
      if (legacy) {
        const parts = legacy[1].split(",").map((value) => Number.parseFloat(value));
        return parts.length > 3 ? Math.round(parts[3] * 100) / 100 : 1;
      }
      return 1;
    }

    /**
     * True when something pictorial is painted under this control — an <img>
     * behind it, or an ancestor carrying a background image. That is when a
     * control cannot rely on the page background for contrast, and it is the
     * case axe cannot evaluate.
     */
    function overImagery(element, rect) {
      const centreX = rect.x + rect.width / 2;
      const centreY = rect.y + rect.height / 2;
      if (
        centreX < 0 ||
        centreY < 0 ||
        centreX > window.innerWidth ||
        centreY > window.innerHeight
      ) {
        return false;
      }
      for (const node of document.elementsFromPoint(centreX, centreY)) {
        if (node === element || element.contains(node)) continue;
        if (node.tagName === "IMG" || node.tagName === "VIDEO") return true;
        if (getComputedStyle(node).backgroundImage !== "none") return true;
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
  }, INTERACTIVE);

  const probes = candidates.candidates.slice(0, maxHoverProbes);
  const hoverProbes = [];

  for (const candidate of probes) {
    if (candidate.disabled) continue;
    const probe = await probeHover(page, candidate);
    if (probe) hoverProbes.push(probe);
  }

  const wrongCursor = candidates.candidates.filter((entry) => {
    if (entry.disabled) return entry.cursor !== "not-allowed" && entry.cursor !== "default";
    if (TEXT_ENTRY.has(entry.tag) && TEXT_ENTRY_TYPES.has(entry.type)) {
      return entry.cursor !== "text";
    }
    return entry.cursor !== "pointer";
  });

  // A control over artwork needs its own opaque backing or a backdrop filter;
  // otherwise its legibility is whatever the poster happens to be.
  const unreadableOverImagery = candidates.candidates.filter(
    (entry) => entry.overImagery && entry.backgroundAlpha < 0.85 && !entry.backdropFilter
  );

  const noHoverFeedback = hoverProbes.filter((probe) => probe.changed.length === 0);

  return {
    interactiveVariants: candidates.candidates.length,
    wrongCursor: wrongCursor.map(summarise),
    wrongCursorCount: sumInstances(wrongCursor),
    unreadableOverImagery: unreadableOverImagery.map(summarise),
    unreadableOverImageryCount: sumInstances(unreadableOverImagery),
    hoverProbed: hoverProbes.length,
    noHoverFeedback: noHoverFeedback.map((probe) => ({
      selector: probe.selector,
      label: probe.label,
      instances: probe.instances
    })),
    noHoverFeedbackCount: noHoverFeedback.reduce(
      (total, probe) => total + probe.instances,
      0
    ),
    deadImages: candidates.deadImages.slice(0, 12),
    deadImageCount: candidates.deadImages.length
  };
}

/**
 * Hover the first element matching a variant and diff its computed style.
 *
 * Done with a real pointer rather than by reading stylesheets, because what
 * matters is whether anything visibly changes — including changes that come
 * from a parent's `group-hover`, which no rule lookup on the element itself
 * would find.
 */
async function probeHover(page, candidate) {
  const handle = await page
    .locator(cssFor(candidate))
    .first()
    .elementHandle({ timeout: 2000 })
    .catch(() => null);
  if (!handle) return null;

  try {
    const before = await styleOf(handle);
    await handle.hover({ timeout: 2000, force: true });
    // Long enough for a CSS transition to land; base-nova's are 150ms.
    await page.waitForTimeout(260);
    const after = await styleOf(handle);
    await parkPointer(page);

    const changed = HOVER_PROPS.filter((prop) => before[prop] !== after[prop]);
    return {
      selector: candidate.selector,
      label: candidate.label,
      instances: candidate.instances,
      cursor: after.cursor,
      changed
    };
  } catch {
    return null;
  } finally {
    await handle.dispose();
  }
}

/**
 * Move the pointer to a spot with nothing interactive under it, so the next
 * probe's "before" style is a true resting state — and so a screenshot taken
 * after this collector does not silently capture a hovered control.
 */
export async function parkPointer(page) {
  const spot = await page
    .evaluate(() => {
      const height = window.innerHeight;
      const width = window.innerWidth;
      for (let y = height - 4; y > 0; y -= 12) {
        for (let x = width - 4; x > width / 2; x -= 24) {
          const stack = document.elementsFromPoint(x, y);
          if (
            !stack.some(
              (node) =>
                node.matches?.('a[href], button, [role="button"], summary, input, select, textarea') ||
                node.closest?.('a[href], button, [role="button"], summary, input, select, textarea')
            )
          ) {
            return { x, y };
          }
        }
      }
      return null;
    })
    .catch(() => null);

  await page.mouse.move(spot?.x ?? 1, spot?.y ?? 1);
  await page.waitForTimeout(120);
}

/**
 * Fingerprint the control *and its subtree*.
 *
 * Hover feedback frequently lands on a descendant rather than on the hovered
 * element — a card link whose poster scales, a button whose icon changes
 * colour. Reading only the hovered element's own computed style reports those
 * as dead, which would bury the real dead ones in false positives.
 */
function styleOf(handle) {
  return handle.evaluate(
    (element, props) => {
      const nodes = [element, ...Array.from(element.querySelectorAll("*")).slice(0, 12)];
      const out = { cursor: getComputedStyle(element).cursor };
      for (const prop of props) {
        out[prop] = nodes.map((node) => getComputedStyle(node)[prop]).join("|");
      }
      return out;
    },
    HOVER_PROPS
  );
}

/**
 * A CSS selector for the variant. Class-based where possible so the probe hits
 * the same component the scan classified; falls back to the tag.
 */
function cssFor(candidate) {
  const [tag, classes] = candidate.signature.split("|");
  if (!classes) return tag;
  const escaped = classes
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => `.${CSS_ESCAPE(name)}`)
    .join("");
  return `${tag}${escaped}`;
}

/** Tailwind class names are full of characters a selector has to escape. */
function CSS_ESCAPE(value) {
  return value.replace(/([^\w-])/g, "\\$1");
}

function summarise(entry) {
  return {
    selector: entry.selector,
    label: entry.label,
    cursor: entry.cursor,
    instances: entry.instances,
    backgroundAlpha: entry.backgroundAlpha
  };
}

function sumInstances(entries) {
  return entries.reduce((total, entry) => total + entry.instances, 0);
}
