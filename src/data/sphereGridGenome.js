export const SPHERE_GRID_GENOME_LIMIT = 280;

export const SPHERE_GRID_GENOME = `P=(u,v,q=99*sin(v),a=u-t/99)=>[q*cos(a)+200,99*cos(v)*.88-q*sin(a)*.48+200]
t=0,draw=_=>{t++||createCanvas(w=400,w);background(9).stroke(w,96);for(i=480;i--;){u=i%32*PI/16,v=(i>>5)*PI/15,A=P(u,v),B=P(u+PI/16,v),C=P(u,v+PI/15),line(...A,...B),line(...A,...C)}}//#つぶやきProcessing`;

export const SPHERE_GRID_GENOME_CHARACTERS = SPHERE_GRID_GENOME.length;

export const SPHERE_GRID_GENOME_SKETCH = Object.freeze({
  id: "sphere-grid-280",
  code: SPHERE_GRID_GENOME
});
