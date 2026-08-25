import test from "node:test";
import assert from "node:assert/strict";
import { CHRONOPHORE_GENOME } from "../src/data/chronophoreGenome.js";
import { spatialFormById, spatialLayerDefaults } from "../src/data/spatialForms.js";
import { DEFAULT_COLOR_STATE } from "../src/lib/colorFormula.js";
import {
  GENOME_ENTITY_STORAGE_KEY,
  compileChronophoreImprint,
  createSavedEntityRecord,
  nextMutationNumber,
  readSavedEntities,
  writeSavedEntities
} from "../src/lib/genomeImprint.js";

const chronophore = spatialFormById("chronophore");

function makeImprint(overrides = {}) {
  return compileChronophoreImprint({
    settings: { ...chronophore.defaults, windingQ: 5, radius: 101 },
    layers: spatialLayerDefaults(chronophore),
    color: {
      mode: "formula",
      preset: "custom",
      expression: "smoothstep(-6, 6, d) + 0.1 * sin(t)",
      colorA: "#102030",
      colorB: "#90d0ff"
    },
    pose: { yaw: 0.7, pitch: -0.3, time: 2.5 },
    originalCode: CHRONOPHORE_GENOME,
    originalDefaults: chronophore.defaults,
    originalLayers: spatialLayerDefaults(chronophore),
    originalColor: DEFAULT_COLOR_STATE,
    ...overrides
  });
}

test("Chronophore genetic state compiles into an autonomous, rotated p5 imprint", () => {
  const imprint = makeImprint();

  assert.doesNotThrow(() => new Function(imprint.code));
  assert.ok(imprint.characters > CHRONOPHORE_GENOME.length);
  assert.equal(imprint.coreCharacters, 273);
  assert.match(imprint.code, /TAU\*5\*u/);
  assert.match(imprint.code, /r=101\+/);
  assert.match(imprint.code, /X=x\*0\.76484\+Y\*0\+z\*0\.64422/);
  assert.match(imprint.code, /V=x\*-0\.19038\+Y\*0\.95534\+z\*0\.22603/);
  assert.match(imprint.code, /smoothstep=/);
  assert.match(imprint.code, /stroke\(16\+128\*s,32\+176\*s,48\+207\*s/);
  assert.equal(imprint.viewState.find(item => item.key === "yaw").value, "40,1°");
  assert.equal(imprint.viewState.find(item => item.key === "pitch").value, "-17,2°");
  assert.ok(!imprint.mutations.some(mutation => mutation.key === "yaw"));
  assert.ok(!imprint.mutations.some(mutation => mutation.key === "pitch"));
  assert.ok(!imprint.mutations.some(mutation => mutation.key === "roll"));
  assert.ok(imprint.mutations.some(mutation => mutation.key === "windingQ"));
  assert.ok(imprint.mutations.some(mutation => mutation.key === "color"));
  assert.equal(CHRONOPHORE_GENOME.length, 273);
});

test("a touch-driven camera pose changes RAW projection without creating a mutation", () => {
  const imprint = makeImprint({
    settings: chronophore.defaults,
    color: DEFAULT_COLOR_STATE,
    pose: { yaw: 1.1, pitch: 0.4, time: 3 }
  });

  assert.equal(imprint.hasGeneticMutation, false);
  assert.deepEqual(imprint.mutations, []);
  assert.equal(imprint.viewState.length, 4);
  assert.match(imprint.code, /X=x\*0\.4536\+Y\*0\+z\*0\.89121/);
});

test("a quaternion trackball pose preserves roll without becoming genetic", () => {
  const halfTurn = Math.SQRT1_2;
  const imprint = makeImprint({
    settings: chronophore.defaults,
    color: DEFAULT_COLOR_STATE,
    pose: {
      orientation: { x: 0, y: 0, z: halfTurn, w: halfTurn },
      time: 1
    }
  });

  assert.equal(imprint.hasGeneticMutation, false);
  assert.equal(imprint.viewState.find(item => item.key === "roll").value, "90°");
  assert.match(imprint.code, /X=x\*0\+Y\*-1\+z\*0/);
  assert.match(imprint.code, /V=x\*1\+Y\*0\+z\*0/);
});

test("disabled anatomical layers are compiled into the naked geometry", () => {
  const layers = spatialLayerDefaults(chronophore);
  layers.knot = false;
  layers.fibers = false;
  layers.flow = false;
  const imprint = makeImprint({ layers });

  assert.match(imprint.code, /g=0\*/);
  assert.match(imprint.code, /\+0\*cos\(b\)/);
  assert.match(imprint.code, /T\*0\)%1/);
  assert.ok(imprint.mutations.some(mutation => mutation.key === "layers"));
});

test("a fixed imprint becomes a numbered, reloadable local entity", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const imprint = makeImprint();
  const record = createSavedEntityRecord({
    number: 4,
    parent: chronophore,
    imprint,
    settings: chronophore.defaults,
    layers: spatialLayerDefaults(chronophore),
    color: {
      mode: "solid", preset: "phase", expression: "0.5", colorA: "#ffffff", colorB: "#ffffff"
    }
  });

  assert.equal(record.displayNumber, "P7");
  assert.equal(record.parentId, "chronophore");
  assert.equal(writeSavedEntities([record], storage), true);
  assert.ok(values.has(GENOME_ENTITY_STORAGE_KEY));
  assert.deepEqual(readSavedEntities(storage), [JSON.parse(JSON.stringify(record))]);
  assert.equal(nextMutationNumber(readSavedEntities(storage)), 8);
});
