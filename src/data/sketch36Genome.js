import { sketches } from "./sketches.js";

export const SKETCH_36_ID = "1588062547315679232";
export const SKETCH_36_LIMIT = 280;

export const sketch36Original = sketches.find(sketch => sketch.id === SKETCH_36_ID);

export const sketch36Stages = Object.freeze([
  {
    id: "seed",
    index: "01",
    label: "Семя",
    hint: "random3D",
    description: "Сферическое распределение до деформации: виден материал, из которого поле собирает организм."
  },
  {
    id: "memory",
    index: "02",
    label: "Память",
    hint: "+ field",
    description: "Точки сохраняют состояние и плывут в непрерывном тригонометрическом поле без XOR-разрывов."
  },
  {
    id: "xor",
    index: "03",
    label: "XOR-поле",
    hint: "^ cells",
    description: "Разрывный XOR режет гладкое течение на соседние ячейки с разными направлениями."
  },
  {
    id: "exchange",
    index: "04",
    label: "Обмен",
    hint: "birth/death",
    description: "Полная механика автора: старые точки уходят, новые random3D-семена постоянно входят в систему."
  }
]);

export const sketch36Colors = Object.freeze([
  { id: "age", label: "Возраст", formula: "stroke(i,i/3,i/5)" },
  { id: "cell", label: "XOR-ячейка", formula: "stroke(r*8,i/3,i/5)" },
  { id: "phase", label: "Фаза", formula: "stroke(i,sin(r)*i,r)" },
  { id: "depth", label: "Глубина", formula: "stroke(i,i/3,v.z*99+99)" }
]);

export const sketch36Defaults = Object.freeze({
  stage: "exchange",
  color: "age",
  trail: 9,
  cell: 2,
  field: 8,
  step: 90,
  memory: 2,
  birth: 20
});

const colorCode = Object.freeze({
  age: "i,i/3,i/5",
  cell: "r*8,i/3,i/5",
  phase: "i,sin(r)*i,r",
  depth: "i,i/3,v.z*99+99"
});

function integer(value, minimum, maximum, fallback) {
  const numeric = Math.round(Number(value));
  return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
}

export function normalizeSketch36Genome(source = {}) {
  const stage = sketch36Stages.some(item => item.id === source.stage) ? source.stage : sketch36Defaults.stage;
  const color = sketch36Colors.some(item => item.id === source.color) ? source.color : sketch36Defaults.color;
  return {
    stage,
    color,
    trail: integer(source.trail, 3, 9, sketch36Defaults.trail),
    cell: integer(source.cell, 1, 9, sketch36Defaults.cell),
    field: integer(source.field, 2, 9, sketch36Defaults.field),
    step: integer(source.step, 30, 99, sketch36Defaults.step),
    memory: integer(source.memory, 1, 5, sketch36Defaults.memory),
    birth: integer(source.birth, 10, 99, sketch36Defaults.birth)
  };
}

export function isOriginalSketch36Genome(source = {}) {
  const genome = normalizeSketch36Genome(source);
  return Object.entries(sketch36Defaults).every(([key, value]) => genome[key] === value);
}

export function compileSketch36Genome(source = {}) {
  const genome = normalizeSketch36Genome(source);
  if (isOriginalSketch36Genome(genome)) return sketch36Original.code;

  const tag = "//#つぶやきProcessing";
  const count = `${genome.memory}e3`;
  const survivors = genome.memory * 1000 - genome.birth;
  const xorField = `(v.x*${genome.cell}+2.5^v.y+2)*${genome.field}`;
  const smoothField = `(v.x*${genome.cell}+2.5+v.y+2)*${genome.field}`;
  const color = colorCode[genome.color];
  const body = field => `(r=${field},stroke(${color}).point(v.copy().add(2,1.6).mult(135)),v.add(sin(v.y*r)/${genome.step},cos(v.x*r)/${genome.step}))`;
  let code;

  if (genome.stage === "seed") {
    code = `t=0,$=[];draw=_=>{t++||createCanvas(540,540);background(0,${genome.trail});$[0]||($=[...Array(${count})].map(p5.Vector.random3D));$.map((v,i)=>(r=${xorField},stroke(${color}).point((v.x*cos(t/${genome.step})-v.z*sin(t/${genome.step})+2)*135,(v.y+1.6)*135)))}${tag}`;
  } else if (genome.stage === "memory") {
    code = `$=[];draw=_=>{$[0]??createCanvas(540,540);background(0,${genome.trail});$[0]||($=[...Array(${count})].map(p5.Vector.random3D));$=$.map((v,i)=>${body(smoothField)})}${tag}`;
  } else if (genome.stage === "xor") {
    code = `$=[];draw=_=>{$[0]??createCanvas(540,540);background(0,${genome.trail});$[0]||($=[...Array(${count})].map(p5.Vector.random3D));$=$.map((v,i)=>${body(xorField)})}${tag}`;
  } else {
    code = `$=[];draw=_=>{$[0]??createCanvas(540,540);background(0,${genome.trail});$=$.map((v,i)=>${body(xorField)})[${count}]?$.slice(-${survivors}):[...$,...[...Array(${genome.birth})].map(p5.Vector.random3D)]}${tag}`;
  }

  if (code.length > SKETCH_36_LIMIT) {
    throw new RangeError(`Sketch #36 mutation needs ${code.length} characters; limit is ${SKETCH_36_LIMIT}.`);
  }
  return code;
}

export function sketch36Signature(source = {}) {
  const genome = normalizeSketch36Genome(source);
  return [
    genome.stage,
    genome.color,
    genome.trail,
    genome.cell,
    genome.field,
    genome.step,
    genome.memory,
    genome.birth
  ].join("-");
}
