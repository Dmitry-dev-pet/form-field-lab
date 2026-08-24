import {
  compileTopologyGenome,
  TOPOLOGY_GENOME_LIMIT
} from "./topologyGenomes.js";

const sphere = compileTopologyGenome({ topology: "sphere" });

export const SPHERE_GRID_GENOME_LIMIT = TOPOLOGY_GENOME_LIMIT;
export const SPHERE_GRID_GENOME = sphere.code;
export const SPHERE_GRID_GENOME_CHARACTERS = sphere.characters;
export const SPHERE_GRID_GENOME_SKETCH = sphere.sketch;
