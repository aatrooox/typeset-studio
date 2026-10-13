import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: { target: "esnext" },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4890",
        changeOrigin: true,
      },
      "/fonts": {
        target: "http://127.0.0.1:4890",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:4890",
        changeOrigin: true,
      },
    },
  },
});
