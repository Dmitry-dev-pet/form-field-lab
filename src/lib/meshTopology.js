export const MESH_RENDER_MODE = Object.freeze({
  points: "points",
  wireframe: "wireframe",
  hybrid: "hybrid"
});

export const MESH_RENDER_MODES = Object.freeze([
  Object.freeze({ id: MESH_RENDER_MODE.points, label: "Точки" }),
  Object.freeze({ id: MESH_RENDER_MODE.wireframe, label: "Сетка" }),
  Object.freeze({ id: MESH_RENDER_MODE.hybrid, label: "Вместе" })
]);

export function readMeshRenderMode(value) {
  return Object.values(MESH_RENDER_MODE).includes(value)
    ? value
    : MESH_RENDER_MODE.hybrid;
}

export function resolveGridDimensions(mesh, settings) {
  const columns = Math.max(3, Math.round(Number(settings[mesh.columnsKey]) || 0));
  const rows = Math.max(2, Math.round(Number(settings[mesh.rowsKey]) || 0));
  return { columns, rows, vertexCount: columns * rows };
}

export function forEachGridEdge(mesh, dimensions, visit) {
  const { columns, rows } = dimensions;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      if (mesh.wrapColumns || column < columns - 1) {
        visit(index, row * columns + (column + 1) % columns, "parallel");
      }
      if (row < rows - 1) visit(index, index + columns, "meridian");
    }
  }
}
