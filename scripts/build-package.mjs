import { build } from "vite";
import { execFileSync } from "node:child_process";
import {
  readFile,
  writeFile,
  copyFile,
  readdir,
  access,
} from "node:fs/promises";
import { dirname, join } from "node:path";

await build({ configFile: "vite.library.config.ts" });
execFileSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.library.json"],
  { stdio: "inherit" },
);
// NodeNext consumers need explicit relative declaration extensions. CSS is a separate public import.
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function fixDeclarations(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await fixDeclarations(path);
    else if (path.endsWith(".d.ts")) {
      let source = await readFile(path, "utf8");
      source = source.replace(/^import ["'][^"']+\.css["'];?\r?\n/gm, "");
      const pieces = [];
      let cursor = 0;
      const pattern = /(from\s+["']|import\(["'])(\.[^"']+)(["'])/g;
      for (const match of source.matchAll(pattern)) {
        const specifier = match[2];
        const start = match.index;
        pieces.push(source.slice(cursor, start));
        if (/\.[a-z]+$/i.test(specifier)) {
          pieces.push(match[0]);
        } else {
          const base = join(dirname(path), specifier);
          const resolved = (await exists(join(base, "index.d.ts")))
            ? `${specifier}/index.js`
            : `${specifier}.js`;
          pieces.push(`${match[1]}${resolved}${match[3]}`);
        }
        cursor = start + match[0].length;
      }
      pieces.push(source.slice(cursor));
      await writeFile(path, pieces.join(""));
    }
  }
}
await fixDeclarations("package-dist/types");
for (const [name, target] of Object.entries({
  hero: "hero/index",
  "hero-auto": "hero/auto",
  presets: "presets/index",
  react: "react/index",
  element: "element/index",
  engine: "app/engine",
  config: "app/config",
  "element-auto": "element/auto",
})) {
  await writeFile(
    `package-dist/${name}.d.ts`,
    `export * from './types/${target}.js';\n`,
  );
}
const source = JSON.parse(await readFile("package.json", "utf8"));
const entry = (js, types) => ({
  types: `./types/${types}.d.ts`,
  import: `./${js}.js`,
  default: `./${js}.js`,
});
const manifest = {
  name: source.name,
  version: source.version,
  type: "module",
  description:
    "Generative WebGL2 fluid field for web components and React (preview)",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/luandev/fluid-wallpaper.git",
  },
  homepage: "https://luandev.github.io/fluid-wallpaper/docs/",
  exports: {
    ".": entry("react", "react/index"),
    "./react": entry("react", "react/index"),
    "./engine": entry("engine", "app/engine"),
    "./config": entry("config", "app/config"),
    "./element": entry("element", "element/index"),
    "./element/auto": entry("element-auto", "element/auto"),
    "./hero": entry("hero", "hero/index"),
    "./hero/auto": entry("hero-auto", "hero/auto"),
    "./presets": entry("presets", "presets/index"),
    "./styles.css": "./styles.css",
  },
  types: "./types/react/index.d.ts",
  files: ["*.js", "*.css", "types", "README.md", "LICENSE"],
  sideEffects: ["**/*.css", "./element-auto.js", "./hero-auto.js"],
  peerDependencies: source.peerDependencies,
  peerDependenciesMeta: {
    react: { optional: true },
    "react-dom": { optional: true },
  },
  publishConfig: {
    access: "public",
    tag: source.version.includes("-") ? "next" : "latest",
  },
};
await writeFile(
  "package-dist/package.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await copyFile("docs/PACKAGE_README.md", "package-dist/README.md");
await copyFile("LICENSE", "package-dist/LICENSE");
