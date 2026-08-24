export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?12*sin(t-u/4):18-u/2+9*sin(t)*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200)}}`;

export const PELAGION_LIVING_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;s=sin(4*t-u/9);x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?16*s:18-u/2+9*s*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200)}}`;

export const PELAGION_ORGAN_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?12*sin(t-u/4):18-u/2+9*sin(t)*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200);h?(stroke(w,80,180),point(x*cos(a)+z*sin(a)+130,200)):(x*=.42,y*=.42,z*=.42,stroke(w,110,70),point(x*cos(a)+z*sin(a)+130,y+200))}}`;

export const PELAGION_LIVING_ORGAN_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;s=sin(4*t-u/9);x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?16*s:18-u/2+9*s*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200);h?(stroke(w,80,180),point(x*cos(a)+z*sin(a)+130,200)):(x*=.42,y*=.42,z*=.42,stroke(w,110,70),point(x*cos(a)+z*sin(a)+130,y+200))}}`;

export const PELAGION_NETWORK_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);b=9*sin(t);z=h?12*sin(t-u/4):18-u/2+b*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w,55);point(x*cos(a)+z*sin(a)+130,y+200);V=v-1/32;X=h?x:r*cos(V);Y=h?u*sin(V):.6*r*sin(V);Z=h?z:18-u/2+b*sin(V)**2;line(x*cos(a)+z*sin(a)+130,y+200,X*cos(a)+Z*sin(a)+130,Y+200);h?(stroke(w,80,180),point(x*cos(a)+z*sin(a)+130,200)):(x*=.42,y*=.42,z*=.42,stroke(w,110,70),point(x*cos(a)+z*sin(a)+130,y+200))}}`;

export const PELAGION_LIVING_NETWORK_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;s=sin(4*t-u/9);x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);b=9*s;z=h?16*s:18-u/2+b*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w,55);point(x*cos(a)+z*sin(a)+130,y+200);V=v-1/32;X=h?x:r*cos(V);Y=h?u*sin(V):.6*r*sin(V);Z=h?z:18-u/2+b*sin(V)**2;line(x*cos(a)+z*sin(a)+130,y+200,X*cos(a)+Z*sin(a)+130,Y+200);h?(stroke(w,80,180),point(x*cos(a)+z*sin(a)+130,200)):(x*=.42,y*=.42,z*=.42,stroke(w,110,70),point(x*cos(a)+z*sin(a)+130,y+200))}}`;

export const PELAGION_GENOME_CHARACTERS = PELAGION_GENOME.length;
export const PELAGION_LIVING_GENOME_CHARACTERS = PELAGION_LIVING_GENOME.length;

const sketch = (id, code) => Object.freeze({ id, code, viewModel: "pelagion-orbit" });

export const PELAGION_GENOME_SKETCH = sketch("pelagion-280", PELAGION_GENOME);
export const PELAGION_LIVING_GENOME_SKETCH = sketch("pelagion-living-280", PELAGION_LIVING_GENOME);

const sharedFeatures = Object.freeze(["узнаваемое тело", "хвостовой плавник", "формульный цвет", "3D-камера"]);
const organFeatures = Object.freeze([...sharedFeatures, "светящееся ядро", "ось хвоста"]);
const networkFeatures = Object.freeze([...organFeatures, "кольца мембраны"]);

const budgetVariant = (id, rank, label, title, description, features, code) => Object.freeze({
  id,
  rank,
  label,
  title,
  description,
  features,
  sketch: sketch(`pelagion-${id}`, code)
});

export const PELAGION_BUDGET_VARIANTS_BY_MODE = Object.freeze({
  canonical: Object.freeze([
    budgetVariant("glide-body", 0, "Тело", "Тело и хвост", "Базовый силуэт мягко дышит и сохраняет связный хвостовой плавник.", sharedFeatures, PELAGION_GENOME),
    budgetVariant("glide-organ", 1, "Ядро", "Светящееся ядро", "Внутри тела появляется отдельный орган, а вдоль хвоста — цветовая ось.", organFeatures, PELAGION_ORGAN_GENOME),
    budgetVariant("glide-network", 2, "Сеть", "Кольца мембраны", "Поперечные рёбра проявляют объём тела и раскрытие хвостового плавника.", networkFeatures, PELAGION_NETWORK_GENOME)
  ]),
  "living-stroke": Object.freeze([
    budgetVariant("stroke-body", 0, "Тело", "Силовой гребок", "Базовый силуэт проводит бегущую волну через тело и хвост.", sharedFeatures, PELAGION_LIVING_GENOME),
    budgetVariant("stroke-organ", 1, "Ядро", "Ядро гребка", "Светящееся ядро и ось хвоста движутся внутри той же фазовой волны.", organFeatures, PELAGION_LIVING_ORGAN_GENOME),
    budgetVariant("stroke-network", 2, "Сеть", "Мембрана гребка", "Кольца показывают, как силовая волна проходит через объём и плавник.", networkFeatures, PELAGION_LIVING_NETWORK_GENOME)
  ])
});

export const PELAGION_RAW_VARIANTS = Object.freeze([
  Object.freeze({
    id: "canonical",
    label: "Исходный RAW",
    title: "Тело и хвост",
    description: "Тридцать эллиптических колец собирают тело, ещё двадцать сечений — соединённый хвостовой плавник.",
    sketch: PELAGION_GENOME_SKETCH
  }),
  Object.freeze({
    id: "living-stroke",
    label: "RAW гребка",
    title: "Силовой гребок",
    description: "Та же форма проводит бегущую волну через объём тела и хвост, оставаясь внутри 280 символов.",
    sketch: PELAGION_LIVING_GENOME_SKETCH
  })
]);
