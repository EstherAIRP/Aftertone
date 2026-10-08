import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// The preview tool assigns a free port through PORT; the project has no Node typings.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "殘響日誌 Aftertone",
        short_name: "Aftertone",
        description: "私人耳鳴與意象日誌",
        theme_color: "#F5F8FC",
        background_color: "#F5F8FC",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // OAuth navigation must reach the server, including login and callback.
        navigateFallbackDenylist: [/^\/api(?:\/|\?|$)/],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,webp}"],
      },
    }),
  ],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: { "/api": "http://localhost:3000" },
  },
});
