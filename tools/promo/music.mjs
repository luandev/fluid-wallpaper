// Original deterministic composition: "Chromatic currents", 120 BPM, D minor.
// No samples, external media, or music dependencies. PCM16 stereo, 48 kHz.
import { mkdir, writeFile } from "node:fs/promises";
const sr = 48000,
  seconds = 80,
  count = sr * seconds;
const pcm = new Float32Array(count * 2);
let seed = 91317;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12),
  tau = 2 * Math.PI;
const chords = [
  [50, 57, 60, 64],
  [46, 53, 57, 60],
  [53, 60, 64, 67],
  [48, 55, 58, 62],
];
for (let i = 0; i < count; i++) {
  const t = i / sr,
    beat = t * 2,
    p = t % 0.5,
    bar = Math.floor(t / 2),
    chord = chords[Math.floor(bar / 2) % 4];
  const intro = Math.min(1, t / 6),
    outro = Math.min(1, (seconds - t) / 3);
  let kick =
    Math.sin(tau * (49 * p + 8 * (1 - Math.exp(-p * 45)))) *
    Math.exp(-p * 18) *
    0.65;
  const sn = (t + 0.5) % 1,
    ns = noise();
  const snare =
    (ns * 0.19 + Math.sin(tau * 185 * sn) * 0.09) * Math.exp(-sn * 24);
  const hat = ns * 0.075 * Math.exp(-(t % 0.25) * 100);
  const bassNote = chord[0] - 12 + (Math.floor(beat * 2) % 8 === 7 ? 7 : 0),
    b = t % 0.25;
  const bass =
    (Math.sin(tau * hz(bassNote) * t) +
      0.22 * Math.sin(tau * hz(bassNote) * 2 * t)) *
    0.19 *
    Math.min(1, b * 150) *
    Math.exp(-b * 6);
  const a = t % 0.25,
    note = chord[[0, 2, 1, 3, 2, 1, 3, 1][Math.floor(beat * 2) % 8]] + 12;
  const arp = Math.sin(tau * hz(note) * t) * Math.exp(-a * 12) * 0.055 * intro;
  const duck = 0.48 + 0.52 * (1 - Math.exp(-p * 9));
  let l = 0,
    r = 0;
  for (const m of chord) {
    l += Math.sin(tau * hz(m) * t + 0.25 * Math.sin(t * 0.7)) * 0.035;
    r += Math.sin(tau * hz(m) * 1.001 * t + 0.25 * Math.sin(t * 0.63)) * 0.035;
  }
  const rhythm = (kick + snare + hat + bass) * intro + arp;
  pcm[i * 2] = (rhythm + l * duck) * outro;
  pcm[i * 2 + 1] = (rhythm + r * duck) * outro;
}
let peak = 0;
for (const x of pcm) peak = Math.max(peak, Math.abs(x));
function wav(start, duration, mono = false) {
  const channels = mono ? 1 : 2,
    n = Math.round(duration * sr),
    buffer = Buffer.alloc(44 + n * channels * 2);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sr, 24);
  buffer.writeUInt32LE(sr * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(buffer.length - 44, 40);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < channels; c++) {
      const k = (Math.round(start * sr) + i) * 2;
      const v = mono ? (pcm[k] + pcm[k + 1]) / 2 : pcm[k + c];
      buffer.writeInt16LE(
        Math.round((v / peak) * 0.86 * 32767),
        44 + (i * channels + c) * 2,
      );
    }
  return buffer;
}
await mkdir("promo-output", { recursive: true });
await writeFile("promo-output/soundtrack.wav", wav(0, 80));
await writeFile("promo-output/analyser-input.wav", wav(43, 12, true));
await writeFile(
  "promo-output/music.json",
  JSON.stringify(
    {
      title: "Chromatic currents",
      bpm: 120,
      key: "D minor",
      duration: 80,
      sampleRate: sr,
      seed: 91317,
      authorship:
        "Original procedural composition made for fluid-wallpaper; no third-party samples.",
      peak: 0.86,
    },
    null,
    2,
  ),
);
console.log("Original soundtrack and test microphone WAV written.");
