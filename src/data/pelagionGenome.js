export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?12*sin(t-u/4):18-u/2+9*sin(t)*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200)}}`;

export const PELAGION_LIVING_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){q=i/200|0;h=q>29;u=h?q-30:q;v=i%200/32;r=15*u**.5;s=sin(4*t-u/9);x=h?80+5*u:r*cos(v);y=h?u*sin(v):.6*r*sin(v);z=h?16*s:18-u/2+9*s*sin(v)**2;a=sin(t)/5;stroke(160,u*9,w);point(x*cos(a)+z*sin(a)+130,y+200)}}`;

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
