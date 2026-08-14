#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uAspect;
uniform float uScale;

// #include noise

void main() {
  float e = 0.012;
  float nL = marbleField(vUv - vec2(e / max(uAspect, 1e-4), 0.0), uAspect);
  float nR = marbleField(vUv + vec2(e / max(uAspect, 1e-4), 0.0), uAspect);
  float nB = marbleField(vUv - vec2(0.0, e), uAspect);
  float nT = marbleField(vUv + vec2(0.0, e), uAspect);
  vec2 curl = vec2(nT - nB, nL - nR);
  vec2 drift = vec2(0.12, -0.08);
  vec2 vel = (normalize(curl + 1e-4) * length(curl) * 3.2 + drift) * uScale;
  fragColor = vec4(vel, 0.0, 1.0);
}
