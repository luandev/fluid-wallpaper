import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "docs-index": resolve(root, "docs/index.html"),
        "docs-settings": resolve(root, "docs/settings.html"),
        "docs-hero": resolve(root, "docs/hero.html"),
        "docs-gallery": resolve(root, "docs/gallery.html"),
        "docs-shaders": resolve(root, "docs/shaders.html"),
        "docs-contributing-presets": resolve(
          root,
          "docs/contributing-presets.html",
        ),

        index: resolve(root, "index.html"),
        play: resolve(root, "play.html"),
        embed: resolve(root, "embed.html"),
        liquid: resolve(root, "liquid.html"),
        diagnostics: resolve(root, "diagnostics.html"),
        usage: resolve(root, "usage.html"),
        component: resolve(root, "component.html"),
      },
    },
  },
});
