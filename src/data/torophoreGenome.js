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

export const TOROPHORE_DEFAULTS = Object.freeze({
  speed: 1,
  genomeSpeed: 2,
  organCount: 480,
  turns: 2,
  noiseScale: 1,
  organRadius: 120,
  pointCount: 480,
  alpha: 255,
  backgroundColor: "#090909"
});

function integer(value, fallback, minimum, maximum, step = 1) {
  const number = Number.isFinite(Number(value)) ? Number(value) : fallback;
  const stepped = Math.round(number / step) * step;
  return Math.min(maximum, Math.max(minimum, stepped));
}

export function compileTorophoreGenome(settings = {}) {
  const parameters = Object.freeze({
    genomeSpeed: integer(settings.genomeSpeed, TOROPHORE_DEFAULTS.genomeSpeed, 1, 5),
    organCount: integer(settings.organCount, TOROPHORE_DEFAULTS.organCount, 120, 720, 60),
    turns: integer(settings.turns, TOROPHORE_DEFAULTS.turns, 1, 5),
    noiseScale: integer(settings.noiseScale, TOROPHORE_DEFAULTS.noiseScale, 1, 9),
    organRadius: integer(settings.organRadius, TOROPHORE_DEFAULTS.organRadius, 60, 180, 10)
  });
  const count = parameters.organCount === 480 ? "W*2/3" : parameters.organCount;
  const radius = parameters.organRadius === 120 ? "W/6" : parameters.organRadius;
  const noise = parameters.noiseScale === 1
    ? "noise(i-C)"
    : `noise((i-C)/${parameters.noiseScale})`;
  const code = `C=0
setup=_=>createCanvas(W=720,W,WEBGL)&noStroke()
draw=_=>{clear();C+=${parameters.genomeSpeed}
for(i=${count};i>0;i--){
d=${noise}*TAU*${parameters.turns}
fill(map(sin(d),-1,1,255,0))
push()
translate(cos(d)*i,sin(d)*i,0)
torus(${radius})
pop()}}`;
  const identity = [
    parameters.genomeSpeed,
    parameters.organCount,
    parameters.turns,
    parameters.noiseScale,
    parameters.organRadius
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
