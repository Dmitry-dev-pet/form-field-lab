import test from "node:test";
import assert from "node:assert/strict";
import { sketches } from "../src/data/sketches.js";
import { createPointEngine, interpolatePointClouds } from "../src/lib/pointEngine.js";
import { runnerDocument, installSpatialViewBridge } from "../src/lib/runnerDocument.js";
import { runInNewContext } from "node:vm";

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
  assert.match(html, /sketch-first-frame/);
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


test("saved nonzero phase never bypasses RAW first-draw canvas initialization", () => {
  const handlers = new Map();
  const frames = [];
  const document = {
    documentElement: { dataset: {} },
    // p5 can create a default canvas before calling the user's draw().
    // This is the exact condition that previously caused w not defined.
    querySelector: selector => selector === "canvas"
      ? { width: 100, height: 100, tabIndex: -1 }
      : null
  };
  const scope = {
    t: 0, point: () => {}, line: () => {},
    redraw: () => { throw Error("Never redraw before RAW initialized"); },
    parent: { postMessage: () => {} },
    document,
    addEventListener: (type, callback) => handlers.set(type, callback),
    requestAnimationFrame: callback => frames.push(callback),
    setInterval: () => 1
  };
  scope.globalThis = scope;
  const saved = { time: 7.8, orientation: { x: 0, y: 0, z: 0, w: 1 } };
  runInNewContext(
    "(" + installSpatialViewBridge.toString() + ")('point-cloud-orbit',"
      + JSON.stringify(saved) + ")",
    scope
  );

  handlers.get("load")();
  frames.shift()(); // view setup observes the pre-existing default canvas.
  assert.equal(scope.t, 0, "saved time must not suppress t||createCanvas(w=400,w)");

  // Native RAW first draw has now assigned w and incremented t.
  scope.w = 400;
  scope.t = 0.02;
  handlers.get("sketch-first-frame")();
  assert.equal(scope.t, 7.8, "restore phase only after the RAW created its canvas");
  handlers.get("sketch-first-frame")();
  assert.equal(scope.t, 7.8, "duplicate first-frame events are harmless");

  handlers.get("message")({ data: {
    type: "sketch-view", state: { time: 9.4 }
  } });
  assert.equal(scope.t, 9.4, "subsequent view updates remain live");
});

test("runner first frame signals phase restoration only after RAW draw returned", () => {
  const html = runnerDocument("t=0,draw=_=>{t||createCanvas(w=400,w);point(200,200)}", {
    viewModel: "pelagion-orbit",
    initialViewState: { orientation: { x: 0, y: 0, z: 0, w: 1 }, time: 9 }
  });
  assert.match(html, /sourceDraw.apply\(this, args\)/);
  assert.match(html, /dispatchEvent\(new Event\("sketch-first-frame"\)\)/);
  assert.match(html, /addEventListener\("sketch-first-frame"/);
  assert.match(html, /time":9/);
});
