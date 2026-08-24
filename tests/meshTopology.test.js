import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeGridVertex,
  forEachGridEdge,
  forEachGridFace,
  GRID_TOPOLOGY_PRESETS,
  measureGridTopology,
  MESH_RENDER_MODE,
  readMeshRenderMode,
  resolveGridDimensions
} from "../src/lib/meshTopology.js";

const mesh = Object.freeze({
  columnsKey: "columns",
  rowsKey: "rows",
  topologyKey: "topology",
  topologies: GRID_TOPOLOGY_PRESETS
});

test("the topology atlas exposes five classes, an organic sphere and one singular transition", () => {
  assert.deepEqual(
    GRID_TOPOLOGY_PRESETS.map(topology => topology.id),
    ["sphere", "ichthyo", "plane", "cylinder", "torus", "sphere-torus", "mobius"]
  );
  for (const topology of GRID_TOPOLOGY_PRESETS) {
    assert.equal(typeof topology.vertexCount, "function");
    assert.equal(typeof topology.decodeVertex, "function");
    assert.equal(typeof topology.forEachEdge, "function");
    assert.equal(typeof topology.forEachFace, "function");
  }
});

test("each preset has the expected V, E, F and Euler characteristic", () => {
  const expected = {
    sphere: { vertexCount: 10, edges: 20, faces: 12, eulerCharacteristic: 2, boundaries: 0, orientable: true },
    ichthyo: { vertexCount: 10, edges: 20, faces: 12, eulerCharacteristic: 2, boundaries: 0, orientable: true },
    plane: { vertexCount: 12, edges: 17, faces: 6, eulerCharacteristic: 1, boundaries: 1, orientable: true },
    cylinder: { vertexCount: 12, edges: 20, faces: 8, eulerCharacteristic: 0, boundaries: 2, orientable: true },
    torus: { vertexCount: 12, edges: 24, faces: 12, eulerCharacteristic: 0, boundaries: 0, orientable: true },
    "sphere-torus": { vertexCount: 12, edges: 24, faces: 12, eulerCharacteristic: 0, boundaries: 0, orientable: true },
    mobius: { vertexCount: 12, edges: 20, faces: 8, eulerCharacteristic: 0, boundaries: 1, orientable: false }
  };

  for (const [topology, metrics] of Object.entries(expected)) {
    const sphereLike = topology === "sphere" || topology === "ichthyo";
    const actual = measureGridTopology(mesh, { topology, columns: 4, rows: sphereLike ? 4 : 3 });
    for (const [key, value] of Object.entries(metrics)) {
      assert.equal(actual[key], value, `${topology}: unexpected ${key}`);
    }
  }
});

test("the sphere stores each pole once and keeps the 512-node baseline", () => {
  const dimensions = resolveGridDimensions(mesh, { topology: "sphere", columns: 30, rows: 19 });
  const top = decodeGridVertex(mesh, dimensions, 0);
  const bottom = decodeGridVertex(mesh, dimensions, dimensions.vertexCount - 1);

  assert.equal(dimensions.vertexCount, 512);
  assert.deepEqual({ row: top.row, column: top.column }, { row: 0, column: 0 });
  assert.deepEqual({ row: bottom.row, column: bottom.column }, { row: 18, column: 0 });
  assert.equal(measureGridTopology(mesh, { topology: "sphere", columns: 30, rows: 19 }).eulerCharacteristic, 2);
});

test("the Möbius seam reverses the transverse row", () => {
  const dimensions = resolveGridDimensions(mesh, { topology: "mobius", columns: 4, rows: 3 });
  const seams = [];
  forEachGridEdge(mesh, dimensions, (first, second, kind) => {
    if (kind === "seam") seams.push([first, second]);
  });

  assert.ok(seams.some(([first, second]) => first === 3 && second === 8));
  assert.ok(seams.some(([first, second]) => first === 7 && second === 4));
  assert.ok(seams.some(([first, second]) => first === 11 && second === 0));
});

test("every generated edge and face references a valid vertex", () => {
  for (const topology of GRID_TOPOLOGY_PRESETS) {
    const dimensions = resolveGridDimensions(mesh, { topology: topology.id, columns: 7, rows: 5 });
    forEachGridEdge(mesh, dimensions, (first, second) => {
      assert.ok(first >= 0 && first < dimensions.vertexCount, `${topology.id}: invalid edge start`);
      assert.ok(second >= 0 && second < dimensions.vertexCount, `${topology.id}: invalid edge end`);
    });
    forEachGridFace(mesh, dimensions, vertices => {
      assert.ok(vertices.length === 3 || vertices.length === 4);
      assert.ok(vertices.every(index => index >= 0 && index < dimensions.vertexCount), `${topology.id}: invalid face`);
    });
  }
});

test("mesh rendering exposes points, wireframe and hybrid modes", () => {
  assert.equal(readMeshRenderMode("points"), MESH_RENDER_MODE.points);
  assert.equal(readMeshRenderMode("wireframe"), MESH_RENDER_MODE.wireframe);
  assert.equal(readMeshRenderMode("hybrid"), MESH_RENDER_MODE.hybrid);
  assert.equal(readMeshRenderMode("unknown"), MESH_RENDER_MODE.hybrid);
});
