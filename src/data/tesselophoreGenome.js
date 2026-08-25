import { selectRawBudgetVariant } from "../lib/codeBudget.js";

export const TESSELOPHORE_CORE_GENOME = `t=0,draw=_=>{t++||(createCanvas(w=400,w),p=Array(1e3).fill().map(_=>createVector()));background(9,20).stroke(w,90);p.map((v,i)=>(u=i/200,a=i%200/32,r=70*sin(PI*u/5)**.6,v.lerp(40*(u-2.5),r*cos(a)+12*sin(t/20-u),r*sin(a),.03),z=v.z,point(v.x+200,v.y+200)))}//#つぶやきProcessing`;

export const TESSELOPHORE_EXCHANGE_GENOME = `p=[],t=0,draw=_=>{t++||(createCanvas(w=400,w),colorMode(HSB));background(9,15);p[0]||(p=Array(1e3).fill().map(_=>p5.Vector.random3D().mult(70)));p=p.map((v,i)=>(i==t%1e3&&(v=p5.Vector.random3D().mult(70)),u=i/200,a=i%200/32,r=70*sin(PI*u/5)**.6,q=(v.x/8|0)^(v.y/8|0),v.lerp(40*(u-2.5),r*cos(a)+12*sin(t/20-u),r*sin(a),.03).add(sin(q+t/20)/5,cos(q-t/20)/5),stroke((t-i+1e3)%1e3/4,200,255,90),z=v.z,point(v.x+200,v.y+200),v))}//#つぶやきProcessing`;

export const TESSELOPHORE_TISSUE_GENOME = `p=[],t=0,draw=_=>{t++||(createCanvas(w=400,w),colorMode(HSB));background(9,12);p[0]||(p=Array(1e3).fill().map(_=>p5.Vector.random3D().mult(70)));p=p.map((v,i)=>(i==t%1e3&&(v=p5.Vector.random3D().mult(70)),u=i/200,a=i%200/32,r=70*sin(PI*u/5)**.6,q=(v.x/8|0)^(v.y/8|0),v.lerp(40*(u-2.5),r*cos(a)+12*sin(t/20-u),r*sin(a),.03).add(sin(q+t/20)/5,cos(q-t/20)/5),stroke((t-i+1e3)%1e3/4,200,255,55),z=v.z,X=v.x,Y=v.y,U=p[i-200]||v,i>199&&(Z=U.z,line(X+200,Y+200,U.x+200,U.y+200)),i%20||i&&(U=p[i-1],Z=U.z,line(X+200,Y+200,U.x+200,U.y+200)),point(X+200,Y+200),v))}//#つぶやきProcessing`;

const sketch = (id, code) => Object.freeze({
  id,
  code,
  viewModel: "point-cloud-orbit"
});

export const TESSELOPHORE_RAW_VARIANTS = Object.freeze([
  Object.freeze({
    id: "memory-body",
    rank: 0,
    label: "Тело",
    title: "Сосуд памяти",
    description: "Постоянные точки догоняют одну пульсирующую оболочку; форма уже зависит от своей прошлой траектории.",
    features: Object.freeze(["цельная оболочка", "память координат", "бегущая складка", "3D-камера"]),
    sketch: sketch("tesselophore-memory-body", TESSELOPHORE_CORE_GENOME)
  }),
  Object.freeze({
    id: "cell-exchange",
    rank: 1,
    label: "Обмен",
    title: "Клеточный обмен",
    description: "XOR-клетки возмущают оболочку, одна частица рождается заново каждый кадр, а цвет показывает её возраст.",
    features: Object.freeze(["цельная оболочка", "память координат", "бегущая складка", "3D-камера", "XOR-поле", "смена поколений", "возрастной цвет", "память экрана"]),
    sketch: sketch("tesselophore-cell-exchange", TESSELOPHORE_EXCHANGE_GENOME)
  }),
  Object.freeze({
    id: "living-tissue",
    rank: 2,
    label: "Ткань",
    title: "Обновляемая ткань",
    description: "Продольные и поперечные связи проявляют оболочку, клетки которой продолжают рождаться, стареть и покидать тело.",
    features: Object.freeze(["цельная оболочка", "память координат", "бегущая складка", "3D-камера", "XOR-поле", "смена поколений", "возрастной цвет", "память экрана", "связная ткань"]),
    sketch: sketch("tesselophore-living-tissue", TESSELOPHORE_TISSUE_GENOME)
  })
]);

export const TESSELOPHORE_GENOME_SKETCH = TESSELOPHORE_RAW_VARIANTS[0].sketch;

export function compileTesselophoreBudget(budget) {
  return selectRawBudgetVariant(TESSELOPHORE_RAW_VARIANTS, budget);
}
