// Assemble an offline multi-host wallpaper zip from dist/ + wallpaper manifests.
import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
  readdir,
} from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(".");
const dist = resolve(root, "dist");
const templates = resolve(root, "wallpaper");
const outDir = resolve(root, "wallpaper-dist");
const manifest = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const version = manifest.version;
const zipName = `fluid-wallpaper-desktop-${version}.zip`;
const zipPath = resolve(root, zipName);

const htmlPath = resolve(dist, "wallpaper.html");
const html = await readFile(htmlPath, "utf8");
const assetRefs = [
  ...html.matchAll(/(?:src|href)=["'](\.?\.?\/?assets\/[^"']+)["']/g),
].map((match) => match[1].replace(/^\.\//, ""));

await rm(outDir, { recursive: true, force: true });
await mkdir(join(outDir, "assets"), { recursive: true });

for (const ref of assetRefs) {
  const name = basename(ref);
  await copyFile(resolve(dist, ref), join(outDir, "assets", name));
}

const packedHtml = html.replace(
  /((?:src|href)=["'])(?:\.\/)?assets\//g,
  "$1./assets/",
);
await writeFile(join(outDir, "wallpaper.html"), packedHtml);

for (const name of [
  "project.json",
  "LivelyInfo.json",
  "INSTALL.txt",
  "preview.png",
  "lively_t.png",
  "lively_p.png",
]) {
  await copyFile(join(templates, name), join(outDir, name));
}

await rm(zipPath, { force: true });

function zipWithTar() {
  const result = spawnSync("tar", ["-a", "-cf", zipPath, "-C", outDir, "."], {
    stdio: "inherit",
  });
  return result.status === 0;
}

function zipWithPowerShell() {
  const script = `Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force`;
  const result = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    stdio: "inherit",
  });
  return result.status === 0;
}

let ok = zipWithTar();
if (!ok) ok = zipWithPowerShell();
if (!ok) {
  throw new Error(
    "Could not create zip (need tar -a or PowerShell Compress-Archive)",
  );
}

const files = await readdir(outDir);
console.log(
  `Wallpaper pack ${zipName} (${files.length} files in wallpaper-dist/).`,
);
