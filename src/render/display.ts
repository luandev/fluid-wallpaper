import { hexToRgb } from "../app/colors";
import type { FluidConfig } from "../app/config";
import { derivePalette } from "../app/palette";
import type { Pass } from "../sim/programs";
import type { FBO } from "../sim/gpu";
import { bindTarget } from "../sim/gpu";

function setVec3(gl: WebGL2RenderingContext, loc: WebGLUniformLocation | undefined, rgb: readonly [number, number, number]): void {
  if (loc) {
    gl.uniform3f(loc, rgb[0], rgb[1], rgb[2]);
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
): void {
  const palette = derivePalette(hexToRgb(config.charcoal), hexToRgb(config.crimson));
  gl.useProgram(pass.program);
  bindTarget(gl, target, canvasWidth, canvasHeight);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dye.texture);
  const dyeLoc = pass.uniforms.uDye;
  if (dyeLoc) {
    gl.uniform1i(dyeLoc, 0);
  }
  setVec3(gl, pass.uniforms.uCharcoal, palette.charcoal);
  setVec3(gl, pass.uniforms.uCrimson, palette.crimson);
  setVec3(gl, pass.uniforms.uWine, palette.wine);
  setVec3(gl, pass.uniforms.uEmber, palette.ember);
  setVec3(gl, pass.uniforms.uSlate, palette.slate);
  setVec3(gl, pass.uniforms.uPlum, palette.plum);
  setVec3(gl, pass.uniforms.uAsh, palette.ash);
  const resLoc = pass.uniforms.uDyeRes;
  if (resLoc) {
    gl.uniform2f(resLoc, dye.width, dye.height);
  }
  const bilinearLoc = pass.uniforms.uManualBilinear;
  if (bilinearLoc) {
    gl.uniform1f(bilinearLoc, manualBilinear ? 1 : 0);
  }
  const contrastLoc = pass.uniforms.uContrast;
  if (contrastLoc) {
    gl.uniform1f(contrastLoc, config.contrast);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
