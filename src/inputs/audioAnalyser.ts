import {
  LOG_BAND_COUNT,
  SILENT_AUDIO_FRAME,
  cloneAudioFrame,
  logBandEnergies,
  onsetUpdate,
  type AudioFrame,
} from "./audioMath";

export type AudioSource = "off" | "microphone" | "tab";
export type AudioStatus = "idle" | "live" | "denied";

const FFT_SIZE = 2048;

export class AudioAnalyser {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private bins: Uint8Array<ArrayBuffer> | null = null;
  private source: AudioSource = "off";
  private status: AudioStatus = "idle";
  private averages = new Array<number>(LOG_BAND_COUNT).fill(0);
  private pulses = new Array<number>(LOG_BAND_COUNT).fill(0);
  private frame: AudioFrame = cloneAudioFrame(SILENT_AUDIO_FRAME);

  getSource(): AudioSource {
    return this.source;
  }

  getStatus(): AudioStatus {
    return this.status;
  }

  getFrame(): AudioFrame {
    return this.frame;
  }

  async setSource(next: AudioSource): Promise<AudioStatus> {
    this.stopStream();
    this.source = next;
    if (next === "off") {
      this.status = "idle";
      this.frame = cloneAudioFrame(SILENT_AUDIO_FRAME);
      this.averages.fill(0);
      this.pulses.fill(0);
      return this.status;
    }
    try {
      const stream =
        next === "microphone"
          ? await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          : await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      for (const track of stream.getVideoTracks()) {
        track.stop();
        stream.removeTrack(track);
      }
      if (stream.getAudioTracks().length === 0) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        this.source = "off";
        this.status = "denied";
        return this.status;
      }
      const context = this.ensureContext();
      await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.55;
      const sourceNode = context.createMediaStreamSource(stream);
      sourceNode.connect(analyser);
      this.stream = stream;
      this.analyser = analyser;
      this.sourceNode = sourceNode;
      this.bins = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      this.status = "live";
      stream.getAudioTracks()[0]?.addEventListener("ended", () => {
        if (this.stream === stream) {
          void this.setSource("off");
        }
      });
    } catch {
      this.source = "off";
      this.status = "denied";
      this.frame = cloneAudioFrame(SILENT_AUDIO_FRAME);
    }
    return this.status;
  }

  sample(dt: number): AudioFrame {
    if (this.status !== "live" || !this.analyser || !this.bins) {
      this.frame = cloneAudioFrame(SILENT_AUDIO_FRAME);
      return this.frame;
    }
    this.analyser.getByteFrequencyData(this.bins);
    const bands = logBandEnergies(this.bins, this.context?.sampleRate ?? 44100, FFT_SIZE);
    for (let i = 0; i < LOG_BAND_COUNT; i += 1) {
      const stepped = onsetUpdate(bands[i] ?? 0, this.averages[i] ?? 0, this.pulses[i] ?? 0, dt);
      this.averages[i] = stepped.average;
      this.pulses[i] = stepped.pulse;
    }
    this.frame = { bands, pulses: this.pulses.slice() };
    return this.frame;
  }

  dispose(): void {
    this.stopStream();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
    this.source = "off";
    this.status = "idle";
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  private stopStream(): void {
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.bins = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
  }
}
