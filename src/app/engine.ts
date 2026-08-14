import {
  assertConfig,
  clampConfig,
  cloneConfig,
  defaultConfig,
  mergeConfig,
  type FluidConfig,
} from "./config";
import { dyeLooksAllBlack, dyeStatsFromRgba8, type DyeStats } from "./dyeMix";
import { PointerInput } from "../inputs/pointer";
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

export class Engine {
  private readonly gl: WebGL2RenderingContext;
  private readonly platform: BrowserPlatform;
  private readonly pointer: PointerInput;
  private readonly vao: WebGLVertexArrayObject;
  private readonly passes: ShaderPasses;
  private readonly format: SimFormat;
  private solver: FluidSolver;
  private config: FluidConfig;
  private raf = 0;
  private lastMs = 0;
  private elapsed = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, config: FluidConfig = defaultConfig) {
    this.config = clampConfig(cloneConfig(config));
    assertConfig(this.config);
    this.gl = createGl(canvas);
    this.platform = new BrowserPlatform(canvas, {
      onResize: () => this.handleResize(),
      onVisibility: (visible) => {
        if (visible) {
          this.lastMs = 0;
          this.loop();
        } else {
          this.stopLoop();
        }
      },
    });
    this.pointer = new PointerInput(canvas);
    this.pointer.setEnabled(this.config.pointerEnabled);
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
    this.loop();
  }

  getConfig(): FluidConfig {
    return cloneConfig(this.config);
  }

  applyConfig(patch: Partial<FluidConfig>): FluidConfig {
    const next = clampConfig(mergeConfig(this.config, patch));
    assertConfig(next);
    Object.assign(this.config, next);
    this.pointer.setEnabled(this.config.pointerEnabled);
    return this.getConfig();
  }

  reseed(): void {
    if (this.disposed) {
      return;
    }
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
    this.platform.dispose();
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
    return new FluidSolver(this.gl, this.passes, this.format, this.config, size.aspect);
  }

  private bootSolver(): void {
    this.gl.bindVertexArray(this.vao);
    this.elapsed = this.solver.warmup(0);
    const stats = this.probeDyeStats();
    if (dyeLooksAllBlack(stats)) {
      const message =
        `Dye probe failed after warmup: meanRed=${stats.meanRed.toFixed(4)} ` +
        `crimsonFrac=${stats.crimsonFrac.toFixed(4)} charcoalFrac=${stats.charcoalFrac.toFixed(4)}`;
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
    blitDye(
      gl,
      this.passes.display,
      this.solver.dyeRead,
      this.config,
      width,
      height,
      this.format.manualBilinear,
      probe,
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
    if (this.disposed || !this.platform.visible) {
      return;
    }
    const dt = this.lastMs === 0 ? 1 / 60 : Math.min(this.config.maxDt, (now - this.lastMs) / 1000);
    this.lastMs = now;
    this.elapsed += dt * this.config.noiseTime;

    this.gl.bindVertexArray(this.vao);
    this.solver.step(dt, this.elapsed, this.pointer.consume());
    const size = this.platform.getSize();
    blitDye(
      this.gl,
      this.passes.display,
      this.solver.dyeRead,
      this.config,
      size.pixelWidth,
      size.pixelHeight,
      this.format.manualBilinear,
    );
    this.gl.bindVertexArray(null);
    this.loop();
  };
}
