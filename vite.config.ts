import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false
  },
  test: {
    environment: "jsdom"
  }
});
