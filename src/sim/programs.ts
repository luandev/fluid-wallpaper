import { shaders } from "../shaders/sources";
import { compileProgram, uniformMap } from "./gpu";

export type Pass = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
};

export type ShaderPasses = {
  splat: Pass;
  curl: Pass;
  vorticity: Pass;
  divergence: Pass;
  clear: Pass;
  jacobi: Pass;
  gradientSubtract: Pass;
  advection: Pass;
  marbleSeed: Pass;
  marbleVelocity: Pass;
  curlNoiseForce: Pass;
  perlinDye: Pass;
  viscosityWeight: Pass;
  windForce: Pass;
  display: Pass;
};

export function createPasses(gl: WebGL2RenderingContext): ShaderPasses {
  const make = (frag: string, label: string): Pass => {
    const program = compileProgram(gl, shaders.vert, frag, label);
    return { program, uniforms: uniformMap(gl, program) };
  };
  return {
    splat: make(shaders.splat, "splat"),
    curl: make(shaders.curl, "curl"),
    vorticity: make(shaders.vorticity, "vorticity"),
    divergence: make(shaders.divergence, "divergence"),
    clear: make(shaders.clear, "clear"),
    jacobi: make(shaders.jacobi, "jacobi"),
    gradientSubtract: make(shaders.gradientSubtract, "gradientSubtract"),
    advection: make(shaders.advection, "advection"),
    marbleSeed: make(shaders.marbleSeed, "marbleSeed"),
    marbleVelocity: make(shaders.marbleVelocity, "marbleVelocity"),
    curlNoiseForce: make(shaders.curlNoiseForce, "curlNoiseForce"),
    perlinDye: make(shaders.perlinDye, "perlinDye"),
    viscosityWeight: make(shaders.viscosityWeight, "viscosityWeight"),
    windForce: make(shaders.windForce, "windForce"),
    display: make(shaders.display, "display"),
  };
}

export function deletePasses(gl: WebGL2RenderingContext, passes: ShaderPasses): void {
  for (const pass of Object.values(passes)) {
    gl.deleteProgram(pass.program);
  }
}
