export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?12*sin(t-u/4):18-u/2+9*sin(t)*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200)}}`;

export const PELAGION_LIVING_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;s=sin(4*t-u/9);x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?16*s:18-u/2+9*s*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200)}}`;

const extendLivingGenome = addition => `${PELAGION_LIVING_GENOME.slice(0, -2)};${addition}}}`;
const PELAGION_CORE_ADDITION = `h&&i%25<1&&(stroke(w,80,180,90),point(x*cos(a)+z*sin(a)+130,200));h||i%8||(x*=.42,y*=.42,z*=.42,stroke(w,110,70,105),point(x*cos(a)+z*sin(a)+130,y+200))`;
const PELAGION_STRUCTURE_ADDITION = `u&&i%25<1&&(U=u-1,R=15*U**.5,S=sin(4*t-U/9),X=h?80+5*U:R*cos(v),Y=h?U*sin(v):.6*R*sin(v),Z=h?16*S:18-U/2+9*S*sin(v)**2,stroke(w,99,190,45),line(x*cos(a)+z*sin(a)+130,y+200,X*cos(a)+Z*sin(a)+130,Y+200))`;

export const PELAGION_LIVING_CORE_GENOME = extendLivingGenome(PELAGION_CORE_ADDITION);
export const PELAGION_LIVING_STRUCTURE_GENOME = extendLivingGenome(
  `${PELAGION_STRUCTURE_ADDITION};${PELAGION_CORE_ADDITION}`
);

export const PELAGION_GENOME_CHARACTERS = PELAGION_GENOME.length;
export const PELAGION_LIVING_GENOME_CHARACTERS = PELAGION_LIVING_GENOME.length;

const sketch = (id, code) => Object.freeze({ id, code, viewModel: "pelagion-orbit" });

export const PELAGION_GENOME_SKETCH = sketch("pelagion-280", PELAGION_GENOME);
export const PELAGION_LIVING_GENOME_SKETCH = sketch("pelagion-living-280", PELAGION_LIVING_GENOME);

const sharedFeatures = Object.freeze(["узнаваемое тело", "хвостовой плавник", "формульный цвет", "3D-камера"]);
const coreFeatures = Object.freeze([...sharedFeatures, "редкое светящееся ядро", "ось хвоста"]);
const structureFeatures = Object.freeze([...coreFeatures, "редкие продольные связи"]);

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
  budgetVariant("pelagion-body", 0, "Пелагион", "Пелагион", "Тот самый силовой гребок: исходное тело, цвет и хвост без добавок.", sharedFeatures, PELAGION_LIVING_GENOME),
  budgetVariant("pelagion-core", 1, "+ ядро", "Пелагион + ядро", "Прежний Пелагион остаётся целиком; редкие внутренние точки и ось хвоста добавляются поверх него.", coreFeatures, PELAGION_LIVING_CORE_GENOME),
  budgetVariant("pelagion-structure", 2, "+ связи", "Пелагион + связи", "К прежнему телу и ядру добавляются редкие продольные связи, не закрывающие силуэт.", structureFeatures, PELAGION_LIVING_STRUCTURE_GENOME)
]);

export const PELAGION_RAW_VARIANTS = Object.freeze([
  Object.freeze({
    id: "canonical",
    label: "Архивный предок",
    title: "Архивный RAW",
    description: "Первая 279-символьная версия сохранена для сравнения, но не смешивается с основной линией развития.",
    sketch: PELAGION_GENOME_SKETCH
  }),
  Object.freeze({
    id: "living-stroke",
    label: "Пелагион 280",
    title: "Пелагион",
    description: "Удачный силовой гребок становится неизменным основанием всех последующих уровней.",
    sketch: PELAGION_LIVING_GENOME_SKETCH
  })
]);
