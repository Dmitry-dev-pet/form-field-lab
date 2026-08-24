<script setup>
import AppHeader from "./components/AppHeader.vue";

function skipToMain() {
  const main = document.getElementById("main-content");
  main?.focus({ preventScroll: true });
  main?.scrollIntoView({ behavior: "auto", block: "start" });
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content" @click.prevent="skipToMain">К основному содержанию</a>
    <AppHeader />
    <main id="main-content" class="page-shell" tabindex="-1">
      <RouterView />
    </main>
    <footer class="app-footer">
      <span>Form / Field · исследовательский интерфейс</span>
      <span class="footer-links">
        <a href="https://x.com/yuruyurau" target="_blank" rel="noopener noreferrer">Основной автор: ア / @yuruyurau ↗</a>
        <a href="https://tsubuyaki.art/" target="_blank" rel="noopener noreferrer">Архив сообщества ↗</a>
      </span>
    </footer>
  </div>
</template>
