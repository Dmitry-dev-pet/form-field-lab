<script setup>
import { nextTick, onMounted, ref } from "vue";

const latexSource = String.raw`\begin{aligned}
y_i &= \frac{i}{995}, \\
k_i &= \left(4+\cos(\omega y_i+t)\right)\cos\left(\frac{i}{q}\right), \\
e_i &= \frac{y_i}{5}-11, \\
d_i &= \sqrt{k_i^2+e_i^2}-\delta, \\
c_i &= \frac{d_i}{2}-\frac{t}{2}+(i\bmod m)\frac{3\varphi}{m}, \\
x_i &= (R+k_i^2)\cos(c_i)+200, \\
Y_i &= H\sin\left(\frac{c_i}{3}\right)+200
+d_i^2\frac{P}{3}\sin(3t-d_i)+3\sin(2k_i)
+\frac{y_i k_i}{F}\left(e_i+\sin(4e_i-4d_i)\right).
\end{aligned}`;

const colorLatexSource = String.raw`\begin{aligned}
u_i(t) &= \operatorname{clamp}_{[0,1]} f(i,y_i,k_i,e_i,d_i,c_i,z_i,t), \\
\mathbf C_i(t) &= \left(1-u_i(t)\right)\mathbf C_A+u_i(t)\mathbf C_B, \\
f_{\mathrm{phase}} &= \frac{1+\sin\left(c_i+0.35d_i+0.8t\right)}{2}.
\end{aligned}`;

const spatialLatexSource = String.raw`\begin{aligned}
\rho_i &= R+k_i^2, \\
\mathbf p_i(\lambda) &=
\begin{bmatrix}
\rho_i\cos c_i \\
Y_i-200 \\
\lambda\rho_i\sin c_i
\end{bmatrix}, \\
\mathbf p_i' &= R_x(\beta)R_y(\alpha)\mathbf p_i, \\
(\Delta\beta)_{\mathrm{drag}} &= \sigma_y s\,\Delta y,
\quad \sigma_y\in\{-1,+1\}, \\
(x_i',Y_i') &= (p_{i,x}'+200,\ p_{i,y}'+200).
\end{aligned}`;

const movementLatexSource = String.raw`\begin{aligned}
\text{Пловец \#01:}\qquad
y_i&=i/254, & k_i&=A\cos(\nu y_i), & e_i&=y_i-L,\\
d_i&=\sqrt{k_i^2+e_i^2}/S, & c_i&=d_i/3-t, & \rho_i&=R+k_i^2+Gd_i,\\
\mathbf p_i&=
\begin{bmatrix}
\rho_i\sin c_i\\Y_i-200\\\lambda\rho_i\cos c_i
\end{bmatrix}.\\[1em]
\text{Пульсатор \#06:}\qquad
m_i&=\Delta(i\bmod M), &
d_i&=\frac{(k_i^2+e_i^2)^{3/2}}{S}+B-\frac{P}{3}\sin^3(t/2+m_i),\\
c_i&=d_i/Q-t/D+m_i, & p_i&=d_i^{\sin(d_i^2-t+m_i)},\\
\mathbf p_i&=
\begin{bmatrix}
R\sin c_i+k_ip_i\\R\sin(hc_i)+e_ip_i\\\lambda R\cos c_i
\end{bmatrix}.
\end{aligned}`;

const kernelSource = `const ORIGINAL = {
  speed: 1, forms: 3, radius: 79, height: 99, depth: 1,
  waveFrequency: 31, pulse: 3, pointCount: 20000,
  alpha: 96, phaseStep: 8, radialDivisor: 99,
  distanceOffset: 6, featherDivisor: 13
};

for (let i = settings.pointCount; i--;) {
  const y = i / 995;
  const k = (4 + cos(y * settings.waveFrequency + time))
    * cos(i / settings.radialDivisor);
  const e = y / 5 - 11;
  const d = mag(k, e) - settings.distanceOffset;
  const branchPhase = (i % settings.forms)
    * settings.phaseStep * 3 / settings.forms;
  const c = d / 2 - time / 2
    + branchPhase;

  const radialSize = settings.radius + k * k;
  const x = radialSize * cos(c) + 200;
  const pulse = d * d * (settings.pulse / 3) * sin(time * 3 - d);
  const ripple = 3 * sin(k * 2);
  const feather = y / settings.featherDivisor * k
    * (e + sin(e * 4 - d * 4));
  const screenY = settings.height * sin(c / 3)
    + 200 + pulse + ripple + feather;
  const z = radialSize * sin(c) * settings.depth;

  // Orthographic orbit around the original center (200, 200, 0).
  const X = x - 200;
  const Y = screenY - 200;
  const yawX = X * cos(yaw) + z * sin(yaw);
  const yawZ = -X * sin(yaw) + z * cos(yaw);
  const rotatedY = Y * cos(pitch) - yawZ * sin(pitch);

  ctx.fillRect(yawX + 200, rotatedY + 200, 1, 1);
}`;

const golfSource = `a=(y,d=mag(k=(4+cos(y*31+t))*cos(i/99),e=y/5-11)-6)=>point((79+k*k)*cos(c=d/2-t/2+i%3*8)+200,99*sin(c/3)+200+d*d*sin(t*3-d)+3*sin(k*2)+y/13*k*(e+sin(e*4-d*4)))
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,96);for(t+=PI/60,i=2e4;i--;)a(i/995)}//#つぶやきProcessing`;

const defaultCopyLabels = {
  latex: "Копировать TeX",
  color: "Копировать TeX",
  spatial: "Копировать TeX",
  movement: "Копировать TeX",
  code: "Копировать JS"
};
const copyLabels = ref({ ...defaultCopyLabels });

async function copy(kind, value) {
  try {
    await navigator.clipboard.writeText(value);
    copyLabels.value[kind] = "Скопировано ✓";
  } catch {
    copyLabels.value[kind] = "Не удалось";
  }
  window.setTimeout(() => {
    copyLabels.value[kind] = defaultCopyLabels[kind];
  }, 1500);
}

function loadMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve();
  window.MathJax = {
    tex: { inlineMath: [["\\(", "\\)"]], displayMath: [["\\[", "\\]"]] },
    options: { enableMenu: false }
  };
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-chtml.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

onMounted(async () => {
  await nextTick();
  try {
    await loadMathJax();
    await window.MathJax.typesetPromise();
  } catch {
    // Raw LaTeX remains readable if the CDN is unavailable.
  }
});
</script>

<template>
  <section class="view">
    <header class="view-head">
      <div>
        <p class="eyebrow">Theory / under the surface</p>
        <h1 class="display-title">Код и математика</h1>
      </div>
      <p class="view-lead">Каждый кадр — параметрическое отображение индекса точки в координаты пространства и холста. Здесь code-golf развёрнут в читаемую модель.</p>
    </header>

    <div class="theory-grid">
      <article class="theory-card">
        <header class="card-header">
          <div><span>01 / MODEL · SKETCH #05</span><h2>Модель ветвящейся формы</h2></div>
          <button class="button" type="button" @click="copy('latex', latexSource)">{{ copyLabels.latex }}</button>
        </header>
        <div class="theory-body">
          <p>Для точки с индексом \(i\), где \(0 \le i &lt; N\), вводим:</p>
          <div class="math-scroll">
            \[
            \begin{aligned}
            y_i &amp;= \frac{i}{995}, \\
            k_i &amp;= \left(4+\cos(\omega y_i+t)\right)\cos\left(\frac{i}{q}\right), \\
            e_i &amp;= \frac{y_i}{5}-11, \\
            d_i &amp;= \sqrt{k_i^2+e_i^2}-\delta, \\
            c_i &amp;= \frac{d_i}{2}-\frac{t}{2}+(i\bmod m)\frac{3\varphi}{m}.
            \end{aligned}
            \]
          </div>
          <p>После этого точка попадает на экран:</p>
          <div class="math-scroll">
            \[
            x_i=(R+k_i^2)\cos(c_i)+200,
            \]
            \[
            \begin{aligned}
            Y_i={}&amp;H\sin\left(\frac{c_i}{3}\right)+200 \\
            &amp;+d_i^2\frac{P}{3}\sin(3t-d_i)+3\sin(2k_i) \\
            &amp;+\frac{y_i k_i}{F}\left(e_i+\sin(4e_i-4d_i)\right).
            \end{aligned}
            \]
          </div>
          <ul class="parameter-key">
            <li><code>N</code> — количество точек</li>
            <li><code>m</code> — число форм</li>
            <li><code>R, H</code> — размер и высота</li>
            <li><code>ω</code> — частота волн</li>
            <li><code>P</code> — сила пульсации</li>
            <li><code>φ</code> — фазовый шаг</li>
            <li><code>q</code> — плотность рёбер</li>
            <li><code>δ, F</code> — смещение и волокна</li>
          </ul>
        </div>
      </article>

      <article class="theory-card">
        <header class="card-header">
          <div><span>02 / SOURCE · SKETCH #05</span><h2>Читаемое ядро</h2></div>
          <button class="button" type="button" @click="copy('code', kernelSource)">{{ copyLabels.code }}</button>
        </header>
        <pre class="tall-code"><code>{{ kernelSource }}</code></pre>
        <div class="tiny-code-context">
          <p><strong>Почему исходник занимает две строки?</strong> Это работа для <code>#つぶやきProcessing</code>: открытого code-golf челленджа, где исполняемый Processing/p5.js-скетч должен уместиться примерно в 280 символов одного поста. Короткие имена, глобальные переменные и присваивания внутри выражений здесь — часть формы.</p>
          <a href="https://tsubuyaki-p5-editor.glitch.me/" target="_blank" rel="noopener noreferrer">Редактор челленджа со счётчиком 280 ↗</a>
        </div>
        <details class="source-details">
          <summary>Исходная code-golf версия</summary>
          <pre><code>{{ golfSource }}</code></pre>
        </details>
      </article>

      <article class="theory-card color-theory">
        <header class="card-header">
          <div><span>03 / COLOR FIELD</span><h2>Цвет как функция формы</h2></div>
          <button class="button" type="button" @click="copy('color', colorLatexSource)">{{ copyLabels.color }}</button>
        </header>
        <div class="theory-body">
          <p>Геометрия и цвет используют одни и те же скрытые переменные. Выражение вычисляет коэффициент смешивания \(u_i(t)\), после чего точка получает цвет между двумя краями палитры:</p>
          <div class="math-scroll">
            \[
            \begin{aligned}
            u_i(t) &amp;= \operatorname{clamp}_{[0,1]} f(i,y_i,k_i,e_i,d_i,c_i,z_i,t), \\
            \mathbf C_i(t) &amp;= \left(1-u_i(t)\right)\mathbf C_A+u_i(t)\mathbf C_B.
            \end{aligned}
            \]
          </div>
          <p>Стандартный режим «Фаза» связывает цвет со складками и временем:</p>
          <div class="math-scroll">
            \[
            f_{\mathrm{phase}}=\frac{1+\sin\left(c_i+0.35d_i+0.8t\right)}{2}.
            \]
          </div>
          <p>Результат квантуется в 24 оттенка: формула остаётся плавной визуально, но Canvas меняет стиль только между цветовыми слоями, а не для каждой из 20&nbsp;000 точек.</p>
        </div>
      </article>

      <article class="theory-card spatial-theory">
        <header class="card-header">
          <div><span>04 / SPATIAL LIFT</span><h2>Скрытая координата</h2></div>
          <button class="button" type="button" @click="copy('spatial', spatialLatexSource)">{{ copyLabels.spatial }}</button>
        </header>
        <div class="theory-body">
          <p>Косинус в исходной координате дополняется сопряжённым синусом. Коэффициент глубины \(\lambda\) непрерывно переводит плоскую работу в пространственную форму:</p>
          <div class="math-scroll">
            \[
            \begin{aligned}
            \rho_i &amp;= R+k_i^2, \\
            \mathbf p_i(\lambda) &amp;=
            \begin{bmatrix}
            \rho_i\cos c_i \\
            Y_i-200 \\
            \lambda\rho_i\sin c_i
            \end{bmatrix}.
            \end{aligned}
            \]
          </div>
          <p>Движение пальца задаёт углы \(\alpha\) и \(\beta\). Точки вращаются около исходного центра, после чего ортографически проецируются обратно на Canvas:</p>
          <div class="math-scroll">
            \[
            \mathbf p_i'=R_x(\beta)R_y(\alpha)\mathbf p_i,
            \qquad
            (x_i',Y_i')=(p_{i,x}'+200,\ p_{i,y}'+200).
            \]
          </div>
          <p>Переключатель «Инверсия Y» меняет знак вертикального жеста: \((\Delta\beta)_{\mathrm{drag}}=\sigma_y s\,\Delta y\), где \(\sigma_y=-1\) в инвертированном режиме.</p>
          <p>При \(\alpha=\beta=0\) глубина не влияет на экранные координаты, поэтому фронтальный вид остаётся исходной работой автора.</p>
        </div>
      </article>

      <article class="theory-card movement-theory">
        <header class="card-header">
          <div><span>05 / MOVEMENT ARCHETYPES</span><h2>Пловец и пульсатор</h2></div>
          <button class="button" type="button" @click="copy('movement', movementLatexSource)">{{ copyLabels.movement }}</button>
        </header>
        <div class="theory-body">
          <p>Два других исходника строят движение по-разному. В обоих случаях третью координату добавляет лаборатория; исходная фронтальная проекция автора остаётся неизменной.</p>
          <div class="movement-equations">
            <section>
              <h3>Пловец · #01</h3>
              <p>Фаза (c_i) бежит вдоль продольной координаты (d_i), а хвостовая волна растёт вместе с расстоянием. Получается кинематика гибкого тела.</p>
              <div class="math-scroll">
                \[
                \begin{aligned}
                y_i&amp;=i/254, &amp;k_i&amp;=A\cos(\nu y_i), &amp;e_i&amp;=y_i-L,\\
                d_i&amp;=\sqrt{k_i^2+e_i^2}/S, &amp;c_i&amp;=d_i/3-t,\\
                \rho_i&amp;=R+k_i^2+Gd_i, &amp;
                \mathbf p_i&amp;=
                \begin{bmatrix}
                \rho_i\sin c_i\\Y_i-200\\\lambda\rho_i\cos c_i
                \end{bmatrix}.
                \end{aligned}
                \]
              </div>
              <RouterLink :to="{ name: 'sketch', params: { id: '2091540720628932622' } }">Оригинальный скетч #01 →</RouterLink>
            </section>

            <section>
              <h3>Пульсатор · #06</h3>
              <p>Шестнадцать копий получают разные фазовые сдвиги (m_i). Нелинейная степень (p_i) синхронно раскрывает и стягивает слои — как гребок медузы или манты.</p>
              <div class="math-scroll">
                \[
                \begin{aligned}
                m_i&amp;=\Delta(i\bmod M),\\
                d_i&amp;=\frac{(k_i^2+e_i^2)^{3/2}}{S}+B-\frac{P}{3}\sin^3(t/2+m_i),\\
                c_i&amp;=d_i/Q-t/D+m_i, &amp;p_i&amp;=d_i^{\sin(d_i^2-t+m_i)},\\
                \mathbf p_i&amp;=
                \begin{bmatrix}
                R\sin c_i+k_ip_i\\R\sin(hc_i)+e_ip_i\\\lambda R\cos c_i
                \end{bmatrix}.
                \end{aligned}
                \]
              </div>
              <RouterLink :to="{ name: 'sketch', params: { id: '2090832898488459699' } }">Оригинальный скетч #06 →</RouterLink>
            </section>
          </div>
          <p class="method-note"><strong>Граница интерпретации.</strong> Эти формулы хорошо воспроизводят визуальные архетипы живого движения, но не являются биомеханической моделью мышц, жидкости или нервной системы организма.</p>
        </div>
      </article>
    </div>
  </section>
</template>
