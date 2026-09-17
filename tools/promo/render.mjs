import { createServer } from "vite";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { once } from "node:events";
import { browser, delay } from "./cdp.mjs";
import { showcase, teaser } from "./shots.mjs";
const mode = process.argv[2] || "smoke";
const output = resolve("promo-output");
await mkdir(output, { recursive: true });
const port = Number(process.env.PROMO_PORT || 5199);
const server = await createServer({
  server: { host: "127.0.0.1", port, strictPort: true, hmr: false },
  logLevel: "error",
});
await server.listen();
let b;
try {
  b = await browser([
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-audio-capture=${resolve(output, "analyser-input.wav")}`,
  ]);
  await b.send("Network.enable");
  await b.send("Network.setBlockedURLs", {
    urls: [
      "*youtube.com*",
      "*ytimg.com*",
      "*googlevideo.com*",
      "*fonts.googleapis.com*",
    ],
  });
  await b.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await b.send("Page.navigate", {
    url: `http://127.0.0.1:${port}/tools/promo/stage.html`,
  });
  for (let i = 0; i < 100; i++) {
    if (await b.evaluate("window.ready===true")) break;
    await delay(100);
  }
  if (!(await b.evaluate("window.ready===true")))
    throw Error("Stage did not initialize");
  if (mode === "audio") {
    const samples = await b.evaluate("measureAudio()");
    const energies = samples.flatMap((s) => s.audio.bands);
    if (Math.max(...energies) < 0.05) throw Error("Analyser silent");
    await writeFile(resolve(output, "analyser.json"), JSON.stringify(samples));
    console.log(
      JSON.stringify({
        samples: samples.length,
        min: Math.min(...energies),
        max: Math.max(...energies),
      }),
    );
  } else {
    const portrait = mode === "teaser";
    const w = portrait ? 1080 : 1920,
      h = portrait ? 1920 : 1080;
    await b.send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const audio = JSON.parse(
      await readFile(resolve(output, "analyser.json"), "utf8").catch(
        () => "[]",
      ),
    );
    const shots =
      mode === "smoke"
        ? [{ ...showcase[0], frames: 45 }]
        : portrait
          ? teaser
          : showcase;
    const only = process.argv[3];
    const folder = resolve(output, mode);
    await mkdir(folder, { recursive: true });
    const reports = [];
    for (const s of shots) {
      if (only && !only.split(",").includes(s.id)) continue;
      console.log(`Capturing ${mode}/${s.id} (${s.frames} frames)`);
      const setup = await b.evaluate(
        `prepare(${JSON.stringify(s)},${portrait},${JSON.stringify(audio)})`,
      );
      const environment = await b.evaluate("environment()");
      const encoder = spawn(
        process.env.FFMPEG_PATH || "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "image2pipe",
          "-framerate",
          "30",
          "-vcodec",
          "mjpeg",
          "-i",
          "pipe:0",
          "-an",
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "18",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          resolve(folder, s.id + ".mp4"),
        ],
        { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] },
      );
      let stderr = "";
      encoder.stderr.on("data", (x) => (stderr += x));
      let encodingError;
      encoder.on("error", (e) => (encodingError = e));
      encoder.stdin.on("error", (e) => (encodingError = e));
      const completion = once(encoder, "close");
      const metrics = [];
      const started = Date.now();
      for (let n = 0; n < s.frames; n++) {
        const metric = await b.evaluate(`step(${n})`);
        if (s.mode === "audio") metrics.push(metric);
        const img = await b.send("Page.captureScreenshot", {
          format: "jpeg",
          quality: 94,
          fromSurface: true,
          captureBeyondViewport: false,
        });
        const buffer = Buffer.from(img.data, "base64");
        if (encodingError) throw encodingError;
        if (!encoder.stdin.write(buffer)) await once(encoder.stdin, "drain");
        if (n === 0 || n === Math.floor(s.frames / 2) || n === s.frames - 1)
          await writeFile(resolve(folder, `${s.id}-${n}.jpg`), buffer);
        if (n % 150 === 0) console.log(`${s.id}: ${n}/${s.frames}`);
      }
      encoder.stdin.end();
      const [code] = await completion;
      if (code) throw Error(stderr);
      const report = {
        shot: s,
        setup,
        environment,
        secondsToCapture: (Date.now() - started) / 1000,
        metrics,
        evidence: await b.evaluate("evidence()"),
        events: b.events.slice(),
      };
      reports.push(report);
      await writeFile(
        resolve(folder, s.id + ".json"),
        JSON.stringify(report, null, 2),
      );
    }
    await writeFile(
      resolve(folder, "run.json"),
      JSON.stringify({ reports, events: b.events }, null, 2),
    );
  }
} finally {
  b?.close();
  await server.close();
}
