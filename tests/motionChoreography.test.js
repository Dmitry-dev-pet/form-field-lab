import test from "node:test";
import assert from "node:assert/strict";
import {
  PELAGION_MOTION_MODE,
  pelagionMotionState,
  smoothStrokeEnvelope
} from "../src/lib/motionChoreography.js";

const settings = {
  motionMode: PELAGION_MOTION_MODE.livingStroke,
  strokeFrequency: 4.4,
  strokeAccent: 0.78,
  followThrough: 3.4
};

test("stroke envelope eases into and out of its powered pose", () => {
  assert.equal(smoothStrokeEnvelope(0), 0);
  assert.equal(smoothStrokeEnvelope(Math.PI), 1);
  assert.ok(smoothStrokeEnvelope(0.1) < 0.001);
  assert.ok(smoothStrokeEnvelope(Math.PI - 0.1) > 0.999);
});

test("living stroke travels from the front of the body toward the tail", () => {
  const time = Math.PI / settings.strokeFrequency;
  const front = pelagionMotionState(0, time, settings);
  const tail = pelagionMotionState(1, time, settings);

  assert.equal(front.stroke, 1);
  assert.ok(tail.stroke < 0.2);
  assert.ok(front.effort > tail.effort);
});

test("squash and stretch preserves local body volume", () => {
  const state = pelagionMotionState(0.5, Math.PI / settings.strokeFrequency, settings);
  assert.ok(state.axialScale < 1);
  assert.ok(state.volumeScale > 1);
  assert.ok(Math.abs(state.axialScale * state.volumeScale ** 2 - 1) < 1e-12);
});

test("continuous mode reproduces the previous uniform transport", () => {
  const time = 1.75;
  const state = pelagionMotionState(0.6, time, {
    ...settings,
    motionMode: PELAGION_MOTION_MODE.continuous
  });
  assert.deepEqual(state, {
    beat: 0,
    localPhase: 0,
    stroke: 1,
    effort: 1,
    travel: time,
    axialScale: 1,
    volumeScale: 1
  });
});
