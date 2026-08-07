import { pathToFileURL } from "node:url";
import path from "node:path";

// Device pixel ratio stays at 1: these screenshots are read as evidence and
// committed to the repo, and a 14-screen page at 2x is tens of megabytes.
const DEFAULT_VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 }
];

/**
 * An app config is a plain ES module. Everything app-specific lives there —
 * base URL, routes, viewports, auth recipe, task flows — so porting the harness
 * to another app means writing one file, not editing the harness.
 */
export async function loadAppConfig(name, harnessRoot) {
  const file = path.isAbsolute(name)
    ? name
    : path.join(harnessRoot, "apps", `${name}.mjs`);
  const imported = await import(pathToFileURL(file).href);
  const config = imported.default ?? imported.config;
  if (!config) {
    throw new Error(`App config ${file} has no default export.`);
  }
  return normalize(config, file);
}

function normalize(config, file) {
  if (!config.baseUrl) throw new Error(`App config ${file} is missing baseUrl.`);
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  const routes = (config.routes ?? []).map((route, index) => ({
    id: route.id ?? `route-${index}`,
    label: route.label ?? route.id ?? route.path,
    path: route.path,
    // Routes that show something the screenshot matrix should wait for.
    waitFor: route.waitFor ?? null,
    // Skip a11y or timing work for pages where it makes no sense.
    skip: route.skip ?? [],
    auth: route.auth ?? true,
    // Most routes only need one colour scheme; opt a few in to prove what the
    // other one looks like.
    schemes: route.schemes ?? null,
    notes: route.notes ?? ""
  }));

  return {
    name: config.name ?? path.basename(file, ".mjs"),
    baseUrl,
    routes,
    viewports: config.viewports ?? DEFAULT_VIEWPORTS,
    colorSchemes: config.colorSchemes ?? ["light"],
    // Optional context hook for apps whose own persisted theme selector does
    // not follow prefers-color-scheme. It runs before any page is created.
    prepareColorScheme: config.prepareColorScheme ?? null,
    auth: config.auth ?? null,
    flows: config.flows ?? [],
    // States a screenshot of a plain page never shows: open modals, expanded
    // disclosures, focus rings, hover, in-flight and error states.
    states: config.states ?? [],
    // Declarative geometry contracts for recurring visual regressions such as
    // content that is not centered inside a badge or sibling controls whose
    // heights / centerlines drift apart.
    alignmentChecks: config.alignmentChecks ?? [],
    // Pixel budget for "is this page mostly empty?" heuristics.
    contentSelector: config.contentSelector ?? "main",
    configFile: file
  };
}

export { DEFAULT_VIEWPORTS };

/** Routes and states default to the first scheme and opt in to any others. */
export function shouldCaptureScheme(entry, colorScheme, defaultScheme) {
  return entry.schemes
    ? entry.schemes.includes(colorScheme)
    : colorScheme === defaultScheme;
}
