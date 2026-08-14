import noiseGlsl from "./noise.glsl?raw";
import fullscreenVert from "./fullscreen.vert.glsl?raw";
import splatFrag from "./splat.frag.glsl?raw";
import curlFrag from "./curl.frag.glsl?raw";
import vorticityFrag from "./vorticity.frag.glsl?raw";
import divergenceFrag from "./divergence.frag.glsl?raw";
import clearFrag from "./clear.frag.glsl?raw";
import jacobiFrag from "./jacobi.frag.glsl?raw";
import gradientSubtractFrag from "./gradientSubtract.frag.glsl?raw";
import advectionFrag from "./advection.frag.glsl?raw";
import marbleSeedFrag from "./marbleSeed.frag.glsl?raw";
import marbleVelocityFrag from "./marbleVelocity.frag.glsl?raw";
import curlNoiseForceFrag from "./curlNoiseForce.frag.glsl?raw";
import displayFrag from "./display.frag.glsl?raw";

function includeNoise(src: string): string {
  const marker = "// #include noise";
  if (!src.includes(marker)) {
    return src;
  }
  return src.replace(marker, noiseGlsl);
}

export const shaders = {
  vert: fullscreenVert,
  splat: splatFrag,
  curl: curlFrag,
  vorticity: vorticityFrag,
  divergence: divergenceFrag,
  clear: clearFrag,
  jacobi: jacobiFrag,
  gradientSubtract: gradientSubtractFrag,
  advection: advectionFrag,
  marbleSeed: includeNoise(marbleSeedFrag),
  marbleVelocity: includeNoise(marbleVelocityFrag),
  curlNoiseForce: includeNoise(curlNoiseForceFrag),
  display: displayFrag,
} as const;
