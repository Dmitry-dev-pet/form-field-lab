import test from "node:test";
import assert from "node:assert/strict";
import {
  LAB_VIEW_MODE,
  mergeLabViewModeQuery,
  readLabViewMode
} from "../src/lib/labViewMode.js";

test("the bare renderer is explicit and SPA remains the default", () => {
  assert.equal(readLabViewMode("bare"), LAB_VIEW_MODE.bare);
  assert.equal(readLabViewMode(["bare", "spa"]), LAB_VIEW_MODE.bare);
  assert.equal(readLabViewMode("spa"), LAB_VIEW_MODE.spa);
  assert.equal(readLabViewMode("unknown"), LAB_VIEW_MODE.spa);
  assert.equal(readLabViewMode(undefined), LAB_VIEW_MODE.spa);
});

test("view mode round-trips without dropping form or color state", () => {
  const query = { form: "pelagion", cm: "formula", cp: "membrane" };
  const bare = mergeLabViewModeQuery(query, LAB_VIEW_MODE.bare);
  const spa = mergeLabViewModeQuery(bare, LAB_VIEW_MODE.spa);

  assert.deepEqual(bare, { ...query, view: "bare" });
  assert.deepEqual(spa, query);
  assert.deepEqual(query, { form: "pelagion", cm: "formula", cp: "membrane" });
});
