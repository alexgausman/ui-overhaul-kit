import assert from "node:assert/strict";
import { test } from "node:test";
import { renderGallery } from "../lib/report.mjs";

test("gallery surfaces geometry and target flags", () => {
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
        layout: { smallVisualControlCount: 3 },
        alignment: { failedCount: 2 }
      }
    ]
  });

  assert.match(gallery, /2 alignment/);
  assert.match(gallery, /3 small visual controls/);
});
