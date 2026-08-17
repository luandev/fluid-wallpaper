/**
 * Original GPU Stam / GPU Gems ch. 38 fluid passes.
 * Technique family: semi-Lagrangian advection, Jacobi pressure projection,
 * vorticity confinement. Not copied from any third-party source.
 */
import {
  MAX_EMITTERS,
  MAX_MATERIALS,
  MAX_WIND_STATIONS,
  decayFactor,
  materialSlotIndex,
  noiseTypeIndex,
  type FluidConfig,
} from "../app/config";
import { wiggleMotion, type LiveMotion } from "../app/wiggle";
import type { PointerSplat } from "../inputs/pointer";
import type { SimFormat } from "./capabilities";
import {
  bindTarget,
  createDoubleFbo,
  createFbo,
  deleteDoubleFbo,
  deleteFbo,
  type DoubleFBO,
  type FBO,
  resolutionFor,
} from "./gpu";
import type { Pass, ShaderPasses } from "./programs";

export class FluidSolver {
  private velocity: DoubleFBO;
  private dye: DoubleFBO;
  private pressure: DoubleFBO;
  private divergence: FBO;
  private curl: FBO;
  private readonly simSize: { width: number; height: number };
  private readonly dyeSize: { width: number; height: number };
  private liveNoiseTime = 0;
  private liveNoiseScale = 1;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly passes: ShaderPasses,
    private readonly format: SimFormat,
    private readonly config: FluidConfig,
    aspect: number,
  ) {
    this.simSize = resolutionFor(config.simResolution, aspect);
    this.dyeSize = resolutionFor(config.dyeResolution, aspect);
    this.velocity = createDoubleFbo(gl, this.simSize.width, this.simSize.height, format);
    this.pressure = createDoubleFbo(gl, this.simSize.width, this.simSize.height, format);
    this.divergence = createFbo(gl, this.simSize.width, this.simSize.height, format);
    this.curl = createFbo(gl, this.simSize.width, this.simSize.height, format);
    this.dye = createDoubleFbo(gl, this.dyeSize.width, this.dyeSize.height, format);
    this.liveNoiseTime = config.noiseTime;
    this.liveNoiseScale = config.noiseScale;
    this.seed();
  }

  setLiveMotion(motion: LiveMotion): void {
    this.liveNoiseTime = motion.noiseTime;
    this.liveNoiseScale = motion.noiseScale;
  }

  get dyeRead(): FBO {
    return this.dye.read;
  }

  get gridSizes(): { simWidth: number; simHeight: number; dyeWidth: number; dyeHeight: number } {
    return {
      simWidth: this.simSize.width,
      simHeight: this.simSize.height,
      dyeWidth: this.dyeSize.width,
      dyeHeight: this.dyeSize.height,
    };
  }

  get aspect(): number {
    return this.simSize.width / this.simSize.height;
  }

  matchesAspect(aspect: number): boolean {
    const next = resolutionFor(this.config.simResolution, aspect);
    return next.width === this.simSize.width && next.height === this.simSize.height;
  }

  step(dt: number, time: number, splat: PointerSplat | null): void {
    const gl = this.gl;
    const simDt = Math.max(0, dt * this.liveNoiseTime);
    if (splat) {
      this.splatPointer(splat);
    }
    if (simDt > 0) {
      this.applyComposer(simDt, time);
      this.applyWind(simDt);
      this.applyInject(time, this.config.dyeInject);
      this.applyVorticity(simDt);
      this.project();
      this.applyViscosity(simDt);
      this.advect(this.velocity, this.velocity, 1, simDt);
      this.advect(this.dye, this.velocity, decayFactor(this.config.dyeDecay, simDt), simDt);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  warmup(startTime: number, dt = 1 / 60): number {
    const steps = Math.max(0, Math.round(this.config.warmupSteps));
    let time = startTime;
    for (let i = 0; i < steps; i += 1) {
      const motion = wiggleMotion(this.config, time);
      this.setLiveMotion(motion);
      time += dt * motion.noiseTime;
      this.step(dt, time, null);
    }
    return time;
  }

  dispose(): void {
    const gl = this.gl;
    deleteDoubleFbo(gl, this.velocity);
    deleteDoubleFbo(gl, this.dye);
    deleteDoubleFbo(gl, this.pressure);
    deleteFbo(gl, this.divergence);
    deleteFbo(gl, this.curl);
  }

  private seed(): void {
    this.applyInject(0, 1);
    this.copyDouble(this.dye);

    const vel = this.passes.marbleVelocity;
    this.use(vel);
    this.set1f(vel, "uAspect", this.aspect);
    this.set1f(vel, "uScale", this.config.seedVelocityScale);
    this.set1f(vel, "uBroad", this.config.composerBroad);
    this.set1f(vel, "uMedium", this.config.composerMedium);
    this.set1f(vel, "uFine", this.config.composerFine);
    this.set1f(vel, "uNoiseScale", this.config.noiseScale);
    this.set1f(vel, "uZoom", this.config.viewZoom);
    this.set1i(vel, "uNoiseType", noiseTypeIndex(this.config.noiseType));
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
    this.copyDouble(this.velocity);
  }

  private splatPointer(splat: PointerSplat): void {
    const forceX = splat.delta[0] * this.config.splatForce * this.simSize.width;
    const forceY = splat.delta[1] * this.config.splatForce * this.simSize.height;
    this.splat(this.velocity, splat.uv, [forceX, forceY, 0, 0], this.config.splatRadius);
    for (const emitter of this.config.emitters) {
      if (!emitter.enabled || emitter.kind !== "pointer") {
        continue;
      }
      const material = this.config.materials.find((item) => item.id === emitter.materialId);
      if (!material?.enabled) {
        continue;
      }
      const slot = materialSlotIndex(emitter.materialId, this.config.materials);
      if (slot < 0 || slot >= MAX_MATERIALS) {
        continue;
      }
      const color: [number, number, number, number] = [0, 0, 0, 0];
      color[slot] = emitter.rate;
      this.splat(this.dye, splat.uv, color, emitter.radius);
    }
  }

  private splat(
    target: DoubleFBO,
    point: [number, number],
    color: [number, number, number, number],
    radius: number,
  ): void {
    const pass = this.passes.splat;
    this.use(pass);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, target.read.texture);
    this.gl.uniform1i(pass.uniforms.uTarget, 0);
    this.gl.uniform1f(pass.uniforms.uAspect, this.aspect);
    this.set4f(pass, "uColor", color[0], color[1], color[2], color[3]);
    this.gl.uniform2f(pass.uniforms.uPoint, point[0], point[1]);
    this.gl.uniform1f(pass.uniforms.uRadius, radius);
    this.drawTo(target.write, { width: target.write.width, height: target.write.height });
    target.swap();
  }

  private applyInject(time: number, inject: number): void {
    const packed = this.packInjectEmitters();
    const pass = this.passes.perlinDye;
    this.use(pass);
    this.bindField(pass, "uDye", this.dye.read.texture, 0);
    this.set1f(pass, "uAspect", this.aspect);
    this.set1f(pass, "uTime", time);
    this.set1f(pass, "uNoiseScale", this.liveNoiseScale);
    this.set1f(pass, "uZoom", this.config.viewZoom);
    this.set1f(pass, "uBroad", this.config.composerBroad);
    this.set1f(pass, "uMedium", this.config.composerMedium);
    this.set1f(pass, "uFine", this.config.composerFine);
    this.set1f(pass, "uInject", inject);
    this.set1i(pass, "uNoiseType", noiseTypeIndex(this.config.noiseType));
    this.set1i(pass, "uEmitterCount", packed.count);
    this.set1iv(pass, "uEmitterKind", packed.kind);
    this.set1iv(pass, "uEmitterMaterial", packed.material);
    this.set1fv(pass, "uEmitterRate", packed.rate);
    this.set2fv(pass, "uEmitterUv", packed.uv);
    this.set1fv(pass, "uEmitterRadius", packed.radius);
    this.set1fv(pass, "uEmitterNoiseOffset", packed.noiseOffset);
    this.drawTo(this.dye.write, this.dyeSize);
    this.dye.swap();
  }

  private packInjectEmitters(): {
    count: number;
    kind: Int32Array;
    material: Int32Array;
    rate: Float32Array;
    uv: Float32Array;
    radius: Float32Array;
    noiseOffset: Float32Array;
  } {
    const kind = new Int32Array(MAX_EMITTERS);
    const material = new Int32Array(MAX_EMITTERS);
    const rate = new Float32Array(MAX_EMITTERS);
    const uv = new Float32Array(MAX_EMITTERS * 2);
    const radius = new Float32Array(MAX_EMITTERS);
    const noiseOffset = new Float32Array(MAX_EMITTERS);
    let count = 0;
    for (const emitter of this.config.emitters) {
      if (count >= MAX_EMITTERS || !emitter.enabled) {
        continue;
      }
      if (emitter.kind !== "field" && emitter.kind !== "point") {
        continue;
      }
      const mat = this.config.materials.find((item) => item.id === emitter.materialId);
      if (!mat?.enabled) {
        continue;
      }
      const slot = materialSlotIndex(emitter.materialId, this.config.materials);
      if (slot < 0 || slot >= MAX_MATERIALS) {
        continue;
      }
      kind[count] = emitter.kind === "field" ? 0 : 1;
      material[count] = slot;
      rate[count] = emitter.rate;
      uv[count * 2] = emitter.uvX;
      uv[count * 2 + 1] = emitter.uvY;
      radius[count] = emitter.radius;
      noiseOffset[count] = emitter.noiseOffset;
      count += 1;
    }
    return { count, kind, material, rate, uv, radius, noiseOffset };
  }

  private applyViscosity(dt: number): void {
    const pass = this.passes.viscosityWeight;
    this.use(pass);
    this.bindField(pass, "uVelocity", this.velocity.read.texture, 0);
    this.bindField(pass, "uDye", this.dye.read.texture, 1);
    const visc: [number, number, number, number] = [0, 0, 0, 0];
    const enabled: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < MAX_MATERIALS; i += 1) {
      const material = this.config.materials[i];
      if (!material) {
        continue;
      }
      visc[i] = material.viscosity;
      enabled[i] = material.enabled ? 1 : 0;
    }
    this.set4f(pass, "uViscosity", visc[0], visc[1], visc[2], visc[3]);
    this.set4f(pass, "uEnabled", enabled[0], enabled[1], enabled[2], enabled[3]);
    this.set1f(pass, "uBaseDecay", this.config.velocityDecay);
    this.set1f(pass, "uDt", dt);
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
  }

  private applyComposer(dt: number, time: number): void {
    const pass = this.passes.curlNoiseForce;
    this.use(pass);
    this.bindField(pass, "uVelocity", this.velocity.read.texture, 0);
    this.set1f(pass, "uAspect", this.aspect);
    this.set1f(pass, "uTime", time);
    this.set1f(pass, "uDt", dt);
    this.set1f(pass, "uStrength", this.config.composerStrength);
    this.set1f(pass, "uBroad", this.config.composerBroad);
    this.set1f(pass, "uMedium", this.config.composerMedium);
    this.set1f(pass, "uFine", this.config.composerFine);
    this.set1f(pass, "uNoiseScale", this.liveNoiseScale);
    this.set1f(pass, "uZoom", this.config.viewZoom);
    this.set1i(pass, "uNoiseType", noiseTypeIndex(this.config.noiseType));
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
  }

  private applyWind(dt: number): void {
    const packed = this.packWindStations();
    if (packed.count === 0 || this.config.windStrength <= 0) {
      return;
    }
    const pass = this.passes.windForce;
    this.use(pass);
    this.bindField(pass, "uVelocity", this.velocity.read.texture, 0);
    this.set1f(pass, "uAspect", this.aspect);
    this.set1f(pass, "uDt", dt);
    this.set1f(pass, "uStrength", this.config.windStrength);
    this.set1i(pass, "uStationCount", packed.count);
    this.set2fv(pass, "uStationUv", packed.uv);
    this.set1fv(pass, "uStationHeading", packed.heading);
    this.set1fv(pass, "uStationSpeed", packed.speed);
    this.set1fv(pass, "uStationSpin", packed.spin);
    this.set1fv(pass, "uStationRadius", packed.radius);
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
  }

  private packWindStations(): {
    count: number;
    uv: Float32Array;
    heading: Float32Array;
    speed: Float32Array;
    spin: Float32Array;
    radius: Float32Array;
  } {
    const uv = new Float32Array(MAX_WIND_STATIONS * 2);
    const heading = new Float32Array(MAX_WIND_STATIONS);
    const speed = new Float32Array(MAX_WIND_STATIONS);
    const spin = new Float32Array(MAX_WIND_STATIONS);
    const radius = new Float32Array(MAX_WIND_STATIONS);
    let count = 0;
    for (const station of this.config.windStations) {
      if (count >= MAX_WIND_STATIONS || !station.enabled) {
        continue;
      }
      uv[count * 2] = station.uvX;
      uv[count * 2 + 1] = station.uvY;
      heading[count] = station.heading;
      speed[count] = station.speed;
      spin[count] = station.spin;
      radius[count] = station.radius;
      count += 1;
    }
    return { count, uv, heading, speed, spin, radius };
  }

  private applyVorticity(dt: number): void {
    const texel = this.texelSize();
    const curlPass = this.passes.curl;
    this.use(curlPass);
    this.bindField(curlPass, "uVelocity", this.velocity.read.texture, 0);
    this.gl.uniform2f(curlPass.uniforms.uTexelSize, texel[0], texel[1]);
    this.drawTo(this.curl, this.simSize);

    const vort = this.passes.vorticity;
    this.use(vort);
    this.bindField(vort, "uVelocity", this.velocity.read.texture, 0);
    this.bindField(vort, "uCurl", this.curl.texture, 1);
    this.gl.uniform2f(vort.uniforms.uTexelSize, texel[0], texel[1]);
    this.gl.uniform1f(vort.uniforms.uVorticity, this.config.vorticity);
    this.gl.uniform1f(vort.uniforms.uDt, dt);
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
  }

  private project(): void {
    const texel = this.texelSize();
    const div = this.passes.divergence;
    this.use(div);
    this.bindField(div, "uVelocity", this.velocity.read.texture, 0);
    this.gl.uniform2f(div.uniforms.uTexelSize, texel[0], texel[1]);
    this.drawTo(this.divergence, this.simSize);

    const clear = this.passes.clear;
    this.use(clear);
    const clearValue = clear.uniforms.uValue;
    if (clearValue) {
      this.gl.uniform4f(clearValue, 0, 0, 0, 1);
    }
    this.drawTo(this.pressure.write, this.simSize);
    this.pressure.swap();

    const jacobi = this.passes.jacobi;
    this.use(jacobi);
    this.gl.uniform2f(jacobi.uniforms.uTexelSize, texel[0], texel[1]);
    this.bindField(jacobi, "uDivergence", this.divergence.texture, 1);
    for (let i = 0; i < this.config.pressureIterations; i += 1) {
      this.bindField(jacobi, "uPressure", this.pressure.read.texture, 0);
      this.drawTo(this.pressure.write, this.simSize);
      this.pressure.swap();
    }

    const grad = this.passes.gradientSubtract;
    this.use(grad);
    this.bindField(grad, "uPressure", this.pressure.read.texture, 0);
    this.bindField(grad, "uVelocity", this.velocity.read.texture, 1);
    this.gl.uniform2f(grad.uniforms.uTexelSize, texel[0], texel[1]);
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
  }

  private advect(field: DoubleFBO, velocity: DoubleFBO, decay: number, dt: number): void {
    const pass = this.passes.advection;
    this.use(pass);
    this.bindField(pass, "uSource", field.read.texture, 0);
    this.bindField(pass, "uVelocity", velocity.read.texture, 1);
    this.set2f(pass, "uInvSimSize", 1 / this.simSize.width, 1 / this.simSize.height);
    this.set2f(pass, "uSourceRes", field.read.width, field.read.height);
    this.set1f(pass, "uDt", dt);
    this.set1f(pass, "uDecay", decay);
    this.set1f(pass, "uManualBilinear", this.format.manualBilinear ? 1 : 0);
    this.drawTo(field.write, { width: field.write.width, height: field.write.height });
    field.swap();
  }

  private copyDouble(pair: DoubleFBO): void {
    const pass = this.passes.splat;
    this.use(pass);
    this.bindField(pass, "uTarget", pair.read.texture, 0);
    this.set1f(pass, "uAspect", this.aspect);
    this.set4f(pass, "uColor", 0, 0, 0, 0);
    this.set2f(pass, "uPoint", -10, -10);
    this.set1f(pass, "uRadius", 1e-8);
    this.drawTo(pair.write, { width: pair.write.width, height: pair.write.height });
  }

  private texelSize(): [number, number] {
    return [1 / this.simSize.width, 1 / this.simSize.height];
  }

  private use(pass: Pass): void {
    this.gl.useProgram(pass.program);
  }

  private loc(pass: Pass, name: string): WebGLUniformLocation | undefined {
    return pass.uniforms[name] ?? pass.uniforms[`${name}[0]`];
  }

  private bindField(pass: Pass, name: string, texture: WebGLTexture, unit: number): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform1i(loc, unit);
    }
  }

  private set1f(pass: Pass, name: string, value: number): void {
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform1f(loc, value);
    }
  }

  private set1i(pass: Pass, name: string, value: number): void {
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform1i(loc, value);
    }
  }

  private set2f(pass: Pass, name: string, x: number, y: number): void {
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform2f(loc, x, y);
    }
  }

  private set4f(pass: Pass, name: string, x: number, y: number, z: number, w: number): void {
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform4f(loc, x, y, z, w);
    }
  }

  private set1iv(pass: Pass, name: string, values: Int32Array): void {
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform1iv(loc, values);
    }
  }

  private set1fv(pass: Pass, name: string, values: Float32Array): void {
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform1fv(loc, values);
    }
  }

  private set2fv(pass: Pass, name: string, values: Float32Array): void {
    const loc = this.loc(pass, name);
    if (loc) {
      this.gl.uniform2fv(loc, values);
    }
  }

  private drawTo(target: FBO, size: { width: number; height: number }): void {
    bindTarget(this.gl, target, size.width, size.height);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }
}
