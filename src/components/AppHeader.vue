<script setup>
const navigation = [
  { to: "/lab", label: "Лаборатория", short: "Лаб" },
  { to: "/evolution", label: "Эволюция", short: "Эволюция" },
  { to: "/archive", label: "Архив", short: "Архив" },
  { to: "/theory", label: "Теория", short: "Теория" }
];
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink class="brand" to="/lab" aria-label="Form / Field — главная лаборатория">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>Form / Field</span>
      </RouterLink>

      <nav class="app-nav" aria-label="Основные разделы">
        <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" :data-route="item.to.slice(1)">
          <span class="nav-long">{{ item.label }}</span>
          <span class="nav-short">{{ item.short }}</span>
        </RouterLink>
      </nav>

      <a class="author-link" href="https://x.com/yuruyurau" target="_blank" rel="noopener noreferrer">@yuruyurau ↗</a>
    </div>
  </header>
</template>
