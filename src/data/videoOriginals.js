export const videoOriginals = Object.freeze([
  Object.freeze({
    id: "blastophore-original-001",
    number: 1,
    title: "Бластофор",
    thesis: "Один полный жизненный цикл",
    description: "Цельная оболочка выращивает дочернюю долю, стягивает шейку и возвращается в исходное состояние.",
    characters: 279,
    particles: 10000,
    labForm: "blastophore",
    render: "realtime-master"
  }),
  Object.freeze({
    id: "krylofor-original-002",
    number: 2,
    title: "Крылофор",
    thesis: "280 символов учатся летать",
    description: "Мембрана выполняет четыре полных взмаха, пока встроенный поворот раскрывает её скрытую глубину.",
    characters: 280,
    particles: 10000,
    labForm: "krylofor",
    render: "realtime-master"
  }),
  Object.freeze({
    id: "mnemophore-original-003",
    number: 3,
    title: "Мнемофора",
    thesis: "Предыдущий кадр продолжает жить",
    description: "Тысяча постоянных координат догоняет формулу и превращает запаздывание в тело и шлейф памяти.",
    characters: 271,
    particles: 1000,
    labForm: "mnemophore",
    render: "frame-indexed"
  }),
  Object.freeze({
    id: "pelagion-original-004",
    number: 4,
    title: "Пелагион",
    thesis: "Одна волна двигает всё тело",
    description: "Одна фаза одновременно меняет радиус, глубину и продольное сжатие непрерывной оболочки.",
    characters: 274,
    particles: 10000,
    labForm: "pelagion",
    render: "frame-indexed"
  }),
  Object.freeze({
    id: "chronophore-original-005",
    number: 5,
    title: "Хронофор",
    thesis: "Точки движутся — узел остаётся",
    description: "Двадцать тысяч точек проходят через намотку 2:3, сохраняя узнаваемый фазовый узел.",
    characters: 273,
    particles: 20000,
    labForm: "chronophore",
    render: "frame-indexed"
  })
]);

export function findVideoOriginal(id) {
  return videoOriginals.find(original => original.id === id) || videoOriginals.at(-1);
}

export function videoAssetPath(original, fileName) {
  return `videos/${original.id}/${fileName}`;
}
