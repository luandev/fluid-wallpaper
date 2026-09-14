export const LOG_BAND_COUNT = 32;

export type AudioFrame = {
  bands: number[];
  pulses: number[];
};

export const SILENT_AUDIO_FRAME: AudioFrame = {
  bands: Array.from({ length: LOG_BAND_COUNT }, () => 0),
  pulses: Array.from({ length: LOG_BAND_COUNT }, () => 0),
};

export function cloneAudioFrame(frame: AudioFrame): AudioFrame {
  return {
    bands: frame.bands.slice(),
    pulses: frame.pulses.slice(),
  };
}

/** Map linear FFT magnitudes onto log-spaced bands in [0,1], Winamp / WMP style. */
export function logBandEnergies(
  magnitudes: ArrayLike<number>,
  sampleRate = 44100,
  fftSize = 2048,
): number[] {
  const bands = new Array<number>(LOG_BAND_COUNT).fill(0);
  const counts = new Array<number>(LOG_BAND_COUNT).fill(0);
  const nyquist = sampleRate / 2;
  const binHz = sampleRate / Math.max(2, fftSize);
  const minHz = 20;
  const maxHz = Math.min(nyquist, 16000);
  const logMin = Math.log(minHz);
  const logRange = Math.log(maxHz) - logMin;
  const maxIndex = magnitudes.length;
  for (let i = 1; i < maxIndex; i += 1) {
    const hz = i * binHz;
    if (hz < minHz || hz > maxHz || logRange <= 0) {
      continue;
    }
    const t = (Math.log(hz) - logMin) / logRange;
    const index = Math.min(
      LOG_BAND_COUNT - 1,
      Math.max(0, Math.floor(t * LOG_BAND_COUNT)),
    );
    const mag = magnitudes[i] ?? 0;
    const unit = mag > 1 ? mag / 255 : mag;
    bands[index] += Number.isFinite(unit) ? Math.min(1, Math.max(0, unit)) : 0;
    counts[index] += 1;
  }
  for (let b = 0; b < LOG_BAND_COUNT; b += 1) {
    bands[b] = counts[b] > 0 ? Math.min(1, bands[b] / counts[b]) : 0;
  }
  return bands;
}

export function sampleLogBand(bands: readonly number[], band: number): number {
  if (bands.length === 0) {
    return 0;
  }
  const t = Math.min(1, Math.max(0, band)) * (bands.length - 1);
  const index = Math.floor(t);
  const frac = t - index;
  const a = bands[index] ?? 0;
  const next = bands[Math.min(bands.length - 1, index + 1)] ?? 0;
  return a + (next - a) * frac;
}

export function onsetUpdate(
  energy: number,
  average: number,
  pulse: number,
  dt: number,
): { average: number; pulse: number } {
  const safeEnergy = Number.isFinite(energy)
    ? Math.min(1, Math.max(0, energy))
    : 0;
  const nextAverage = average * 0.94 + safeEnergy * 0.06;
  let nextPulse = pulse * Math.exp(-Math.max(0, dt) / 0.16);
  if (safeEnergy > 0.08 && safeEnergy > nextAverage * 1.35) {
    nextPulse = Math.min(1, Math.max(nextPulse, safeEnergy));
  }
  return {
    average: nextAverage,
    pulse: Math.min(1, Math.max(0, nextPulse)),
  };
}
