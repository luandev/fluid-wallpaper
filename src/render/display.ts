import type { LiveMaterials } from "../app/colorTween";
import { padLiveMaterials, tweenMaterials } from "../app/colorTween";
import type { FluidConfig } from "../app/config";
import type { Pass } from "../sim/programs";
import type { FBO } from "../sim/gpu";
import { bindTarget } from "../sim/gpu";

function loc(pass: Pass, name: string): WebGLUniformLocation | undefined {
  return pass.uniforms[name] ?? pass.uniforms[`${name}[0]`];
}

function set1f(gl: WebGL2RenderingContext, pass: Pass, name: string, value: number): void {
  const location = loc(pass, name);
  if (location) {
    gl.uniform1f(location, value);
  }
}

export function blitDye(
  gl: WebGL2RenderingContext,
  pass: Pass,
  dye: FBO,
  config: FluidConfig,
  canvasWidth: number,
  canvasHeight: number,
  manualBilinear: boolean,
  target: FBO | null = null,
  live?: LiveMaterials,
): void {
  const slots = padLiveMaterials((live ?? tweenMaterials(config, 0)).slots);
  gl.useProgram(pass.program);
  bindTarget(gl, target, canvasWidth, canvasHeight);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dye.texture);
  const dyeLoc = loc(pass, "uDye");
  if (dyeLoc) {
    gl.uniform1i(dyeLoc, 0);
  }
  const albedo = new Float32Array(12);
  const roughness = new Float32Array(4);
  const metallic = new Float32Array(4);
  const sheen = new Float32Array(4);
  const glow = new Float32Array(4);
  const enabled = new Float32Array(4);
  for (let i = 0; i < 4; i += 1) {
    const slot = slots[i];
    albedo[i * 3] = slot?.albedo[0] ?? 0;
    albedo[i * 3 + 1] = slot?.albedo[1] ?? 0;
    albedo[i * 3 + 2] = slot?.albedo[2] ?? 0;
    roughness[i] = slot?.roughness ?? 0.5;
    metallic[i] = slot?.metallic ?? 0;
    sheen[i] = slot?.sheen ?? 0;
    glow[i] = slot?.glow ?? 0;
    enabled[i] = slot?.enabled ? 1 : 0;
  }
  const albedoLoc = loc(pass, "uAlbedo");
  if (albedoLoc) {
    gl.uniform3fv(albedoLoc, albedo);
  }
  const roughnessLoc = loc(pass, "uRoughness");
  if (roughnessLoc) {
    gl.uniform1fv(roughnessLoc, roughness);
  }
  const metallicLoc = loc(pass, "uMetallic");
  if (metallicLoc) {
    gl.uniform1fv(metallicLoc, metallic);
  }
  const sheenLoc = loc(pass, "uSheen");
  if (sheenLoc) {
    gl.uniform1fv(sheenLoc, sheen);
  }
  const glowLoc = loc(pass, "uGlow");
  if (glowLoc) {
    gl.uniform1fv(glowLoc, glow);
  }
  const enabledLoc = loc(pass, "uEnabled");
  if (enabledLoc) {
    gl.uniform1fv(enabledLoc, enabled);
  }
  const resLoc = loc(pass, "uDyeRes");
  if (resLoc) {
    gl.uniform2f(resLoc, dye.width, dye.height);
  }
  set1f(gl, pass, "uManualBilinear", manualBilinear ? 1 : 0);
  set1f(gl, pass, "uContrast", config.contrast);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
