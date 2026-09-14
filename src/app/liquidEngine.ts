import {
  assertSameCarriers,
  validateLiquidScene,
  type LiquidScene,
} from "./liquidScene";
import { createGl } from "../sim/gpu";
import { LiquidSolver, type LiquidDiagnostics } from "../sim/liquidSolver";
import { LiquidDisplay } from "../render/liquidDisplay";
import { areaGrid } from "../sim/liquidNumerics";
import {
  LIQUID_TIERS,
  LiquidClock,
  LiquidQualityController,
} from "../quality/liquidQuality";
import { GpuTiming, type LiquidTiming } from "../quality/gpuTiming";

export interface LiquidStatus {
  requestedFps: number;
  effectiveFps: number;
  simulation: [number, number];
  pigment: [number, number];
  display: [number, number];
  effects: { relief: boolean; gloss: boolean; detail: boolean };
  slowdownSeconds: number;
  reason: string;
  allocationBytes: number;
  timing: LiquidTiming;
  experimental: true;
  simulationSpeed: number;
}

/** Owns the opt-in scene loop; legacy Engine/config/audio remain independent. */
export class LiquidEngine {
  private static instances = new Set<LiquidEngine>();
  private gl: WebGL2RenderingContext;
  private solver!: LiquidSolver;
  private display!: LiquidDisplay;
  private timing!: GpuTiming;
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private scene: LiquidScene;
  private quality = new LiquidQualityController();
  private clock = new LiquidClock();
  private raf = 0;
  private last = 0;
  private presented = 0;
  private lastStatus = 0;
  private boostedUntil = 0;
  private paused = true;
  private offscreen = false;
  private lost = false;
  private disposed = false;
  private resourcesValid = false;
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver;
  private effectStart = 0;
  private effectiveFps = 0;
  private detailAmount = 0;
  private lastDraw = 0;
  private abort = new AbortController();
  diagnosticColors = false;

  constructor(
    private canvas: HTMLCanvasElement,
    scene: LiquidScene,
    private onStatus: (status: LiquidStatus) => void,
    private onError: (error: Error) => void,
  ) {
    this.scene = validateLiquidScene(scene);
    this.quality.setPolicy(this.scene.quality);
    this.gl = createGl(canvas);
    try {
      this.initialize();
    } catch (error) {
      this.release();
      throw error;
    }
    const signal = this.abort.signal;
    document.addEventListener("visibilitychange", () => this.schedule(), {
      signal,
    });
    canvas.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        this.lost = true;
        this.stop();
        // The browser invalidates/deletes old objects. Never delete those handles in the restored context.
        this.resourcesValid = false;
      },
      { signal },
    );
    canvas.addEventListener(
      "webglcontextrestored",
      () => {
        try {
          this.release();
          this.initialize();
          this.lost = false;
          this.clock = new LiquidClock();
          this.quality.reason = "context restored: new scene (GPU state lost)";
          this.draw();
          this.schedule();
        } catch (error) {
          this.fail(error);
        }
      },
      { signal },
    );
    // A pointer gesture boosts pacing. Injection remains an explicit command with a known dose.
    canvas.addEventListener(
      "pointerdown",
      () => {
        this.boostedUntil = performance.now() + 2000;
      },
      { signal },
    );
    canvas.addEventListener(
      "pointermove",
      (e) => {
        if (e.buttons) this.boostedUntil = performance.now() + 2000;
      },
      { signal },
    );
    this.resizeObserver = new ResizeObserver(() => {
      try {
        if (!this.lost && !this.disposed) {
          this.resize();
          this.draw();
        }
      } catch (error) {
        this.fail(error);
      }
    });
    this.resizeObserver.observe(canvas);
    if (typeof IntersectionObserver !== "undefined") {
      this.observer = new IntersectionObserver((entries) => {
        this.offscreen = !entries[0]?.isIntersecting;
        this.schedule();
      });
      this.observer.observe(canvas);
    }
    LiquidEngine.instances.add(this);
    this.draw();
  }
  private initialize(): void {
    const gl = this.gl;
    this.resourcesValid = true;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    this.vao = gl.createVertexArray();
    this.buffer = gl.createBuffer();
    if (!this.vao || !this.buffer)
      throw new Error("Liquid geometry allocation failed");
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const grid = areaGrid(this.quality.cellBudget, this.aspect());
    this.solver = new LiquidSolver(gl, this.scene, grid.width, grid.height);
    this.display = new LiquidDisplay(gl);
    this.timing = new GpuTiming(gl);
    this.resizeCanvas();
  }
  private aspect(): number {
    return (
      Math.max(1, this.canvas.clientWidth) /
      Math.max(1, this.canvas.clientHeight)
    );
  }
  private resizeCanvas(): void {
    const visible = [...LiquidEngine.instances].filter(
      (i) => !i.offscreen && !i.paused,
    );
    const active = performance.now() < this.boostedUntil;
    const divisor = active ? 1 : Math.max(1, visible.length);
    const pixels = Math.min(
      this.quality.pixelBudget / divisor,
      Math.max(
        64,
        this.canvas.clientWidth *
          this.canvas.clientHeight *
          devicePixelRatio ** 2,
      ),
    );
    const grid = areaGrid(pixels, this.aspect());
    this.canvas.width = grid.width;
    this.canvas.height = grid.height;
  }
  private resize(): void {
    this.gl.bindVertexArray(this.vao);
    const grid = areaGrid(this.quality.cellBudget, this.aspect());
    if (
      grid.width !== this.solver.width ||
      grid.height !== this.solver.height
    ) {
      const next = this.solver.resize(grid.width, grid.height);
      this.solver.dispose();
      this.solver = next;
    }
    this.resizeCanvas();
    this.effectStart = performance.now();
  }
  private draw(): void {
    this.gl.bindVertexArray(this.vao);
    const fade = Math.min(1, (performance.now() - this.effectStart) / 250);
    const now = performance.now(),
      target =
        this.scene.detail && LIQUID_TIERS[this.quality.tier].detail ? 1 : 0;
    const delta = Math.min(1, (now - this.lastDraw) / 250);
    this.lastDraw = now;
    this.detailAmount +=
      Math.sign(target - this.detailAmount) *
      Math.min(Math.abs(target - this.detailAmount), delta);
    this.timing.measure("rendererMs", () =>
      this.display.draw(
        this.solver.phaseRead,
        this.solver.pigmentRead,
        this.scene,
        this.canvas.width,
        this.canvas.height,
        this.diagnosticColors,
        fade,
        this.solver.detailRead,
        this.solver.velocityRead,
        this.solver.simulatedTime,
        this.detailAmount,
      ),
    );
  }
  private loop = (now: number): void => {
    this.raf = 0;
    if (
      this.paused ||
      this.offscreen ||
      this.lost ||
      document.hidden ||
      this.disposed
    )
      return;
    try {
      if (this.last)
        this.clock.add((now - this.last) / 1000, this.quality.simulationSpeed);
      this.last = now;
      const fps =
        this.scene.quality !== "eco" && now < this.boostedUntil
          ? 60
          : this.quality.fps;
      if (now - this.presented >= 1000 / fps - 1) {
        this.effectiveFps = this.presented
          ? 1000 / (now - this.presented)
          : fps;
        this.presented = now;
        this.gl.bindVertexArray(this.vao);
        this.timing.poll();
        this.timing.measure("solverMs", () =>
          this.clock.advance(
            () => this.solver.stableDt,
            (dt) => this.solver.step(dt),
          ),
        );
        this.draw();
        const sample = this.timing.value;
        this.quality.sample(
          sample.solverMs + sample.rendererMs,
          this.effectiveFps < fps * 0.8,
        );
        if (
          this.scene.quality === "eco" &&
          this.quality.observe(
            now,
            sample.solverMs + sample.rendererMs,
            this.effectiveFps < fps * 0.65,
            fps,
          )
        ) {
          this.clock.suspend();
          this.resize();
          this.onStatus(this.status);
        }
        if (now - this.lastStatus >= 1000) {
          this.lastStatus = now;
          const t = this.timing.value;
          if (
            this.scene.quality !== "eco" &&
            this.quality.observe(
              now,
              t.solverMs + t.rendererMs,
              this.effectiveFps < fps * 0.8,
              fps,
            )
          )
            this.resize();
          this.onStatus(this.status);
        }
      }
      this.raf = requestAnimationFrame(this.loop);
    } catch (error) {
      this.fail(error);
    }
  };
  private fail(error: unknown): void {
    this.pause();
    this.onError(error instanceof Error ? error : new Error(String(error)));
  }
  private stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = this.presented = 0;
    this.clock.suspend();
    this.quality.suspend();
  }
  private schedule(): void {
    this.stop();
    if (
      !this.paused &&
      !this.offscreen &&
      !this.lost &&
      !document.hidden &&
      !this.disposed
    )
      this.raf = requestAnimationFrame(this.loop);
  }
  play(): void {
    this.paused = false;
    this.schedule();
  }
  pause(): void {
    this.paused = true;
    this.stop();
  }
  reset(): void {
    this.gl.bindVertexArray(this.vao);
    const next = new LiquidSolver(
      this.gl,
      this.scene,
      this.solver.width,
      this.solver.height,
    );
    this.solver.dispose();
    this.solver = next;
    this.clock = new LiquidClock();
    this.draw();
  }
  getScene(): LiquidScene {
    return structuredClone(this.scene);
  }
  updateScene(value: LiquidScene): void {
    const next = validateLiquidScene(value);
    assertSameCarriers(this.scene, next);
    const changedQuality = next.quality !== this.scene.quality;
    this.scene = next;
    this.solver.scene = next;
    if (changedQuality) {
      this.quality.setPolicy(next.quality);
      this.clock.suspend();
      this.last = this.presented = 0;
      this.resize();
    }
    this.draw();
  }
  inject(
    x: number,
    y: number,
    slot = 0,
    fraction = 0.1,
    radius = 0.04,
    vx = 0,
    vy = 0,
  ): void {
    if (this.lost || this.disposed) return;
    this.gl.bindVertexArray(this.vao);
    this.solver.inject(x, y, slot, fraction, radius, vx, vy);
    this.boostedUntil = performance.now() + 2000;
    this.draw();
  }
  diagnostics(): LiquidDiagnostics {
    this.gl.bindVertexArray(this.vao);
    return this.solver.diagnostics();
  }
  /** Deterministic fixture seam. Caller pauses RAF and chooses simulation time, not frame count. */
  diagnosticStep(seconds: number): void {
    if (
      !this.paused ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      seconds > 1
    )
      throw new Error(
        "Pause and request at most one second per diagnostic batch",
      );
    this.gl.bindVertexArray(this.vao);
    let remaining = seconds;
    while (remaining > 1e-9) {
      const dt = Math.min(this.solver.stableDt, remaining);
      this.solver.step(dt);
      remaining -= dt;
    }
    this.draw();
  }
  get status(): LiquidStatus {
    return {
      requestedFps:
        this.scene.quality === "eco"
          ? this.quality.fps
          : performance.now() < this.boostedUntil
            ? 60
            : 30,
      effectiveFps:
        this.paused || this.offscreen || this.lost ? 0 : this.effectiveFps,
      simulation: [this.solver.width, this.solver.height],
      pigment: [this.solver.width, this.solver.height],
      display: [this.canvas.width, this.canvas.height],
      effects: {
        relief: this.scene.relief > 0,
        gloss: this.scene.gloss > 0,
        detail: this.scene.detail && LIQUID_TIERS[this.quality.tier].detail,
      },
      slowdownSeconds: this.clock.dropped,
      reason: this.quality.reason,
      allocationBytes: this.solver.allocationBytes,
      timing: { ...this.timing.value },
      simulationSpeed: this.quality.simulationSpeed,
      experimental: true,
    };
  }
  private release(): void {
    if (!this.resourcesValid) return;
    this.resourcesValid = false;
    this.solver?.dispose();
    this.display?.dispose();
    this.timing?.dispose();
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteVertexArray(this.vao);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.abort.abort();
    this.resizeObserver?.disconnect();
    this.observer?.disconnect();
    LiquidEngine.instances.delete(this);
    this.release();
  }
}
