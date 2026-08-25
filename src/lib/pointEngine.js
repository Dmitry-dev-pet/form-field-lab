const mathBindings = Object.freeze({
  PI: Math.PI,
  TAU: Math.PI * 2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  atan2: Math.atan2,
  abs: Math.abs,
  exp: Math.exp,
  sq: value => value * value,
  mag: Math.hypot
});

export function createPointEngine(sketchOrCode) {
  const code = typeof sketchOrCode === "string" ? sketchOrCode : sketchOrCode.code;
  let points = [];
  let initialized = false;
  class PointVector {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    copy() {
      return new PointVector(this.x, this.y, this.z);
    }

    add(x = 0, y = 0, z = 0) {
      if (x && typeof x === "object") {
        this.x += Number(x.x) || 0;
        this.y += Number(x.y) || 0;
        this.z += Number(x.z) || 0;
      } else {
        this.x += Number(x) || 0;
        this.y += Number(y) || 0;
        this.z += Number(z) || 0;
      }
      return this;
    }

    mult(scale = 1) {
      this.x *= scale;
      this.y *= scale;
      this.z *= scale;
      return this;
    }

    static random3D() {
      const z = Math.random() * 2 - 1;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(1 - z * z);
      return new PointVector(radius * Math.cos(angle), radius * Math.sin(angle), z);
    }
  }
  const target = {
    ...mathBindings,
    Array,
    createCanvas: () => undefined,
    p5: { Vector: PointVector },
    point: (x, y) => {
      if (x && typeof x === "object") {
        y = x.y;
        x = x.x;
      }
      if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
    }
  };
  target.stroke = () => target;
  target.background = () => target;
  const scope = new Proxy(target, {
    has: () => true,
    get: (object, key) => key === Symbol.unscopables ? undefined : object[key],
    set: (object, key, value) => {
      object[key] = value;
      return true;
    }
  });
  const compile = new Function("scope", `with(scope){\n${code}\nreturn draw\n}`);
  const drawFrame = compile(scope);

  return {
    frame() {
      points = [];
      drawFrame();
      if (!initialized) {
        for (let attempt = 0; points.length <= 1000 && attempt < 64; attempt += 1) {
          points = [];
          drawFrame();
        }
        initialized = true;
      }
      return points;
    }
  };
}

export function interpolatePointClouds(pointsA, pointsB, mix) {
  if (!pointsA.length || !pointsB.length) {
    throw new Error("Одна из формул не вернула видимых точек.");
  }
  if (mix <= 0.001) return pointsA;
  if (mix >= 0.999) return pointsB;

  const count = Math.max(pointsA.length, pointsB.length);
  const result = new Array(count);
  for (let index = 0; index < count; index++) {
    const pointA = pointsA[Math.floor(index * pointsA.length / count)];
    const pointB = pointsB[Math.floor(index * pointsB.length / count)];
    result[index] = [
      pointA[0] + (pointB[0] - pointA[0]) * mix,
      pointA[1] + (pointB[1] - pointA[1]) * mix
    ];
  }
  return result;
}
