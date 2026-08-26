export const TOROPHORE_GENOME_LIMIT = 280;

export const TOROPHORE_SOURCE = `C=0
setup=_=>createCanvas(W=720,W,WEBGL)&noStroke()
draw=_=>{clear();C+=2
for(i=W*2/3;i>0;i--){
d=noise(i-C)*TAU*2
fill(map(sin(d),-1,1,255,0))
push()
translate(cos(d)*i,sin(d)*i,0)
torus(W/6)
pop()}}`;

export const TOROPHORE_COLOR_PALETTES = Object.freeze([
  Object.freeze({ id: "spectral", label: "Спектр", channels: Object.freeze(["n", "255-n", "255"]), from: "#1de2ff", to: "#e31cff" }),
  Object.freeze({ id: "aurora", label: "Аврора", channels: Object.freeze(["255-n", "n", "255"]), from: "#e21dff", to: "#1ce3ff" }),
  Object.freeze({ id: "reef", label: "Риф", channels: Object.freeze(["255", "n", "255-n"]), from: "#ff1de2", to: "#ffe31c" }),
  Object.freeze({ id: "pollen", label: "Пыльца", channels: Object.freeze(["255", "255-n", "n"]), from: "#ffe21d", to: "#ff1ce3" }),
  Object.freeze({ id: "ocean", label: "Океан", channels: Object.freeze(["n", "255", "255-n"]), from: "#1dffe2", to: "#e3ff1c" }),
  Object.freeze({ id: "bio", label: "Биосвет", channels: Object.freeze(["255-n", "255", "n"]), from: "#e2ff1d", to: "#1cffe3" })
]);

export const TOROPHORE_COLOR_LAWS = Object.freeze([
  Object.freeze({
    id: "heading",
    label: "Направление потока",
    formula: "sin(d)",
    description: "Цвет следует углу, который одновременно размещает и поворачивает орган.",
    expression: "sin(d)",
    controls: []
  }),
  Object.freeze({
    id: "heading-rim",
    label: "Кромка потока",
    formula: "cos(d)",
    description: "Цвет сдвинут на четверть периода относительно направления движения.",
    expression: "cos(d)",
    controls: []
  }),
  Object.freeze({
    id: "depth",
    label: "Глубинная волна",
    formula: "sin(q)",
    description: "Цвет показывает знак настоящей координаты z.",
    expression: "sin(q)",
    controls: []
  }),
  Object.freeze({
    id: "depth-rim",
    label: "Кромка глубины",
    formula: "cos(q)",
    description: "Цвет отмечает переходы глубинной волны через среднюю плоскость.",
    expression: "cos(q)",
    controls: []
  })
]);

export const TOROPHORE_DEFAULTS = Object.freeze({
  speed: 1,
  genomeSpeed: 2,
  organCount: 180,
  turns: 2,
  depth: 80,
  depthWave: 20,
  depthSpeed: 3,
  organRadius: 50,
  detailX: 8,
  detailY: 6,
  colorPalette: "spectral",
  colorLaw: "heading",
  pointCount: 480,
  alpha: 255,
  backgroundColor: "#090909"
});

function integer(value, fallback, minimum, maximum, step = 1) {
  const number = Number.isFinite(Number(value)) ? Number(value) : fallback;
  const stepped = Math.round(number / step) * step;
  return Math.min(maximum, Math.max(minimum, stepped));
}

function optionById(options, value, fallback) {
  return options.find(option => option.id === value)
    || options.find(option => option.id === fallback)
    || options[0];
}

export function compileTorophoreGenome(settings = {}) {
  const palette = optionById(
    TOROPHORE_COLOR_PALETTES,
    settings.colorPalette,
    TOROPHORE_DEFAULTS.colorPalette
  );
  const colorLaw = optionById(
    TOROPHORE_COLOR_LAWS,
    settings.colorLaw,
    TOROPHORE_DEFAULTS.colorLaw
  );
  const parameters = Object.freeze({
    genomeSpeed: integer(settings.genomeSpeed, TOROPHORE_DEFAULTS.genomeSpeed, 1, 5),
    organCount: integer(settings.organCount, TOROPHORE_DEFAULTS.organCount, 120, 480, 60),
    turns: integer(settings.turns, TOROPHORE_DEFAULTS.turns, 1, 4),
    depth: integer(settings.depth, TOROPHORE_DEFAULTS.depth, 40, 99),
    depthWave: integer(settings.depthWave, TOROPHORE_DEFAULTS.depthWave, 10, 40, 5),
    depthSpeed: integer(settings.depthSpeed, TOROPHORE_DEFAULTS.depthSpeed, 1, 9),
    organRadius: integer(settings.organRadius, TOROPHORE_DEFAULTS.organRadius, 30, 90, 10),
    detailX: integer(settings.detailX, TOROPHORE_DEFAULTS.detailX, 4, 9),
    detailY: integer(settings.detailY, TOROPHORE_DEFAULTS.detailY, 3, 8),
    colorPalette: palette.id,
    colorLaw: colorLaw.id
  });
  const channels = palette.channels.join(",");
  const code = `t=0,setup=_=>createCanvas(w=720,w,WEBGL)&noStroke(),draw=_=>{clear();for(t+=${parameters.genomeSpeed},i=${parameters.organCount};i--;)d=noise(i-t)*TAU*${parameters.turns},q=i/${parameters.depthWave}-t/${parameters.depthSpeed},z=${parameters.depth}*sin(q),n=128+99*${colorLaw.expression},fill(${channels}),push(),translate(cos(d)*i,sin(d)*i,z),rotateX(d),torus(${parameters.organRadius},${parameters.detailX},${parameters.detailY}),pop()}//#つぶやきProcessing`;
  const identity = [
    parameters.genomeSpeed,
    parameters.organCount,
    parameters.turns,
    parameters.depth,
    parameters.depthWave,
    parameters.depthSpeed,
    parameters.organRadius,
    parameters.detailX,
    parameters.detailY,
    parameters.colorPalette,
    parameters.colorLaw
  ].join("-");
  const id = `torophore-${identity}`;
  const sketch = Object.freeze({ id, code, viewModel: "webgl-orbit" });

  return Object.freeze({
    id,
    code,
    characters: code.length,
    limit: TOROPHORE_GENOME_LIMIT,
    withinLimit: code.length <= TOROPHORE_GENOME_LIMIT,
    parameters,
    sketch
  });
}

const canonical = compileTorophoreGenome(TOROPHORE_DEFAULTS);

export const TOROPHORE_GENOME = canonical.code;
export const TOROPHORE_GENOME_CHARACTERS = canonical.characters;
export const TOROPHORE_GENOME_SKETCH = canonical.sketch;
