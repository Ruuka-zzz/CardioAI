import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Repo-level shared/ holds enums used by both frontend and backend.
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // docker/docker-compose.yml maps the frontend to 3000.
    port: 3000,
    host: true,
    fs: {
      // Required so Vite may serve files from ../shared.
      allow: [".."],
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});