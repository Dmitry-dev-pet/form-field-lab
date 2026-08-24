import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  { path: "/", redirect: "/lab" },
  {
    path: "/lab",
    name: "lab",
    component: () => import("./views/LabView.vue"),
    meta: { title: "Лаборатория" }
  },
  {
    path: "/evolution",
    name: "evolution",
    component: () => import("./views/EvolutionView.vue"),
    meta: { title: "Эволюция" }
  },
  {
    path: "/archive",
    name: "archive",
    component: () => import("./views/ArchiveView.vue"),
    meta: { title: "Архив" }
  },
  {
    path: "/community",
    name: "community",
    component: () => import("./views/CommunityView.vue"),
    meta: { title: "Community DNA" }
  },
  {
    path: "/sketch/:id",
    name: "sketch",
    component: () => import("./views/SketchView.vue"),
    meta: { title: "Скетч" }
  },
  {
    path: "/theory",
    name: "theory",
    component: () => import("./views/TheoryView.vue"),
    meta: { title: "Теория" }
  },
  { path: "/:pathMatch(.*)*", redirect: "/lab" }
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;
    if (to.hash) {
      return new Promise(resolve => {
        window.setTimeout(() => resolve({ el: to.hash, top: 92 }), 0);
      });
    }
    return { top: 0 };
  }
});

router.afterEach(route => {
  document.title = `${route.meta.title || "Form / Field"} — Form / Field`;
});

export default router;
