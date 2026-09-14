import {
  assertConfig,
  clampConfig,
  cloneConfig,
  defaultConfig,
  mergeConfig,
  type FluidConfig,
} from "./config";
import { applyDrivers, copyConfigOnto } from "./drivers";
import { tweenMaterials } from "./colorTween";
import { dyeLooksAllBlack, dyeStatsFromRgba8, type DyeStats } from "./dyeMix";
import { wiggleMotion } from "./wiggle";
import { PointerInput, type PointerSplat } from "../inputs/pointer";
import { AudioAnalyser, type AudioSource, type AudioStatus } from "../inputs/audioAnalyser";
import type { AudioFrame } from "../inputs/audioMath";
import { BrowserPlatform } from "../platform/browser";
import { blitDye } from "../render/display";
import {
  detectCaps,
  GL,
  selectSimTextureFormat,
  type SimFormat,
} from "../sim/capabilities";
import {
  createByteFbo,
  createFbo,
  createFullscreenVao,
  createGl,
  deleteFbo,
} from "../sim/gpu";
import { createPasses, deletePasses, type ShaderPasses } from "../sim/programs";
import { FluidSolver } from "../sim/solver";
import type { PerfSample } from "./perfHud";

export class Engine {
  private static readonly FIXED_STEP = 1 / 60;
  private static readonly MAX_SIM_STEPS = 4;
  private readonly gl: WebGL2RenderingContext;
  private readonly platform: BrowserPlatform;
  private readonly pointer: PointerInput;
  private readonly audio = new AudioAnalyser();
  private readonly vao: WebGLVertexArrayObject;
  private readonly passes: ShaderPasses;
  private readonly format: SimFormat;
  private solver: FluidSolver;
  private baseConfig: FluidConfig;
  private liveConfig: FluidConfig;
  private raf = 0;
  private lastMs = 0;
  private elapsed = 0;
  private disposed = false;
  private frameMs = 16.67;
  private fpsEma = 60;
  private paused = false;
  private manualSplat: PointerSplat | null = null;
  private simulationAccumulator = 0;

  constructor(canvas: HTMLCanvasElement, config: FluidConfig = defaultConfig) {
    this.baseConfig = clampConfig(cloneConfig(config));
    assertConfig(this.baseConfig);
    this.liveConfig = cloneConfig(this.baseConfig);
    this.syncLive(0);
    this.gl = createGl(canvas);
    this.platform = new BrowserPlatform(canvas, {
      onResize: () => this.handleResize(),
      onVisibility: (visible) => {
        if (visible && !this.paused) {
          this.lastMs = 0;
          this.loop();
        } else {
          this.stopLoop();
        }
      },
    });
    this.pointer = new PointerInput(canvas);
    this.pointer.setEnabled(this.baseConfig.pointerEnabled);
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.BLEND);
    this.vao = createFullscreenVao(this.gl);
    this.passes = createPasses(this.gl);
    this.format = this.chooseFormat();
    this.syncCanvas();
    this.solver = this.createSolver();
    this.bootSolver();
  }

  start(): void {
    this.paused = false;
    this.loop();
  }

  pause(): void {
    this.paused = true;
    this.stopLoop();
  }

  resume(): void {
    if (this.disposed) {
      return;
    }
    this.paused = false;
    this.lastMs = 0;
    this.simulationAccumulator = 0;
    this.loop();
  }

  inject(splat: PointerSplat): void {
    if (this.disposed) {
      return;
    }
    this.manualSplat = {
      uv: [splat.uv[0], splat.uv[1]],
      delta: [splat.delta[0], splat.delta[1]],
    };
  }

  getConfig(): FluidConfig {
    return cloneConfig(this.baseConfig);
  }

  getLiveConfig(): FluidConfig {
    return cloneConfig(this.liveConfig);
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getAudioFrame(): AudioFrame {
    return this.audio.getFrame();
  }

  getAudioSource(): AudioSource {
    return this.audio.getSource();
  }

  getAudioStatus(): AudioStatus {
    return this.audio.getStatus();
  }

  setAudioSource(source: AudioSource): Promise<AudioStatus> {
    return this.audio.setSource(source);
  }

  getPerfSample(): PerfSample {
    const grids = this.solver.gridSizes;
    return {
      fps: this.fpsEma,
      frameMs: this.frameMs,
      simWidth: grids.simWidth,
      simHeight: grids.simHeight,
      dyeWidth: grids.dyeWidth,
      dyeHeight: grids.dyeHeight,
    };
  }

  applyConfig(patch: Partial<FluidConfig>): FluidConfig {
    this.baseConfig = clampConfig(mergeConfig(this.baseConfig, patch));
    assertConfig(this.baseConfig);
    this.pointer.setEnabled(this.baseConfig.pointerEnabled);
    this.syncLive(this.elapsed);
    return this.getConfig();
  }

  reseed(): void {
    if (this.disposed) {
      return;
    }
    this.syncLive(this.elapsed);
    this.solver.dispose();
    this.solver = this.createSolver();
    this.bootSolver();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stopLoop();
    this.solver.dispose();
    deletePasses(this.gl, this.passes);
    this.gl.deleteVertexArray(this.vao);
    this.pointer.dispose();
    this.audio.dispose();
    this.platform.dispose();
  }

  private syncLive(elapsed: number): void {
    copyConfigOnto(this.liveConfig, applyDrivers(this.baseConfig, elapsed, this.audio.getFrame()));
  }

  private chooseFormat(): SimFormat {
    const caps = detectCaps(this.gl);
    const selected = selectSimTextureFormat(caps);
    if (!selected.ok) {
      throw new Error(selected.reason);
    }
    try {
      this.probeFormat(selected.format);
      return selected.format;
    } catch (first) {
      if (selected.format.precision === "half" && caps.colorBufferFloat) {
        const fallback: SimFormat = {
          internalFormat: GL.RGBA32F,
          format: GL.RGBA,
          type: GL.FLOAT,
          filter: caps.textureFloatLinear ? GL.LINEAR : GL.NEAREST,
          precision: "float",
          manualBilinear: !caps.textureFloatLinear,
        };
        this.probeFormat(fallback);
        return fallback;
      }
      throw first;
    }
  }

  private probeFormat(format: SimFormat): void {
    const probe = createFbo(this.gl, 8, 8, format);
    deleteFbo(this.gl, probe);
  }

  private createSolver(): FluidSolver {
    this.gl.bindVertexArray(this.vao);
    const size = this.platform.getSize();
    return new FluidSolver(this.gl, this.passes, this.format, this.liveConfig, size.aspect);
  }

  private bootSolver(): void {
    this.gl.bindVertexArray(this.vao);
    this.syncLive(0);
    this.solver.setLiveMotion(wiggleMotion(this.liveConfig, 0));
    this.elapsed = this.solver.warmup(0);
    const stats = this.probeDyeStats();
    if (dyeLooksAllBlack(stats)) {
      const message =
        `Dye probe failed after warmup: meanEnergy=${stats.meanEnergy.toFixed(4)} ` +
        `filledFrac=${stats.filledFrac.toFixed(4)}`;
      console.error(message, stats);
      if (import.meta.env.DEV) {
        throw new Error(message);
      }
    }
  }

  private probeDyeStats(): DyeStats {
    const gl = this.gl;
    const width = 64;
    const height = 64;
    const probe = createByteFbo(gl, width, height);
    const live = tweenMaterials(this.liveConfig, this.elapsed);
    blitDye(
      gl,
      this.passes.display,
      this.solver.dyeRead,
      this.liveConfig,
      width,
      height,
      this.format.manualBilinear,
      probe,
      live,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, probe.framebuffer);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    deleteFbo(gl, probe);
    return dyeStatsFromRgba8(pixels);
  }

  private syncCanvas(): void {
    this.platform.applyCanvasResolution(this.platform.getSize());
  }

  private handleResize(): void {
    if (this.disposed) {
      return;
    }
    this.syncCanvas();
    const aspect = this.platform.getSize().aspect;
    if (!this.solver.matchesAspect(aspect)) {
      this.reseed();
    }
  }

  private loop(): void {
    if (this.disposed || this.raf || !this.platform.visible) {
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private readonly tick = (now: number): void => {
    this.raf = 0;
    if (this.disposed || this.paused || !this.platform.visible) {
      return;
    }
    const frameDt = this.lastMs === 0 ? Engine.FIXED_STEP : Math.min(this.baseConfig.maxDt, (now - this.lastMs) / 1000);
    this.frameMs = this.lastMs === 0 ? 16.67 : Math.max(0.01, now - this.lastMs);
    const instantFps = 1000 / this.frameMs;
    this.fpsEma = this.lastMs === 0 ? instantFps : this.fpsEma * 0.9 + instantFps * 0.1;
    this.lastMs = now;
    this.audio.sample(frameDt);
    this.simulationAccumulator += frameDt;

    this.gl.bindVertexArray(this.vao);
    let steps = 0;
    while (
      this.simulationAccumulator >= Engine.FIXED_STEP &&
      steps < Engine.MAX_SIM_STEPS
    ) {
      this.syncLive(this.elapsed);
      const motion = wiggleMotion(this.liveConfig, this.elapsed);
      this.elapsed += Engine.FIXED_STEP * motion.noiseTime;
      this.solver.setLiveMotion(motion);
      const splat = steps === 0 ? this.manualSplat ?? this.pointer.consume() : null;
      this.solver.step(Engine.FIXED_STEP, this.elapsed, splat);
      this.simulationAccumulator -= Engine.FIXED_STEP;
      steps += 1;
    }
    if (steps > 0) {
      this.manualSplat = null;
    }
    if (this.simulationAccumulator > Engine.FIXED_STEP * Engine.MAX_SIM_STEPS) {
      this.simulationAccumulator = Engine.FIXED_STEP * Engine.MAX_SIM_STEPS;
    }
    this.syncLive(this.elapsed);
    const live = tweenMaterials(this.liveConfig, this.elapsed);
    const size = this.platform.getSize();
    blitDye(
      this.gl,
      this.passes.display,
      this.solver.dyeRead,
      this.liveConfig,
      size.pixelWidth,
      size.pixelHeight,
      this.format.manualBilinear,
      null,
      live,
    );
    this.gl.bindVertexArray(null);
    this.loop();
  };
}
