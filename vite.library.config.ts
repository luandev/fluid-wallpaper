import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "package-dist",
    lib: {
      entry: {
        hero: "src/hero/index.ts",
        "hero-auto": "src/hero/auto.ts",
        presets: "src/presets/index.ts",
        react: "src/react/index.ts",
        engine: "src/app/engine.ts",
        config: "src/app/config.ts",
        element: "src/element/index.ts",
        "element-auto": "src/element/auto.ts",
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: "styles",
    },
    rollupOptions: { external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/] },
  },
});
