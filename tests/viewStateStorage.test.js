import test from "node:test";
import assert from "node:assert/strict";
import {
  VIEW_STATE_STORAGE_KEY,
  clearViewState,
  readViewState,
  writeViewState
} from "../src/lib/viewStateStorage.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values
  };
}

test("camera and phase persist per form without entering the genome", () => {
  const storage = memoryStorage();
  const pose = {
    orientation: { x: 0.2, y: -0.3, z: 0.1, w: 0.9 },
    time: 4.75
  };

  assert.equal(writeViewState("pelagion", pose, storage), true);
  const saved = readViewState("pelagion", storage);

  assert.ok(storage.values.has(VIEW_STATE_STORAGE_KEY));
  assert.equal(saved.time, 4.75);
  assert.ok(Math.abs(Math.hypot(...Object.values(saved.orientation)) - 1) < 1e-12);
  assert.equal(readViewState("chronophore", storage), null);
});

test("reset clears one saved view without disturbing another form", () => {
  const storage = memoryStorage();
  writeViewState("pelagion", { yaw: 0.7, pitch: -0.2, time: 2 }, storage);
  writeViewState("chronophore", { yaw: -0.4, pitch: 0.1, time: 3 }, storage);

  assert.equal(clearViewState("pelagion", storage), true);
  assert.equal(readViewState("pelagion", storage), null);
  assert.equal(readViewState("chronophore", storage).time, 3);
});

test("broken browser storage falls back to an empty view map", () => {
  const storage = memoryStorage({ [VIEW_STATE_STORAGE_KEY]: "{not-json" });
  assert.equal(readViewState("pelagion", storage), null);
});
