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
u_i(t) &= \operatorname{clamp}_{[0,1]} f(i,y_i,k_i,e_i,d_i,c_i,t), \\
\mathbf C_i(t) &= \left(1-u_i(t)\right)\mathbf C_A+u_i(t)\mathbf C_B, \\
f_{\mathrm{phase}} &= \frac{1+\sin\left(c_i+0.35d_i+0.8t\right)}{2}.
\end{aligned}`;

const kernelSource = `const ORIGINAL = {
  speed: 1, forms: 3, radius: 79, height: 99,
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
  const c = d / 2 - time / 2
    + (i % settings.forms) * settings.phaseStep;

  const x = (settings.radius + k * k) * cos(c) + 200;
  const pulse = d * d * (settings.pulse / 3) * sin(time * 3 - d);
  const ripple = 3 * sin(k * 2);
  const feather = y / settings.featherDivisor * k
    * (e + sin(e * 4 - d * 4));
  const screenY = settings.height * sin(c / 3)
    + 200 + pulse + ripple + feather;

  ctx.fillRect(x, screenY, 1, 1);
}`;

const golfSource = `a=(y,d=mag(k=(4+cos(y*31+t))*cos(i/99),e=y/5-11)-6)=>point((79+k*k)*cos(c=d/2-t/2+i%3*8)+200,99*sin(c/3)+200+d*d*sin(t*3-d)+3*sin(k*2)+y/13*k*(e+sin(e*4-d*4)))
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,96);for(t+=PI/60,i=2e4;i--;)a(i/995)}//#つぶやきProcessing`;

const defaultCopyLabels = {
  latex: "Копировать TeX",
  color: "Копировать TeX",
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
      <p class="view-lead">Каждый кадр — параметрическое отображение индекса точки в координаты холста. Здесь code-golf развёрнут в читаемую модель.</p>
    </header>

    <div class="theory-grid">
      <article class="theory-card">
        <header class="card-header">
          <div><span>01 / MODEL</span><h2>Математическая модель</h2></div>
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
          <div><span>02 / SOURCE</span><h2>Читаемое ядро</h2></div>
          <button class="button" type="button" @click="copy('code', kernelSource)">{{ copyLabels.code }}</button>
        </header>
        <pre class="tall-code"><code>{{ kernelSource }}</code></pre>
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
            u_i(t) &amp;= \operatorname{clamp}_{[0,1]} f(i,y_i,k_i,e_i,d_i,c_i,t), \\
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
    </div>
  </section>
</template>
