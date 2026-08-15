#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uAspect;
uniform float uScale;
uniform float uBroad;
uniform float uMedium;
uniform float uFine;
uniform float uNoiseScale;
uniform float uZoom;
uniform int uNoiseType;

// #include perlin

void main() {
  vec2 force = composerCurl(vUv, uAspect, 0.0, uNoiseScale, uZoom, uBroad, uMedium, uFine, uNoiseType);
  fragColor = vec4(force * uScale * NOISE_DRIVE, 0.0, 1.0);
}
