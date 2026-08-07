import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { measureLayout } from "../lib/inspect.mjs";

let browser;

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
});

test("target sizing distinguishes a small control from its effective label target", async () => {
  const page = await browser.newPage();
  await page.setContent(`
    <style>
      .row { display: flex; align-items: center; width: 200px; height: 40px; }
      input { width: 18px; height: 18px; }
    </style>
    <main>
      <label class="row"><input class="wrapped" type="checkbox"> Include item</label>
      <input class="orphan" type="checkbox" aria-label="Orphan checkbox">
    </main>
  `);

  const layout = await measureLayout(page);

  assert.equal(layout.smallTargetCount, 1);
  assert.match(layout.smallTargets[0].selector, /\.orphan/);
  assert.equal(layout.smallTargets[0].effectiveSource, "control");
  assert.equal(layout.smallVisualControlCount, 1);
  assert.match(layout.smallVisualControls[0].selector, /\.wrapped/);
  assert.equal(layout.smallVisualControls[0].visualWidth, 18);
  assert.equal(layout.smallVisualControls[0].visualHeight, 18);
  assert.equal(layout.smallVisualControls[0].effectiveSource, "label");
  assert.equal(layout.smallVisualControls[0].width, 200);
  assert.equal(layout.smallVisualControls[0].height, 40);
  await page.close();
});
