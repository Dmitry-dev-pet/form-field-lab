$=[]
draw=_=>{$[0]??createCanvas(540,540);background(0,9);$=$.map((v,i)=>stroke(i,i/3,i/5).point(v.copy().add(2,1.6).mult(135))+v.add(sin(v.y*(r=(v.x*2+2.5^v.y+2)*8))/90,cos(v.x*r)/90))[2e3]?$.slice(-1980):[...$,...[...Array(20)].map(p5.Vector.random3D)]} //#つぶやきProcessing
