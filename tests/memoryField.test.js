import test from "node:test";
import assert from "node:assert/strict";
import {
  createMemoryPopulation,
  MEMORY_PARTICLE_STRIDE,
  readMemoryParticle,
  stepMemoryPopulation
} from "../src/lib/memoryField.js";

const settings = {
  radius: 80,
  depth: 1,
  seedThickness: 0.12,
  lifespan: 120,
  flowStrength: 1,
  fieldFrequency: 6,
  cohesion: 0.9,
  twist: 0.7
};
const layers = { flow: true, cohesion: true, renewal: true };

test("memory population stores deterministic persistent particle state", () => {
  const first = createMemoryPopulation(32, settings);
  const second = createMemoryPopulation(32, settings);
  assert.equal(first.length, 32 * MEMORY_PARTICLE_STRIDE);
  assert.deepEqual(first, second);
});

test("memory field advances coordinates and eventually renews generations", () => {
  const state = createMemoryPopulation(4, { ...settings, lifespan: 30 });
  const before = [...state.slice(0, 3)];
  stepMemoryPopulation(state, 0.1, settings, layers);
  assert.notDeepEqual([...state.slice(0, 3)], before);

  for (let frame = 0; frame < 40; frame++) {
    stepMemoryPopulation(state, frame * 0.03, { ...settings, lifespan: 30 }, layers);
  }
  assert.ok(state[4] >= 1);
});

test("memory particle exposes age and speed to the color formula", () => {
  const state = createMemoryPopulation(8, settings);
  stepMemoryPopulation(state, 0.2, settings, layers);
  const point = {};
  readMemoryParticle(state, 0, settings, point);
  assert.ok(Number.isFinite(point.x));
  assert.ok(point.e >= 0 && point.e < 1);
  assert.ok(point.k >= 0);
});
