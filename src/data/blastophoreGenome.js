import { selectRawBudgetVariant } from "../lib/codeBudget.js";

export const BLASTOPHORE_GENOME_LIMIT = 280;

const BLASTOPHORE_SOURCE = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;b=sin(t/2)**2;g=exp(-sq(u-4));n=exp(-9*sq(u-3.2));r=60*sin(PI*u/5)**.6*(1+b*g)*(1-b*n);x=(u-2.5)*55+70*b*g;z=r*sin(v);stroke(155+99*b*g,220,w);point(x+200,r*cos(v)+200)`;
const BLASTOPHORE_SIGNATURE = `//#つぶやきProcessing`;
const BLASTOPHORE_NUCLEI = `q=exp(-4*(u-2)**2)+b*exp(-5*(u-4)**2);i%4||(stroke(255,60+195*b,80),z=r*q*sin(v)/3,point(x+200,r*q*cos(v)/3+200))`;
const BLASTOPHORE_CROSS_TISSUE = `i%4||(V=v+1/6,stroke(80,255,180,90),Z=r*sin(V),line(x+200,r*cos(v)+200,x+200,r*cos(V)+200))`;
const BLASTOPHORE_LONG_TISSUE = `i%10||u<.05||(U=u-.05,G=exp(-sq(U-4)),R=60*sin(PI*U/5)**.6*(1+b*G)*(1-b*exp(-9*(U-3.2)**2)),X=(U-2.5)*55+70*b*G,Z=R*sin(v),line(x+200,r*cos(v)+200,X+200,R*cos(v)+200))`;
const BLASTOPHORE_SIGNAL = `m=sin(6*t-u*2)**12;i%4||(stroke(w,220,80,w*m),z=r*(1+m/6)*sin(v),point(x+200,r*(1+m/6)*cos(v)+200));i%40||(stroke(255,180,40,w*m),z=0,Z=r*m*sin(v),line(x+200,200,x+200,r*m*cos(v)+200))`;
const BLASTOPHORE_TISSUE = `${BLASTOPHORE_CROSS_TISSUE};${BLASTOPHORE_LONG_TISSUE}`;

const closeGenome = additions => `${BLASTOPHORE_SOURCE}${additions ? `;${additions}` : ""}}}${BLASTOPHORE_SIGNATURE}`;

export const BLASTOPHORE_GENOME = closeGenome();
export const BLASTOPHORE_NUCLEI_GENOME = closeGenome(BLASTOPHORE_NUCLEI);
export const BLASTOPHORE_TISSUE_GENOME = closeGenome(`${BLASTOPHORE_TISSUE};${BLASTOPHORE_NUCLEI}`);
export const BLASTOPHORE_SIGNAL_GENOME = closeGenome(`${BLASTOPHORE_TISSUE};${BLASTOPHORE_NUCLEI};${BLASTOPHORE_SIGNAL}`);
export const BLASTOPHORE_GENOME_CHARACTERS = BLASTOPHORE_GENOME.length;

const sketch = (id, code) => Object.freeze({
  id,
  code,
  viewModel: "point-cloud-orbit"
});

const baseFeatures = Object.freeze(["цельная оболочка", "циклическое почкование", "шейка-сингулярность", "формульный цвет", "3D-камера"]);
const nucleiFeatures = Object.freeze([...baseFeatures, "материнское ядро", "дочернее ядро"]);
const tissueFeatures = Object.freeze([...nucleiFeatures, "поперечные кольца ткани", "продольные волокна"]);
const signalFeatures = Object.freeze([...tissueFeatures, "морфогенетический фронт", "локальное расширение ткани", "радиальные сигналы"]);

const variant = (id, rank, label, title, description, features, code) => Object.freeze({
  id,
  rank,
  label,
  title,
  description,
  features,
  sketch: sketch(`blastophore-${id}`, code)
});

export const BLASTOPHORE_RAW_VARIANTS = Object.freeze([
  variant("budding", 0, "Почкование", "Цикл почкования", "Одна оболочка медленно выращивает дочернюю долю, стягивает шейку до сингулярности и снова собирается.", baseFeatures, BLASTOPHORE_GENOME),
  variant("nuclei", 1, "+ ядра", "Разделение ядер", "В материнском теле остаётся яркое ядро, а внутри растущей почки постепенно проявляется его дочерняя копия.", nucleiFeatures, BLASTOPHORE_NUCLEI_GENOME),
  variant("tissue", 2, "+ ткань", "Ткань деления", "Поперечные кольца и продольные волокна показывают, как оболочка растягивается и схлопывается в шейке.", tissueFeatures, BLASTOPHORE_TISSUE_GENOME),
  variant("signal", 3, "+ сигнал", "Морфогенетический сигнал", "Узкий золотой фронт проходит вдоль ткани, локально расширяет её и связывает ось с активной оболочкой.", signalFeatures, BLASTOPHORE_SIGNAL_GENOME)
]);

export const BLASTOPHORE_GENOME_SKETCH = BLASTOPHORE_RAW_VARIANTS[0].sketch;

export function compileBlastophoreBudget(budget) {
  return selectRawBudgetVariant(BLASTOPHORE_RAW_VARIANTS, budget);
}
