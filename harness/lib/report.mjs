import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeText(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, value.endsWith("\n") ? value : `${value}\n`);
}

/**
 * A static gallery the owner can open directly. The point of the harness is that
 * someone — model or human — actually looks at the output, so the output has to
 * be looked at without tooling.
 */
export function renderGallery({ title, subtitle, runs, flows = [] }) {
  const byRoute = new Map();
  for (const run of runs) {
    if (!byRoute.has(run.routeId)) byRoute.set(run.routeId, []);
    byRoute.get(run.routeId).push(run);
  }

  const sections = [...byRoute.entries()]
    .map(([routeId, entries]) => {
      const first = entries[0];
      const shots = entries
        .map((entry) => {
          const flags = [];
          if (entry.layout?.overflowsHorizontally) flags.push("h-overflow");
          if (entry.layout?.smallTargetCount) flags.push(`${entry.layout.smallTargetCount} small targets`);
          if (entry.alignment?.failedCount) flags.push(`${entry.alignment.failedCount} alignment`);
          if (entry.a11y?.byImpact?.serious) flags.push(`${entry.a11y.byImpact.serious} serious a11y`);
          if (entry.a11y?.byImpact?.critical) flags.push(`${entry.a11y.byImpact.critical} critical a11y`);
          if (entry.affordance?.wrongCursorCount) flags.push(`${entry.affordance.wrongCursorCount} wrong cursor`);
          if (entry.affordance?.noHoverFeedbackCount) flags.push(`${entry.affordance.noHoverFeedbackCount} no hover feedback`);
          if (entry.affordance?.unreadableOverImageryCount) flags.push(`${entry.affordance.unreadableOverImageryCount} translucent over artwork`);
          if (entry.affordance?.deadImageCount) flags.push(`${entry.affordance.deadImageCount} unclickable images`);
          return `
        <figure>
          <a href="${escapeHtml(entry.fullPage ?? entry.screenshot)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(entry.screenshot)}" alt="${escapeHtml(routeId)} at ${escapeHtml(entry.viewport)}" loading="lazy" />
          </a>
          <figcaption>
            <strong>${escapeHtml(entry.viewport)}${entry.colorScheme === "dark" ? " · dark" : ""}</strong>
            ${entry.width}×${entry.height}
            · ${entry.layout?.screensTall ?? "?"} screens tall${entry.fullPageTruncated ? " (full shot truncated)" : ""}
            ${entry.timings?.ttfbMs != null ? `· TTFB ${entry.timings.ttfbMs}ms` : ""}
            ${flags.length ? `<span class="flags">${flags.map(escapeHtml).join(" · ")}</span>` : ""}
          </figcaption>
        </figure>`;
        })
        .join("");

      return `
    <section>
      <h2>${escapeHtml(first.routeLabel)} <code>${escapeHtml(first.path)}</code></h2>
      ${first.notes ? `<p class="notes">${escapeHtml(first.notes)}</p>` : ""}
      <div class="shots">${shots}</div>
    </section>`;
    })
    .join("");

  const flowRows = flows
    .map(
      (flow) => `
      <tr>
        <td>${escapeHtml(flow.task)}</td>
        <td class="num">${flow.ok ? flow.clicks : "—"}</td>
        <td class="num">${flow.ok ? flow.fullDocumentLoads : "—"}</td>
        <td class="num">${flow.ok ? `${(flow.elapsedMs / 1000).toFixed(1)}s` : "—"}</td>
        <td>${
          flow.ok
            ? `${(flow.unmet ?? [])
                .map((message) => `<div class="fail">unmet: ${escapeHtml(message)}</div>`)
                .join("")}${escapeHtml((flow.notes ?? []).join(" "))}`
            : `<span class="fail">${escapeHtml(flow.error ?? "failed")}</span>`
        }</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 32px; font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { margin: 0 0 4px; font-size: 26px; }
  .sub { margin: 0 0 32px; opacity: 0.7; }
  section { margin: 0 0 40px; }
  h2 { font-size: 18px; margin: 0 0 4px; }
  h2 code { font-size: 13px; font-weight: 400; opacity: 0.65; }
  .notes { margin: 0 0 12px; font-size: 13px; opacity: 0.7; max-width: 70ch; }
  .shots { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 8px; align-items: flex-start; }
  figure { margin: 0; flex: 0 0 auto; width: 320px; }
  img { width: 100%; border: 1px solid rgba(128,128,128,0.35); border-radius: 8px; display: block; }
  figcaption { font-size: 12px; opacity: 0.75; margin-top: 6px; }
  .flags { display: block; color: #b45309; }
  table { border-collapse: collapse; font-size: 13px; width: 100%; }
  th, td { text-align: left; padding: 6px 12px 6px 0; border-bottom: 1px solid rgba(128,128,128,0.25); vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .fail { color: #b42318; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="sub">${escapeHtml(subtitle)}</p>
${flows.length ? `<section><h2>Task cost</h2><table><thead><tr><th>Task</th><th class="num">Clicks</th><th class="num">Full loads</th><th class="num">Time</th><th>Notes</th></tr></thead><tbody>${flowRows}</tbody></table></section>` : ""}
${sections}
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
