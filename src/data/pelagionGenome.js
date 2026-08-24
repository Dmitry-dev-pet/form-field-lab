export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w,WEBGL);background(9);rotateY(t/3);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;r=70*sin(PI*u/5)**.6*(1-u/6);stroke(155+99*sin(v+t),200,255);point((u-2.5)*60,r*cos(v)+3*u*u*sin(t-u),r*sin(v)*(1+.4*sin(2*v+u)))}}//#つぶやきProcessing`;

export const PELAGION_GENOME_CHARACTERS = PELAGION_GENOME.length;

export const PELAGION_GENOME_SKETCH = Object.freeze({
  id: "pelagion-280",
  code: PELAGION_GENOME
});
