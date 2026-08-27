export const TOROPHORE_GENOME_LIMIT = 280;

export const TOROPHORE_ROTATION_DIVISORS = Object.freeze([0, 900, 600, 400, 300, 240]);

export const TOROPHORE_COLOR_PALETTES = Object.freeze([
  Object.freeze({ id: "original", label: "Original", from: "#090909", to: "#ffffff" }),
  Object.freeze({ id: "lagoon", label: "Лагуна", from: "#0063ff", to: "#fa638e" }),
  Object.freeze({ id: "fire", label: "Огонь", from: "#ff6300", to: "#ffd26f" }),
  Object.freeze({ id: "plasma", label: "Плазма", from: "#ff63ff", to: "#ffc6ff" })
]);

export const TOROPHORE_COLOR_LAWS = Object.freeze([
  Object.freeze({
    id: "phase",
    label: "Фаза шума",
    formula: "RGB = f(d, I)",
    description: "Фаза d одновременно переносит геометрию и цвет, поэтому оттенок движется вместе с тороидальным потоком.",
    controls: ["colorIntensity"]
  })
]);

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

export const TOROPHORE_DEFAULTS = Object.freeze({
  speed: 1,
  genomeSpeed: 2,
  organCount: 480,
  turns: 2,
  noiseScale: 1,
  organRadius: 120,
  breath: 0,
  spinX: 0,
  spinY: 0,
  spinZ: 0,
  colorPalette: "original",
  colorLaw: "phase",
  colorIntensity: 9,
  pointCount: 480,
  alpha: 255,
  backgroundColor: "#090909"
});

export const TOROPHORE_AUTOROTATE_DEFAULTS = Object.freeze({
  ...TOROPHORE_DEFAULTS,
  spinX: 2,
  spinY: 3,
  spinZ: 1,
  colorPalette: "lagoon"
});

function integer(value, fallback, minimum, maximum, step = 1) {
  const number = Number.isFinite(Number(value)) ? Number(value) : fallback;
  const stepped = Math.round(number / step) * step;
  return Math.min(maximum, Math.max(minimum, stepped));
}

function decimal(value, fallback, minimum, maximum, step) {
  const number = Number.isFinite(Number(value)) ? Number(value) : fallback;
  const stepped = Math.round(number / step) * step;
  return Math.min(maximum, Math.max(minimum, Number(stepped.toFixed(1))));
}

function compactDecimal(value) {
  return String(value).replace(/^0\./, ".");
}

function optionById(options, value, fallback) {
  return options.find(option => option.id === value)
    || options.find(option => option.id === fallback)
    || options[0];
}

function colorFill(parameters) {
  if (parameters.colorPalette === "lagoon") {
    return `fill(d*20,99,255-d*${parameters.colorIntensity})`;
  }
  if (parameters.colorPalette === "fire") {
    return `fill(255,99+d*${parameters.colorIntensity},d*12)`;
  }
  if (parameters.colorPalette === "plasma") {
    return `fill(255,99+${parameters.colorIntensity * 11}*sin(d),255)`;
  }
  const ceiling = 128 + Math.round(127 * parameters.colorIntensity / 9);
  return `fill(map(sin(d),-1,1,${ceiling},0))`;
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
    organCount: integer(settings.organCount, TOROPHORE_DEFAULTS.organCount, 120, 720, 60),
    turns: integer(settings.turns, TOROPHORE_DEFAULTS.turns, 1, 5),
    noiseScale: integer(settings.noiseScale, TOROPHORE_DEFAULTS.noiseScale, 1, 9),
    organRadius: integer(settings.organRadius, TOROPHORE_DEFAULTS.organRadius, 60, 180, 10),
    breath: decimal(settings.breath, TOROPHORE_DEFAULTS.breath, 0, 0.9, 0.1),
    spinX: integer(settings.spinX, TOROPHORE_DEFAULTS.spinX, 0, 5),
    spinY: integer(settings.spinY, TOROPHORE_DEFAULTS.spinY, 0, 5),
    spinZ: integer(settings.spinZ, TOROPHORE_DEFAULTS.spinZ, 0, 5),
    colorPalette: palette.id,
    colorLaw: colorLaw.id,
    colorIntensity: integer(settings.colorIntensity, TOROPHORE_DEFAULTS.colorIntensity, 1, 9)
  });
  const rotations = ["X", "Y", "Z"]
    .filter(axis => parameters[`spin${axis}`] > 0)
    .map(axis => `rotate${axis}(C/${TOROPHORE_ROTATION_DIVISORS[parameters[`spin${axis}`]]})`)
    .join(",");
  const count = parameters.organCount === 480
    ? rotations ? 480 : "W*2/3"
    : parameters.organCount;
  const radius = parameters.organRadius === 120 ? "W/6" : parameters.organRadius;
  const noise = parameters.noiseScale === 1
    ? "noise(i-C)"
    : `noise((i-C)/${parameters.noiseScale})`;
  const torus = parameters.breath === 0
    ? `torus(${radius})`
    : `torus(${radius},50*(1+${compactDecimal(parameters.breath)}*sin(d+C/30)))`;
  const rotationLine = rotations ? `scale(.6),${rotations}\n` : "";
  const code = `C=0
setup=_=>createCanvas(W=720,W,WEBGL)&noStroke()
draw=_=>{clear();C+=${parameters.genomeSpeed}
${rotationLine}for(i=${count};i>0;i--){
d=${noise}*TAU*${parameters.turns}
${colorFill(parameters)}
push()
translate(cos(d)*i,sin(d)*i,0)
${torus}
pop()}}`;
  const identity = [
    parameters.genomeSpeed,
    parameters.organCount,
    parameters.turns,
    parameters.noiseScale,
    parameters.organRadius,
    parameters.breath,
    parameters.spinX,
    parameters.spinY,
    parameters.spinZ,
    parameters.colorPalette,
    parameters.colorLaw,
    parameters.colorIntensity
  ].join("-");
  const id = `torus-source-${identity}`;
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
