export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;r=70*sin(PI*u/5)**.6*(1-u/6);z=r*sin(v)*(1+.4*sin(2*v+u));x=(u-2.5)*60;a=t/3;stroke(155+99*sin(v+t),200,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+3*u*u*sin(t-u)+200)}}//#つぶやきProcessing`;

export const PELAGION_LIVING_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;s=sin(t*4-u)**3;r=60*sin(PI*u/5)**.6*(1+s/9);z=r*sin(v)*(1+s/4);x=(u-2.5)*(60-5*s);a=t/3;stroke(180+70*s,220,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+4*u*u*s+200)}}//#つぶやきProcessing`;

export const PELAGION_GENOME_CHARACTERS = PELAGION_GENOME.length;
export const PELAGION_LIVING_GENOME_CHARACTERS = PELAGION_LIVING_GENOME.length;

export const PELAGION_GENOME_SKETCH = Object.freeze({
  id: "pelagion-280",
  code: PELAGION_GENOME,
  viewModel: "pelagion-orbit"
});

export const PELAGION_LIVING_GENOME_SKETCH = Object.freeze({
  id: "pelagion-living-280",
  code: PELAGION_LIVING_GENOME,
  viewModel: "pelagion-orbit"
});

export const PELAGION_RAW_VARIANTS = Object.freeze([
  Object.freeze({
    id: "canonical",
    label: "Исходный RAW",
    title: "Минимальный эмбрион",
    description: "Канонический непрерывный геном Пелагиона без лабораторной хореографии.",
    sketch: PELAGION_GENOME_SKETCH
  }),
  Object.freeze({
    id: "living-stroke",
    label: "RAW гребка",
    title: "Живой гребок RAW",
    description: "Одна бегущая фаза управляет сжатием, раскрытием глубины, хвостом и цветом внутри лимита 280 символов.",
    sketch: PELAGION_LIVING_GENOME_SKETCH
  })
]);
