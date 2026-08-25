export const CHIRALOPHORE_GENOME_LIMIT = 280;

export const CHIRALOPHORE_COLOR_PALETTES = Object.freeze([
  Object.freeze({ id: "lagoon", label: "Лагуна", channels: Object.freeze(["n", "m", "w"]), from: "#00b4ff", to: "#ffb4ff" }),
  Object.freeze({ id: "aurora", label: "Аврора", channels: Object.freeze(["m", "n", "w"]), from: "#b400ff", to: "#b4ffff" }),
  Object.freeze({ id: "solar", label: "Солнечная", channels: Object.freeze(["n", "w", "m"]), from: "#00ffb4", to: "#ffffb4" }),
  Object.freeze({ id: "bio", label: "Биосвет", channels: Object.freeze(["m", "w", "n"]), from: "#b4ff00", to: "#b4ffff" }),
  Object.freeze({ id: "heat", label: "Жар", channels: Object.freeze(["w", "n", "m"]), from: "#ff00b4", to: "#ffffb4" }),
  Object.freeze({ id: "violet", label: "Фиолет", channels: Object.freeze(["w", "m", "n"]), from: "#ffb400", to: "#ffb4ff" })
]);

export const CHIRALOPHORE_COLOR_LAWS = Object.freeze([
  Object.freeze({
    id: "double-pulse",
    label: "Сдвоенный импульс",
    formula: "sin¹⁰(ωt − ku + 3(i mod 2))",
    description: "Обе фазовые ткани вспыхивают на максимуме сокращения.",
    expression: "w*s*s",
    controls: []
  }),
  Object.freeze({
    id: "tissues",
    label: "Две ткани",
    formula: "255(i mod 2)",
    description: "Цвет непосредственно различает две противофазные оболочки.",
    expression: "w*(i%2)",
    controls: []
  }),
  Object.freeze({
    id: "profile",
    label: "Профиль тела",
    formula: "255 sin²(u / 1.6)",
    description: "Свечение измеряет расстояние от полюсов к широкому экватору.",
    expression: "w*p*p",
    controls: []
  })
]);

export const CHIRALOPHORE_DEFAULTS = Object.freeze({
  genomeSpeed: 1,
  length: 50,
  radius: 65,
  depth: 1,
  pulse: 13,
  pulseSpeed: 8,
  axialWaves: 3,
  twist: 3,
  fold: 4,
  chirality: 1,
  colorPalette: "lagoon",
  colorLaw: "double-pulse",
  pointCount: 10000,
  backgroundColor: "#070707"
});

function integer(value, fallback, minimum, maximum, step = 1) {
  const number = Number.isFinite(Number(value)) ? Number(value) : fallback;
  const stepped = Math.round(number / step) * step;
  return Math.min(maximum, Math.max(minimum, stepped));
}

function depthValue(value) {
  const number = Number.isFinite(Number(value)) ? Number(value) : CHIRALOPHORE_DEFAULTS.depth;
  return [0.5, 1, 1.5].reduce((closest, candidate) =>
    Math.abs(candidate - number) < Math.abs(closest - number) ? candidate : closest
  );
}

function optionById(options, value, fallback) {
  return options.find(option => option.id === value)
    || options.find(option => option.id === fallback)
    || options[0];
}

export function compileChiralophoreGenome(settings = {}) {
  const palette = optionById(
    CHIRALOPHORE_COLOR_PALETTES,
    settings.colorPalette,
    CHIRALOPHORE_DEFAULTS.colorPalette
  );
  const colorLaw = optionById(
    CHIRALOPHORE_COLOR_LAWS,
    settings.colorLaw,
    CHIRALOPHORE_DEFAULTS.colorLaw
  );
  const parameters = Object.freeze({
    genomeSpeed: integer(settings.genomeSpeed, CHIRALOPHORE_DEFAULTS.genomeSpeed, 1, 5),
    length: integer(settings.length, CHIRALOPHORE_DEFAULTS.length, 40, 70, 2),
    radius: integer(settings.radius, CHIRALOPHORE_DEFAULTS.radius, 50, 80),
    depth: depthValue(settings.depth),
    pulse: integer(settings.pulse, CHIRALOPHORE_DEFAULTS.pulse, 10, 20),
    pulseSpeed: integer(settings.pulseSpeed, CHIRALOPHORE_DEFAULTS.pulseSpeed, 5, 9),
    axialWaves: integer(settings.axialWaves, CHIRALOPHORE_DEFAULTS.axialWaves, 2, 6),
    twist: integer(settings.twist, CHIRALOPHORE_DEFAULTS.twist, 1, 5),
    fold: integer(settings.fold, CHIRALOPHORE_DEFAULTS.fold, 2, 6),
    chirality: Number(settings.chirality) < 0 ? -1 : 1,
    colorPalette: palette.id,
    colorLaw: colorLaw.id,
    pointCount: CHIRALOPHORE_DEFAULTS.pointCount
  });
  const direction = parameters.chirality < 0 ? "-" : "+";
  const depthDivisor = parameters.depth === 0.5 ? 6 : parameters.depth === 1.5 ? 2 : 3;
  const offset = parameters.length * 2.5;
  const channels = palette.channels
    .map(channel => channel === "n"
      ? colorLaw.expression
      : channel === "m" ? "180+70*p" : channel)
    .join(",");
  const code = `t=0,draw=_=>{t||createCanvas(w=400,w);background(7);for(t+=.0${parameters.genomeSpeed},i=1e4;i--;)u=i/2e3,v=i%80/13-3,p=sin(u/1.6),s=sin(${parameters.pulseSpeed}*t-${parameters.axialWaves}*u+i%2*3)**5,r=p*(${parameters.radius}+${parameters.pulse}*s),q=v+sin(2*v${direction}${parameters.twist}*u)/${parameters.fold},x=${parameters.length}*u-${offset},z=r*sin(q)*(3+s)/${depthDivisor},stroke(${channels}),point(x*cos(t)+z*sin(t)+200,r*cos(q)+200)}//#つぶやきProcessing`;
  const identity = [
    parameters.genomeSpeed,
    parameters.length,
    parameters.radius,
    parameters.depth,
    parameters.pulse,
    parameters.pulseSpeed,
    parameters.axialWaves,
    parameters.twist,
    parameters.fold,
    parameters.chirality,
    parameters.colorPalette,
    parameters.colorLaw
  ].join("-");
  const id = `chiralophore-${identity}`;
  const sketch = Object.freeze({ id, code, viewModel: "point-cloud-auto-y-orbit" });

  return Object.freeze({
    id,
    code,
    characters: code.length,
    limit: CHIRALOPHORE_GENOME_LIMIT,
    withinLimit: code.length <= CHIRALOPHORE_GENOME_LIMIT,
    parameters: Object.freeze({ ...parameters, depthDivisor }),
    sketch
  });
}

const canonical = compileChiralophoreGenome(CHIRALOPHORE_DEFAULTS);

export const CHIRALOPHORE_GENOME = canonical.code;
export const CHIRALOPHORE_GENOME_CHARACTERS = canonical.characters;
export const CHIRALOPHORE_GENOME_SKETCH = canonical.sketch;
