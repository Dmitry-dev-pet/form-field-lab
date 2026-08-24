import { selectRawBudgetVariant } from "../lib/codeBudget.js";

export const MNEMOPHORE_CORE_GENOME = `t=0,draw=_=>{t++||(createCanvas(w=400,w),p=Array(1e3).fill().map(_=>createVector()));background(9,24).stroke(w,90);p.map((v,i)=>(q=i/50|0,a=i%50/8,h=i%5,r=h?80*sin(PI*q/27)**.7+8*sin(t/20-q):20,v.lerp(r*cos(a),h?q*5-50:30+q*9,r*sin(a),.04),z=v.z,point(v.x+200,v.y+130)))}`;

export const MNEMOPHORE_COLOR_GENOME = `t=0,draw=_=>{t++||(createCanvas(w=400,w),p=Array(1e3).fill().map(_=>createVector()),colorMode(HSB));background(9,18);p.map((v,i)=>(q=i/50|0,a=i%50/8,h=i%5,n=h==1,r=n?22*sin(PI*q/19):h?80*sin(PI*q/27)**.7+8*sin(t/20-q):20,s=!h*q*sin(t/15-q/2+a),X=r*cos(a)+s,Y=n?q*2.5-20:h?q*5-50:30+q*9,Z=r*sin(a)+!h*q*cos(t/15-q/2+a),v.lerp(X,Y,Z,.035),stroke(n?45:165+q*4+40*!h,210,255,75),z=v.z,point(v.x+200,v.y+130)))}`;

export const MNEMOPHORE_NETWORK_GENOME = `t=0,draw=_=>{t++||(createCanvas(w=400,w),p=Array(1e3).fill().map(_=>createVector()),colorMode(HSB));background(9,14);strokeWeight(.5);p.map((v,i)=>(q=i/50|0,a=i%50/8,h=i%5,n=h==1,r=n?22*sin(PI*q/19):h?80*sin(PI*q/27)**.7+8*sin(t/20-q):20,s=!h*q*sin(t/15-q/2+a),X=r*cos(a)+s,Y=n?q*2.5-20:h?q*5-50:30+q*9,Z=r*sin(a)+!h*q*cos(t/15-q/2+a),v.lerp(X,Y,Z,.035),stroke(n?45:165+q*4+40*!h,210,255,62),z=v.z,U=p[i-50]||v,q&&(Z=U.z,line(v.x+200,v.y+130,U.x+200,U.y+130)),h>2&&(U=p[i-1],Z=U.z,line(v.x+200,v.y+130,U.x+200,U.y+130)),point(v.x+200,v.y+130)))}`;

const sketch = (id, code) => Object.freeze({
  id,
  code,
  viewModel: "point-cloud-orbit"
});

export const MNEMOPHORE_RAW_VARIANTS = Object.freeze([
  Object.freeze({
    id: "memory-core",
    rank: 0,
    label: "Память",
    title: "Купол и шлейф",
    description: "Постоянные точки запаздывают за пульсирующим куполом и собираются в десять лент памяти.",
    features: Object.freeze(["узнаваемый купол", "память координат", "десять лент", "3D-камера"]),
    sketch: sketch("mnemophore-memory-core", MNEMOPHORE_CORE_GENOME)
  }),
  Object.freeze({
    id: "memory-color",
    rank: 1,
    label: "Цвет",
    title: "Светящееся ядро",
    description: "Внутри того же купола появляется отдельное ядро, формульный цвет и волна вдоль лент.",
    features: Object.freeze(["узнаваемый купол", "память координат", "десять лент", "3D-камера", "светящееся ядро", "формульный цвет"]),
    sketch: sketch("mnemophore-memory-color", MNEMOPHORE_COLOR_GENOME)
  }),
  Object.freeze({
    id: "memory-network",
    rank: 2,
    label: "Сеть",
    title: "Мембрана памяти",
    description: "Меридианы и поперечные рёбра проявляют структуру купола, ядра и каждой ленты.",
    features: Object.freeze(["узнаваемый купол", "память координат", "десять лент", "3D-камера", "светящееся ядро", "формульный цвет", "структурная мембрана"]),
    sketch: sketch("mnemophore-memory-network", MNEMOPHORE_NETWORK_GENOME)
  })
]);

export const MNEMOPHORE_GENOME_SKETCH = MNEMOPHORE_RAW_VARIANTS[0].sketch;

export function compileMnemophoreBudget(budget) {
  return selectRawBudgetVariant(MNEMOPHORE_RAW_VARIANTS, budget);
}
