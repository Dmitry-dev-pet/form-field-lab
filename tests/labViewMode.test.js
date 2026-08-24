import test from "node:test";
import assert from "node:assert/strict";
import {
  LAB_VIEW_MODE,
  mergeLabViewModeQuery,
  readLabViewMode
} from "../src/lib/labViewMode.js";

test("the laboratory always resolves legacy view values to the RAW renderer", () => {
  assert.equal(readLabViewMode("bare"), LAB_VIEW_MODE.bare);
  assert.equal(readLabViewMode(["bare", "spa"]), LAB_VIEW_MODE.bare);
  assert.equal(readLabViewMode("spa"), LAB_VIEW_MODE.bare);
  assert.equal(readLabViewMode("unknown"), LAB_VIEW_MODE.bare);
  assert.equal(readLabViewMode(undefined), LAB_VIEW_MODE.bare);
});

test("legacy view query is removed without dropping form or color state", () => {
  const query = { form: "pelagion", cm: "formula", cp: "membrane", view: "spa" };
  const raw = mergeLabViewModeQuery(query);

  assert.deepEqual(raw, { form: "pelagion", cm: "formula", cp: "membrane" });
  assert.deepEqual(query, { form: "pelagion", cm: "formula", cp: "membrane", view: "spa" });
});
