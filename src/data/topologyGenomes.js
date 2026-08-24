export const TOPOLOGY_GENOME_LIMIT = 280;

const control = (key, label, min, max, step = 1, options = {}) => Object.freeze({
  key, label, min, max, step, ...options
});

function integer(value, fallback, min, max) {
  const number = Math.round(Number(value));
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : fallback));
}

function decimalHundredths(value) {
  const digits = String(integer(value, 48, 20, 79)).padStart(2, "0");
  return digits.endsWith("0") ? `.${digits[0]}` : `.${digits}`;
}

function movingTime(speed) {
  return speed === 1 ? "t" : `t*${speed}`;
}

function preset(definition) {
  return Object.freeze({
    limit: TOPOLOGY_GENOME_LIMIT,
    ...definition,
    defaults: Object.freeze({ topology: definition.id, ...definition.defaults }),
    controls: Object.freeze(definition.controls)
  });
}

export const TOPOLOGY_GENOME_PRESETS = Object.freeze([
  preset({
    id: "sphere",
    label: "Сфера",
    shortLabel: "S²",
    grid: Object.freeze({ columns: 32, rows: 16 }),
    defaults: { genomeA: 99, genomeB: 30, genomeProjection: 48, genomeSpeed: 1, alpha: 96 },
    controls: [
      control("genomeA", "Радиус", 60, 99),
      control("genomeProjection", "Наклон глубины", 20, 79, 1, { format: "codeFraction" }),
      control("genomeSpeed", "Темп", 1, 9, 1, { format: "integerSpeed" }),
      control("alpha", "Прозрачность", 30, 99)
    ],
    compile(parameters) {
      const { a, projection, speed, alpha } = parameters;
      const time = movingTime(speed);
      return `P=(u,v,q=${a}*sin(v),a=u-${time}/99)=>[q*cos(a)+200,${a}*cos(v)*.88-q*sin(a)*${projection}+200]\nt=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,${alpha});for(i=480;i--;){u=i%32*PI/16,v=(i>>5)*PI/15,A=P(u,v),B=P(u+PI/16,v),C=P(u,v+PI/15),line(...A,...B),line(...A,...C)}}//#つぶやきProcessing`;
    }
  }),
  preset({
    id: "ichthyo",
    label: "Ихтиоморф",
    shortLabel: "S² swim",
    grid: Object.freeze({ columns: 30, rows: 16 }),
    defaults: { genomeA: 50, genomeB: 3, genomeProjection: 48, genomeSpeed: 1, alpha: 96 },
    controls: [
      control("genomeA", "Толщина тела", 30, 99),
      control("genomeB", "Хвостовая волна", 1, 9),
      control("genomeProjection", "Наклон глубины", 20, 79, 1, { format: "codeFraction" }),
      control("genomeSpeed", "Темп", 1, 9, 1, { format: "integerSpeed" }),
      control("alpha", "Прозрачность", 30, 99)
    ],
    compile(parameters) {
      const { a, b, projection, speed, alpha } = parameters;
      const time = movingTime(speed);
      return `P=(u,v,q=${a}*sin(v),a=u-${time}/99)=>[q*cos(a)+${b}*v*v*sin(${time}-v)+200,99*cos(v)-q*sin(a)*${projection}+200]\nt=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,${alpha});for(i=7200;i--;j=i>>4,s=i%8*PI/105,h=i%16<8,point(...P(j%30*PI/15+h*s,(j/30|0)*PI/15+!h*s)));}//#つぶやきProcessing`;
    }
  }),
  preset({
    id: "plane",
    label: "Плоскость",
    shortLabel: "R²",
    grid: Object.freeze({ columns: 26, rows: 13 }),
    defaults: { genomeA: 12, genomeB: 35, genomeProjection: 40, genomeSpeed: 1, alpha: 96 },
    controls: [
      control("genomeA", "Амплитуда волны", 10, 29),
      control("genomeB", "Длина волны", 20, 49),
      control("genomeProjection", "Наклон глубины", 20, 79, 1, { format: "codeFraction" }),
      control("genomeSpeed", "Темп", 1, 9, 1, { format: "integerSpeed" }),
      control("alpha", "Прозрачность", 30, 99)
    ],
    compile(parameters) {
      const { a, b, projection, speed, alpha } = parameters;
      const time = movingTime(speed);
      return `P=(u,v,z=${a}*sin(u/${b}-${time}/20),a=${time}/99)=>[u*cos(a)+z*sin(a)+200,v-z*cos(a)*${projection}]\nt=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,${alpha});for(i=300;i--;){u=i%25*13-156,v=(i/25|0)*23+70,A=P(u,v),B=P(u+13,v),C=P(u,v+23),line(...A,...B),line(...A,...C)}}//#つぶやきProcessing`;
    }
  }),
  preset({
    id: "cylinder",
    label: "Цилиндр",
    shortLabel: "S¹×I",
    grid: Object.freeze({ columns: 32, rows: 16 }),
    defaults: { genomeA: 99, genomeB: 30, genomeProjection: 48, genomeSpeed: 1, alpha: 96 },
    controls: [
      control("genomeA", "Радиус", 60, 99),
      control("genomeProjection", "Наклон глубины", 20, 79, 1, { format: "codeFraction" }),
      control("genomeSpeed", "Темп", 1, 9, 1, { format: "integerSpeed" }),
      control("alpha", "Прозрачность", 30, 99)
    ],
    compile(parameters) {
      const { a, projection, speed, alpha } = parameters;
      const time = movingTime(speed);
      return `P=(u,v,a=u-${time}/99)=>[${a}*cos(a)+200,v-${a}*sin(a)*${projection}+70]\nt=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,${alpha});for(i=480;i--;){u=i%32*PI/16,v=(i>>5)*18,A=P(u,v),B=P(u+PI/16,v),C=P(u,v+18),line(...A,...B),line(...A,...C)}}//#つぶやきProcessing`;
    }
  }),
  preset({
    id: "torus",
    label: "Тор",
    shortLabel: "T²",
    grid: Object.freeze({ columns: 32, rows: 16 }),
    defaults: { genomeA: 70, genomeB: 30, genomeProjection: 48, genomeSpeed: 1, alpha: 96 },
    controls: [
      control("genomeA", "Большой радиус", 50, 89),
      control("genomeB", "Радиус трубки", 20, 39),
      control("genomeProjection", "Наклон глубины", 20, 79, 1, { format: "codeFraction" }),
      control("genomeSpeed", "Темп", 1, 9, 1, { format: "integerSpeed" }),
      control("alpha", "Прозрачность", 30, 99)
    ],
    compile(parameters) {
      const { a, b, projection, speed, alpha } = parameters;
      const time = movingTime(speed);
      return `P=(u,v,q=${a}+${b}*cos(v),a=u-${time}/99)=>[q*cos(a)+200,${b}*sin(v)*.88-q*sin(a)*${projection}+200]\nt=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,${alpha});for(i=512;i--;){u=i%32*PI/16,v=(i>>5)*PI/8,A=P(u,v),B=P(u+PI/16,v),C=P(u,v+PI/8),line(...A,...B),line(...A,...C)}}//#つぶやきProcessing`;
    }
  }),
  preset({
    id: "sphere-torus",
    label: "Сфера↔тор",
    shortLabel: "S²↔T²",
    grid: Object.freeze({ columns: 32, rows: 16 }),
    defaults: { genomeA: 50, genomeB: 30, genomeProjection: 48, genomeSpeed: 1, alpha: 96 },
    controls: [
      control("genomeA", "Радиус семейства", 30, 60),
      control("genomeProjection", "Наклон глубины", 20, 79, 1, { format: "codeFraction" }),
      control("genomeSpeed", "Темп перехода", 1, 9, 1, { format: "integerSpeed" }),
      control("alpha", "Прозрачность", 30, 99)
    ],
    compile(parameters) {
      const { a: radius, projection, speed, alpha } = parameters;
      const time = movingTime(speed);
      return `P=(u,v,a=${time}/99,q=${radius}*(1+sin(a)+cos(v)),U=u-a)=>[q*cos(U)+200,${radius}*sin(v)-q*sin(U)*${projection}+200]\nt=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,${alpha});for(i=512;i--;){u=i%32*(p=PI/16),v=(i>>5)*p*2,A=P(u,v),line(...A,...P(u+p,v)),line(...A,...P(u,v+p*2))}}//#つぶやきProcessing`;
    }
  }),
  preset({
    id: "mobius",
    label: "Мёбиус",
    shortLabel: "M",
    grid: Object.freeze({ columns: 32, rows: 15 }),
    defaults: { genomeA: 70, genomeB: 4, genomeProjection: 48, genomeSpeed: 1, alpha: 96 },
    controls: [
      control("genomeA", "Радиус кольца", 50, 89),
      control("genomeB", "Ширина ленты", 3, 7),
      control("genomeProjection", "Наклон глубины", 20, 79, 1, { format: "codeFraction" }),
      control("genomeSpeed", "Темп", 1, 9, 1, { format: "integerSpeed" }),
      control("alpha", "Прозрачность", 30, 99)
    ],
    compile(parameters) {
      const { a, b, projection, speed, alpha } = parameters;
      const time = movingTime(speed);
      return `P=(u,v,q=${a}+v*cos(u/2),a=u-${time}/99)=>[q*cos(a)+200,v*sin(u/2)*.88-q*sin(a)*${projection}+200]\nt=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,${alpha});for(i=480;i--;){u=i%32*PI/16,v=(i>>5)*${b}-${b * 7},A=P(u,v),B=P(u+PI/16,v),C=P(u,v+${b}),line(...A,...B),line(...A,...C)}}//#つぶやきProcessing`;
    }
  })
]);

const presetById = new Map(TOPOLOGY_GENOME_PRESETS.map(item => [item.id, item]));

export function topologyGenomePreset(id) {
  return presetById.get(id) || TOPOLOGY_GENOME_PRESETS[0];
}

export function compileTopologyGenome(settings = {}) {
  const selected = topologyGenomePreset(settings.topology);
  const parameters = {
    a: integer(settings.genomeA, selected.defaults.genomeA, selected.controls[0].min, selected.controls[0].max),
    b: integer(settings.genomeB, selected.defaults.genomeB, 1, 49),
    projection: decimalHundredths(settings.genomeProjection ?? selected.defaults.genomeProjection),
    projectionValue: integer(settings.genomeProjection, selected.defaults.genomeProjection, 20, 79),
    speed: integer(settings.genomeSpeed, selected.defaults.genomeSpeed, 1, 9),
    alpha: integer(settings.alpha, selected.defaults.alpha, 30, 99)
  };
  const code = selected.compile(parameters);
  const identity = [selected.id, parameters.a, parameters.b, parameters.projectionValue, parameters.speed, parameters.alpha].join("-");
  return Object.freeze({
    id: `topology-genome-${identity}`,
    code,
    characters: code.length,
    limit: TOPOLOGY_GENOME_LIMIT,
    withinLimit: code.length <= TOPOLOGY_GENOME_LIMIT,
    preset: selected,
    parameters: Object.freeze(parameters),
    sketch: Object.freeze({ id: `topology-genome-${identity}`, code })
  });
}

export function topologyGenomeDefaults(id = "sphere") {
  const selected = topologyGenomePreset(id);
  return {
    ...selected.defaults,
    columns: selected.grid.columns,
    rows: selected.grid.rows
  };
}
