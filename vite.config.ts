import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "ToneAssist",
        short_name: "ToneAssist",
        description:
          "Professional audio analysis tool with real-time filtering",
        display: "standalone",
        orientation: "portrait",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
