import { sketches } from "./sketches.js";

export const SKETCH_36_ID = "1588062547315679232";
export const SKETCH_36_LIMIT = 280;

export const sketch36Original = sketches.find(sketch => sketch.id === SKETCH_36_ID);

export const sketch36Modes = Object.freeze([
  { id: "seed", label: "Семя", formula: "random3D", origin: "M", description: "Точки сохраняют исходное распределение: поле вычисляется, но ещё не двигает материал." },
  { id: "memory", label: "Память", formula: "v += field", origin: "M", description: "Фиксированная популяция запоминает каждое смещение и непрерывно меняет форму." },
  { id: "exchange", label: "Обмен", formula: "birth / death", origin: "A", description: "Полный метаболизм автора: новые точки входят, а старые удаляются из памяти." }
]);

export const sketch36FieldLaws = Object.freeze([
  { id: "xor", label: "XOR", symbol: "^", origin: "A", description: "Квантованные ячейки с резкими границами." },
  { id: "smooth", label: "Сумма", symbol: "+", origin: "M", description: "Непрерывное поле без разрывов." },
  { id: "and", label: "AND", symbol: "&", origin: "M", description: "Редкая битовая решётка и длинные коридоры." },
  { id: "or", label: "OR", symbol: "|", origin: "M", description: "Плотные ступени с крупными общими зонами." },
  { id: "mod", label: "Остаток", symbol: "%", origin: "M", description: "Поле складывается в повторяющиеся волновые полосы." }
]);

export const sketch36Couplings = Object.freeze([
  { id: "cross", label: "Перекрёстная", formula: "sin(y), cos(x)", origin: "A" },
  { id: "direct", label: "Прямая", formula: "sin(x), cos(y)", origin: "M" },
  { id: "swap", label: "Перестановка", formula: "cos(y), sin(x)", origin: "M" },
  { id: "reverse", label: "Обратная", formula: "−sin(y), cos(x)", origin: "M" }
]);

export const sketch36Seeds = Object.freeze([
  { id: "sphere", label: "Сфера", formula: "random3D", origin: "A" },
  { id: "circle", label: "Круг", formula: "random2D", origin: "M" },
  { id: "band", label: "Пояс", formula: "random3D · y/4", origin: "M" },
  { id: "column", label: "Столб", formula: "random3D · x/4", origin: "M" }
]);

export const sketch36Depths = Object.freeze([
  { id: "flat", label: "Скрыта", formula: "z → ∅", origin: "A" },
  { id: "field", label: "В поле", formula: "r += z", origin: "M" },
  { id: "tilt", label: "Наклон", formula: "x += z/2", origin: "M" },
  { id: "orbit", label: "Орбита", formula: "x cos t − z sin t", origin: "M" }
]);

export const sketch36Renders = Object.freeze([
  { id: "points", label: "Точки", formula: "point()", origin: "A" },
  { id: "links", label: "Рёбра", formula: "LINES + vertex()", origin: "M" }
]);

export const sketch36Colors = Object.freeze([
  { id: "age", label: "Возраст", formula: "stroke(i,i/3,i/5)", origin: "A" },
  { id: "cell", label: "Ячейка", formula: "stroke(r*8,i/3,i/5)", origin: "M" },
  { id: "phase", label: "Фаза", formula: "stroke(i,sin(r)*i,r)", origin: "M" },
  { id: "depth", label: "Глубина", formula: "stroke(i,i/3,v.z*99+99)", origin: "M" }
]);

export const sketch36Defaults = Object.freeze({
  mode: "exchange",
  fieldLaw: "xor",
  coupling: "cross",
  seed: "sphere",
  depth: "flat",
  render: "points",
  color: "age",
  trail: 9,
  cell: 2,
  field: 8,
  step: 90,
  memory: 2,
  birth: 20,
  death: 40,
  centerX: 2,
  centerY: 1.6,
  scaleX: 135,
  scaleY: 135
});

const colorCode = Object.freeze({
  age: "i,i/3,i/5",
  cell: "r*8,i/3,i/5",
  phase: "i,sin(r)*i,r",
  depth: "i,i/3,v.z*99+99"
});

const seedCode = Object.freeze({
  sphere: "p5.Vector.random3D",
  circle: "p5.Vector.random2D",
  band: "_=>(v=p5.Vector.random3D(),v.y/=4,v)",
  column: "_=>(v=p5.Vector.random3D(),v.x/=4,v)"
});

function choice(value, options, fallback) {
  return options.some(option => option.id === value) ? value : fallback;
}

function integer(value, minimum, maximum, fallback, step = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(numeric / step) * step));
}

function decimal(value, minimum, maximum, fallback, step) {
  return Number(integer(value * 10, minimum * 10, maximum * 10, fallback * 10, step * 10).toFixed(0)) / 10;
}

function token(value) {
  return Number(value).toString();
}

export function normalizeSketch36Genome(source = {}) {
  return {
    mode: choice(source.mode, sketch36Modes, sketch36Defaults.mode),
    fieldLaw: choice(source.fieldLaw, sketch36FieldLaws, sketch36Defaults.fieldLaw),
    coupling: choice(source.coupling, sketch36Couplings, sketch36Defaults.coupling),
    seed: choice(source.seed, sketch36Seeds, sketch36Defaults.seed),
    depth: choice(source.depth, sketch36Depths, sketch36Defaults.depth),
    render: choice(source.render, sketch36Renders, sketch36Defaults.render),
    color: choice(source.color, sketch36Colors, sketch36Defaults.color),
    trail: integer(source.trail, 3, 9, sketch36Defaults.trail),
    cell: integer(source.cell, 1, 9, sketch36Defaults.cell),
    field: integer(source.field, 2, 9, sketch36Defaults.field),
    step: integer(source.step, 30, 99, sketch36Defaults.step),
    memory: integer(source.memory, 1, 5, sketch36Defaults.memory),
    birth: integer(source.birth, 10, 99, sketch36Defaults.birth),
    death: integer(source.death, 20, 99, sketch36Defaults.death),
    centerX: decimal(source.centerX, 1, 3, sketch36Defaults.centerX, 0.5),
    centerY: decimal(source.centerY, 1, 2.2, sketch36Defaults.centerY, 0.1),
    scaleX: integer(source.scaleX, 90, 180, sketch36Defaults.scaleX, 5),
    scaleY: integer(source.scaleY, 90, 180, sketch36Defaults.scaleY, 5)
  };
}

export function isOriginalSketch36Genome(source = {}) {
  const genome = normalizeSketch36Genome(source);
  return Object.entries(sketch36Defaults).every(([key, value]) => genome[key] === value);
}

function fieldExpression(genome) {
  const x = `v.x*${genome.cell}+2.5${genome.depth === "field" ? "+v.z" : ""}`;
  const y = "v.y+2";
  if (genome.fieldLaw === "smooth") return `(${x}+${y})*${genome.field}`;
  if (genome.fieldLaw === "mod") return `(${x})%(abs(v.y)+1)*${genome.field}`;
  const operator = sketch36FieldLaws.find(law => law.id === genome.fieldLaw).symbol;
  return `(${x}${operator}${y})*${genome.field}`;
}

function movementExpression(genome) {
  const axes = {
    cross: ["sin(v.y*r)", "cos(v.x*r)"],
    direct: ["sin(v.x*r)", "cos(v.y*r)"],
    swap: ["cos(v.y*r)", "sin(v.x*r)"],
    reverse: ["-sin(v.y*r)", "cos(v.x*r)"]
  }[genome.coupling];
  return [`${axes[0]}/${genome.step}`, `${axes[1]}/${genome.step}`];
}

function projectionExpression(genome) {
  const centerX = token(genome.centerX);
  let x = `v.x+${centerX}`;
  if (genome.depth === "tilt") x = `v.x+v.z/2+${centerX}`;
  if (genome.depth === "orbit") x = `v.x*cos(t/${genome.step})-v.z*sin(t/${genome.step})+${centerX}`;
  return `(${x})*${genome.scaleX},(v.y+${token(genome.centerY)})*${genome.scaleY}`;
}

function generatedSketch36Code(genome) {
  const tag = "//#つぶやきProcessing";
  const count = `${genome.memory}e3`;
  const seed = seedCode[genome.seed];
  const field = fieldExpression(genome);
  const [dx, dy] = movementExpression(genome);
  const projection = projectionExpression(genome);
  const draw = genome.render === "links"
    ? `stroke(${colorCode[genome.color]}).vertex(${projection})`
    : `stroke(${colorCode[genome.color]}).point(${projection})`;
  const open = genome.render === "links" ? "beginShape(LINES);" : "";
  const close = genome.render === "links" ? ";endShape()" : "";
  const fieldMap = `${open}$.map((v,i)=>(r=${field},${draw},v.add(${dx},${dy})))${close}`;

  if (genome.mode === "seed") {
    const seedMap = `${open}$.map((v,i)=>(r=${field},${draw}))${close}`;
    return `t=0,$=[...Array(${count})].map(${seed});draw=_=>{t++||createCanvas(540,540);background(0,${genome.trail});${seedMap}}${tag}`;
  }

  if (genome.mode === "memory") {
    return `t=0,$=[...Array(${count})].map(${seed});draw=_=>{t++||createCanvas(540,540);background(0,${genome.trail});${fieldMap}}${tag}`;
  }

  const start = genome.depth === "orbit"
    ? "t=0,$=[];draw=_=>{t++||createCanvas(540,540);"
    : "$=[];draw=_=>{$[0]??createCanvas(540,540);";
  return `${start}background(0,${genome.trail});${fieldMap};$[${count}]?$.splice(0,${genome.death}):$.push(...[...Array(${genome.birth})].map(${seed}))}${tag}`;
}

export function inspectSketch36Genome(source = {}) {
  const genome = normalizeSketch36Genome(source);
  const original = isOriginalSketch36Genome(genome);
  const code = original ? sketch36Original.code : generatedSketch36Code(genome);
  return {
    genome,
    code,
    length: code.length,
    fits: code.length <= SKETCH_36_LIMIT,
    original
  };
}

export function compileSketch36Genome(source = {}) {
  const result = inspectSketch36Genome(source);
  if (!result.fits) {
    const error = new RangeError(`Sketch #36 mutation needs ${result.length} characters; limit is ${SKETCH_36_LIMIT}.`);
    error.requiredLength = result.length;
    throw error;
  }
  return result.code;
}

export function sketch36Signature(source = {}) {
  const genome = normalizeSketch36Genome(source);
  return Object.keys(sketch36Defaults).map(key => genome[key]).join("-");
}
