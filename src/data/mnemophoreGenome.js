import { selectRawBudgetVariant } from "../lib/codeBudget.js";

export const MNEMOPHORE_CORE_GENOME = `p=[],t=0,draw=_=>{t||createCanvas(w=400,w);background(9,32).stroke(w,80);t+=.03;p=p.map(v=>(point(x=v.x*110+200,y=v.y*110+200),z=v.z*110,v.add(sin(v.y*9+t)/90,cos(v.x*8-t)/90,sin(v.x*7+v.y*6)/120)))[999]?p.slice(-980):[...p,...Array(20).fill().map(p5.Vector.random3D)]}`;

export const MNEMOPHORE_COLOR_GENOME = `p=[],t=0,draw=_=>{t||(createCanvas(w=400,w),colorMode(HSB));background(9,24);t+=.03;p=p.map((v,i)=>(stroke((i/4+t*90)%255,180+75*sin(v.z*6),255,90),point(x=v.x*110+200,y=v.y*110+200),z=v.z*110,v.add(sin(v.y*9+t)/90,cos(v.x*8-t)/90,sin(v.x*7+v.y*6)/120)))[999]?p.slice(-980):[...p,...Array(20).fill().map(p5.Vector.random3D)]}`;

export const MNEMOPHORE_NETWORK_GENOME = `p=[],t=0,draw=_=>{t||(createCanvas(w=400,w),colorMode(HSB));background(9,14);t+=.022;p=p.map((v,i)=>(x=v.x*112+200,y=v.y*112+200,z=v.z*112,u=p[i-1]||v,U=p[i-34]||v,X=u.x*112+200,Y=u.y*112+200,Z=u.z*112,stroke((i+t*110)%255,190+65*sin(v.z*5),255,62),i%3||line(x,y,X,Y),X=U.x*112+200,Y=U.y*112+200,Z=U.z*112,i%5||line(x,y,X,Y),point(x,y),v.add((sin(v.y*9+t)+cos(v.z*5-t))/160,(cos(v.x*8-t)+sin(v.z*7+t))/160,(sin(v.x*7+v.y*6)+cos(t+v.z*8))/180)))[1499]?p.slice(-1470):[...p,...Array(30).fill().map(p5.Vector.random3D)]}`;

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
    title: "Ядро памяти",
    description: "Точки рождаются на сфере, сохраняются между кадрами и заменяются поколениями.",
    features: Object.freeze(["память координат", "рождение и замена", "3D-камера"]),
    sketch: sketch("mnemophore-memory-core", MNEMOPHORE_CORE_GENOME)
  }),
  Object.freeze({
    id: "memory-color",
    rank: 1,
    label: "Цвет",
    title: "Хроматическая память",
    description: "К ядру добавляется цветовая формула, связанная с возрастом и положением частицы.",
    features: Object.freeze(["память координат", "рождение и замена", "3D-камера", "формульный цвет"]),
    sketch: sketch("mnemophore-memory-color", MNEMOPHORE_COLOR_GENOME)
  }),
  Object.freeze({
    id: "memory-network",
    rank: 2,
    label: "Сеть",
    title: "Сеть памяти",
    description: "Два процедурных соседства соединяют частицы в меняющуюся пространственную ткань.",
    features: Object.freeze(["память координат", "рождение и замена", "3D-камера", "формульный цвет", "два семейства рёбер"]),
    sketch: sketch("mnemophore-memory-network", MNEMOPHORE_NETWORK_GENOME)
  })
]);

export const MNEMOPHORE_GENOME_SKETCH = MNEMOPHORE_RAW_VARIANTS[0].sketch;

export function compileMnemophoreBudget(budget) {
  return selectRawBudgetVariant(MNEMOPHORE_RAW_VARIANTS, budget);
}
