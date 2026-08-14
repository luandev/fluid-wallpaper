import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
});
