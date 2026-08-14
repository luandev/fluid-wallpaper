#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform float uAspect;
uniform float uTime;
uniform float uStrength;
uniform float uDt;

// #include noise

void main() {
  vec2 vel = texture(uVelocity, vUv).xy;
  vec2 p = marbleDomain(vUv, uAspect) + vec2(uTime * 0.07, uTime * -0.05);
  float e = 0.02;
  float nL = fbm(p - vec2(e, 0.0));
  float nR = fbm(p + vec2(e, 0.0));
  float nB = fbm(p - vec2(0.0, e));
  float nT = fbm(p + vec2(0.0, e));
  vec2 curl = vec2(nT - nB, nL - nR);
  vec2 drift = vec2(0.18, -0.12);
  vel += (curl * 4.0 + drift) * uStrength * uDt;
  fragColor = vec4(vel, 0.0, 1.0);
}
