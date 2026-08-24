import test from "node:test";
import assert from "node:assert/strict";
import {
  forEachGridEdge,
  MESH_RENDER_MODE,
  readMeshRenderMode,
  resolveGridDimensions
} from "../src/lib/meshTopology.js";

const mesh = Object.freeze({
  columnsKey: "columns",
  rowsKey: "rows",
  wrapColumns: true
});

test("grid dimensions derive a stable vertex count from rows and columns", () => {
  assert.deepEqual(
    resolveGridDimensions(mesh, { columns: 32, rows: 16 }),
    { columns: 32, rows: 16, vertexCount: 512 }
  );
  assert.deepEqual(
    resolveGridDimensions(mesh, { columns: 1, rows: 1 }),
    { columns: 3, rows: 2, vertexCount: 6 }
  );
});

test("wrapped grid connects parallels, meridians and the longitude seam", () => {
  const dimensions = resolveGridDimensions(mesh, { columns: 4, rows: 3 });
  const edges = [];
  forEachGridEdge(mesh, dimensions, (first, second, kind) => {
    edges.push([first, second, kind]);
  });

  assert.equal(edges.length, 4 * 3 + 4 * 2);
  assert.ok(edges.some(edge => edge[0] === 3 && edge[1] === 0 && edge[2] === "parallel"));
  assert.ok(edges.some(edge => edge[0] === 4 && edge[1] === 8 && edge[2] === "meridian"));
  assert.ok(edges.every(edge => edge[0] < 12 && edge[1] < 12));
});

test("mesh rendering exposes points, wireframe and hybrid modes", () => {
  assert.equal(readMeshRenderMode("points"), MESH_RENDER_MODE.points);
  assert.equal(readMeshRenderMode("wireframe"), MESH_RENDER_MODE.wireframe);
  assert.equal(readMeshRenderMode("hybrid"), MESH_RENDER_MODE.hybrid);
  assert.equal(readMeshRenderMode("unknown"), MESH_RENDER_MODE.hybrid);
});
