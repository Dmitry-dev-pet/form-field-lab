export const KRYLOFOR_GENOME_LIMIT = 280;

export const KRYLOFOR_COLOR_PALETTES = Object.freeze([
  Object.freeze({ id: "ultraviolet", label: "Ультрафиолет", channels: Object.freeze(["n", "8", "w"]), from: "#0008ff", to: "#ff08ff" }),
  Object.freeze({ id: "lagoon", label: "Лагуна", channels: Object.freeze(["8", "n", "w"]), from: "#0800ff", to: "#08ffff" }),
  Object.freeze({ id: "solar", label: "Солнечная", channels: Object.freeze(["n", "w", "8"]), from: "#00ff08", to: "#ffff08" }),
  Object.freeze({ id: "heat", label: "Жар", channels: Object.freeze(["w", "n", "8"]), from: "#ff0008", to: "#ffff08" }),
  Object.freeze({ id: "bio", label: "Биосвет", channels: Object.freeze(["8", "w", "n"]), from: "#08ff00", to: "#08ffff" }),
  Object.freeze({ id: "magma", label: "Магма", channels: Object.freeze(["w", "8", "n"]), from: "#ff0800", to: "#ff08ff" })
]);

export const KRYLOFOR_COLOR_LAWS = Object.freeze([
  Object.freeze({
    id: "pulse",
    label: "Импульс",
    formula: "sin⁸(ωt − ku)",
    description: "Узкий световой фронт бежит вдоль мембраны.",
    controls: ["signalSpeed", "signalCount"]
  }),
  Object.freeze({
    id: "bands",
    label: "Модульные полосы",
    formula: "(ωt + ku) mod 1",
    description: "Непрерывная пила создаёт движущиеся цветовые полосы без тригонометрии.",
    controls: ["signalSpeed", "signalCount"]
  }),
  Object.freeze({
    id: "polynomial",
    label: "Полином",
    formula: "((ωt − u) mod 1)²",
    description: "Квадратичная фаза ускоряет и растягивает фронты.",
    controls: ["signalSpeed"]
  }),
  Object.freeze({
    id: "seam",
    label: "Центральный шов",
    formula: "1 − v²",
    description: "Цвет измеряет расстояние от краёв к общему шву.",
    controls: []
  }),
  Object.freeze({
    id: "depth",
    label: "Глубина",
    formula: "z² / 400",
    description: "Скрытая третья координата непосредственно управляет свечением.",
    controls: []
  }),
  Object.freeze({
    id: "profile",
    label: "Профиль тела",
    formula: "p²",
    description: "Голова и хвост темнеют, широкая середина светится.",
    controls: []
  })
]);

export const KRYLOFOR_DEFAULTS = Object.freeze({
  speed: 1,
  genomeSpeed: 1,
  length: 50,
  bodyWidth: 30,
  wingWidth: 80,
  depth: 1,
  fold: 20,
  waveSpeed: 8,
  waveCount: 2,
  signalSpeed: 9,
  signalCount: 3,
  colorPalette: "ultraviolet",
  colorLaw: "pulse",
  pointCount: 10000,
  alpha: 80,
  backgroundColor: "#070707"
});

function integer(value, fallback, minimum, maximum) {
  const number = Math.round(Number(value));
  return Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback));
}

function depthScale(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return KRYLOFOR_DEFAULTS.depth;
  return Math.round(Math.min(1.6, Math.max(0.5, number)) * 10) / 10;
}

function scientificThousands(value) {
  const thousands = Math.round(value / 1000);
  return thousands % 10 === 0 ? `${thousands / 10}e4` : `${thousands}e3`;
}

function optionById(options, value, fallback) {
  return options.find(option => option.id === value)
    || options.find(option => option.id === fallback)
    || options[0];
}

function colorChannel(law, parameters) {
  if (law.id === "bands") return `w*((${parameters.signalSpeed}*t+u*${parameters.signalCount})%1)`;
  if (law.id === "polynomial") return `w*((${parameters.signalSpeed}*t-u)%1)**2`;
  if (law.id === "seam") return "w*(1-v*v)";
  if (law.id === "depth") return "w*z*z/400";
  if (law.id === "profile") return "w*p*p";
  return `w*sin(${parameters.signalSpeed}*t-u*${parameters.signalCount})**8`;
}

export function compileKryloforGenome(settings = {}) {
  const palette = optionById(
    KRYLOFOR_COLOR_PALETTES,
    settings.colorPalette,
    KRYLOFOR_DEFAULTS.colorPalette
  );
  const colorLaw = optionById(
    KRYLOFOR_COLOR_LAWS,
    settings.colorLaw,
    KRYLOFOR_DEFAULTS.colorLaw
  );
  const parameters = Object.freeze({
    genomeSpeed: integer(settings.genomeSpeed, KRYLOFOR_DEFAULTS.genomeSpeed, 1, 5),
    length: integer(settings.length, KRYLOFOR_DEFAULTS.length, 35, 65),
    bodyWidth: integer(settings.bodyWidth, KRYLOFOR_DEFAULTS.bodyWidth, 18, 45),
    wingWidth: integer(settings.wingWidth, KRYLOFOR_DEFAULTS.wingWidth, 55, 95),
    depth: depthScale(settings.depth),
    fold: integer(settings.fold, KRYLOFOR_DEFAULTS.fold, 8, 32),
    waveSpeed: integer(settings.waveSpeed, KRYLOFOR_DEFAULTS.waveSpeed, 2, 8),
    waveCount: integer(settings.waveCount, KRYLOFOR_DEFAULTS.waveCount, 1, 5),
    signalSpeed: integer(settings.signalSpeed, KRYLOFOR_DEFAULTS.signalSpeed, 3, 9),
    signalCount: integer(settings.signalCount, KRYLOFOR_DEFAULTS.signalCount, 1, 6),
    colorPalette: palette.id,
    colorLaw: colorLaw.id,
    pointCount: integer(settings.pointCount, KRYLOFOR_DEFAULTS.pointCount, 5000, 20000),
    alpha: integer(settings.alpha, KRYLOFOR_DEFAULTS.alpha, 30, 99)
  });
  const pointCount = Math.max(5000, Math.round(parameters.pointCount / 5000) * 5000);
  const depth = parameters.depth;
  const rimDepth = Math.max(1, Math.round(15 * depth));
  const fold = Math.max(1, Math.round(parameters.fold * depth));
  const timeStep = `.0${parameters.genomeSpeed}`;
  const points = scientificThousands(pointCount);
  const longitudinalScale = scientificThousands(pointCount / 5);
  const signal = colorChannel(colorLaw, parameters);
  const channels = palette.channels
    .map(channel => channel === "n" ? signal : channel)
    .join(",");
  const code = `t=0,draw=_=>{t||createCanvas(w=400,w);background(7);for(t+=${timeStep},i=${points};i--;){u=i/${longitudinalScale};v=(i%99/49-1)**3;p=sin(u/1.6);s=sin(${parameters.waveSpeed}*t-u*${parameters.waveCount});x=(u-2)*${parameters.length};z=p*(${rimDepth}*sin(3*v)+${fold}*s*(1-v*v));y=v*p*(${parameters.bodyWidth}+${parameters.wingWidth}*p+s)+u*u*s;stroke(${channels},${parameters.alpha});point(x*cos(t)+z*sin(t)+200,y+200)}}//#つぶやきProcessing`;
  const identity = [
    parameters.genomeSpeed,
    parameters.length,
    parameters.bodyWidth,
    parameters.wingWidth,
    rimDepth,
    parameters.fold,
    parameters.waveSpeed,
    parameters.waveCount,
    parameters.signalSpeed,
    parameters.signalCount,
    parameters.colorPalette,
    parameters.colorLaw,
    pointCount,
    parameters.alpha
  ].join("-");
  const id = `krylofor-${identity}`;
  const sketch = Object.freeze({ id, code, viewModel: "point-cloud-auto-y-orbit" });

  return Object.freeze({
    id,
    code,
    characters: code.length,
    limit: KRYLOFOR_GENOME_LIMIT,
    withinLimit: code.length <= KRYLOFOR_GENOME_LIMIT,
    parameters: Object.freeze({ ...parameters, pointCount, rimDepth, foldDepth: fold }),
    sketch
  });
}

const canonical = compileKryloforGenome(KRYLOFOR_DEFAULTS);

export const KRYLOFOR_GENOME = canonical.code;
export const KRYLOFOR_GENOME_CHARACTERS = canonical.characters;
export const KRYLOFOR_GENOME_SKETCH = canonical.sketch;
