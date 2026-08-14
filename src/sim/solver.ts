/**
 * Original GPU Stam / GPU Gems ch. 38 fluid passes.
 * Technique family: semi-Lagrangian advection, Jacobi pressure projection,
 * vorticity confinement. Not copied from any third-party source.
 */
import { hexToRgb } from "../app/colors";
import type { FluidConfig } from "../app/config";
import { decayFactor } from "../app/config";
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
    this.seed();
  }

  get dyeRead(): FBO {
    return this.dye.read;
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
    if (splat) {
      this.splatPointer(splat);
    }
    this.applyKeepAlive(dt, time);
    this.applyVorticity(dt);
    this.project();
    this.advect(this.velocity, this.velocity, decayFactor(this.config.velocityDecay, dt), dt);
    this.advect(this.dye, this.velocity, decayFactor(this.config.dyeDecay, dt), dt);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
    const crimson = hexToRgb(this.config.crimson);
    const charcoal = hexToRgb(this.config.charcoal);
    const seed = this.passes.marbleSeed;
    this.use(seed);
    this.gl.uniform1f(seed.uniforms.uAspect, this.aspect);
    this.gl.uniform3f(seed.uniforms.uCrimson, crimson[0], crimson[1], crimson[2]);
    this.gl.uniform3f(seed.uniforms.uCharcoal, charcoal[0], charcoal[1], charcoal[2]);
    this.drawTo(this.dye.write, this.dyeSize);
    this.dye.swap();
    this.copyDouble(this.dye);

    const vel = this.passes.marbleVelocity;
    this.use(vel);
    this.gl.uniform1f(vel.uniforms.uAspect, this.aspect);
    this.gl.uniform1f(vel.uniforms.uScale, this.config.seedVelocityScale);
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
    this.copyDouble(this.velocity);
  }

  private splatPointer(splat: PointerSplat): void {
    const forceX = splat.delta[0] * this.config.splatForce * this.simSize.width;
    const forceY = splat.delta[1] * this.config.splatForce * this.simSize.height;
    this.splat(this.velocity, splat.uv, [forceX, forceY, 0], this.config.splatRadius);
    const crimson = hexToRgb(this.config.crimson);
    this.splat(
      this.dye,
      splat.uv,
      [crimson[0], crimson[1], crimson[2]],
      this.config.dyeSplatRadius,
    );
  }

  private splat(
    target: DoubleFBO,
    point: [number, number],
    color: [number, number, number],
    radius: number,
  ): void {
    const pass = this.passes.splat;
    this.use(pass);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, target.read.texture);
    this.gl.uniform1i(pass.uniforms.uTarget, 0);
    this.gl.uniform1f(pass.uniforms.uAspect, this.aspect);
    this.gl.uniform3f(pass.uniforms.uColor, color[0], color[1], color[2]);
    this.gl.uniform2f(pass.uniforms.uPoint, point[0], point[1]);
    this.gl.uniform1f(pass.uniforms.uRadius, radius);
    this.drawTo(target.write, { width: target.write.width, height: target.write.height });
    target.swap();
  }

  private applyKeepAlive(dt: number, time: number): void {
    const pass = this.passes.curlNoiseForce;
    this.use(pass);
    this.bindField(pass, "uVelocity", this.velocity.read.texture, 0);
    this.gl.uniform1f(pass.uniforms.uAspect, this.aspect);
    this.gl.uniform1f(pass.uniforms.uTime, time);
    this.gl.uniform1f(pass.uniforms.uStrength, this.config.keepAlive);
    this.gl.uniform1f(pass.uniforms.uDt, dt);
    this.drawTo(this.velocity.write, this.simSize);
    this.velocity.swap();
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
    this.set3f(pass, "uColor", 0, 0, 0);
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

  private bindField(pass: Pass, name: string, texture: WebGLTexture, unit: number): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    const loc = pass.uniforms[name];
    if (loc) {
      this.gl.uniform1i(loc, unit);
    }
  }

  private set1f(pass: Pass, name: string, value: number): void {
    const loc = pass.uniforms[name];
    if (loc) {
      this.gl.uniform1f(loc, value);
    }
  }

  private set2f(pass: Pass, name: string, x: number, y: number): void {
    const loc = pass.uniforms[name];
    if (loc) {
      this.gl.uniform2f(loc, x, y);
    }
  }

  private set3f(pass: Pass, name: string, x: number, y: number, z: number): void {
    const loc = pass.uniforms[name];
    if (loc) {
      this.gl.uniform3f(loc, x, y, z);
    }
  }

  private drawTo(target: FBO, size: { width: number; height: number }): void {
    bindTarget(this.gl, target, size.width, size.height);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }
}
