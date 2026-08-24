export const PELAGION_GENOME_LIMIT = 280;

export const PELAGION_GENOME = `t=0,draw=_=>{t||createCanvas(w=400,w);background(9);for(t+=.02,i=1e4;i--;){u=i/2e3;v=i%40/6;r=70*sin(PI*u/5)**.6*(1-u/6);z=r*sin(v)*(1+.4*sin(2*v+u));x=(u-2.5)*60;a=t/3;stroke(155+99*sin(v+t),200,255);point(x*cos(a)+z*sin(a)+200,r*cos(v)+3*u*u*sin(t-u)+200)}}//#つぶやきProcessing`;

export const PELAGION_GENOME_CHARACTERS = PELAGION_GENOME.length;

export const PELAGION_GENOME_SKETCH = Object.freeze({
  id: "pelagion-280",
  code: PELAGION_GENOME
});
