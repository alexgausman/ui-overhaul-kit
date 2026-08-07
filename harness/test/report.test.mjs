import assert from "node:assert/strict";
import { test } from "node:test";
import { renderGallery } from "../lib/report.mjs";

test("gallery surfaces failed alignment contracts", () => {
  const gallery = renderGallery({
    title: "Example",
    subtitle: "Test run",
    runs: [
      {
        routeId: "home",
        routeLabel: "Home",
        path: "/",
        viewport: "desktop",
        colorScheme: "light",
        width: 1440,
        height: 900,
        screenshot: "screens/home.png",
        alignment: { failedCount: 2 }
      }
    ]
  });

  assert.match(gallery, /2 alignment/);
});
