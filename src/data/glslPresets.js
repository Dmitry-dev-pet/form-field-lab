// Provenance: original text was supplied by the user; author is unverified.
// Keep the unmodified source separate from our numerically safer adaptation.
export const ORIGINAL_GLSL = "float i,e,R,s,k,z;vec3 q,p,d=.5-FC.rgb/r.y;for(q--;i++<1e2;i>85.?d/=-d,o+=(cos(vec4(1,3,5,0)+k)-k)*e*.1:o){s=3.;q+=d*e*R*.2-4e-5;p=vec3(log(R=length(q))-t,acos(q.z/R)-.5,atan(q.x,q.y)+t*.5);for(e=--p.y;s<4e3;s*=3.)e+=(z=sin(dot(p/p,exp(cos(p*s)+1.))))/s,k+=z/70.;}";

export const STABLE_GLSL = [
  "float i=0.,e=.02,R=1.,s=3.,k=0.,z=0.;",
  "vec3 q=vec3(-1.),p=vec3(0.),d=.5-FC.rgb/r.y;",
  "for(;i++<1e2;){",
  " s=3.;q+=d*e*R*.2-4e-5;",
  " R=max(length(q),1e-5);",
  " p=vec3(log(R)-t,acos(clamp(q.z/R,-1.,1.))-.5,atan(q.x,q.y)+t*.5);",
  " for(e=--p.y;s<4e3;s*=3.)",
  "  e+=(z=sin(dot(vec3(1.),exp(cos(p*s)+1.))))/s,k+=z/70.;",
  " if(i>85.){d=vec3(-1.);o+=(cos(vec4(1.,3.,5.,0.)+k)-k)*e*.1;}",
  "}"
].join("\n");

// Second user-supplied shader. Keep its one-line RAW byte-for-byte unchanged;
// the adaptation below is deliberately separate and explicitly attributed.
export const SPHERICAL_FIELD_RAW_GLSL = "float i,e,R,s,k,z;vec3 q,p,d=.5-FC.rgb/r.y;for(q.z++;s=5.,q+=d*e*R/6.+1e-5,p=vec3(log(R=length(q))-t/s,acos(q.z/R)-2.,atan(q.x,q.y)-t/s),i++<1e2;z=i>70.?d/=-d,-e:exp(e)*.2,o+=(cos(vec4(1,2,3,0)-R)+k+1.)*z/1e2)for(e=p.y;s<4e2;s+=s)e+=(z=sin(dot(p/p,exp(cos(p*s)+.7))))/s,k+=z/1e2;";

export const SPHERICAL_FIELD_STABLE_GLSL = [
  "float i=0.,e=.02,R=1.,s=5.,k=0.,z=0.;",
  "vec3 q=vec3(0.,0.,1.),p=vec3(0.),d=.5-FC.rgb/r.y;",
  "for(;i++<1e2;){",
  " s=5.;q+=d*e*R/6.+1e-5;",
  " R=max(length(q),1e-5);",
  " p=vec3(log(R)-t/s,acos(clamp(q.z/R,-1.,1.))-2.,atan(q.x,q.y)-t/s)*u_fieldScale;",
  " e=p.y;",
  " for(int level=0;level<7;level++){",
  "  if(float(level)>=u_fieldDetail)break;",
  "  e+=(z=sin(dot(vec3(1.),exp(cos(p*s)+u_fieldWarp))))/s;",
  "  k+=z/1e2;",
  "  s+=s;",
  " }",
  " z=i>u_fieldTurn?-e:exp(e)*.2;",
  " if(i>u_fieldTurn)d=vec3(-1.);",
  " o+=(cos(vec4(1.,2.,3.,0.)-R+u_fieldHue)+k+1.)*z/1e2;",
  "}"
].join("\n");

export const DIAGNOSTIC_GLSL = "vec2 uv=(FC.xy-.5*r)/r.y;o=vec4(.5+.5*cos(t+uv.xyx*3.+vec3(0.,2.,4.)),1.);";

export const GLSL_PRESETS = Object.freeze([
  {
    id: "stable",
    name: "Фрактал · адаптация",
    description: "Инициализированные переменные и защита от неопределённой арифметики. Это наша отдельная адаптация исходной формулы.",
    code: STABLE_GLSL
  },
  {
    id: "original",
    name: "Фрактал · RAW",
    description: "Буквальный присланный код. Неинициализированные переменные и деления могут дать разный результат на разных GPU.",
    code: ORIGINAL_GLSL
  },
  {
    id: "spherical-stable",
    name: "Сферическое поле · адаптация",
    description: "Численно устойчивый вариант нового лучевого шейдера: инициализация, ограничение acos и устранение неопределённых делений. Исходный RAW сохранён отдельно.",
    code: SPHERICAL_FIELD_STABLE_GLSL
  },
  {
    id: "spherical-raw",
    name: "Сферическое поле · RAW",
    description: "Буквальный второй шейдер от пользователя; неинициализированные переменные и p/p могут вести к разным результатам на GPU.",
    code: SPHERICAL_FIELD_RAW_GLSL
  },
  {
    id: "diagnostic",
    name: "Тест · палитра",
    description: "Простой гарантированно определённый тест цвета и анимации для проверки WebGL2.",
    code: DIAGNOSTIC_GLSL
  }
]);
