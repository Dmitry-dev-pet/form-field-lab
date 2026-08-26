export const MOIREPHORE_GENOME_LIMIT = 280;

export const MOIREPHORE_COLOR_PALETTES = Object.freeze([
  Object.freeze({ id: "spectral", label: "Спектр", channels: Object.freeze(["n", "255-n", "255"]), from: "#1de2ff", to: "#e31cff" }),
  Object.freeze({ id: "aurora", label: "Аврора", channels: Object.freeze(["255-n", "n", "255"]), from: "#e21dff", to: "#1ce3ff" }),
  Object.freeze({ id: "reef", label: "Риф", channels: Object.freeze(["255", "n", "255-n"]), from: "#ff1de2", to: "#ffe31c" }),
  Object.freeze({ id: "pollen", label: "Пыльца", channels: Object.freeze(["255", "255-n", "n"]), from: "#ffe21d", to: "#ff1ce3" }),
  Object.freeze({ id: "ocean", label: "Океан", channels: Object.freeze(["n", "255", "255-n"]), from: "#1dffe2", to: "#e3ff1c" }),
  Object.freeze({ id: "bio", label: "Биосвет", channels: Object.freeze(["255-n", "255", "n"]), from: "#e2ff1d", to: "#1cffe3" })
]);

export const MOIREPHORE_COLOR_LAWS = Object.freeze([
  Object.freeze({
    id: "difference",
    label: "Разность фаз",
    formula: "sin(a − b)",
    description: "Цвет показывает медленное биение между двумя волнами.",
    expression: "sin(a-b)",
    controls: []
  }),
  Object.freeze({
    id: "sum",
    label: "Сумма фаз",
    formula: "sin(a + b)",
    description: "Цвет выделяет быстрые полосы общей фазы.",
    expression: "sin(a+b)",
    controls: []
  }),
  Object.freeze({
    id: "depth",
    label: "Скрытая глубина",
    formula: "sin(q)",
    description: "Цвет напрямую показывает знак третьей координаты.",
    expression: "sin(q)",
    controls: []
  }),
  Object.freeze({
    id: "rim",
    label: "Поперечный профиль",
    formula: "cos(q)",
    description: "Цвет следует видимой стороне каждого сечения.",
    expression: "cos(q)",
    controls: []
  })
]);

export const MOIREPHORE_DEFAULTS = Object.freeze({
  speed: 1,
  genomeSpeed: 1,
  length: 50,
  radius: 65,
  depth: 1,
  interference: 12,
  waveA: 3,
  waveB: 5,
  twist: 4,
  colorPalette: "spectral",
  colorLaw: "difference",
  pointCount: 10000,
  alpha: 255,
  backgroundColor: "#070707"
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

function scientificThousands(value) {
  const thousands = Math.round(value / 1000);
  return thousands % 10 === 0 ? `${thousands / 10}e4` : `${thousands}e3`;
}

export function compileMoirephoreGenome(settings = {}) {
  const palette = optionById(
    MOIREPHORE_COLOR_PALETTES,
    settings.colorPalette,
    MOIREPHORE_DEFAULTS.colorPalette
  );
  const colorLaw = optionById(
    MOIREPHORE_COLOR_LAWS,
    settings.colorLaw,
    MOIREPHORE_DEFAULTS.colorLaw
  );
  const parameters = Object.freeze({
    genomeSpeed: integer(settings.genomeSpeed, MOIREPHORE_DEFAULTS.genomeSpeed, 1, 5),
    length: integer(settings.length, MOIREPHORE_DEFAULTS.length, 40, 70, 2),
    radius: integer(settings.radius, MOIREPHORE_DEFAULTS.radius, 50, 80),
    depth: integer(settings.depth, MOIREPHORE_DEFAULTS.depth, 1, 3),
    interference: integer(settings.interference, MOIREPHORE_DEFAULTS.interference, 8, 18),
    waveA: integer(settings.waveA, MOIREPHORE_DEFAULTS.waveA, 2, 6),
    waveB: integer(settings.waveB, MOIREPHORE_DEFAULTS.waveB, 3, 9),
    twist: integer(settings.twist, MOIREPHORE_DEFAULTS.twist, 2, 6),
    colorPalette: palette.id,
    colorLaw: colorLaw.id,
    pointCount: integer(settings.pointCount, MOIREPHORE_DEFAULTS.pointCount, 5000, 20000, 5000)
  });
  const points = scientificThousands(parameters.pointCount);
  const longitudinalScale = scientificThousands(parameters.pointCount / 5);
  const offset = parameters.length * 2.5;
  const channels = palette.channels.join(",");
  const code = `t=0,draw=_=>{t||createCanvas(w=400,w);background(7);for(t+=.0${parameters.genomeSpeed},i=${points};i--;)u=i/${longitudinalScale},v=i%80/13,a=${parameters.waveA}*u-t,b=${parameters.waveB}*u+t,r=sin(u/1.6)*(${parameters.radius}+${parameters.interference}*sin(a)*cos(b)),q=v+sin(a-b)/${parameters.twist},x=${parameters.length}*u-${offset},z=${parameters.depth}*r*sin(q),n=128+99*${colorLaw.expression},stroke(${channels}),point(x*cos(t)+z*sin(t)+200,r*cos(q)+200)}//#つぶやきProcessing`;
  const identity = [
    parameters.genomeSpeed,
    parameters.length,
    parameters.radius,
    parameters.depth,
    parameters.interference,
    parameters.waveA,
    parameters.waveB,
    parameters.twist,
    parameters.colorPalette,
    parameters.colorLaw,
    parameters.pointCount
  ].join("-");
  const id = `moirephore-${identity}`;
  const sketch = Object.freeze({ id, code, viewModel: "point-cloud-auto-y-orbit" });

  return Object.freeze({
    id,
    code,
    characters: code.length,
    limit: MOIREPHORE_GENOME_LIMIT,
    withinLimit: code.length <= MOIREPHORE_GENOME_LIMIT,
    parameters,
    sketch
  });
}

const canonical = compileMoirephoreGenome(MOIREPHORE_DEFAULTS);

export const MOIREPHORE_GENOME = canonical.code;
export const MOIREPHORE_GENOME_CHARACTERS = canonical.characters;
export const MOIREPHORE_GENOME_SKETCH = canonical.sketch;
