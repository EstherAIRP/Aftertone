import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import HomeView from "./views/HomeView.vue";
import RecordView from "./views/RecordView.vue";
import DayView from "./views/DayView.vue";
import GalleryView from "./views/GalleryView.vue";
import InsightsView from "./views/InsightsView.vue";
import "./style.css";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView },
    { path: "/record", component: RecordView },
    { path: "/day/:date", component: DayView, props: true },
    { path: "/gallery", component: GalleryView },
    { path: "/insights", component: InsightsView },
  ],
});

createApp(App).use(createPinia()).use(router).mount("#app");
