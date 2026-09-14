// CI-only clean installs. Never installs into or changes the repository lockfile.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const tarball = resolve(process.argv[2]);
const root = resolve(".consumer-check");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
for (const kind of ["vanilla", "react"]) {
  const dir = `${root}/${kind}`;
  await mkdir(dir, { recursive: true });
  await writeFile(
    `${dir}/package.json`,
    JSON.stringify({ private: true, type: "module" }),
  );
  run(
    npm,
    [
      "install",
      "--package-lock=false",
      tarball,
      "vite@7.1.3",
      "typescript@5.9.2",
      ...(kind === "react"
        ? [
            "react@19.2.8",
            "react-dom@19.2.8",
            "@types/react@19.2.18",
            "@types/react-dom@19.2.4",
          ]
        : []),
    ],
    dir,
  );
  const source =
    kind === "vanilla"
      ? "import {defineFluidHero} from 'fluid-wallpaper/hero'; import {getFluidPreset} from 'fluid-wallpaper/presets'; defineFluidHero(); getFluidPreset('aurora'); import {defineFluidInk, type FluidInkElement} from 'fluid-wallpaper/element'; defineFluidInk(); const field = document.createElement('fluid-ink') as FluidInkElement; document.body.append(field);"
      : "import {createRoot} from 'react-dom/client'; import {FluidField,FluidHero} from 'fluid-wallpaper/react'; import 'fluid-wallpaper/styles.css'; createRoot(document.getElementById('app')!).render(<><FluidHero preset='aurora'><h1>Hero</h1></FluidHero><FluidField dashboard /></>);";
  await writeFile(`${dir}/main.tsx`, source);
  await writeFile(
    `${dir}/index.html`,
    '<div id="app"></div><script type="module" src="./main.tsx"></script>',
  );
  await writeFile(
    `${dir}/tsconfig.json`,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: false,
        noEmit: true,
      },
      include: ["main.tsx"],
    }),
  );
  run(process.execPath, ["node_modules/typescript/bin/tsc"], dir);
  run(process.execPath, ["node_modules/vite/bin/vite.js", "build"], dir);
  if (kind === "vanilla") {
    try {
      await readFile(`${dir}/node_modules/react/package.json`);
      throw new Error("Vanilla consumer installed React");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    run(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "await import('fluid-wallpaper/element'); await import('fluid-wallpaper/engine'); await import('fluid-wallpaper/config'); await import('fluid-wallpaper/hero'); await import('fluid-wallpaper/presets');",
      ],
      dir,
    );
  } else {
    run(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "await import('fluid-wallpaper'); await import('fluid-wallpaper/react');",
      ],
      dir,
    );
  }
}
