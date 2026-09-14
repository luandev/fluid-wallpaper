import type { LiquidScene } from "../app/liquidScene";
import { compileProgram, type FBO } from "../sim/gpu";
import vertex from "../shaders/fullscreen.vert.glsl?raw";
import fragment from "../shaders/liquidDisplay.frag.glsl?raw";
import { srgbToLinear } from "./absorption";

export class LiquidDisplay {
  private program: WebGLProgram;
  constructor(private gl: WebGL2RenderingContext) {
    this.program = compileProgram(gl, vertex, fragment, "liquid absorption");
  }
  draw(
    phase: FBO,
    pigment: FBO,
    scene: LiquidScene,
    width: number,
    height: number,
    diagnostic = false,
    effectAmount = 1,
    detail?: FBO,
    velocity?: FBO,
    time = 0,
    detailAmount = 0,
  ): void {
    const gl = this.gl,
      loc = (name: string) => gl.getUniformLocation(this.program, name);
    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    [phase, pigment, detail ?? phase, velocity ?? phase].forEach((f, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, f.texture);
    });
    gl.uniform1i(loc("uPhase"), 0);
    gl.uniform1i(loc("uPigment"), 1);
    gl.uniform1i(loc("uDetail"), 2);
    gl.uniform1i(loc("uVelocity"), 3);
    gl.uniform1f(loc("uDetailAmount"), detailAmount);
    gl.uniform1f(loc("uTime"), time);
    gl.uniform3fv(loc("uPhaseA"), scene.phases[0].absorption);
    gl.uniform3fv(loc("uPhaseB"), scene.phases[1].absorption);
    gl.uniform3fv(
      loc("uPigments[0]"),
      scene.pigments.flatMap((p) => p.absorption),
    );
    gl.uniform3fv(loc("uSubstrate"), scene.substrate.map(srgbToLinear));
    gl.uniform1f(loc("uPath"), scene.opticalPath);
    gl.uniform1f(loc("uAbsorption"), scene.absorption);
    gl.uniform1f(loc("uRelief"), scene.relief * effectAmount);
    gl.uniform1f(loc("uGloss"), scene.gloss * effectAmount);
    gl.uniform1f(loc("uRoughness"), scene.roughness);
    gl.uniform1i(loc("uDiagnostic"), diagnostic ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}
