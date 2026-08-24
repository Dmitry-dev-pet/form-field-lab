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

function gridIndex(row, column, { columns }) {
  return row * columns + column;
}

function decodeRectangle(index, dimensions, target = {}) {
  target.row = Math.floor(index / dimensions.columns);
  target.column = index % dimensions.columns;
  target.u = target.column / Math.max(1, dimensions.columns - 1);
  target.v = target.row / Math.max(1, dimensions.rows - 1);
  return target;
}

function rectangleEdges({ wrapColumns = false, wrapRows = false, flipColumnSeam = false } = {}) {
  return (dimensions, visit) => {
    const { columns, rows } = dimensions;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = gridIndex(row, column, dimensions);
        if (column < columns - 1) {
          visit(index, gridIndex(row, column + 1, dimensions), "parallel");
        } else if (wrapColumns) {
          const seamRow = flipColumnSeam ? rows - 1 - row : row;
          visit(index, gridIndex(seamRow, 0, dimensions), "seam");
        }
        if (row < rows - 1) {
          visit(index, gridIndex(row + 1, column, dimensions), "meridian");
        } else if (wrapRows) {
          visit(index, gridIndex(0, column, dimensions), "seam");
        }
      }
    }
  };
}

function rectangleFaces({ wrapColumns = false, wrapRows = false, flipColumnSeam = false } = {}) {
  return (dimensions, visit) => {
    const { columns, rows } = dimensions;
    const rowCells = wrapRows ? rows : rows - 1;
    const columnCells = wrapColumns ? columns : columns - 1;
    for (let row = 0; row < rowCells; row++) {
      const nextRow = (row + 1) % rows;
      for (let column = 0; column < columnCells; column++) {
        const nextColumn = (column + 1) % columns;
        const crossesColumnSeam = column === columns - 1;
        const seamRow = crossesColumnSeam && flipColumnSeam ? rows - 1 - row : row;
        const seamNextRow = crossesColumnSeam && flipColumnSeam
          ? rows - 1 - nextRow
          : nextRow;
        visit([
          gridIndex(row, column, dimensions),
          gridIndex(seamRow, nextColumn, dimensions),
          gridIndex(seamNextRow, nextColumn, dimensions),
          gridIndex(nextRow, column, dimensions)
        ], "quad");
      }
    }
  };
}

function sphereVertexCount({ columns, rows }) {
  return 2 + columns * (rows - 2);
}

function sphereRingIndex(row, column, dimensions) {
  return 1 + (row - 1) * dimensions.columns + column;
}

function decodeSphere(index, dimensions, target = {}) {
  const { columns, rows, vertexCount } = dimensions;
  if (index <= 0) {
    target.row = 0;
    target.column = 0;
  } else if (index >= vertexCount - 1) {
    target.row = rows - 1;
    target.column = 0;
  } else {
    const ringIndex = index - 1;
    target.row = 1 + Math.floor(ringIndex / columns);
    target.column = ringIndex % columns;
  }
  target.u = target.column / columns;
  target.v = target.row / (rows - 1);
  return target;
}

function sphereEdges(dimensions, visit) {
  const { columns, rows, vertexCount } = dimensions;
  const bottom = vertexCount - 1;
  for (let row = 1; row < rows - 1; row++) {
    for (let column = 0; column < columns; column++) {
      const index = sphereRingIndex(row, column, dimensions);
      visit(index, sphereRingIndex(row, (column + 1) % columns, dimensions), "parallel");
      if (row < rows - 2) {
        visit(index, sphereRingIndex(row + 1, column, dimensions), "meridian");
      }
    }
  }
  for (let column = 0; column < columns; column++) {
    visit(0, sphereRingIndex(1, column, dimensions), "pole");
    visit(bottom, sphereRingIndex(rows - 2, column, dimensions), "pole");
  }
}

function sphereFaces(dimensions, visit) {
  const { columns, rows, vertexCount } = dimensions;
  const bottom = vertexCount - 1;
  for (let column = 0; column < columns; column++) {
    const nextColumn = (column + 1) % columns;
    visit([
      0,
      sphereRingIndex(1, nextColumn, dimensions),
      sphereRingIndex(1, column, dimensions)
    ], "triangle");
    for (let row = 1; row < rows - 2; row++) {
      visit([
        sphereRingIndex(row, column, dimensions),
        sphereRingIndex(row, nextColumn, dimensions),
        sphereRingIndex(row + 1, nextColumn, dimensions),
        sphereRingIndex(row + 1, column, dimensions)
      ], "quad");
    }
    visit([
      sphereRingIndex(rows - 2, column, dimensions),
      sphereRingIndex(rows - 2, nextColumn, dimensions),
      bottom
    ], "triangle");
  }
}

function topology(definition) {
  return Object.freeze({
    minColumns: 3,
    minRows: 2,
    vertexCount: dimensions => dimensions.columns * dimensions.rows,
    decodeVertex: decodeRectangle,
    ...definition
  });
}

export const GRID_TOPOLOGY_PRESETS = Object.freeze([
  topology({
    id: "sphere",
    label: "Сфера",
    description: "Замкнутая ориентируемая поверхность с двумя полюсами.",
    orientable: true,
    boundaries: 0,
    minRows: 3,
    vertexCount: sphereVertexCount,
    decodeVertex: decodeSphere,
    forEachEdge: sphereEdges,
    forEachFace: sphereFaces
  }),
  topology({
    id: "ichthyo",
    label: "Ихтиоморф",
    description: "Сферическая сетка сохраняет χ=2, а бегущая хвостовая волна превращает её образ в плывущее тело.",
    orientable: true,
    boundaries: 0,
    minRows: 3,
    vertexCount: sphereVertexCount,
    decodeVertex: decodeSphere,
    forEachEdge: sphereEdges,
    forEachFace: sphereFaces
  }),
  topology({
    id: "plane",
    label: "Плоскость",
    description: "Открытый прямоугольный лист с одной границей.",
    orientable: true,
    boundaries: 1,
    forEachEdge: rectangleEdges(),
    forEachFace: rectangleFaces()
  }),
  topology({
    id: "cylinder",
    label: "Цилиндр",
    description: "Одна координата замкнута, торцы остаются открытыми.",
    orientable: true,
    boundaries: 2,
    forEachEdge: rectangleEdges({ wrapColumns: true }),
    forEachFace: rectangleFaces({ wrapColumns: true })
  }),
  topology({
    id: "torus",
    label: "Тор",
    description: "Обе координаты замкнуты без переворота.",
    orientable: true,
    boundaries: 0,
    forEachEdge: rectangleEdges({ wrapColumns: true, wrapRows: true }),
    forEachFace: rectangleFaces({ wrapColumns: true, wrapRows: true })
  }),
  topology({
    id: "sphere-torus",
    label: "Сфера↔тор",
    description: "Один тороидальный домен проходит сферический образ, самопересечение и сингулярность, прежде чем раскрыться в тор.",
    orientable: true,
    boundaries: 0,
    morph: true,
    forEachEdge: rectangleEdges({ wrapColumns: true, wrapRows: true }),
    forEachFace: rectangleFaces({ wrapColumns: true, wrapRows: true })
  }),
  topology({
    id: "mobius",
    label: "Мёбиус",
    description: "Одна координата замкнута с переворотом поперечного ряда.",
    orientable: false,
    boundaries: 1,
    forEachEdge: rectangleEdges({ wrapColumns: true, flipColumnSeam: true }),
    forEachFace: rectangleFaces({ wrapColumns: true, flipColumnSeam: true })
  })
]);

const topologyById = new Map(GRID_TOPOLOGY_PRESETS.map(item => [item.id, item]));

export function readMeshRenderMode(value) {
  return Object.values(MESH_RENDER_MODE).includes(value)
    ? value
    : MESH_RENDER_MODE.hybrid;
}

export function resolveGridTopology(mesh, settings) {
  const candidates = mesh.topologies || GRID_TOPOLOGY_PRESETS;
  const requested = settings[mesh.topologyKey || "topology"] || mesh.defaultTopology || "sphere";
  return candidates.find(item => item.id === requested)
    || topologyById.get(requested)
    || candidates[0]
    || GRID_TOPOLOGY_PRESETS[0];
}

export function resolveGridDimensions(mesh, settings) {
  const selectedTopology = resolveGridTopology(mesh, settings);
  const columns = Math.max(
    selectedTopology.minColumns,
    Math.round(Number(settings[mesh.columnsKey]) || 0)
  );
  const rows = Math.max(
    selectedTopology.minRows,
    Math.round(Number(settings[mesh.rowsKey]) || 0)
  );
  const dimensions = { columns, rows, topology: selectedTopology };
  dimensions.vertexCount = selectedTopology.vertexCount(dimensions);
  return dimensions;
}

export function decodeGridVertex(mesh, dimensions, index, target = {}) {
  return dimensions.topology.decodeVertex(index, dimensions, target);
}

export function forEachGridEdge(mesh, dimensions, visit) {
  dimensions.topology.forEachEdge(dimensions, visit);
}

export function forEachGridFace(mesh, dimensions, visit) {
  dimensions.topology.forEachFace(dimensions, visit);
}

export function measureGridTopology(mesh, settings) {
  const dimensions = resolveGridDimensions(mesh, settings);
  let edges = 0;
  let faces = 0;
  forEachGridEdge(mesh, dimensions, () => { edges += 1; });
  forEachGridFace(mesh, dimensions, () => { faces += 1; });
  return {
    ...dimensions,
    edges,
    faces,
    eulerCharacteristic: dimensions.vertexCount - edges + faces,
    orientable: dimensions.topology.orientable,
    boundaries: dimensions.topology.boundaries
  };
}
