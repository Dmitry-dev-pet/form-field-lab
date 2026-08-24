export const CHRONOPHORE_GENOME_LIMIT = 280;

export const CHRONOPHORE_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=2e4;i--;){u=i/2e4*TAU;a=2*u;v=3*u+t;b=i%9/9*TAU;q=28+6*cos(b);r=90+q*cos(v);z=q*sin(v)+6*sin(b);x=r*cos(a);stroke(155+99*sin(v+b+t),220,255,96);point(x*cos(t/4)+z*sin(t/4)+200,r*sin(a)+200)}}//#つぶやきProcessing`;

export const CHRONOPHORE_GENOME_CHARACTERS = CHRONOPHORE_GENOME.length;

export const CHRONOPHORE_GENOME_SKETCH = Object.freeze({
  id: "chronophore-280",
  code: CHRONOPHORE_GENOME
});
