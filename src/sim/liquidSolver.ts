import type { LiquidScene } from "../app/liquidScene";
import liquidSource from "../shaders/liquid.frag.glsl?raw";
import vertexSource from "../shaders/fullscreen.vert.glsl?raw";
import { compileProgram, createFbo, deleteFbo, type FBO } from "./gpu";
import { capillaryLimit, conservativeResample, transportLimit } from "./liquidNumerics";
import { LIQUID_MEMORY_CAP } from "../quality/liquidQuality";

export interface LiquidDiagnostics {
  phaseMin: number; phaseMax: number; phaseMean: number;
  pigmentMeans: number[]; pigmentMin: number; maxVelocity: number; maxDivergence: number;
  passes: number; allocationBytes: number; simulatedTime: number;
  pressureIterations: number; viscosityIterations: number;
  pressureResidual: number; viscosityResidualBound: number; pressureJump: number;
}

/** Experimental MAC GPU solver. Readback-based diagnostics intentionally expose current cost. */
export class LiquidSolver {
  private targets: FBO[] = [];
  private program: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private phase: FBO;
  private pigment: FBO;
  private velocity: FBO;
  private pressure: FBO;
  private scratch: FBO;
  private rhs: FBO;
  private divergence: FBO;
  private detail: FBO;
  private resetBank = -1;
  private passCount = 0;
  private time = 0;
  private speed = 0;
  private pressureIterations = 0;
  private viscosityIterations = 0;
  private pressureResidual = 0;
  private viscosityResidualBound = 0;
  private lastDt = 0;
  readonly h: number;

  constructor(private gl: WebGL2RenderingContext, public scene: LiquidScene, readonly width: number, readonly height: number, seed = true) {
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("Two-liquid diagnostics require EXT_color_buffer_float (RGBA32F)");
    if (width * height * 16 * 8 > LIQUID_MEMORY_CAP) throw new Error("Liquid allocation exceeds 32 MiB cap");
    this.h = 1 / Math.min(width, height);
    this.program = compileProgram(gl, vertexSource, liquidSource, "two-liquid");
    const allocate = () => {
      const f = createFbo(gl, width, height, { internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, filter: gl.NEAREST, precision: "float", manualBilinear: true });
      this.targets.push(f); return f;
    };
    try {
      this.phase = allocate(); this.pigment = allocate(); this.velocity = allocate();
      this.pressure = allocate(); this.scratch = allocate(); this.rhs = allocate(); this.divergence = allocate();
      this.detail = allocate();
      this.targets.forEach(f => { gl.bindFramebuffer(gl.FRAMEBUFFER, f.framebuffer); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); });
      if (seed) { this.pass(0, this.phase); this.pass(1, this.pigment); this.pass(12, this.detail); }
    } catch (error) { this.dispose(); throw error; }
  }
  get phaseRead(): FBO { return this.phase; }
  get pigmentRead(): FBO { return this.pigment; }
  get velocityRead(): FBO { return this.velocity; }
  get detailRead(): FBO { return this.detail; }
  get simulatedTime(): number { return this.time; }
  get stableDt(): number { return Math.min(1 / 30, transportLimit(this.h, this.speed).dt, capillaryLimit(this.h, this.scene.surfaceTension)); }
  get allocationBytes(): number { return this.width * this.height * 16 * this.targets.length; }

  private loc(name: string): WebGLUniformLocation | null {
    if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl.getUniformLocation(this.program, name));
    return this.uniforms.get(name)!;
  }
  private pass(mode: number, target: FBO, dt = 0, source = this.phase): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.viewport(0, 0, this.width, this.height);
    // Bind only uniforms used by each branch to non-attachment textures. WebGL validates all active samplers.
    const inputs = [source, this.velocity, this.phase, this.pressure, this.rhs];
    ["uField", "uVelocity", "uPhase", "uPressure", "uRhs"].forEach((name, i) => {
      const input = inputs[i] === target ? this.divergence === target ? this.scratch : this.divergence : inputs[i];
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, input.texture); gl.uniform1i(this.loc(name), i);
    });
    gl.uniform1i(this.loc("uMode"), mode); gl.uniform2i(this.loc("uSize"), this.width, this.height);
    gl.uniform1i(this.loc("uResetBank"), this.resetBank);
    const scalars: Record<string, number> = { uH: this.h, uDt: dt, uGamma: transportLimit(this.h, this.speed).gamma, uSigma: this.scene.surfaceTension, uDamping: this.scene.damping, uStirring: this.scene.stirring, uScale: this.scene.swirlScale, uTime: this.time, uDose: this.scene.dose };
    Object.entries(scalars).forEach(([name, value]) => gl.uniform1f(this.loc(name), value));
    gl.uniform2f(this.loc("uViscosity"), this.scene.phases[0].viscosity, this.scene.phases[1].viscosity);
    gl.uniform4fv(this.loc("uCarriers"), this.scene.pigments.map(p => p.phase));
    gl.drawArrays(gl.TRIANGLES, 0, 3); this.passCount++;
  }
  private swap(key: "phase" | "pigment" | "velocity" | "pressure" | "detail"): void {
    const old = this[key]; this[key] = this.scratch; this.scratch = old;
  }
  read(target: FBO): Float32Array {
    const values = new Float32Array(this.width * this.height * 4);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
    this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.FLOAT, values);
    if (this.gl.getError() !== this.gl.NO_ERROR) throw new Error("Liquid GPU readback failed");
    return values;
  }
  private upload(target: FBO, values: Float32Array): void {
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, values);
  }
  private max(values: Float32Array, channels: number): number {
    let max = 0;
    for (let i = 0; i < values.length; i += 4) for (let c = 0; c < channels; c++) {
      if (!Number.isFinite(values[i + c])) throw new Error("Nonfinite liquid state");
      max = Math.max(max, Math.abs(values[i + c]));
    }
    return max;
  }
  project(): void {
    this.pass(4, this.divergence);
    this.pass(9, this.rhs, 0, this.divergence);
    this.pressureIterations = 0;
    const rhs = this.read(this.rhs);
    // Neumann pressure. Constant gauge is harmless because only gradients are consumed.
    // Projection convergence is reported, never represented as a validated fixed iteration budget.
    for (let batch = 0; batch < 40; batch++) {
      for (let i = 0; i < 64; i++) { this.pass(5, this.scratch); this.swap("pressure"); this.pressureIterations++; }
      const p = this.read(this.pressure);
      this.pressureResidual = 0;
      for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
        const k = 4 * (y * this.width + x); let laplacian = 0;
        if (x > 0) laplacian += p[k - 4] - p[k]; if (x < this.width - 1) laplacian += p[k + 4] - p[k];
        if (y > 0) laplacian += p[k - this.width * 4] - p[k]; if (y < this.height - 1) laplacian += p[k + this.width * 4] - p[k];
        this.pressureResidual = Math.max(this.pressureResidual, Math.abs(laplacian / this.h ** 2 - rhs[k]));
      }
      if (this.pressureResidual <= 1e-5) break;
    }
    this.pass(6, this.scratch); this.swap("velocity");
    this.speed = this.max(this.read(this.velocity), 2);
  }
  step(dt: number): void {
    if (!(dt > 0) || dt > this.stableDt * (1 + 1e-6)) throw new Error("Unstable requested liquid timestep");
    this.pass(2, this.scratch, dt); this.swap("velocity");
    this.pass(9, this.rhs, dt, this.velocity);
    this.viscosityIterations = 0;
    // Bound the backward-Euler algebraic residual using the relaxed Jacobi update and maximum diagonal.
    const diagonal = 1 + 12 * Math.max(...this.scene.phases.map(p => p.viscosity)) * dt / this.h ** 2;
    for (let batch = 0; batch < 32; batch++) {
      for (let i = 0; i < 15; i++) { this.pass(3, this.scratch, dt); this.swap("velocity"); this.viscosityIterations++; }
      const previous = this.read(this.velocity);
      this.pass(3, this.scratch, dt); this.swap("velocity"); this.viscosityIterations++;
      const next = this.read(this.velocity); let difference = 0;
      for (let i = 0; i < next.length; i += 4) for (let c = 0; c < 2; c++) difference = Math.max(difference, Math.abs(next[i + c] - previous[i + c]));
      this.viscosityResidualBound = difference * 2 * diagonal / dt;
      if (this.viscosityResidualBound < 1e-5) break;
    }
    this.project();
    if (dt > transportLimit(this.h, this.speed).dt * (1 + 1e-6)) {
      throw new Error("Post-projection speed exceeded transport limit; reduce forcing/timestep");
    }
    this.transport(dt);
    this.lastDt = dt;
  }
  transport(dt: number): void {
    if (!(dt > 0) || dt > transportLimit(this.h, this.speed).dt * (1 + 1e-6)) throw new Error("Unstable transport timestep");
    // Pigment must see the same OLD carrier field and projected velocity as phase transport.
    this.pass(8, this.scratch, dt, this.pigment); this.swap("pigment");
    this.pass(7, this.scratch, dt, this.phase); this.swap("phase");
    // Both banks remain flow-carried even when detail is hidden, avoiding a phase-field reset on quality changes.
    const bank = Math.floor((this.time + dt) / 4);
    this.resetBank = bank !== Math.floor(this.time / 4) ? bank % 2 : -1;
    this.pass(13, this.scratch, dt, this.detail); this.swap("detail");
    this.resetBank = -1;
    this.time += dt;
  }
  /** Fixture-only divergence-free MAC velocity from a corner streamfunction. Closed walls require constant boundary psi. */
  setDiagnosticFlow(psi: (x: number, y: number) => number): void {
    const velocity = new Float32Array(this.width * this.height * 4);
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      const i = (y * this.width + x) * 4;
      velocity[i] = x === this.width - 1 ? 0 : (psi((x + 1) / this.width, (y + 1) / this.height) - psi((x + 1) / this.width, y / this.height)) / this.h;
      velocity[i + 1] = y === this.height - 1 ? 0 : -(psi((x + 1) / this.width, (y + 1) / this.height) - psi(x / this.width, (y + 1) / this.height)) / this.h;
    }
    this.upload(this.velocity, velocity); this.speed = this.max(velocity, 2);
  }
  diagnostics(): LiquidDiagnostics {
    const a = this.read(this.phase), c = this.read(this.pigment);
    this.pass(4, this.divergence);
    let min = Infinity, max = -Infinity, sum = 0, pigmentMin = Infinity;
    const sums = [0, 0, 0, 0];
    const pressure = this.read(this.pressure);
    let insidePressure = 0, outsidePressure = 0, insideCount = 0, outsideCount = 0;
    for (let i = 0; i < a.length; i += 4) {
      min = Math.min(min, a[i]); max = Math.max(max, a[i]); sum += a[i];
      if (a[i] > .9) { insidePressure += pressure[i]; insideCount++; }
      if (a[i] < .1) { outsidePressure += pressure[i]; outsideCount++; }
      for (let k = 0; k < 4; k++) { sums[k] += c[i + k]; pigmentMin = Math.min(pigmentMin, c[i + k]); }
    }
    return { phaseMin: min, phaseMax: max, phaseMean: sum / (a.length / 4), pigmentMeans: sums.map(v => v / (a.length / 4)), pigmentMin, maxVelocity: this.max(this.read(this.velocity), 2), maxDivergence: this.max(this.read(this.divergence), 1), passes: this.passCount, allocationBytes: this.allocationBytes, simulatedTime: this.time, pressureIterations: this.pressureIterations, viscosityIterations: this.viscosityIterations,
      pressureResidual: this.pressureResidual, viscosityResidualBound: this.viscosityResidualBound,
      pressureJump: this.lastDt && insideCount && outsideCount ? (insidePressure / insideCount - outsidePressure / outsideCount) / this.lastDt : 0 };
  }
  /** CPU overlap integration is a diagnostic-quality transition, not a mobile-optimized resize. */
  resize(width: number, height: number): LiquidSolver {
    if (this.allocationBytes + width * height * 16 * 8 > LIQUID_MEMORY_CAP) throw new Error("Transition allocation exceeds 32 MiB");
    const next = new LiquidSolver(this.gl, this.scene, width, height, false);
    try {
      for (const key of ["phase", "pigment", "velocity", "detail"] as const) next.upload(next[key], conservativeResample(this.read(this[key]), this.width, this.height, width, height, 4));
      next.time = this.time; next.project(); return next;
    } catch (error) { next.dispose(); throw error; }
  }
  inject(x: number, y: number, slot: number, fraction: number, radius: number, vx = 0, vy = 0): void {
    if (![x, y, fraction, radius, vx, vy].every(Number.isFinite) || !Number.isInteger(slot) || slot < 0 || slot > 3 || radius <= 0 || fraction < 0 || fraction > 1) throw new Error("Invalid liquid injection");
    const phase = this.read(this.phase), pigment = this.read(this.pigment), velocity = this.read(this.velocity);
    const carrier = this.scene.pigments[slot].phase;
    for (let j = 0; j < this.height; j++) for (let i = 0; i < this.width; i++) {
      const k = 4 * (j * this.width + i);
      const dx = ((i + .5) / this.width - x) * this.width * this.h;
      const dy = ((j + .5) / this.height - y) * this.height * this.h;
      const f = fraction * Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
      // Replace mixture volume with incoming carrier; displaced pigment exits proportionally.
      phase[k] = phase[k] * (1 - f) + (carrier === 0 ? f : 0);
      for (let c = 0; c < 4; c++) pigment[k + c] *= 1 - f;
      pigment[k + slot] += f * this.scene.dose;
      velocity[k] += f * Math.max(-.1, Math.min(.1, vx)); velocity[k + 1] += f * Math.max(-.1, Math.min(.1, vy));
      if (i === this.width - 1) velocity[k] = 0; if (j === this.height - 1) velocity[k + 1] = 0;
    }
    this.upload(this.phase, phase); this.upload(this.pigment, pigment); this.upload(this.velocity, velocity); this.project();
  }
  dispose(): void { this.targets.forEach(f => deleteFbo(this.gl, f)); this.targets = []; this.gl.deleteProgram(this.program); }
}
