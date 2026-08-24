export const COMMUNITY_SCAN = Object.freeze({
  capturedAt: "2026-08-24",
  sketches: 845,
  authors: 26,
  p5js: 838,
  processing: 7,
  signals: Object.freeze([
    { key: "trigonometry", label: "тригонометрия", value: 650 },
    { key: "color", label: "формульный HSB", value: 273 },
    { key: "noise", label: "шум", value: 167 },
    { key: "memory", label: "след и память", value: 85 },
    { key: "agents", label: "массивы агентов", value: 67 },
    { key: "spatial", label: "явное 3D", value: 39 },
    { key: "interaction", label: "интерактивность", value: 4 }
  ])
});

export const COMMUNITY_AUTHORS = Object.freeze([
  ["TakagiHitoshi", "きんぞ", 474],
  ["SnowEsamosc", "Snow Esamosc", 203],
  ["sxolastikos", "zadgy5534", 39],
  ["yuruyurau", "ア", 34],
  ["Hau_kun", "はぅ君", 27],
  ["Sad_Juno", "Sad Juno", 8],
  ["0xB4K3D", "B4K3D･ﾟ✧", 6],
  ["hisadan", "ひさだん", 6],
  ["KomaTebe", "Koma Tebe", 5],
  ["4__MOp", "4_M.O.p.", 4],
  ["KAZOOOps", "KAZ+OO", 4],
  ["MeatClock", "meatclock", 4],
  ["inaba_darkfox", "黒狐", 4],
  ["newdaita", "新代田", 4],
  ["nicolasbaez", "Nicolás Báez", 4],
  ["megamitts1", "Mitts", 3],
  ["watabo_shi", "/** @type {🦀} */", 3],
  ["akira2768922", "Akira", 2],
  ["azeemstweet", "Azeem", 2],
  ["moestradamu5", "moe", 2],
  ["takagikinzo", "きんぞ２", 2],
  ["Acha_for_CS", "Acha", 1],
  ["Barium496244", "Barium", 1],
  ["kekkai3an", "kekkai3an", 1],
  ["mk5th_studio", "ArumaT", 1],
  ["nullhodo", "なるほど🦤", 1]
].map(([handle, name, count]) => Object.freeze({
  handle,
  name,
  count,
  archive: `https://tsubuyaki.art/index.html?artist=${encodeURIComponent(handle)}`
})));

export const COMMUNITY_AUTHOR_MAP = Object.freeze(Object.fromEntries(
  COMMUNITY_AUTHORS.map(author => [author.handle, author])
));

export const COMMUNITY_GENES = Object.freeze([
  {
    id: "body",
    index: "01",
    title: "Параметрическое тело",
    description: "Одна бегущая координата превращается в позвоночник, складку или целое облако ткани. Форма существует только вместе с движением.",
    inheritance: "Связная анатомия Пелагиона: голова, корпус и хвост вычисляются одной фазой.",
    authors: ["yuruyurau", "moestradamu5", "kekkai3an", "nullhodo", "KomaTebe", "takagikinzo"]
  },
  {
    id: "medium",
    index: "02",
    title: "Среда и клеточная материя",
    description: "Шум деформирует решётки, слои, контуры и размеры клеток; порог превращает непрерывное поле в ткань или интерференционный рисунок.",
    inheritance: "Течение изгибает участки тела согласованно, а не дёргает случайные точки.",
    authors: ["SnowEsamosc", "0xB4K3D", "4__MOp", "Barium496244", "Acha_for_CS", "nicolasbaez"]
  },
  {
    id: "agents",
    index: "03",
    title: "Агенты и отделяющиеся частицы",
    description: "Массив хранит положение, возраст и скорость каждой частицы. Точки перестают быть поверхностью и начинают жить собственной короткой жизнью.",
    inheritance: "При касании организм выпускает световые споры, а движение оставляет след.",
    authors: ["Hau_kun", "azeemstweet", "KAZOOOps", "akira2768922"]
  },
  {
    id: "space",
    index: "04",
    title: "Настоящая глубина",
    description: "WEBGL/P3D, вращающиеся примитивы, ленты и поверхности вводят независимую координату z вместо зрительной иллюзии объёма.",
    inheritance: "Второй параметр обходит корпус по окружности и строит реальную мембрану.",
    authors: ["sxolastikos", "Sad_Juno", "inaba_darkfox", "hisadan", "watabo_shi", "nicolasbaez"]
  },
  {
    id: "memory",
    index: "05",
    title: "Память света",
    description: "Полупрозрачный фон, режимы смешивания и фильтры превращают время в видимый материал — изображение помнит предыдущие положения.",
    inheritance: "Быстрые изгибы накапливают биолюминесцентный шлейф, который постепенно растворяется.",
    authors: ["TakagiHitoshi", "Hau_kun", "Sad_Juno", "akira2768922"]
  },
  {
    id: "growth",
    index: "06",
    title: "Рост, итерации и ограничения",
    description: "Рекурсия, нелинейные отображения и соединённые линии создают ветвление, внутренний ритм и архитектурный каркас.",
    inheritance: "Хвостовые нити связаны с корпусом, но получают собственную фазу и амплитуду.",
    authors: ["hisadan", "inaba_darkfox", "mk5th_studio", "megamitts1", "MeatClock", "KomaTebe"]
  },
  {
    id: "meaning",
    index: "07",
    title: "Символ и микроистория",
    description: "Текст, эмодзи и узнаваемые предметы показывают, что короткий код способен не только создавать абстракцию, но и сообщать сюжет.",
    inheritance: "Сущность получает имя, поведенческие состояния и объяснимую карту происхождения.",
    authors: ["newdaita", "MeatClock", "megamitts1", "SnowEsamosc", "watabo_shi", "TakagiHitoshi"]
  },
  {
    id: "response",
    index: "08",
    title: "Ответ на наблюдателя",
    description: "В текущем снимке только четыре скетча используют ввод пользователя — это самая свободная область общего языка.",
    inheritance: "Короткое касание становится возмущением поля; перетаскивание сохраняет управление камерой.",
    authors: ["TakagiHitoshi"]
  }
]);

export const PELAGION_LINEAGE = Object.freeze([
  {
    gene: "Тело",
    source: "@yuruyurau",
    contribution: "неразделимость формы и движения",
    url: "https://tsubuyaki.art/sketch.html?id=2091540720628932622"
  },
  {
    gene: "Мембрана",
    source: "@sxolastikos · @Sad_Juno",
    contribution: "явная пространственная поверхность и вращение",
    url: "https://tsubuyaki.art/sketch.html?id=2084978444115616239"
  },
  {
    gene: "Течение",
    source: "@Hau_kun · @SnowEsamosc",
    contribution: "шумовое поле, клетки и согласованное течение",
    url: "https://tsubuyaki.art/sketch.html?id=2087523995294044260"
  },
  {
    gene: "Ритм",
    source: "@hisadan",
    contribution: "нелинейная итерация без механической периодичности",
    url: "https://tsubuyaki.art/sketch.html?id=2046229330758643788"
  },
  {
    gene: "Кожа",
    source: "@0xB4K3D · @KomaTebe",
    contribution: "интерференция и связанные линии",
    url: "https://tsubuyaki.art/sketch.html?id=2038200370095116665"
  },
  {
    gene: "Память",
    source: "@TakagiHitoshi",
    contribution: "траектория и накопление предыдущих состояний",
    url: "https://tsubuyaki.art/sketch.html?id=2091469857632186773"
  }
]);
