import test from "node:test";
import assert from "node:assert/strict";
import {
  SKETCH_36_LIMIT,
  compileSketch36Genome,
  inspectSketch36Genome,
  isOriginalSketch36Genome,
  normalizeSketch36Genome,
  sketch36Colors,
  sketch36Couplings,
  sketch36Defaults,
  sketch36Depths,
  sketch36FieldLaws,
  sketch36Modes,
  sketch36Original,
  sketch36Renders,
  sketch36Seeds,
  sketch36Signature
} from "../src/data/sketch36Genome.js";

test("sketch #36 default is the untouched 273-character source", () => {
  assert.equal(compileSketch36Genome(sketch36Defaults), sketch36Original.code);
  assert.equal(compileSketch36Genome(sketch36Defaults).length, 273);
  assert.equal(isOriginalSketch36Genome(sketch36Defaults), true);
});

test("every categorical gene has at least one executable state inside 280", () => {
  const groups = {
    mode: sketch36Modes,
    fieldLaw: sketch36FieldLaws,
    coupling: sketch36Couplings,
    seed: sketch36Seeds,
    depth: sketch36Depths,
    render: sketch36Renders,
    color: sketch36Colors
  };

  for (const [key, options] of Object.entries(groups)) {
    for (const option of options) {
      const candidates = [
        { ...sketch36Defaults, [key]: option.id, mode: "memory" },
        { ...sketch36Defaults, [key]: option.id, mode: "seed" },
        { ...sketch36Defaults, [key]: option.id }
      ];
      const result = candidates.map(inspectSketch36Genome).find(candidate => candidate.fits);
      assert.ok(result, `${key}=${option.id} has no portable form`);
      assert.doesNotThrow(() => new Function(result.code));
      assert.match(result.code, /#つぶやきProcessing/);
    }
  }
});

test("portable combinations never escape through the strict compiler", () => {
  for (const mode of sketch36Modes) {
    for (const law of sketch36FieldLaws) {
      for (const coupling of sketch36Couplings) {
        for (const depth of sketch36Depths) {
          for (const render of sketch36Renders) {
            const source = {
              ...sketch36Defaults,
              mode: mode.id,
              fieldLaw: law.id,
              coupling: coupling.id,
              depth: depth.id,
              render: render.id,
              color: "depth",
              centerX: 2.5,
              centerY: 2.2,
              scaleX: 180,
              scaleY: 180,
              memory: 5,
              birth: 99,
              death: 99
            };
            const result = inspectSketch36Genome(source);
            if (result.fits) {
              assert.equal(compileSketch36Genome(source), result.code);
              assert.ok(result.length <= SKETCH_36_LIMIT);
              assert.doesNotThrow(() => new Function(result.code));
            } else {
              assert.throws(() => compileSketch36Genome(source), error => error.requiredLength === result.length);
            }
          }
        }
      }
    }
  }
});

test("field, coupling, seed, depth, links and metabolism change executable code", () => {
  const smooth = compileSketch36Genome({ ...sketch36Defaults, mode: "memory", fieldLaw: "smooth" });
  const reverse = compileSketch36Genome({ ...sketch36Defaults, mode: "memory", coupling: "reverse" });
  const band = compileSketch36Genome({ ...sketch36Defaults, mode: "memory", seed: "band" });
  const orbit = compileSketch36Genome({ ...sketch36Defaults, mode: "memory", depth: "orbit" });
  const links = compileSketch36Genome({ ...sketch36Defaults, mode: "memory", render: "links" });
  const exchange = compileSketch36Genome({ ...sketch36Defaults, color: "cell", birth: 30, death: 70 });

  assert.match(smooth, /v\.x\*2\+2\.5\+v\.y\+2/);
  assert.match(reverse, /v\.add\(-sin\(v\.y\*r\)/);
  assert.match(band, /v\.y\/=4/);
  assert.match(orbit, /v\.x\*cos\(t\/90\)-v\.z\*sin\(t\/90\)/);
  assert.match(links, /beginShape\(LINES\)/);
  assert.match(links, /\.vertex\(/);
  assert.match(exchange, /splice\(0,70\)/);
  assert.match(exchange, /Array\(30\)/);
});

test("normalization clamps all numeric genes and produces stable signatures", () => {
  const normalized = normalizeSketch36Genome({
    mode: "unknown",
    fieldLaw: "unknown",
    coupling: "unknown",
    seed: "unknown",
    depth: "unknown",
    render: "unknown",
    color: "unknown",
    trail: 100,
    cell: -5,
    field: 100,
    step: 1,
    memory: 12,
    birth: 1,
    death: 200,
    centerX: 9,
    centerY: -1,
    scaleX: 12,
    scaleY: 900
  });

  assert.deepEqual(normalized, {
    ...sketch36Defaults,
    trail: 9,
    cell: 1,
    field: 9,
    step: 30,
    memory: 5,
    birth: 10,
    death: 99,
    centerX: 3,
    centerY: 1,
    scaleX: 90,
    scaleY: 180
  });
  assert.equal(sketch36Signature(normalized).split("-").length, Object.keys(sketch36Defaults).length);
});
