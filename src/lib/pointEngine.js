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
  const target = {
    ...mathBindings,
    createCanvas: () => undefined,
    stroke: () => undefined,
    background: () => ({ stroke: () => undefined }),
    point: (x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
    }
  };
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
