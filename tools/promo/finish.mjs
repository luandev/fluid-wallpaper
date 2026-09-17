import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { showcase, teaser } from "./shots.mjs";
const out = resolve("promo-output");
async function run(args, probe = false) {
  return new Promise((res, rej) => {
    const child = spawn(
      probe
        ? process.env.FFPROBE_PATH || "ffprobe"
        : process.env.FFMPEG_PATH || "ffmpeg",
      args,
      { windowsHide: true },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (x) => (stdout += x));
    child.stderr.on("data", (x) => (stderr += x));
    child.on("error", rej);
    child.on("close", (code) =>
      code ? rej(Error(stderr)) : res({ stdout, stderr }),
    );
  });
}
await mkdir(out, { recursive: true });
await run([
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-i",
  resolve(out, "soundtrack.wav"),
  "-filter_complex",
  "[0:a]atrim=0:17,asetpts=PTS-STARTPTS[a];[0:a]atrim=43:49,asetpts=PTS-STARTPTS[b];[0:a]atrim=75:80,asetpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=0:a=1[out]",
  "-map",
  "[out]",
  "-c:a",
  "pcm_s16le",
  resolve(out, "teaser-soundtrack.wav"),
]);
const reports = [];
const measured = JSON.parse(
  await readFile(resolve(out, "analyser.json"), "utf8"),
);
const audioEvidence = [];
for (const [name, shots] of [
  ["showcase", showcase],
  ["teaser", teaser],
]) {
  let position = 0;
  const edit = [];
  for (const shot of shots) {
    const probe = JSON.parse(
      (
        await run(
          [
            "-v",
            "error",
            "-show_streams",
            "-of",
            "json",
            resolve(out, name, shot.id + ".mp4"),
          ],
          true,
        )
      ).stdout,
    );
    const stream = probe.streams[0];
    if (+stream.nb_frames !== shot.frames)
      throw Error(
        `${name}/${shot.id}: expected ${shot.frames}, got ${stream.nb_frames}`,
      );
    edit.push({
      ...shot,
      start: position / 30,
      end: (position + shot.frames) / 30,
    });
    position += shot.frames;
  }
  await writeFile(
    resolve(out, name + "-edit.json"),
    JSON.stringify(edit, null, 2),
  );
  const previous = shots.at(-2),
    closing = shots.at(-1),
    tailName = name + "-closing-dissolve.mp4";
  // A six-frame held outgoing handle preserves the exact storyboard duration.
  await run([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    resolve(out, name, previous.id + ".mp4"),
    "-i",
    resolve(out, name, closing.id + ".mp4"),
    "-filter_complex",
    `[0:v]tpad=stop_mode=clone:stop_duration=0.2[a];[a][1:v]xfade=transition=fade:duration=0.2:offset=${previous.frames / 30},format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-r",
    "30",
    "-frames:v",
    String(previous.frames + closing.frames),
    resolve(out, tailName),
  ]);
  await writeFile(
    resolve(out, name + "-concat.txt"),
    [
      ...shots.slice(0, -2).map((s) => `file '${name}/${s.id}.mp4'`),
      `file '${tailName}'`,
    ].join("\n"),
  );
  const file = resolve(out, `fluid-wallpaper-${name}.mp4`);
  const audioShot = JSON.parse(
    await readFile(resolve(out, name, "audio.json"), "utf8"),
  );
  let replayError = 0;
  for (let i = 0; i < audioShot.metrics.length; i++) {
    const bands = measured[i].audio.bands;
    const p = 0.12 * (bands.length - 1),
      j = Math.floor(p);
    const expected = bands[j] + (bands[j + 1] - bands[j]) * (p - j);
    replayError = Math.max(
      replayError,
      Math.abs(expected - audioShot.metrics[i].glow),
    );
  }
  if (replayError > 1e-8)
    throw Error(`${name}: measured audio replay mismatch`);
  audioEvidence.push({
    name,
    frames: audioShot.metrics.length,
    maximumDriverReplayError: replayError,
    glowRange: [
      Math.min(...audioShot.metrics.map((m) => m.glow)),
      Math.max(...audioShot.metrics.map((m) => m.glow)),
    ],
  });
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
    resolve(out, name + "-concat.txt"),
    "-i",
    resolve(
      out,
      name === "showcase" ? "soundtrack.wav" : "teaser-soundtrack.wav",
    ),
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "256k",
    "-ar",
    "48000",
    "-t",
    String(position / 30),
    "-movflags",
    "+faststart",
    file,
  ]);
  await run([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    "1",
    "-i",
    file,
    "-frames:v",
    "1",
    resolve(out, `${name}-poster.png`),
  ]);
  const probe = JSON.parse(
    (
      await run(
        [
          "-v",
          "error",
          "-count_frames",
          "-show_streams",
          "-show_format",
          "-of",
          "json",
          file,
        ],
        true,
      )
    ).stdout,
  );
  const v = probe.streams.find((s) => s.codec_type === "video"),
    a = probe.streams.find((s) => s.codec_type === "audio");
  if (
    v.width !== (name === "showcase" ? 1920 : 1080) ||
    v.height !== (name === "showcase" ? 1080 : 1920) ||
    v.r_frame_rate !== "30/1" ||
    v.codec_name !== "h264" ||
    v.pix_fmt !== "yuv420p" ||
    +v.nb_read_frames !== position ||
    a.codec_name !== "aac" ||
    Math.abs(+probe.format.duration - position / 30) > 0.04
  )
    throw Error(`${name}: export contract mismatch`);
  const analysis = await run([
    "-hide_banner",
    "-i",
    file,
    "-vf",
    "blackdetect=d=0.1:pix_th=0.02,freezedetect=n=0.0001:d=0.5",
    "-af",
    "astats=metadata=0:reset=0",
    "-f",
    "null",
    "-",
  ]);
  await writeFile(resolve(out, name + "-decode.log"), analysis.stderr);
  const bytes = await readFile(file);
  let offset = 0;
  const atoms = [];
  while (offset + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (size === 1) size = Number(bytes.readBigUInt64BE(offset + 8));
    if (size === 0) size = bytes.length - offset;
    atoms.push({ type, offset, size });
    if (size < 8) throw Error("Invalid MP4 atom");
    offset += size;
  }
  const fastStart =
    atoms.find((a) => a.type === "moov")?.offset <
    atoms.find((a) => a.type === "mdat")?.offset;
  if (!fastStart) throw Error("Fast-start metadata missing");
  reports.push({
    name,
    probe,
    fastStart,
    decodePassed: true,
    blackOrFreezeEvents: analysis.stderr
      .split("\n")
      .filter((l) => /black_start|freeze_start|freeze_end/.test(l)),
  });
  console.log(
    `${name}: ${position} frames, ${position / 30}s, H.264/AAC verified`,
  );
}
await writeFile(
  resolve(out, "validation.json"),
  JSON.stringify(reports, null, 2),
);
await writeFile(
  resolve(out, "audio-validation.json"),
  JSON.stringify(
    {
      samples: measured.length,
      maxSamplingJitterSeconds: Math.max(
        ...measured.map((s, i) => Math.abs(s.time - i / 30)),
      ),
      shots: audioEvidence,
    },
    null,
    2,
  ),
);
await writeFile(
  resolve(out, "index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>fluid—wallpaper films</title><style>body{background:#0b121c;color:#e6f5f1;font:18px system-ui;max-width:1100px;margin:60px auto;padding:0 24px}video{width:100%;background:#000}a{color:#9eefd9}.portrait{max-width:380px}p{line-height:1.6}</style><h1>fluid—wallpaper</h1><p>Living ink. Infinite motion.</p><h2>Showcase · 80 seconds</h2><video controls poster="showcase-poster.png" src="fluid-wallpaper-showcase.mp4"></video><h2>Portrait teaser · 28 seconds</h2><video class="portrait" controls poster="teaser-poster.png" src="fluid-wallpaper-teaser.mp4"></video><p><a href="soundtrack.wav">Original soundtrack — Chromatic currents</a> · <a href="validation.json">Export validation</a></p></html>`,
);
