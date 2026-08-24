<script setup>
import { nextTick, onMounted, ref } from "vue";
import {
  CHRONOPHORE_GENOME,
  CHRONOPHORE_GENOME_CHARACTERS,
  CHRONOPHORE_GENOME_LIMIT
} from "../data/chronophoreGenome.js";
import {
  PELAGION_EVOLUTION_VARIANTS,
  PELAGION_GENOME,
  PELAGION_GENOME_CHARACTERS,
  PELAGION_GENOME_LIMIT,
  PELAGION_LIVING_GENOME,
  PELAGION_LIVING_GENOME_CHARACTERS
} from "../data/pelagionGenome.js";
import {
  MNEMOPHORE_CORE_GENOME,
  MNEMOPHORE_RAW_VARIANTS
} from "../data/mnemophoreGenome.js";
import {
  compileTopologyGenome,
  TOPOLOGY_GENOME_PRESETS,
  topologyGenomeDefaults
} from "../data/topologyGenomes.js";
import { GRID_TOPOLOGY_PRESETS } from "../lib/meshTopology.js";

const topologyGenomeRows = TOPOLOGY_GENOME_PRESETS.map(preset => {
  const topology = GRID_TOPOLOGY_PRESETS.find(item => item.id === preset.id);
  const compiled = compileTopologyGenome(topologyGenomeDefaults(preset.id));
  return Object.freeze({
    id: preset.id,
    label: preset.label,
    characters: compiled.characters,
    code: compiled.code,
    euler: ["sphere", "ichthyo"].includes(preset.id) ? 2 : preset.id === "plane" ? 1 : 0,
    boundaries: topology.boundaries,
    orientable: topology.orientable
  });
});
const sphereTorusGenome = compileTopologyGenome(topologyGenomeDefaults("sphere-torus"));

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
\mathbf u_n &= \Pi_{S^2}(x_n,y_n), \\
\delta q_n &= \operatorname{norm}\!\left[
\mathbf u_{n-1}\times\mathbf u_n,\ 1+\mathbf u_{n-1}\cdot\mathbf u_n
\right], \\
q_n &= \delta q_n\,q_{n-1},
\qquad \mathbf p_i'=R(q_n)\mathbf p_i, \\
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

const pelagionLatexSource = String.raw`\begin{aligned}
u_i&=i/2000,
&\theta_i&=(i\bmod40)/6,
&s_i(t)&=\sin^3(4t-u_i),\\
r_i(t)&=60\sin^{0.6}\!\left(\frac{\pi u_i}{5}\right)\left(1+\frac{s_i}{9}\right),\\
x_i(t)&=(u_i-2.5)(60-5s_i),
&y_i(t)&=r_i\cos\theta_i+4u_i^2s_i,\\
z_i(t)&=r_i\sin\theta_i(1+s_i/4),\\
\mathbf P_i&=[x_i,y_i,z_i]^{\mathsf T},\\
I_{\rm axis}&=\{i:i\bmod40=0\},
&I_{\rm organ}&=\{i:i\bmod4=0\},\\
\mathbf P_i^{\rm organ}&=[x_i,0.45r_i\cos\theta_i+4u_i^2s_i,0.45z_i]^{\mathsf T},\\
I_{\rm cross}&=\{i:i\bmod200<40\},
&E_i^{\rm cross}&=\left(\mathbf P(u_i,\theta_i),\mathbf P(u_i,\theta_i+1/6)\right),\\
I_{\rm long}&=\{i:i\bmod10=0\},
&E_i^{\rm long}&=\left(\mathbf P(u_i,\theta_i),\mathbf P(u_i-0.08,\theta_i)\right),\\
x_i'&=x_i\cos a+z_i\sin a+200,
&y_i'&=y_i+200,
&a(t)&=t/3.
\end{aligned}`;

const chronophoreLatexSource = String.raw`\begin{aligned}
u_i &= \frac{\lfloor i/S\rfloor}{\lceil N/S\rceil-1}+v_mt,
& \beta_i &= 2\pi\frac{i\bmod S}{S},\\
\alpha_i &= 2\pi p u_i,
& \phi_i &= 2\pi q u_i+\omega_kt,\\
\psi_i &= \beta_i+2\pi h u_i+\omega_ft,\\
\rho_i &= R+K\left[1+B\sin(\omega_bt-2\pi q u_i)\right]\cos\phi_i
+A\cos\psi_i,\\
z_i &= K\left[1+B\sin(\omega_bt-2\pi q u_i)\right]\sin\phi_i
+A\sin\psi_i,\\
\mathbf P_i &=
\begin{bmatrix}
\rho_i\cos\alpha_i\\
\rho_i\sin\alpha_i\\
\lambda z_i
\end{bmatrix},\\
\Delta(u,v)&=\min\!\left(|u-v|,1-|u-v|\right),\\
E(u,\tau)&=Q\!\left[
e^{-\kappa\Delta(u,u_0+v_e\tau)^2}
+e^{-\kappa\Delta(u,u_0-v_e\tau)^2}
\right].
\end{aligned}`;

const mnemophoreLatexSource = String.raw`\begin{aligned}
q_i&=\left\lfloor i/50\right\rfloor,
&\alpha_i&=(i\bmod 50)/8,
&h_i&=i\bmod 5,\\
r_i(t)&=\begin{cases}
20,&h_i=0,\\
80\sin^{0.7}(\pi q_i/27)+8\sin(t/20-q_i),&h_i>0,
\end{cases}\\
y_i&=\begin{cases}9q_i+30,&h_i=0,\\5q_i-50,&h_i>0,\end{cases}
&\mathbf B_i(t)&=
\begin{bmatrix}r_i(t)\cos\alpha_i\\y_i\\r_i(t)\sin\alpha_i\end{bmatrix},\\
\mathbf p_i^{(n+1)}&=(1-\lambda)\mathbf p_i^{(n)}
+\lambda\mathbf B_i(t_n),
&0&<\lambda\ll1.
\end{aligned}`;

const sphereGridLatexSource = String.raw`\begin{aligned}
\mathcal M(t)&=(V,E,F,\mathbf P(t)),
&\mathbf P_i(t)&=(x_i(t),y_i(t),z_i(t)),\\
\chi(\mathcal M)&=|V|-|E|+|F|,\\
G_\tau(\theta)&=\operatorname{compile}(\tau,\theta),
&|G_\tau(\theta)|&\le 280,\\
\operatorname{Canvas}(t)&=\operatorname{p5}(G_\tau(\theta),t).&&
\end{aligned}

\begin{aligned}
R(t)&=r(1+\sin \omega t),
&q(v,t)&=R(t)+r\cos v,\\
\mathbf P(u,v,t)&=
\begin{bmatrix}
q\cos u\\
r\sin v\\
q\sin u
\end{bmatrix},
&R=0&\Rightarrow S^2,\quad R=r\Rightarrow\text{сингулярность},\quad R>r\Rightarrow T^2.
\end{aligned}

\begin{aligned}
\text{цилиндр: } &(0,v)\sim(1,v),\\
\text{тор: } &(0,v)\sim(1,v),\quad(u,0)\sim(u,1),\\
\text{лента Мёбиуса: } &(0,v)\sim(1,1-v).
\end{aligned}

\begin{aligned}
u_c &= 2\pi\frac{c}{C}+\omega t,
&v_r &= \pi\frac{r}{R-1},\\
\rho(u,v,t) &= \rho_0+A\sin(mu+nv-\nu t),\\
\mathbf P^{\text{sphere}}_{r,c}(t) &=
\begin{bmatrix}
\rho\sin v_r\cos u_c\\
\rho\cos v_r\\
\lambda\rho\sin v_r\sin u_c
\end{bmatrix}.
\end{aligned}

\begin{aligned}
\mathbf P^{\text{ichthyo}}(u,v,t)&=
\begin{bmatrix}
r\sin v\cos(u-\omega t/99)+Av^2\sin(\omega t-v)\\
L\cos v\\
r\sin v\sin(u-\omega t/99)
\end{bmatrix},
&0\le v\le\pi.
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
  pelagion: "Копировать TeX",
  chronophore: "Копировать TeX",
  mnemophore: "Копировать TeX",
  sphereGrid: "Копировать TeX",
  seed: "Копировать 280",
  livingSeed: "Копировать RAW гребка",
  chronophoreSeed: "Копировать 280",
  mnemophoreSeed: "Копировать 280",
  sphereGridSeed: "Копировать 280",
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
          <p>Положение пальца проецируется на виртуальную сферу \(S^2\). Между соседними точками жеста строится кватернион \(\delta q\), поэтому камера может свободно переворачивать форму и добавлять крен, а не упирается в два угла:</p>
          <div class="math-scroll">
            \[
            \begin{aligned}
            \mathbf u_n &amp;= \Pi_{S^2}(x_n,y_n), \\
            \delta q_n &amp;= \operatorname{norm}\!\left[
            \mathbf u_{n-1}\times\mathbf u_n,\ 1+\mathbf u_{n-1}\cdot\mathbf u_n
            \right], \\
            q_n &amp;= \delta q_n q_{n-1},
            \qquad \mathbf p_i'=R(q_n)\mathbf p_i, \\
            (x_i',Y_i') &amp;= (p_{i,x}'+200,\ p_{i,y}'+200).
            \end{aligned}
            \]
          </div>
          <p>«Инверсия Y» меняет знак вертикальной координаты виртуальной сферы. Скорость последнего поворота продолжается как затухающая угловая инерция; стрелки вращают по X/Y, клавиши Q/E — вокруг оси экрана.</p>
          <p>При единичном кватернионе \(q=(0,0,0,1)\) глубина не влияет на экранные координаты, поэтому кнопка «Вид спереди», двойное касание и клавиша 0 точно возвращают исходную работу автора.</p>
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

      <article id="sphere-grid" class="theory-card pelagion-theory">
        <header class="card-header">
          <div><span>06 / SEVEN RAW GENOMES</span><h2>Топология и живое движение внутри 280 символов</h2></div>
          <div class="card-actions">
            <button class="button" type="button" @click="copy('sphereGrid', sphereGridLatexSource)">{{ copyLabels.sphereGrid }}</button>
            <button class="button" type="button" @click="copy('sphereGridSeed', sphereTorusGenome.code)">{{ copyLabels.sphereGridSeed }}</button>
          </div>
        </header>
        <div class="theory-body pelagion-theory-grid">
          <div>
            <p>M0 состоит из семи самостоятельных исполняемых геномов: пяти топологических классов, органической деформации сферы и автоматического перехода сфера↔тор. После проверки лимита лаборатория передаёт выбранную строку непосредственно p5.js.</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              \mathcal M(t)&amp;=(V,E,F,\mathbf P(t)),
              &amp;\mathbf P_i(t)&amp;=(x_i(t),y_i(t),z_i(t)),\\
              \chi(\mathcal M)&amp;=|V|-|E|+|F|,\\
              G_\tau(\theta)&amp;=\operatorname{compile}(\tau,\theta),
              &amp;|G_\tau(\theta)|&amp;\le 280,\\
              \operatorname{Canvas}(t)&amp;=\operatorname{p5}(G_\tau(\theta),t).
              \end{aligned}
              \]
            </div>
            <p>Переход использует тороидальный параметрический домен, но меняет его образ в пространстве. При \(R=0\) сетка дважды накрывает сферу, при \(0&lt;R&lt;r\) самопересекается, при \(R=r\) проходит сингулярность и только при \(R&gt;r\) становится обычным кольцевым тором:</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              R(t)&amp;=r(1+\sin \omega t),
              &amp;q(v,t)&amp;=R(t)+r\cos v,\\
              \mathbf P(u,v,t)&amp;=
              \begin{bmatrix}
              q\cos u\\ r\sin v\\ q\sin u
              \end{bmatrix}.
              \end{aligned}
              \]
            </div>
            <p>Различие возникает в шве параметрического прямоугольника. Цилиндр склеивает только левый и правый края, тор — ещё верх и низ, а лента Мёбиуса перед склейкой переворачивает поперечную координату:</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              \text{цилиндр: } &amp;(0,v)\sim(1,v),\\
              \text{тор: } &amp;(0,v)\sim(1,v),\quad(u,0)\sim(u,1),\\
              \text{Мёбиус: } &amp;(0,v)\sim(1,1-v).
              \end{aligned}
              \]
            </div>
            <p>Ихтиоморф показывает, что сетка почти бесплатна: список рёбер не хранится, оба направления решётки превращаются в 7200 вызовов <code>point(P(...))</code>. Восемь точек подряд визуально образуют ребро, а один бит индекса выбирает параллель или меридиан. Сферическая топология сохраняет \(\chi=2\), а член \(Av^2\sin(\omega t-v)\) усиливает изгиб к хвосту:</p>
            <div class="math-scroll">
              \[
              \mathbf P_{fish}(u,v,t)=
              \begin{bmatrix}
              r\sin v\cos(u-\omega t/99)+Av^2\sin(\omega t-v)\\
              L\cos v\\
              r\sin v\sin(u-\omega t/99)
              \end{bmatrix},\qquad 0\le v\le\pi.
              \]
            </div>
            <div class="topology-table-wrap">
              <table class="topology-table">
                <thead><tr><th>Поверхность</th><th>RAW</th><th>χ домена</th><th>Границы</th><th>Ориентация</th></tr></thead>
                <tbody>
                  <tr v-for="genome in topologyGenomeRows" :key="genome.id">
                    <td>{{ genome.label }}</td>
                    <td>{{ genome.characters }}/280</td>
                    <td>{{ genome.euler }}</td>
                    <td>{{ genome.boundaries }}</td>
                    <td>{{ genome.orientable ? "да" : "нет" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="pelagion-genome">
            <div class="genome-meter">
              <span>Сфера↔тор · один исполняемый RAW</span>
              <strong>{{ sphereTorusGenome.characters }} / {{ sphereTorusGenome.limit }}</strong>
            </div>
            <pre><code>{{ sphereTorusGenome.code }}</code></pre>
            <p>Это не переключатель между двумя заготовками. Радиус \(R(t)\) находится внутри самой короткой программы, поэтому RAW самостоятельно совершает полный цикл. Изменение топологии образа требует сингулярности — формула не скрывает этот момент.</p>
            <ul class="topology-genome-counts" aria-label="Размеры семи исходных геномов">
              <li v-for="genome in topologyGenomeRows" :key="genome.id"><span>{{ genome.label }}</span><code>{{ genome.characters }}/280</code></li>
            </ul>
            <div class="pelagion-links">
              <RouterLink :to="{ name: 'lab', query: { form: 'sphere-grid' } }">Открыть редактор RAW-геномов →</RouterLink>
            </div>
          </div>
        </div>
        <div class="tiny-code-context">
          <p><strong>Источник истины.</strong> Итогом является только строка <code>Gτ(θ)</code>. В переходном геноме и сфера, и тор уже находятся в этой строке как разные фазы одного закона; второго рендерера нет.</p>
          <p><strong>Граница управления.</strong> Перетаскивание пальцем меняет только матрицу камеры и потому не меняет ни одного символа RAW. Генетические ползунки, наоборот, немедленно пересобирают исполняемый код.</p>
        </div>
      </article>

      <article id="pelagion" class="theory-card pelagion-theory">
        <header class="card-header">
          <div><span>07 / SYNTHETIC ORGANISM</span><h2>Пелагион: одно тело, вложенная анатомия</h2></div>
          <div class="card-actions">
            <button class="button" type="button" @click="copy('pelagion', pelagionLatexSource)">{{ copyLabels.pelagion }}</button>
            <button class="button" type="button" @click="copy('seed', PELAGION_GENOME)">{{ copyLabels.seed }}</button>
            <button class="button" type="button" @click="copy('livingSeed', PELAGION_LIVING_GENOME)">{{ copyLabels.livingSeed }}</button>
          </div>
        </header>
        <div class="theory-body pelagion-theory-grid">
          <div>
            <p>Источник линии — точный 274-символьный «Живой гребок RAW» из версии <code>34fe67e</code>. Параметр <code>u</code> непрерывно проходит от головы к хвосту, а 40 угловых отсчётов собирают вокруг него одну оболочку. Организм нигде не разделяется на отдельные тело и хвост.</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              u_i&amp;=i/2000,
              &amp;\theta_i&amp;=(i\bmod40)/6,\\
              s_i(t)&amp;=\sin^3(4t-u_i),
              &amp;r_i(t)&amp;=60\sin^{0.6}\!\left(\frac{\pi u_i}{5}\right)\left(1+\frac{s_i}{9}\right).
              \end{aligned}
              \]
            </div>
            <p>Один радиус <code>r_i</code> одновременно задаёт ширину и глубину цельной оболочки. Фаза <code>s_i</code> сжимает продольную координату и раскрывает поперечное сечение:</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              x_i(t)&amp;=(u_i-2.5)(60-5s_i),\\
              y_i(t)&amp;=r_i\cos\theta_i+4u_i^2s_i,\\
              z_i(t)&amp;=r_i\sin\theta_i(1+s_i/4).
              \end{aligned}
              \]
            </div>
            <p>Формульный RGB-цвет \((180+70s_i,220,255)\) идёт по той же фазе, поэтому гребок читается одновременно в геометрии и свете. Ручная проекция сохраняет настоящую координату <code>z</code> и свободную камеру.</p>
          </div>
          <div class="pelagion-genome">
            <div class="genome-meter">
              <span>Архивный предок</span>
              <strong>{{ PELAGION_GENOME_CHARACTERS }} / {{ PELAGION_GENOME_LIMIT }}</strong>
            </div>
            <pre><code>{{ PELAGION_GENOME }}</code></pre>
            <div class="genome-meter">
              <span>Пелагион · неизменное основание</span>
              <strong>{{ PELAGION_LIVING_GENOME_CHARACTERS }} / {{ PELAGION_GENOME_LIMIT }}</strong>
            </div>
            <pre><code>{{ PELAGION_LIVING_GENOME }}</code></pre>
            <ul class="topology-genome-counts" aria-label="Вложенные бюджеты Пелагиона">
              <li v-for="(variant, index) in PELAGION_EVOLUTION_VARIANTS" :key="variant.id">
                <span>{{ [280, 512, 768][index] }} · {{ variant.title }}</span><code>{{ variant.sketch.code.length }}</code>
              </li>
            </ul>
            <p>Бюджет 280 исполняет исторический 274-символьный RAW без изменений. Уровень 512 приписывает к его точному циклу 2500 ярких точек внутреннего органа и 250 точек золотой оси. Уровень 768 сохраняет оба слоя и добавляет 2000 поперечных и 1000 продольных связей — поэтому оболочка превращается в явно читаемую двухнаправленную сетку. Каждый следующий RAW начинается с буквального цикла исторической версии. Камера и текущая фаза переходят между уровнями вне лимита.</p>
            <div class="pelagion-links">
              <RouterLink :to="{ name: 'lab', query: { form: 'pelagion' } }">Открыть живую форму →</RouterLink>
              <RouterLink to="/community#pelagion">Карта происхождения →</RouterLink>
            </div>
          </div>
        </div>
        <div class="tiny-code-context">
          <p><strong>Авторская граница.</strong> Пелагион — самостоятельный синтез Form / Field, вдохновлённый механизмами сообщества. Он не объявляется работой перечисленных художников и не копирует их минимизированные выражения.</p>
        </div>
      </article>

      <article id="chronophore" class="theory-card pelagion-theory chronophore-theory">
        <header class="card-header">
          <div><span>08 / PHASE ORGANISM</span><h2>Хронофор: живой узел времени</h2></div>
          <div class="card-actions">
            <button class="button" type="button" @click="copy('chronophore', chronophoreLatexSource)">{{ copyLabels.chronophore }}</button>
            <button class="button" type="button" @click="copy('chronophoreSeed', CHRONOPHORE_GENOME)">{{ copyLabels.chronophoreSeed }}</button>
          </div>
        </header>
        <div class="theory-body pelagion-theory-grid">
          <div>
            <p>Хронофор не хранит постоянный набор частиц. Его идентичность задают два целых числа: <code>p</code> — число оборотов вокруг центра и <code>q</code> — число переплетений. Материя течёт по параметру <code>u</code>, но топологический закон остаётся прежним.</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              u_i &amp;= \frac{\lfloor i/S\rfloor}{\lceil N/S\rceil-1}+v_mt,
              &amp;\beta_i &amp;= 2\pi\frac{i\bmod S}{S},\\
              \alpha_i &amp;=2\pi p u_i,
              &amp;\phi_i &amp;=2\pi q u_i+\omega_kt,\\
              \rho_i &amp;=R+K\cos\phi_i+A\cos\psi_i,
              &amp;z_i &amp;=K\sin\phi_i+A\sin\psi_i,\\
              \mathbf P_i &amp;=
              \begin{bmatrix}
              \rho_i\cos\alpha_i\\
              \rho_i\sin\alpha_i\\
              \lambda z_i
              \end{bmatrix}.
              \end{aligned}
              \]
            </div>
            <p>Команда возмущения создаёт две волны, бегущие в противоположных направлениях по замкнутой координате. Когда они встречаются на обратной стороне узла, половина нитей образует дочернее кольцо; затем неизменный закон <code>(p,q)</code> собирает рассеянные точки обратно.</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              \Delta(u,v)&amp;=\min\left(|u-v|,1-|u-v|\right),\\
              E(u,\tau)&amp;=Q\left[
              e^{-\kappa\Delta(u,u_0+v_e\tau)^2}
              +e^{-\kappa\Delta(u,u_0-v_e\tau)^2}
              \right].
              \end{aligned}
              \]
            </div>
          </div>
          <div class="pelagion-genome">
            <div class="genome-meter">
              <span>Автономный фазовый зародыш</span>
              <strong>{{ CHRONOPHORE_GENOME_CHARACTERS }} / {{ CHRONOPHORE_GENOME_LIMIT }}</strong>
            </div>
            <pre><code>{{ CHRONOPHORE_GENOME }}</code></pre>
            <p>RAW-геном сохраняет узел <code>(2,3)</code>, девять нитей, независимую координату <code>z</code>, цветовой поток и автоматический поворот. Для совместимости глубина проецируется в обычный 2D canvas. Эхо, деление и рой остаются теоретическим расширением, пока не будут закодированы в исполняемую строку.</p>
            <div class="pelagion-links">
              <RouterLink :to="{ name: 'lab', query: { form: 'chronophore' } }">Открыть Хронофор →</RouterLink>
            </div>
          </div>
        </div>
        <div class="tiny-code-context">
          <p><strong>Граница сущности.</strong> Конкретные точки не считаются её телом: они могут рассеяться и замениться. Хронофор остаётся собой, пока сохраняются переплетение <code>(p,q)</code> и причинная непрерывность фазовых волн.</p>
          <p><strong>Граница наблюдателя.</strong> Поворот пальцем меняет только матрицу проекции и стартовый ракурс RAW-отпечатка. Он не изменяет геном и не создаёт потомка; новое поколение возникает только после явного изменения формулы, параметров, слоёв или цвета и команды «Запечатлеть».</p>
        </div>
      </article>

      <article id="mnemophore" class="theory-card pelagion-theory chronophore-theory">
        <header class="card-header">
          <div><span>09 / MEMORY ORGANISM</span><h2>Мнемофора: купол, помнящий движение</h2></div>
          <div class="card-actions">
            <button class="button" type="button" @click="copy('mnemophore', mnemophoreLatexSource)">{{ copyLabels.mnemophore }}</button>
            <button class="button" type="button" @click="copy('mnemophoreSeed', MNEMOPHORE_CORE_GENOME)">{{ copyLabels.mnemophoreSeed }}</button>
          </div>
        </header>
        <div class="theory-body pelagion-theory-grid">
          <div>
            <p>RAW Мнемофоры хранит координаты каждой точки между кадрами. Формула задаёт не готовую картинку, а движущуюся цель: пульсирующий купол и десять лент под ним. Точки догоняют эту цель с небольшим запаздыванием, поэтому одинакового текущего времени недостаточно, чтобы восстановить форму: важна предыдущая траектория.</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              q_i&amp;=\left\lfloor i/50\right\rfloor,
              &amp;\alpha_i&amp;=(i\bmod 50)/8,
              &amp;h_i&amp;=i\bmod 5,\\
              r_i(t)&amp;=\begin{cases}
              20,&amp;h_i=0,\\
              80\sin^{0.7}(\pi q_i/27)+8\sin(t/20-q_i),&amp;h_i&gt;0,
              \end{cases}\\
              y_i&amp;=\begin{cases}9q_i+30,&amp;h_i=0,\\5q_i-50,&amp;h_i&gt;0.\end{cases}
              \end{aligned}
              \]
            </div>
            <p>Индекс делит тысячу точек на 20 уровней купола. Остаток (h_i=0) выбирает ровно десять продольных лент; остальные точки собирают оболочку. Их координаты обновляются рекуррентно:</p>
            <div class="math-scroll">
              \[
              \begin{aligned}
              \mathbf B_i(t)&amp;=
              \begin{bmatrix}
              r_i(t)\cos\alpha_i\\y_i\\r_i(t)\sin\alpha_i
              \end{bmatrix},\\
              \mathbf p_i^{(n+1)}&amp;=(1-\lambda)\mathbf p_i^{(n)}
              +\lambda\mathbf B_i(t_n),
              &amp;0&lt;\lambda\ll1.
              \end{aligned}
              \]
            </div>
            <p>В уровне 512 отдельная подгруппа (h_i=1) образует светящееся внутреннее ядро, а синусоидальная поправка ведёт волну вдоль лент. Цвет кодирует уровень купола и отличает ядро от шлейфа. Уровень 768 соединяет соседей в мембрану, не меняя сам организм.</p>
          </div>
          <div class="pelagion-genome">
            <div class="genome-meter">
              <span>Купол и шлейф</span>
              <strong>{{ MNEMOPHORE_CORE_GENOME.length }} / 280</strong>
            </div>
            <pre><code>{{ MNEMOPHORE_CORE_GENOME }}</code></pre>
            <ul class="topology-genome-counts" aria-label="Уровни бюджета Мнемофоры">
              <li v-for="variant in MNEMOPHORE_RAW_VARIANTS" :key="variant.id">
                <span>{{ variant.title }}</span><code>{{ variant.sketch.code.length }}</code>
              </li>
            </ul>
            <p>При 280 символах уже видны пульсирующий купол, десять лент, память координат и внешняя 3D-камера. Бюджет 512 добавляет ядро, волну и формульный цвет; 768 — продольные и поперечные рёбра мембраны. Лаборатория выбирает только реально помещающийся код и исполняет именно его.</p>
            <div class="pelagion-links">
              <RouterLink :to="{ name: 'lab', query: { form: 'mnemophore' } }">Открыть бюджет RAW →</RouterLink>
            </div>
          </div>
        </div>
        <div class="tiny-code-context">
          <p><strong>Происхождение идеи.</strong> Мнемофора — самостоятельная реализация Form / Field, но принцип сохраняемого массива частиц, который каждый кадр обновляет собственные координаты, сознательно развивает публичный <a href="https://x.com/yuruyurau/status/1588062547315679232" target="_blank" rel="noopener noreferrer">скетч @yuruyurau ↗</a>. Авторство исходной работы не переносится на нашу сущность.</p>
          <p><strong>Граница наблюдателя.</strong> Кватернион камеры хранится отдельно. Касание вращает уже существующую историю и не вызывает перерождение, мутацию или новый случайный посев.</p>
        </div>
      </article>
    </div>
  </section>
</template>
