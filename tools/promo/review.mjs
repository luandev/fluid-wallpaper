import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import { browser, delay } from "./cdp.mjs";
import { showcase, teaser } from "./shots.mjs";
const out = resolve("promo-output");
const run = (args) =>
  new Promise((res, rej) => {
    const c = spawn(process.env.FFMPEG_PATH || "ffmpeg", args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    c.stderr.on("data", (x) => (err += x));
    c.on("error", rej);
    c.on("close", (code) => (code ? rej(Error(err)) : res()));
  });
// First/middle/last contact sheets preserve every shot in narrative order.
for (const [name, shots] of [
  ["showcase", showcase],
  ["teaser", teaser],
]) {
  for (let start = 0; start < shots.length; start += 4) {
    const group = shots.slice(start, start + 4),
      list = group.flatMap((s) =>
        [0, Math.floor(s.frames / 2), s.frames - 1].map(
          (n) => `file '${name}/${s.id}-${n}.jpg'`,
        ),
      );
    const path = resolve(out, `${name}-review-${start}.txt`);
    await writeFile(path, list.join("\n"));
    await run([
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      path,
      "-vf",
      `scale=${name === "showcase" ? "640:360" : "270:480"},tile=3x${group.length}`,
      "-frames:v",
      "1",
      resolve(out, `${name}-review-${start}.jpg`),
    ]);
  }
}
const server = await createServer({
  server: { host: "127.0.0.1", port: 5199, strictPort: true, hmr: false },
  logLevel: "error",
});
await server.listen();
let b;
const reports = [];
try {
  b = await browser();
  await b.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await b.send("Page.navigate", {
    url: "http://127.0.0.1:5199/promo-output/index.html",
  });
  await delay(1000);
  for (const name of ["showcase", "teaser"]) {
    console.log(`Browser playing complete ${name} export`);
    const result = await b.evaluate(`(async()=>{
   document.body.innerHTML='<video id="video" style="width:100%;height:95vh" src="fluid-wallpaper-${name}.mp4"></video>';
   const v=document.querySelector('video');v.preload='auto';v.volume=0.3;
   await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=()=>j(Error(v.error.message));});
   const start=performance.now();let presented=0;const times=[];
   const frame=(now,meta)=>{presented++;if(presented%30===0)times.push(meta.mediaTime);if(!v.ended)v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);
   await v.play();await new Promise((r,j)=>{v.onended=r;v.onerror=()=>j(Error(v.error.message));});
   const q=v.getVideoPlaybackQuality();return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,ended:v.ended,wallSeconds:(performance.now()-start)/1000,presented,quality:{totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames,corruptedVideoFrames:q.corruptedVideoFrames},mediaSeconds:times};
  })()`);
    if (!result.ended) throw Error("Playback incomplete");
    reports.push({ name, ...result });
    console.log(`${name}: complete, ${result.presented} video callbacks`);
  }
  await writeFile(
    resolve(out, "browser-playback.json"),
    JSON.stringify({ reports, events: b.events }, null, 2),
  );
} finally {
  b?.close();
  await server.close();
}
