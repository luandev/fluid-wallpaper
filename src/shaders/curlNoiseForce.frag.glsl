#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform float uAspect;
uniform float uTime;
uniform float uDt;
uniform float uStrength;
uniform float uBroad;
uniform float uMedium;
uniform float uFine;
uniform float uNoiseScale;
uniform float uNoiseTime;

// #include perlin

void main() {
  vec2 vel = texture(uVelocity, vUv).xy;
  float t = uTime * uNoiseTime;
  vec2 force = composerCurl(vUv, uAspect, t, uNoiseScale, uBroad, uMedium, uFine);
  vel += force * uStrength * NOISE_DRIVE * uDt;
  fragColor = vec4(vel, 0.0, 1.0);
}
