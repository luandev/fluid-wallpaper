import { hexToRgb } from "../app/colors";
import type { FluidConfig } from "../app/config";
import type { Pass } from "../sim/programs";
import type { FBO } from "../sim/gpu";
import { bindTarget } from "../sim/gpu";

export function blitDye(
  gl: WebGL2RenderingContext,
  pass: Pass,
  dye: FBO,
  config: FluidConfig,
  canvasWidth: number,
  canvasHeight: number,
  manualBilinear: boolean,
): void {
  const charcoal = hexToRgb(config.charcoal);
  gl.useProgram(pass.program);
  bindTarget(gl, null, canvasWidth, canvasHeight);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dye.texture);
  const dyeLoc = pass.uniforms.uDye;
  if (dyeLoc) {
    gl.uniform1i(dyeLoc, 0);
  }
  const charcoalLoc = pass.uniforms.uCharcoal;
  if (charcoalLoc) {
    gl.uniform3f(charcoalLoc, charcoal[0], charcoal[1], charcoal[2]);
  }
  const resLoc = pass.uniforms.uDyeRes;
  if (resLoc) {
    gl.uniform2f(resLoc, dye.width, dye.height);
  }
  const bilinearLoc = pass.uniforms.uManualBilinear;
  if (bilinearLoc) {
    gl.uniform1f(bilinearLoc, manualBilinear ? 1 : 0);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
