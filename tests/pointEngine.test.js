import test from "node:test";
import assert from "node:assert/strict";
import { sketches } from "../src/data/sketches.js";
import { createPointEngine, interpolatePointClouds } from "../src/lib/pointEngine.js";
import { runnerDocument } from "../src/lib/runnerDocument.js";

test("catalog contains 34 unique attributed sketches", () => {
  assert.equal(sketches.length, 34);
  assert.equal(new Set(sketches.map(sketch => sketch.id)).size, 34);
  assert.ok(sketches.every(sketch => sketch.source === `https://x.com/yuruyurau/status/${sketch.id}`));
});

test("every archived formula compiles and produces a point cloud", () => {
  for (const sketch of sketches) {
    const points = createPointEngine(sketch).frame();
    assert.ok(points.length > 1000, `${sketch.id} produced only ${points.length} points`);
    assert.ok(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
  }
});

test("point transport preserves endpoints and interpolates the middle", () => {
  const pointsA = [[0, 0], [10, 10]];
  const pointsB = [[10, 20], [20, 30]];
  assert.equal(interpolatePointClouds(pointsA, pointsB, 0), pointsA);
  assert.equal(interpolatePointClouds(pointsA, pointsB, 1), pointsB);
  assert.deepEqual(interpolatePointClouds(pointsA, pointsB, 0.5), [[5, 10], [15, 20]]);
});

test("sandbox runner includes the original source and motion bridge", () => {
  const html = runnerDocument(sketches[4].code);
  assert.match(html, /p5@1\.11\.3/);
  assert.match(html, /cos\(y\*31\+t\)/);
  assert.match(html, /sketch-motion/);
  assert.doesNotMatch(html, /sketch-frame/);
});

test("the Pelagion runner adds a spatial camera bridge outside the RAW code", () => {
  const code = "t=0,draw=_=>{t++||createCanvas(400,400);point(200,200)}";
  const html = runnerDocument(code, { viewModel: "pelagion-orbit" });

  assert.match(html, /pelagion-orbit/);
  assert.match(html, /projectedPelagionPoint/);
  assert.match(html, /sketch-view-state/);
  assert.match(html, /sketch-view-snapshot/);
  assert.match(html, /canvas\?\.width === 400/);
  assert.match(html, /touch-action:none/);
  assert.equal((html.match(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});
