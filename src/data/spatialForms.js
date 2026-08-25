import { sketches } from "./sketches.js";
import { CHRONOPHORE_GENOME_SKETCH } from "./chronophoreGenome.js";
import {
  BLASTOPHORE_GENOME_SKETCH,
  BLASTOPHORE_RAW_VARIANTS
} from "./blastophoreGenome.js";
import {
  PELAGION_BUDGET_VARIANTS_BY_MODE,
  PELAGION_EVOLUTION_VARIANTS,
  PELAGION_LIVING_GENOME_SKETCH,
  PELAGION_MICRO_VARIANTS
} from "./pelagionGenome.js";
import {
  MNEMOPHORE_GENOME_SKETCH,
  MNEMOPHORE_RAW_VARIANTS
} from "./mnemophoreGenome.js";
import { SPHERE_GRID_GENOME_SKETCH } from "./sphereGridGenome.js";
import {
  compileKryloforGenome,
  KRYLOFOR_DEFAULTS,
  KRYLOFOR_GENOME_SKETCH
} from "./kryloforGenome.js";
import { topologyGenomeDefaults } from "./topologyGenomes.js";
import {
  decodeGridVertex,
  GRID_TOPOLOGY_PRESETS,
  resolveGridDimensions
} from "../lib/meshTopology.js";
import {
  PELAGION_MOTION_MODE,
  pelagionMotionState
} from "../lib/motionChoreography.js";
import { evaluateMemorySeed } from "../lib/memoryField.js";

const control = (key, label, min, max, step, options = {}) => ({
  key, label, min, max, step, ...options
});

const speed = control("speed", "Скорость", 0, 3, 0.05, { format: "speed" });
const depth = control("depth", "Глубина", 0, 2, 0.05, { format: "percent" });
const alpha = control("alpha", "Прозрачность", 10, 255, 1);
const points = (maximum = 40000) => control("pointCount", "Точки", 2000, maximum, 1000, { format: "count" });

function brancherPoint(index, time, settings, layers, target) {
  const y = index / 995;
  const k = (4 + Math.cos(y * settings.waveFrequency + time))
    * Math.cos(index / settings.radialDivisor);
  const e = y / 5 - 11;
  const d = Math.hypot(k, e) - settings.distanceOffset;
  const formCount = Math.max(1, Math.round(settings.forms));
  const branch = index % formCount;
  const phaseStep = settings.phaseStep * 3 / formCount;
  const branchPhase = layers.symmetry ? branch * phaseStep : 0;
  const c = d / 2 - time / 2 + branchPhase;
  const radialSize = settings.radius + k * k;
  const pulse = layers.pulse
    ? d * d * (settings.pulse / 3) * Math.sin(time * 3 - d)
    : 0;
  const ripple = layers.ripple ? 3 * Math.sin(k * 2) : 0;
  const feather = layers.feather
    ? y / settings.featherDivisor * k * (e + Math.sin(e * 4 - d * 4))
    : 0;

  target.x = radialSize * Math.cos(c) + 200;
  target.y = settings.height * Math.sin(c / 3) + 200 + pulse + ripple + feather;
  target.z = radialSize * Math.sin(c) * settings.depth;
  target.parameter = y;
  target.k = k;
  target.e = e;
  target.d = d;
  target.c = c;
  target.branch = branch;
  target.forms = formCount;
  return target;
}

function swimmerPoint(index, time, settings, layers, target) {
  const y = index / 254;
  const k = layers.spine
    ? settings.spineAmplitude * Math.cos(y * settings.spineFrequency)
    : 0;
  const e = y - settings.lengthOffset;
  const d = Math.hypot(k, e) / settings.distanceDivisor;
  const c = d / 3 - time;
  const radialSize = settings.radius + k * k + d * settings.radialGrowth;
  const ribs = layers.ribs ? settings.ribStrength / d * Math.sin(k * 2) : 0;
  const fin = layers.fin ? y / settings.bodyCoupling * k * e : 0;
  const tail = layers.tail
    ? d * settings.tailStrength * Math.sin(
      time * settings.tailFrequency - d * 2 + Math.sin(time) / 0.6 ** 3
    )
    : 0;

  target.x = radialSize * Math.sin(c) + 200;
  target.y = settings.height * Math.sin(c / 2) + ribs + fin + tail + 200;
  target.z = radialSize * Math.cos(c) * settings.depth;
  target.parameter = y;
  target.k = k;
  target.e = e;
  target.d = d;
  target.c = c;
  target.branch = 0;
  target.forms = 1;
  return target;
}

function pulsatorPoint(index, time, settings, layers, target) {
  const copyCount = Math.max(1, Math.round(settings.copies));
  const branch = index % copyCount;
  const m = layers.copies ? branch * settings.phaseStep : 0;
  const k = settings.seedAmplitude
    * Math.cos(index * settings.seedFrequency)
    * Math.sin(index);
  const e = settings.seedAmplitude
    * Math.cos(index * settings.eFrequencyA)
    * Math.cos(index * settings.eFrequencyB);
  const radialSeed = Math.hypot(k, e);
  const pulse = layers.pulse
    ? settings.pulse / 3 * Math.sin(time / 2 + m) ** 3
    : 0;
  const d = radialSeed ** settings.distancePower / settings.distanceScale
    + settings.distanceBase - pulse;
  const c = d / settings.phaseDivisor - time / settings.driftDivisor + m;
  const expansion = layers.nonlinear
    ? d ** Math.sin(d * d - time + m)
    : 1;
  const bodyX = layers.body ? k * expansion : 0;
  const bodyY = layers.body ? e * expansion : 0;

  target.x = settings.radius * Math.sin(c) + bodyX + 200;
  target.y = settings.radius * Math.sin(c * settings.harmonic) + bodyY + 200;
  target.z = settings.radius * Math.cos(c) * settings.depth;
  target.parameter = index / 500;
  target.k = k;
  target.e = e;
  target.d = d;
  target.c = c;
  target.branch = branch;
  target.forms = copyCount;
  return target;
}

const TAU = Math.PI * 2;

const TOPOLOGY_GRID = Object.freeze({
  columnsKey: "columns",
  rowsKey: "rows",
  topologyKey: "topology",
  defaultTopology: "sphere",
  topologies: GRID_TOPOLOGY_PRESETS
});

function topologyGridPoint(index, time, settings, layers, target) {
  const dimensions = resolveGridDimensions(TOPOLOGY_GRID, settings);
  const vertex = decodeGridVertex(TOPOLOGY_GRID, dimensions, index, target);
  const { columns, rows, topology } = dimensions;
  const scale = Number(settings.genomeA) || 1;
  const secondary = Number(settings.genomeB) || 1;
  const projection = (Number(settings.genomeProjection) || 0) / 100;
  const genomeTime = time * (Number(settings.genomeSpeed) || 1);
  const u = TAU * vertex.column / columns;
  const normalizedV = vertex.row / Math.max(1, rows - 1);
  let x;
  let y;
  let z;

  if (topology.id === "ichthyo") {
    const bodyV = Math.PI * vertex.row / (rows - 1);
    const radius = scale * Math.sin(bodyV);
    const angle = u - genomeTime / 99;
    const bend = secondary * bodyV * bodyV * Math.sin(genomeTime - bodyV);
    x = radius * Math.cos(angle) + bend;
    y = 99 * Math.cos(bodyV) - radius * Math.sin(angle) * projection;
    z = radius * Math.sin(angle);
  } else if (topology.id === "plane") {
    const planeU = vertex.column * 13 - 156;
    const planeV = vertex.row * 23 + 70;
    const wave = scale * Math.sin(planeU / secondary - genomeTime / 20);
    const angle = genomeTime / 99;
    x = planeU * Math.cos(angle) + wave * Math.sin(angle);
    y = planeV - wave * Math.cos(angle) * projection - 200;
    z = -planeU * Math.sin(angle) + wave * Math.cos(angle);
  } else if (topology.id === "cylinder") {
    const angle = u - genomeTime / 99;
    x = scale * Math.cos(angle);
    y = vertex.row * 18 - scale * Math.sin(angle) * projection - 130;
    z = scale * Math.sin(angle);
  } else if (topology.id === "sphere-torus") {
    const morphV = TAU * vertex.row / rows;
    const phase = genomeTime / 99;
    const radius = scale * (1 + Math.sin(phase) + Math.cos(morphV));
    const angle = u - phase;
    x = radius * Math.cos(angle);
    y = scale * Math.sin(morphV) - radius * Math.sin(angle) * projection;
    z = radius * Math.sin(angle);
  } else if (topology.id === "torus") {
    const torusV = TAU * vertex.row / rows;
    const radius = scale + secondary * Math.cos(torusV);
    const angle = u - genomeTime / 99;
    x = radius * Math.cos(angle);
    y = secondary * Math.sin(torusV) * 0.88 - radius * Math.sin(angle) * projection;
    z = radius * Math.sin(angle);
  } else if (topology.id === "mobius") {
    const strip = vertex.row * secondary - secondary * 7;
    const radius = scale + strip * Math.cos(u / 2);
    const angle = u - genomeTime / 99;
    x = radius * Math.cos(angle);
    y = strip * Math.sin(u / 2) * 0.88 - radius * Math.sin(angle) * projection;
    z = radius * Math.sin(angle);
  } else {
    const v = Math.PI * vertex.row / (rows - 1);
    const radius = scale * Math.sin(v);
    const angle = u - genomeTime / 99;
    x = radius * Math.cos(angle);
    y = scale * Math.cos(v) * 0.88 - radius * Math.sin(angle) * projection;
    z = radius * Math.sin(angle);
  }

  target.x = x + 200;
  target.y = y + 200;
  target.z = z;
  target.parameter = normalizedV;
  target.k = Math.sin(u);
  target.e = Math.cos(Math.PI * normalizedV);
  target.d = Math.hypot(x, y, z);
  target.c = u;
  target.branch = vertex.column;
  target.forms = columns;
  return target;
}

function pelagionSpine(parameter, time, settings, layers, interaction, target) {
  const u = Math.max(0, Math.min(1, parameter));
  const tail = u ** 1.65;
  pelagionMotionState(u, time, settings, target);
  const phase = TAU * (u * settings.swimWaves - target.travel);
  const profile = Math.max(0, Math.sin(Math.PI * u)) ** settings.taper;
  const field = layers.field
    ? settings.fieldStrength * Math.sin(
      u * settings.fieldScale + time * 0.7 + Math.sin(u * 13 - time * 0.45)
    )
    : 0;
  const stimulus = layers.response ? interaction?.strength || 0 : 0;
  const focus = Number.isFinite(interaction?.u) ? interaction.u : 0.5;
  const shock = stimulus * Math.exp(-28 * (u - focus) ** 2);
  const touchX = Number.isFinite(interaction?.x) ? interaction.x : 0;
  const touchY = Number.isFinite(interaction?.y) ? interaction.y : 0;

  target._centerX = 200
    + settings.length * (u - 0.5) * target.axialScale * (1 - shock * 0.12);
  target._centerY = 200
    + settings.swim * tail * target.effort * Math.sin(phase)
    + field * profile
    + touchY * settings.response * shock;
  target._centerZ = settings.swim * 0.42 * tail * target.effort * Math.cos(phase)
    + field * 0.5 * Math.cos(u * 9 + time)
    + touchX * settings.response * shock;
  target._profile = profile;
  target._field = field;
  target._phase = phase;
  target._shock = shock;
  return target;
}

function pelagionPoint(index, time, settings, layers, target, interaction) {
  const tentacleCount = Math.max(1, Math.round(settings.tentacles));
  const isTendril = layers.tendrils && index % 5 === 0;

  if (isTendril) {
    const tendrilIndex = Math.floor(index / 5);
    const branch = tendrilIndex % tentacleCount;
    const sample = Math.floor(tendrilIndex / tentacleCount);
    const sampleCount = Math.max(2, Math.ceil(settings.pointCount / 5 / tentacleCount));
    const q = Math.min(1, sample / (sampleCount - 1));
    const anchor = 0.76 + 0.035 * Math.cos(branch * 2.3);
    const branchPhase = TAU * branch / tentacleCount;
    pelagionSpine(anchor, time, settings, layers, interaction, target);

    const anchorRadius = settings.radius * target._profile;
    pelagionMotionState(Math.min(1, anchor + q * 0.24), time, settings, target);
    const choreographed = settings.motionMode === PELAGION_MOTION_MODE.livingStroke;
    const wave = target.travel * 2.1 - q * settings.tendrilFrequency + branchPhase;
    const followThrough = choreographed ? 0.62 + 0.68 * target.stroke : 1;
    const flare = 1 + (layers.response ? interaction?.strength || 0 : 0) * 0.9;
    target.x = target._centerX + q * settings.tendrilLength;
    target.y = target._centerY
      + anchorRadius * 0.54 * Math.cos(branchPhase)
      + settings.tendrilWave * q * Math.sin(wave) * followThrough * flare;
    target.z = target._centerZ
      + anchorRadius * 0.85 * Math.sin(branchPhase) * settings.depth
      + settings.tendrilWave * q * Math.cos(wave) * settings.depth
        * followThrough * flare;
    target.parameter = q;
    target.k = choreographed ? target.stroke * 2 - 1 : Math.sin(wave);
    target.e = target._profile;
    target.d = q * settings.tendrilLength;
    target.c = branchPhase + (choreographed ? target.localPhase : 0);
    target.branch = branch;
    target.forms = tentacleCount;
    return target;
  }

  const ringSamples = Math.max(8, Math.round(settings.ringSamples));
  const segmentCount = Math.max(2, Math.ceil(settings.pointCount / ringSamples));
  const u = Math.min(1, Math.floor(index / ringSamples) / (segmentCount - 1));
  const ring = index % ringSamples;
  const choreographed = settings.motionMode === PELAGION_MOTION_MODE.livingStroke;
  const theta = TAU * ring / ringSamples
    + settings.twist * u
    + 0.08 * Math.sin(choreographed ? time * settings.strokeFrequency - u * settings.followThrough : time + u * 9);
  pelagionSpine(u, time, settings, layers, interaction, target);

  const pulse = layers.body
    ? 1 + settings.pulse * (choreographed
      ? target.stroke * 2 - 1
      : Math.sin(time * settings.pulseFrequency - u * TAU * 1.7) ** 3)
    : 0.02;
  const radius = settings.radius * target._profile * pulse
    * target.volumeScale * (1 - target._shock * 0.28);
  const rib = 0.9 + 0.1 * Math.sin(
    theta * settings.ribs + u * TAU * 3 - time
  );
  const membrane = layers.membrane
    ? 1 + settings.membrane * target._profile
      * Math.abs(Math.sin(theta)) ** 6
      * (choreographed
        ? 0.68 + 0.44 * target.stroke
        : 0.78 + 0.22 * Math.sin(u * TAU * 2 - time))
      * (1 + target._shock)
    : 1;

  target.x = target._centerX
    + radius * 0.12 * Math.sin(theta * 2 + u * TAU - time);
  target.y = target._centerY + radius * 0.72 * Math.cos(theta) * rib;
  target.z = target._centerZ
    + radius * Math.sin(theta) * settings.depth * membrane;
  target.parameter = u;
  target.k = choreographed
    ? target.stroke * 2 - 1
    : target._field / Math.max(1, settings.fieldStrength);
  target.e = target._profile;
  target.d = radius;
  target.c = theta + (choreographed ? target.localPhase : 0);
  target.branch = ring;
  target.forms = ringSamples;
  return target;
}

function cycleDistance(first, second) {
  const distance = Math.abs(first - second) % 1;
  return Math.min(distance, 1 - distance);
}

function chronophorePoint(index, time, settings, layers, target, interaction) {
  const strandCount = Math.max(3, Math.round(settings.strands));
  const strand = index % strandCount;
  const sample = Math.floor(index / strandCount);
  const sampleCount = Math.max(2, Math.ceil(settings.pointCount / strandCount));
  const baseU = sample / (sampleCount - 1);
  const materialFlow = layers.flow ? time * settings.flow : 0;
  const u = (baseU + materialFlow) % 1;
  const windingP = Math.max(1, Math.round(settings.windingP));
  const windingQ = Math.max(1, Math.round(settings.windingQ));
  const pathAngle = TAU * windingP * u;
  const knotPhase = TAU * windingQ * u + time * settings.knotDrift;
  const fiberPhase = TAU * strand / strandCount
    + TAU * settings.fiberTwist * u
    + (layers.flow ? time * settings.fiberSpeed : 0);
  const breath = 1 + settings.pulse * Math.sin(
    time * settings.pulseFrequency - TAU * windingQ * u
  );
  const knotRadius = layers.knot ? settings.knotRadius * breath : 0;
  const fiberRadius = layers.fibers ? settings.tubeRadius : 0;

  let radial = settings.radius
    + knotRadius * Math.cos(knotPhase)
    + fiberRadius * Math.cos(fiberPhase);
  let localZ = knotRadius * Math.sin(knotPhase)
    + fiberRadius * Math.sin(fiberPhase);

  const stimulus = Number(interaction?.strength) || 0;
  const age = Number(interaction?.age) || 0;
  const focus = Number.isFinite(interaction?.u) ? interaction.u : 0.5;
  const waveOffset = age * settings.echoSpeed;
  const echoA = Math.exp(
    -settings.echoSharpness * cycleDistance(u, focus + waveOffset) ** 2
  );
  const echoB = Math.exp(
    -settings.echoSharpness * cycleDistance(u, focus - waveOffset) ** 2
  );
  const echo = layers.echo ? Math.min(1.4, stimulus * (echoA + echoB)) : 0;

  radial += settings.response * echo * (0.4 + 0.6 * Math.cos(knotPhase));
  localZ += settings.response * 0.62 * echo * Math.sin(fiberPhase + knotPhase);

  const divisionProgress = Math.max(0, Math.min(1, (age - 0.9) / 3.8));
  const divisionEnvelope = Math.sin(Math.PI * divisionProgress) ** 2;
  const meetingPoint = (focus + 0.5) % 1;
  const meeting = layers.division
    ? stimulus * divisionEnvelope * Math.exp(
      -settings.divisionSharpness * cycleDistance(u, meetingPoint) ** 2
    )
    : 0;
  radial += settings.budSize * 0.2 * meeting;
  localZ += settings.budSize * 0.18 * meeting * Math.sin(fiberPhase);

  let x = radial * Math.cos(pathAngle);
  let y = radial * Math.sin(pathAngle);
  let z = localZ;
  const divisionState = layers.division ? stimulus * divisionEnvelope : 0;
  if (divisionState > 0) {
    if (strand % 2) {
      const childMix = Math.min(1, divisionState * 2.6);
      const childPhase = TAU * u + time * 0.4;
      const childRadius = settings.radius * 0.42
        + fiberRadius * 0.6 * Math.cos(fiberPhase);
      const childX = childRadius * Math.cos(childPhase)
        + settings.budSize * 2.05;
      const childY = childRadius * Math.sin(childPhase)
        - settings.budSize * 0.18;
      const childZ = (settings.knotRadius * 0.22 + fiberRadius * 0.4)
        * Math.sin(fiberPhase + childPhase);
      x += (childX - x) * childMix;
      y += (childY - y) * childMix;
      z += (childZ - z) * childMix;
    } else {
      x -= settings.budSize * 0.16 * divisionState;
    }
  }
  const swarmEnvelope = layers.swarm
    ? stimulus ** 3 * Math.sin(Math.min(1, age / 0.35) * Math.PI / 2)
    : 0;
  if (swarmEnvelope > 0) {
    const locality = 0.32 + 0.68 * Math.exp(
      -24 * cycleDistance(u, focus) ** 2
    );
    const scatter = settings.swarmSize * swarmEnvelope * locality;
    x += scatter * Math.sin(index * 12.9898 + age * 5.1);
    y += scatter * Math.sin(index * 78.233 - age * 3.7);
    z += scatter * Math.cos(index * 37.719 + age * 4.3);
  }

  const cosTilt = Math.cos(settings.tilt);
  const sinTilt = Math.sin(settings.tilt);
  const tiltedY = y * cosTilt - z * sinTilt;
  const tiltedZ = y * sinTilt + z * cosTilt;

  target.x = x + 200;
  target.y = tiltedY + 200;
  target.z = tiltedZ * settings.depth;
  target.parameter = u;
  target.k = Math.sin(knotPhase);
  target.e = echo + divisionState;
  target.d = tiltedZ;
  target.c = knotPhase + fiberPhase + (strand % 2 ? divisionState * Math.PI : 0);
  target.branch = strand;
  target.forms = strandCount;
  return target;
}

function blastophorePoint(index, time, settings, layers, target) {
  const u = index / (settings.pointCount / 5);
  const angle = index % 40 / 6;
  const budding = Math.sin(time * settings.cycle / 2) ** 2;
  const bud = Math.exp(-settings.budSharpness * (u - settings.budCenter) ** 2);
  const neck = Math.exp(-settings.neckSharpness * (u - settings.neckCenter) ** 2);
  const profile = Math.max(0, Math.sin(Math.PI * u / 5)) ** 0.6;
  const radius = settings.radius * profile
    * (1 + budding * bud * settings.budGrowth)
    * (1 - budding * neck * settings.neckClosure);

  target.x = (u - 2.5) * settings.length / 5
    + settings.budOffset * budding * bud + 200;
  target.y = radius * Math.cos(angle) + 200;
  target.z = radius * Math.sin(angle) * settings.depth;
  target.k = budding * bud;
  target.e = neck;
  target.d = budding;
  target.c = angle;
  target.branch = index % 40;
  target.forms = 40;
  target.angle = angle;
  target.mix = budding;
}

function kryloforPoint(index, time, settings, layers, target) {
  const pointCount = Math.max(5000, Math.round(settings.pointCount / 5000) * 5000);
  const u = index / (pointCount / 5);
  const v = (index % 99 / 49 - 1) ** 3;
  const profile = Math.sin(u / 1.6);
  const wave = Math.sin(settings.waveSpeed * time - u * settings.waveCount);
  const signalPhase = settings.signalSpeed * time - u * settings.signalCount;
  const signal = Math.sin(signalPhase) ** 12;

  target.x = (u - 2) * settings.length + 200;
  target.y = v * profile * (settings.bodyWidth + settings.wingWidth * profile)
    * (1 + wave / settings.pulseDivisor) + u * u * wave + 200;
  target.z = profile * settings.depth * (
    15 * Math.sin(3 * v) + settings.fold * wave * (1 - v * v)
  );
  target.parameter = u;
  target.k = wave;
  target.e = v;
  target.d = profile;
  target.c = signalPhase;
  target.branch = v < 0 ? 0 : 1;
  target.forms = 2;
  target.mix = signal;
  return target;
}

export const spatialForms = Object.freeze([
  {
    id: "brancher",
    sketchNumber: 5,
    shortLabel: "Ветви",
    title: "Ветвящийся организм",
    association: "веер · плавник · колония",
    description: "Фазовые ветви раскрываются вокруг скрытой окружности. Пульсация и волокна продолжают жить независимо от положения камеры.",
    sketch: sketches[4],
    timeStep: Math.PI / 60,
    defaults: {
      speed: 1, forms: 3, radius: 79, height: 99, depth: 1,
      waveFrequency: 31, pulse: 3, pointCount: 20000, alpha: 96,
      phaseStep: 8, radialDivisor: 99, distanceOffset: 6,
      featherDivisor: 13, backgroundColor: "#090909"
    },
    primaryControls: [
      speed,
      control("forms", "Формы", 1, 8, 1),
      control("radius", "Размер", 30, 140, 1),
      control("height", "Высота", 30, 170, 1),
      control("depth", "Глубина", 0.5, 1.6, 0.1, { format: "percent" }),
      control("waveFrequency", "Волны", 5, 60, 1),
      control("pulse", "Пульсация", 0, 8, 0.1, { digits: 1 }),
      points(),
      alpha
    ],
    advancedControls: [
      control("phaseStep", "Фазовый шаг", 0, 16, 0.1, { digits: 1 }),
      control("radialDivisor", "Плотность рёбер", 35, 200, 1),
      control("distanceOffset", "Радиальное смещение", 0, 12, 0.1, { digits: 1 }),
      control("featherDivisor", "Длина волокон", 5, 30, 1)
    ],
    layers: [
      { key: "symmetry", label: "Симметрия", default: true },
      { key: "pulse", label: "Пульсация", default: true },
      { key: "ripple", label: "Рябь", default: true },
      { key: "feather", label: "Волокна", default: true }
    ],
    randomRanges: {
      speed: [0.25, 2.5, 0.05], forms: [2, 7, 1], radius: [48, 120, 1],
      height: [60, 145, 1], depth: [0.5, 1.6, 0.05], waveFrequency: [12, 55, 1],
      pulse: [0.5, 6, 0.1], pointCount: [12000, 32000, 1000], alpha: [50, 170, 1],
      phaseStep: [4, 13, 0.1], radialDivisor: [55, 165, 1],
      distanceOffset: [3, 10, 0.1], featherDivisor: [8, 24, 1]
    },
    evaluate: brancherPoint
  },
  {
    id: "swimmer",
    sketchNumber: 1,
    shortLabel: "Пловец",
    title: "Пловец",
    association: "рыба · угорь · морской дракон",
    description: "Бегущая фаза проходит вдоль позвоночника и усиливается к хвосту. Сопряжённый косинус проявляет объём длинного тела.",
    sketch: sketches[0],
    timeStep: Math.PI / 240,
    defaults: {
      speed: 1, radius: 79, height: 89, depth: 1,
      spineAmplitude: 5, spineFrequency: 9, lengthOffset: 35,
      distanceDivisor: 2.5, radialGrowth: 4, ribStrength: 7,
      bodyCoupling: 44, tailStrength: 3, tailFrequency: 9,
      pointCount: 10000, alpha: 66, backgroundColor: "#090909"
    },
    primaryControls: [
      speed,
      control("radius", "Размер", 30, 150, 1),
      control("height", "Высота", 30, 160, 1),
      depth,
      control("spineAmplitude", "Ширина тела", 0, 12, 0.1, { digits: 1 }),
      control("spineFrequency", "Позвонки", 2, 18, 0.25, { digits: 2 }),
      control("tailStrength", "Сила хвоста", 0, 8, 0.1, { digits: 1 }),
      points(25000),
      alpha
    ],
    advancedControls: [
      control("lengthOffset", "Продольный центр", 20, 50, 0.5, { digits: 1 }),
      control("distanceDivisor", "Масштаб длины", 1, 5, 0.1, { digits: 1 }),
      control("radialGrowth", "Раскрытие тела", 0, 10, 0.1, { digits: 1 }),
      control("ribStrength", "Выраженность рёбер", 0, 16, 0.1, { digits: 1 }),
      control("bodyCoupling", "Плавниковая складка", 15, 90, 1),
      control("tailFrequency", "Частота хвоста", 1, 16, 0.25, { digits: 2 })
    ],
    layers: [
      { key: "spine", label: "Позвоночник", default: true },
      { key: "ribs", label: "Рёбра", default: true },
      { key: "fin", label: "Плавник", default: true },
      { key: "tail", label: "Хвост", default: true }
    ],
    randomRanges: {
      speed: [0.35, 2.3, 0.05], radius: [55, 115, 1], height: [60, 125, 1],
      depth: [0.55, 1.5, 0.05], spineAmplitude: [2.5, 9, 0.1],
      spineFrequency: [5, 14, 0.25], tailStrength: [1, 6, 0.1],
      pointCount: [7000, 18000, 1000], alpha: [45, 150, 1],
      lengthOffset: [27, 43, 0.5], distanceDivisor: [1.8, 3.6, 0.1],
      radialGrowth: [2, 7, 0.1], ribStrength: [2, 12, 0.1],
      bodyCoupling: [28, 68, 1], tailFrequency: [5, 13, 0.25]
    },
    evaluate: swimmerPoint
  },
  {
    id: "pulsator",
    sketchNumber: 6,
    shortLabel: "Пульсатор",
    title: "Пульсатор",
    association: "медуза · манта · крылатое тело",
    description: "Шестнадцать фазовых слоёв сжимаются и раскрываются как единое тело. Скрытая окружность превращает пульс в пространственный гребок.",
    sketch: sketches[5],
    timeStep: Math.PI / 20,
    defaults: {
      speed: 1, copies: 16, radius: 99, depth: 1,
      seedAmplitude: 9, seedFrequency: 5, eFrequencyA: 3, eFrequencyB: 2,
      pulse: 1, harmonic: 4, phaseStep: 13, distancePower: 3,
      distanceScale: 1999, distanceBase: 1.5, phaseDivisor: 16,
      driftDivisor: 48, pointCount: 10000, alpha: 96,
      backgroundColor: "#090909"
    },
    primaryControls: [
      speed,
      control("copies", "Фазовые слои", 1, 24, 1),
      control("radius", "Размер", 30, 150, 1),
      depth,
      control("seedAmplitude", "Размах тела", 2, 16, 0.1, { digits: 1 }),
      control("pulse", "Пульс", 0, 3, 0.05, { digits: 2 }),
      control("harmonic", "Гармоника", 1, 8, 1),
      points(25000),
      alpha
    ],
    advancedControls: [
      control("phaseStep", "Фазовый шаг", 0, 16, 0.1, { digits: 1 }),
      control("distancePower", "Степень расстояния", 1, 5, 0.1, { digits: 1 }),
      control("distanceScale", "Масштаб расстояния", 500, 5000, 50),
      control("distanceBase", "Базовое раскрытие", 0.2, 3, 0.05, { digits: 2 }),
      control("phaseDivisor", "Фазовый радиус", 4, 40, 0.5, { digits: 1 }),
      control("driftDivisor", "Дрейф", 12, 120, 1),
      control("seedFrequency", "Частота крыла", 1, 9, 0.25, { digits: 2 }),
      control("eFrequencyA", "Вертикальная частота A", 1, 7, 0.25, { digits: 2 }),
      control("eFrequencyB", "Вертикальная частота B", 1, 7, 0.25, { digits: 2 })
    ],
    layers: [
      { key: "copies", label: "Фазовые слои", default: true },
      { key: "pulse", label: "Пульсация", default: true },
      { key: "nonlinear", label: "Расширение", default: true },
      { key: "body", label: "Мягкое тело", default: true }
    ],
    randomRanges: {
      speed: [0.35, 2.1, 0.05], copies: [8, 22, 1], radius: [70, 125, 1],
      depth: [0.55, 1.55, 0.05], seedAmplitude: [5, 13, 0.1],
      pulse: [0.35, 2.2, 0.05], harmonic: [2, 7, 1],
      pointCount: [7000, 18000, 1000], alpha: [55, 160, 1],
      phaseStep: [7, 15, 0.1], distancePower: [2.2, 4.1, 0.1],
      distanceScale: [1200, 3400, 50], distanceBase: [0.8, 2.2, 0.05],
      phaseDivisor: [9, 25, 0.5], driftDivisor: [30, 80, 1],
      seedFrequency: [3, 7, 0.25], eFrequencyA: [2, 5, 0.25],
      eFrequencyB: [1, 4, 0.25]
    },
    evaluate: pulsatorPoint
  },
  {
    id: "sphere-grid",
    displayNumber: "M0",
    sketchNumber: null,
    shortLabel: "RAW-топологии",
    title: "Атлас 280-геномов",
    association: "7 исполняемых геномов · каждый ≤ 280",
    description: "Пять топологических классов, органический Ихтиоморф и единый переход сфера↔тор существуют как самостоятельные p5.js-геномы. Лаборатория выбирает формулу и меняет её короткие константы прямо в исполняемом коде.",
    origin: "mesh-study",
    genomeSketch: SPHERE_GRID_GENOME_SKETCH,
    meshGenome: true,
    mesh: TOPOLOGY_GRID,
    timeStep: 1,
    defaults: {
      ...topologyGenomeDefaults("sphere"),
      speed: 1, lineWidth: 0.72, renderMode: "wireframe",
      backgroundColor: "#090909"
    },
    primaryControls: [],
    advancedControls: [],
    layers: [],
    randomRanges: {},
    evaluate: topologyGridPoint
  },
  {
    id: "pelagion",
    displayNumber: "P1",
    sketchNumber: null,
    shortLabel: "Пелагион",
    title: "Пелагион",
    association: "цельная оболочка · мембрана · живой гребок",
    description: "Пелагический организм с непрерывным вытянутым телом: одна формула ведёт оболочку от головы к хвосту, а единая волна сжимает и раскрывает весь объём.",
    origin: "community-synthesis",
    genomeSketch: PELAGION_LIVING_GENOME_SKETCH,
    rawVariants: PELAGION_MICRO_VARIANTS,
    budgetVariants: PELAGION_EVOLUTION_VARIANTS,
    budgetVariantsByMode: PELAGION_BUDGET_VARIANTS_BY_MODE,
    motionModes: Object.freeze([
      Object.freeze({
        id: PELAGION_MOTION_MODE.continuous,
        label: "Плавное скольжение",
        description: "Цельная оболочка мягко дышит, а её вытянутый край следует общей волне."
      }),
      Object.freeze({
        id: PELAGION_MOTION_MODE.livingStroke,
        label: "Силовой гребок",
        description: "Единая фаза проходит через весь объём, не разрывая оболочку на отдельные части."
      })
    ]),
    savedColor: Object.freeze({
      mode: "formula",
      preset: "stroke",
      expression: "smoothstep(-0.6, 0.72, k + 0.16 * sin(c))",
      colorA: "#58ffe7",
      colorB: "#d7ff58"
    }),
    supportsStimulus: true,
    stimulusMessage: "Пелагион сжался и раскрыл мембрану в ответ на возмущение.",
    trailLayer: "memory",
    timeStep: 0.012,
    defaults: {
      speed: 1, motionMode: PELAGION_MOTION_MODE.livingStroke,
      strokeFrequency: 4.4, strokeAccent: 0.78, followThrough: 3.4,
      length: 245, radius: 58, depth: 1,
      swim: 31, swimWaves: 1.35, taper: 0.68,
      pulse: 0.14, pulseFrequency: 2.1,
      membrane: 1.35, twist: 5.5, ribs: 5, ringSamples: 34,
      fieldStrength: 10, fieldScale: 17,
      tentacles: 6, tendrilLength: 122, tendrilWave: 24,
      tendrilFrequency: 8, response: 54, memory: 0.84,
      pointCount: 14000, alpha: 82, backgroundColor: "#05090c"
    },
    primaryControls: [
      speed,
      control("length", "Длина", 140, 310, 1),
      control("radius", "Объём тела", 25, 90, 1),
      depth,
      control("swim", "Сила движения", 0, 65, 1),
      control("membrane", "Раскрытие мембраны", 0, 2.8, 0.05, { digits: 2 }),
      control("response", "Реакция на касание", 0, 100, 1),
      control("memory", "Память следа", 0, 0.96, 0.02, { format: "percent" }),
      points(24000),
      alpha
    ],
    advancedControls: [
      control("swimWaves", "Волн вдоль тела", 0.4, 3, 0.05, { digits: 2 }),
      control("strokeFrequency", "Темп гребка", 1.5, 8, 0.1, { digits: 1 }),
      control("strokeAccent", "Акцент гребка", 0, 0.95, 0.01, { format: "percent" }),
      control("followThrough", "Запаздывание хвоста", 0, 6.2, 0.1, { digits: 1 }),
      control("taper", "Профиль корпуса", 0.35, 1.8, 0.05, { digits: 2 }),
      control("pulse", "Дыхание", 0, 0.4, 0.01, { digits: 2 }),
      control("pulseFrequency", "Ритм дыхания", 0.5, 5, 0.1, { digits: 1 }),
      control("fieldStrength", "Сила течения", 0, 30, 0.5, { digits: 1 }),
      control("fieldScale", "Частота течения", 4, 30, 0.5, { digits: 1 }),
      control("twist", "Скручивание", 0, 12, 0.1, { digits: 1 }),
      control("ribs", "Рёбра мембраны", 2, 12, 1),
      control("ringSamples", "Сечение поверхности", 16, 56, 2),
      control("tentacles", "Хвостовые нити", 2, 12, 1),
      control("tendrilLength", "Длина нитей", 30, 190, 2),
      control("tendrilWave", "Размах нитей", 0, 55, 1),
      control("tendrilFrequency", "Волны нитей", 2, 16, 0.5, { digits: 1 })
    ],
    layers: [
      { key: "body", label: "Тело", default: true },
      { key: "membrane", label: "Мембрана", default: true },
      { key: "field", label: "Течение", default: true },
      { key: "tendrils", label: "Хвостовые нити", default: true },
      { key: "response", label: "Отклик", default: true },
      { key: "memory", label: "Память света", default: true }
    ],
    randomRanges: {
      speed: [0.45, 1.8, 0.05], strokeFrequency: [2.6, 6.2, 0.1],
      strokeAccent: [0.45, 0.9, 0.01], followThrough: [1.8, 5.4, 0.1],
      length: [180, 285, 1], radius: [38, 78, 1],
      depth: [0.6, 1.55, 0.05], swim: [12, 54, 1], swimWaves: [0.75, 2.35, 0.05],
      taper: [0.45, 1.2, 0.05], pulse: [0.04, 0.3, 0.01],
      pulseFrequency: [1.1, 3.7, 0.1], membrane: [0.45, 2.4, 0.05],
      twist: [2.5, 9.5, 0.1], ribs: [3, 9, 1], ringSamples: [24, 46, 2],
      fieldStrength: [3, 24, 0.5], fieldScale: [8, 25, 0.5],
      tentacles: [4, 10, 1], tendrilLength: [70, 165, 2],
      tendrilWave: [10, 42, 1], tendrilFrequency: [4, 13, 0.5],
      response: [28, 88, 1], memory: [0.58, 0.94, 0.02],
      pointCount: [10000, 20000, 1000], alpha: [55, 130, 1]
    },
    evaluate: pelagionPoint
  },
  {
    id: "chronophore",
    displayNumber: "P2",
    sketchNumber: null,
    shortLabel: "Хронофор",
    title: "Хронофор",
    association: "фазовый узел · вихрь · колония · память",
    description: "Сущность существует не как постоянное вещество, а как сохраняющийся фазовый узел. Точки текут сквозь него; отдельная команда возмущения разрывает фазу, запускает встречные волны, временное деление и последующую сборку.",
    origin: "form-field-synthesis",
    imprintKind: "chronophore",
    genomeSketch: CHRONOPHORE_GENOME_SKETCH,
    supportsStimulus: true,
    stimulusMessage: "Фаза разорвана: две волны расходятся по Хронофору и готовят временное деление.",
    responseFrames: 300,
    trailLayer: "memory",
    timeStep: 0.012,
    defaults: {
      speed: 1, windingP: 2, windingQ: 3,
      radius: 88, knotRadius: 31, tubeRadius: 7, strands: 12,
      depth: 1, tilt: 0.68,
      flow: 0.035, knotDrift: 0.9, fiberTwist: 3, fiberSpeed: 1.7,
      pulse: 0.15, pulseFrequency: 2.2,
      echoSpeed: 0.22, echoSharpness: 420, response: 38,
      budSize: 58, divisionSharpness: 72, swarmSize: 34,
      memory: 0.72, pointCount: 18000, alpha: 88,
      backgroundColor: "#05070c"
    },
    primaryControls: [
      speed,
      control("windingP", "Обороты p", 1, 5, 1),
      control("windingQ", "Переплетения q", 1, 8, 1),
      control("radius", "Радиус узла", 45, 125, 1),
      depth,
      control("flow", "Поток вещества", 0, 0.12, 0.005, { digits: 3 }),
      control("response", "Сила фазового эха", 0, 80, 1),
      control("memory", "Память следа", 0, 0.96, 0.02, { format: "percent" }),
      points(30000),
      alpha
    ],
    advancedControls: [
      control("knotRadius", "Глубина переплетения", 8, 58, 1),
      control("tubeRadius", "Толщина нитей", 0, 18, 0.5, { digits: 1 }),
      control("strands", "Число нитей", 3, 24, 1),
      control("tilt", "Наклон узла", 0, 1.5, 0.02, { digits: 2 }),
      control("knotDrift", "Дрейф фазы", 0, 2.5, 0.05, { digits: 2 }),
      control("fiberTwist", "Скручивание нитей", 0, 9, 0.25, { digits: 2 }),
      control("fiberSpeed", "Скорость нитей", 0, 4, 0.1, { digits: 1 }),
      control("pulse", "Дыхание", 0, 0.42, 0.01, { digits: 2 }),
      control("pulseFrequency", "Ритм дыхания", 0.4, 5, 0.1, { digits: 1 }),
      control("echoSpeed", "Скорость эха", 0.08, 0.38, 0.01, { digits: 2 }),
      control("echoSharpness", "Фронт эха", 120, 900, 10),
      control("budSize", "Размер дочернего кольца", 0, 95, 1),
      control("divisionSharpness", "Локальность деления", 24, 160, 2),
      control("swarmSize", "Разлёт роя", 0, 70, 1)
    ],
    layers: [
      { key: "knot", label: "Фазовый узел", default: true },
      { key: "fibers", label: "Нити вещества", default: true },
      { key: "flow", label: "Внутренний поток", default: true },
      { key: "echo", label: "Встречные волны", default: true },
      { key: "division", label: "Дочернее кольцо", default: true },
      { key: "swarm", label: "Распад в рой", default: true },
      { key: "memory", label: "Память света", default: true }
    ],
    randomRanges: {
      speed: [0.45, 1.8, 0.05], windingP: [1, 5, 1], windingQ: [2, 8, 1],
      radius: [62, 112, 1], knotRadius: [18, 48, 1], tubeRadius: [3, 14, 0.5],
      strands: [6, 20, 1], depth: [0.6, 1.55, 0.05], tilt: [0.25, 1.2, 0.02],
      flow: [0.015, 0.09, 0.005], knotDrift: [0.35, 1.8, 0.05],
      fiberTwist: [1, 7, 0.25], fiberSpeed: [0.6, 3.2, 0.1],
      pulse: [0.04, 0.32, 0.01], pulseFrequency: [1, 4, 0.1],
      echoSpeed: [0.14, 0.32, 0.01], echoSharpness: [220, 720, 10],
      response: [18, 66, 1], budSize: [32, 82, 1],
      divisionSharpness: [42, 130, 2], swarmSize: [16, 56, 1],
      memory: [0.62, 0.94, 0.02], pointCount: [12000, 26000, 1000],
      alpha: [55, 135, 1]
    },
    evaluate: chronophorePoint
  },
  {
    id: "mnemophore",
    displayNumber: "P3",
    sketchNumber: null,
    shortLabel: "Мнемофора",
    title: "Мнемофора",
    association: "состояние · купол · ядро · шлейф",
    description: "Первая сущность лаборатории, чьи координаты переживают кадр. Точки догоняют общий пульсирующий купол, сохраняя в запаздывании его траекторию и десять длинных лент.",
    origin: "form-field-synthesis",
    genomeSketch: MNEMOPHORE_GENOME_SKETCH,
    budgetVariants: MNEMOPHORE_RAW_VARIANTS,
    memoryModel: true,
    memoryModes: Object.freeze([
      Object.freeze({
        id: "parametric",
        label: "Без памяти",
        description: "Каждый кадр заново вычисляет ту же дышащую оболочку: прошлое положение точки не используется."
      }),
      Object.freeze({
        id: "stateful",
        label: "С памятью",
        description: "Координаты сохраняются между кадрами и плавно догоняют движущуюся цель, превращая запаздывание в память тела."
      })
    ]),
    savedColor: Object.freeze({
      mode: "formula",
      preset: "memory-age",
      expression: "clamp(0.08 + 0.78 * e + 0.72 * k, 0, 1)",
      colorA: "#8ea1ff",
      colorB: "#d7ff58"
    }),
    trailLayer: "memory",
    timeStep: 0.018,
    defaults: {
      speed: 1, memoryMode: "stateful",
      radius: 82, depth: 1, seedThickness: 0.12,
      flowStrength: 0.82, fieldFrequency: 6.2,
      cohesion: 0.9, twist: 0.72, lifespan: 190,
      memory: 0.86, pointCount: 9000, alpha: 92,
      backgroundColor: "#070810"
    },
    primaryControls: [
      speed,
      control("radius", "Радиус рождения", 42, 125, 1),
      depth,
      control("flowStrength", "Сила поля", 0, 1.8, 0.02, { digits: 2 }),
      control("fieldFrequency", "Сложность поля", 1, 12, 0.1, { digits: 1 }),
      control("cohesion", "Сборка оболочки", 0, 2.2, 0.05, { digits: 2 }),
      control("lifespan", "Время жизни", 60, 480, 5),
      control("memory", "Память следа", 0, 0.97, 0.01, { format: "percent" }),
      points(18000),
      alpha
    ],
    advancedControls: [
      control("twist", "Вихревое вращение", -2, 2, 0.05, { digits: 2 }),
      control("seedThickness", "Толщина рождения", 0, 0.42, 0.01, { format: "percent" })
    ],
    layers: [
      { key: "flow", label: "Рекуррентное поле", default: true },
      { key: "cohesion", label: "Возврат к оболочке", default: true },
      { key: "renewal", label: "Смена поколений", default: true },
      { key: "memory", label: "Память света", default: true }
    ],
    randomRanges: {
      speed: [0.45, 1.7, 0.05], radius: [58, 108, 1], depth: [0.55, 1.55, 0.05],
      seedThickness: [0.04, 0.3, 0.01], flowStrength: [0.35, 1.45, 0.02],
      fieldFrequency: [3.2, 10.5, 0.1], cohesion: [0.35, 1.8, 0.05],
      twist: [-1.5, 1.5, 0.05], lifespan: [90, 360, 5],
      memory: [0.62, 0.94, 0.01], pointCount: [6000, 15000, 1000], alpha: [55, 135, 1]
    },
    evaluate: evaluateMemorySeed
  },
  {
    id: "blastophore",
    displayNumber: "P4",
    sketchNumber: null,
    shortLabel: "Бластофор",
    title: "Бластофор",
    association: "онтогенез · почкование · перетяжка · сборка",
    description: "Организм существует как жизненный цикл: цельная оболочка выращивает почку, формирует шейку-сингулярность, временно читается как два тела и возвращается к зародышу.",
    origin: "form-field-synthesis",
    genomeSketch: BLASTOPHORE_GENOME_SKETCH,
    budgetVariants: BLASTOPHORE_RAW_VARIANTS,
    savedColor: Object.freeze({
      mode: "formula",
      preset: "membrane",
      expression: "clamp(0.12 + 0.82 * k + 0.28 * sin(c), 0, 1)",
      colorA: "#78dcff",
      colorB: "#fff050"
    }),
    timeStep: 0.02,
    defaults: {
      speed: 1, cycle: 1, length: 275, radius: 60, depth: 1,
      budCenter: 4, budSharpness: 1, budGrowth: 1,
      budOffset: 70, neckCenter: 3.2, neckSharpness: 9, neckClosure: 1,
      pointCount: 10000, alpha: 100, backgroundColor: "#090909"
    },
    primaryControls: [
      speed,
      control("cycle", "Темп развития", 0.35, 2.2, 0.05, { digits: 2 }),
      control("length", "Длина зародыша", 190, 340, 1),
      control("radius", "Объём оболочки", 35, 90, 1),
      depth,
      control("budOffset", "Отделение почки", 20, 125, 1),
      control("neckClosure", "Сжатие шейки", 0.2, 1, 0.02, { format: "percent" }),
      points(18000),
      alpha
    ],
    advancedControls: [
      control("budCenter", "Положение почки", 3.3, 4.6, 0.05, { digits: 2 }),
      control("budSharpness", "Локальность роста", 0.45, 2.4, 0.05, { digits: 2 }),
      control("budGrowth", "Рост почки", 0.25, 1.8, 0.05, { digits: 2 }),
      control("neckCenter", "Положение шейки", 2.7, 3.8, 0.05, { digits: 2 }),
      control("neckSharpness", "Резкость перетяжки", 3, 18, 0.5, { digits: 1 })
    ],
    layers: [
      { key: "shell", label: "Цельная оболочка", default: true },
      { key: "bud", label: "Дочерняя почка", default: true },
      { key: "neck", label: "Шейка-сингулярность", default: true },
      { key: "nuclei", label: "Два ядра", default: true },
      { key: "tissue", label: "Тканевая сетка", default: true },
      { key: "signal", label: "Морфогенетический фронт", default: true }
    ],
    randomRanges: {
      speed: [0.55, 1.55, 0.05], cycle: [0.55, 1.6, 0.05],
      length: [220, 315, 1], radius: [44, 78, 1], depth: [0.6, 1.5, 0.05],
      budCenter: [3.55, 4.35, 0.05], budSharpness: [0.65, 1.8, 0.05],
      budGrowth: [0.55, 1.5, 0.05], budOffset: [42, 105, 1],
      neckCenter: [2.9, 3.55, 0.05], neckSharpness: [5, 15, 0.5],
      neckClosure: [0.65, 1, 0.02], pointCount: [8000, 16000, 1000], alpha: [65, 130, 1]
    },
    evaluate: blastophorePoint
  },
  {
    id: "krylofor",
    displayNumber: "P5",
    sketchNumber: null,
    shortLabel: "Крылофор",
    title: "Крылофор",
    association: "мембрана · два крыла · хвост · импульс",
    description: "Единая точечная мембрана сгущается в центральный шов, раскрывается двумя крыльями и сходит в хвост. Геометрическая волна и узкий цветовой импульс бегут вдоль одного параметра.",
    origin: "form-field-synthesis",
    genomeSketch: KRYLOFOR_GENOME_SKETCH,
    compileGenome: compileKryloforGenome,
    savedColor: Object.freeze({
      mode: "formula",
      preset: "custom",
      expression: "sin(7 * t - 3 * y) ^ 12",
      colorA: "#50a0ff",
      colorB: "#ff50ff"
    }),
    timeStep: 0.02,
    defaults: KRYLOFOR_DEFAULTS,
    primaryControls: [
      control("genomeSpeed", "Темп", 1, 5, 1, { format: "integerSpeed" }),
      control("length", "Длина тела", 35, 65, 1),
      control("bodyWidth", "Центральный шов", 18, 45, 1),
      control("wingWidth", "Размах крыльев", 55, 95, 1),
      depth,
      control("fold", "Изгиб мембраны", 8, 32, 1),
      control("signalSpeed", "Скорость импульса", 3, 9, 1),
      control("pointCount", "Точки", 5000, 20000, 5000, { format: "count" }),
      control("alpha", "Прозрачность", 30, 99, 1)
    ],
    advancedControls: [
      control("pulseDivisor", "Податливость крыла", 6, 14, 1),
      control("waveSpeed", "Темп волны", 2, 8, 1),
      control("waveCount", "Волн вдоль тела", 1, 5, 1),
      control("signalCount", "Длина импульса", 1, 6, 1)
    ],
    layers: [],
    randomRanges: {
      genomeSpeed: [1, 5, 1], length: [40, 62, 1], bodyWidth: [20, 42, 1],
      wingWidth: [60, 94, 1], depth: [0.6, 1.5, 0.1], fold: [10, 30, 1],
      signalSpeed: [4, 9, 1], pointCount: [5000, 20000, 5000], alpha: [45, 96, 1],
      pulseDivisor: [6, 14, 1], waveSpeed: [2, 8, 1], waveCount: [1, 5, 1],
      signalCount: [1, 6, 1]
    },
    evaluate: kryloforPoint
  }
]);

export function spatialFormById(id) {
  return spatialForms.find(form => form.id === id) || spatialForms[0];
}

export function spatialLayerDefaults(form) {
  return Object.fromEntries(form.layers.map(layer => [layer.key, layer.default]));
}
