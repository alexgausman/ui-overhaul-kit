import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let axeSource = null;

function loadAxe() {
  if (!axeSource) axeSource = readFileSync(require.resolve("axe-core"), "utf8");
  return axeSource;
}

/**
 * Contrast, labels and structure, checked rather than eyeballed. Colour-contrast
 * results in particular are the fastest way to catch a token that was never
 * defined and silently fell back to something unreadable.
 */
export async function scanAccessibility(page) {
  // Execute through the browser automation context instead of injecting an
  // inline <script>. Apps with a strict `script-src 'self'` policy correctly
  // reject the latter, which would otherwise erase the entire a11y result.
  await page.evaluate(loadAxe());
  const result = await page.evaluate(async () => {
    const run = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }
    });
    const shape = (violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length,
      samples: violation.nodes.slice(0, 4).map((node) => ({
        target: node.target.join(" "),
        summary: (node.failureSummary ?? "").split("\n").slice(0, 3).join(" ").slice(0, 200)
      }))
    });
    return {
      violations: run.violations.map(shape),
      // Contrast against a background axe cannot resolve — a stacked modal, a
      // semi-transparent overlay — lands here, not in violations. Dropping it
      // would hide exactly the cases where a colour token went missing.
      incomplete: run.incomplete.filter((r) => r.id === "color-contrast").map(shape)
    };
  });

  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const violation of result.violations) {
    const impact = violation.impact ?? "minor";
    byImpact[impact] = (byImpact[impact] ?? 0) + violation.nodes;
  }
  return { ...result, byImpact };
}
