import test from "node:test";
import assert from "node:assert/strict";
import { sketches } from "../src/data/sketches.js";
import { createPointEngine, interpolatePointClouds } from "../src/lib/pointEngine.js";
import { runnerDocument } from "../src/lib/runnerDocument.js";

test("catalog contains 36 unique attributed sketches", () => {
  assert.equal(sketches.length, 36);
  assert.equal(new Set(sketches.map(sketch => sketch.id)).size, 36);
  assert.ok(sketches.every(sketch => sketch.source === `https://x.com/yuruyurau/status/${sketch.id}`));
  assert.equal(sketches.at(-1).id, "1588062547315679232");
  assert.equal(sketches.at(-1).createdAt, "2022-11-03T06:56:30.712Z");
  assert.equal(sketches.at(-1).code.length, 273);
  assert.match(sketches.at(-1).code, /p5\.Vector\.random3D/);
  assert.match(sketches.at(-1).code, /\^v\.y\+2/);
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
  const code = "t=0,draw=_=>{t++||createCanvas(400,400);x=z=a=X=Z=0;point(200,200);line(190,190,210,210)}";
  const html = runnerDocument(code, {
    viewModel: "pelagion-orbit",
    initialViewState: {
      orientation: { x: 0, y: 0.25, z: 0, w: 0.9682458 },
      time: 7
    }
  });

  assert.match(html, /pelagion-orbit/);
  assert.match(html, /projectedSpatialPoint/);
  assert.match(html, /projectedSpatialLine/);
  assert.match(html, /globalThis\.X/);
  assert.match(html, /sketch-view-state/);
  assert.match(html, /sketch-view-snapshot/);
  assert.match(html, /applyState\(initialViewState\)/);
  assert.match(html, /next \|\|= \{\}/);
  assert.match(html, /"time":7/);
  assert.match(html, /pendingTime - firstStep/);
  assert.match(html, /globalThis\.redraw\(\)/);
  assert.match(html, /canvas\?\.width > 0/);
  assert.match(html, /touch-action:none/);
  assert.equal((html.match(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("the memory runner projects points and generated edges with the same saved camera", () => {
  const code = "t=0,draw=_=>{t++||createCanvas(400,400);z=Z=0;point(200,200);line(190,190,210,210)}";
  const html = runnerDocument(code, { viewModel: "point-cloud-orbit" });

  assert.match(html, /point-cloud-orbit/);
  assert.match(html, /projectedSpatialPoint/);
  assert.match(html, /projectedSpatialLine/);
  assert.match(html, /globalThis\.Z/);
});

test("the Krylofor runner composes its embedded Y turn with the saved manual camera", () => {
  const code = "t=0,draw=_=>{t+=.01;createCanvas(400,400);x=z=1;point(x*cos(t)+z*sin(t)+200,200)}";
  const html = runnerDocument(code, { viewModel: "point-cloud-auto-y-orbit" });

  assert.match(html, /point-cloud-auto-y-orbit/);
  assert.match(html, /globalThis\.t/);
  assert.match(html, /-axial \* Math\.sin\(angle\) \+ depth \* Math\.cos\(angle\)/);
  assert.equal((html.match(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("the WEBGL runner rotates real primitives with the same external saved camera", () => {
  const code = "t=0,setup=_=>createCanvas(720,720,WEBGL),draw=_=>{clear();t++;push();translate(1,2,3);torus(20);pop()}";
  const html = runnerDocument(code, {
    viewModel: "webgl-orbit",
    initialViewState: {
      orientation: { x: 0.25, y: 0, z: 0, w: 0.9682458 },
      time: 8
    }
  });

  assert.match(html, /webgl-orbit/);
  assert.match(html, /projectedWebglFrame/);
  assert.match(html, /sourceDraw/);
  assert.match(html, /globalThis\.rotate\(angle/);
  assert.match(html, /sourceDraw\.apply\(this, args\)/);
  assert.match(html, /globalThis\.C/);
  assert.match(html, /setAnimationTime/);
  assert.match(html, /"time":8/);
  assert.equal((html.match(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("runner diagnostics remain available even when the unmodified RAW has a syntax error", () => {
  const invalid = "t=0,draw=_=>{this is deliberately invalid";
  const html = runnerDocument(invalid);
  assert.match(html, /installRunnerErrorChannel/);
  assert.match(html, /installRunnerFrameMonitor/);
  assert.match(html, /sketch-runtime-status/);
  assert.match(html, /Не удалось загрузить p5\.js/);
  assert.match(html, /pixelDensity\(1\)/);
  assert.ok(html.indexOf("installRunnerErrorChannel") < html.indexOf(invalid));
  assert.equal(html.split(invalid).length, 2, "RAW must appear byte-for-byte once");
  assert.ok(html.indexOf(invalid) < html.indexOf("installRunnerFrameMonitor"));
  assert.equal(html.match(/p5@1\.11\.3/g)?.length, 1);
  // The existing bridge and spatial camera must remain outside the RAW source.
  assert.match(html, /sketch-motion/);
  assert.match(runnerDocument("draw=_=>{}", {viewModel: "webgl-orbit"}), /installSpatialViewBridge/);
});

test("each p5 iframe boot emits a versioned status so a prior iframe cannot overwrite it", () => {
  const first = runnerDocument("t=0,draw=_=>{}", { frameToken: "first-load" });
  const second = runnerDocument("t=0,draw=_=>{}", { frameToken: "second-load" });
  assert.match(first, /frameToken/);
  assert.match(first, /"first-load"/);
  assert.match(second, /"second-load"/);
  assert.doesNotMatch(second, /"first-load"/);
  assert.match(second, /sketch-runtime-status/);
});
