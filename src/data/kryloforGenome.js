export const KRYLOFOR_GENOME_LIMIT = 280;

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

export function compileKryloforGenome(settings = {}) {
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
  const code = `t=0,draw=_=>{t||createCanvas(w=400,w);background(7);for(t+=${timeStep},i=${points};i--;){u=i/${longitudinalScale};v=(i%99/49-1)**3;p=sin(u/1.6);s=sin(${parameters.waveSpeed}*t-u*${parameters.waveCount});x=(u-2)*${parameters.length};z=p*(${rimDepth}*sin(3*v)+${fold}*s*(1-v*v));y=v*p*(${parameters.bodyWidth}+${parameters.wingWidth}*p+s)+u*u*s;stroke(w*sin(${parameters.signalSpeed}*t-u*${parameters.signalCount})**8,8,w,${parameters.alpha});point(x*cos(t)+z*sin(t)+200,y+200)}}//#つぶやきProcessing`;
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
