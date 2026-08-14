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
  vec2 p = marbleDomain(vUv, uAspect) + vec2(uTime * 0.012, uTime * -0.008);
  float e = 0.04;
  float nL = fbm(p - vec2(e, 0.0));
  float nR = fbm(p + vec2(e, 0.0));
  float nB = fbm(p - vec2(0.0, e));
  float nT = fbm(p + vec2(0.0, e));
  vec2 curl = vec2(nT - nB, nL - nR);
  vec2 drift = vec2(0.06, -0.04);
  vel += (curl * 1.2 + drift) * uStrength * uDt;
  fragColor = vec4(vel, 0.0, 1.0);
}
