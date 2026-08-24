import { sketches } from "./sketches.js";

const control = (key, label, min, max, step, options = {}) => ({
  key, label, min, max, step, ...options
});

const speed = control("speed", "Скорость", 0, 3, 0.05, { format: "speed" });
const depth = control("depth", "Глубина", 0, 2, 0.05, { format: "percent" });
const alpha = control("alpha", "Прозрачность", 10, 255, 1);
const points = (maximum = 40000) => control("pointCount", "Точки", 2000, maximum, 1000, { format: "count" });

function brancherPoint(index, time, settings, layers, target) {
  const y = index / 995;
  const k = (4 + Math.cos(y * settings.waveFrequency + time))
    * Math.cos(index / settings.radialDivisor);
  const e = y / 5 - 11;
  const d = Math.hypot(k, e) - settings.distanceOffset;
  const formCount = Math.max(1, Math.round(settings.forms));
  const branch = index % formCount;
  const phaseStep = settings.phaseStep * 3 / formCount;
  const branchPhase = layers.symmetry ? branch * phaseStep : 0;
  const c = d / 2 - time / 2 + branchPhase;
  const radialSize = settings.radius + k * k;
  const pulse = layers.pulse
    ? d * d * (settings.pulse / 3) * Math.sin(time * 3 - d)
    : 0;
  const ripple = layers.ripple ? 3 * Math.sin(k * 2) : 0;
  const feather = layers.feather
    ? y / settings.featherDivisor * k * (e + Math.sin(e * 4 - d * 4))
    : 0;

  target.x = radialSize * Math.cos(c) + 200;
  target.y = settings.height * Math.sin(c / 3) + 200 + pulse + ripple + feather;
  target.z = radialSize * Math.sin(c) * settings.depth;
  target.parameter = y;
  target.k = k;
  target.e = e;
  target.d = d;
  target.c = c;
  target.branch = branch;
  target.forms = formCount;
  return target;
}

function swimmerPoint(index, time, settings, layers, target) {
  const y = index / 254;
  const k = layers.spine
    ? settings.spineAmplitude * Math.cos(y * settings.spineFrequency)
    : 0;
  const e = y - settings.lengthOffset;
  const d = Math.hypot(k, e) / settings.distanceDivisor;
  const c = d / 3 - time;
  const radialSize = settings.radius + k * k + d * settings.radialGrowth;
  const ribs = layers.ribs ? settings.ribStrength / d * Math.sin(k * 2) : 0;
  const fin = layers.fin ? y / settings.bodyCoupling * k * e : 0;
  const tail = layers.tail
    ? d * settings.tailStrength * Math.sin(
      time * settings.tailFrequency - d * 2 + Math.sin(time) / 0.6 ** 3
    )
    : 0;

  target.x = radialSize * Math.sin(c) + 200;
  target.y = settings.height * Math.sin(c / 2) + ribs + fin + tail + 200;
  target.z = radialSize * Math.cos(c) * settings.depth;
  target.parameter = y;
  target.k = k;
  target.e = e;
  target.d = d;
  target.c = c;
  target.branch = 0;
  target.forms = 1;
  return target;
}

function pulsatorPoint(index, time, settings, layers, target) {
  const copyCount = Math.max(1, Math.round(settings.copies));
  const branch = index % copyCount;
  const m = layers.copies ? branch * settings.phaseStep : 0;
  const k = settings.seedAmplitude
    * Math.cos(index * settings.seedFrequency)
    * Math.sin(index);
  const e = settings.seedAmplitude
    * Math.cos(index * settings.eFrequencyA)
    * Math.cos(index * settings.eFrequencyB);
  const radialSeed = Math.hypot(k, e);
  const pulse = layers.pulse
    ? settings.pulse / 3 * Math.sin(time / 2 + m) ** 3
    : 0;
  const d = radialSeed ** settings.distancePower / settings.distanceScale
    + settings.distanceBase - pulse;
  const c = d / settings.phaseDivisor - time / settings.driftDivisor + m;
  const expansion = layers.nonlinear
    ? d ** Math.sin(d * d - time + m)
    : 1;
  const bodyX = layers.body ? k * expansion : 0;
  const bodyY = layers.body ? e * expansion : 0;

  target.x = settings.radius * Math.sin(c) + bodyX + 200;
  target.y = settings.radius * Math.sin(c * settings.harmonic) + bodyY + 200;
  target.z = settings.radius * Math.cos(c) * settings.depth;
  target.parameter = index / 500;
  target.k = k;
  target.e = e;
  target.d = d;
  target.c = c;
  target.branch = branch;
  target.forms = copyCount;
  return target;
}

export const spatialForms = Object.freeze([
  {
    id: "brancher",
    sketchNumber: 5,
    shortLabel: "Ветви",
    title: "Ветвящийся организм",
    association: "веер · плавник · колония",
    description: "Фазовые ветви раскрываются вокруг скрытой окружности. Пульсация и волокна продолжают жить независимо от положения камеры.",
    sketch: sketches[4],
    timeStep: Math.PI / 60,
    defaults: {
      speed: 1, forms: 3, radius: 79, height: 99, depth: 1,
      waveFrequency: 31, pulse: 3, pointCount: 20000, alpha: 96,
      phaseStep: 8, radialDivisor: 99, distanceOffset: 6,
      featherDivisor: 13, backgroundColor: "#090909"
    },
    primaryControls: [
      speed,
      control("forms", "Формы", 1, 8, 1),
      control("radius", "Размер", 30, 140, 1),
      control("height", "Высота", 30, 170, 1),
      depth,
      control("waveFrequency", "Волны", 5, 60, 1),
      control("pulse", "Пульсация", 0, 8, 0.1, { digits: 1 }),
      points(),
      alpha
    ],
    advancedControls: [
      control("phaseStep", "Фазовый шаг", 0, 16, 0.1, { digits: 1 }),
      control("radialDivisor", "Плотность рёбер", 35, 200, 1),
      control("distanceOffset", "Радиальное смещение", 0, 12, 0.1, { digits: 1 }),
      control("featherDivisor", "Длина волокон", 5, 30, 1)
    ],
    layers: [
      { key: "symmetry", label: "Симметрия", default: true },
      { key: "pulse", label: "Пульсация", default: true },
      { key: "ripple", label: "Рябь", default: true },
      { key: "feather", label: "Волокна", default: true }
    ],
    randomRanges: {
      speed: [0.25, 2.5, 0.05], forms: [2, 7, 1], radius: [48, 120, 1],
      height: [60, 145, 1], depth: [0.5, 1.6, 0.05], waveFrequency: [12, 55, 1],
      pulse: [0.5, 6, 0.1], pointCount: [12000, 32000, 1000], alpha: [50, 170, 1],
      phaseStep: [4, 13, 0.1], radialDivisor: [55, 165, 1],
      distanceOffset: [3, 10, 0.1], featherDivisor: [8, 24, 1]
    },
    evaluate: brancherPoint
  },
  {
    id: "swimmer",
    sketchNumber: 1,
    shortLabel: "Пловец",
    title: "Пловец",
    association: "рыба · угорь · морской дракон",
    description: "Бегущая фаза проходит вдоль позвоночника и усиливается к хвосту. Сопряжённый косинус проявляет объём длинного тела.",
    sketch: sketches[0],
    timeStep: Math.PI / 240,
    defaults: {
      speed: 1, radius: 79, height: 89, depth: 1,
      spineAmplitude: 5, spineFrequency: 9, lengthOffset: 35,
      distanceDivisor: 2.5, radialGrowth: 4, ribStrength: 7,
      bodyCoupling: 44, tailStrength: 3, tailFrequency: 9,
      pointCount: 10000, alpha: 66, backgroundColor: "#090909"
    },
    primaryControls: [
      speed,
      control("radius", "Размер", 30, 150, 1),
      control("height", "Высота", 30, 160, 1),
      depth,
      control("spineAmplitude", "Ширина тела", 0, 12, 0.1, { digits: 1 }),
      control("spineFrequency", "Позвонки", 2, 18, 0.25, { digits: 2 }),
      control("tailStrength", "Сила хвоста", 0, 8, 0.1, { digits: 1 }),
      points(25000),
      alpha
    ],
    advancedControls: [
      control("lengthOffset", "Продольный центр", 20, 50, 0.5, { digits: 1 }),
      control("distanceDivisor", "Масштаб длины", 1, 5, 0.1, { digits: 1 }),
      control("radialGrowth", "Раскрытие тела", 0, 10, 0.1, { digits: 1 }),
      control("ribStrength", "Выраженность рёбер", 0, 16, 0.1, { digits: 1 }),
      control("bodyCoupling", "Плавниковая складка", 15, 90, 1),
      control("tailFrequency", "Частота хвоста", 1, 16, 0.25, { digits: 2 })
    ],
    layers: [
      { key: "spine", label: "Позвоночник", default: true },
      { key: "ribs", label: "Рёбра", default: true },
      { key: "fin", label: "Плавник", default: true },
      { key: "tail", label: "Хвост", default: true }
    ],
    randomRanges: {
      speed: [0.35, 2.3, 0.05], radius: [55, 115, 1], height: [60, 125, 1],
      depth: [0.55, 1.5, 0.05], spineAmplitude: [2.5, 9, 0.1],
      spineFrequency: [5, 14, 0.25], tailStrength: [1, 6, 0.1],
      pointCount: [7000, 18000, 1000], alpha: [45, 150, 1],
      lengthOffset: [27, 43, 0.5], distanceDivisor: [1.8, 3.6, 0.1],
      radialGrowth: [2, 7, 0.1], ribStrength: [2, 12, 0.1],
      bodyCoupling: [28, 68, 1], tailFrequency: [5, 13, 0.25]
    },
    evaluate: swimmerPoint
  },
  {
    id: "pulsator",
    sketchNumber: 6,
    shortLabel: "Пульсатор",
    title: "Пульсатор",
    association: "медуза · манта · крылатое тело",
    description: "Шестнадцать фазовых слоёв сжимаются и раскрываются как единое тело. Скрытая окружность превращает пульс в пространственный гребок.",
    sketch: sketches[5],
    timeStep: Math.PI / 20,
    defaults: {
      speed: 1, copies: 16, radius: 99, depth: 1,
      seedAmplitude: 9, seedFrequency: 5, eFrequencyA: 3, eFrequencyB: 2,
      pulse: 1, harmonic: 4, phaseStep: 13, distancePower: 3,
      distanceScale: 1999, distanceBase: 1.5, phaseDivisor: 16,
      driftDivisor: 48, pointCount: 10000, alpha: 96,
      backgroundColor: "#090909"
    },
    primaryControls: [
      speed,
      control("copies", "Фазовые слои", 1, 24, 1),
      control("radius", "Размер", 30, 150, 1),
      depth,
      control("seedAmplitude", "Размах тела", 2, 16, 0.1, { digits: 1 }),
      control("pulse", "Пульс", 0, 3, 0.05, { digits: 2 }),
      control("harmonic", "Гармоника", 1, 8, 1),
      points(25000),
      alpha
    ],
    advancedControls: [
      control("phaseStep", "Фазовый шаг", 0, 16, 0.1, { digits: 1 }),
      control("distancePower", "Степень расстояния", 1, 5, 0.1, { digits: 1 }),
      control("distanceScale", "Масштаб расстояния", 500, 5000, 50),
      control("distanceBase", "Базовое раскрытие", 0.2, 3, 0.05, { digits: 2 }),
      control("phaseDivisor", "Фазовый радиус", 4, 40, 0.5, { digits: 1 }),
      control("driftDivisor", "Дрейф", 12, 120, 1),
      control("seedFrequency", "Частота крыла", 1, 9, 0.25, { digits: 2 }),
      control("eFrequencyA", "Вертикальная частота A", 1, 7, 0.25, { digits: 2 }),
      control("eFrequencyB", "Вертикальная частота B", 1, 7, 0.25, { digits: 2 })
    ],
    layers: [
      { key: "copies", label: "Фазовые слои", default: true },
      { key: "pulse", label: "Пульсация", default: true },
      { key: "nonlinear", label: "Расширение", default: true },
      { key: "body", label: "Мягкое тело", default: true }
    ],
    randomRanges: {
      speed: [0.35, 2.1, 0.05], copies: [8, 22, 1], radius: [70, 125, 1],
      depth: [0.55, 1.55, 0.05], seedAmplitude: [5, 13, 0.1],
      pulse: [0.35, 2.2, 0.05], harmonic: [2, 7, 1],
      pointCount: [7000, 18000, 1000], alpha: [55, 160, 1],
      phaseStep: [7, 15, 0.1], distancePower: [2.2, 4.1, 0.1],
      distanceScale: [1200, 3400, 50], distanceBase: [0.8, 2.2, 0.05],
      phaseDivisor: [9, 25, 0.5], driftDivisor: [30, 80, 1],
      seedFrequency: [3, 7, 0.25], eFrequencyA: [2, 5, 0.25],
      eFrequencyB: [1, 4, 0.25]
    },
    evaluate: pulsatorPoint
  }
]);

export function spatialFormById(id) {
  return spatialForms.find(form => form.id === id) || spatialForms[0];
}

export function spatialLayerDefaults(form) {
  return Object.fromEntries(form.layers.map(layer => [layer.key, layer.default]));
}
