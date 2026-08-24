export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;r=70*sin(PI*u/5)**.6*(1-u/6);z=r*sin(v)*(1+.4*sin(2*v+u));x=(u-2.5)*60;a=t/3;stroke(155+99*sin(v+t),200,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+3*u*u*sin(t-u)+200)}}//#つぶやきProcessing`;

const PELAGION_LIVING_SOURCE = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;s=sin(t*4-u)**3;r=60*sin(PI*u/5)**.6*(1+s/9);z=r*sin(v)*(1+s/4);x=(u-2.5)*(60-5*s);a=t/3;stroke(180+70*s,220,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+4*u*u*s+200)`;
const PELAGION_SIGNATURE = `//#つぶやきProcessing`;

export const PELAGION_LIVING_GENOME = `${PELAGION_LIVING_SOURCE}}}${PELAGION_SIGNATURE}`;

const closeLivingGenome = source => `${source}}}${PELAGION_SIGNATURE}`;
const extendLivingGenome = (source, addition) => `${source};${addition}}}${PELAGION_SIGNATURE}`;
const PELAGION_CORE_ADDITION = `A=x*cos(a)+z*sin(a)+200,B=r*cos(v)+4*u*u*s+200;i%40||(stroke(255,220,80,220),point(A,4*u*u*s+200));i%4||(stroke(255,55,170,210),point(x*cos(a)+.45*z*sin(a)+200,.45*r*cos(v)+4*u*u*s+200))`;
const PELAGION_CROSS_RIBS_ADDITION = `i%200<40&&(V=v+1/6,stroke(80,255,210,115),line(A,B,x*cos(a)+r*sin(V)*(1+s/4)*sin(a)+200,r*cos(V)+4*u*u*s+200))`;
const PELAGION_LONG_RIBS_ADDITION = `i%10||(U=u-.08,S=sin(t*4-U)**3,R=60*sin(PI*U/5)**.6*(1+S/9),X=(U-2.5)*(60-5*S),Z=R*sin(v)*(1+S/4),stroke(80,255,210,80),line(A,B,X*cos(a)+Z*sin(a)+200,R*cos(v)+4*U*U*S+200))`;
const PELAGION_NERVE_ADDITION = `n=sin(7*t-u)**8;stroke(w,220,80,w*n);C=4*u*u*s+200;i%40||line(A,C,A,B+n*r*cos(v)/8);i%10||point(A+n*z*sin(a)/8,B+n*r*cos(v)/8)`;
const PELAGION_STRUCTURE_ADDITION = `${PELAGION_CORE_ADDITION};${PELAGION_CROSS_RIBS_ADDITION};${PELAGION_LONG_RIBS_ADDITION}`;

export const PELAGION_LIVING_CORE_GENOME = extendLivingGenome(PELAGION_LIVING_SOURCE, PELAGION_CORE_ADDITION);
export const PELAGION_LIVING_STRUCTURE_GENOME = extendLivingGenome(PELAGION_LIVING_SOURCE, PELAGION_STRUCTURE_ADDITION);
export const PELAGION_LIVING_NERVOUS_GENOME = extendLivingGenome(PELAGION_LIVING_SOURCE, `${PELAGION_STRUCTURE_ADDITION};${PELAGION_NERVE_ADDITION}`);

export const PELAGION_GENOME_CHARACTERS = PELAGION_GENOME.length;
export const PELAGION_LIVING_GENOME_CHARACTERS = PELAGION_LIVING_GENOME.length;

const sketch = (id, code) => Object.freeze({ id, code, viewModel: "pelagion-orbit" });

export const PELAGION_GENOME_SKETCH = sketch("pelagion-280", PELAGION_GENOME);
export const PELAGION_LIVING_GENOME_SKETCH = sketch("pelagion-living-280", PELAGION_LIVING_GENOME);

const sharedFeatures = Object.freeze(["цельная непрерывная оболочка", "живой гребок", "формульный цвет", "3D-камера"]);
const coreFeatures = Object.freeze([...sharedFeatures, "светящийся внутренний орган", "золотая ось"]);
const structureFeatures = Object.freeze([...coreFeatures, "поперечные кольца", "продольные связи", "двухнаправленная сетка"]);
const nervousFeatures = Object.freeze([...structureFeatures, "автономный пейсмейкер", "бегущий нервный импульс", "локальное сокращение ткани"]);

const budgetVariant = (id, rank, label, title, description, features, code) => Object.freeze({
  id,
  rank,
  label,
  title,
  description,
  features,
  sketch: sketch(`pelagion-${id}`, code)
});

function replaceMicroGene(source, before, after) {
  const index = source.indexOf(before);
  if (index < 0 || source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pelagion microgene must occur exactly once: ${before}`);
  }
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

const MICRO_OPERATORS = Object.freeze({
  twist: source => replaceMicroGene(source, `v=i%40/6`, `v=i%40/6+u`),
  split: source => replaceMicroGene(source, `s=sin(t*4-u)**3`, `s=sin(t*4-u+i%2)**3`),
  sharp: source => replaceMicroGene(source, `s=sin(t*4-u)**3`, `s=sin(t*4-u)**5`),
  polarity: source => replaceMicroGene(source, `stroke(180+70*s,220,255)`, `stroke(180+70*s,44*u,w)`)
});

function mutateLivingSource(operators) {
  return operators.reduce((source, operator) => MICRO_OPERATORS[operator](source), PELAGION_LIVING_SOURCE);
}

function evolutionVariants(root, source) {
  const rootCode = closeLivingGenome(source);
  const prefix = root.id === "living-stroke" ? "pelagion" : `pelagion-${root.id}`;
  const rootTitle = root.id === "living-stroke" ? "Цельный Пелагион" : root.title;
  const withLayer = layer => root.id === "living-stroke" ? `Пелагион + ${layer}` : `${root.title} + ${layer}`;
  return Object.freeze([
    budgetVariant(`${prefix}-body`, 0, root.label, rootTitle, root.description, sharedFeatures, rootCode),
    budgetVariant(`${prefix}-core`, 1, "+ орган", withLayer("орган"), "Исходный микрогеном остаётся прежним; внутри появляется яркий пульсирующий орган с золотой осью.", coreFeatures, extendLivingGenome(source, PELAGION_CORE_ADDITION)),
    budgetVariant(`${prefix}-structure`, 2, "+ сетка", withLayer("сетка"), "К прежней оболочке и органу добавляется контрастная сетка поперечных колец и продольных связей.", structureFeatures, extendLivingGenome(source, PELAGION_STRUCTURE_ADDITION)),
    budgetVariant(`${prefix}-nervous`, 3, "+ импульс", withLayer("нервная система"), "Пейсмейкер создаёт собственную фазу: золотой импульс проходит вдоль сетки и локально расширяет ткань.", nervousFeatures, extendLivingGenome(source, `${PELAGION_STRUCTURE_ADDITION};${PELAGION_NERVE_ADDITION}`))
  ]);
}

function microVariant(id, label, title, description, operators = []) {
  const source = mutateLivingSource(operators);
  const code = closeLivingGenome(source);
  if (code.length > PELAGION_GENOME_LIMIT) {
    throw new Error(`Pelagion microgenome ${id} exceeds ${PELAGION_GENOME_LIMIT} characters`);
  }
  const root = { id, label, title, description };
  return Object.freeze({
    ...root,
    operators: Object.freeze([...operators]),
    sketch: sketch(`pelagion-${id}-280`, code),
    budgetVariants: evolutionVariants(root, source)
  });
}

export const PELAGION_MICRO_VARIANTS = Object.freeze([
  microVariant("living-stroke", "Канон", "Цельный Пелагион", "Точный 274-символьный живой гребок из версии 34fe67e без изменений."),
  microVariant("chiral-twin", "Хиральный", "Хиральный близнец", "Продольный поворот, чередование фаз и цветовая полярность создают асимметричного родственника.", ["twist", "split", "polarity"]),
  microVariant("sharp-pulse", "Резкий пульс", "Резкий пульс", "Пятая степень фазы собирает мягкий гребок в короткое и более контрастное сокращение.", ["sharp"]),
  microVariant("color-polarity", "Полярность", "Цветовая полярность", "Геометрия канона сохраняется, а две цветовые координаты становятся функциями продольной позиции.", ["polarity"])
]);

export const PELAGION_BUDGET_VARIANTS_BY_MODE = Object.freeze(Object.fromEntries(
  PELAGION_MICRO_VARIANTS.map(variant => [variant.id, variant.budgetVariants])
));

export const PELAGION_EVOLUTION_VARIANTS = PELAGION_BUDGET_VARIANTS_BY_MODE["living-stroke"];

export const PELAGION_RAW_VARIANTS = Object.freeze([
  Object.freeze({
    id: "canonical",
    label: "Архивный предок",
    title: "Архивный RAW",
    description: "Первая непрерывная версия сохранена для сравнения, но не смешивается с основной линией развития.",
    sketch: PELAGION_GENOME_SKETCH
  }),
  Object.freeze({
    id: "living-stroke",
    label: "Живой гребок RAW",
    title: "Цельный Пелагион",
    description: "Удачный силовой гребок становится неизменным основанием всех последующих уровней.",
    sketch: PELAGION_LIVING_GENOME_SKETCH
  })
]);
