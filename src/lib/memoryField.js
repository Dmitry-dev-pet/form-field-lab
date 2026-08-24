const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const MEMORY_PARTICLE_STRIDE = 6;

function writeSeed(state, offset, index, count, settings, time, generation, age) {
  const phase = generation * 0.61803398875;
  const u = ((index + 0.5) / Math.max(1, count) + phase) % 1;
  const polar = Math.acos(1 - 2 * u);
  const azimuth = index * GOLDEN_ANGLE + generation * 1.73 + time * 0.08;
  const thickness = Number(settings.seedThickness) || 0;
  const radius = Number(settings.radius) * (
    1 + thickness * Math.sin(index * 12.9898 + generation * 2.17)
  );
  const sinPolar = Math.sin(polar);

  state[offset] = radius * sinPolar * Math.cos(azimuth);
  state[offset + 1] = radius * Math.cos(polar);
  state[offset + 2] = radius * sinPolar * Math.sin(azimuth);
  state[offset + 3] = age;
  state[offset + 4] = generation;
  state[offset + 5] = 0;
}

export function createMemoryPopulation(count, settings, time = 0) {
  const safeCount = Math.max(1, Math.round(Number(count) || 1));
  const state = new Float32Array(safeCount * MEMORY_PARTICLE_STRIDE);
  for (let index = 0; index < safeCount; index++) {
    writeSeed(
      state,
      index * MEMORY_PARTICLE_STRIDE,
      index,
      safeCount,
      settings,
      time,
      0,
      index / safeCount
    );
  }
  return state;
}

export function stepMemoryPopulation(state, time, settings, layers, frameScale = 1) {
  const count = state.length / MEMORY_PARTICLE_STRIDE;
  const lifespan = Math.max(30, Number(settings.lifespan) || 180);
  const flow = layers.flow === false ? 0 : (Number(settings.flowStrength) || 0) * 0.22;
  const frequency = Number(settings.fieldFrequency) || 1;
  const cohesion = layers.cohesion === false ? 0 : (Number(settings.cohesion) || 0) * 0.006;
  const twist = Number(settings.twist) || 0;
  const targetRadius = Math.max(1, Number(settings.radius) || 1);
  const safeFrameScale = Math.max(0, Math.min(3, Number(frameScale) || 0));

  for (let index = 0; index < count; index++) {
    const offset = index * MEMORY_PARTICLE_STRIDE;
    let age = state[offset + 3] + safeFrameScale / lifespan;
    let generation = state[offset + 4];
    if (age >= 1 && layers.renewal !== false) {
      generation += 1;
      writeSeed(state, offset, index, count, settings, time, generation, age % 1);
      continue;
    }

    const x = state[offset];
    const y = state[offset + 1];
    const z = state[offset + 2];
    const radius = Math.hypot(x, y, z) || 1;
    const nx = x / targetRadius;
    const ny = y / targetRadius;
    const nz = z / targetRadius;
    const radialCorrection = (targetRadius - radius) * cohesion;
    const dx = safeFrameScale * (
      flow * (Math.sin(ny * frequency + time) + Math.cos(nz * frequency - time * 0.7))
      - twist * ny * 0.12
      + radialCorrection * x / radius
    );
    const dy = safeFrameScale * (
      flow * (Math.cos(nx * frequency - time) + Math.sin(nz * frequency + time * 0.8))
      + twist * nx * 0.12
      + radialCorrection * y / radius
    );
    const dz = safeFrameScale * (
      flow * (Math.sin(nx * frequency + ny * frequency + time * 0.6)
        + Math.cos(nz * frequency + time))
      + twist * Math.sin(time + index * 0.013) * 0.08
      + radialCorrection * z / radius
    );

    state[offset] = x + dx;
    state[offset + 1] = y + dy;
    state[offset + 2] = z + dz;
    state[offset + 3] = age % 1;
    state[offset + 5] = Math.hypot(dx, dy, dz);
  }
  return state;
}

export function readMemoryParticle(state, index, settings, target) {
  const offset = index * MEMORY_PARTICLE_STRIDE;
  const x = state[offset];
  const y = state[offset + 1];
  const z = state[offset + 2];
  const age = state[offset + 3];
  const generation = state[offset + 4];

  target.x = x + 200;
  target.y = y + 200;
  target.z = z * Number(settings.depth);
  target.parameter = age;
  target.k = state[offset + 5] * 2;
  target.e = age;
  target.d = Math.hypot(x, y, z);
  target.c = Math.atan2(y, x);
  target.branch = generation % 6;
  target.forms = 6;
  return target;
}

export function evaluateMemorySeed(index, time, settings, _layers, target) {
  const count = Math.max(1, Math.round(Number(settings.pointCount) || 1));
  const state = new Float32Array(MEMORY_PARTICLE_STRIDE);
  writeSeed(state, 0, index, count, settings, time, 0, index / count);
  const angle = time * 0.22;
  const x = state[0];
  const z = state[2];
  const breath = 1 + 0.035 * Math.sin(time * 1.7 + index / count * TAU * 3);
  state[0] = (x * Math.cos(angle) + z * Math.sin(angle)) * breath;
  state[2] = (-x * Math.sin(angle) + z * Math.cos(angle)) * breath;
  return readMemoryParticle(state, 0, settings, target);
}
