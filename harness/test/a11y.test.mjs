import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { scanAccessibility } from "../lib/a11y.mjs";

let browser;

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
});

test("axe runs when inline scripts are blocked by a strict CSP", async () => {
  const page = await browser.newPage();
  await page.setContent(`
    <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
    <main><button></button></main>
  `);

  const result = await scanAccessibility(page);

  assert.ok(Array.isArray(result.violations));
  assert.ok(result.violations.some((violation) => violation.id === "button-name"));
  assert.equal(typeof result.byImpact.serious, "number");
  await page.close();
});
