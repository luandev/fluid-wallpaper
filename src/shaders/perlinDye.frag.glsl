#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDye;
uniform float uAspect;
uniform float uTime;
uniform float uNoiseScale;
uniform float uZoom;
uniform float uBroad;
uniform float uMedium;
uniform float uFine;
uniform float uInject;
uniform vec3 uCrimson;
uniform vec3 uCharcoal;

// #include perlin

void main() {
  vec3 base = texture(uDye, vUv).rgb;
  float n = composerPotential(vUv, uAspect, uTime, uNoiseScale, uZoom, uBroad, uMedium, uFine);
  vec3 painted = mix(uCharcoal, uCrimson, dyeMixT(n));
  fragColor = vec4(mix(base, painted, clamp(uInject, 0.0, 1.0)), 1.0);
}
