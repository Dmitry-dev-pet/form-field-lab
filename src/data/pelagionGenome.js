export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;r=70*sin(PI*u/5)**.6*(1-u/6);z=r*sin(v)*(1+.4*sin(2*v+u));x=(u-2.5)*60;a=t/3;stroke(155+99*sin(v+t),200,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+3*u*u*sin(t-u)+200)}}//#つぶやきProcessing`;

const PELAGION_LIVING_SOURCE = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;s=sin(t*4-u)**3;r=60*sin(PI*u/5)**.6*(1+s/9);z=r*sin(v)*(1+s/4);x=(u-2.5)*(60-5*s);a=t/3;stroke(180+70*s,220,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+4*u*u*s+200)`;
const PELAGION_SIGNATURE = `//#つぶやきProcessing`;

export const PELAGION_LIVING_GENOME = `${PELAGION_LIVING_SOURCE}}}${PELAGION_SIGNATURE}`;

const extendLivingGenome = addition => `${PELAGION_LIVING_SOURCE};${addition}}}${PELAGION_SIGNATURE}`;
const PELAGION_CORE_ADDITION = `i%40||(stroke(255,90,160,100),point(x*cos(a)+z*sin(a)+200,4*u*u*s+200));i%8||(stroke(255,120,180,65),point(x*cos(a)+.42*z*sin(a)+200,.42*r*cos(v)+4*u*u*s+200))`;
const PELAGION_STRUCTURE_ADDITION = `u>.02&&i%10<1&&(U=u-.02,S=sin(t*4-U)**3,R=60*sin(PI*U/5)**.6*(1+S/9),X=(U-2.5)*(60-5*S),Z=R*sin(v)*(1+S/4),Y=R*cos(v)+4*U*U*S,stroke(80,255,210,42),line(x*cos(a)+z*sin(a)+200,r*cos(v)+4*u*u*s+200,X*cos(a)+Z*sin(a)+200,Y+200))`;

export const PELAGION_LIVING_CORE_GENOME = extendLivingGenome(PELAGION_CORE_ADDITION);
export const PELAGION_LIVING_STRUCTURE_GENOME = extendLivingGenome(
  `${PELAGION_STRUCTURE_ADDITION};${PELAGION_CORE_ADDITION}`
);

export const PELAGION_GENOME_CHARACTERS = PELAGION_GENOME.length;
export const PELAGION_LIVING_GENOME_CHARACTERS = PELAGION_LIVING_GENOME.length;

const sketch = (id, code) => Object.freeze({ id, code, viewModel: "pelagion-orbit" });

export const PELAGION_GENOME_SKETCH = sketch("pelagion-280", PELAGION_GENOME);
export const PELAGION_LIVING_GENOME_SKETCH = sketch("pelagion-living-280", PELAGION_LIVING_GENOME);

const sharedFeatures = Object.freeze(["цельная непрерывная оболочка", "живой гребок", "формульный цвет", "3D-камера"]);
const coreFeatures = Object.freeze([...sharedFeatures, "внутренняя лента", "светящаяся ось"]);
const structureFeatures = Object.freeze([...coreFeatures, "продольные нити оболочки"]);

const budgetVariant = (id, rank, label, title, description, features, code) => Object.freeze({
  id,
  rank,
  label,
  title,
  description,
  features,
  sketch: sketch(`pelagion-${id}`, code)
});

export const PELAGION_EVOLUTION_VARIANTS = Object.freeze([
  budgetVariant("pelagion-body", 0, "Пелагион", "Цельный Пелагион", "Точный 274-символьный живой гребок из версии 34fe67e без изменений.", sharedFeatures, PELAGION_LIVING_GENOME),
  budgetVariant("pelagion-core", 1, "+ ядро", "Пелагион + ядро", "Цельная оболочка остаётся буквально прежней; внутренняя лента и ось добавляются поверх неё.", coreFeatures, PELAGION_LIVING_CORE_GENOME),
  budgetVariant("pelagion-structure", 2, "+ ткань", "Пелагион + ткань", "К прежней оболочке и ядру добавляются полупрозрачные продольные нити.", structureFeatures, PELAGION_LIVING_STRUCTURE_GENOME)
]);

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
