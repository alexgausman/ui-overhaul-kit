import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldCaptureScheme } from "../lib/config.mjs";

test("routes and states default to the first color scheme", () => {
  assert.equal(shouldCaptureScheme({}, "light", "light"), true);
  assert.equal(shouldCaptureScheme({}, "dark", "light"), false);
});

test("routes and states can opt into an explicit scheme matrix", () => {
  const entry = { schemes: ["light", "dark"] };
  assert.equal(shouldCaptureScheme(entry, "light", "light"), true);
  assert.equal(shouldCaptureScheme(entry, "dark", "light"), true);
  assert.equal(shouldCaptureScheme(entry, "no-preference", "light"), false);
});
