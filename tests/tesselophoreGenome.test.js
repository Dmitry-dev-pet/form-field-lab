import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  TESSELOPHORE_CORE_GENOME,
  TESSELOPHORE_EXCHANGE_GENOME,
  TESSELOPHORE_RAW_VARIANTS,
  TESSELOPHORE_TISSUE_GENOME,
  compileTesselophoreBudget
} from "../src/data/tesselophoreGenome.js";

class Vector {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  lerp(x, y, z, amount) {
    this.x += (x - this.x) * amount;
    this.y += (y - this.y) * amount;
    this.z += (z - this.z) * amount;
    return this;
  }

  add(x = 0, y = 0, z = 0) {
    this.x += x;
    this.y += y;
    this.z += z;
    return this;
  }

  mult(scale = 1) {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    return this;
  }

  static random3D() {
    return new Vector(0.6, -0.4, 0.7);
  }
}

function execute(code, frames = 90) {
  let points = [];
  let lines = [];
  let strokes = [];
  const sandbox = {
    PI: Math.PI,
    HSB: "HSB",
    sin: Math.sin,
    cos: Math.cos,
    createCanvas() {},
    createVector: () => new Vector(),
    colorMode() {},
    background() { points = []; lines = []; strokes = []; return sandbox; },
    stroke(...channels) { strokes.push(channels); },
    point(x, y) { points.push([x, y, sandbox.z]); },
    line(...coordinates) { lines.push(coordinates); },
    p5: { Vector }
  };
  vm.runInNewContext(code, sandbox);
  for (let frame = 0; frame < frames; frame += 1) sandbox.draw();
  return { points, lines, strokes, sandbox };
}

test("Tesselophore grows through three nested RAW budgets", () => {
  assert.deepEqual(
    TESSELOPHORE_RAW_VARIANTS.map(variant => variant.sketch.code.length),
    [273, 441, 572]
  );
  for (const [budget, id] of [[280, "memory-body"], [512, "cell-exchange"], [768, "living-tissue"]]) {
    const result = compileTesselophoreBudget(budget);
    assert.equal(result.variant.id, id);
    assert.ok(result.characters <= budget);
    assert.equal(result.withinLimit, true);
  }
});

test("the 280 core is one persistent finite 3D body", () => {
  assert.equal(TESSELOPHORE_CORE_GENOME.length, 273);
  assert.match(TESSELOPHORE_CORE_GENOME, /v\.lerp/);
  assert.match(TESSELOPHORE_CORE_GENOME, /sin\(PI\*u\/5\)\*\*\.6/);
  assert.doesNotMatch(TESSELOPHORE_CORE_GENOME, /WEBGL/);
  assert.doesNotThrow(() => new Function(TESSELOPHORE_CORE_GENOME));

  const frame = execute(TESSELOPHORE_CORE_GENOME);
  assert.equal(frame.points.length, 1000);
  assert.ok(frame.points.flat().every(Number.isFinite));
  assert.ok(Math.max(...frame.points.map(point => point[0]))
    - Math.min(...frame.points.map(point => point[0])) > 150);
  assert.ok(Math.max(...frame.points.map(point => point[2]))
    - Math.min(...frame.points.map(point => point[2])) > 110);
});

test("the 512 exchange adds quantized cells, renewal, age color and screen memory", () => {
  assert.equal(TESSELOPHORE_EXCHANGE_GENOME.length, 441);
  assert.match(TESSELOPHORE_EXCHANGE_GENOME, /\(v\.x\/8\|0\)\^\(v\.y\/8\|0\)/);
  assert.match(TESSELOPHORE_EXCHANGE_GENOME, /i==t%1e3/);
  assert.match(TESSELOPHORE_EXCHANGE_GENOME, /\(t-i\+1e3\)%1e3\/4/);
  assert.match(TESSELOPHORE_EXCHANGE_GENOME, /background\(9,15\)/);

  const frame = execute(TESSELOPHORE_EXCHANGE_GENOME);
  assert.equal(frame.points.length, 1000);
  assert.ok(frame.points.flat().every(Number.isFinite));
  assert.ok(new Set(frame.strokes.map(stroke => stroke.join(","))).size > 100);
});

test("the 768 tissue keeps exchange and adds projected links", () => {
  assert.equal(TESSELOPHORE_TISSUE_GENOME.length, 572);
  assert.match(TESSELOPHORE_TISSUE_GENOME, /i==t%1e3/);
  assert.match(TESSELOPHORE_TISSUE_GENOME, /\(v\.x\/8\|0\)\^\(v\.y\/8\|0\)/);
  assert.match(TESSELOPHORE_TISSUE_GENOME, /p\[i-200\]/);
  assert.match(TESSELOPHORE_TISSUE_GENOME, /line\(/);

  const frame = execute(TESSELOPHORE_TISSUE_GENOME);
  assert.equal(frame.points.length, 1000);
  assert.ok(frame.lines.length > 800);
  assert.ok(frame.lines.flat().every(Number.isFinite));
  assert.equal(TESSELOPHORE_RAW_VARIANTS[2].sketch.viewModel, "point-cloud-orbit");
});
