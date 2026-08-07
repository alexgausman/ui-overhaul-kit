import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { measureAlignment } from "../lib/alignment.mjs";

let browser;

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
});

test("content centering records a pass and a measurable failure", async () => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(`
    <style>
      .badge { box-sizing: border-box; width: 100px; height: 40px; }
      .centred { display: flex; align-items: center; justify-content: center; }
      .offset { padding: 0 0 0 20px; }
    </style>
    <div class="badge centred">OK</div>
    <div class="badge offset">OFF</div>
  `);

  const result = await measureAlignment(page, [
    {
      id: "centred",
      type: "content-centered",
      selector: ".centred",
      tolerance: 1
    },
    {
      id: "offset",
      type: "content-centered",
      selector: ".offset",
      tolerance: 1
    }
  ]);

  assert.equal(result.passedCount, 1);
  assert.equal(result.failedCount, 1);
  assert.equal(result.checks[0].status, "passed");
  assert.equal(result.checks[1].status, "failed");
  assert.ok(result.checks[1].samples[0].deltaX > 1);
  assert.ok(result.checks[1].samples[0].deltaY > 1);
  await page.close();
});

test("sibling contracts compare requested geometry properties", async () => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(`
    <style>
      .actions { display: flex; align-items: center; gap: 8px; }
      .actions button { width: 80px; height: 32px; }
      .actions button:last-child { width: 96px; }
      .aligned { display: flex; align-items: center; }
      .aligned > span { display: block; height: 24px; }
    </style>
    <div class="actions"><button>A</button><button>B</button></div>
    <div class="aligned"><span>A</span><span>B</span></div>
  `);

  const result = await measureAlignment(page, [
    {
      id: "actions",
      type: "equal-size",
      selector: ".actions",
      childSelector: ":scope > button",
      properties: ["width", "height"],
      tolerance: 1
    },
    {
      id: "aligned",
      type: "aligned-children",
      selector: ".aligned",
      properties: ["height", "centerY"],
      tolerance: 1
    }
  ]);

  assert.equal(result.failedCount, 1);
  assert.equal(result.passedCount, 1);
  assert.deepEqual(result.checks[0].samples[0].spreads, { width: 16, height: 0 });
  assert.equal(result.checks[1].status, "passed");
  await page.close();
});

test("contracts with no visible samples are skipped", async () => {
  const page = await browser.newPage();
  await page.setContent("<main>Nothing to measure</main>");

  const result = await measureAlignment(page, [
    { id: "optional", type: "content-centered", selector: ".not-on-this-route" }
  ]);

  assert.equal(result.skippedCount, 1);
  assert.equal(result.checks[0].status, "skipped");
  await page.close();
});
